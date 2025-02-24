import { Chat, Message, MessageTypes } from "whatsapp-web.js";
import { OpenAIMessage } from ".";
import { processAssistantResponse } from "./assistant";
import { ChatCompletionMessageParam } from "openai/resources";
import { processChatCompletionResponse } from "./chatCompletion";

export const processAssistantMessage = async (message: Message) => {
    const chatData: Chat = await message.getChat();
    // If it's a "Broadcast" message, it's not processed
    if(chatData.id.user == 'status' || chatData.id._serialized == 'status@broadcast') return false;
    const actualDate = new Date();
    const messageList: OpenAIMessage[] = []
    const fetchedMessages = await chatData.fetchMessages({ limit: 10 });
    // Check for "-reset" command in chat history to potentially restart context
    const resetIndex = fetchedMessages.map(msg => msg.body).lastIndexOf("-reset");
    const messagesToProcess = resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
    for (const msg of messagesToProcess.reverse()) {
        try {
          // Validate if the message was written less than 24 (or maxHoursLimit) hours ago; if older, it's not considered
          const msgDate = new Date(msg.timestamp * 1000);
          if ((actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) > 24) break;

          // Check if the message includes media or if it is of another type
          const isImage = msg.type === MessageTypes.IMAGE || msg.type === MessageTypes.STICKER;
          const isAudio = msg.type === MessageTypes.VOICE || msg.type === MessageTypes.AUDIO;
          const isOther = !isImage && !isAudio && msg.type != 'chat';

          if (isImage || isAudio || isOther) return false;

          const role = !msg.fromMe ? "user" : "assistant"
          messageList.push({role: role, content: msg.body});
        } catch (e: any) {
          console.error(`Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`);
        }
      }

    if (messageList.length == 0) return;
    return await processAssistantResponse(message.from, messageList.reverse())
}



export const processChatCompletionMessage = async (message: Message) => {
    const chatData: Chat = await message.getChat();
    // If it's a "Broadcast" message, it's not processed
    if(chatData.id.user == 'status' || chatData.id._serialized == 'status@broadcast') return false;
    const actualDate = new Date();
    const messageList: ChatCompletionMessageParam[] = []
    const fetchedMessages = await chatData.fetchMessages({ limit: 10 });
    // Check for "-reset" command in chat history to potentially restart context
    const resetIndex = fetchedMessages.map(msg => msg.body).lastIndexOf("-reset");
    const messagesToProcess = resetIndex >= 0 ? fetchedMessages.slice(resetIndex + 1) : fetchedMessages;
    for (const msg of messagesToProcess.reverse()) {
        try {
          // Validate if the message was written less than 24 (or maxHoursLimit) hours ago; if older, it's not considered
          const msgDate = new Date(msg.timestamp * 1000);
          if ((actualDate.getTime() - msgDate.getTime()) / (1000 * 60 * 60) > 24) break;

          // Check if the message includes media or if it is of another type
          const isImage = msg.type === MessageTypes.IMAGE || msg.type === MessageTypes.STICKER;
          const isAudio = msg.type === MessageTypes.VOICE || msg.type === MessageTypes.AUDIO;
          const isOther = !isImage && !isAudio && msg.type != 'chat';

          if (isImage || isAudio || isOther) return false;

          const role = !msg.fromMe ? "user" : "assistant"
          messageList.push({role: role, content: msg.body, name: role});
        } catch (e: any) {
          console.error(`Error reading message - msg.type:${msg.type}; msg.body:${msg.body}. Error:${e.message}`);
        }
      }

    if (messageList.length == 0) return;
    return await processChatCompletionResponse(message.from, messageList.reverse())
}
