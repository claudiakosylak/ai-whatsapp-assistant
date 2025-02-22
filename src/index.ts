import { Message, Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal"
import { processMessage } from "./whatsapp";

export type OpenAIMessage = {
    role: "user" | "assistant",
    content: string;
}

const testMessages: OpenAIMessage[] = [
    {
        role: "user",
        content: "What's the biggest star in our solar system?"
    }
]

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
    const response = await processMessage(message)
    if (response) {
        client.sendMessage(response.from, response.messageString)
    }
  });

  try {
    client.initialize();
  }catch (e: any){
    console.error(`ERROR: ${e.message}`);
  }
