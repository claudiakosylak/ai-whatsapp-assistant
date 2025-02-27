import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { OpenAIMessage } from '.';
import { processAssistantResponse } from './assistant';
import { processChatCompletionResponse } from './chatCompletion';
import { ChatCompletionMessageParam } from 'openai/resources';
import { config } from 'dotenv';
import { setBotName, getBotName, getMessageHistoryLimit, setMessageHistoryLimit, isResetCommandEnabled, setResetCommandEnabled, getMaxMessageAge, setMaxMessageAge, getBotMode, setBotMode, getAudioResponseEnabled, setAudioResponseEnabled } from './config';
import { AUDIO_DIR } from './constants';
import { deleteAudioFiles } from './utils/audio';
import { addLog, addMessageContentString, chatHistory, logs, setChatHistory, whatsappConnected } from './utils/controlPanel';

const app = express();
config()
const PORT = process.env.FRONTEND_PORT;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Serve the `public/audio` directory as a static folder
app.use('/audio', express.static(AUDIO_DIR, {
    setHeaders: (res, path) => {
        res.setHeader('Accept-Ranges', 'bytes');
    }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    deleteAudioFiles()
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
        envContent = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf8');
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>WhatsApp Bot Control Panel</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .panel {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .top-panels {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                textarea {
                    width: 100%;
                    height: 200px;
                    margin: 10px 0;
                    font-family: monospace;
                }
                .logs {
                    height: 400px;
                    overflow-y: auto;
                    background: #1e1e1e;
                    color: #fff;
                    padding: 10px;
                    font-family: monospace;
                    font-size: 12px;
                }
                .log-entry {
                    margin: 5px 0;
                    border-bottom: 1px solid #333;
                    padding-bottom: 5px;
                }
                button {
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover {
                    background: #45a049;
                }
                .status {
                    margin-top: 10px;
                    padding: 10px;
                    border-radius: 4px;
                }
                .status.active {
                    background: #e8f5e9;
                    color: #2e7d32;
                }
                .chat-container {
                    margin-top: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .chat-messages {
                    height: 300px;
                    overflow-y: auto;
                    padding: 15px;
                    background: #f8f9fa;
                }
                .message {
                    margin: 10px 0;
                    padding: 10px;
                    border-radius: 8px;
                    max-width: 80%;
                }
                .message.user {
                    background: #e3f2fd;
                    margin-left: auto;
                }
                .message.assistant {
                    background: #f5f5f5;
                    margin-right: auto;
                }
                .chat-input {
                    display: flex;
                    padding: 10px;
                    background: white;
                    border-top: 1px solid #ddd;
                }
                .chat-input input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-right: 10px;
                }
                .chat-input button {
                    white-space: nowrap;
                }
            </style>
        </head>
        <body>
            <h1>WhatsApp Bot Control Panel</h1>
            <div class="container">
                <div class="top-panels">
                    <div class="panel">
                        <h2>Configuration</h2>
                        <form action="/save-config" method="POST">
                            <textarea name="config">${envContent}</textarea>
                            <button type="submit">Save Configuration</button>
                            <div style="margin-top: 20px;">
                                <h3>Bot Name</h3>
                                <form action="/save-bot-name" method="POST" style="display: flex; gap: 10px;">
                                    <input type="text" name="botName" value="${getBotName()}" placeholder="Enter bot name" style="flex: 1; padding: 8px;">
                                    <button type="submit">Update Name</button>
                                </form>
                            </div>
                            <div style="margin-top: 20px;">
                                <h3>Bot Settings</h3>
                                <form action="/save-bot-settings" method="POST" style="display: grid; gap: 10px;">
                                    <div>
                                        <label>Message History Limit:</label>
                                        <input type="number" name="messageHistoryLimit" value="${getMessageHistoryLimit()}" min="1" max="50" style="width: 80px; margin-left: 10px;">
                                    </div>
                                    <div>
                                        <label>Max Message Age (hours):</label>
                                        <input type="number" name="maxMessageAge" value="${getMaxMessageAge()}" min="1" max="72" style="width: 80px; margin-left: 10px;">
                                    </div>
                                    <div>
                                        <label>
                                            <input type="checkbox" name="resetCommandEnabled" ${isResetCommandEnabled() ? 'checked' : ''}>
                                            Enable "-reset" command
                                        </label>
                                    </div>
                                    <div>
                                        <label>
                                            <input type="checkbox" name="respondAsVoice" ${getAudioResponseEnabled() ? 'checked' : ''}>
                                            Respond with voice messages
                                        </label>
                                    </div>
                                    <div>
                                        <label for="chatSelector">Choose a chat mode:</label>
                                        <select id="chatSelector" name="botMode">
                                            <option value="OPENAI_ASSISTANT" ${getBotMode() === "OPENAI_ASSISTANT" && "selected"}>Assistant (OpenAI)</option>
                                            <option value="OPEN_WEBUI_CHAT" ${getBotMode() === "OPEN_WEBBUI_CHAT" && "selected"}>Chat Completions (Open WebUI Custom)</option>
                                        </select>
                                    </div>
                                    <button type="submit">Save Settings</button>
                                </form>
                            </div>
                        </form>
                        <div class="status active">
                            <strong>WhatsApp Status:</strong> <span style="color: ${whatsappConnected ? '#2e7d32' : '#d32f2f'}">${whatsappConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                    </div>
                    <div class="panel">
                        <div class="chat-container">
                            <h3>Test Chat</h3>
                            <div class="chat-messages" id="chatMessages">
                                ${chatHistory.map(msg => '<div class="message ' + msg.role + '">' +
                                        '<strong>' + msg.role + ':</strong> ' + msg.content +
                                    '</div>' ).join('')}
                            </div>
                            <form class="chat-input" id="chatForm">
                                <input type="text" id="messageInput" placeholder="Type your message..." required>
                                <button type="submit">Send Message</button>
                            </form>
                        </div>
                    </div>
                </div>
                <div class="panel">
                    <h2>Logs</h2>
                    <div class="logs">
                        ${logs.map(log => `<div class="log-entry">${log}</div>`).join('')}
                    </div>
                </div>
            </div>
            <script src="/scripts.js"></script>
        </body>
        </html>
    `;
    res.send(html);
});

app.post('/save-config', (req, res) => {
    const config = req.body.config;
    const envPath = path.join(process.cwd(), '.env');

    try {
        fs.writeFileSync(envPath, config);
        // Parse and reload the environment variables after writing the file
        const parsed = require('dotenv').config({ path: envPath }).parsed;
        if (parsed) {
            process.env = {
                ...process.env,
                ...parsed
            };
        }
        addLog('Configuration updated successfully');
        res.redirect('/');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        addLog(`Error saving configuration: ${errorMessage}`);
        res.status(500).send('Error saving configuration');
    }
});

app.get('/logs', (req, res) => {
    res.json(logs);
});

app.get('/chat-history', (req, res) => {
    res.json(chatHistory);
});

app.post('/send-message', async (req, res) => {
    const { message } = req.body;

    // Add user message to history
    chatHistory.push({ role: 'user', content: message });

    try {
        let response;
        if (getBotMode() === 'OPENAI_ASSISTANT') {
            const messages = chatHistory.map(msg => ({
                role: msg.role as "user" | "assistant",
                content: msg.content
            }));
            response = await processAssistantResponse('test', messages as OpenAIMessage[]);
        } else {
            const messages = chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                name: msg.role
            }));
            addLog("Sending message to chat completion")
            response = await processChatCompletionResponse('test', messages as ChatCompletionMessageParam[]);
        }

        // Add assistant response to history
        chatHistory.push({ role: 'assistant', content: addMessageContentString(response.messageContent) });

        // Keep only last 50 messages
        if (chatHistory.length > 50) {
            setChatHistory(chatHistory.slice(-50))
        }

        res.json({ success: true });
    } catch (error) {
        addLog(`Error in test chat: ${error}`);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

app.post('/save-bot-name', (req, res) => {
    const { botName } = req.body;
    if (botName && botName.trim()) {
        setBotName(botName.trim());
        addLog(`Bot name updated to: ${botName}`);
    }
    res.redirect('/');
});

app.post('/save-bot-settings', (req, res) => {
    const { messageHistoryLimit, resetCommandEnabled, maxMessageAge, botMode, respondAsVoice } = req.body;

    if (messageHistoryLimit) {
        const limit = parseInt(messageHistoryLimit);
        if (limit >= 1 && limit <= 50) {
            setMessageHistoryLimit(limit);
            addLog(`Message history limit updated to: ${limit}`);
        }
    }

    if (maxMessageAge) {
        const hours = parseInt(maxMessageAge);
        if (hours >= 1 && hours <= 72) {
            setMaxMessageAge(hours);
            addLog(`Max message age updated to: ${hours} hours`);
        }
    }

    setResetCommandEnabled(!!resetCommandEnabled);
    addLog(`Reset command ${resetCommandEnabled ? 'enabled' : 'disabled'}`);

    setAudioResponseEnabled(!!respondAsVoice)
    addLog(`Respond in voice messages ${respondAsVoice ? 'enabled' : 'disabled'}`)

    setBotMode(botMode)
    addLog(`Bot mode changed to ${botMode}`)

    res.redirect('/');
});
export const startControlPanel = () => {
    app.listen(PORT, () => {
        console.log(`Control panel is running at http://localhost:${PORT}`);
    });
};
