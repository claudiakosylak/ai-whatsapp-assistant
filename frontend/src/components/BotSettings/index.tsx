import { useState } from "react"
import { SettingsItem } from "./SettingsItem"

type Settings = {
    messageHistoryLimit: string;
    resetCommandEnabled: boolean;
    maxMessageAge: string;
    botMode: getBotMode(),
    respondAsVoice: getAudioResponseEnabled(),
    botName: getBotName(),
    audioMode: getAudioMode(),
  };

export const BotSettings = () => {
    const [settings, setSettings] = useState(null)

    const fetchSettings = async () => {
        const response = await fetch('/api/settings')
        if (response.ok) {
            const data = await response.json()
            setSettings(data.settings)
        }
    }

    if (!settings) return null;

    return (
        <div>
        <h3>Bot Settings</h3>
        <form action="/save-bot-settings" method="POST" style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <SettingsItem>
            <label>Bot Name:</label>
                <input type="text" name="botName" value="${getBotName()}" placeholder="Enter bot name" style={{width: '180px', marginLeft: '10px'}}/>
        </SettingsItem>
        <SettingsItem>
                <label>Message History Limit:</label>
                <input type="number" name="messageHistoryLimit" value="${getMessageHistoryLimit()}" min="1" max="50" style={{width: '180px', marginLeft: '10px'}}/>
        </SettingsItem>
        <SettingsItem>
                <label>Max Message Age (hours):</label>
                <input type="number" name="maxMessageAge" value="${getMaxMessageAge()}" min="1" max="72" style={{width: '180px', marginLeft: '10px'}}/>
        </SettingsItem>
        <SettingsItem checkbox>
                    <input type="checkbox" name="resetCommandEnabled" checked={settings.isResetCommandEnabled ? true : false}
                    }/>
                    Enable "-reset" command
        </SettingsItem>
            <div>
                <label style="display: flex; align-items: center; gap: 20px;">
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
    )
}
