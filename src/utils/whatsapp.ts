import { Chat, Client, Message } from 'whatsapp-web.js';
import { processAssistantResponse } from './assistant';
import { processChatCompletionResponse } from './chatCompletion';
import { enableAudioResponse, getBotMode } from './botSettings';
import { addLog } from './controlPanel';
import { BotMode, MockChat, OpenAIMessage, ProcessMessageParam, TestMessage } from '../types';
import {
  getIsAudio,
  getIsImage,
  handleCommands,
  prepareContextMessageList,
  removeBotName,
  shouldProcessMessage,
} from './messages';
import { processDifyResponse, uploadImageToDify } from './dify';
import { convertToAudioResponse, transcribeVoice } from './audio';
import { setToAudioCache } from '../cache';

export const imageProcessingModes: BotMode[] = [
  'OPEN_WEBUI_CHAT',
  'DIFY_CHAT',
  'OPENAI_ASSISTANT',
];

export const getResponseText = async (
  message: Message | TestMessage,
  messageList: Array<ProcessMessageParam | OpenAIMessage>,
) => {
  let response;
  try {
    switch (getBotMode()) {
      case 'OPEN_WEBUI_CHAT':
        response = await processChatCompletionResponse(
          message.from,
          messageList.reverse(),
        );
        break;
      case 'DIFY_CHAT':
        const isImage = getIsImage(message);
        let fileUploadId;
        if (isImage) {
          const media = await message.downloadMedia();
          const response = await uploadImageToDify(
            message.from,
            media.data,
            media.mimetype,
          );
          if (response.ok) {
            const data = await response.json();
            addLog(`Successfully uploaded image to dify with ID: ${data.id}`);
            fileUploadId = data.id;
          }
        }
        let messageBody = message.body;
        const isAudio = getIsAudio(message);
        if (isAudio) {
          const media = await message.downloadMedia();
          messageBody = await transcribeVoice(media);
          setToAudioCache(message.id._serialized, messageBody);
        }
        response = await processDifyResponse(
          message.from,
          messageBody,
          fileUploadId,
        );
        break;
      case 'OPENAI_ASSISTANT':
        response = await processAssistantResponse(
          message.from,
          (messageList as OpenAIMessage[]).reverse(),
        );
        break;
    }
    return response;
  } catch (error) {
    throw error;
  }
};

export const processMessage = async (message: Message | TestMessage, chatData: Chat | MockChat) => {
  try {

    //check if message should be processed
    if (!shouldProcessMessage(chatData, message)) return false;
    addLog(`Processing message from ${message.from}`);

    // check for and handle commands
    if (handleCommands(message)) {
      return handleCommands(message);
    }

    //remove bot name from the message
    removeBotName(message);

    const messageList: Array<ProcessMessageParam | OpenAIMessage> = [];

    if (getBotMode() !== 'DIFY_CHAT') {
      await prepareContextMessageList(chatData, messageList);
      if (messageList.length == 0) return;
    }

    try {
      chatData.sendStateTyping();
      const response = await getResponseText(message, messageList);
      chatData.clearState();
      if (enableAudioResponse) {
        chatData.sendStateRecording();
        const audioResponse = await convertToAudioResponse(response);
        chatData.clearState();
        return audioResponse;
      }

      return response;
    } catch (error) {
      addLog(`Error processing response: ${error}`);
    }
  } catch (error) {
    addLog(`Error processing context messages: ${error}`);
  }
};

export const handleIncomingMessage = async (
  client: Client,
  message: Message,
) => {
  const chatData = await message.getChat();
  const response = await processMessage(message, chatData);
  if (response) {
    if (chatData.isGroup) {
      message.reply(response.messageContent, undefined, {
        sendAudioAsVoice: enableAudioResponse,
      });
      return;
    }
    client.sendMessage(response.from, response.messageContent, {
      sendAudioAsVoice: enableAudioResponse,
    });
    addLog(`Sent response to ${response.from}`);
  }
};
