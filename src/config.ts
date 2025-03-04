// Bot configuration management
let botName = "Roboto";
let messageHistoryLimit = 10;
let resetCommandEnabled = true;
let maxMessageAge = 24;
let customPrompt = '';
let botMode: "OPENAI_ASSISTANT" | "OPEN_WEBBUI_CHAT" | "DIFY" = "OPENAI_ASSISTANT";

export const getBotMode = () => botMode;

export const setBotMode = (mode: "OPENAI_ASSISTANT" | "OPEN_WEBBUI_CHAT" | "DIFY") => {
    botMode = mode;
};

export const getBotName = () => botName;

export const setBotName = (name: string) => {
    botName = name;
};

export const getMessageHistoryLimit = () => messageHistoryLimit;

export const setMessageHistoryLimit = (limit: number) => {
    messageHistoryLimit = limit;
};

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