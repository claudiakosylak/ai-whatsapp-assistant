import { MessageMedia } from "whatsapp-web.js";

export type OpenAIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatHistoryItem = {
  role: string;
  content: string;
  rawText: string;
};

export type MockChatHistoryMessage = {
  from: string;
  body: string;
  role: 'user' | 'assistant';
};

export type WhatsappResponse = {
    from: string,
    messageContent: MessageMedia | string;
    rawText: string;
}
