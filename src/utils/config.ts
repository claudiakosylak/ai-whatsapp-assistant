// Bot configuration management
let botName = "Roboto";
let messageHistoryLimit = 1;
let resetCommandEnabled = true;
let maxMessageAge = 24;

export type BotMode = "OPENAI_ASSISTANT" | "OPEN_WEBUI_CHAT" | "DIFY_CHAT"

export let mode = "OPEN_WEBUI_CHAT" as BotMode;

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
