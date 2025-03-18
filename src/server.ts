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

// Create Express application
const app = express();
config();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());

// API Routes
const apiRouter = express.Router();

apiRouter.get('/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello World!' });
});

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
