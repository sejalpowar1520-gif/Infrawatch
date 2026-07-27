import { useEffect, useState, useRef } from 'react';
import { violationsApi } from '../../api/client';

/**
 * CRISIS RESPONSE BANNER
 *
 * Real-time crisis monitoring strip for the dashboard.
 * Polls the /api/violations/crisis-feed endpoint every 15s and shows:
 *  - Overall crisis level (color-coded: CRITICAL / HIGH / ELEVATED / LOW)
 *  - Live ticker of top critical cases with SLA countdown
 *  - One-click navigation to act on any case
 */

const LEVEL_GLOW = {
  CRITICAL: '0 0 24px rgba(255,59,48,0.5)',
  HIGH: '0 0 18px rgba(255,149,0,0.4)',
  ELEVATED: '0 0 14px rgba(255,214,10,0.3)',
  LOW: '0 0 10px rgba(52,199,89,0.25)',
};

const SLA_LABELS = {
  BREACHED: { color: '#FF3B30', label: 'SLA BREACHED', icon: '⚠' },
  AT_RISK: { color: '#FF9500', label: 'SLA AT RISK', icon: '◐' },
  ON_TIME: { color: '#34C759', label: 'ON TIME', icon: '●' },
};

export default function CrisisResponseBanner({ onNav }) {
  const [feed, setFeed] = useState(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const intervalRef = useRef(null);
  const tickerRef = useRef(null);

  const loadFeed = async () => {
    try {
      const data = await violationsApi.crisisFeed();
      setFeed(data);
      setPulseKey((k) => k + 1);
    } catch (err) {
      console.warn('[CrisisBanner] feed error:', err.message);
    }
  };

  useEffect(() => {
    loadFeed();
    intervalRef.current = setInterval(loadFeed, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!feed?.criticalCases?.length) return;
    tickerRef.current = setInterval(() => {
      setTickerIndex((i) => (i + 1) % feed.criticalCases.length);
    }, 4000);
    return () => clearInterval(tickerRef.current);
  }, [feed?.criticalCases?.length]);

  if (!feed) {
    return (
      <div style={{
        background: '#0A0C10',
        border: '1px solid #2A2D35',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 16,
        fontSize: 12,
        color: '#8A8F98',
      }}>
        Connecting to Crisis Response Grid...
      </div>
    );
  }

  const { crisisLevel, crisisColor, crisisMessage, metrics, criticalCases } = feed;
  const currentCase = criticalCases?.[tickerIndex];

  return (
    <div
      key={pulseKey}
      style={{
        background: `linear-gradient(135deg, ${crisisColor}18 0%, transparent 60%), #0A0C10`,
        border: `1px solid ${crisisColor}`,
        borderRadius: 10,
        padding: '14px 20px',
        marginBottom: 16,
        boxShadow: LEVEL_GLOW[crisisLevel],
        position: 'relative',
        overflow: 'hidden',
        animation: 'crisis-fade-in 0.5s ease',
      }}
    >
      {/* Pulse indicator stripe */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: crisisColor,
        animation: crisisLevel === 'CRITICAL' || crisisLevel === 'HIGH' ? 'crisis-pulse 1.5s ease-in-out infinite' : 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {/* Status icon + level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: crisisColor,
            boxShadow: `0 0 12px ${crisisColor}`,
            animation: 'crisis-pulse-dot 1.4s ease-in-out infinite',
          }} />
          <div>
            <div style={{
              fontFamily: 'Space Mono',
              fontSize: 10,
              color: '#8A8F98',
              letterSpacing: '0.15em',
            }}>
              CRISIS STATUS
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: crisisColor,
              letterSpacing: '0.05em',
              marginTop: 2,
            }}>
              {crisisLevel}
            </div>
          </div>
        </div>

        {/* Message */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#E8E9EA', fontWeight: 500, marginBottom: 4 }}>
            {crisisMessage}
          </div>

          {/* Live ticker */}
          {currentCase && (
            <div
              key={currentCase.id}
              onClick={() => onNav && onNav('detail', currentCase)}
              style={{
                fontSize: 11,
                color: '#B8BCC4',
                fontFamily: 'Space Mono',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                animation: 'crisis-ticker 0.3s ease',
              }}
            >
              <span style={{
                color: SLA_LABELS[currentCase.slaStatus].color,
                fontWeight: 700,
                fontSize: 10,
              }}>
                {SLA_LABELS[currentCase.slaStatus].icon} {SLA_LABELS[currentCase.slaStatus].label}
              </span>
              <span style={{ color: '#F5A623' }}>{currentCase.id}</span>
              <span>·</span>
              <span>{currentCase.type}</span>
              <span>·</span>
              <span>{currentCase.ward}</span>
              <span>·</span>
              <span style={{ color: '#8A8F98' }}>
                {currentCase.ageHours}h elapsed / {currentCase.slaHours}h SLA
              </span>
              <span style={{ color: '#F5A623', marginLeft: 'auto', fontSize: 10 }}>
                view →
              </span>
            </div>
          )}
        </div>

        {/* Metric pills */}
        <div style={{ display: 'flex', gap: 10 }}>
          <MetricPill label="CRITICAL" value={metrics.critical} color="#FF3B30" />
          <MetricPill label="UNASSIGNED" value={metrics.unassigned} color="#FF9500" />
          <MetricPill label="SLA BREACH" value={metrics.slaBreached} color="#A78BFA" />
          <MetricPill label="ACTIVE" value={metrics.totalActive} color="#34C759" />
        </div>
      </div>

      <style>{`
        @keyframes crisis-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes crisis-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @keyframes crisis-fade-in {
          from { opacity: 0.7; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes crisis-ticker {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function MetricPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4px 12px',
      background: '#0F1117',
      border: `1px solid ${color}33`,
      borderRadius: 5,
      minWidth: 64,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, color: '#8A8F98', letterSpacing: '0.08em', marginTop: 1 }}>
        {label}
      </div>
    </div>
  );
}
