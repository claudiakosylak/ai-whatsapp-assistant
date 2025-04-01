import { useMemo, useEffect, useState } from 'react';
import { SettingsItem } from './SettingsItem';
import { AudioMode, BotMode, OpenAIVoice } from '../../types';
import { CustomPrompt } from './CustomPrompt';
import { Accordion } from 'radix-ui';
import './BotSettings.css';
import { AccordionItem } from './AccordionItem';
import { Dropdown } from '../Dropdown';
import e from 'express';

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
  models: Record<BotMode, string | undefined>;
};

const botModeOptions: { id: BotMode; value: BotMode; label: string }[] = [
  {
    id: 'OPENAI_CHAT',
    value: 'OPENAI_CHAT',
    label: 'Chat Completions (OpenAI)',
  },
  {
    id: 'OPENAI_ASSISTANT',
    value: 'OPENAI_ASSISTANT',
    label: 'Assistant (OpenAI)',
  },
  {
    id: 'OPEN_WEBUI_CHAT',
    value: 'OPEN_WEBUI_CHAT',
    label: 'Chat Completions (Custom: Open WebUI)',
  },
  {
    id: 'DIFY_CHAT',
    value: 'DIFY_CHAT',
    label: 'Dify',
  },
  {
    id: 'GEMINI',
    value: 'GEMINI',
    label: 'Gemini',
  },
];

const audioModeOptions: { id: AudioMode; value: AudioMode; label: string }[] = [
  {
    id: 'ELEVEN_LABS',
    value: 'ELEVEN_LABS',
    label: 'Eleven Labs',
  },
  {
    id: 'OPENAI',
    value: 'OPENAI',
    label: 'OpenAI',
  },
];

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

const openAiVoices = [
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

    if (
      settings.botMode !== originalSettings.botMode ||
      settings.models[settings.botMode] !==
        originalSettings.models[settings.botMode]
    ) {
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

  const saveContextSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const newSettings = {
      botName: settings.botName,
      messageHistoryLimit: settings.messageHistoryLimit,
      maxMessageAge: settings.maxMessageAge,
      resetCommandEnabled: settings.resetCommandEnabled,
    };
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (response.ok) {
      const data = await response.json();
      setOriginalSettings(data.settings);
    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Failed to save settings.');
    }
  };

  const saveLlmSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const newSettings = {
      botMode: settings.botMode,
      model: settings.models[settings.botMode as BotMode],
    };
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (response.ok) {
      const data = await response.json();
      setOriginalSettings(data.settings);
    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Failed to save settings.');
    }
  };

  const saveAudioSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const newSettings = {
      audioMode: settings.audioMode,
      openAiVoice: settings.openAiVoice,
      elevenVoiceId: settings.elevenVoiceId,
    };
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (response.ok) {
      const data = await response.json();
      setOriginalSettings(data.settings);
    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Failed to save settings.');
    }
  };

  if (!settings || !originalSettings) return null;

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
            onSubmit={saveContextSettings}
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
            onSubmit={saveLlmSettings}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <SettingsItem label="Chat API:">
              <Dropdown
                options={botModeOptions}
                selected={
                  botModeOptions.find(
                    (option) => option.value === settings.botMode,
                  )?.label || settings.botMode
                }
                onChange={(val: string) => {
                  setSettings((prev) => ({
                    ...prev!,
                    ['botMode']: val as BotMode,
                    models: { ...originalSettings.models },
                  }));
                }}
              />
            </SettingsItem>
            {['OPEN_WEBUI_CHAT', 'OPENAI_CHAT', 'GEMINI'].includes(
              settings.botMode,
            ) && (
              <SettingsItem label="Model:">
                <input
                  type="text"
                  name="model"
                  value={settings.models[settings.botMode]}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev!,
                      models: {
                        ...prev!.models,
                        [settings.botMode]: e.target.value,
                      },
                    }));
                  }}
                  style={{ width: '180px', marginLeft: '10px' }}
                />
              </SettingsItem>
            )}
            <SaveButton hasChanged={hasChanged['llm']} />
          </form>
        </AccordionItem>
        <AccordionItem title="Audio Settings" value="audio">
          <form
            onSubmit={saveAudioSettings}
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
              <Dropdown
                options={audioModeOptions}
                selected={
                  audioModeOptions.find(
                    (option) => option.value === settings.audioMode,
                  )?.label || settings.audioMode
                }
                onChange={(val: string) => {
                  setSettings((prev) => ({
                    ...prev!,
                    ['audioMode']: val as AudioMode,
                    ['elevenVoiceId']: originalSettings.elevenVoiceId,
                    ['openAiVoice']: originalSettings.openAiVoice,
                  }));
                }}
              />
            </SettingsItem>
            {settings.audioMode === 'OPENAI' ? (
              <SettingsItem label="Voice:">
              <Dropdown options={openAiVoices.map((voice) => ({id: voice, value: voice, label: voice}))} selected={settings.openAiVoice}
              onChange={(val: string) => {
                setSettings((prev) => ({
                  ...prev!,
                  ['openAiVoice']: val as OpenAIVoice,
                }))
              }} />
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
