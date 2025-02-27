import { Chat, Client, Message, MessageTypes } from 'whatsapp-web.js';
import { processAssistantResponse } from '../assistant';
import { ChatCompletionMessageParam } from 'openai/resources';
import { processChatCompletionResponse } from '../chatCompletion';
import {
  getBotName,
  getMessageHistoryLimit,
  isResetCommandEnabled,
  getMaxMessageAge,
  enableAudioResponse,
  getBotMode,
} from './config';
import { addLog } from './controlPanel';
import { OpenAIMessage } from '../types';

export const processAssistantMessage = async (message: Message) => {
  const chatData: Chat = await message.getChat();
  // If it's a "Broadcast" message, it's not processed
  if (
    chatData.id.user == 'status' ||
    chatData.id._serialized == 'status@broadcast'
  )
    return false;

  // Check if message is from a group
  if (chatData.isGroup) {
    const botName = getBotName();
    // Check if bot name is mentioned in the message
    if (!message.body.toLowerCase().includes(botName.toLowerCase())) {
      return false;
    }
    // Remove bot name from message for processing
    message.body = message.body.replace(new RegExp(botName, 'gi'), '').trim();
  }

  const actualDate = new Date();
  const messageList: OpenAIMessage[] = [];
  const fetchedMessages = await chatData.fetchMessages({
    limit: getMessageHistoryLimit(),
  });
  // Check for "-reset" command in chat history to potentially restart context
  const resetIndex = isResetCommandEnabled()
    ? fetchedMessages.map((msg) => msg.body).lastIndexOf('-reset')
    : -1;
  const messagesToProcess =
    resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
  for (const msg of messagesToProcess.reverse()) {
    try {
      // Validate if the message was written less than 24 (or maxHoursLimit) hours ago; if older, it's not considered
      const msgDate = new Date(msg.timestamp * 1000);
      if (
        (actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) >
        getMaxMessageAge()
      )
        break;

      // Check if the message includes media or if it is of another type
      const isImage =
        msg.type === MessageTypes.IMAGE || msg.type === MessageTypes.STICKER;
      const isAudio =
        msg.type === MessageTypes.VOICE || msg.type === MessageTypes.AUDIO;
      const isOther = !isImage && !isAudio && msg.type != 'chat';

      if (isImage || isAudio || isOther) return false;

      const role = !msg.fromMe ? 'user' : 'assistant';
      messageList.push({ role: role, content: msg.body });
    } catch (e: any) {
      console.error(
        `Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`,
      );
    }
  }

  if (messageList.length == 0) return;
  return await processAssistantResponse(message.from, messageList.reverse());
};

export const processChatCompletionMessage = async (message: Message) => {
  const chatData: Chat = await message.getChat();
  // If it's a "Broadcast" message, it's not processed
  if (
    chatData.id.user == 'status' ||
    chatData.id._serialized == 'status@broadcast'
  )
    return false;

  // Check if message is from a group
  if (chatData.isGroup) {
    const botName = getBotName();
    // Check if bot name is mentioned in the message
    if (!message.body.toLowerCase().includes(botName.toLowerCase())) {
      return false;
    }
    // Remove bot name from message for processing
    message.body = message.body.replace(new RegExp(botName, 'gi'), '').trim();
  }

  const actualDate = new Date();
  const messageList: ChatCompletionMessageParam[] = [];
  const fetchedMessages = await chatData.fetchMessages({
    limit: getMessageHistoryLimit(),
  });
  console.log({fetchedMessages})
  // Check for "-reset" command in chat history to potentially restart context
  const resetIndex = isResetCommandEnabled()
    ? fetchedMessages.map((msg) => msg.body).lastIndexOf('-reset')
    : -1;
  const messagesToProcess =
    resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
  for (const msg of messagesToProcess.reverse()) {
    try {
      // Validate if the message was written less than 24 (or maxHoursLimit) hours ago; if older, it's not considered
      const msgDate = new Date(msg.timestamp * 1000);
      if (
        (actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) >
        getMaxMessageAge()
      )
        break;

      // Check if the message includes media or if it is of another type
      const isImage =
        msg.type === MessageTypes.IMAGE || msg.type === MessageTypes.STICKER;
      const isAudio =
        msg.type === MessageTypes.VOICE || msg.type === MessageTypes.AUDIO;
      const isOther = !isImage && !isAudio && msg.type != 'chat';

      if (isImage || isAudio || isOther) continue;

      const role = !msg.fromMe ? 'user' : 'assistant';
      messageList.push({ role: role, content: msg.body, name: role });
    } catch (e: any) {
      console.error(
        `Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`,
      );
    }
  }

  if (messageList.length == 0) return;
  console.log('making it to chat completion')
  return await processChatCompletionResponse(
    message.from,
    messageList.reverse(),
  );
};

export const handleIncomingMessage = async (
  client: Client,
  message: Message,
) => {
  if (getBotMode() === 'OPENAI_ASSISTANT') {
    addLog(`Processing assistant message from ${message.from}`);
    const response = await processAssistantMessage(message);
    if (response) {
      client.sendMessage(response.from, response.messageContent);
      addLog(`Sent assistant response to ${response.from}`);
    }
  } else {
    addLog(`Processing chat completion message from ${message.from}`);
    const response = await processChatCompletionMessage(message);
    if (response) {
      client.sendMessage(response.from, response.messageContent, {
        sendAudioAsVoice: enableAudioResponse,
      });
      addLog(`Sent chat completion response to ${response.from}`);
    }
  }
};
