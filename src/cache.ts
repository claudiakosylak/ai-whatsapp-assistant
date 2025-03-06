import NodeCache from 'node-cache';
import { NODE_CACHE_TIME } from './config';

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
