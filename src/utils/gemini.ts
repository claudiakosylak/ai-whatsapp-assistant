import {
  Content,
  FileState,
  FunctionCallingConfigMode,
  GenerateContentResponse,
  GoogleGenAI,
  Type,
} from '@google/genai';
import { GeminiContextContent, WhatsappResponseAsText } from '../types';
import { addLog } from './controlPanel';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { getBotName, getPrompt } from './botSettings';
import { Message, MessageMedia } from 'whatsapp-web.js';
import { getIsDocument, getIsImage } from './messages';
import { getImageMessage, setToImageMessageCache } from '../cache';

const removeBotName = (message: GeminiContextContent) => {
  const botName = getBotName();
  // Check if bot name is mentioned in the message
  if (
    message.parts[0].text &&
    message.parts[0].text.toLowerCase().includes(botName.toLowerCase())
  ) {
    // Remove bot name from message for processing
    message.parts[0].text = message.parts[0].text
      .replace(new RegExp(botName, 'gi'), '')
      .trim();
  }
};

export const processGeminiResponse = async (
  from: string,
  messageList: GeminiContextContent[],
  message?: Message,
): Promise<WhatsappResponseAsText | undefined> => {
  addLog('Processing Gemini response.');
  // context history has to start with a user message for gemini
  if (messageList[0].role === 'model') {
    messageList.unshift({role: 'user', parts: [{text: ''}]});
  }

  const lastMessage: GeminiContextContent =
    messageList.pop() as GeminiContextContent;

  const repliedMessage = await message?.getQuotedMessage();
  if (repliedMessage && (getIsImage(repliedMessage) || getIsDocument(repliedMessage))) {
    addLog(`Got image in replied message.`)
    let imageUri;
    const media = await repliedMessage.downloadMedia();
    const cachedImage = getImageMessage(repliedMessage.id._serialized);
    if (cachedImage) {
      imageUri = cachedImage;
    } else {
      try {
        imageUri = await uploadImageToGemini(media.data, media.mimetype);
        if (imageUri) {
          setToImageMessageCache(repliedMessage.id._serialized, imageUri);
        }
      } catch (error) {
        addLog(`Image upload error: ${error}`);
        return;
      }
      if (imageUri) {
        let geminiMediaPart = {
          fileData: {
            fileUri: imageUri,
            mimeType: media.mimetype,
          },
        };
        lastMessage.parts.push(geminiMediaPart);
      }
    }
  }

  removeBotName(lastMessage);
  let media: MessageMedia | undefined;
  const doEmojiReaction = (emoji: string) => {
    if (message && emoji) {
      try {
        message.react(emoji);
        return;
      } catch (e) {
        addLog(`Error with emoji reaction: ${e}`);
        return;
      }
    }
  };

  const emojiReactionFunctionDeclaration = {
    name: 'emojiReaction',
    description:
      'When a user requests a response via emoji, responds with an appropriate emoji.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        emoji: {
          type: Type.STRING,
          description: 'An emoji string.',
        },
      },
      required: ['emoji'],
    },
  };

  const functions: { [key: string]: any } = {
    emojiReaction: ({ emoji }: { emoji: string }) => {
      return doEmojiReaction(emoji);
    },
  };

  messageList.push(lastMessage);


  // let config: GenerateContentConfig = {};
  let body: any = {
    contents: messageList,
  };

  addLog(`Gemini message list: ${JSON.stringify(messageList)}`)

  if (GEMINI_MODEL !== 'gemini-2.0-flash-exp') {
    // config.systemInstruction = {
    //   text: getPrompt(),
    // };
    // config.tools = [
    //   {
    //     functionDeclarations: [emojiReactionFunctionDeclaration],
    //   },
    // ];
    // config.toolConfig = {
    //   functionCallingConfig: {
    //     mode: FunctionCallingConfigMode.AUTO,
    //   },
    // };
    body.systemInstruction = {
      parts: [
        {
          text: getPrompt(),
        },
      ],
    };
    body.tools = [
      {
        functionDeclarations: [emojiReactionFunctionDeclaration],
      },
    ];
    body.toolConfig = {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.AUTO,
      },
    };
  } else {
    body.generationConfig = {
      responseModalities: ['TEXT', 'IMAGE']
    }
  }

  let response: GenerateContentResponse;

  let call;
  let responseText;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    response = await res.json();

    if (
      !res.ok ||
      !response ||
      !response.candidates ||
      !response.candidates[0] ||
      !response.candidates[0].content ||
      !response.candidates[0].content.parts
    ) {
      throw new Error(JSON.stringify(response));
    }
    let responseContent: Content = response.candidates[0].content;

    if (!responseContent.parts) throw new Error('no parts');
    for (let part of responseContent.parts) {
      if (part.functionCall) {
        call = part.functionCall
        break;
      }
      const blob = part.inlineData
      if (blob && blob.data && blob.mimeType) {
        const base64Data = blob.data.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        media = new MessageMedia(
          blob.mimeType,
          base64Data,
          null,
          null,
        );
        break;
      }
      if (part.text) {
        responseText = part.text
      }
    }

    if (call && call.name) {
      return await functions[call.name](call.args);
    }

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
    messageContent:
      responseText
        ? responseText
        : media
        ? ''
        : 'There was a problem with your request.',
    messageMedia: media,
    rawText: responseText || 'Error.',
  };
};

export const uploadImageToGemini = async (
  base64String: string,
  mimeType: string,
) => {
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const imageBuffer = Buffer.from(base64String, 'base64');
    const fileBlob = new Blob([imageBuffer], { type: mimeType });
    let response = await client.files.upload({ file: fileBlob });
    const fileName = response.name;
    addLog(`Image upload to gemini started.`);
    while (response.state !== FileState.ACTIVE) {
      response = await client.files.get({ name: fileName as string });
    }
    addLog(`Image upload to gemini complete.`);
    return response.uri;
  } catch (error) {
    addLog(`Error uploading image to Gemini`);
    throw error;
  }
};
