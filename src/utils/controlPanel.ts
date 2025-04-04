import { MessageMedia } from 'whatsapp-web.js';
import { saveAudioFile } from './audio';
import { ENV_PATH } from '../constants';
import fs from 'fs';
import path from 'path';
import { ChatHistoryItem, MockChat, TestMessage } from '../types';
import { randomUUID } from 'crypto';
import { getMessageHistoryLimit } from './botSettings';

export const fetchTestMessages: ({
  limit,
}: {
  limit: number;
}) => Promise<TestMessage[]> = ({ limit }: { limit: number }) => {
  return new Promise((resolve) => {
    const chatHistorySlice = chatHistory.slice(-limit);
    const result = chatHistorySlice.map((item) => item.message);
    resolve(result);
  });
};

// Store logs in memory
export let logs: string[] = [];
export let chatHistory: ChatHistoryItem[] = [];
export let testConversationId = randomUUID();
export let whatsappConnected = false;
export let testChatData: MockChat = {
  id: {
    user: 'user',
    _serialized: randomUUID(),
  },
  isGroup: false,
  fetchMessages: () => fetchTestMessages({limit: getMessageHistoryLimit()}),
  sendStateTyping: () => addLog('typing'),
  sendStateRecording: () => addLog('recording'),
  clearState: () => addLog('clearing typing state'),
};

export const getTestChatData = () => testChatData;

export const changeChatType = () => {
  const newIsGroup = !testChatData.isGroup;
  testChatData.isGroup = newIsGroup;
  return newIsGroup;
};

export const setChatHistory = (newChatHistory: ChatHistoryItem[]) => {
  chatHistory = newChatHistory;
};

export const isAudioMessage = (content: string | MessageMedia) => {
  if (typeof content === 'string') {
    return false;
  }
  return true;
};

export const addMessageContentString = (
  content: string | MessageMedia,
  imageUrl?: string,
) => {
  const isAudio = isAudioMessage(content);
  if (isAudio) {
    const mediaContent = content as MessageMedia;

    const audioUrl = saveAudioFile(mediaContent);

    return (
      `<audio controls>` +
      `<source src='${audioUrl}' type='${mediaContent.mimetype}' />` +
      'Your browser does not support the audio element.' +
      `</audio>`
    );
  }

  if (imageUrl) {
    return (
      `<p>` +
      content +
      `</p>` +
      `<img src='${imageUrl}' style="width:50px;height:50px;object-fit:cover;"/>`
    );
  }

  return content as string;
};

export const addLog = (message: string) => {
  console.log(message);
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  logs.unshift(logEntry); // Add to beginning of array
  if (logs.length > 100) logs.pop(); // Keep only last 100 logs
};

export const setWhatsAppConnected = (connected: boolean) => {
  whatsappConnected = connected;
};

export const getEnvContent = () => {
  let envContent = '';
  try {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
    return envContent;
  } catch (error) {
    return (envContent = fs.readFileSync(
      path.join(process.cwd(), '.env.example'),
      'utf8',
    ));
  }
};
