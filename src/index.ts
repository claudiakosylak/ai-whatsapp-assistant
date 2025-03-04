import { Message, Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal"
import { processAssistantMessage, processChatCompletionMessage, MessageResponse } from "./whatsapp";
import { processDifyResponse } from "./dify";
import { startControlPanel, addLog, setWhatsAppConnected } from "./controlPanel";

import { getBotMode } from "./config";

export type OpenAIMessage = {
    role: "user" | "assistant" | "system",
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
    addLog('WhatsApp client is ready');
    setWhatsAppConnected(true);
  });

  client.on('disconnected', () => {
    addLog('WhatsApp client disconnected');
    setWhatsAppConnected(false);
  });

  client.on('message', async (message: Message) => {
    if (getBotMode() === "OPENAI_ASSISTANT") {
        addLog(`Processing assistant message from ${message.from}`);
        const response: MessageResponse | false = await processAssistantMessage(message)
        if (response) {
            client.sendMessage(response.from, response.messageString)
            addLog(`Sent assistant response to ${response.from}`);
        }
    } else if (getBotMode() === "DIFY") {
        addLog(`Processing Dify message from ${message.from}`);
        const response = await processDifyResponse(message.from, [{ role: 'user', content: message.body }]);
        client.sendMessage(response.from, response.messageString);
        addLog(`Sent Dify response to ${response.from}`);
    } else {
        addLog(`Processing chat completion message from ${message.from}`);
        const response: MessageResponse | false = await processChatCompletionMessage(message)
        if (response) {
            client.sendMessage(response.from, response.messageString)
            addLog(`Sent chat completion response to ${response.from}`);
        }
    }
  });

  try {
    startControlPanel();
    addLog('Starting WhatsApp client');
    // client.initialize();
  }catch (e: any){
    const errorMsg = `ERROR: ${e.message}`;
    console.error(errorMsg);
    addLog(errorMsg);
  }
