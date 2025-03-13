import { GoogleGenAI } from '@google/genai';
import { GeminiContextContent, WhatsappResponseAsText } from '../types';
import { addLog } from './controlPanel';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { getBotName, getCustomPrompt } from './botSettings';

export const processGeminiResponse = async (
  from: string,
  messageList: GeminiContextContent[],
): Promise<WhatsappResponseAsText> => {
  addLog('Processing Gemini response.');
  // context history has to start with a user message for gemini
  while (messageList[0].role === 'model') {
    messageList.shift()
  }
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let systemInstruction;
  if (getCustomPrompt()) {
    systemInstruction = {
      text: `Your name is ${getBotName()}. ${getCustomPrompt()}`,
    };
  }
  const lastMessage: GeminiContextContent =
    messageList.pop() as GeminiContextContent;
  let response;
  try {
    const chat = client.chats.create({
      model: GEMINI_MODEL,
      config: { systemInstruction: systemInstruction },
      history: messageList,
    });
    response = await chat.sendMessage({ message: lastMessage.parts });
  } catch (error) {
    addLog(`Error fetching gemini response: ${error}`);
    return {
      from,
      messageContent: 'There was an error processing the request.',
      rawText: 'Error',
    };
  }
  return {
    from,
    messageContent: response.text || 'There was a problem with your request.',
    rawText: response.text || 'Error.',
  };
};

export const uploadImageToGemini = async (base64String: string, mimeType: string) => {
    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    try {
        const imageBuffer = Buffer.from(base64String, 'base64');
        const fileBlob = new Blob([imageBuffer], { type: mimeType });
        const response = await client.files.upload({file: fileBlob})
        addLog(`Image successfully uploaded to gemini.`)
        return response.uri;
    } catch (error) {
        addLog(`Error uploading image to Gemini`)
        throw(error)
    }
}
