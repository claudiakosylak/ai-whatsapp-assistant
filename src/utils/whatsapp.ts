import { Chat, Client, Message } from 'whatsapp-web.js';
import { processAssistantResponse } from './assistant';
import { processChatCompletionResponse } from './chatCompletion';
import { enableAudioResponse, getBotMode, getPrompt } from './botSettings';
import { addLog } from './controlPanel';
import {
  GeminiContextContent,
  MockChat,
  OpenAIMessage,
  ProcessMessageParam,
  TestMessage,
} from '../types';
import {
  getIsAudio,
  getIsImage,
  handleCommands,
  handleSendTo,
  prepareContextMessageList,
  removeBotName,
  shouldProcessMessage,
} from './messages';
import { processDifyResponse, uploadImageToDify } from './dify';
import { convertToAudioResponse, transcribeVoice } from './audio';
import { setToAudioCache } from '../cache';
import { processGeminiResponse } from './gemini';
import { ChatCompletionMessageParam } from 'openai/resources';

export const getResponseText = async (
  message: Message | TestMessage,
  messageList: Array<
    ProcessMessageParam | OpenAIMessage | GeminiContextContent
  >,
) => {
  let response;
  try {
    switch (getBotMode()) {
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
          try {
            messageBody = await transcribeVoice(media);
          } catch (e) {
            throw e;
          }
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
          message,
        );
        break;
      case 'GEMINI':
        response = await processGeminiResponse(
          message.from,
          (messageList as GeminiContextContent[]).reverse(),
          message,
        );
        break;
      default:
        messageList.push({
          role: 'system',
          content: getPrompt(),
        });
        response = await processChatCompletionResponse(
          message.from,
          (messageList as ChatCompletionMessageParam[]).reverse(),
          message,
        );
        break;
    }
    return response;
  } catch (error) {
    throw error;
  }
};

export const processMessage = async (
  message: Message | TestMessage,
  chatData: Chat | MockChat,
) => {
  try {
    //check if message should be processed
    const willProcessMessage = await shouldProcessMessage(chatData, message);
    if (!willProcessMessage) return false;
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
      if (enableAudioResponse && response && response.messageContent) {
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
  const sendTo = await handleSendTo(message);
  try {
    if (sendTo) {
      chatData.sendSeen();
      try {
        // Wrap this specific call in its own try/catch
        await client.sendMessage(sendTo.number, sendTo.message);
        message.react('👍')
        addLog(`Sent message to ${sendTo.number}`);
      } catch (error: any) {
        const errorMsg = `Failed to send message to ${sendTo.number}: ${error.message}`;
        console.error(errorMsg);
        addLog(errorMsg);

        // Optionally notify the original sender about the failure
        await message.reply(`Failed to forward message. Please check the format of the forwarding number and try again.`);
      }
      return;
    }
    const response = await processMessage(message, chatData);
    if (response) {
      if (chatData.isGroup) {
        if (response.messageContent && !response.messageMedia) {
          await message.reply(response.messageContent, undefined, {
            sendAudioAsVoice: enableAudioResponse,
          });
        }
        if (response.messageMedia) {
          await message.reply(response.messageMedia);
        }
        return;
      }
      if (response.messageContent && !response.messageMedia) {
        await client.sendMessage(response.from, response.messageContent, {
          sendAudioAsVoice: enableAudioResponse,
        });
      }
      if (response.messageMedia) {
        await client.sendMessage(response.from, response.messageMedia);
      }
      addLog(`Sent response to ${response.from}`);
    }
  } catch (e) {
    addLog(`Error sending response back: ${e}`);
  }
};
