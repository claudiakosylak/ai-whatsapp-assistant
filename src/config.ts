// Bot configuration management
let botName = "Roboto";
let messageHistoryLimit = 10;
let resetCommandEnabled = true;
let maxMessageAge = 24;

export type BotMode = "OPENAI_ASSISTANT" | "OPEN_WEBBUI_CHAT"

export let mode = "OPEN_WEBBUI_CHAT" as BotMode;

export let enableAudioResponse = true;

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
