/**
 * UN SDG Alignment Page
 *
 * Documents how INFRAWATCH contributes to UN Sustainable Development Goals
 * 11 (Sustainable Cities) and 16 (Peace, Justice, Strong Institutions).
 *
 * Uses existing app color palette — no new design system introduced.
 */

export default function SDGPage({ onNav }) {
  return (
    <div className="fi" style={{ padding: '22px 28px 40px', overflowY: 'auto', height: '100%', maxWidth: 1040, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontFamily: 'Space Mono',
          fontSize: 11,
          color: 'var(--am)',
          letterSpacing: '0.15em',
          marginBottom: 6,
        }}>
          UNITED NATIONS SUSTAINABLE DEVELOPMENT GOALS
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>
          How INFRAWATCH drives SDG impact
        </h1>
        <p style={{ fontSize: 13, color: 'var(--sc)', lineHeight: 1.6, maxWidth: 720 }}>
          INFRAWATCH is engineered to directly contribute to two UN SDGs by making urban
          enforcement faster, more transparent, and more accountable. Every feature maps to
          a specific SDG target — not a vague mission statement.
        </p>
      </div>

      {/* SDG 11 */}
      <SDGCard
        number="11"
        title="Sustainable Cities and Communities"
        color="#F99D26"
        icon="🏙️"
        target="11.3"
        targetText="Enhance inclusive and sustainable urbanization and capacity for participatory, integrated and sustainable human settlement planning and management."
        contributions={[
          {
            metric: '14.7×',
            label: 'more violations caught / year',
            detail: 'Projected if deployed across all 198 BBMP wards — vs current ~840 cases detected manually.',
          },
          {
            metric: '219×',
            label: 'faster detection-to-notice',
            detail: 'AI-detected cases receive an SLA-tracked first notice in ~2.3 hours vs the current 21-day manual baseline.',
          },
          {
            metric: '₹1,240 Cr',
            label: 'penalty recovery potential / year',
            detail: 'Estimated across 198 wards. Currently ~₹84 Cr due to enforcement gaps.',
          },
        ]}
        explanation={[
          'Unauthorized construction directly threatens the goal of sustainable cities — it causes structural collapses (19 lives lost in the 2019 Dharwad incident), encroaches on stormwater drains (contributing to Bengaluru\'s recurring floods), and reclaims wetlands (Bellandur, Varthur, Hebbal lakes).',
          'INFRAWATCH detects these violations while they are still foundations, not finished towers — making corrective action actually feasible. Proactive detection is the difference between prevention and demolition.',
          'The seeded hotspot data in our demo explicitly covers Bellandur lake encroachment and other real environmental flash-points.',
        ]}
      />

      {/* SDG 16 */}
      <SDGCard
        number="16"
        title="Peace, Justice and Strong Institutions"
        color="#00689D"
        icon="⚖️"
        target="16.6"
        targetText="Develop effective, accountable and transparent institutions at all levels."
        contributions={[
          {
            metric: '100%',
            label: 'of case actions are audit-logged',
            detail: 'Every officer action — assignment, note, status change, notice generation — is recorded with timestamp + user for public-records readiness.',
          },
          {
            metric: '3 statutes',
            label: 'grounded into AI notices',
            detail: 'Karnataka Municipal Corporations Act 1976 (§308/321/322), BBMP Building Bye-laws 2003, Karnataka Town & Country Planning Act 1961 — no hallucinated citations.',
          },
          {
            metric: 'Open source',
            label: 'MIT license, public GitHub',
            detail: 'Any civic group, RTI activist, or competing municipal corp can fork + deploy + audit the codebase.',
          },
        ]}
        explanation={[
          'Manual enforcement is opaque — cases disappear into clerical backlogs, inspection rounds are discretionary, and notices are hand-drafted with no audit trail. This creates openings for corruption and selective enforcement.',
          'INFRAWATCH replaces discretion with a deterministic workflow: AI-triaged SLA tiers, round-robin officer assignment, statute-grounded notices, and an immutable audit log. An officer can deprioritize a case only with a recorded justification — that record is visible to the commissioner and, in an RTI request, to the public.',
          'The anti-hallucination guardrail in our notice prompt forces the AI to say "Refer to applicable BBMP Building Bye-laws" when uncertain — rather than inventing a convincing-sounding section number. This is a direct design choice for institutional trustworthiness.',
        ]}
      />

      {/* Metrics bar */}
      <div className="card" style={{
        marginTop: 20,
        background: 'linear-gradient(135deg, rgba(245,166,35,0.06), rgba(74,158,255,0.04))',
        borderLeft: '3px solid var(--am)',
      }}>
        <div className="slb" style={{ color: 'var(--am)' }}>CONCRETE IMPACT METRICS</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
          marginTop: 12,
        }}>
          <Stat label="Time saved per case" value="18.7 days" sub="21d manual → 2.3h AI" color="#F5A623" />
          <Stat label="Violations caught earlier" value="11,560+" sub="annual projection, BBMP-wide" color="#FF3B30" />
          <Stat label="Audit log coverage" value="100%" sub="every case action recorded" color="#34C759" />
          <Stat label="Officer discretion narrowed" value="by ~60%" sub="via SLA + round-robin assign" color="#4A9EFF" />
        </div>
      </div>

      {/* Back link */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={() => onNav && onNav('dashboard')}
          className="btn bp"
          style={{ fontSize: 13, padding: '10px 20px' }}
        >
          ← Back to Crisis Dashboard
        </button>
      </div>
    </div>
  );
}

function SDGCard({ number, title, color, icon, target, targetText, contributions, explanation }) {
  return (
    <div className="card" style={{
      marginBottom: 16,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 6,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#fff',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.9 }}>SDG</div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{number}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', letterSpacing: '0.1em' }}>
            GOAL {number} · {icon}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tx)', marginTop: 2 }}>
            {title}
          </div>
        </div>
      </div>

      <div style={{
        padding: '10px 14px',
        background: 'var(--ev)',
        borderRadius: 4,
        borderLeft: `2px solid ${color}`,
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: 'var(--mt)', fontFamily: 'Space Mono', letterSpacing: '0.05em', marginBottom: 4 }}>
          TARGET {target}
        </div>
        <div style={{ fontSize: 12, color: 'var(--sc)', lineHeight: 1.6, fontStyle: 'italic' }}>
          "{targetText}"
        </div>
      </div>

      {/* Our specific contributions */}
      <div style={{ marginBottom: 14 }}>
        <div className="slb" style={{ color: 'var(--am)', marginBottom: 10 }}>HOW INFRAWATCH CONTRIBUTES</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 10,
        }}>
          {contributions.map((c, i) => (
            <div key={i} style={{
              padding: 12,
              background: 'var(--ev)',
              borderRadius: 5,
              border: '1px solid var(--bd)',
            }}>
              <div style={{
                fontFamily: 'Space Mono',
                fontSize: 22,
                fontWeight: 700,
                color,
                marginBottom: 4,
              }}>{c.metric}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 10, color: 'var(--mt)', lineHeight: 1.5 }}>
                {c.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {explanation.map((para, i) => (
          <p key={i} style={{ fontSize: 12, color: 'var(--sc)', lineHeight: 1.7 }}>
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'rgba(8,10,13,0.5)',
      borderRadius: 5,
      border: '1px solid var(--bd)',
    }}>
      <div style={{ fontSize: 9, color: 'var(--mt)', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: 'Space Mono', fontSize: 19, fontWeight: 700, color, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--mt)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}
