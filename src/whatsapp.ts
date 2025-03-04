import { Chat, Message, MessageTypes } from "whatsapp-web.js";
import { OpenAIMessage } from ".";
import { processAssistantResponse } from "./assistant";
import { ChatCompletionMessageParam } from "openai/resources";
import { processChatCompletionResponse } from "./chatCompletion";
import { getBotName, getMessageHistoryLimit, isResetCommandEnabled, getMaxMessageAge, setCustomPrompt, getCustomPrompt, getBotMode, setBotMode } from "./config";
import { addLog } from "./controlPanel";

export interface MessageResponse {
    from: string;
    messageString: string;
}

const getHelpMessage = () => {
    return `Available commands:
- -help: Show this help message
- -reset: Reset conversation context
- -update [prompt]: Update the custom prompt
- -mode [assistant|webui|dify]: Switch between OpenAI Assistant, Open WebUI Chat, and Dify modes
- -status: Show current bot settings`;
};

const getStatusMessage = () => {
    return `Current bot settings:
- Name: ${getBotName()}
- Mode: ${getBotMode()}
- Message History Limit: ${getMessageHistoryLimit()}
- Max Message Age: ${getMaxMessageAge()} hours
- Reset Command: ${isResetCommandEnabled() ? 'Enabled' : 'Disabled'}
- Custom Prompt: ${getCustomPrompt() ? 'Set' : 'Not set'}`;
};

export const processAssistantMessage = async (message: Message): Promise<MessageResponse | false> => {
    const chatData: Chat = await message.getChat();
    // If it's a "Broadcast" message, it's not processed
    if(chatData.id.user == 'status' || chatData.id._serialized == 'status@broadcast') return false;

    // Check for help command
    if (message.body === '-help') {
        return { from: message.from, messageString: getHelpMessage() };
    }

    // Check for status command
    if (message.body === '-status') {
        return { from: message.from, messageString: getStatusMessage() };
    }

    // Check for mode command
    if (message.body.startsWith('-mode ')) {
        const newMode = message.body.substring(6).trim().toLowerCase();
        if (newMode === 'assistant') {
            setBotMode('OPENAI_ASSISTANT');
            addLog('Switched to OpenAI Assistant mode');
            return { from: message.from, messageString: 'Switched to OpenAI Assistant mode' };
        } else if (newMode === 'webui') {
            setBotMode('OPEN_WEBBUI_CHAT');
            addLog('Switched to Open WebUI Chat mode');
            return { from: message.from, messageString: 'Switched to Open WebUI Chat mode' };
        } else if (newMode === 'dify') {
            setBotMode('DIFY');
            addLog('Switched to Dify mode');
            return { from: message.from, messageString: 'Switched to Dify mode' };
        } else {
            return { from: message.from, messageString: 'Invalid mode. Use "assistant", "webui", or "dify".' };
        }
    }

    // Check for update command
    if (message.body.startsWith('-update ')) {
        const newPrompt = message.body.substring(8).trim();
        setCustomPrompt(newPrompt);
        addLog(`Updated custom prompt: ${newPrompt}`);
        return { from: message.from, messageString: 'Prompt updated successfully!' };
    }

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
    const messageList: OpenAIMessage[] = []
    const fetchedMessages = await chatData.fetchMessages({ limit: getMessageHistoryLimit() });
    // Check for "-reset" command in chat history to potentially restart context
    const resetIndex = isResetCommandEnabled() ? fetchedMessages.findIndex(msg => msg.body === "-reset") : -1;
    const messagesToProcess = resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
    
    // Add custom prompt if exists
    const customPrompt = getCustomPrompt();
    if (customPrompt) {
        messageList.push({ role: "system", content: customPrompt });
    }
    
    for (const msg of messagesToProcess.reverse()) {
        try {
          // Validate if the message was written less than 24 (or maxHoursLimit) hours ago; if older, it's not considered
          const msgDate = new Date(msg.timestamp * 1000);
          if ((actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) > getMaxMessageAge()) break;

          // Check if the message includes media or if it is of another type
          const isImage = msg.type === MessageTypes.IMAGE || msg.type === MessageTypes.STICKER;
          const isAudio = msg.type === MessageTypes.VOICE || msg.type === MessageTypes.AUDIO;
          const isOther = !isImage && !isAudio && msg.type != 'chat';

          if (isImage || isAudio || isOther) return false;

          const role = !msg.fromMe ? "user" : "assistant"
          messageList.push({role: role, content: msg.body});
        } catch (e: any) {
          console.error(`Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`);
        }
      }

    if (messageList.length == 0) return false;
    return await processAssistantResponse(message.from, messageList.reverse())
}



export const processChatCompletionMessage = async (message: Message): Promise<MessageResponse | false> => {
    const chatData: Chat = await message.getChat();
    // If it's a "Broadcast" message, it's not processed
    if(chatData.id.user == 'status' || chatData.id._serialized == 'status@broadcast') return false;
    
    // Check for help command
    if (message.body === '-help') {
        return { from: message.from, messageString: getHelpMessage() };
    }

    // Check for status command
    if (message.body === '-status') {
        return { from: message.from, messageString: getStatusMessage() };
    }

    // Check for mode command
    if (message.body.startsWith('-mode ')) {
        const newMode = message.body.substring(6).trim().toLowerCase();
        if (newMode === 'assistant') {
            setBotMode('OPENAI_ASSISTANT');
            addLog('Switched to OpenAI Assistant mode');
            return { from: message.from, messageString: 'Switched to OpenAI Assistant mode' };
        } else if (newMode === 'webui') {
            setBotMode('OPEN_WEBBUI_CHAT');
            addLog('Switched to Open WebUI Chat mode');
            return { from: message.from, messageString: 'Switched to Open WebUI Chat mode' };
        } else if (newMode === 'dify') {
            setBotMode('DIFY');
            addLog('Switched to Dify mode');
            return { from: message.from, messageString: 'Switched to Dify mode' };
        } else {
            return { from: message.from, messageString: 'Invalid mode. Use "assistant", "webui", or "dify".' };
        }
    }

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
    const messageList: ChatCompletionMessageParam[] = []
    const fetchedMessages = await chatData.fetchMessages({ limit: getMessageHistoryLimit() });
    // Check for "-reset" command in chat history to potentially restart context
    const resetIndex = isResetCommandEnabled() ? fetchedMessages.map(msg => msg.body).lastIndexOf("-reset") : -1;
    const messagesToProcess = resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
    for (const msg of messagesToProcess.reverse()) {
        try {
          // Validate if the message was written less than 24 (or maxHoursLimit) hours ago; if older, it's not considered
          const msgDate = new Date(msg.timestamp * 1000);
          if ((actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) > getMaxMessageAge()) break;

          // Check if the message includes media or if it is of another type
          const isImage = msg.type === MessageTypes.IMAGE || msg.type === MessageTypes.STICKER;
          const isAudio = msg.type === MessageTypes.VOICE || msg.type === MessageTypes.AUDIO;
          const isOther = !isImage && !isAudio && msg.type != 'chat';

          if (isImage || isAudio || isOther) return false;

          const role = !msg.fromMe ? "user" : "assistant"
          messageList.push({role: role, content: msg.body, name: role});
        } catch (e: any) {
          console.error(`Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`);
        }
      }

    if (messageList.length == 0) return false;
    return await processChatCompletionResponse(message.from, messageList.reverse())
}