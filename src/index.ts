import { Message, Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { handleIncomingMessage } from './utils/whatsapp';
import { addLog, setWhatsAppConnected } from './utils/controlPanel';
import { isMessageReceivedAfterInit } from './utils/messages';
import { startControlPanel } from './server';

const initTime = new Date();

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  addLog('WhatsApp client is ready');
  setWhatsAppConnected(true);
  if (client.pupPage) {
    client.pupPage.on('pageerror', function (err) {
      console.log('Page error: ' + err.toString());
    });
    client.pupPage.on('error', function (err) {
      console.log('Page error: ' + err.toString());
    });
  }
});

client.on('disconnected', () => {
  addLog('WhatsApp client disconnected');
  setWhatsAppConnected(false);
});

client.on('message', async (message: Message) => {
  // check that the new message was received after bot initiated
  if (!isMessageReceivedAfterInit(initTime, message)) return;
  handleIncomingMessage(client, message);
});

try {
  startControlPanel();
  addLog('Starting WhatsApp client');
  client.initialize();
} catch (e: any) {
  const errorMsg = `ERROR: ${e.message}`;
  console.error(errorMsg);
  addLog(errorMsg);
}
