import { useEffect, useState } from 'react';

const ACTION_LABELS = {
  confirm_violation: 'Confirm Violation',
  needs_field_inspection: 'Needs Field Inspection',
  generate_legal_notice: 'Generate Legal Notice',
  mark_false_positive: 'Mark False Positive',
};

const APPROVAL_LABELS = {
  pending: 'Pending Officer Decision',
  approved: 'AI Recommendation Applied',
  overridden: 'Officer Override Applied',
};

const RISK_COLORS = {
  LOW: 'var(--tl)',
  MEDIUM: 'var(--bl)',
  HIGH: 'var(--am)',
  CRITICAL: 'var(--rd)',
};

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AICaseReviewCard({ review, history = [], isLoading, error, onGenerate, onDecision }) {
  const [overrideAction, setOverrideAction] = useState(review?.recommendation_code || 'needs_field_inspection');
  const [overrideNotes, setOverrideNotes] = useState('');

  useEffect(() => {
    setOverrideAction(review?.recommendation_code || 'needs_field_inspection');
    setOverrideNotes(review?.override_notes || '');
  }, [review?.id, review?.recommendation_code, review?.override_notes]);

  const approvalStatus = review?.approval_status || 'pending';
  const recommendationLabel = ACTION_LABELS[review?.recommendation_code] || 'Needs Field Inspection';
  const finalActionLabel = ACTION_LABELS[review?.final_action] || ACTION_LABELS[overrideAction];
  const riskColor = RISK_COLORS[review?.risk_level] || 'var(--am)';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div>
          <div className="slb" style={{ marginBottom: 4 }}>AI CASE REVIEW DOSSIER</div>
          <div style={{ fontSize: 11, color: 'var(--mt)' }}>
            INFRAWATCH Copilot turns case records into a grounded enforcement recommendation for officer review.
          </div>
        </div>
        <button className="btn bp" style={{ fontSize: 11, justifyContent: 'center', whiteSpace: 'nowrap' }} onClick={onGenerate} disabled={isLoading}>
          {isLoading ? 'Generating...' : review ? 'Regenerate Dossier' : 'Generate Dossier'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', marginBottom: 12, border: '1px solid var(--rd)', background: 'var(--rdd)', borderRadius: 4, fontSize: 11, color: 'var(--rd)' }}>
          {error}
        </div>
      )}

      {!review && !isLoading && (
        <div style={{ fontSize: 11, color: 'var(--mt)', lineHeight: 1.5 }}>
          No AI dossier has been generated for this case yet. Generate one to get an executive summary, legal basis, permit conflict analysis, evidence gaps, and a recommended next action.
        </div>
      )}

      {review && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
            <div style={{ padding: '8px 10px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 4 }}>Recommendation</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--am)' }}>{recommendationLabel}</div>
            </div>
            <div style={{ padding: '8px 10px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 4 }}>AI Confidence</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: Number(review.confidence) >= 85 ? 'var(--tl)' : 'var(--am)' }}>
                {review.confidence}%
              </div>
            </div>
            <div style={{ padding: '8px 10px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 4 }}>Risk Level</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: riskColor }}>{review.risk_level}</div>
            </div>
            <div style={{ padding: '8px 10px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 4 }}>Decision State</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: approvalStatus === 'pending' ? 'var(--bl)' : approvalStatus === 'approved' ? 'var(--tl)' : 'var(--am)' }}>
                {APPROVAL_LABELS[approvalStatus]}
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>EXECUTIVE SUMMARY</div>
            <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.55 }}>{review.executive_summary}</div>
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>WHY THE CASE WAS FLAGGED</div>
            <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.55 }}>{review.why_flagged}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6 }}>LIKELY LEGAL BASIS</div>
              {review.legal_basis?.length ? review.legal_basis.map((item, index) => (
                <div key={`${item}-${index}`} style={{ padding: '6px 8px', marginBottom: 6, background: 'rgba(74,84,104,.16)', borderRadius: 4, fontSize: 11, color: 'var(--sc)' }}>
                  {item}
                </div>
              )) : (
                <div style={{ fontSize: 11, color: 'var(--mt)' }}>No legal basis bullets returned.</div>
              )}
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6 }}>PERMIT CONFLICT ANALYSIS</div>
              <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.55 }}>{review.permit_analysis}</div>
            </div>
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4, marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>WHY THIS ACTION IS RECOMMENDED</div>
            <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.55 }}>{review.action_reason}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6 }}>EVIDENCE GAPS</div>
              {review.evidence_gaps?.length ? review.evidence_gaps.map((item, index) => (
                <div key={`${item}-${index}`} style={{ padding: '6px 8px', marginBottom: 6, background: 'rgba(255,69,69,.08)', borderRadius: 4, fontSize: 11, color: 'var(--sc)' }}>
                  {item}
                </div>
              )) : (
                <div style={{ fontSize: 11, color: 'var(--mt)' }}>No critical evidence gaps identified.</div>
              )}
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6 }}>FIELD INSPECTION CHECKLIST</div>
              {review.inspection_checklist?.length ? review.inspection_checklist.map((item, index) => (
                <div key={`${item}-${index}`} style={{ padding: '6px 8px', marginBottom: 6, background: 'rgba(0,201,167,.08)', borderRadius: 4, fontSize: 11, color: 'var(--sc)' }}>
                  {item}
                </div>
              )) : (
                <div style={{ fontSize: 11, color: 'var(--mt)' }}>No inspection checklist returned.</div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>NOTICE STRATEGY</div>
              <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.55 }}>{review.notice_strategy}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>COMMISSIONER BRIEF</div>
              <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.55 }}>{review.commissioner_brief}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', marginBottom: 10 }}>
            <span>{review.provider?.toUpperCase?.() || 'AI'} | {review.model || 'default model'}</span>
            <span>{formatDateTime(review.created_at)}</span>
          </div>

          {approvalStatus === 'pending' ? (
            <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6 }}>OFFICER DECISION</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="btn bp" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onDecision(review.id, { mode: 'approve' })} disabled={isLoading}>
                  Apply AI Recommendation
                </button>
                <button className="btn bs" style={{ flex: 1, justifyContent: 'center' }} onClick={onGenerate} disabled={isLoading}>
                  Refresh Analysis
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={overrideAction} onChange={(event) => setOverrideAction(event.target.value)} style={{ flex: '0 0 45%' }}>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button
                  className="btn bd2"
                  style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                  onClick={() => onDecision(review.id, { mode: 'override', action: overrideAction, notes: overrideNotes })}
                  disabled={isLoading}
                >
                  Override and Apply
                </button>
              </div>
              <textarea
                rows={2}
                value={overrideNotes}
                onChange={(event) => setOverrideNotes(event.target.value)}
                placeholder="Optional override note for audit trail..."
                style={{ resize: 'vertical' }}
              />
            </div>
          ) : (
            <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>FINAL DECISION</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: approvalStatus === 'approved' ? 'var(--tl)' : 'var(--am)', marginBottom: 6 }}>
                {approvalStatus === 'approved' ? recommendationLabel : finalActionLabel}
              </div>
              <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 4 }}>
                {approvalStatus === 'approved'
                  ? `Approved by ${review.decided_by_name || 'Officer'} on ${formatDateTime(review.decided_at)}`
                  : `Overridden by ${review.decided_by_name || 'Officer'} on ${formatDateTime(review.decided_at)}`}
              </div>
              {review.override_notes && (
                <div style={{ fontSize: 11, color: 'var(--sc)', lineHeight: 1.5 }}>
                  Override note: {review.override_notes}
                </div>
              )}
            </div>
          )}

          {history.length > 1 && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--bd)', paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6 }}>RECENT DOSSIER HISTORY</div>
              {history.slice(0, 3).map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--bd)', fontSize: 11 }}>
                  <span style={{ color: 'var(--sc)' }}>
                    {ACTION_LABELS[item.recommendation_code] || item.recommendation_code} | {item.risk_level}
                  </span>
                  <span style={{ fontFamily: 'Space Mono', color: 'var(--mt)' }}>{formatDateTime(item.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
