import NodeCache from 'node-cache';

export const difyConversationCache = new NodeCache();

export const getCachedDifyConversation = (from: string) => {
    return difyConversationCache.get<string>(from)
}

export const deleteFromDifyCache = (from: string) => {
    difyConversationCache.del(from)
}

export const setToDifyCache = (from: string, conversationId: string) => {
    difyConversationCache.set(from, conversationId)
}
