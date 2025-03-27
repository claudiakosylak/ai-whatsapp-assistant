import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
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
  mediaType?: 'image' | 'audio' | 'video';
  reaction?: string;
  repliedMessage?: TestMessage;
};

export type TestMessage = {
  id: {
    fromMe: boolean;
    _serialized: string;
  };
  from: string;
  body: string;
  hasQuotedMsg: boolean;
  timestamp: number;
  type: 'image' | 'sticker' | 'text' | 'ptt' | 'audio' | 'chat' | 'video';
  fromMe: boolean;
  downloadMedia: () => Promise<MessageMedia>;
  getQuotedMessage: () => Promise<TestMessage | undefined>;
  react: (emoji: string) => void;
};

export type MockChatHistoryMessage = {
  from: string;
  body: string;
  role: 'user' | 'assistant';
};

export type WhatsappResponse = {
  from: string;
  messageContent: MessageMedia | string;
  messageMedia?: MessageMedia;
  rawText: string;
};

export type WhatsappResponseAsText = {
  from: string;
  messageContent: string;
  messageMedia?: MessageMedia;
  rawText: string;
};

export type ProcessMessageParam =
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionSystemMessageParam;

export type BotMode =
  | 'OPENAI_ASSISTANT'
  | 'OPEN_WEBUI_CHAT'
  | 'DIFY_CHAT'
  | 'OPENAI_CHAT'
  | 'GEMINI';

export type AudioMode = 'ELEVEN_LABS' | 'OPENAI';

export type MockChat = {
  id: {
    user: 'status' | 'user';
    _serialized: string;
  };
  isGroup: boolean;
  fetchMessages: ({ limit }: { limit: number }) => Promise<TestMessage[]>;
  sendStateTyping: () => void;
  clearState: () => void;
  sendStateRecording: () => void;
};

export type GeminiFileData = {
  fileUri: string;
  mimeType: string;
};

export type GeminiContextPart = {
  fileData?: GeminiFileData;
  text?: string;
};

export type GeminiContextContent = {
  role: 'user' | 'model';
  parts: GeminiContextPart[];
};

export type EmojiReaction = {
  emoji: string;
};
