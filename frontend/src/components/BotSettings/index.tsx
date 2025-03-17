import { useEffect, useState } from 'react';
import { SettingsItem } from './SettingsItem';
import { AudioMode, BotMode } from '../../types';
import { CustomPrompt } from './CustomPrompt';

type Settings = {
  messageHistoryLimit: string;
  resetCommandEnabled: boolean;
  maxMessageAge: string;
  botMode: BotMode;
  respondAsVoice: boolean;
  botName: string;
  audioMode: AudioMode;
};

export const BotSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    const response = await fetch('/api/settings');
    if (response.ok) {
      const data = await response.json();
      setSettings(data.settings);
      setOriginalSettings(data.settings);
    }
  };

  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, []);

  if (!settings) return null;

  const hasChanged =
    JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setSettings((prev) => ({
      ...prev!,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (response.ok) {
      setOriginalSettings(settings);
    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Failed to save settings.');
    }
  };

  return (
    <div>
      <CustomPrompt />
      <h3>Bot Settings</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        <SettingsItem label="Bot Name:">
          <input
            type="text"
            name="botName"
            value={settings.botName}
            onChange={handleChange}
            style={{ width: '180px', marginLeft: '10px' }}
          />
        </SettingsItem>
        <SettingsItem label="Message History Limit:">
          <input
            type="number"
            name="messageHistoryLimit"
            value={settings.messageHistoryLimit}
            min="1"
            max="50"
            onChange={handleChange}
            style={{ width: '80px', marginLeft: '10px' }}
          />
        </SettingsItem>
        <SettingsItem label="Max Message Age (hours):">
          <input
            type="number"
            name="maxMessageAge"
            value={settings.maxMessageAge}
            min="1"
            max="72"
            onChange={handleChange}
            style={{ width: '80px', marginLeft: '10px' }}
          />
        </SettingsItem>
        <SettingsItem checkbox label={`Enable "-reset" command`}>
          <input
            type="checkbox"
            name="resetCommandEnabled"
            checked={settings.resetCommandEnabled}
            onChange={handleChange}
          />
        </SettingsItem>
        <SettingsItem checkbox label="Respond with voice messages">
          <input
            type="checkbox"
            name="respondAsVoice"
            checked={settings.respondAsVoice}
            onChange={handleChange}
          />
        </SettingsItem>
        <SettingsItem label="Chat API:">
          <select
            name="botMode"
            value={settings.botMode}
            onChange={handleChange}
            style={{ width: '180px' }}
          >
            <option value="OPENAI_CHAT">Chat Completions (OpenAI)</option>
            <option value="OPENAI_ASSISTANT">Assistant (OpenAI)</option>
            <option value="OPEN_WEBUI_CHAT">
              Chat Completions (Custom: Open WebUI)
            </option>
            <option value="DIFY_CHAT">Dify</option>
            <option value="GEMINI">Gemini</option>
          </select>
        </SettingsItem>
        <SettingsItem label="Audio API:">
          <select
            name="audioMode"
            value={settings.audioMode}
            onChange={handleChange}
            style={{ width: '180px' }}
          >
            <option value="ELEVEN_LABS">Eleven Labs API</option>
            <option value="OPENAI">OpenAI</option>
          </select>
        </SettingsItem>
        <button
          type="submit"
          disabled={!hasChanged}
          className={hasChanged ? 'button' : 'button-disabled'}
        >
          Save Settings
        </button>
      </form>
    </div>
  );
};
