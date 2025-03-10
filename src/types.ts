import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionDeveloperMessageParam,
  ChatCompletionUserMessageParam,
} from 'openai/resources';
import { MessageMedia } from 'whatsapp-web.js';

export type OpenAIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatHistoryItem = {
  id: string;
  role: string;
  name: string;
  content: string;
  rawText: string;
  message: TestMessage;
  media: MessageMedia | undefined;
};

export type TestMessage = {
  id: {
    fromMe: boolean;
    _serialized: string;
  },
  from: string;
  body: string;
  hasQuotedMsg: boolean;
  timestamp: number;
  type: 'image' | 'sticker' | 'text' | 'ptt' | 'audio' | 'chat';
  fromMe: boolean;
  downloadMedia: () => Promise<MessageMedia>;
  getQuotedMessage: () => Promise<TestMessage>;
}

export type MockChatHistoryMessage = {
  from: string;
  body: string;
  role: 'user' | 'assistant';
};

export type WhatsappResponse = {
  from: string;
  messageContent: MessageMedia | string;
  rawText: string;
};

export type WhatsappResponseAsText = {
  from: string;
  messageContent: string;
  rawText: string;
};

export type ProcessMessageParam =
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionDeveloperMessageParam;

export type BotMode = 'OPENAI_ASSISTANT' | 'OPEN_WEBUI_CHAT' | 'DIFY_CHAT';

export type AudioMode = 'ELEVEN_LABS' | 'OPENAI';

export type MockChat = {
  id: {
    user: 'status' | 'user';
    _serialized: string;
  },
  isGroup: boolean;
  fetchMessages: ({limit}: {limit: number}) => Promise<TestMessage[]>;
  sendStateTyping: () => void;
  clearState: () => void;
  sendStateRecording: () => void;
}
