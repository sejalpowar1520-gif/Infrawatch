/**
 * AI INSIGHTS PANEL
 *
 * Auto-generates plain-English insights from the analytics data.
 * Scans the data for notable patterns: highest ward, biggest jump, lagging
 * resolution rate, AI accuracy, etc., and surfaces them as actionable cards.
 *
 * This turns "just charts" into "AI-powered enforcement intelligence."
 */

export default function AIInsightsPanel({ summary, wards = [], quality, trends = [] }) {
  const insights = generateInsights({ summary, wards, quality, trends });
  if (!insights.length) return null;

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, rgba(167,139,250,0.06) 0%, rgba(74,158,255,0.04) 100%)',
      borderLeft: '3px solid #A78BFA',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: '#A78BFA', letterSpacing: '0.15em' }}>
            🤖 AI ENFORCEMENT INTELLIGENCE
          </div>
          <div style={{ fontSize: 14, color: 'var(--tx)', marginTop: 4, fontWeight: 500 }}>
            Auto-generated insights from current data
          </div>
        </div>
        <span style={{
          fontSize: 9,
          padding: '3px 8px',
          background: 'rgba(167,139,250,0.15)',
          color: '#A78BFA',
          borderRadius: 3,
          fontFamily: 'Space Mono',
          letterSpacing: '0.05em',
        }}>
          {insights.length} INSIGHTS
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 10,
      }}>
        {insights.map((insight, i) => (
          <InsightCard key={i} {...insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ severity, icon, title, body, action }) {
  const colors = {
    critical: { bg: 'rgba(255,59,48,0.08)', border: '#FF3B30', accent: '#FF3B30' },
    warn: { bg: 'rgba(245,166,35,0.08)', border: '#F5A623', accent: '#F5A623' },
    info: { bg: 'rgba(74,158,255,0.06)', border: '#4A9EFF', accent: '#4A9EFF' },
    success: { bg: 'rgba(52,199,89,0.06)', border: '#34C759', accent: '#34C759' },
  };
  const c = colors[severity] || colors.info;

  return (
    <div style={{
      padding: 12,
      background: c.bg,
      border: `1px solid ${c.border}40`,
      borderLeft: `3px solid ${c.border}`,
      borderRadius: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ fontSize: 12, fontWeight: 600, color: c.accent }}>{title}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.55 }}>{body}</div>
      {action && (
        <div style={{
          marginTop: 8,
          fontSize: 10,
          color: c.accent,
          fontWeight: 600,
          padding: '4px 8px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 3,
          display: 'inline-block',
        }}>
          → {action}
        </div>
      )}
    </div>
  );
}

function generateInsights({ summary, wards, quality, trends }) {
  const list = [];

  // Top ward insight
  if (wards?.[0]) {
    const w = wards[0];
    const total = wards.reduce((s, x) => s + x.count, 0);
    const share = Math.round((w.count / total) * 100);
    list.push({
      severity: w.count > 30 ? 'critical' : 'warn',
      icon: '📍',
      title: `${w.ward} is the hot zone`,
      body: `Accounts for ${w.count} cases (${share}% of all violations). Estimated penalty exposure: ₹${(w.revenue || 0).toFixed(1)} Cr.`,
      action: w.count > 30 ? 'Deploy 2 additional officers' : 'Increase ward inspection frequency',
    });
  }

  // Resolution rate quality
  if (quality?.resolutionRate !== undefined) {
    if (quality.resolutionRate < 30) {
      list.push({
        severity: 'critical',
        icon: '⚠️',
        title: 'Resolution rate is below target',
        body: `Only ${quality.resolutionRate}% of cases reach RESOLVED status. The 50%+ benchmark for healthy enforcement is being missed by a wide margin.`,
        action: 'Audit unresolved-case backlog',
      });
    } else if (quality.resolutionRate >= 60) {
      list.push({
        severity: 'success',
        icon: '✅',
        title: 'Strong resolution performance',
        body: `${quality.resolutionRate}% of cases reach closure — above the 50% benchmark. Officer team is executing well.`,
      });
    }
  }

  // False positive rate
  if (quality?.falsePositiveRate !== undefined && quality.falsePositiveRate > 15) {
    list.push({
      severity: 'warn',
      icon: '🎯',
      title: 'AI false-positive rate is elevated',
      body: `${quality.falsePositiveRate}% of detections are being marked as false positives by reviewers. Consider raising the AI confidence threshold.`,
      action: 'Tune model confidence threshold',
    });
  }

  // AI dossier coverage
  if (quality?.aiCoverage !== undefined && quality.aiCoverage < 40) {
    list.push({
      severity: 'info',
      icon: '🤖',
      title: 'Underused AI Case Review feature',
      body: `Only ${quality.aiCoverage}% of cases (${quality.aiReviewedCases || 0}) have an AI-generated dossier. Officers are doing extra manual work.`,
      action: 'Promote AI dossier generation to officers',
    });
  }

  // Trend direction (last vs prev period)
  if (trends?.length >= 4) {
    const recent = trends.slice(-2).reduce((s, p) => s + (p.value || p.count || 0), 0);
    const prior = trends.slice(-4, -2).reduce((s, p) => s + (p.value || p.count || 0), 0);
    if (prior > 0) {
      const change = Math.round(((recent - prior) / prior) * 100);
      if (Math.abs(change) > 15) {
        list.push({
          severity: change > 0 ? 'warn' : 'success',
          icon: change > 0 ? '📈' : '📉',
          title: change > 0 ? 'Detections are climbing fast' : 'Detections are declining',
          body: `${Math.abs(change)}% ${change > 0 ? 'increase' : 'decrease'} vs the prior period. ${change > 0 ? 'May indicate construction surge or improved AI sensitivity.' : 'May indicate enforcement deterrent effect.'}`,
        });
      }
    }
  }

  // High-confidence share
  if (quality?.highConfidenceShare !== undefined && quality.highConfidenceShare >= 70) {
    list.push({
      severity: 'success',
      icon: '🎯',
      title: 'AI is highly confident',
      body: `${quality.highConfidenceShare}% of detections are >85% confidence — the model is working well on your imagery.`,
    });
  }

  // Notice conversion
  if (summary?.total && summary?.noticeSent !== undefined) {
    const conv = (summary.noticeSent / summary.total) * 100;
    if (conv < 20 && summary.total > 50) {
      list.push({
        severity: 'warn',
        icon: '📨',
        title: 'Notice conversion rate is low',
        body: `Only ${conv.toFixed(1)}% of cases have a notice sent. There are ${summary.total - summary.noticeSent} cases stuck pre-notice.`,
        action: 'Bulk-generate notices for backlog',
      });
    }
  }

  return list.slice(0, 6); // cap at 6 cards
}
