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
  GeminiContextContent,
  GeminiContextPart,
  MockChat,
  MockChatHistoryMessage,
  OpenAIMessage,
  ProcessMessageParam,
  TestMessage,
  WhatsappResponse,
} from '../types';
import { addLog } from './controlPanel';
import {
  deleteFromDifyCache,
  getAudioMessage,
  getFromFunctionCache,
  getImageMessage,
  setToAudioCache,
  setToImageMessageCache,
} from '../cache';
import { getChatImageInterpretation } from './images';
import { imageProcessingModes } from '../constants';
import { uploadImageToGemini } from './gemini';

export function parseCommand(input: string): {
  command?: string;
  commandMessage?: string;
} {
  const match = input.match(/^-(\S+)\s*(.*)/);
  if (!match) {
    return { commandMessage: input };
  }
  return { command: match[1].trim(), commandMessage: match[2].trim() };
}

export const shouldProcessGroupMessage = async (
  chatData: Chat | MockChat,
  message: Message | TestMessage,
) => {
  if (chatData.isGroup) {
    const { command } = parseCommand(message.body);
    const botName = getBotName();
    const quotedMessage = await message.getQuotedMessage();
    const isSelfMention =
      message.hasQuotedMsg && quotedMessage ? quotedMessage.fromMe : false;
    const isMentioned =
      message.body.toLowerCase().includes(botName.toLowerCase()) &&
      !isSelfMention;
    // Check if bot name is mentioned in the message
    if (!isMentioned && !isSelfMention && !command) {
      return false;
    }
  }
  return true;
};

export const shouldProcessMessage = async (
  chatData: Chat | MockChat,
  message: Message | TestMessage,
) => {
  // If it's a "Broadcast" message, it's not processed
  if (
    chatData.id.user == 'status' ||
    chatData.id._serialized == 'status@broadcast'
  )
    return false;

  // Check if message is from a group
  return await shouldProcessGroupMessage(chatData, message);
};

export const removeBotName = (message: Message | TestMessage) => {
  const botName = getBotName();
  // Check if bot name is mentioned in the message
  if (message.body.toLowerCase().includes(botName.toLowerCase())) {
    // Remove bot name from message for processing
    message.body = message.body.replace(new RegExp(botName, 'gi'), '').trim();
  }
};

export const getMessagesToProcess = async (chatData: Chat | MockChat) => {
  const fetchedMessages: Array<Message | TestMessage> =
    await chatData.fetchMessages({
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

export const isMessageAgeValid = (message: Message | TestMessage) => {
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
  chatData: Chat | MockChat,
  messageList: Array<
    ProcessMessageParam | OpenAIMessage | GeminiContextContent
  >,
) => {
  let messagesToProcess;
  try {
    messagesToProcess = await getMessagesToProcess(chatData);
  } catch (error) {
    addLog(`Error retrieving messages to process: ${error}`);
    return;
  }
  let imageCount: number = 0;

  for (const msg of messagesToProcess.reverse()) {
    try {
      // Validate if the message was written less than maxHoursLimit hours ago; if older, it's not considered
      if (!isMessageAgeValid(msg)) break;

      // add cached function calls so ai doesn't do them again 
      const cachedFunctionCalls = getFromFunctionCache(msg.id._serialized);
      if (cachedFunctionCalls && getBotMode() === 'GEMINI') {
        const calls = JSON.parse(cachedFunctionCalls);
        for (let call of calls) {
          if (call.name && call.args && call.result) {
            const function_response_part = {
              name: call.name,
              response: { result: call.result },
            };
            messageList.push({
              role: 'user',
              parts: [{ functionResponse: function_response_part }],
            });
            messageList.push({
              role: 'model',
              parts: [{ functionCall: { name: call.name, args: call.args }}],
            });
          }
        }
      }

      // Check if the message includes media or if it is of another type
      const isImage = getIsImage(msg);
      const isAudio = getIsAudio(msg);
      const isVideo = getIsVideo(msg);
      const isDocument = getIsDocument(msg);
      const isOther =
        !isImage && !isAudio && !isVideo && !isDocument && msg.type != 'chat';

      if (
        isOther ||
        (isImage && !imageProcessingModes.includes(getBotMode())) ||
        ((isVideo || isDocument) && getBotMode() !== 'GEMINI')
      )
        continue;

      let media = null;
      try {
        media =
          (isImage && imageCount < 2 && getBotMode() !== 'DIFY_CHAT') ||
          isAudio ||
          isVideo ||
          isDocument
            ? await msg.downloadMedia()
            : null;
        if (media && (isImage || isVideo)) imageCount++;
      } catch (error) {
        console.error(`Error downloading media: ${error}`);
        continue;
      }

      const messageListItem = await getContextMessageContent(
        msg,
        media,
        isAudio,
      );

      if (messageListItem) {
        messageList.push(messageListItem);
      }
    } catch (e: any) {
      console.error(
        `Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`,
      );
    }
  }
};

export const getAssistantRoleString = () => {
  if (getBotMode() === 'GEMINI') {
    return 'model';
  }
  return 'assistant';
};

export const getContextMessageContent = async (
  msg: Message | TestMessage,
  media: MessageMedia | null,
  isAudio: boolean,
) => {
  let messageBody: string | ImageMessageContentItem[] = msg.body;

  if (media && isAudio) {
    try {
      const cachedMessage = getAudioMessage(msg.id._serialized);
      if (cachedMessage) {
        messageBody = cachedMessage;
      } else {
        messageBody = await transcribeVoice(media);
        setToAudioCache(msg.id._serialized, messageBody);
      }
    } catch (error) {
      console.error('Error transcribing voice:', error);
      return;
    }
  }

  let geminiMediaPart: GeminiContextPart | undefined;

  if (media && !isAudio) {
    switch (getBotMode()) {
      case 'OPENAI_ASSISTANT':
        const cachedMessage = getImageMessage(msg.id._serialized);
        if (cachedMessage) {
          messageBody = cachedMessage;
        } else {
          messageBody = await getChatImageInterpretation(msg, media);
        }
        break;
      case 'GEMINI':
        let imageUri;
        const cachedImage = getImageMessage(msg.id._serialized);
        if (cachedImage) {
          imageUri = cachedImage;
        } else {
          try {
            imageUri = await uploadImageToGemini(media.data, media.mimetype);
            if (imageUri) {
              setToImageMessageCache(msg.id._serialized, imageUri);
            }
          } catch (error) {
            addLog(`Image upload error: ${error}`);
            return;
          }
        }
        if (imageUri) {
          geminiMediaPart = {
            fileData: {
              fileUri: imageUri,
              mimeType: media.mimetype,
            },
          };
        }
        break;
      default:
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
        break;
    }
  }

  const role =
    !msg.fromMe || (media && !isAudio) ? 'user' : getAssistantRoleString();

  switch (getBotMode()) {
    case 'GEMINI':
      const parts: GeminiContextPart[] = [{ text: messageBody as string }];
      if (geminiMediaPart) {
        parts.push(geminiMediaPart);
      }
      return {
        role,
        parts,
      } as GeminiContextContent;
    case 'OPENAI_ASSISTANT':
      return { role: role, content: messageBody as string } as OpenAIMessage;
    default:
      return {
        role: role,
        content: messageBody,
        // name: role,
      } as ProcessMessageParam;
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
- -mode [assistant|chat|chat-webui|dify|gemini]: Switch between OpenAI Assistant, OpenAI Chat, Open WebUI Chat, Dify and Gemini modes
- -status: Show current bot settings
- -sendTo: Send message to a certain number`;
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

export const changeBotMode = (message: Message | TestMessage) => {
  const newMode = message.body.substring(6).trim().toLowerCase();
  let messageString = '';
  switch (newMode) {
    case 'assistant':
      setBotMode('OPENAI_ASSISTANT');
      messageString = 'Switched to OpenAI Assistant mode';
      break;
    case 'chat':
      setBotMode('OPENAI_CHAT');
      messageString = 'Switched to OpenAI Chat mode';
      break;
    case 'chat-webui':
      setBotMode('OPEN_WEBUI_CHAT');
      messageString = 'Switched to Open WebUI Chat mode';
      break;
    case 'dify':
      setBotMode('DIFY_CHAT');
      messageString = 'Switched to Dify mode';
      break;
    case 'gemini':
      setBotMode('GEMINI');
      messageString = 'Switched to Gemini mode';
      break;
    default:
      messageString =
        'Invalid mode. Use "assistant", "chat", "chat-webui", "dify", or "gemini".';
      break;
  }
  addLog(messageString);
  return {
    from: message.from,
    messageContent: messageString,
    rawText: messageString,
  };
};

export const updatePromptFromCommand = (message: Message | TestMessage) => {
  const newPrompt = message.body.substring(8).trim();
  setCustomPrompt(newPrompt);
  addLog(`Updated custom prompt: ${newPrompt}`);
  return {
    from: message.from,
    messageContent: 'Prompt updated successfully!',
    rawText: 'Prompt updated successfully!',
  };
};

export const resetContextFromCommand = (message: Message | TestMessage) => {
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
  message: Message | TestMessage,
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

export const getIsImage = (message: Message | TestMessage): boolean => {
  const isImage =
    message.type === MessageTypes.IMAGE ||
    message.type === MessageTypes.STICKER;
  return isImage;
};

export const getIsAudio = (message: Message | TestMessage): boolean => {
  const isAudio =
    message.type === MessageTypes.VOICE || message.type === MessageTypes.AUDIO;
  return isAudio;
};

export const getIsVideo = (message: Message | TestMessage): boolean => {
  const isVideo = message.type === MessageTypes.VIDEO;
  return isVideo;
};

export const getIsDocument = (message: Message | TestMessage): boolean => {
  const isDocument = message.type === MessageTypes.DOCUMENT;
  return isDocument;
};

export const handleSendTo = async (msg: Message) => {
  if (msg.body.startsWith('-sendTo ')) {
    // Direct send a new message to specific id
    let number = msg.body.split(' ')[1];
    let messageIndex = msg.body.indexOf(number) + number.length;
    let message = msg.body.slice(messageIndex, msg.body.length);
    number = number.includes('@c.us') ? number : `${number}@c.us`;
    return { message, number };
  } else {
    return false;
  }
};
