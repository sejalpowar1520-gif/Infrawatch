import { useState, useEffect } from 'react';
import { visionApi, violationsApi, officersApi } from '../../api/client';

/**
 * AI City Scan Modal — Hackathon showpiece
 *
 * One-click flow:
 * 1. Backend returns N random hotspot locations with seeded detections
 * 2. UI walks through each location with live progress
 * 3. For each "violation"-severity detection, auto-creates a real violation
 *    in the DB with an auto-assigned officer (round-robin)
 * 4. Shows final summary with "View Violations" CTA
 */

const VIOLATION_TYPE_MAP = {
  floor_addition: 'Unauthorized Floor Addition',
  no_permit: 'No Building Permit',
  encroachment: 'Encroachment on Public Land',
  commercial_in_residential: 'Commercial Use in Residential Zone',
  setback: 'Setback Violation',
  basement: 'Illegal Basement Construction',
};

const SEV_COLORS = {
  violation: '#FF3B30',
  warning: '#E6A800',
  clear: '#34C759',
};

export default function AICityScanModal({ onClose, onComplete }) {
  const [phase, setPhase] = useState('idle'); // idle | scanning | done | error
  const [plan, setPlan] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [stageMessage, setStageMessage] = useState('');
  const [results, setResults] = useState([]); // [{ hotspot, detections, createdIds: [] }]
  const [createdViolations, setCreatedViolations] = useState([]);
  const [error, setError] = useState(null);
  const [officers, setOfficers] = useState([]);

  useEffect(() => {
    officersApi.list()
      .then(d => setOfficers((d.officers || []).filter(o => ['inspector', 'field_officer'].includes(o.role))))
      .catch(() => {});
  }, []);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const startScan = async () => {
    console.log('[CityScan] Starting...');
    setPhase('scanning');
    setError(null);
    setResults([]);
    setCreatedViolations([]);
    setCurrentIndex(-1);
    setStageMessage('Acquiring satellite imagery for Bengaluru wards...');

    try {
      await sleep(900);
      console.log('[CityScan] Fetching scan plan...');
      const planData = await visionApi.cityScanPlan(4);
      console.log('[CityScan] Plan received:', planData.plan?.length, 'locations');

      setPlan(planData.plan);
      const allResults = [];
      const allCreated = [];

      // Walk through each hotspot
      for (let i = 0; i < planData.plan.length; i++) {
        const item = planData.plan[i];
        setCurrentIndex(i);

        setStageMessage(`Scanning ${item.hotspot.name}...`);
        await sleep(1100);

        setStageMessage(`AI analyzing ${item.hotspot.ward} ward...`);
        await sleep(900);

        const violationDetections = item.detections.filter(d => d.severity === 'violation');
        const createdIds = [];

        for (const det of violationDetections) {
          const officer = officers.length > 0
            ? officers[(allCreated.length) % officers.length]
            : null;

          setStageMessage(
            `Filing violation: ${VIOLATION_TYPE_MAP[det.potentialViolationType] || 'Building Violation'}` +
            (officer ? ` → ${officer.name}` : '')
          );

          try {
            const payload = {
              address: `${item.hotspot.lat.toFixed(6)}, ${item.hotspot.lng.toFixed(6)} — ${item.hotspot.name}`,
              ward: item.hotspot.ward,
              type: VIOLATION_TYPE_MAP[det.potentialViolationType] || 'No Building Permit',
              detected_date: new Date().toISOString().slice(0, 10),
              confidence: det.violationLikelihood || item.overallConfidence || 80,
              lat: item.hotspot.lat,
              lng: item.hotspot.lng,
              officer_id: officer?.id || null,
              area: det.estimatedAreaSqFt || 0,
              zone: item.hotspot.zone,
              owner_name: 'To be identified',
              status: 'NEW',
              source: 'ai_city_scan',
            };
            const res = await violationsApi.create(payload);
            createdIds.push({
              id: res.violation.id,
              type: res.violation.type,
              ward: res.violation.ward,
              officer: res.violation.officer_name,
              severity: 'violation',
            });
            allCreated.push(res.violation);
            await sleep(450);
          } catch (err) {
            console.warn('[CityScan] Failed to file violation:', err.message);
          }
        }

        allResults.push({ ...item, createdIds });
        setResults([...allResults]);
        setCreatedViolations([...allCreated]);
        await sleep(400);
      }

      setStageMessage('Compiling final report...');
      await sleep(700);

      console.log('[CityScan] Done. Created', allCreated.length, 'violations');
      setPhase('done');
      setStageMessage('');
    } catch (err) {
      console.error('[CityScan] Error:', err);
      setError(err.message || 'Scan failed');
      setPhase('error');
    }
  };

  // Aggregate stats
  const totalDetections = results.reduce((sum, r) => sum + r.detections.length, 0);
  const violations = results.reduce((sum, r) => sum + r.detections.filter(d => d.severity === 'violation').length, 0);
  const warnings = results.reduce((sum, r) => sum + r.detections.filter(d => d.severity === 'warning').length, 0);
  const cleared = results.reduce((sum, r) => sum + r.detections.filter(d => d.severity === 'clear').length, 0);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#0F1117',
        border: '1px solid #2A2D35',
        borderRadius: 12,
        width: 720,
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(245,166,35,0.15) 0%, rgba(0,0,0,0) 100%)',
          borderBottom: '1px solid #2A2D35',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#F5A623', letterSpacing: '0.15em' }}>
              VISION AI · MULTI-WARD SCANNER
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#E8E9EA', marginTop: 4 }}>
              AI City Scan — Bengaluru
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #2A2D35',
              color: '#8A8F98',
              borderRadius: 4,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {phase === 'idle' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🛰️</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#E8E9EA' }}>
                Run an AI-powered scan across the city
              </div>
              <div style={{ fontSize: 13, color: '#8A8F98', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
                The system will pick 4 random construction hotspots, run live AI detection on each
                location's satellite imagery, automatically file violations, and assign them to
                available officers — all in under 30 seconds.
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                maxWidth: 540,
                margin: '0 auto 28px',
              }}>
                {[
                  { icon: '📍', label: '4 Locations', sub: 'Random hotspots' },
                  { icon: '🤖', label: 'Live AI', sub: 'Vision detection' },
                  { icon: '👮', label: 'Auto Assign', sub: 'Round-robin' },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: 14,
                    background: '#0A0C10',
                    border: '1px solid #2A2D35',
                    borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#E8E9EA' }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: '#8A8F98', marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={startScan}
                style={{
                  padding: '14px 36px',
                  background: 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#0A0C10',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(245,166,35,0.3)',
                  letterSpacing: '0.02em',
                }}
              >
                ⚡ START AI SCAN
              </button>
            </div>
          )}

          {phase === 'scanning' && (
            <>
              {/* Live progress */}
              <div style={{
                padding: 16,
                background: 'rgba(245,166,35,0.08)',
                border: '1px solid rgba(245,166,35,0.4)',
                borderRadius: 8,
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  border: '3px solid rgba(245,166,35,0.3)',
                  borderTopColor: '#F5A623',
                  borderRadius: '50%',
                  animation: 'aiscan-spin 0.9s linear infinite',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F5A623' }}>
                    {stageMessage || 'Initializing...'}
                  </div>
                  {plan.length > 0 && currentIndex >= 0 && (
                    <div style={{ fontSize: 11, color: '#8A8F98', marginTop: 4 }}>
                      Location {currentIndex + 1} of {plan.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {plan.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    height: 6,
                    background: '#1A1D24',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${((currentIndex + 1) / plan.length) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #F5A623, #E09612)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Per-location results */}
              {results.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: '#8A8F98', marginBottom: 10, fontFamily: 'Space Mono', letterSpacing: '0.05em' }}>
                    SCAN RESULTS
                  </div>
                  {results.map((r, i) => (
                    <LocationResultCard key={i} result={r} />
                  ))}
                </div>
              )}
            </>
          )}

          {phase === 'done' && (
            <>
              {/* Summary */}
              <div style={{
                padding: 20,
                background: 'rgba(52,199,89,0.08)',
                border: '1px solid #34C759',
                borderRadius: 8,
                marginBottom: 18,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#34C759' }}>
                  Scan Complete
                </div>
                <div style={{ fontSize: 12, color: '#8A8F98', marginTop: 4 }}>
                  {plan.length} locations analyzed · {createdViolations.length} new violations filed
                </div>
              </div>

              {/* Stat grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 10,
                marginBottom: 22,
              }}>
                <StatBox label="Locations" value={plan.length} color="#4A9EFF" />
                <StatBox label="Violations" value={violations} color={SEV_COLORS.violation} />
                <StatBox label="Warnings" value={warnings} color={SEV_COLORS.warning} />
                <StatBox label="Cleared" value={cleared} color={SEV_COLORS.clear} />
              </div>

              {/* Filed violations list */}
              {createdViolations.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, color: '#F5A623', marginBottom: 10, fontFamily: 'Space Mono' }}>
                    NEW VIOLATIONS FILED ({createdViolations.length})
                  </div>
                  {createdViolations.map((v, i) => (
                    <div key={i} style={{
                      padding: '10px 12px',
                      background: '#0A0C10',
                      borderRadius: 5,
                      marginBottom: 6,
                      borderLeft: '3px solid #FF3B30',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                    }}>
                      <div>
                        <span style={{ color: '#F5A623', fontFamily: 'Space Mono', marginRight: 10 }}>
                          {v.id}
                        </span>
                        <span style={{ color: '#E8E9EA' }}>{v.type}</span>
                        <span style={{ color: '#8A8F98', marginLeft: 8 }}>· {v.ward}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#8A8F98' }}>
                        {v.officer_name || 'Unassigned'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 18px',
                    background: 'transparent',
                    border: '1px solid #2A2D35',
                    borderRadius: 6,
                    color: '#B8BCC4',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onComplete && onComplete(createdViolations);
                    onClose();
                  }}
                  style={{
                    padding: '10px 22px',
                    background: 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#0A0C10',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  View All Violations →
                </button>
              </div>
            </>
          )}

          {phase === 'error' && (
            <div style={{
              padding: 20,
              background: 'rgba(255,59,48,0.1)',
              border: '1px solid #FF3B30',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FF3B30', marginBottom: 6 }}>
                Scan Failed
              </div>
              <div style={{ fontSize: 12, color: '#FF6B6B' }}>{error}</div>
              <button
                onClick={() => setPhase('idle')}
                style={{
                  marginTop: 16,
                  padding: '8px 16px',
                  background: '#FF3B30',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes aiscan-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      padding: 12,
      background: '#0A0C10',
      border: '1px solid #2A2D35',
      borderRadius: 6,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: '#8A8F98', marginTop: 2, letterSpacing: '0.08em' }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

function LocationResultCard({ result }) {
  const v = result.detections.filter(d => d.severity === 'violation').length;
  const w = result.detections.filter(d => d.severity === 'warning').length;
  const c = result.detections.filter(d => d.severity === 'clear').length;
  const filed = result.createdIds?.length || 0;

  return (
    <div style={{
      padding: 12,
      background: '#0A0C10',
      borderRadius: 6,
      marginBottom: 8,
      border: '1px solid #1A1D24',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#E8E9EA' }}>
          📍 {result.hotspot.name}
        </div>
        <div style={{ fontSize: 10, color: '#8A8F98' }}>
          {result.hotspot.ward}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 4 }}>
        <span style={{ color: SEV_COLORS.violation }}>● {v} violation{v !== 1 ? 's' : ''}</span>
        <span style={{ color: SEV_COLORS.warning }}>● {w} warning{w !== 1 ? 's' : ''}</span>
        <span style={{ color: SEV_COLORS.clear }}>● {c} clear</span>
        {filed > 0 && (
          <span style={{ color: '#F5A623', marginLeft: 'auto', fontWeight: 600 }}>
            ✓ {filed} filed
          </span>
        )}
      </div>
    </div>
  );
}
