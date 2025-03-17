import { useEffect, useState } from 'react';

export const CustomPrompt = () => {
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('')

  const fetchPrompt = async () => {
    const response = await fetch('/api/prompt');
    if (response.ok) {
      const data = await response.json();
      setPrompt(data.settings);
      setOriginalPrompt(data.settings)
    }
  };

  useEffect(() => {
    if (!prompt) {
      fetchPrompt();
    }
  }, []);

  const hasChanged = prompt !== originalPrompt;

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Custom Prompt</h3>
      <form action="/save-custom-prompt" method="POST">
        <textarea
          name="customPrompt"
          style={{ width: '100%', height: '100px' }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button type="submit" disabled={!hasChanged}>Update Prompt</button>
      </form>
    </div>
  );
};
