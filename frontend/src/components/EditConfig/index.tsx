import { useEffect, useState } from 'react';

export const EditConfig = () => {
  const [config, setConfig] = useState('');
  const [originalConfig, setOriginalConfig] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const data = await response.json();
      setConfig(data.config);
      setOriginalConfig(data.config);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  console.log({config})

  const hasChanged = JSON.stringify(config) !== JSON.stringify(originalConfig);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const response = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    if (response.ok) {
      setOriginalConfig(config);
    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Failed to save config.');
    }
  };

  return (
    <div className="panel">
      <h3>Configuration</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column'}}>
        <textarea
          name="config"
          value={config}
          onChange={(e) => setConfig(e.target.value)}
        />
        <button
          type="submit"
          disabled={!hasChanged}
          className={hasChanged ? 'button' : 'button-disabled'}
          style={{alignSelf: 'flex-end'}}
        >
          Save Configuration
        </button>
      </form>
    </div>
  );
};
