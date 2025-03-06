import dotenv from 'dotenv';
import chokidar from 'chokidar';
import { ENV_PATH } from './constants';
import { addLog } from './utils/controlPanel';

dotenv.config();

export let ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
export let OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export let OPEN_WEBUI_KEY = process.env.OPEN_WEBUI_KEY;
export let OPEN_WEBUI_BASE_URL = process.env.OPEN_WEBUI_BASE_URL;
export let OPEN_WEBUI_MODEL = process.env.OPEN_WEBUI_MODEL as string;
export let OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
export let DIFY_BASE_URL = process.env.DIFY_BASE_URL;
export let DIFY_API_KEY = process.env.DIFY_API_KEY;
export let NODE_CACHE_TIME = parseInt(process.env.NODE_CACHE_TIME || '259200');

const updateConfig = () => {
  ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
  OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  OPEN_WEBUI_KEY = process.env.OPEN_WEBUI_KEY;
  OPEN_WEBUI_BASE_URL = process.env.OPEN_WEBUI_BASE_URL;
  OPEN_WEBUI_MODEL = process.env.OPEN_WEBUI_MODEL as string;
  OPENAI_ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;
  DIFY_BASE_URL = process.env.DIFY_BASE_URL;
  DIFY_API_KEY = process.env.DIFY_API_KEY;
  NODE_CACHE_TIME = parseInt(process.env.NODE_CACHE_TIME || '259200');
};

// Watch for changes in the .env file
chokidar.watch(ENV_PATH).on('change', () => {
  addLog('⚡ .env file changed, reloading...');
  dotenv.config()
  updateConfig()
});
