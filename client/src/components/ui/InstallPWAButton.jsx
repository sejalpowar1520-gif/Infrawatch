import { useEffect, useState } from 'react';

/**
 * Listens for the beforeinstallprompt event and shows an "Install App" button
 * when the browser allows it (Chrome/Edge desktop + Android).
 */
export default function InstallPWAButton() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const installedHandler = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  if (installed || !deferred) return null;

  const handleClick = async () => {
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setDeferred(null);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        width: '100%',
        padding: '7px 10px',
        background: 'rgba(245,166,35,0.1)',
        border: '1px solid #F5A623',
        borderRadius: 4,
        color: '#F5A623',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        letterSpacing: '0.03em',
      }}
      title="Install INFRAWATCH as an app on your device"
    >
      📲 Install as App
    </button>
  );
}
