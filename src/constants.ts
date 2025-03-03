import path from 'path';
import { config } from 'dotenv';
config()

export const AUDIO_DIR = path.join(__dirname, 'public/audio'); // Directory for storing audio files
export const IMAGE_DIR = path.join(__dirname, 'public/images'); // Directory for storing image files
export const ENV_PATH = path.join(__dirname, '..', '.env');
