import express from 'express';
import path from 'path';
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
  isResetCommandEnabled,
  setAudioMode,
  setAudioResponseEnabled,
  setBotMode,
  setBotName,
  setCustomPrompt,
  setMaxMessageAge,
  setMessageHistoryLimit,
  setResetCommandEnabled,
} from './utils/botSettings';
import {
  addLog,
  changeChatType,
  chatHistory,
  getTestChatData,
  setChatHistory,
} from './utils/controlPanel';
import { randomUUID } from 'crypto';
import { MessageMedia } from 'whatsapp-web.js';
import { TestMessage } from './types';
import { base64ToBlobUrl } from './utils/images';
import { processMessage } from './utils/whatsapp';

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
    replyingMessage = replyingMessageChat && replyingMessageChat.message;
  }

  const getQuotedMessage: () => Promise<TestMessage> = () => {
    return new Promise((resolve) => {
      const quotedMessage: TestMessage = {
        id: {
          fromMe: replyingMessage ? replyingMessage.id.fromMe : false,
          _serialized: replyingMessageId,
        },
        body: replyingMessage ? replyingMessage.body : '',
        hasQuotedMsg: false,
        timestamp: replyingMessage ? replyingMessage.timestamp : 0,
        type: replyingMessage ? replyingMessage.type : 'chat',
        fromMe: replyingMessage ? replyingMessage.fromMe : false,
        from: 'test',
        downloadMedia: getMessageMedia,
        getQuotedMessage: getQuotedMessage,
        react: (emoji: string) => undefined,
      };
      resolve(quotedMessage);
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
    type: imageBase64 ? 'image' : audioBase64 ? 'audio' : 'chat',
    fromMe: false,
    from: 'test2',
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
    mediaType: imageBase64 ? 'image' : 'audio',
  });

  try {
    const response = await processMessage(userTestMessage, getTestChatData());

    if (!response) {
      res.status(500).json({ success: false });
      return;
    }

    const assistantMessageID = randomUUID();

    const assistantTestMessage: TestMessage = {
      id: {
        fromMe: true,
        _serialized: assistantMessageID,
      },
      body: response.rawText,
      hasQuotedMsg: false,
      timestamp: parseInt(new Date().toString()),
      type: 'chat',
      fromMe: true,
      from: 'test',
      downloadMedia: getMessageMedia,
      getQuotedMessage,
      react: (emoji: string) => undefined,
    };

    let newImageUrl;
    if (response.messageMedia) {
      newImageUrl = base64ToBlobUrl(
        response.messageMedia.data,
        response.messageMedia.mimetype,
      );
    }

    // Add assistant response to history
    chatHistory.push({
      id: assistantMessageID,
      role: 'assistant',
      name: 'assistant',
      content: response.messageContent as string,
      rawText: response.rawText,
      message: assistantTestMessage,
      media:
        typeof response.messageContent !== 'string'
          ? response.messageContent
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

  if (resetCommandEnabled !== isResetCommandEnabled()) {
    setResetCommandEnabled(!!resetCommandEnabled);
    addLog(`Reset command ${resetCommandEnabled ? 'enabled' : 'disabled'}`);
  }

  if (respondAsVoice !== getAudioResponseEnabled()) {
    setAudioResponseEnabled(!!respondAsVoice);
    addLog(
      `Respond in voice messages ${respondAsVoice ? 'enabled' : 'disabled'}`,
    );
  }

  if (botMode !== getBotMode()) {
    setBotMode(botMode);
    addLog(`Bot mode changed to ${botMode}`);
  }

  if (botName && botName !== getBotName()) {
    setBotName(botName);
    addLog(`Bot name changed to ${botName}`);
  }

  if (audioMode !== getAudioMode()) {
    setAudioMode(audioMode);
    addLog(`Audio handling changed to ${audioMode}`);
  }

  res.json({ message: 'success' });
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

startControlPanel();

export default app;
