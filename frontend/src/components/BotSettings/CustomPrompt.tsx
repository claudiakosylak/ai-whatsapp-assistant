import { useEffect, useState } from 'react';

export const CustomPrompt = () => {
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = async () => {
    const response = await fetch('/api/prompt');
    if (response.ok) {
      const data = await response.json();
      setPrompt(data.prompt);
      setOriginalPrompt(data.prompt);
    }
  };

  useEffect(() => {
    if (!prompt) {
      fetchPrompt();
    }
  }, []);

  const hasChanged = JSON.stringify(prompt) !== JSON.stringify(originalPrompt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const response = await fetch('/api/prompt', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (response.ok) {
      setOriginalPrompt(prompt);
    } else {
      const errorData = await response.json();
      setError(errorData.message || 'Failed to save custom prompt.');
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <textarea
          name="customPrompt"
          style={{ width: '98%', height: '100px', margin: '0px 0px 10px 0px' }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          type="submit"
          disabled={!hasChanged}
          className={hasChanged ? 'button' : 'button-disabled'}
          style={{ width: '100%' }}
        >
          Update Prompt
        </button>
      </form>
    </div>
  );
};
