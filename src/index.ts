import { Message, Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode-terminal"
import { handleIncomingMessage } from "./utils/whatsapp";
import { startControlPanel } from "./controlPanel";
import { addLog, setWhatsAppConnected } from "./utils/controlPanel";
import { getIsAudio, isMessageReceivedAfterInit } from "./utils/messages";

const initTime = new Date()

const client = new Client({
    authStrategy: new LocalAuth()
  });

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
  });

  client.on('ready', () => {
    addLog('WhatsApp client is ready');
    setWhatsAppConnected(true);
  });

  client.on('disconnected', () => {
    addLog('WhatsApp client disconnected');
    setWhatsAppConnected(false);
  });

  client.on('message', async (message: Message) => {
    // check that the new message was received after bot initiated
    if (!isMessageReceivedAfterInit(initTime, message)) return
    handleIncomingMessage(client, message)
  });

  // used for testing so that you can message yourself on whatsapp with flag -test-bot
  client.on('message_create', async (message: Message) => {
    if (!isMessageReceivedAfterInit(initTime, message)) return
    if (!message.body || !message.body.includes("-test-bot")) return;
    // if (!getIsAudio(message)) return;
    if (!message.id.fromMe) return;
    handleIncomingMessage(client, message)
  })

  try {
    startControlPanel();
    addLog('Starting WhatsApp client');
    client.initialize();
  }catch (e: any){
    const errorMsg = `ERROR: ${e.message}`;
    console.error(errorMsg);
    addLog(errorMsg);
  }
