import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources';
import { addLog } from './controlPanel';
import {
  OPEN_WEBUI_BASE_URL,
  OPEN_WEBUI_KEY,
  OPENAI_API_KEY,
} from '../config';
import { TestMessage, WhatsappResponseAsText } from '../types';
import { getAudioResponseEnabled, getBotMode, getModels } from './botSettings';
import { Message } from 'whatsapp-web.js';
import { getIsAudio } from './messages';
import { setToFunctionCache } from '../cache';

export const processChatCompletionResponse = async (
  from: string,
  messages: ChatCompletionMessageParam[],
  message: Message | TestMessage,
): Promise<WhatsappResponseAsText | undefined> => {
  try {
    addLog('Processing chat completion response.');
    let client;
    if (getBotMode() === 'OPENAI_CHAT') {
      client = new OpenAI({ apiKey: OPENAI_API_KEY });
    } else {
      client = new OpenAI({
        apiKey: OPEN_WEBUI_KEY,
        baseURL: OPEN_WEBUI_BASE_URL,
      });
    }

    const chatModel =
      getBotMode() === 'OPENAI_CHAT' ? getModels()['OPENAI_CHAT'] : getModels()["OPEN_WEBUI_CHAT"];
    let respondWithAudio: boolean = getIsAudio(message) ? true : false;

    let hasReacted;

    const doEmojiReaction = async (emoji: string) => {
      if (message && emoji) {
        try {
          await message.react(emoji);
          hasReacted = true;
          return { function: 'emojiReaction', result: 'success' };
        } catch (e) {
          addLog(`Error with emoji reaction: ${e}`);
          return { function: 'emojiReaction', result: 'error' };
        }
      }
    };

    const speak = () => {
      if (getAudioResponseEnabled()) {
        respondWithAudio = true;
        return { function: 'speak', result: 'success' };
      } else {
        return { function: 'speak', result: 'Audio messages are not enabled.' };
      }
    };

    const speakFunctionDeclaration = {
      type: 'function' as 'function',
      function: {
        name: 'speak',
        description:
          'When a user requests that you speak, read a message out loud or to send your response as audio, this will enable it.',
      },
    };

    const emojiReactionFunctionDeclaration = {
      type: 'function' as 'function',
      function: {
        name: 'emojiReaction',
        description:
          'When a user requests a response via emoji, responds with an appropriate emoji.',
        parameters: {
          type: 'object',
          properties: {
            emoji: {
              type: 'string',
              description: 'An emoji string.',
            },
          },
          required: ['emoji'],
        },
      },
    };

    const functions: { [key: string]: any } = {
      emojiReaction: ({ emoji }: { emoji: string }) => {
        return doEmojiReaction(emoji);
      },
      speak: () => {
        return speak();
      },
    };

    let completion;
    let calls: ChatCompletionMessageToolCall[] | undefined;
    try {
      completion = await client.chat.completions.create({
        messages,
        model: chatModel as string,
        tools: [emojiReactionFunctionDeclaration, speakFunctionDeclaration],
        frequency_penalty: 0.5,
        presence_penalty: 0,
        store: true,
        top_p: 1,
      });

      const cacheCallObject: {
        name: string;
        args: Record<string, any> | undefined;
        result: Record<string, any> | undefined;
        id?: string;
      }[] = [];

      if (completion.choices[0].message.tool_calls) {
        // const call = completion.choices[0].message.tool_calls[0];
        calls = completion.choices[0].message.tool_calls;
        for (let call of calls) {
          if (call && call.function.name) {
            addLog(`Call : ${JSON.stringify(call)}`);
            const result = await functions[call.function.name](
              JSON.parse(call.function.arguments),
            );
            cacheCallObject.push({
              name: call.function.name,
              args: JSON.parse(call.function.arguments),
              result,
              id: call.id,
            });
            messages.push(completion.choices[0].message);
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: result.toString(),
            });
          }
        }

        if (calls.length > 0) {
          setToFunctionCache(message.id._serialized, cacheCallObject);
          completion = await client.chat.completions.create({
            messages,
            model: chatModel as string,
            tools: [emojiReactionFunctionDeclaration, speakFunctionDeclaration],
            frequency_penalty: 0.5,
            presence_penalty: 0,
            store: true,
            top_p: 1,
          });
          // calls = []
        }
      }
    } catch (error) {
      addLog(`Error fetching chat completion response: ${error}`);
      if (hasReacted) {
        return;
      } else {
        return {
          from,
          messageContent: 'There was an error processing the request.',
          rawText: 'Error',
          speakMessage: false,
        };
      }
    }

    if (!completion.choices[0].message.content && (calls && calls.length > 0)) {
      return;
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
      speakMessage: respondWithAudio,
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
