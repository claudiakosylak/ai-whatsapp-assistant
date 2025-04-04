import dotenv from 'dotenv';
import chokidar from 'chokidar';
import { ENV_PATH } from './constants';
import { addLog } from './utils/controlPanel';

dotenv.config();

// constants for defaults on reboot, will not change in app while running
export const DEFAULT_PROMPT = process.env.DEFAULT_PROMPT;
export const DEFAULT_BOT_NAME = process.env.DEFAULT_BOT_NAME;
export const DEFAULT_CONTEXT_LENGTH = process.env.DEFAULT_CONTEXT_LENGTH;
export const DEFAULT_MAX_MESSAGE_AGE = process.env.DEFAULT_MAX_MESSAGE_AGE;
export const DEFAULT_ENABLE_RESET_COMMAND =
  process.env.DEFAULT_ENABLE_RESET_COMMAND;
export const DEFAULT_RESPOND_WITH_VOICE =
  process.env.DEFAULT_RESPOND_WITH_VOICE;
export const DEFAULT_CHAT_API = process.env.DEFAULT_CHAT_API;
export const DEFAULT_AUDIO_API = process.env.DEFAULT_AUDIO_API;
export const DEFAULT_OPENAI_VOICE = process.env.DEFAULT_OPENAI_VOICE;
export const DEFAULT_ELEVEN_VOICE_ID = process.env.DEFAULT_ELEVEN_VOICE_ID;
export const DEFAULT_OPENAI_MODEL = process.env.DEFAULT_OPENAI_MODEL as string;
export const DEFAULT_OPEN_WEBUI_MODEL = process.env.DEFAULT_OPEN_WEBUI_MODEL as string;
export const DEFAULT_GEMINI_MODEL = process.env.DEFAULT_GEMINI_MODEL as string;

// environment variables that will change dynamically without reboot if .env file changed either in ccontrol panel or directly
export let ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
export let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export let OPEN_WEBUI_KEY = process.env.OPEN_WEBUI_KEY;
export let OPEN_WEBUI_BASE_URL = process.env.OPEN_WEBUI_BASE_URL;
export let OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
export let DIFY_BASE_URL = process.env.DIFY_BASE_URL;
export let DIFY_API_KEY = process.env.DIFY_API_KEY;
export let NODE_CACHE_TIME = parseInt(process.env.NODE_CACHE_TIME || '259200');
export let GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const updateConfig = () => {
  ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
  OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  OPEN_WEBUI_KEY = process.env.OPEN_WEBUI_KEY;
  OPEN_WEBUI_BASE_URL = process.env.OPEN_WEBUI_BASE_URL;
  OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
  DIFY_BASE_URL = process.env.DIFY_BASE_URL;
  DIFY_API_KEY = process.env.DIFY_API_KEY;
  NODE_CACHE_TIME = parseInt(process.env.NODE_CACHE_TIME || '259200');
  GEMINI_API_KEY = process.env.GEMINI_API_KEY;
};

// Watch for changes in the .env file
chokidar.watch(ENV_PATH).on('change', () => {
  addLog('⚡ .env file changed, reloading...');
  dotenv.config();
  updateConfig();
});
