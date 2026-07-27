import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { violationsApi, analyticsApi, logsApi } from '../api/client';
import KPI from '../components/ui/KPI';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';
import ViolationCard from '../components/violations/ViolationCard';
import ViewSkeleton from '../components/ui/Skeleton';
import AICityScanModal from '../components/ui/AICityScanModal';
import CrisisResponseBanner from '../components/dashboard/CrisisResponseBanner';
import ImpactCard from '../components/dashboard/ImpactCard';
import { fmtIN } from '../components/ui/Counter';

export default function DashboardPage({ onNav }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summaryMonth, setSummaryMonth] = useState(null);
  const [summaryYear, setSummaryYear] = useState(null);
  const [trends, setTrends] = useState([]);
  const [types, setTypes] = useState([]);
  const [wards, setWards] = useState([]);
  const [recent, setRecent] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showCityScan, setShowCityScan] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    Promise.all([
      analyticsApi.summary('month'),
      analyticsApi.summary('year'),
      analyticsApi.trends('year'),
      analyticsApi.types('year'),
      analyticsApi.wards('year'),
      violationsApi.list({ limit: 8, sort: 'detected_date', order: 'desc' }),
      logsApi.list(10),
    ]).then(([monthSum, yearSum, tr, ty, wa, viol, lg]) => {
      setSummaryMonth(monthSum);
      setSummaryYear(yearSum);
      setTrends(tr.trends || []);
      setTypes(ty.types || []);
      setWards((wa.wards || []).sort((a, b) => b.count - a.count));
      setRecent(viol.violations || []);
      setLogs(lg.logs || []);
      setLoading(false);
    }).catch((err) => {
      toast('Failed to load dashboard: ' + err.message, 'error');
      setLoading(false);
    });
  }, [reloadKey]);

  if (loading) return <ViewSkeleton />;

  const pipeline = [
    ['New', summaryYear?.new || 0, 'var(--rd)'],
    ['Review', summaryYear?.underReview || 0, 'var(--bl)'],
    ['Notice', summaryYear?.noticeSent || 0, 'var(--pu)'],
    ['Resolved', summaryYear?.resolved || 0, 'var(--tl)'],
  ];

  const topWards = wards.slice(0, 5);
  const maxWard = topWards[0]?.count || 1;
  const pieTotal = types.reduce((sum, item) => sum + item.v, 0);

  return (
    <div className="fi" style={{ padding: '18px 22px 22px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600 }}>Crisis Response Command Center</h1>
          <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--mt)', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN')} · BENGALURU URBAN SAFETY GRID · LIVE
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn"
            onClick={() => setShowCityScan(true)}
            data-tooltip="Live AI scan of 4 random hotspots — auto-files violations and assigns officers in <30s"
            style={{
              background: 'linear-gradient(135deg, #F5A623 0%, #E09612 100%)',
              color: '#0A0C10',
              fontWeight: 700,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              boxShadow: '0 4px 14px rgba(245,166,35,0.25)',
            }}
          >
            <span>⚡</span> Run AI City Scan
          </button>
        </div>
      </div>

      {/* AI City Scan Modal */}
      {showCityScan && (
        <AICityScanModal
          onClose={() => {
            setShowCityScan(false);
            setReloadKey(k => k + 1); // refresh dashboard with new violations
          }}
          onComplete={(created) => {
            toast(`AI City Scan complete: ${created.length} violations filed`, 'success');
            onNav && onNav('violations');
          }}
        />
      )}

      {/* Crisis Response Banner — live polling, top of dashboard */}
      <CrisisResponseBanner onNav={onNav} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <KPI label="ACTIVE CRISIS CASES" target={summaryMonth?.total || 0} accent="var(--rd)" />
        <KPI label="ENFORCEMENT NOTICES" target={summaryYear?.noticeSent || 0} accent="var(--am)" />
        <KPI label="PENALTY RECOVERABLE" pre="Rs " target={summaryYear?.revenue || 0} suf=" Cr" accent="var(--tl)" />
        <KPI label="WARDS UNDER WATCH" target={wards.length} accent="var(--bl)" />
      </div>

      <ImpactCard activeViolations={summaryYear?.total || 0} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: '0 0 57%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
              <div className="slb" style={{ margin: 0, color: 'var(--am)' }}>RECENT DETECTIONS</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', marginTop: 4 }}>LIVE CASE FEED</div>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 8px 4px' }}>
              {recent.map((violation) => (
                <ViolationCard key={violation.id} v={violation} onClick={(item) => onNav('detail', item)} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card" style={{ padding: '14px 12px 10px' }}>
            <div className="slb">DETECTIONS THIS YEAR</div>
            <LineChart data={trends} color="#F5A623" h={145} />
          </div>

          <div className="card" style={{ padding: '14px 12px 10px' }}>
            <div className="slb">BY VIOLATION TYPE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <DonutChart data={types} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {types.map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--mt)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: item.c, flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.name}</span>
                    <span style={{ fontFamily: 'Space Mono', color: 'var(--sc)', flexShrink: 0 }}>
                      {pieTotal ? Math.round((item.v * 100) / pieTotal) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '14px 14px 12px' }}>
            <div className="slb">TOP WARDS BY VIOLATIONS</div>
            {topWards.map((ward) => (
              <div key={ward.ward} style={{ marginBottom: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--sc)' }}>{ward.ward}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--am)' }}>{ward.count}</span>
                </div>
                <div style={{ height: 4, background: 'var(--ev)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--am)', borderRadius: 2, width: `${(ward.count / maxWard) * 100}%`, transition: 'width .9s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="slb">ENFORCEMENT PIPELINE</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 10 }}>
            {pipeline.map(([label, value, color]) => (
              <div key={label} style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 18, color, fontWeight: 700 }}>{fmtIN(value)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn bp" style={{ fontSize: 11, padding: '5px 9px' }} onClick={() => onNav('violations')}>Open Master Queue</button>
            <div style={{ fontSize: 11, color: 'var(--mt)' }}>Live totals are computed from the current violation dataset.</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--bd)' }}>
          <div className="slb" style={{ margin: 0 }}>SYSTEM ACTIVITY LOG</div>
        </div>
        <div style={{ background: 'rgba(8,10,13,.8)', maxHeight: 140, overflowY: 'auto', padding: '8px 18px', fontFamily: 'Space Mono', fontSize: 11 }}>
          {logs.map((log, index) => (
            <div key={index} style={{ display: 'flex', gap: 14, marginBottom: 6, color: log.type === 'success' ? 'var(--tl)' : log.type === 'warn' ? 'var(--am)' : 'var(--sc)' }}>
              <span style={{ color: 'var(--mt)', flexShrink: 0 }}>
                [{new Date(log.created_at).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })}]
              </span>
              <span>* {log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
