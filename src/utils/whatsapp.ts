import { Chat, Client, Message, MessageTypes } from 'whatsapp-web.js';
import { processAssistantResponse } from './assistant';
import { processChatCompletionResponse } from './chatCompletion';
import { enableAudioResponse, getBotMode, getCustomPrompt } from './config';
import { addLog } from './controlPanel';
import {
  OpenAIMessage,
  ProcessMessageParam,
  WhatsappResponse,
  WhatsappResponseAsText,
} from '../types';
import {
  getContextMessageContent,
  getMessagesToProcess,
  handleCommands,
  isMessageAgeValid,
  removeBotName,
  shouldProcessMessage,
} from './messages';
import { processDifyResponse, uploadImageToDify } from './dify';
import { convertToAudioResponse } from './audio';

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
        const isImage =
          message.type === MessageTypes.IMAGE ||
          message.type === MessageTypes.STICKER;
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
        response = await processDifyResponse(
          message.from,
          messageList as { role: string; content: string }[],
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

export const typeWhileWaiting = async (
  callback: (
    message: Message,
    messageList: Array<ProcessMessageParam | OpenAIMessage>,
  ) => Promise<WhatsappResponseAsText>,
  message: Message,
  messageList: Array<ProcessMessageParam | OpenAIMessage>,
  chatData: Chat,
) => {
  const intervalId = setInterval(() => {
    chatData.sendStateTyping();
  }, 25000);

  try {
    const response = await callback(message, messageList);
    clearInterval(intervalId); // Clear interval when the promise resolves
    chatData.clearState();
    return response;
  } catch (error) {
    clearInterval(intervalId); // Clear interval when the promise is rejected
    chatData.clearState();
    console.error('Process failed with error:', error);
    throw error; // Propagate the error if the promise is rejected
  }
};

export const showRecordingWhileWaiting = async (
  callback: (response: WhatsappResponseAsText) => Promise<WhatsappResponse>,
  textResponse: WhatsappResponseAsText,
  chatData: Chat,
) => {
  const intervalId = setInterval(() => {
    chatData.sendStateRecording();
  }, 25000);

  try {
    const response = await callback(textResponse);
    clearInterval(intervalId); // Clear interval when the promise resolves
    chatData.clearState();
    return response;
  } catch (error) {
    clearInterval(intervalId); // Clear interval when the promise is rejected
    chatData.clearState();
    console.error('Process failed with error:', error);
    throw error; // Propagate the error if the promise is rejected
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
    let messagesToProcess;
    try {
      messagesToProcess = await getMessagesToProcess(chatData);
    } catch (error) {
      addLog(`Error retrieving messages to process: ${error}`);
      return;
    }
    let imageCount: number = 0;

    // Add custom prompt if exists
    const customPrompt = getCustomPrompt();
    if (customPrompt) {
      messageList.push({ role: 'user', content: customPrompt });
    }

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

        if (
          isOther ||
          (isImage && !imageProcessingModes.includes(getBotMode()))
        )
          continue;

        let media = null;
        try {
          media =
            (isImage && imageCount < 2 && getBotMode() !== 'DIFY_CHAT') ||
            isAudio
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
      const response = await typeWhileWaiting(
        getResponseText,
        message,
        messageList,
        chatData,
      );
      if (enableAudioResponse) {
        return await showRecordingWhileWaiting(
          convertToAudioResponse,
          response,
          chatData,
        );
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
