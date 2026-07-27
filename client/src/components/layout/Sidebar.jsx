import { useAuth } from '../../context/AuthContext';
import InstallPWAButton from '../ui/InstallPWAButton';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Crisis Dashboard', ico: 'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z' },
  { id: 'live-detection', label: '🛰️ Live AI Scan', ico: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', highlight: true, isNew: true },
  { id: 'violations', label: 'Active Cases', ico: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
  { id: 'map', label: 'Coverage Atlas', ico: 'M1 6l7-5 8 5 7-5v18l-7 5-8-5-7 5z' },
  { id: 'ai-features', label: '🤖 AI Tools', ico: 'M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z', highlight: true },
  { id: 'analytics', label: 'Analytics', ico: 'M18 20V10M12 20V4M6 20v-6' },
  { id: 'settings', label: 'Settings', ico: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
];

export default function Sidebar({ view, onNav }) {
  const { user, logout, hasRole } = useAuth();
  const navItems = NAV_ITEMS.filter((item) => item.id !== 'settings' || hasRole('commissioner', 'admin'));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, background: 'var(--sf)', borderRight: '1px solid var(--bd)', zIndex: 40, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 18px 12px' }}>
        <div style={{ fontFamily: 'Space Mono', fontSize: 15, fontWeight: 700, color: 'var(--am)', letterSpacing: '.08em' }}>INFRAWATCH</div>
        <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 2, fontFamily: 'Space Mono' }}>Bengaluru Municipal</div>
      </div>

      <nav style={{ padding: 10, flex: 1, overflowY: 'auto' }}>
        {navItems.map((it) => {
          const active = view === it.id;
          const isHighlight = it.highlight;
          const isNew = it.isNew;
          return (
            <div
              key={it.id}
              onClick={() => onNav(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 4, marginBottom: isNew ? 10 : 2, cursor: 'pointer',
                background: isNew 
                  ? 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)' 
                  : isHighlight && !active 
                    ? 'linear-gradient(135deg, rgba(245,166,35,0.15) 0%, rgba(245,166,35,0.05) 100%)' 
                    : active ? 'var(--amd)' : 'transparent',
                borderLeft: active ? '2px solid var(--am)' : isHighlight ? '2px solid var(--am)' : '2px solid transparent',
                color: isNew ? '#0A0C10' : active || isHighlight ? 'var(--am)' : 'var(--sc)', 
                transition: 'all 150ms',
                position: 'relative',
                boxShadow: isNew ? '0 4px 15px rgba(245,166,35,0.4)' : 'none',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d={it.ico} />
              </svg>
              <span style={{ fontSize: isNew ? 12 : 14, fontWeight: isNew ? 700 : active || isHighlight ? 500 : 400 }}>{it.label}</span>
              {isNew && (
                <span style={{
                  position: 'absolute',
                  top: -6,
                  right: 10,
                  background: '#FF3B30',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 10,
                  animation: 'pulse 2s ease-in-out infinite',
                }}>
                  NEW
                </span>
              )}
            </div>
          );
        })}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </nav>

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--bd)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div className="pu" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tl)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, color: 'var(--tl)', fontWeight: 500 }}>Crisis Grid Online</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)' }}>Real-time monitoring</div>
          </div>
        </div>

        <InstallPWAButton />

        {user && (
          <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--sc)', marginBottom: 2 }}>{user.name}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--mt)', marginBottom: 6 }}>{user.role?.toUpperCase()}</div>
            <button className="btn bs" style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '5px 8px' }} onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
