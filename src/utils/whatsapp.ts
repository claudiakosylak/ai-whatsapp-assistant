import { Chat, Client, Message, MessageTypes } from 'whatsapp-web.js';
import { processAssistantResponse } from './assistant';
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { processChatCompletionResponse } from './chatCompletion';
import { enableAudioResponse, getBotMode } from './config';
import { addLog } from './controlPanel';
import { OpenAIMessage } from '../types';
import {
  getContextMessageContent,
  getMessagesToProcess,
  isMessageAgeValid,
  removeBotName,
  shouldProcessMessage,
} from './messages';

export type ProcessMessageParam =
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam;

export const processMessage = async (message: Message) => {
  try {
    const chatData: Chat = await message.getChat();

    //check if message should be processed
    if (!shouldProcessMessage(chatData, message)) return false;
    addLog(`Processing message from ${message.from}`);

    //remove bot name from the message
    removeBotName(message);

    const messageList: Array<ProcessMessageParam | OpenAIMessage> = [];
    let messagesToProcess;
    try {
      messagesToProcess = await getMessagesToProcess(chatData);
    } catch (error) {
      addLog(`Error retrieving messages to process: ${error}`);
      return;
    }
    let imageCount: number = 0;

    for (const msg of messagesToProcess.reverse()) {
      try {
        // Validate if the message was written less than maxHoursLimit hours ago; if older, it's not considered
        if (!isMessageAgeValid(msg)) break;

        // Check if the message includes media or if it is of another type
        const isImage =
          msg.type === MessageTypes.IMAGE || msg.type === MessageTypes.STICKER;
        const isAudio =
          msg.type === MessageTypes.VOICE || msg.type === MessageTypes.AUDIO;
        const isOther = !isImage && !isAudio && msg.type != 'chat';

        if (isOther || (isImage && getBotMode() === 'OPENAI_ASSISTANT'))
          continue;

        let media = null;
        try {
          media =
            (isImage && imageCount < 2) || isAudio
              ? await msg.downloadMedia()
              : null;
          if (media && isImage) imageCount++;
        } catch (error) {
          console.error(`Error downloading media: ${error}`);
          continue;
        }

        const messageListItem = await getContextMessageContent(
          msg,
          media,
          isAudio,
        );

        messageList.push(messageListItem);
      } catch (e: any) {
        console.error(
          `Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`,
        );
      }
    }

    if (messageList.length == 0) return;

    try {
      if (getBotMode() === 'OPEN_WEBBUI_CHAT') {
        return await processChatCompletionResponse(
          message.from,
          messageList.reverse(),
        );
      } else {
        return await processAssistantResponse(
          message.from,
          (messageList as OpenAIMessage[]).reverse(),
        );
      }
    } catch (error) {
      addLog(`Error processing assistant/chat completion response: ${error}`);
    }
  } catch (error) {
    addLog(`Error processing context messages: ${error}`);
  }
};

export const handleIncomingMessage = async (
  client: Client,
  message: Message,
) => {
  const isImage =
    message.type === MessageTypes.IMAGE ||
    message.type === MessageTypes.STICKER;
  if (isImage && getBotMode() === 'OPENAI_ASSISTANT') {
    client.sendMessage(
      message.from,
      'Assistant mode cannot process images at this time.',
      {
        sendAudioAsVoice: enableAudioResponse,
      },
    );
    return;
  }
  const response = await processMessage(message);
  if (response) {
    client.sendMessage(response.from, response.messageContent, {
      sendAudioAsVoice: enableAudioResponse,
    });
    addLog(`Sent response to ${response.from}`);
  }
};
