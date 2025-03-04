import { Chat, Message, MessageMedia } from 'whatsapp-web.js';
import {
  getBotMode,
  getBotName,
  getMaxMessageAge,
  getMessageHistoryLimit,
  isResetCommandEnabled,
} from './config';
import { transcribeVoice } from './audio';
import { OpenAIMessage } from '../types';
import { ProcessMessageParam } from './whatsapp';

export const shouldProcessMessage = (chatData: Chat, message: Message) => {
  // If it's a "Broadcast" message, it's not processed
  if (
    chatData.id.user == 'status' ||
    chatData.id._serialized == 'status@broadcast'
  )
    return false;

  // Check if message is from a group
  if (chatData.isGroup) {
    //   const botName = getBotName();
    //   // Check if bot name is mentioned in the message
    //   if (!message.body.toLowerCase().includes(botName.toLowerCase())) {
    //     return false;
    //   }
    // }
    // return true;
    return false;
  }
  return true;
};

export const removeBotName = (message: Message) => {
  const botName = getBotName();
  // Check if bot name is mentioned in the message
  if (message.body.toLowerCase().includes(botName.toLowerCase())) {
    // Remove bot name from message for processing
    message.body = message.body.replace(new RegExp(botName, 'gi'), '').trim();
  }
};

export const getMessagesToProcess = async (chatData: Chat) => {
  const fetchedMessages = await chatData.fetchMessages({
    limit: getMessageHistoryLimit(),
  });
  // Check for "-reset" command in chat history to potentially restart context
  const resetIndex = isResetCommandEnabled()
    ? fetchedMessages.map((msg) => msg.body).lastIndexOf('-reset')
    : -1;
  const messagesToProcess =
    resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
  return messagesToProcess;
};

export const isMessageAgeValid = (message: Message) => {
  const actualDate = new Date();
  const msgDate = new Date(message.timestamp * 1000);
  if (
    (actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) >
    getMaxMessageAge()
  ) {
    return false;
  }
  return true;
};

type ImageMessageContentItem = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
};

export const getContextMessageContent = async (
  msg: Message,
  media: MessageMedia | null,
  isAudio: boolean,
) => {
  let messageBody: string | ImageMessageContentItem[] = msg.body;
  if (media) {
    if (isAudio) {
      try {
        messageBody = await transcribeVoice(media);
      } catch (error) {
        console.error("Error transcribing voice:", error);
        messageBody = "Audio transcription failed.";
      }
    } else if (getBotMode() === 'OPEN_WEBBUI_CHAT') {
      messageBody = [
        {
          type: "text",
          text: msg.body
        },
        {
          type: "image_url",
          image_url: {
            "url": `data:${media.mimetype};base64,${media.data}`
          }
        }
      ]

    }
  }

  const role = (!msg.fromMe || (media && !isAudio)) ? 'user' : 'assistant';
  if (getBotMode() === 'OPEN_WEBBUI_CHAT') {
    return { role: role, content: messageBody, name: role } as ProcessMessageParam
  } else {
    return { role: role, content: messageBody as string } as OpenAIMessage
  }
};


export const isMessageReceivedAfterInit = (initTime: Date, message: Message) => {
  const msgDate = new Date(message.timestamp * 1000);
  if (msgDate > initTime) {
    return true
  }
  return false
}
