import { Message, Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal"
import { processAssistantMessage, processChatCompletionMessage } from "./whatsapp";
import { startControlPanel } from "./controlPanel";
import { enableAudioResponse, getBotMode } from "./config";
import { addLog, setWhatsAppConnected } from "./utils/controlPanel";

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
        const response = await processAssistantMessage(message)
        if (response) {
            client.sendMessage(response.from, response.messageContent)
            addLog(`Sent assistant response to ${response.from}`);
        }
    } else {
        addLog(`Processing chat completion message from ${message.from}`);
        const response = await processChatCompletionMessage(message)
        if (response) {
            client.sendMessage(response.from, response.messageContent, {sendAudioAsVoice: enableAudioResponse})
            addLog(`Sent chat completion response to ${response.from}`);
        }
    }
  });

  try {
    startControlPanel();
    addLog('Starting WhatsApp client');
    client.initialize();
  }catch (e: any){
    const errorMsg = `ERROR: ${e.message}`;
    console.error(errorMsg);
    addLog(errorMsg);
  }
