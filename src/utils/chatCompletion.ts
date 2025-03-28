import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { addLog } from './controlPanel';
import {
  OPEN_WEBUI_BASE_URL,
  OPEN_WEBUI_KEY,
  OPEN_WEBUI_MODEL,
  OPENAI_API_KEY,
  OPENAI_MODEL,
} from '../config';
import {  TestMessage, WhatsappResponseAsText } from '../types';
import { getBotMode } from './botSettings';
import { Message } from 'whatsapp-web.js';

export const processChatCompletionResponse = async (
  from: string,
  messages: ChatCompletionMessageParam[],
  message: Message | TestMessage,
): Promise<WhatsappResponseAsText> => {
  try {
    addLog('Processing chat completion response.');
    let client;
    if (getBotMode() === 'OPENAI_CHAT') {
      client = new OpenAI({apiKey: OPENAI_API_KEY})
    } else {
      client = new OpenAI({
        apiKey: OPEN_WEBUI_KEY,
        baseURL: OPEN_WEBUI_BASE_URL,
      });
    }

    const chatModel = getBotMode() === "OPENAI_CHAT" ? OPENAI_MODEL : OPEN_WEBUI_MODEL

    const doEmojiReaction = (emoji: string)=> {
      if (message && emoji) {
        try {
          message.react(emoji)
          return;
        } catch (e) {
          addLog(`Error with emoji reaction: ${e}`)
          return;
        }
      }
    };

      const emojiReactionFunctionDeclaration = {
        type: 'function' as 'function',
        function: {
          name: 'emojiReaction',
          description: 'When a user requests a response via emoji, responds with an appropriate emoji.',
          parameters: {
            type: 'object',
            properties: {
              emoji: {
                type: 'string',
                description: "An emoji string."
              }
            },
            required: ["emoji"]
          }
        }
      }

      const functions: {[key: string]: any} = {
        emojiReaction: ({emoji}: {emoji: string}) => {
          return doEmojiReaction(emoji)
        }
      }

    let completion;
    try {
      completion = await client.chat.completions.create({
        messages,
        model: chatModel,
        tools: [emojiReactionFunctionDeclaration],
        frequency_penalty: 0.5,
        presence_penalty: 0,
        store: true,
        top_p: 1,
      });
      if (completion.choices[0].message.tool_calls) {
        const call = completion.choices[0].message.tool_calls[0]
        if (call && call.function.name) {
          return await functions[call.function.name](JSON.parse(call.function.arguments))
        }
      }
    } catch (error) {
      addLog(`Error fetching chat completion response: ${error}`);
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
        speakMessage: false,
      };
    }

    addLog(
      `Chat completion response: ${completion.choices[0].message.content?.substring(
        0,
        100,
      )}...`,
    );
    const responseString =
      completion.choices[0].message.content ||
      'There was a problem with your request.';
    let messageContent = responseString;

    const response = {
      from: from,
      messageContent,
      rawText: JSON.stringify(responseString),
      speakMessage: true,
    };

    return response;
  } catch (error) {
    addLog(`Error in processing chat completion response: ${error}`);
    return {
      from,
      messageContent: 'An unexpected error occurred.',
      rawText: 'Error',
      speakMessage: false,
    };
  }
};
