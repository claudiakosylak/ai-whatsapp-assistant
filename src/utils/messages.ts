import { Chat, Message, MessageMedia, MessageTypes } from 'whatsapp-web.js';
import {
  getBotMode,
  getBotName,
  getCustomPrompt,
  getMaxMessageAge,
  getMessageHistoryLimit,
  isResetCommandEnabled,
  setBotMode,
  setCustomPrompt,
} from './botSettings';
import { transcribeVoice } from './audio';
import {
  MockChatHistoryMessage,
  OpenAIMessage,
  ProcessMessageParam,
  WhatsappResponse,
} from '../types';
import { addLog } from './controlPanel';
import { imageProcessingModes } from './whatsapp';
import { deleteFromDifyCache, getAudioMessage, getImageMessage, setToAudioCache } from '../cache';
import { getChatImageInterpretation } from './images';

export function parseCommand(input: string): { command?: string, commandMessage?: string } {
  const match = input.match(/^-(\S+)\s*(.*)/);
  if (!match) {
    return {commandMessage: input};
  }
  return {command: match[1].trim(), commandMessage: match[2].trim()};
}

export const shouldProcessMessage = async (chatData: Chat, message: Message) => {
  const {command} = parseCommand(message.body)
  // If it's a "Broadcast" message, it's not processed
  if (
    chatData.id.user == 'status' ||
    chatData.id._serialized == 'status@broadcast'
  )
    return false;

  // Check if message is from a group
  if (chatData.isGroup) {
    const botName = getBotName();
    const isSelfMention = message.hasQuotedMsg ? (await message.getQuotedMessage()).fromMe : false;
    const isMentioned = message.body.toLowerCase().includes(botName.toLowerCase()) && !isSelfMention
    // Check if bot name is mentioned in the message
    if (!isMentioned && !isSelfMention && !command) {
      return false;
    }
  }
  return true;
};

export const removeBotName = (message: Message) => {
  const botName = getBotName();
  // Check if bot name is mentioned in the message
  if (message.body.toLowerCase().includes(botName.toLowerCase())) {
    // Remove bot name from message for processing
    message.body = message.body.replace(new RegExp(botName, 'gi'), '').trim();
  }
};

export const getMessagesToProcess = async (chatData: Chat) => {
  const fetchedMessages = await chatData.fetchMessages({
    limit: getMessageHistoryLimit(),
  });
  // Check for "-reset" command in chat history to potentially restart context
  const resetIndex = isResetCommandEnabled()
    ? fetchedMessages.map((msg) => msg.body).lastIndexOf('-reset')
    : -1;
  const messagesToProcess =
    resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
  return messagesToProcess;
};

export const isMessageAgeValid = (message: Message) => {
  const actualDate = new Date();
  const msgDate = new Date(message.timestamp * 1000);
  if (
    (actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) >
    getMaxMessageAge()
  ) {
    return false;
  }
  return true;
};

type ImageMessageContentItem = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
};

export const prepareContextMessageList = async (
  chatData: Chat,
  messageList: Array<ProcessMessageParam | OpenAIMessage>,
) => {
  let messagesToProcess;
  try {
    messagesToProcess = await getMessagesToProcess(chatData);
  } catch (error) {
    addLog(`Error retrieving messages to process: ${error}`);
    return;
  }
  let imageCount: number = 0;

  // Add custom prompt if exists
  const customPrompt = getCustomPrompt();
  if (customPrompt) {
    messageList.push({ role: 'user', content: customPrompt });
  }

  for (const msg of messagesToProcess.reverse()) {
    try {
      // Validate if the message was written less than maxHoursLimit hours ago; if older, it's not considered
      if (!isMessageAgeValid(msg)) break;

      // Check if the message includes media or if it is of another type
      const isImage = getIsImage(msg);
      const isAudio = getIsAudio(msg);
      const isOther = !isImage && !isAudio && msg.type != 'chat';

      if (isOther || (isImage && !imageProcessingModes.includes(getBotMode())))
        continue;

      let media = null;
      try {
        media =
          (isImage && imageCount < 2 && getBotMode() !== 'DIFY_CHAT') || isAudio
            ? await msg.downloadMedia()
            : null;
        if (media && isImage) imageCount++;
      } catch (error) {
        console.error(`Error downloading media: ${error}`);
        continue;
      }

      const messageListItem = await getContextMessageContent(
        msg,
        media,
        isAudio,
      );

      messageList.push(messageListItem);
    } catch (e: any) {
      console.error(
        `Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`,
      );
    }
  }
};

export const getContextMessageContent = async (
  msg: Message,
  media: MessageMedia | null,
  isAudio: boolean,
) => {
  let messageBody: string | ImageMessageContentItem[] = msg.body;
  if (media) {
    if (isAudio) {
      try {
        const cachedMessage = getAudioMessage(msg.id._serialized)
        if (cachedMessage) {
          messageBody = cachedMessage
        } else {
          messageBody = await transcribeVoice(media);
          setToAudioCache(msg.id._serialized, messageBody)
        }
      } catch (error) {
        console.error('Error transcribing voice:', error);
        messageBody = 'Audio transcription failed.';
      }
    } else if (getBotMode() === 'OPEN_WEBUI_CHAT') {
      messageBody = [
        {
          type: 'text',
          text: msg.body,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${media.mimetype};base64,${media.data}`,
          },
        },
      ];
    } else {
      const cachedMessage = getImageMessage(msg.id._serialized);
      if (cachedMessage) {
        messageBody = cachedMessage;
      } else {
        messageBody = await getChatImageInterpretation(msg, media);
      }
    }
  }

  const role = !msg.fromMe || (media && !isAudio) ? 'user' : 'assistant';
  if (getBotMode() === 'OPEN_WEBUI_CHAT') {
    return {
      role: role,
      content: messageBody,
      name: role,
    } as ProcessMessageParam;
  } else {
    return { role: role, content: messageBody as string } as OpenAIMessage;
  }
};

export const isMessageReceivedAfterInit = (
  initTime: Date,
  message: Message,
) => {
  const msgDate = new Date(message.timestamp * 1000);
  if (msgDate > initTime) {
    return true;
  }
  return false;
};

export const getHelpMessage = () => {
  return `Available commands:
- -help: Show this help message
- -reset: Reset conversation context
- -update [prompt]: Update the custom prompt
- -mode [assistant|webui|dify]: Switch between OpenAI Assistant, Open WebUI Chat, and Dify modes
- -status: Show current bot settings`;
};

export const getStatusMessage = () => {
  return `Current bot settings:
- Name: ${getBotName()}
- Mode: ${getBotMode()}
- Message History Limit: ${getMessageHistoryLimit()}
- Max Message Age: ${getMaxMessageAge()} hours
- Reset Command: ${isResetCommandEnabled() ? 'Enabled' : 'Disabled'}
- Custom Prompt: ${getCustomPrompt() ? 'Set' : 'Not set'}`;
};

export const changeBotMode = (message: Message | MockChatHistoryMessage) => {
  const newMode = message.body.substring(6).trim().toLowerCase();
  let messageString = '';
  switch (newMode) {
    case 'assistant':
      setBotMode('OPENAI_ASSISTANT');
      messageString = 'Switched to OpenAI Assistant mode';
      break;
    case 'webui':
      setBotMode('OPEN_WEBUI_CHAT');
      messageString = 'Switched to Open WebUI Chat mode';
      break;
    case 'dify':
      setBotMode('DIFY_CHAT');
      messageString = 'Switched to Dify mode';
      break;
    default:
      messageString = 'Invalid mode. Use "assistant", "webui", or "dify".';
      break;
  }
  addLog(messageString);
  return {
    from: message.from,
    messageContent: messageString,
    rawText: messageString,
  };
};

export const updatePromptFromCommand = (
  message: Message | MockChatHistoryMessage,
) => {
  const newPrompt = message.body.substring(8).trim();
  setCustomPrompt(newPrompt);
  addLog(`Updated custom prompt: ${newPrompt}`);
  return {
    from: message.from,
    messageContent: 'Prompt updated successfully!',
    rawText: 'Prompt updated successfully!',
  };
};

export const resetContextFromCommand = (
  message: Message | MockChatHistoryMessage,
) => {
  if (!isResetCommandEnabled()) {
    return {
      from: message.from,
      messageContent: 'Reset command is not currently enabled.',
      rawText: 'Reset command is not currently enabled.',
    };
  }
  if (getBotMode() === 'DIFY_CHAT') {
    deleteFromDifyCache(message.from);
  }
  addLog('Conversation context has been reset.');
  return {
    from: message.from,
    messageContent: 'Conversation context has been reset.',
    rawText: 'Conversation context has been reset.',
  };
};

export const handleCommands = (
  message: Message | MockChatHistoryMessage,
): WhatsappResponse | false => {
  switch (message.body) {
    case '-help':
      return {
        from: message.from,
        messageContent: getHelpMessage(),
        rawText: getHelpMessage(),
      };
    case '-status':
      return {
        from: message.from,
        messageContent: getStatusMessage(),
        rawText: getStatusMessage(),
      };
    case '-reset':
      return resetContextFromCommand(message);
    default:
      if (message.body.startsWith('-mode ')) {
        return changeBotMode(message);
      } else if (message.body.startsWith('-update ')) {
        return updatePromptFromCommand(message);
      }
  }
  return false;
};

export const getIsImage = (message: Message): boolean => {
  const isImage =
    message.type === MessageTypes.IMAGE ||
    message.type === MessageTypes.STICKER;
  return isImage;
};

export const getIsAudio = (message: Message): boolean => {
  const isAudio =
    message.type === MessageTypes.VOICE || message.type === MessageTypes.AUDIO;
  return isAudio;
};
