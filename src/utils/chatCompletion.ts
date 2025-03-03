import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { MessageMedia } from 'whatsapp-web.js';
import { enableAudioResponse } from './config';
import { addLog } from './controlPanel';
import {
  OPEN_WEBUI_BASE_URL,
  OPEN_WEBUI_KEY,
  OPEN_WEBUI_MODEL,
} from '../config';
import { createSpeechResponseContent } from './audio';

export const processChatCompletionResponse = async (
  from: string,
  messages: ChatCompletionMessageParam[],
) => {
  addLog("Processing chat completion response.")
  const client = new OpenAI({
    apiKey: OPEN_WEBUI_KEY,
    baseURL: OPEN_WEBUI_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    messages,
    model: OPEN_WEBUI_MODEL
  });

  addLog(
    `Chat completion response: ${completion.choices[0].message.content?.substring(
      0,
      100,
    )}...`,
  );
  const responseString =
    completion.choices[0].message.content ||
    'There was a problem with your request.';

  let messageContent: MessageMedia | string = responseString;
  if (enableAudioResponse) {
    messageContent = await createSpeechResponseContent(responseString);
  }

  const response = { from: from, messageContent, rawText: responseString };

  return response;
};
