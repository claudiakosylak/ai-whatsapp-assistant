import { IMAGE_DIR } from '../constants';
import path from 'path';
import fs from 'fs';
import { Message, MessageMedia } from 'whatsapp-web.js';
import { OPENAI_API_KEY } from '../config';
import OpenAI from 'openai';
import { addLog } from './controlPanel';
import { ChatCompletionMessageParam } from 'openai/resources';
import { setToImageMessageCache } from '../cache';

export const saveImageFile = (base64String: string, imageName: string) => {
  const fileBuffer = Buffer.from(base64String, 'base64'); // Convert Base64 to Buffer
  const uniqueFileName = Date.now() + path.extname(imageName);
  const filePath = path.join(IMAGE_DIR, uniqueFileName);
  fs.writeFileSync(filePath, fileBuffer);
  return `/images/${uniqueFileName}`;
};

export const deleteImageFiles = () => {
  if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
    return;
  }
  // Read the contents of the images directory
  fs.readdir(IMAGE_DIR, (err, files) => {
    if (err) {
      console.error('Error reading images directory:', err);
      return;
    }

    // Iterate over each file and delete it
    files.forEach((file) => {
      const filePath = path.join(IMAGE_DIR, file);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file ${file}:`, err);
        } else {
          console.log(`Deleted file: ${file}`);
        }
      });
    });
  });
};

export function getMimeTypeFromBase64(base64String: string) {
  const matches = base64String.match(/^data:(.+);base64,/);
  if (matches && matches[1]) {
    return matches[1]; // Return the MIME type
  } else {
    throw new Error('Invalid base64 string');
  }
}

export const getChatImageInterpretation = async (
  message: Message,
  media: MessageMedia,
) => {
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  addLog('Sending image to chat completion for interpretation and cacheing.');
  let completion;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'developer',
      content: [
        {
          type: 'text',
          text: "You must take in the text of the next user message, and combine the user's text and an interpretation of the image attached to that same message so that someone else can help answer the question or address the prompt without seeing.",
        },
      ],
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: message.body,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${media.mimetype};base64,${media.data}`,
          },
        },
      ],
    },
  ];
  try {
    completion = await client.chat.completions.create({
      messages,
      model: 'gpt-4o-mini',
    });

    addLog(
      `Chat completion image interpretation: ${completion.choices[0].message.content?.substring(
        0,
        100,
      )}...`,
    );
    const responseString = completion.choices[0].message.content;
    if (!responseString) throw new Error('No response content.');
    setToImageMessageCache(message.id._serialized, responseString);
    return responseString;
  } catch (error) {
    addLog(`Error getting image interpretation from chat completion ${error}`);
    return `${message.body}; + attached image could not be processed.`;
  }
};
