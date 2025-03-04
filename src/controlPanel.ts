import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { OpenAIMessage } from '.';
import { processAssistantResponse } from './assistant';
import { processChatCompletionResponse } from './chatCompletion';
import { processDifyResponse } from './dify';
import { ChatCompletionMessageParam } from 'openai/resources';
import { config } from 'dotenv';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Store logs in memory
let logs: string[] = [];
let chatHistory: { role: string; content: string; }[] = [];
let testConversationId = randomUUID();
let whatsappConnected = false;

export const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.unshift(logEntry); // Add to beginning of array
    if (logs.length > 100) logs.pop(); // Keep only last 100 logs
};

export const setWhatsAppConnected = (connected: boolean) => {
    whatsappConnected = connected;
};

app.get('/', (req, res) => {
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
                                            <option value="OPEN_WEBUI_CHAT">OPEN_WEBUI_CHAT</option>
                                            <option value="OPEN_WEBBUI_CHAT" ${getBotMode() === 'OPEN_WEBBUI_CHAT' ? 'selected' : ''}>Open WebUI Chat</option>
                                            <option value="DIFY" ${getBotMode() === 'DIFY' ? 'selected' : ''}>Dify</option>
                                        </select>
                                    </div>
                                    <button type="submit">Save Settings</button>
                                </form>
                                <div style="margin-top: 20px;">
                                    <h3>Custom Prompt</h3>
                                    <form action="/save-custom-prompt" method="POST">
                                        <textarea name="customPrompt" style="width: 100%; height: 100px;">${getCustomPrompt()}</textarea>
                                        <button type="submit">Update Prompt</button>
                                    </form>
                                </div>
                            </div>
                        </form>
                        <div class="status active">
                            <strong>Current Mode:</strong> ${getBotMode()}<br>
                            <strong>WhatsApp Status:</strong> <span style="color: ${whatsappConnected ? '#2e7d32' : '#d32f2f'}">${whatsappConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                    </div>
                    <div class="panel">
                        <div class="chat-container">
                            <h3>Test Chat</h3>
                            <div class="chat-messages" id="chatMessages">
                                ${chatHistory.map(msg => 
                                    '<div class="message ' + msg.role + '">' +
                                        '<strong>' + msg.role + ':</strong> ' + msg.content +
                                    '</div>'
                                ).join('')}
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
            <script>
                // Auto-refresh logs every 5 seconds
                setInterval(() => {
                    fetch('/logs')
                        .then(response => response.json())
                        .then(data => {
                            document.querySelector('.logs').innerHTML = 
                                data.map(log => '<div class="log-entry">' + log + '</div>').join('');
                        });
                    
                    fetch('/chat-history')
                        .then(response => response.json())
                        .then(data => {
                            document.querySelector('#chatMessages').innerHTML = 
                                data.map(msg => 
                                    '<div class="message ' + msg.role + '">' +
                                        '<strong>' + msg.role + ':</strong> ' + msg.content +
                                    '</div>'
                                ).join('');
                            const chatMessages = document.querySelector('#chatMessages');
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        });
                }, 5000);

                document.getElementById('chatForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const input = document.getElementById('messageInput');
                    const message = input.value;
                    input.value = '';

                    await fetch('/send-message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message })
                    });
                });
            </script>
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
        } else if (getBotMode() === 'DIFY') {
            const messages = chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            response = await processDifyResponse(testConversationId, messages);
        } else {
            const messages = chatHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                name: msg.role
            }));
            response = await processChatCompletionResponse('test', messages as ChatCompletionMessageParam[]);
        }
        
        // Add assistant response to history
        chatHistory.push({ role: 'assistant', content: response.messageString });
        
        // Keep only last 50 messages
        if (chatHistory.length > 50) {
            chatHistory = chatHistory.slice(-50);
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

app.post('/save-custom-prompt', (req, res) => {
    const { customPrompt } = req.body;
    if (customPrompt !== undefined) {
        setCustomPrompt(customPrompt);
        addLog(`Custom prompt updated from control panel`);
    }
    res.redirect('/');
});
app.post('/save-bot-settings', (req, res) => {
    const { messageHistoryLimit, resetCommandEnabled, maxMessageAge, botMode } = req.body;
    
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
    
    if (botMode && (botMode === 'OPENAI_ASSISTANT' || botMode === 'OPEN_WEBBUI_CHAT' || botMode === 'DIFY')) {
        setBotMode(botMode);
        addLog(`Bot mode updated to: ${botMode}`);
    }
    
    res.redirect('/');
});
export const startControlPanel = () => {
    app.listen(PORT, () => {
        console.log(`Control panel is running at http://localhost:${PORT}`);
    });
};