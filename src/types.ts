import { ChatCompletionAssistantMessageParam, ChatCompletionUserMessageParam } from "openai/resources";
import { MessageMedia } from "whatsapp-web.js";

export type OpenAIMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatHistoryItem = {
  id: string;
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

export type WhatsappResponseAsText = {
  from: string,
  messageContent: string;
  rawText: string;
}

export type ProcessMessageParam =
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam;
