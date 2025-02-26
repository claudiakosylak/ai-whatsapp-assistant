import { Message, Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal"
import { processAssistantMessage, processChatCompletionMessage } from "./whatsapp";

export type BotMode = "OPENAI_ASSISTANT" | "OPEN_WEBBUI_CHAT"

export const mode = "OPENAI_ASSISTANT" as BotMode;

export type OpenAIMessage = {
    role: "user" | "assistant",
    content: string;
}

const client = new Client({
    authStrategy: new LocalAuth()
  });

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
  });

  client.on('ready', () => {
    console.log('Client is ready!');
  });

  client.on('message', async (message: Message) => {
    if (mode === "OPENAI_ASSISTANT") {
        const response = await processAssistantMessage(message)
        if (response) {
            client.sendMessage(response.from, response.messageString)
        }
    } else {
        const response = await processChatCompletionMessage(message)
        if (response) {
            client.sendMessage(response.from, response.messageString)
        }
    }
  });

  try {
    // if (mode === "OPENAI_ASSISTANT") {
    //     client.initialize();
    // } else {
    //     processChatCompletionResponse("Claudia", [testMessage])
    // }
    client.initialize();
  }catch (e: any){
    console.error(`ERROR: ${e.message}`);
  }
