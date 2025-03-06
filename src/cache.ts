import NodeCache from 'node-cache';
import { NODE_CACHE_TIME } from './config';

//DIFY Conversations
export const difyConversationCache = new NodeCache({ stdTTL: NODE_CACHE_TIME });

export const getCachedDifyConversation = (from: string) => {
  return difyConversationCache.get<string>(from);
};

export const deleteFromDifyCache = (from: string) => {
  difyConversationCache.del(from);
};

export const setToDifyCache = (from: string, conversationId: string) => {
  difyConversationCache.set(from, conversationId);
};

// image interpretation cache so it doesn't have to be analyzed fully again for context
export const imageMessagesCache = new NodeCache({ stdTTL: NODE_CACHE_TIME });

export const getImageMessage = (messageId: string) => {
  return imageMessagesCache.get<string>(messageId);
};

export const deleteFromImageCache = (messageId: string) => {
  imageMessagesCache.del(messageId);
};

export const setToImageMessageCache = (messageId: string, contentString: string) => {
  imageMessagesCache.set(messageId, contentString);
};
