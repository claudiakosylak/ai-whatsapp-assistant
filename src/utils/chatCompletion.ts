import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { addLog } from './controlPanel';
import {
  OPEN_WEBUI_BASE_URL,
  OPEN_WEBUI_KEY,
  OPEN_WEBUI_MODEL,
} from '../config';
import {  WhatsappResponseAsText } from '../types';

export const processChatCompletionResponse = async (
  from: string,
  messages: ChatCompletionMessageParam[],
): Promise<WhatsappResponseAsText> => {
  try {
    addLog('Processing chat completion response.');
    const client = new OpenAI({
      apiKey: OPEN_WEBUI_KEY,
      baseURL: OPEN_WEBUI_BASE_URL,
    });

    let completion;
    try {
      completion = await client.chat.completions.create({
        messages,
        model: OPEN_WEBUI_MODEL,
      });
    } catch (error) {
      addLog(`Error fetching chat completion response: ${error}`);
      return {
        from,
        messageContent: 'There was an error processing the request.',
        rawText: 'Error',
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
    };

    return response;
  } catch (error) {
    addLog(`Error in processing chat completion response: ${error}`);
    return {
      from,
      messageContent: 'An unexpected error occurred.',
      rawText: 'Error',
    };
  }
};
