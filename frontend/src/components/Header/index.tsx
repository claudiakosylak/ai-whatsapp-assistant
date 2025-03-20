import { useEffect, useState } from 'react';
import { ThemeToggle } from '../ThemeToggle';

export const Header = () => {
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  useEffect(() => {
    const fetchWhatsappStatus = async () => {
      try {
        const response = await fetch('/api/whatsapp-connection');
        if (!response.ok) throw new Error('Failed to fetch connection status');
        const data = await response.json();
        setWhatsappConnected(data.connected);
      } catch (error) {
        console.error('Error fetching whatsapp status:', error);
      }
    };
    fetchWhatsappStatus();
    const intervalId = setInterval(fetchWhatsappStatus, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="header">
      <h1>WhatsApp Bot Control Panel</h1>
      <div className="statusTheme">
        <ThemeToggle />
        <div className="status active" id="whatsapp-status">
          <strong>WhatsApp:</strong>{' '}
          <span style={{ color: whatsappConnected ? '#2e7d32' : '#d32f2f' }}>
            {whatsappConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};
