import path from 'path';
import { AudioMode } from './types';

export const AUDIO_DIR = path.join(__dirname, 'public/audio'); // Directory for storing audio files
export const IMAGE_DIR = path.join(__dirname, 'public/images'); // Directory for storing image files
export const ENV_PATH = path.join(__dirname, '..', '.env');

export const audioModes: AudioMode[] = ['ELEVEN_LABS', 'OPENAI'];

export const audioHandlingApis: Record<AudioMode, string> = {
  ELEVEN_LABS: 'Eleven Labs',
  OPENAI: 'OpenAI',
};
