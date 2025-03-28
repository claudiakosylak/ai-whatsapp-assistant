import { useMemo, useEffect, useState } from 'react';
import { SettingsItem } from './SettingsItem';
import { AudioMode, BotMode, OpenAIVoice } from '../../types';
import { CustomPrompt } from './CustomPrompt';
import { Accordion } from 'radix-ui';
import './BotSettings.css';
import { AccordionItem } from './AccordionItem';

type Settings = {
  messageHistoryLimit: string;
  resetCommandEnabled: boolean;
  maxMessageAge: string;
  botMode: BotMode;
  respondAsVoice: boolean;
  botName: string;
  audioMode: AudioMode;
  openAiVoice: OpenAIVoice;
  elevenVoiceId: string;
};

const SaveButton = ({ hasChanged }: { hasChanged: boolean }) => {
  return (
    <button
      type="submit"
      disabled={!hasChanged}
      className={hasChanged ? 'button' : 'button-disabled'}
      style={{ margin: '10px 0' }}
    >
      Save
    </button>
  );
};

export const openAiVoices = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'onyx',
  'nova',
  'sage',
  'shimmer',
  'verse',
];

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

  const hasChanged = useMemo(() => {
    if (!originalSettings || !settings)
      return {
        context: false,
      };

    const status: Record<string, boolean> = {};

    const { botName, messageHistoryLimit, maxMessageAge, resetCommandEnabled } =
      settings;

    if (
      botName !== originalSettings.botName ||
      messageHistoryLimit !== originalSettings.messageHistoryLimit ||
      maxMessageAge !== originalSettings.maxMessageAge ||
      resetCommandEnabled !== originalSettings.resetCommandEnabled
    ) {
      status['context'] = true;
    } else {
      status['context'] = false;
    }

    if (settings.botMode !== originalSettings.botMode) {
      status['llm'] = true;
    } else {
      status['llm'] = false;
    }

    if (
      settings.respondAsVoice !== originalSettings.respondAsVoice ||
      settings.audioMode !== originalSettings.audioMode ||
      settings.openAiVoice !== originalSettings.openAiVoice ||
      settings.elevenVoiceId !== originalSettings.elevenVoiceId
    ) {
      status['audio'] = true;
    } else {
      status['audio'] = false;
    }
    return status;
  }, [originalSettings, settings]);

  if (!settings) return null;

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
    <>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <Accordion.Root
        type="multiple"
        className="AccordionRoot"
        defaultValue={['prompt']}
      >
        <AccordionItem title="Custom Prompt" value="prompt">
          <CustomPrompt />
        </AccordionItem>
        <AccordionItem title="Context Settings" value="context">
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
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
            <SaveButton hasChanged={hasChanged['context']} />
          </form>
        </AccordionItem>
        <AccordionItem title="LLM Settings" value="llm">
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
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
            <SaveButton hasChanged={hasChanged['llm']} />
          </form>
        </AccordionItem>
        <AccordionItem title="Audio Settings" value="audio">
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <SettingsItem checkbox label="Enable voice response">
              <input
                type="checkbox"
                name="respondAsVoice"
                checked={settings.respondAsVoice}
                onChange={handleChange}
              />
            </SettingsItem>
            <SettingsItem label="Audio API:">
              <select
                name="audioMode"
                value={settings.audioMode}
                onChange={(e) => {
                  handleChange(e);
                  if (originalSettings) {
                    settings.elevenVoiceId = originalSettings.elevenVoiceId;
                    settings.openAiVoice = originalSettings.openAiVoice;
                  }
                }}
                style={{ width: '180px' }}
              >
                <option value="ELEVEN_LABS">Eleven Labs API</option>
                <option value="OPENAI">OpenAI</option>
              </select>
            </SettingsItem>
            {settings.audioMode === 'OPENAI' ? (
              <SettingsItem label="Voice:">
                <select
                  name="openAiVoice"
                  value={settings.openAiVoice}
                  onChange={handleChange}
                  style={{ width: '180px' }}
                >
                  {openAiVoices.map((voice) => (
                    <option key={voice} value={voice}>
                      {voice}
                    </option>
                  ))}
                </select>
              </SettingsItem>
            ) : (
              <SettingsItem label="Voice ID:">
                <input
                  type="text"
                  name="elevenVoiceId"
                  value={settings.elevenVoiceId}
                  onChange={handleChange}
                  style={{ width: '180px', marginLeft: '10px' }}
                />
              </SettingsItem>
            )}
            <SaveButton hasChanged={hasChanged['audio']} />
          </form>
        </AccordionItem>
      </Accordion.Root>
    </>
  );
};
