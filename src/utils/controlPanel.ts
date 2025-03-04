import { MessageMedia } from 'whatsapp-web.js';
import { saveAudioFile } from './audio';
import { ENV_PATH } from '../constants';
import fs from 'fs';
import path from 'path';
import { getBotMode, getMessageHistoryLimit } from './config';
import { processAssistantResponse } from './assistant';
import { ChatHistoryItem, MockChatHistoryMessage, OpenAIMessage, WhatsappResponse } from '../types';
import { processChatCompletionResponse } from './chatCompletion';
import { ChatCompletionMessageParam } from 'openai/resources';
import { processDifyResponse } from './dify';
import { randomUUID } from 'crypto';
import { handleCommands } from './messages';

// Store logs in memory
export let logs: string[] = [];
export let chatHistory: ChatHistoryItem[] = [];
export let testConversationId = randomUUID();
export let whatsappConnected = false;

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

export const getResponse = async (): Promise<WhatsappResponse> => {
  try {
    let response;
    let messages = [];
    // check if last message was a command and handle
    let lastMessage = chatHistory[chatHistory.length - 1]
    let mockMessage: MockChatHistoryMessage = {
      from: 'test',
      body: lastMessage.content,
      role: 'user'
    }
    let commandResponse = handleCommands(mockMessage)
    if (commandResponse !== false) {
      return commandResponse as WhatsappResponse
    }
    // grab only the messages defined by our settings context length
    const contextChatHistory = chatHistory.slice(-(getMessageHistoryLimit()))
    switch (getBotMode()) {
      case 'OPENAI_ASSISTANT':
        messages = contextChatHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.rawText,
        }));
        addLog('Sending message to assistant');
        response = await processAssistantResponse(
          'test',
          messages as OpenAIMessage[],
        );
        break;
      case 'OPEN_WEBUI_CHAT':
        messages = contextChatHistory.map((msg) => {
          return {
            role: msg.role,
            content: JSON.parse(msg.rawText),
            name: msg.role,
          };
        });
        addLog('Sending message to chat completion');
        response = await processChatCompletionResponse(
          'test',
          messages as ChatCompletionMessageParam[],
        );
        break;
      case 'DIFY_CHAT':
        messages = contextChatHistory.map((msg) => {
          return {
            role: msg.role,
            content: msg.rawText
          };
        });
        addLog('Sending message to Divy Chatbot');
        response = await processDifyResponse(
          testConversationId,
          messages,
        );
        break;
    }
    return response;
  } catch (error) {
    throw error;
  }
};
