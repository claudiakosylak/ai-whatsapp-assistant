import express from 'express';
import path from 'path';
import { config } from 'dotenv';
import { Request, Response } from 'express';
import {
  audioMode,
  getAudioMode,
  getAudioResponseEnabled,
  getBotMode,
  getBotName,
  getCustomPrompt,
  getMaxMessageAge,
  getMessageHistoryLimit,
  isResetCommandEnabled,
} from './utils/botSettings';

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

apiRouter.get('/prompt', (req: Request, res: Response) => {
  const prompt = getCustomPrompt();
  res.json({ prompt });
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
