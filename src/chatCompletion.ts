import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { MessageMedia } from 'whatsapp-web.js';
import { enableAudioResponse } from './utils/config';
import { addLog } from './utils/controlPanel';
import { getBase64WithElevenLabs } from './utils/audio';
import {
  OPEN_WEBUI_BASE_URL,
  OPEN_WEBUI_KEY,
  OPEN_WEBUI_MODEL,
} from './config';

const createSpeechResponseContent = async (messageString: string) => {
  try {
    addLog(
      `[OpenAI->speech] Creating speech audio for: "${messageString.substring(
        0,
        100,
      )}...}"`,
    );

    const response = await getBase64WithElevenLabs(messageString);
    let audioMedia = new MessageMedia('audio/mp3', response, 'voice.mp3');

    return audioMedia;
  } catch (e: any) {
    addLog('Trouble creating speech');
    addLog(e);
    throw e;
  }
};

export const processChatCompletionResponse = async (
  from: string,
  messages: ChatCompletionMessageParam[],
) => {
  const client = new OpenAI({
    apiKey: OPEN_WEBUI_KEY,
    baseURL: OPEN_WEBUI_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    messages,
    model: OPEN_WEBUI_MODEL,
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

  const response = { from: from, messageContent };

  return response;
};
