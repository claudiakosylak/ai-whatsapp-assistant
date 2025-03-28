import {
  deleteFromDifyCache,
  getCachedDifyConversation,
  setToDifyCache,
} from '../cache';
import { DIFY_API_KEY, DIFY_BASE_URL } from '../config';
import { WhatsappResponseAsText } from '../types';
import {
  getBotName,
  getMaxMessageAge,
  getMessageHistoryLimit,
  getPrompt,
} from './botSettings';
import { addLog } from './controlPanel';

// Helper to decode JSON safely with better error handling
const safeJsonParse = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Try to fix common JSON issues like trailing commas
    const cleanedJson = jsonString.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(cleanedJson);
    } catch (e2) {
      throw new Error(`Failed to parse JSON: ${e2}`);
    }
  }
};

export const processDifyResponse = async (
  from: string,
  messageContent: string,
  imageFileId?: string,
): Promise<WhatsappResponseAsText> => {
  const RESPONSE_TIMEOUT = 60000; // 60 seconds timeout
  const COMPLETION_DELAY = 500; // 500ms delay after stream ends

  if (!DIFY_API_KEY || !DIFY_BASE_URL) {
    addLog('Dify API key or base URL not configured');
    return {
      from,
      messageContent:
        'Dify is not properly configured. Please check your settings.',
      rawText: 'Dify is not properly configured. Please check your settings.',
      speakMessage: false,
    };
  }

  try {
    const existingConversationId = getCachedDifyConversation(from);
    const requestBody: any = {
      // one MUST enter the variable in your agent dashboard on dify inside the prompt there, {{customPrompt}}
      inputs: {
        customPrompt: getPrompt(),
        contextLimit: getMessageHistoryLimit(),
        botName: getBotName(),
        maxMessageAge: getMaxMessageAge(),
      },
      query: messageContent,
      user: from,
      response_mode: 'streaming',
    };

    if (imageFileId) {
      requestBody['files'] = [
        {
          type: 'image',
          transfer_method: 'local_file',
          upload_file_id: imageFileId,
        },
      ];
    }

    // Only include conversation_id if it's not the first message
    if (existingConversationId) {
      requestBody.conversation_id = existingConversationId;
      addLog(
        `Using existing conversation ID: ${requestBody.conversation_id} for ${from}`,
      );
    } else {
      addLog(`Creating new conversation for ${from}`);
    }

    addLog(
      `Sending request to Dify: ${JSON.stringify(requestBody).substring(
        0,
        200,
      )}...`,
    );

    const response = await fetch(`${DIFY_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Handle 404 "Conversation Not Exists" error specifically
      if (response.status === 404) {
        addLog(
          `Conversation not found. Removing cached conversation for ${from}`,
        );
        deleteFromDifyCache(from);
        // Try again without the conversation ID
        return processDifyResponse(from, messageContent);
      }

      const errorText = await response.text();
      addLog(`Dify API error: ${errorText}`);
      return {
        from,
        messageContent:
          'Sorry, I encountered an error processing your request.',
        rawText: 'Sorry, I encountered an error processing your request.',
        speakMessage: false,
      };
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Handle streaming response
    const reader = response.body.getReader();
    let responseText = '';
    let messageId = '';
    let newConversationId = '';
    let buffer = '';
    let streamEnded = false;

    addLog(`Processing Dify streaming response for ${from}`);

    // Set up a timeout to prevent hanging indefinitely
    const timeoutPromise = new Promise<void>((_resolve, reject) => {
      setTimeout(() => {
        if (!streamEnded) {
          reject(new Error(`Response timeout after ${RESPONSE_TIMEOUT}ms`));
        }
      }, RESPONSE_TIMEOUT);
    });

    // Process the stream with timeout protection
    const processStreamPromise = (async () => {
      try {
        // Process the stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            streamEnded = true;
            addLog(`Stream completed, done=true`);
            break;
          }

          const chunk = new TextDecoder().decode(value);
          // addLog(`Chunk: ${chunk}`)
          buffer += chunk;

          // Process complete SSE messages
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep the last incomplete chunk in the buffer

          for (const message of messages) {
            if (!message.trim()) continue;

            const lines = message.split('\n');
            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;

              try {
                const jsonStr = line.substring(6); // Remove 'data: ' prefix

                const data = safeJsonParse(jsonStr);

                if (data.event === 'message') {
                  if (data.answer) {
                    responseText += data.answer;
                    addLog(
                      `Received message chunk: ${data.answer.substring(0, 50)}${
                        data.answer.length > 50 ? '...' : ''
                      }`,
                    );
                  }
                  if (!messageId && data.message_id) {
                    messageId = data.message_id;
                  }
                  if (data.conversation_id !== existingConversationId) {
                    newConversationId = data.conversation_id;
                  }
                } else if (data.event === 'message_end') {
                  addLog(`Dify message_end event received`);
                  if (data.conversation_id !== existingConversationId) {
                    newConversationId = data.conversation_id;
                  }
                } else if (data.event === 'error') {
                  addLog(
                    `Dify stream error: ${
                      data.message || JSON.stringify(data)
                    }`,
                  );
                } else if (data.event === 'agent_message') {
                  // Handle agent_message event which contains the actual text
                  if (data.answer) {
                    responseText += data.answer;
                    addLog(
                      `Received agent message chunk: ${data.answer.substring(
                        0,
                        50,
                      )}${data.answer.length > 50 ? '...' : ''}`,
                    );
                  } else if (data.content) {
                    responseText += data.content;
                    addLog(
                      `Received agent content chunk: ${data.content.substring(
                        0,
                        50,
                      )}${data.content.length > 50 ? '...' : ''}`,
                    );
                  }
                  if (!messageId && data.message_id) {
                    messageId = data.message_id;
                  }
                  if (data.conversation_id !== existingConversationId) {
                    newConversationId = data.conversation_id;
                  }
                } else if (data.event === 'agent_thought') {
                  // Just log this event, no response to extract
                  addLog(
                    `Agent thinking: ${JSON.stringify(data).substring(
                      0,
                      100,
                    )}...`,
                  );
                } else {
                  // Handle any other event types
                  addLog(
                    `Unknown Dify event: ${data.event}, data: ${JSON.stringify(
                      data,
                    ).substring(0, 100)}${
                      JSON.stringify(data).length > 100 ? '...' : ''
                    }`,
                  );

                  // Try to extract content from any fields that might contain the response
                  if (data.answer) {
                    responseText += data.answer;
                    addLog(
                      `Extracted answer from unknown event: ${data.answer.substring(
                        0,
                        50,
                      )}${data.answer.length > 50 ? '...' : ''}`,
                    );
                  } else if (data.content) {
                    responseText += data.content;
                    addLog(
                      `Extracted content from unknown event: ${data.content.substring(
                        0,
                        50,
                      )}${data.content.length > 50 ? '...' : ''}`,
                    );
                  } else if (data.text) {
                    responseText += data.text;
                    addLog(
                      `Extracted text from unknown event: ${data.text.substring(
                        0,
                        50,
                      )}${data.text.length > 50 ? '...' : ''}`,
                    );
                  } else {
                    // Do a deep search for any property that might contain text
                    const findTextInObject = (obj: any): string => {
                      if (!obj || typeof obj !== 'object') return '';

                      for (const [key, value] of Object.entries(obj)) {
                        if (
                          typeof value === 'string' &&
                          (key.includes('text') ||
                            key.includes('content') ||
                            key.includes('answer') ||
                            key.includes('message'))
                        ) {
                          addLog(
                            `Found potential response text in field '${key}': ${value.substring(
                              0,
                              50,
                            )}${value.length > 50 ? '...' : ''}`,
                          );
                          return value;
                        } else if (typeof value === 'object') {
                          const nestedText = findTextInObject(value);
                          if (nestedText) return nestedText;
                        }
                      }
                      return '';
                    };

                    const foundText = findTextInObject(data);
                    if (foundText) {
                      responseText += foundText;
                    }
                  }
                }
              } catch (e) {
                const error = e instanceof Error ? e.message : String(e);
                addLog(`Error parsing Dify response chunk: ${error}`);
                addLog(
                  `Problematic chunk: ${line.substring(0, 100)}${
                    line.length > 100 ? '...' : ''
                  }`,
                );

                // Try to recover by extracting any text that looks like it might be a response
                try {
                  const textMatch = line.match(
                    /"(answer|content|text)"\s*:\s*"([^"]+)"/,
                  );
                  if (textMatch && textMatch[2]) {
                    const extractedText = textMatch[2];
                    addLog(
                      `Recovered text from malformed JSON: ${extractedText.substring(
                        0,
                        50,
                      )}${extractedText.length > 50 ? '...' : ''}`,
                    );
                    responseText += extractedText;
                  }
                } catch (recoverError) {
                  addLog(`Failed to recover text from malformed JSON`);
                }
              }
            }
          }
        }

        // If we reached this point, the stream has completed normally
        streamEnded = true;

        // Process any remaining buffer
        if (buffer.trim()) {
          addLog(
            `Processing remaining buffer after stream end: ${buffer.substring(
              0,
              100,
            )}${buffer.length > 100 ? '...' : ''}`,
          );
          try {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                const data = safeJsonParse(jsonStr);

                if (data.answer) responseText += data.answer;
                else if (data.content) responseText += data.content;
                else if (data.text) responseText += data.text;

                if (!newConversationId && data.conversation_id) {
                  newConversationId = data.conversation_id;
                }
              }
            }
          } catch (e) {
            addLog(`Error processing remaining buffer: ${e}`);
          }
        }

        // Wait a short time to ensure all processing is complete
        await new Promise((resolve) => setTimeout(resolve, COMPLETION_DELAY));

        addLog(
          `Stream processing completed with ${responseText.length} chars of text`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error during stream processing: ${errorMessage}`);

        if (!streamEnded) {
          streamEnded = true;
          reader.cancel().catch((e) => addLog(`Error canceling reader: ${e}`));
        }

        throw error;
      }
    })();

    // Wait for either the stream to complete or the timeout to occur
    try {
      await Promise.race([processStreamPromise, timeoutPromise]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`Stream processing interrupted: ${errorMessage}`);

      if (!streamEnded) {
        streamEnded = true;
        reader.cancel().catch((e) => addLog(`Error canceling reader: ${e}`));
      }

      // If we have partial content, return it rather than an error
      if (responseText.trim()) {
        addLog(
          `Returning partial response (${responseText.length} chars) after error`,
        );
      } else {
        addLog(`No usable response content after error`);
        return {
          from,
          messageContent:
            'Sorry, I encountered an error processing your request.',
          rawText: 'Error',
          speakMessage: false,
        };
      }
    }

    // Save the conversation ID for future messages
    if (newConversationId && newConversationId !== existingConversationId) {
      setToDifyCache(from, newConversationId);
      addLog(`Saved new conversation ID: ${newConversationId} for ${from}`);
    }

    addLog(`Dify streaming response completed for ${messageId || 'unknown'}`);
    addLog(
      `Final response text (${
        responseText.length
      } chars): ${responseText.substring(0, 100)}${
        responseText.length > 100 ? '...' : ''
      }`,
    );

    if (!responseText.trim()) {
      addLog(`Warning: Empty response received from Dify`);
      return {
        from,
        messageContent:
          "I apologize, but I couldn't generate a response. Please try again later.",
        rawText: 'Error',
        speakMessage: false,
      };
    }

    return {
      from,
      messageContent: responseText.trim(),
      rawText: 'Error',
      speakMessage: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addLog(`Error in Dify response: ${errorMessage}`);
    return {
      from,
      messageContent: 'Sorry, I encountered an error processing your request.',
      rawText: 'Error',
      speakMessage: false,
    };
  }
};

export const uploadImageToDify = async (
  from: string,
  base64: string,
  mimeType: string,
) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Convert Buffer to Blob (Required for strict TypeScript environments)
  const fileBlob = new Blob([imageBuffer], { type: mimeType });

  // Create FormData
  const formData = new FormData();
  formData.append('file', fileBlob);
  formData.append('type', mimeType);
  formData.append('user', from); // Append user ID

  // Send the request
  const response = await fetch(`${DIFY_BASE_URL}/files/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
    }, // Ensure multipart/form-data headers
  });
  return response;
};
