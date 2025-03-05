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
} from './utils/config';
import { AUDIO_DIR, ENV_PATH, IMAGE_DIR } from './constants';
import { deleteAudioFiles } from './utils/audio';
import {
  addLog,
  addMessageContentString,
  chatHistory,
  getResponse,
  logs,
  setChatHistory,
} from './utils/controlPanel';
import { getHTML } from './utils/html';
import { deleteImageFiles, saveImageFile } from './utils/images';

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
    res.redirect('/');
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    addLog(`Error saving configuration: ${errorMessage}`);
    res.status(500).send('Error saving configuration');
  }
});

app.get('/logs', (req, res) => {
  res.json(logs);
});

app.delete('/chat-history', (req, res) => {
  setChatHistory([])
  res.status(201).send("Chat history cleared!")
  res.redirect('/');
})

app.get('/chat-history', (req, res) => {
  res.json(chatHistory);
});

app.post('/send-message', async (req, res) => {
  const { message, image, imageName, mimeType } = req.body;

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

  // Add user message to history
  chatHistory.push({
    role: 'user',
    content: addMessageContentString(message, imageUrl),
    rawText: contentJSON,
  });

  try {
    const response = await getResponse();

    // Add assistant response to history
    chatHistory.push({
      role: 'assistant',
      content: addMessageContentString(response.messageContent),
      rawText: response.rawText,
    });

    // Keep only last 50 messages
    if (chatHistory.length > 50) {
      setChatHistory(chatHistory.slice(-50));
    }

    res.json({ success: true });
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

  res.redirect('/');
});
export const startControlPanel = () => {
  app.listen(PORT, () => {
    console.log(`Control panel is running at http://localhost:${PORT}`);
  });
};
