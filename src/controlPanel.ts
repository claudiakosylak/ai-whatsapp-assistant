import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import {
  setBotName,
  setMessageHistoryLimit,
  setResetCommandEnabled,
  setMaxMessageAge,
  setBotMode,
  setAudioResponseEnabled,
  setCustomPrompt,
  setAudioMode,
} from './utils/botSettings';
import { AUDIO_DIR, ENV_PATH, IMAGE_DIR } from './constants';
import { deleteAudioFiles } from './utils/audio';
import {
  addLog,
  addMessageContentString,
  changeChatType,
  chatHistory,
  logs,
  setChatHistory,
  testChatData,
  whatsappConnected,
} from './utils/controlPanel';
import { getHTML } from './utils/html';
import { deleteImageFiles, saveImageFile } from './utils/images';
import { randomUUID } from 'crypto';
import { TestMessage } from './types';
import { MessageMedia } from 'whatsapp-web.js';
import { processMessage } from './utils/whatsapp';
import { clearAllErrors, clearError, getErrors } from './utils/errors';

deleteAudioFiles();
deleteImageFiles();

const app = express();
config();
const PORT = process.env.FRONTEND_PORT;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
// Serve the `public/audio` directory as a static folder
app.use(
  '/audio',
  express.static(AUDIO_DIR, {
    setHeaders: (res, path) => {
      res.setHeader('Accept-Ranges', 'bytes');
    },
  }),
);
app.use('/images', express.static(IMAGE_DIR));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send(getHTML());
});

app.post('/save-config', (req, res) => {
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
    clearAllErrors();
    res.redirect('/');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    addLog(`Error saving configuration: ${errorMessage}`);
    res.status(500).send('Error saving configuration');
  }
});

app.put('/update-chat-type', (req, res) => {
  setChatHistory([]);
  const newIsGroup = changeChatType();
  res.json({ isGroup: newIsGroup });
});

app.get('/logs', (req, res) => {
  res.json(logs);
});

app.get('/whatsapp-connection', (req, res) => {
  res.json({ connected: whatsappConnected });
});

app.get('/errors', (req, res) => {
  res.json(getErrors());
});

app.delete('/chat-history', (req, res) => {
  setChatHistory([]);
  res.status(201).send('Chat history cleared!');
  // res.redirect('/');
});

app.get('/chat-history', (req, res) => {
  res.json(chatHistory);
});

app.get('/get-message/:messageId', async (req, res) => {
  const messageId = req.params.messageId;
  const message = chatHistory.find((msg) => msg.id === messageId);
  if (message) {
    res.status(200).json(message);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

app.post('/send-message', async (req, res) => {
  const {
    message,
    image,
    imageName,
    mimeType,
    user,
    replyingMessageId,
    audio,
  } = req.body;

  let imageUrl;
  if (image && imageName && mimeType) {
    imageUrl = saveImageFile(image, imageName);
  }

  const messageBody =
    !image || !imageName || !mimeType
      ? message
      : [
          {
            type: 'text',
            text: message,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${image}`,
            },
          },
        ];

  const contentJSON = JSON.stringify(messageBody);

  const userMessageId = randomUUID();

  let replyingMessage: TestMessage | undefined;
  if (replyingMessageId) {
    const replyingMessageChat = chatHistory.find(
      (msg) => msg.id === replyingMessageId,
    );
    replyingMessage = replyingMessageChat && replyingMessageChat.message;
  }

  const userMessageMedia: MessageMedia | undefined = image
    ? {
        data: image,
        filename: imageName,
        filesize: null,
        mimetype: mimeType,
      }
    : audio
    ? {
        data: audio,
        mimetype: mimeType,
      }
    : undefined;

  const getMessageMedia: () => Promise<MessageMedia> = () =>
    new Promise((resolve) => {
      if (userMessageMedia) {
        resolve(userMessageMedia);
      }
    });

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
      };
      resolve(quotedMessage);
    });
  };

  const userTestMessage: TestMessage = {
    id: {
      fromMe: false,
      _serialized: userMessageId,
    },
    body: message,
    hasQuotedMsg: replyingMessageId !== '',
    timestamp: parseInt(new Date().toString()),
    type: image ? 'image' : audio ? 'audio' : 'chat',
    fromMe: false,
    from: 'test',
    downloadMedia: getMessageMedia,
    getQuotedMessage,
  };

  // Add user message to history
  chatHistory.push({
    id: userMessageId,
    role: 'user',
    name: user,
    content: audio
      ? addMessageContentString(userMessageMedia as MessageMedia)
      : addMessageContentString(message, imageUrl),
    rawText: contentJSON,
    message: userTestMessage,
    media: userMessageMedia,
  });

  try {
    const response = await processMessage(userTestMessage, testChatData);

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
      type: image ? 'image' : 'chat',
      fromMe: true,
      from: 'test',
      downloadMedia: getMessageMedia,
      getQuotedMessage,
    };

    let newImageUrl;
    if (response.messageMedia) {
      newImageUrl = saveImageFile(response.messageMedia.data, 'new-image');
    }

    // Add assistant response to history
    chatHistory.push({
      id: assistantMessageID,
      role: 'assistant',
      name: 'assistant',
      content: response.messageMedia
        ? addMessageContentString(response.messageContent, newImageUrl)
        : addMessageContentString(response.messageContent),
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

app.post('/save-bot-name', (req, res) => {
  const { botName } = req.body;
  if (botName && botName.trim()) {
    setBotName(botName.trim());
    addLog(`Bot name updated to: ${botName}`);
  }
  res.redirect('/');
});

app.post('/save-custom-prompt', (req, res) => {
  const { customPrompt } = req.body;
  if (customPrompt !== undefined) {
    setCustomPrompt(customPrompt);
    addLog(`Custom prompt updated from control panel`);
  }
  res.redirect('/');
});

app.post('/save-bot-settings', (req, res) => {
  const {
    messageHistoryLimit,
    resetCommandEnabled,
    maxMessageAge,
    botMode,
    respondAsVoice,
    botName,
    audioMode,
  } = req.body;

  if (messageHistoryLimit) {
    const limit = parseInt(messageHistoryLimit);
    if (limit >= 1 && limit <= 50) {
      setMessageHistoryLimit(limit);
      addLog(`Message history limit updated to: ${limit}`);
    }
  }

  if (maxMessageAge) {
    const hours = parseInt(maxMessageAge);
    if (hours >= 1 && hours <= 72) {
      setMaxMessageAge(hours);
      addLog(`Max message age updated to: ${hours} hours`);
    }
  }

  setResetCommandEnabled(!!resetCommandEnabled);
  addLog(`Reset command ${resetCommandEnabled ? 'enabled' : 'disabled'}`);

  setAudioResponseEnabled(!!respondAsVoice);
  addLog(
    `Respond in voice messages ${respondAsVoice ? 'enabled' : 'disabled'}`,
  );

  setBotMode(botMode);
  addLog(`Bot mode changed to ${botMode}`);

  setBotName(botName);
  addLog(`Bot name changed to ${botName}`);

  setAudioMode(audioMode);
  addLog(`Audio handling changed to ${audioMode}`);
  clearError('audioModeError');

  res.redirect('/');
});

export const startControlPanel = () => {
  app.listen(PORT, () => {
    console.log(`Control panel is running at http://localhost:${PORT}`);
  });
};
