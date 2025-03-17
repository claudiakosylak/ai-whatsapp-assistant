import { imageProcessingModes } from '../constants';
import {
  getAudioMode,
  getAudioResponseEnabled,
  getBotMode,
  getBotName,
  getCustomPrompt,
  getMaxMessageAge,
  getMessageHistoryLimit,
  isResetCommandEnabled,
} from './botSettings';
import {
  chatHistory,
  getEnvContent,
  getTestChatData,
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
        .delete-button {
            background-color: red;
        }
        .delete-button:hover {
            background-color:rgb(160, 69, 69);
        }
        .error-text {
            color: red;
        }
        .header {
            display: flex;
            justify-content: space-between;
        }
        .fa-reply {
            align-self: flex-end;
        }
        .fa-reply:hover, .fa-x:hover {
            cursor: pointer;
        }
        .panel {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .reply-box {
            position: absolute;
            height: 50px;
            width: 90%;
            max-width: 90%;
            background-color: gray;
            bottom: 0;
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
        }
        .reply-box-top {
            display: flex;
            justify-content: space-between;
        }
        .top-panels {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        @media (max-width: 768px) {
            .top-panels {
                grid-template-columns: 1fr;
            }
            .header {
                flex-direction: column;
            }
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
        .button-disabled {
            background: gray;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
        }
        button:hover {
            background: #45a049;
        }
        input, select {
            height: 35px;
            padding: 0 10px;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-radius: 2px;
        }
        .chat-container {
            border: 1px solid #ddd;
            border-radius: 8px;
            overflow: hidden;
        }
        .chat-messages {
            max-height: 300px;
            overflow-y: auto;
            padding: 15px;
            background: #f8f9fa;
            position: relative;
        }
        #chatMessagesInner {
            min-height: 300px;
        }
        .message {
            margin: 10px 0;
            padding: 10px;
            border-radius: 8px;
            max-width: 80%;
            display: flex;
            justify-content: space-between;
            position: relative;
        }
        .message.user {
            background: #e3f2fd;
            margin-left: auto;
        }
        .message.assistant {
            background: #f5f5f5;
            margin-right: auto;
        }
        .message.user2 {
            background:rgb(239, 227, 253);
            margin-right: auto;
        }
        .reaction {
            position: absolute;
            left: -10px;
            top: -10px;
        }
        .chat-input {
            display: flex;
            flex-direction: column;
            padding: 10px;
            background: white;
            border-top: 1px solid #ddd;
            margin-bottom: 10px;
        }
        .chat-input input {
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .chat-input button {
            align-self: center;
        }
        .typing-indicator {
            display: none;
            align-items: center;
            gap: 4px;
            padding: 10px;
            background: #e3f2fd;
            border-radius: 20px;
            width: 50px;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        }

        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: #3498db;
            border-radius: 50%;
            animation: blink 1.5s infinite;
        }

        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes blink {
            0% { opacity: 0.3; }
            50% { opacity: 1; }
            100% { opacity: 0.3; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>WhatsApp Bot Control Panel</h1>
        <div class="status active" id="whatsapp-status" style="display: flex; padding: 10px; align-items: flex-end; gap: 20px;">
            <strong>WhatsApp Status:</strong> <span style="color: ${
              whatsappConnected ? '#2e7d32' : '#d32f2f'
            }">${whatsappConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
    </div>
    <div class="container">
        <div class="top-panels">
            <div class="panel">
                    <div>
                        <h3>Bot Settings</h3>
                        <form action="/save-bot-settings" method="POST" style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label>Bot Name:</label>
                                <input type="text" name="botName" value="${getBotName()}" placeholder="Enter bot name" style="width: 180px; margin-left: 10px;">
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label>Message History Limit:</label>
                                <input type="number" name="messageHistoryLimit" value="${getMessageHistoryLimit()}" min="1" max="50" style="width: 80px; margin-left: 10px;">
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label>Max Message Age (hours):</label>
                                <input type="number" name="maxMessageAge" value="${getMaxMessageAge()}" min="1" max="72" style="width: 80px; margin-left: 10px;">
                            </div>
                            <div>
                                <label style="display: flex; align-items: center; gap: 20px;">
                                    <input type="checkbox" name="resetCommandEnabled" ${
                                      isResetCommandEnabled() ? 'checked' : ''
                                    }>
                                    Enable "-reset" command
                                </label>
                            </div>
                            <div>
                                <label style="display: flex; align-items: center; gap: 20px;">
                                    <input type="checkbox" name="respondAsVoice" ${
                                      getAudioResponseEnabled() ? 'checked' : ''
                                    }>
                                    Respond with voice messages
                                </label>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label for="chatSelector">Choose a chat API:</label>
                                <select id="chatSelector" name="botMode">
                                    <option value="OPENAI_CHAT" ${
                                      getBotMode() === 'OPENAI_CHAT'
                                        ? 'selected'
                                        : ''
                                    }>Chat Completions (OpenAI)</option>
                                    <option value="OPENAI_ASSISTANT" ${
                                      getBotMode() === 'OPENAI_ASSISTANT'
                                        ? 'selected'
                                        : ''
                                    }>Assistant (OpenAI)</option>
                                    <option value="OPEN_WEBUI_CHAT" ${
                                      getBotMode() === 'OPEN_WEBUI_CHAT'
                                        ? 'selected'
                                        : ''
                                    }>Chat Completions (Custom: Open WebUI)</option>
                                    <option value="DIFY_CHAT" ${
                                      getBotMode() === 'DIFY_CHAT'
                                        ? 'selected'
                                        : ''
                                    }>Dify</option>
                                    <option value="GEMINI" ${
                                      getBotMode() === 'GEMINI'
                                        ? 'selected'
                                        : ''
                                    }>Gemini</option>
                                </select>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label for="audioMode">Choose an audio handling API:</label>
                                <select id="audioMode" name="audioMode">
                                    <option value="ELEVEN_LABS" ${
                                      getAudioMode() === 'ELEVEN_LABS'
                                        ? 'selected'
                                        : ''
                                    }>Eleven Labs API</option>
                                    <option value="OPENAI" ${
                                      getAudioMode() === 'OPENAI'
                                        ? 'selected'
                                        : ''
                                    }>OpenAI</option>
                                </select>
                            </div>
                            <p id="audioModeError" class="error-text" style="display:none;"></p>
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
                     <div style="margin-top: 20px;">
                     <h3>Configuration</h3>
                <form action="/save-config" method="POST">
                    <textarea name="config">${getEnvContent()}</textarea>
                    <button type="submit">Save Configuration</button>
                </form>
                </div>
            </div>
            <div class="panel">
                <div class="chat-container">
                    <div style="display:flex;justify-content:space-between;padding:10px;align-items:center;">
                        <h3 id="chat-name">${
                          getTestChatData().isGroup
                            ? 'Test Group Chat'
                            : 'Test Chat'
                        }</h3>
                        <button type="button" id="switchGroupButton">${
                          getTestChatData().isGroup
                            ? 'Test Individual Chat'
                            : 'Test Group Chat'
                        }</button>
                        <button type="button" id="clearChatButton">Clear</button>
                    </div>
                    <div class="chat-messages" id="chatMessages">
                        <div id="chatMessagesInner">
                        ${chatHistory
                          .map(
                            (msg) =>
                              '<div class="message ' +
                              msg.name +
                              '">' +
                              '<div>' +
                              '<strong>' +
                              msg.name +
                              ':</strong> ' +
                              msg.content +
                              '</div>' +
                              `<i class="fa-solid fa-reply" id='reply-${msg.id}'></i>` +
                              '</div>',
                          )
                          .join('')}
                        </div>
                    </div>
                    <form class="chat-input" id="chatForm" style="display:flex;flex-direction:column;gap:10px;">
                        <div style="display:flex;align-items: center;gap: 5px; position:relative;" id="chatInputTop">
                            <select id="userName" name="userName" style="display:${
                              getTestChatData().isGroup ? 'block' : 'none'
                            }">
                                <option value="user">User1</option>
                                <option value="user2">User2</option>
                            </select>
                            <input type="text" id="messageInput" placeholder="Type your message...">
                            <audio id="inputAudio" controls style="display:none;flex:1;"></audio>
                            <p id="recordingStatus" style="display:none;flex:1;text-align:center;">Recording...</p>
                            <button type="button" id="addMediaButton"><i class="fa-solid fa-plus"></i></button>
                            <div id="addMediaModal" style="display:none; gap: 10px; position: absolute; top: -60px; right: 0px; background-color:#fff; padding: 10px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.2);">
                                <button type="button" id="imageInputButton"><i class="fa-solid fa-image"></i></button>
                                <button type="button" id="videoInputButton"><i class="fa-solid fa-video"></i></button>
                                <button type="button" id="recordAudio"><i class="fa-solid fa-microphone"></i></button>
                            </div>
                            <button type="button" id="stopRecordAudio" style="display:none;"><i class="fa-solid fa-stop"></i></button>
                            <button type="button" id="deleteRecordedAudio" style="display:none;" class="delete-button"><i class="fa-solid fa-trash"></i></button>
                            <button type="submit">Send</button>
                        </div>
                        ${
                          imageProcessingModes.includes(getBotMode())
                            ? '<div style="display:flex;flex-direction:column;" id="imageInputContainer">' +
                            '<div style="display:flex;gap:20px;">' +
                            '<input type="file" id="imageInput" accept="image/png, image/jpeg, image/jpg, image/gif, image/webp" style="outline:none;border:none;display:none;">' +
                            '<input type="file" id="videoInput" accept="video/mp4, video/mpeg, video/mov, video/avi, video/x-flv, video/mpg, video/webm, video/wmv, video/3gpp, .mov, .MOV" style="outline:none;border:none;display:none;">' +
                            '<img src="" style="display:none;width:100px;height:100px;object-fit:cover;border-radius:10px;" id="imagePreview" />' +
                            '<video controls style="display:none;width: 200px;" id="videoPreview">' +
                            '</video>' +
                            '<button type="button" id="deleteSelectedImage" style="display:none;" class="delete-button">' +
                            '<i class="fa-solid fa-trash"></i></button></div></div>'
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
    <script src="https://kit.fontawesome.com/dc56450845.js" crossorigin="anonymous"></script>
</body>
</html>
`;
