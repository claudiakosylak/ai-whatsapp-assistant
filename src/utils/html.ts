import {
  getAudioResponseEnabled,
  getBotMode,
  getBotName,
  getCustomPrompt,
  getMaxMessageAge,
  getMessageHistoryLimit,
  isResetCommandEnabled,
} from './config';
import {
  chatHistory,
  getEnvContent,
  logs,
  whatsappConnected,
} from './controlPanel';

export const getHTML = () => `
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
                    <textarea name="config">${getEnvContent()}</textarea>
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
                                    <input type="checkbox" name="resetCommandEnabled" ${
                                      isResetCommandEnabled() ? 'checked' : ''
                                    }>
                                    Enable "-reset" command
                                </label>
                            </div>
                            <div>
                                <label>
                                    <input type="checkbox" name="respondAsVoice" ${
                                      getAudioResponseEnabled() ? 'checked' : ''
                                    }>
                                    Respond with voice messages
                                </label>
                            </div>
                            <div>
                                <label for="chatSelector">Choose a chat mode:</label>
                                <select id="chatSelector" name="botMode">
                                    <option value="OPENAI_ASSISTANT" ${
                                      getBotMode() === 'OPENAI_ASSISTANT' &&
                                      'selected'
                                    }>Assistant (OpenAI)</option>
                                    <option value="OPEN_WEBUI_CHAT" ${
                                      getBotMode() === 'OPEN_WEBBUI_CHAT' &&
                                      'selected'
                                    }>Chat Completions (Open WebUI Custom)</option>
                                    <option value="DIFY_CHAT" ${getBotMode() === 'DIFY_CHAT' ? 'selected' : ''}>Dify</option>
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
                    <strong>WhatsApp Status:</strong> <span style="color: ${
                      whatsappConnected ? '#2e7d32' : '#d32f2f'
                    }">${
  whatsappConnected ? 'Connected' : 'Disconnected'
}</span>
                </div>
            </div>
            <div class="panel">
                <div class="chat-container">
                    <h3>Test Chat</h3>
                    <div class="chat-messages" id="chatMessages">
                        ${chatHistory
                          .map(
                            (msg) =>
                              '<div class="message ' +
                              msg.role +
                              '">' +
                              '<strong>' +
                              msg.role +
                              ':</strong> ' +
                              msg.content +
                              '</div>',
                          )
                          .join('')}
                    </div>
                    <form class="chat-input" id="chatForm" style="display:flex;flex-direction:column;gap:10px;">
                        <div style="display:flex;">
                            <input type="text" id="messageInput" placeholder="Type your message..." required>
                            <button type="submit">Send Message</button>
                        </div>
                        ${
                          getBotMode() === 'OPEN_WEBBUI_CHAT'
                          ? '<input type="file" id="imageInput" accept="image/png, image/jpeg, image/jpg, image/gif, image/webp">'
                          : ''
                        }
                    </form>
                </div>
            </div>
        </div>
        <div class="panel">
            <h2>Logs</h2>
            <div class="logs">
                ${logs
                  .map((log) => `<div class="log-entry">${log}</div>`)
                  .join('')}
            </div>
        </div>
    </div>
    <script src="/scripts.js"></script>
</body>
</html>
`;
