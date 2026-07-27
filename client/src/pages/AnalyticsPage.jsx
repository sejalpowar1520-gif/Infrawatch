import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { analyticsApi } from '../api/client';
import KPI from '../components/ui/KPI';
import LineChart from '../components/charts/LineChart';
import BarChart from '../components/charts/BarChart';
import StackedBarChart from '../components/charts/StackedBarChart';
import ViewSkeleton from '../components/ui/Skeleton';
import AIInsightsPanel from '../components/dashboard/AIInsightsPanel';

const TYPE_LEGEND = [
  { key: 'UF', label: 'Unauth Floor', color: '#FF4545' },
  { key: 'NP', label: 'No Permit', color: '#F5A623' },
  { key: 'EP', label: 'Encroach', color: '#00C9A7' },
  { key: 'CR', label: 'Commercial', color: '#4A9EFF' },
  { key: 'SV', label: 'Setback', color: '#A78BFA' },
  { key: 'IB', label: 'Basement', color: '#4A5468' },
];

export default function AnalyticsPage({ onNav }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('This Year');
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [typeTrends, setTypeTrends] = useState([]);
  const [wards, setWards] = useState([]);
  const [confidence, setConfidence] = useState([]);
  const [resolution, setResolution] = useState([]);
  const [quality, setQuality] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  const periodMap = {
    'This Month': 'month',
    'Last Quarter': 'quarter',
    'This Year': 'year',
    'All Time': '',
  };

  useEffect(() => {
    const selectedPeriod = periodMap[period];
    setLoading(true);

    Promise.all([
      analyticsApi.summary(selectedPeriod),
      analyticsApi.trends(selectedPeriod),
      analyticsApi.typeTrends(selectedPeriod),
      analyticsApi.wards(selectedPeriod),
      analyticsApi.confidence(selectedPeriod),
      analyticsApi.resolution(selectedPeriod),
      analyticsApi.quality(selectedPeriod),
    ]).then(([sum, tr, typeTrendRes, wardRes, conf, res, qualityRes]) => {
      const wardRows = wardRes.wards || [];
      const nextSelectedWard = wardRows.find((ward) => ward.ward === selectedWard?.ward) || wardRows[0] || null;

      setSummary(sum);
      setTrends(tr.trends || []);
      setTypeTrends(typeTrendRes.trends || []);
      setWards(wardRows);
      setConfidence(conf.confidence || []);
      setResolution(res.resolution || []);
      setQuality(qualityRes.quality || null);
      setSelectedWard(nextSelectedWard);
      setLoading(false);
    }).catch((err) => {
      toast('Failed to load analytics: ' + err.message, 'error');
      setLoading(false);
    });
  }, [period]);

  if (loading) return <ViewSkeleton />;

  const priorityWard = wards[0];
  const noticeConversion = summary?.total ? ((summary.noticeSent / summary.total) * 100).toFixed(1) : '0.0';
  const avgRevenue = wards.length ? (wards.reduce((sum, ward) => sum + (ward.revenue || 0), 0) / wards.length).toFixed(1) : '0.0';
  const activeWard = selectedWard || wards[0] || {};
  const qualityCards = [
    ['Resolved Rate', `${quality?.resolutionRate || 0}%`, 'var(--tl)'],
    ['False Positive Rate', `${quality?.falsePositiveRate || 0}%`, 'var(--rd)'],
    ['Avg Confidence', `${quality?.avgConfidence || 0}%`, 'var(--am)'],
    ['High-Confidence Share', `${quality?.highConfidenceShare || 0}%`, 'var(--bl)'],
  ];
  const feedbackCards = [
    ['Review Coverage', `${quality?.reviewCoverage || 0}%`, 'Share of detections with reviewer outcome', 'var(--bl)'],
    ['Confirmed', String(quality?.confirmedCases || 0), `${quality?.confirmedRate || 0}% of reviewed cases`, 'var(--tl)'],
    ['Needs Inspection', String(quality?.fieldInspectionCases || 0), `${quality?.fieldInspectionRate || 0}% routed to field review`, 'var(--am)'],
    ['False Positives', String(quality?.falsePositiveCases || 0), `${quality?.falsePositiveShare || 0}% of reviewed cases`, 'var(--rd)'],
  ];
  const copilotCards = [
    ['AI Coverage', `${quality?.aiCoverage || 0}%`, `${quality?.aiReviewedCases || 0} cases with dossier`, 'var(--bl)'],
    ['AI Approval Rate', `${quality?.aiApprovalRate || 0}%`, `${quality?.aiApprovedReviews || 0} officer-approved dossiers`, 'var(--tl)'],
    ['AI Override Rate', `${quality?.aiOverrideRate || 0}%`, `${quality?.aiOverriddenReviews || 0} officer overrides`, 'var(--am)'],
    ['Legal Notice Suggestions', String(quality?.aiNoticeRecommendations || 0), `${quality?.aiInspectionRecommendations || 0} sent to field inspection`, 'var(--rd)'],
  ];

  return (
    <div className="fi" style={{ padding: '18px 22px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>City Analytics - Bengaluru</h1>
        <div style={{ display: 'flex', gap: 5 }}>
          {['This Month', 'Last Quarter', 'This Year', 'All Time'].map((label) => (
            <button
              key={label}
              onClick={() => setPeriod(label)}
              style={{
                padding: '5px 11px',
                border: '1px solid',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                background: period === label ? 'var(--am)' : 'transparent',
                color: period === label ? '#080A0D' : 'var(--sc)',
                borderColor: period === label ? 'var(--am)' : 'var(--bd)',
                transition: 'all 150ms',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <AIInsightsPanel summary={summary} wards={wards} quality={quality} trends={trends} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        {[
          ['PROGRAM MODE', period.toUpperCase(), 'Current reporting window', 'var(--bl)'],
          ['PRIORITY WARD', priorityWard?.ward || '-', 'Highest case volume in view', 'var(--rd)'],
          ['NOTICE CONVERSION', `${noticeConversion}%`, 'Share escalated into notices', 'var(--am)'],
          ['AVG RECOVERY', `Rs ${avgRevenue} Cr`, 'Average ward-level potential', 'var(--tl)'],
        ].map(([label, value, subtext, color]) => (
          <div key={label} className="card" style={{ padding: '16px 18px' }}>
            <div className="slb" style={{ marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 24, fontWeight: 700, color, marginBottom: 8 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--mt)' }}>{subtext}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
        <KPI label="TOTAL DETECTED" target={summary?.total || 0} accent="var(--rd)" />
        <KPI label="NOTICES SENT" target={summary?.noticeSent || 0} accent="var(--am)" />
        <KPI label="PENDING" target={summary?.pending || 0} accent="var(--pu)" />
        <KPI label="RESOLVED" target={summary?.resolved || 0} accent="var(--tl)" />
        <KPI label="REVENUE" pre="Rs " target={summary?.revenue || 0} suf=" Cr" accent="var(--bl)" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div className="card" style={{ flex: '0 0 57%', padding: '14px 10px' }}>
          <div className="slb">MONTHLY DETECTION TREND</div>
          <LineChart data={trends} color="#F5A623" h={190} />
        </div>
        <div className="card" style={{ flex: 1, padding: '14px 10px' }}>
          <div className="slb">VIOLATION TYPES OVER TIME</div>
          <StackedBarChart data={typeTrends} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
            {TYPE_LEGEND.map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--mt)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 1, background: item.color, display: 'inline-block' }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div className="card" style={{ flex: 1, padding: '14px 10px' }}>
          <div className="slb">RESOLUTION TIME (DAYS)</div>
          <BarChart data={resolution} color="#4A9EFF" h={130} label="c" />
        </div>
        <div className="card" style={{ flex: 1, padding: '14px 10px' }}>
          <div className="slb">CONFIDENCE DISTRIBUTION</div>
          <BarChart data={confidence} color="#A78BFA" h={130} label="c" />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--bd)' }}>
          <div className="slb" style={{ margin: 0 }}>TOP WARDS BREAKDOWN</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Ward', 'Violations', 'Resolved', 'Pending', 'Avg Days', 'Revenue', 'Action'].map((heading) => (
                  <th key={heading} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--mt)', background: 'rgba(22,27,36,.5)', borderBottom: '1px solid var(--bd)' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wards.map((ward, index) => (
                <tr key={ward.ward} style={{ borderBottom: '1px solid var(--bd)', background: activeWard?.ward === ward.ward ? 'rgba(245,166,35,.08)' : index % 2 === 0 ? 'transparent' : 'rgba(22,27,36,.3)' }}>
                  <td style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500 }}>{ward.ward}</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'Space Mono', fontSize: 11, color: 'var(--rd)' }}>{ward.count}</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'Space Mono', fontSize: 11, color: 'var(--tl)' }}>{ward.resolved}</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'Space Mono', fontSize: 11, color: 'var(--am)' }}>{ward.pending}</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'Space Mono', fontSize: 11, color: 'var(--sc)' }}>{ward.avg_days}d</td>
                  <td style={{ padding: '8px 14px', fontFamily: 'Space Mono', fontSize: 11, color: 'var(--bl)' }}>Rs {ward.revenue} Cr</td>
                  <td style={{ padding: '8px 14px' }}>
                    <button className="btn bs" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => { setSelectedWard(ward); onNav('violations'); }}>
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="slb">OPERATIONAL QUALITY</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {qualityCards.map(([label, value, color]) => (
            <div key={label} className="card" style={{ flex: 1, background: 'var(--ev)' }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 7 }}>{label}</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 20, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 10 }}>
          These metrics are derived from current case outcomes and confidence scores, not external model benchmark data.
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="slb">HUMAN-IN-THE-LOOP FEEDBACK</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {feedbackCards.map(([label, value, subtext, color]) => (
            <div key={label} className="card" style={{ background: 'var(--ev)' }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 7 }}>{label}</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 20, fontWeight: 700, color, marginBottom: 6 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--mt)' }}>{subtext}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 10 }}>
          Confirmed, false-positive, and field-inspection decisions are tracked as reviewer feedback to improve detection trust over time.
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="slb">AI COPILOT GOVERNANCE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {copilotCards.map(([label, value, subtext, color]) => (
            <div key={label} className="card" style={{ background: 'var(--ev)' }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 7 }}>{label}</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 20, fontWeight: 700, color, marginBottom: 6 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--mt)' }}>{subtext}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 10 }}>
          INFRAWATCH Copilot recommendations are tracked against officer approvals and overrides to show whether the AI is trusted in live enforcement workflow.
        </div>
      </div>
    </div>
  );
}
