import { Chat, Client, Message, MessageTypes } from 'whatsapp-web.js';
import { processAssistantResponse } from './assistant';
import { processChatCompletionResponse } from './chatCompletion';
import { enableAudioResponse, getBotMode } from './botSettings';
import { addLog } from './controlPanel';
import { OpenAIMessage, ProcessMessageParam } from '../types';
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

export const imageProcessingModes = ['OPEN_WEBUI_CHAT', 'DIFY_CHAT'];

export const getResponseText = async (
  message: Message,
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

export const processMessage = async (message: Message) => {
  try {
    const chatData: Chat = await message.getChat();

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
  const isImage =
    message.type === MessageTypes.IMAGE ||
    message.type === MessageTypes.STICKER;
  if (isImage && !imageProcessingModes.includes(getBotMode())) {
    client.sendMessage(message.from, `I cannot process images at this time.`, {
      sendAudioAsVoice: enableAudioResponse,
    });
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
