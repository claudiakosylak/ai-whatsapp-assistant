import { useState } from 'react';
import { ThemeToggle } from '../ThemeToggle';

export const Header = () => {
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  return (
    <div className="header">
      <h1>WhatsApp Bot Control Panel</h1>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ThemeToggle />
        <div className="status active" id="whatsapp-status">
          <strong>WhatsApp Status:</strong>{' '}
          <span style={{ color: whatsappConnected ? '#2e7d32' : '#d32f2f' }}>
            {whatsappConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};
