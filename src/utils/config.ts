import { AudioMode, BotMode } from "../types";

// Bot configuration management
let botName = "Roboto";
let messageHistoryLimit = 3;
let resetCommandEnabled = true;
let maxMessageAge = 24;

export let mode: BotMode = "OPEN_WEBUI_CHAT";

export let audioMode: AudioMode = "ELEVEN_LABS";

export const getAudioMode = () => audioMode;

export const setAudioMode = (newAudioMode: AudioMode) => audioMode = newAudioMode;

let customPrompt = '';

export let enableAudioResponse = false;

export let disableWhatsappConnection = false;

export const getAudioResponseEnabled = () => enableAudioResponse;

export const setAudioResponseEnabled = (val: boolean) => enableAudioResponse = val;

export const getBotName = () => botName;

export const setBotName = (name: string) => {
    botName = name;
};

export const getMessageHistoryLimit = () => messageHistoryLimit;

export const setMessageHistoryLimit = (limit: number) => {
    messageHistoryLimit = limit;
};

export const getBotMode = () => mode;

export const setBotMode = (botMode: BotMode) => mode = botMode;

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
}
