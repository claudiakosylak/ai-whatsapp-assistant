import {
  DEFAULT_AUDIO_API,
  DEFAULT_BOT_NAME,
  DEFAULT_CHAT_API,
  DEFAULT_CONTEXT_LENGTH,
  DEFAULT_ELEVEN_VOICE_ID,
  DEFAULT_ENABLE_RESET_COMMAND,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MAX_MESSAGE_AGE,
  DEFAULT_OPEN_WEBUI_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_PROMPT,
  DEFAULT_RESPOND_WITH_VOICE,
} from '../config';
import { OpenAIVoice } from '../types';
import { AudioMode, BotMode } from '../types';

// Bot configuration management
let botName: string = (DEFAULT_BOT_NAME as string) || 'Robot';
let messageHistoryLimit: number = DEFAULT_CONTEXT_LENGTH
  ? parseInt(DEFAULT_CONTEXT_LENGTH)
  : 3;
let resetCommandEnabled: boolean =
  DEFAULT_ENABLE_RESET_COMMAND === 'false' ? false : true;
let maxMessageAge: number = DEFAULT_MAX_MESSAGE_AGE
  ? parseInt(DEFAULT_MAX_MESSAGE_AGE)
  : 24;

export let mode: BotMode = (DEFAULT_CHAT_API as BotMode) || 'OPENAI_CHAT';

export let models: Record<BotMode, string | undefined> = {
  OPEN_WEBUI_CHAT: DEFAULT_OPEN_WEBUI_MODEL,
  OPENAI_CHAT: DEFAULT_OPENAI_MODEL || 'gpt-4.5-preview',
  GEMINI: DEFAULT_GEMINI_MODEL || 'gemini-2.0-flash',
  OPENAI_ASSISTANT: undefined,
  DIFY_CHAT: undefined,
}

export const getModels = () => models;

export const setModels = (botMode: BotMode, val: string) => {
  models[botMode] = val
}

export let audioMode: AudioMode =
  (DEFAULT_AUDIO_API as AudioMode) || 'ELEVEN_LABS';

export let openAiVoice: OpenAIVoice = 'nova'

export let elevenVoiceId: string = DEFAULT_ELEVEN_VOICE_ID || 'IuRRIAcbQK5AQk1XevPj'

export const getOpenAiVoice = () => openAiVoice;
export const setOpenAiVoice = (val: OpenAIVoice) => {
  openAiVoice = val
}
export const getElevenVoiceId = () => elevenVoiceId;
export const setElevenVoiceId = (val: string) => {
  elevenVoiceId = val
}

export const getAudioMode = () => audioMode;

export const setAudioMode = (newAudioMode: AudioMode) =>
  (audioMode = newAudioMode);

let customPrompt: string = (DEFAULT_PROMPT as string) || '';

export let enableAudioResponse: boolean =
  DEFAULT_RESPOND_WITH_VOICE === 'true' || false;

export let disableWhatsappConnection = false;

export const getAudioResponseEnabled = () => enableAudioResponse;

export const setAudioResponseEnabled = (val: boolean) =>
  (enableAudioResponse = val);

export const getBotName = () => botName;

export const setBotName = (name: string) => {
  botName = name;
};

export const getMessageHistoryLimit = () => messageHistoryLimit;

export const setMessageHistoryLimit = (limit: number) => {
  messageHistoryLimit = limit;
};

export const getBotMode = () => mode;

export const setBotMode = (botMode: BotMode) => (mode = botMode);

export const isResetCommandEnabled = () => resetCommandEnabled;

export const setResetCommandEnabled = (enabled: boolean) => {
  resetCommandEnabled = enabled;
};

export const getMaxMessageAge = () => maxMessageAge;

export const setMaxMessageAge = (hours: number) => {
  maxMessageAge = hours;
};

export const getCustomPrompt = () => customPrompt;

export const setCustomPrompt = (prompt: string) => {
  customPrompt = prompt;
};

const systemPrompt = `You are an assistant operating on WhatsApp. Your name is ${getBotName()}. The current date is The current date is ${new Date().toLocaleDateString()}. Keep your responses concise and informative; you should not exceed the 2000 character limit.`;

const openAiExtraPrompt = [
  'OPENAI_ASSISTANT',
  'OPEN_WEBUI_CHAT',
  'OPENAI_CHAT',
].includes(getBotMode())
  ? `Only generate a response to the last user message in the messages list given to you. Previous messages are ONLY to be used as context if absolutely necessary or if prompted to recall a previous message. Examples of messages that require you to use your emojiReaction function include: "Give me a thumbs up", "React to this message with a smiley face", "give me a unicorn emoji". When you call the emojiReaction function, do not also include that same emoji in your text response.`
  : ``;

const geminiExtraPrompt =
  getBotMode() === 'GEMINI'
    ? 'You are able to respond to questions. You are able to analyze videos. Examples of messages that require you to use your emojiReaction function include: "Give me a thumbs up", "React to this message with a smiley face", "give me a unicorn emoji". When you call the emojiReaction function, do not also include that same emoji in your text response.'
    : '';

export const getPrompt = () =>
  systemPrompt + openAiExtraPrompt + geminiExtraPrompt + getCustomPrompt();
