import dotenv from "dotenv"
import { addLog } from "./controlPanel"
import { MessageResponse } from "./whatsapp"
import { randomUUID } from "crypto"

dotenv.config()

const conversationCache = new Map<string, string>();

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

export const processDifyResponse = async (from: string, messages: { role: string; content: string }[]): Promise<MessageResponse> => {
    const apiKey = process.env.DIFY_API_KEY;
    const baseUrl = process.env.DIFY_BASE_URL;
    const RESPONSE_TIMEOUT = 60000; // 60 seconds timeout
    const COMPLETION_DELAY = 500; // 500ms delay after stream ends

    if (!apiKey || !baseUrl) {
        addLog('Dify API key or base URL not configured');
        return { from, messageString: "Dify is not properly configured. Please check your settings." };
    }

    try {
        const isFirstMessage = !conversationCache.has(from);
        const requestBody: any = {
            messages: messages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            })),
            inputs: {},
            query: messages[messages.length - 1].content,
            user: from,
            response_mode: "streaming"
        };

        // Only include conversation_id if it's not the first message
        if (!isFirstMessage) {
            requestBody.conversation_id = conversationCache.get(from);
            addLog(`Using existing conversation ID: ${requestBody.conversation_id} for ${from}`);
        } else {
            addLog(`Creating new conversation for ${from}`);
        }

        addLog(`Sending request to Dify: ${JSON.stringify(requestBody).substring(0, 200)}...`);

        const response = await fetch(`${baseUrl}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            // Handle 404 "Conversation Not Exists" error specifically
            if (response.status === 404) {
                addLog(`Conversation not found. Removing cached conversation for ${from}`);
                conversationCache.delete(from);
                // Try again without the conversation ID
                return processDifyResponse(from, messages);
            }

            const errorText = await response.text();
            addLog(`Dify API error: ${errorText}`);
            return {
                from,
                messageString: "Sorry, I encountered an error processing your request."
            };
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        addLog(`Response body: ${response.body}`)

        // Handle streaming response
        const reader = response.body.getReader();
        let responseText = '';
        let messageId = '';
        let newConversationId = '';
        let buffer = '';
        let lastChunkTime = Date.now();
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
                    lastChunkTime = Date.now();

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
                                // addLog(`Dify raw response: ${jsonStr.substring(0, 100)}${jsonStr.length > 100 ? '...' : ''}`);

                                const data = safeJsonParse(jsonStr);

                                if (data.event === 'message') {
                                    if (data.answer) {
                                        responseText += data.answer;
                                        addLog(`Received message chunk: ${data.answer.substring(0, 50)}${data.answer.length > 50 ? '...' : ''}`);
                                    }
                                    if (!messageId && data.message_id) {
                                        messageId = data.message_id;
                                    }
                                    if (!newConversationId && data.conversation_id) {
                                        newConversationId = data.conversation_id;
                                    }
                                } else if (data.event === 'message_end') {
                                    addLog(`Dify message_end event received`);
                                    if (data.conversation_id && !newConversationId) {
                                        newConversationId = data.conversation_id;
                                    }
                                } else if (data.event === 'error') {
                                    addLog(`Dify stream error: ${data.message || JSON.stringify(data)}`);
                                } else if (data.event === 'agent_message') {
                                    // Handle agent_message event which contains the actual text
                                    if (data.answer) {
                                        responseText += data.answer;
                                        addLog(`Received agent message chunk: ${data.answer.substring(0, 50)}${data.answer.length > 50 ? '...' : ''}`);
                                    } else if (data.content) {
                                        responseText += data.content;
                                        addLog(`Received agent content chunk: ${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}`);
                                    }
                                    if (!messageId && data.message_id) {
                                        messageId = data.message_id;
                                    }
                                    if (!newConversationId && data.conversation_id) {
                                        newConversationId = data.conversation_id;
                                    }
                                } else if (data.event === 'agent_thought') {
                                    // Just log this event, no response to extract
                                    addLog(`Agent thinking: ${JSON.stringify(data).substring(0, 100)}...`);
                                } else {
                                    // Handle any other event types
                                    addLog(`Unknown Dify event: ${data.event}, data: ${JSON.stringify(data).substring(0, 100)}${JSON.stringify(data).length > 100 ? '...' : ''}`);

                                    // Try to extract content from any fields that might contain the response
                                    if (data.answer) {
                                        responseText += data.answer;
                                        addLog(`Extracted answer from unknown event: ${data.answer.substring(0, 50)}${data.answer.length > 50 ? '...' : ''}`);
                                    } else if (data.content) {
                                        responseText += data.content;
                                        addLog(`Extracted content from unknown event: ${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}`);
                                    } else if (data.text) {
                                        responseText += data.text;
                                        addLog(`Extracted text from unknown event: ${data.text.substring(0, 50)}${data.text.length > 50 ? '...' : ''}`);
                                    } else {
                                        // Do a deep search for any property that might contain text
                                        const findTextInObject = (obj: any): string => {
                                            if (!obj || typeof obj !== 'object') return '';

                                            for (const [key, value] of Object.entries(obj)) {
                                                if (typeof value === 'string' &&
                                                    (key.includes('text') || key.includes('content') || key.includes('answer') || key.includes('message'))) {
                                                    addLog(`Found potential response text in field '${key}': ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
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
                                addLog(`Problematic chunk: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);

                                // Try to recover by extracting any text that looks like it might be a response
                                try {
                                    const textMatch = line.match(/"(answer|content|text)"\s*:\s*"([^"]+)"/);
                                    if (textMatch && textMatch[2]) {
                                        const extractedText = textMatch[2];
                                        addLog(`Recovered text from malformed JSON: ${extractedText.substring(0, 50)}${extractedText.length > 50 ? '...' : ''}`);
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
                    addLog(`Processing remaining buffer after stream end: ${buffer.substring(0, 100)}${buffer.length > 100 ? '...' : ''}`);
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
                await new Promise(resolve => setTimeout(resolve, COMPLETION_DELAY));

                addLog(`Stream processing completed with ${responseText.length} chars of text`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                addLog(`Error during stream processing: ${errorMessage}`);

                if (!streamEnded) {
                    streamEnded = true;
                    reader.cancel().catch(e => addLog(`Error canceling reader: ${e}`));
                }

                throw error;
            }
        })();

        // Wait for either the stream to complete or the timeout to occur
        try {
            await Promise.race([processStreamPromise, timeoutPromise]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            addLog(`Stream processing interrupted: ${errorMessage}`);

            if (!streamEnded) {
                streamEnded = true;
                reader.cancel().catch(e => addLog(`Error canceling reader: ${e}`));
            }

            // If we have partial content, return it rather than an error
            if (responseText.trim()) {
                addLog(`Returning partial response (${responseText.length} chars) after error`);
            } else {
                addLog(`No usable response content after error`);
                return { from, messageString: "Sorry, I encountered an error processing your request." };
            }
        }

        // Save the conversation ID for future messages
        if (newConversationId) {
            conversationCache.set(from, newConversationId);
            addLog(`Saved new conversation ID: ${newConversationId} for ${from}`);
        }

        addLog(`Dify streaming response completed for ${messageId || 'unknown'}`);
        addLog(`Final response text (${responseText.length} chars): ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);

        if (!responseText.trim()) {
            addLog(`Warning: Empty response received from Dify`);
            return {
                from,
                messageString: "I apologize, but I couldn't generate a response. Please try again later."
            };
        }

        return {
            from,
            messageString: responseText.trim()
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog(`Error in Dify response: ${errorMessage}`);
        return { from, messageString: "Sorry, I encountered an error processing your request." };
    }
}
