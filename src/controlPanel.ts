import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { processAssistantResponse } from './assistant';
import { processChatCompletionResponse } from './chatCompletion';
import { ChatCompletionMessageParam } from 'openai/resources';
import { config } from 'dotenv';
import {
  setBotName,
  setMessageHistoryLimit,
  setResetCommandEnabled,
  setMaxMessageAge,
  getBotMode,
  setBotMode,
  setAudioResponseEnabled,
} from './utils/config';
import { AUDIO_DIR, ENV_PATH } from './constants';
import { deleteAudioFiles } from './utils/audio';
import {
  addLog,
  addMessageContentString,
  chatHistory,
  logs,
  setChatHistory,
} from './utils/controlPanel';
import { getHTML } from './utils/html';
import { OpenAIMessage } from './types';

const app = express();
config();
const PORT = process.env.FRONTEND_PORT;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Serve the `public/audio` directory as a static folder
app.use(
  '/audio',
  express.static(AUDIO_DIR, {
    setHeaders: (res, path) => {
      res.setHeader('Accept-Ranges', 'bytes');
    },
  }),
);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  deleteAudioFiles();

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

app.get('/chat-history', (req, res) => {
  res.json(chatHistory);
});

app.post('/send-message', async (req, res) => {
  const { message } = req.body;

  // Add user message to history
  chatHistory.push({ role: 'user', content: message });

  try {
    let response;
    if (getBotMode() === 'OPENAI_ASSISTANT') {
      const messages = chatHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      response = await processAssistantResponse(
        'test',
        messages as OpenAIMessage[],
      );
    } else {
      const messages = chatHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.role,
      }));
      addLog('Sending message to chat completion');
      response = await processChatCompletionResponse(
        'test',
        messages as ChatCompletionMessageParam[],
      );
    }

    // Add assistant response to history
    chatHistory.push({
      role: 'assistant',
      content: addMessageContentString(response.messageContent),
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
