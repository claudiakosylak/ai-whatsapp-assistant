import express from 'express';
import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { Request, Response } from 'express';
import {
  getAudioMode,
  getAudioResponseEnabled,
  getBotMode,
  getBotName,
  getCustomPrompt,
  getMaxMessageAge,
  getMessageHistoryLimit,
  getOpenAiVoice,
  isResetCommandEnabled,
  setAudioMode,
  setAudioResponseEnabled,
  setBotMode,
  setBotName,
  setCustomPrompt,
  setMaxMessageAge,
  setMessageHistoryLimit,
  setOpenAiVoice,
  setResetCommandEnabled,
} from './utils/botSettings';
import {
  addLog,
  changeChatType,
  chatHistory,
  getEnvContent,
  getTestChatData,
  logs,
  setChatHistory,
  whatsappConnected,
} from './utils/controlPanel';
import { randomUUID } from 'crypto';
import { MessageMedia } from 'whatsapp-web.js';
import { TestMessage } from './types';
import { processMessage } from './utils/whatsapp';
import { ENV_PATH } from './constants';

// Create Express application
const app = express();
config();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
const apiRouter = express.Router();

apiRouter.get('/chat', (req: Request, res: Response) => {
  const testChat = getTestChatData();
  const chatMessages = chatHistory;
  res.json({ chat: testChat, messages: chatMessages });
});

apiRouter.get('/config', (req: Request, res: Response) => {
  const config = getEnvContent();
  res.json({ config });
});

apiRouter.put('/config', (req: Request, res: Response) => {
  const config = req.body.config;

  try {
    fs.writeFileSync(ENV_PATH, config);
    // Parse and reload the environment variables after writing the file
    const parsed = require('dotenv').config({ path: ENV_PATH }).parsed;
    if (parsed) {
      process.env = {
        ...process.env,
        ...parsed,
      };
    }
    addLog('Configuration updated successfully');
    res.json({ config });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    addLog(`Error saving configuration: ${errorMessage}`);
    res.status(500).send('Error saving configuration');
  }
});

apiRouter.get('/logs', (req: Request, res: Response) => {
  res.json(logs);
});

apiRouter.put('/chat', (req: Request, res: Response) => {
  const { isGroup } = req.body;
  if (isGroup !== getTestChatData().isGroup) {
    changeChatType();
  }
  setChatHistory([]);
  res.json({ isGroup });
});

apiRouter.post('/messages', async (req: Request, res: Response) => {
  const {
    message,
    imageBase64,
    mimeType,
    replyingMessageId,
    audioBase64,
    user,
    fileType,
  } = req.body;

  const userMessageId = randomUUID();

  const userMessageMedia: MessageMedia | undefined = imageBase64
    ? {
        data: imageBase64,
        mimetype: mimeType,
      }
    : audioBase64
    ? { data: audioBase64, mimetype: mimeType }
    : undefined;

  const getMessageMedia: () => Promise<MessageMedia> = () =>
    new Promise((resolve) => {
      if (userMessageMedia) {
        resolve(userMessageMedia);
      }
    });

  let replyingMessage: TestMessage | undefined;
  if (replyingMessageId) {
    const replyingMessageChat = chatHistory.find(
      (msg) => msg.id === replyingMessageId,
    );
    if (replyingMessageChat) {
      replyingMessage = replyingMessageChat.message;
    }
  }

  const getQuotedMessage: () => Promise<TestMessage | undefined> = () => {
    return new Promise((resolve) => {
      if (replyingMessage) {
        resolve(replyingMessage);
      } else {
        resolve(undefined);
      }
    });
  };

  const addReaction = (emoji: string) => {
    const chatItem = chatHistory.find((chat) => chat.id === userMessageId);
    if (chatItem && emoji) {
      chatItem.reaction = emoji;
    }
  };

  const userTestMessage: TestMessage = {
    id: {
      fromMe: false,
      _serialized: userMessageId,
    },
    body: message,
    hasQuotedMsg: replyingMessageId !== '',
    timestamp: parseInt(new Date().toString()),
    type: fileType || 'chat',
    fromMe: false,
    from: 'test',
    downloadMedia: getMessageMedia,
    getQuotedMessage,
    react: addReaction,
  };

  // Add user message to history
  chatHistory.push({
    id: userMessageId,
    role: 'user',
    name: user,
    content: message,
    rawText: message,
    message: userTestMessage,
    media: userMessageMedia,
    mediaType: fileType || undefined,
    repliedMessage: replyingMessage,
  });

  try {
    const response = await processMessage(userTestMessage, getTestChatData());

    if (!response && chatHistory[chatHistory.length - 1].reaction) {
      res.status(201).json({ success: true });
      return;
    }

    if (!response) {
      res.status(500).json({ success: false });
      return;
    }

    const assistantMessageID = randomUUID();

    const getAssistantMessageMedia: () => Promise<MessageMedia> = () =>
      new Promise((resolve) => {
        if (
          response.messageContent &&
          typeof response.messageContent !== 'string'
        ) {
          resolve(response.messageContent);
        } else if (response.messageMedia) {
          resolve(response.messageMedia);
        }
      });

    const assistantTestMessage: TestMessage = {
      id: {
        fromMe: true,
        _serialized: assistantMessageID,
      },
      body:
        response.messageContent && typeof response.messageContent === 'string'
          ? response.messageContent
          : response.messageContent && !response.messageMedia
          ? response.rawText
          : '',
      hasQuotedMsg: false,
      timestamp: parseInt(new Date().toString()),
      type:
        response.messageContent && typeof response.messageContent !== 'string'
          ? 'audio'
          : response.messageContent
          ? 'chat'
          : 'image',
      fromMe: true,
      from: 'test',
      downloadMedia: getAssistantMessageMedia,
      getQuotedMessage,
      react: (emoji: string) => undefined,
    };

    // Add assistant response to history
    chatHistory.push({
      id: assistantMessageID,
      role: 'assistant',
      name: 'assistant',
      content:
        typeof response.messageContent === 'string'
          ? response.messageContent
          : '',
      rawText: response.rawText,
      message: assistantTestMessage,
      media:
        typeof response.messageContent !== 'string'
          ? response.messageContent
          : response.messageMedia
          ? response.messageMedia
          : undefined,
      mediaType: response.messageMedia
        ? 'image'
        : response.messageContent !== 'string'
        ? 'audio'
        : undefined,
    });

    // Keep only last 50 messages
    if (chatHistory.length > 50) {
      setChatHistory(chatHistory.slice(-50));
    }

    res.status(201).json({ success: true });
  } catch (error) {
    addLog(`Error in test chat: ${error}`);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

apiRouter.get('/prompt', (req: Request, res: Response) => {
  const prompt = getCustomPrompt();
  res.json({ prompt });
});

apiRouter.put('/prompt', (req: Request, res: Response) => {
  const { prompt } = req.body;
  setCustomPrompt(prompt);
  addLog(`Custom prompt updated from control panel`);
});

apiRouter.get('/settings', (req: Request, res: Response) => {
  const settings = {
    messageHistoryLimit: getMessageHistoryLimit(),
    resetCommandEnabled: isResetCommandEnabled(),
    maxMessageAge: getMaxMessageAge(),
    botMode: getBotMode(),
    respondAsVoice: getAudioResponseEnabled(),
    botName: getBotName(),
    audioMode: getAudioMode(),
    openAiVoice: getOpenAiVoice(),
  };
  res.json({ settings });
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const {
    messageHistoryLimit,
    resetCommandEnabled,
    maxMessageAge,
    botMode,
    respondAsVoice,
    botName,
    audioMode,
    openAiVoice,
  } = req.body;

  if (messageHistoryLimit && messageHistoryLimit !== getMessageHistoryLimit()) {
    const limit = parseInt(messageHistoryLimit);
    if (limit >= 1 && limit <= 50) {
      setMessageHistoryLimit(limit);
      addLog(`Message history limit updated to: ${limit}`);
    }
  }

  if (maxMessageAge && maxMessageAge !== getMaxMessageAge()) {
    const hours = parseInt(maxMessageAge);
    if (hours >= 1 && hours <= 72) {
      setMaxMessageAge(hours);
      addLog(`Max message age updated to: ${hours} hours`);
    }
  }

  if (
    resetCommandEnabled !== undefined &&
    resetCommandEnabled !== isResetCommandEnabled()
  ) {
    setResetCommandEnabled(!!resetCommandEnabled);
    addLog(`Reset command ${resetCommandEnabled ? 'enabled' : 'disabled'}`);
  }

  if (
    respondAsVoice !== undefined &&
    respondAsVoice !== getAudioResponseEnabled()
  ) {
    setAudioResponseEnabled(!!respondAsVoice);
    addLog(
      `Respond in voice messages ${respondAsVoice ? 'enabled' : 'disabled'}`,
    );
  }

  if (openAiVoice && openAiVoice !== getOpenAiVoice()) {
    setOpenAiVoice(openAiVoice);
    addLog(`Changed OpenAI voice to ${openAiVoice}`);
  }

  if (botMode !== getBotMode()) {
    setBotMode(botMode);
    addLog(`Bot mode changed to ${botMode}`);
  }

  if (botName && botName !== getBotName()) {
    setBotName(botName);
    addLog(`Bot name changed to ${botName}`);
  }

  if (audioMode !== undefined && audioMode !== getAudioMode()) {
    setAudioMode(audioMode);
    addLog(`Audio handling changed to ${audioMode}`);
  }

  res.json({ message: 'success' });
});

apiRouter.get('/whatsapp-connection', (req: Request, res: Response) => {
  res.json({ connected: whatsappConnected });
});

// Mount API router under /api path
app.use('/api', apiRouter);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Handle all other requests by sending index.html
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

export const startControlPanel = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

export default app;
