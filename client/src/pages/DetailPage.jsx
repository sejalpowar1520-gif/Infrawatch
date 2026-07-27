import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { noticesApi, officersApi, violationsApi } from '../api/client';
import Badge from '../components/ui/Badge';
import AINoticeCard from '../components/ui/AINoticeCard';
import NoticeComparison from '../components/ui/NoticeComparison';
import AICaseReviewCard from '../components/ui/AICaseReviewCard';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
}

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

function shiftDate(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

function getActivityTone(type) {
  if (type === 'success') return { color: 'var(--tl)', border: 'var(--tl)' };
  if (type === 'warn') return { color: 'var(--am)', border: 'var(--am)' };
  if (type === 'error') return { color: 'var(--rd)', border: 'var(--rd)' };
  return { color: 'var(--bl)', border: 'var(--bd)' };
}

export default function DetailPage({ violationId, onBack, onNav }) {
  const toast = useToast();
  const { hasRole } = useAuth();
  const [violation, setViolation] = useState(null);
  const [permitCheck, setPermitCheck] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [notes, setNotes] = useState([]);
  const [notices, setNotices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [related, setRelated] = useState([]);
  const [aiReview, setAIReview] = useState(null);
  const [aiReviews, setAIReviews] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [note, setNote] = useState('');
  const [showNotice, setShowNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiNotice, setAINotice] = useState(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const canManageCase = hasRole('inspector', 'commissioner', 'admin');

  async function loadDetail() {
    if (!violationId) return;
    setLoading(true);

    try {
      const requests = [violationsApi.get(violationId)];
      if (canManageCase) {
        requests.push(officersApi.list());
      }

      const [detail, officerRes] = await Promise.all(requests);

      setViolation(detail.violation);
      setPermitCheck(detail.permitCheck || null);
      setFeedback(detail.feedback || []);
      setNotes(detail.notes || []);
      setNotices(detail.notices || []);
      setActivity(detail.activity || []);
      setRelated(detail.related || []);
      setAIReview(detail.aiReview || null);
      setAIReviews(detail.aiReviews || []);
      setOfficers(officerRes?.officers || []);
    } catch (err) {
      toast('Failed to load case details: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [violationId, canManageCase]);

  if (loading || !violation) {
    return <div style={{ padding: 40, color: 'var(--mt)' }}>Loading...</div>;
  }

  const chronologicalNotes = [...notes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const chronologicalNotices = [...notices].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const latestNotice = notices[0] || null;
  const latestFeedback = feedback[0] || null;
  const beforePreviewDate = shiftDate(violation.detected_date, -21);
  const afterPreviewDate = new Date(violation.detected_date);

  const priorityScore = Math.min(
    99,
    Math.round(
      violation.confidence * 0.45 +
      Math.min(violation.area || 0, 600) * 0.06 +
      Math.min((violation.penalty || 0) * 4, 25) +
      Math.min((violation.height_delta || 0) * 6, 15)
    )
  );

  const signalRows = [
    ['Detection confidence', violation.confidence, 'var(--tl)'],
    ['Area impact', Math.min(99, Math.round((violation.area || 0) / 7)), 'var(--am)'],
    ['Height delta', Math.min(99, Math.round((violation.height_delta || 0) * 20)), 'var(--rd)'],
    ['Penalty exposure', Math.min(99, Math.round((violation.penalty || 0) * 3.2)), 'var(--bl)'],
  ];

  const timeline = [
    { label: 'Violation detected', date: violation.detected_date, done: true },
    { label: 'Case record created', date: violation.created_at, done: true },
    {
      label: violation.officer_name ? `Assigned to ${violation.officer_name}` : 'Officer assignment pending',
      date: violation.updated_at,
      done: Boolean(violation.officer_name),
    },
    {
      label: chronologicalNotes[0] ? `Inspection note added by ${chronologicalNotes[0].officer_name}` : 'Inspection note pending',
      date: chronologicalNotes[0]?.created_at,
      done: Boolean(chronologicalNotes[0]),
    },
    {
      label: chronologicalNotices[0] ? `${chronologicalNotices[0].template_name || 'Legal'} notice generated` : 'Notice generation pending',
      date: chronologicalNotices[0]?.created_at,
      done: Boolean(chronologicalNotices[0]),
    },
    {
      label: violation.status === 'RESOLVED' ? 'Case resolved' : `Current status: ${violation.status}`,
      date: violation.updated_at,
      done: true,
    },
  ];

  const draftNoticeText = `NOTICE OF ILLEGAL CONSTRUCTION
--------------------------------
Ref No.: ${violation.id}
Date: ${violation.detected_date}

To: ${violation.owner_name || 'Unknown'}
${violation.address}

Violation: ${violation.type}
Survey No: ${violation.survey_no}
Zone: ${violation.zone}
Last Approved Plan: ${violation.last_approved_year}
Unauthorized Area: ~${violation.area} sq ft
Detection Confidence: ${violation.confidence}%

Directives:
1. Stop all construction immediately
2. Submit valid permit within 7 days
3. Appear for personal hearing

Penalty up to Rs ${violation.penalty}L under BBMP Act Sec 321

Issued by: ${violation.officer_name || 'BBMP'} - BBMP ${violation.ward} Ward`;

  const noticeText = latestNotice?.content || draftNoticeText;

  const officerOptions = officers
    .filter((officer) => officer.status === 'active' || officer.id === violation.officer_id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const permitTone = permitCheck?.permitFound ? 'var(--tl)' : 'var(--rd)';
  const permitLabel = permitCheck?.permitFound ? 'PERMIT FOUND' : 'PERMIT NOT FOUND';
  const permitScoreTone = (permitCheck?.matchScore || 0) >= 60 ? 'var(--tl)' : (permitCheck?.matchScore || 0) >= 35 ? 'var(--am)' : 'var(--rd)';
  const feedbackLabels = {
    confirmed: 'Confirmed violation',
    false_positive: 'Marked false positive',
    needs_field_inspection: 'Needs field inspection',
  };

  const downloadNotice = () => {
    const blob = new Blob([noticeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${violation.id.replace('#', '')}-notice.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast('Notice downloaded', 'success');
  };

  const handleSaveNote = async () => {
    if (!note.trim()) return;

    try {
      await violationsApi.addNote(violation.id, note.trim());
      setNote('');
      await loadDetail();
      toast('Note saved', 'success');
    } catch (err) {
      toast('Failed to save note: ' + err.message, 'error');
    }
  };

  const handleGenerateNotice = async () => {
    try {
      await noticesApi.generate(violation.id, 1);
      await loadDetail();
      setShowNotice(true);
      toast('Legal notice generated for ' + violation.id, 'success');
    } catch (err) {
      toast('Failed to generate notice: ' + err.message, 'error');
    }
  };

  const handleGenerateAINotice = async () => {
    setAIError(null);
    setAILoading(true);
    try {
      const response = await noticesApi.generateAI(violation.id);
      setAINotice({
        id: response.notice.id,
        content: response.content,
        created_at: response.notice.created_at || new Date().toISOString(),
        template_name: 'AI Generated',
        provider: response.provider || response.notice.ai_provider,
        model: response.model || response.notice.ai_model,
      });
      toast('AI notice generated successfully', 'success');
    } catch (err) {
      const errorMsg = err.message || 'Failed to generate AI notice';
      setAIError(errorMsg);
      toast(errorMsg, 'error');
      console.error('AI Notice error:', err);
    } finally {
      setAILoading(false);
    }
  };

  const handleCompareNotices = async () => {
    setComparisonLoading(true);
    setAIError(null);
    try {
      const response = await noticesApi.compare(violation.id);
      setComparison(response);
      setShowComparison(true);
      toast('Comparison ready', 'success');
    } catch (err) {
      setAIError(err.message || 'Failed to compare notices');
      toast('Failed to compare notices: ' + err.message, 'error');
      console.error('Comparison error:', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleGenerateAIReview = async () => {
    setReviewError(null);
    setReviewLoading(true);

    try {
      const response = await violationsApi.generateAIReview(violation.id);
      setAIReview(response.review || null);
      await loadDetail();
      toast('AI case dossier generated', 'success');
    } catch (err) {
      const message = err.message || 'Failed to generate AI case dossier';
      setReviewError(message);
      toast(message, 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAIDecision = async (reviewId, payload) => {
    setReviewError(null);
    setReviewLoading(true);

    try {
      const response = await violationsApi.decideAIReview(violation.id, reviewId, payload);
      setAIReview(response.review || null);
      await loadDetail();
      toast(payload.mode === 'approve' ? 'AI recommendation applied' : 'AI recommendation overridden', 'success');
    } catch (err) {
      const message = err.message || 'Failed to apply AI decision';
      setReviewError(message);
      toast(message, 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await violationsApi.update(violation.id, { status });
      await loadDetail();
      toast(`Status changed to ${status}`, 'info');
    } catch (err) {
      toast('Failed to change status: ' + err.message, 'error');
    }
  };

  const handleAssignOfficer = async (officerId) => {
    try {
      await violationsApi.update(violation.id, { officer_id: officerId ? Number(officerId) : null });
      await loadDetail();
      toast(officerId ? 'Officer reassigned' : 'Officer cleared', 'success');
    } catch (err) {
      toast('Failed to update assignment: ' + err.message, 'error');
    }
  };

  const handleFeedback = async (value) => {
    try {
      await violationsApi.addFeedback(violation.id, value);
      await loadDetail();
      toast(feedbackLabels[value], 'success');
    } catch (err) {
      toast('Failed to save feedback: ' + err.message, 'error');
    }
  };

  const steps = ['Detected', 'Reviewed', 'Notice Sent', 'Resolved'];
  const currentStep = { NEW: 0, 'UNDER REVIEW': 1, 'NOTICE SENT': 2, RESOLVED: 3, DISMISSED: 1 }[violation.status] ?? 0;

  return (
    <div className="fi" style={{ padding: '18px 22px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--sc)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ← Back to Violations
        </button>
        {onNav && violation && (
          <button onClick={() => onNav('live-detection', violation)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--bd)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px', borderRadius: 3, transition: 'all 150ms' }} onMouseEnter={(e) => { e.target.style.background = 'var(--ev)'; e.target.style.color = 'var(--am)'; }} onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--bd)'; }}>
            🛰 View on Live Detection
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'Space Mono', fontSize: 20, color: 'var(--am)', fontWeight: 700 }}>{violation.id}</h1>
        <Badge status={violation.status} />
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="slb">SATELLITE PREVIEW</div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 10 }}>
              Illustrative demo placeholder. Source imagery is not attached in the seeded dataset.
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--mt)', textAlign: 'center', marginBottom: 5, fontFamily: 'Space Mono' }}>
                  BEFORE - {formatDate(beforePreviewDate)}
                </div>
                <div style={{ height: 110, background: 'var(--ev)', borderRadius: 4, border: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <div style={{ width: 55, height: 25, background: 'rgba(74,84,104,.3)', borderRadius: 2 }} />
                  <div style={{ fontSize: 9, color: 'var(--mt)', fontFamily: 'Space Mono' }}>REFERENCE VIEW</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--rd)', textAlign: 'center', marginBottom: 5, fontFamily: 'Space Mono' }}>
                  AFTER - {formatDate(afterPreviewDate)}
                </div>
                <div style={{ height: 110, background: 'var(--rdd)', borderRadius: 4, border: '1px solid var(--rd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <div style={{ width: 55, height: 38, background: 'rgba(255,69,69,.2)', borderRadius: 2 }} />
                  <div style={{ fontSize: 9, color: 'var(--rd)', fontFamily: 'Space Mono' }}>CHANGE FLAGGED</div>
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--ev)', borderRadius: 4, padding: '7px 12px', fontSize: 11, color: 'var(--am)', fontFamily: 'Space Mono', textAlign: 'center' }}>
              Case record shows ~{violation.area} sq ft added and +{violation.height_delta}m height delta
            </div>
          </div>

          {canManageCase && (
            <AICaseReviewCard
              review={aiReview}
              history={aiReviews}
              isLoading={reviewLoading}
              error={reviewError}
              onGenerate={handleGenerateAIReview}
              onDecision={handleAIDecision}
            />
          )}

          {/* Crisis Response SLA card — calculates response status from violation timestamps */}
          {(() => {
            const detectedAt = violation.created_at ? new Date(violation.created_at + (violation.created_at.endsWith('Z') ? '' : 'Z')) : null;
            const ageHours = detectedAt ? (Date.now() - detectedAt.getTime()) / 3600000 : 0;
            const slaHours = (violation.confidence || 0) >= 90 ? 4 : (violation.confidence || 0) >= 80 ? 12 : 24;
            const slaPercent = Math.min(100, (ageHours / slaHours) * 100);
            const slaStatus = ageHours > slaHours ? 'BREACHED' : ageHours > slaHours * 0.8 ? 'AT RISK' : 'ON TIME';
            const slaColor = slaStatus === 'BREACHED' ? '#FF3B30' : slaStatus === 'AT RISK' ? '#FF9500' : '#34C759';
            const isResolved = ['RESOLVED', 'DISMISSED', 'NOTICE SENT'].includes(violation.status);
            const elapsedLabel = ageHours < 1 ? `${Math.round(ageHours * 60)}m` : ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${Math.round(ageHours / 24)}d`;

            return (
              <div className="card" style={{ borderLeft: `3px solid ${isResolved ? '#34C759' : slaColor}` }}>
                <div className="slb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>RAPID RESPONSE STATUS</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: isResolved ? '#34C759' : slaColor,
                    background: `${isResolved ? '#34C759' : slaColor}22`,
                    padding: '2px 8px',
                    borderRadius: 3,
                    letterSpacing: '0.05em',
                  }}>
                    {isResolved ? 'CASE CLOSED' : slaStatus}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10, marginBottom: 10 }}>
                  <div style={{ padding: '8px 10px', background: 'var(--ev)', borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 3, letterSpacing: '0.05em' }}>ELAPSED</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 16, fontWeight: 700, color: 'var(--am)' }}>{elapsedLabel}</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--ev)', borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 3, letterSpacing: '0.05em' }}>SLA TARGET</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 16, fontWeight: 700, color: 'var(--sc)' }}>{slaHours}h</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--ev)', borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 3, letterSpacing: '0.05em' }}>OFFICER</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 11, fontWeight: 600, color: violation.officer_name ? 'var(--tl)' : '#FF9500', marginTop: 3 }}>
                      {violation.officer_name || 'UNASSIGNED'}
                    </div>
                  </div>
                </div>

                <div style={{ height: 6, background: 'var(--ev)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    width: `${isResolved ? 100 : slaPercent}%`,
                    height: '100%',
                    background: isResolved ? '#34C759' : slaColor,
                    transition: 'width .8s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--mt)' }}>
                  {isResolved
                    ? 'Case has been resolved or moved past active enforcement.'
                    : ageHours > slaHours
                      ? `SLA breached by ${(ageHours - slaHours).toFixed(1)}h — escalate to commissioner immediately.`
                      : `${(slaHours - ageHours).toFixed(1)}h remaining before SLA breach. Confidence-tier ${violation.confidence}%.`}
                </div>
              </div>
            );
          })()}

          <div className="card">
            <div className="slb">CASE TIMELINE</div>
            {timeline.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: 11 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 11, background: item.done ? 'var(--tl)' : 'var(--ev)', border: item.done ? 'none' : '1px solid var(--bd)' }} />
                  {index < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--bd)', minHeight: 16 }} />}
                </div>
                <div style={{ paddingBottom: index < timeline.length - 1 ? 12 : 0, paddingTop: 8 }}>
                  <div style={{ fontSize: 12, color: item.done ? 'var(--tx)' : 'var(--mt)', fontWeight: item.done ? 500 : 400 }}>{item.label}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', marginTop: 1 }}>{formatDateTime(item.date)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="slb">CASE SIGNALS</div>
            {signalRows.map(([label, score, color]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--sc)' }}>{label}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 11, color }}>{score}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--ev)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: color, borderRadius: 2, width: `${score}%`, transition: 'width .7s .1s ease' }} />
                </div>
              </div>
            ))}
            <div style={{ padding: '7px 11px', background: 'var(--ev)', borderRadius: 4, border: '1px solid var(--bd)', fontSize: 12, color: 'var(--sc)', marginTop: 4 }}>
              Registry record shows last approved plan year: {violation.last_approved_year || '-'}.
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--mt)' }}>Unauthorized area</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 13, color: 'var(--am)', fontWeight: 700 }}>~{violation.area} sq ft</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--mt)' }}>Height delta</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 13, color: 'var(--rd)', fontWeight: 700 }}>+{violation.height_delta}m</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="slb">OFFICER NOTES</div>
            {notes.map((entry) => (
              <div key={entry.id} style={{ background: 'var(--ev)', borderRadius: 4, padding: '8px 11px', marginBottom: 8, fontSize: 11, color: 'var(--sc)', borderLeft: '2px solid var(--am)' }}>
                {entry.text}
                <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--mt)', marginTop: 3 }}>
                  {entry.officer_name} | {formatDateTime(entry.created_at)}
                </div>
              </div>
            ))}
            {notes.length === 0 && <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 10 }}>No officer notes yet.</div>}
            <textarea rows={3} placeholder="Add inspection note, owner response, or field observation..." value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 7, resize: 'vertical' }} />
            <button className="btn bs" style={{ fontSize: 12 }} onClick={handleSaveNote}>Save Note</button>
          </div>

          <div className="card">
            <div className="slb">AUDIT LOG</div>
            {activity.map((entry) => {
              const tone = getActivityTone(entry.type);
              return (
                <div key={entry.id} style={{ padding: '9px 10px', marginBottom: 8, border: `1px solid ${tone.border}`, borderRadius: 4, background: 'var(--ev)' }}>
                  <div style={{ fontSize: 11, color: 'var(--sc)' }}>{entry.message}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 5, fontFamily: 'Space Mono', fontSize: 9, color: tone.color }}>
                    <span>{entry.user_name || 'System'}</span>
                    <span>{formatDateTime(entry.created_at)}</span>
                  </div>
                </div>
              );
            })}
            {activity.length === 0 && <div style={{ fontSize: 11, color: 'var(--mt)' }}>No activity logged for this case yet.</div>}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="slb">PROPERTY INFORMATION</div>
            {[
              ['Owner', violation.owner_name],
              ['Survey No.', violation.survey_no],
              ['Zone', violation.zone],
              ['Last Approved', String(violation.last_approved_year || '-')],
              ['Ward', violation.ward],
              ['Assigned Officer', violation.officer_name || 'Unassigned'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 11, color: 'var(--mt)' }}>{label}</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11, textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>

          {permitCheck && (
            <div className="card">
              <div className="slb">PERMIT VERIFICATION</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, background: 'var(--ev)', border: `1px solid ${permitTone}`, color: permitTone, fontFamily: 'Space Mono', fontSize: 11, marginBottom: 12 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: permitTone, display: 'inline-block' }} />
                {permitLabel}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 10 }}>
                <div style={{ padding: '8px 9px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 4 }}>Registry Match Score</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 16, color: permitScoreTone }}>{permitCheck.matchScore}/100</div>
                </div>
                <div style={{ padding: '8px 9px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 4 }}>Registry Status</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 16, color: permitCheck.registryStatus === 'LIVE' ? 'var(--tl)' : 'var(--am)' }}>
                    {permitCheck.registryStatus}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 11, color: 'var(--mt)' }}>Last approved year</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{permitCheck.lastApprovedYear || 'Not on file'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 11, color: 'var(--mt)' }}>Registry source</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11, textAlign: 'right' }}>{permitCheck.registrySource}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 11, color: 'var(--mt)' }}>Last sync</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11, textAlign: 'right' }}>{permitCheck.registryLastSync}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 11, color: 'var(--mt)' }}>Registry records</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{permitCheck.registryRecords || '-'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
                <span style={{ fontSize: 11, color: 'var(--mt)' }}>Verified by</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11, textAlign: 'right' }}>{permitCheck.verifiedBy}</span>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 5 }}>MISMATCH REASON</div>
                <div style={{ padding: '9px 10px', background: 'var(--ev)', borderRadius: 4, border: '1px solid var(--bd)', fontSize: 11, color: 'var(--sc)', lineHeight: 1.5 }}>
                  {permitCheck.mismatchReason}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="slb">AI REVIEW FEEDBACK</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ fontSize: 11, color: 'var(--mt)' }}>Latest reviewer outcome</span>
              <span style={{ fontFamily: 'Space Mono', fontSize: 11 }}>
                {latestFeedback ? feedbackLabels[latestFeedback.feedback] : 'No review yet'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ fontSize: 11, color: 'var(--mt)' }}>Reviewed by</span>
              <span style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{latestFeedback?.user_name || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 11, color: 'var(--mt)' }}>Reviewed at</span>
              <span style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{formatDateTime(latestFeedback?.created_at)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 10 }}>
              Reviewer decisions feed back into detection quality metrics for the command center.
            </div>
          </div>

          <div className="card">
            <div className="slb">CASE STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
              {steps.map((step, index) => (
                <div key={step} style={{ display: 'contents' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', margin: '0 auto 3px', background: index < currentStep ? 'var(--am)' : index === currentStep ? 'var(--amd)' : 'var(--ev)', border: index <= currentStep ? '2px solid var(--am)' : '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: index < currentStep ? '#000' : 'var(--am)', fontSize: 9, fontFamily: 'Space Mono' }}>
                      {index < currentStep ? 'OK' : index + 1}
                    </div>
                    <div style={{ fontSize: 9, color: index <= currentStep ? 'var(--am)' : 'var(--mt)' }}>{step}</div>
                  </div>
                  {index < steps.length - 1 && <div style={{ height: 1, flex: '0 0 6px', background: index < currentStep ? 'var(--am)' : 'var(--bd)' }} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--mt)' }}>
              <span>Last updated</span>
              <span style={{ fontFamily: 'Space Mono', color: 'var(--sc)' }}>{formatDateTime(violation.updated_at)}</span>
            </div>
          </div>

          {canManageCase && (
            <div className="card">
              <div className="slb">ASSIGNED OFFICER</div>
              <select value={violation.officer_id ?? ''} onChange={(e) => handleAssignOfficer(e.target.value)}>
                <option value="">Unassigned</option>
                {officerOptions.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 8 }}>
                Route the case owner before field notes or notice action to keep the workflow traceable.
              </div>
            </div>
          )}

          <div className="card">
            <div className="slb">PRIORITY SCORE</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>Priority</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 24, fontWeight: 700, color: priorityScore > 85 ? 'var(--rd)' : 'var(--am)' }}>{priorityScore}/100</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 4 }}>Recovery Potential</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 24, fontWeight: 700, color: 'var(--tl)' }}>Rs {violation.penalty}L</div>
              </div>
            </div>
            <div style={{ height: 5, background: 'var(--ev)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${priorityScore}%`, height: '100%', background: priorityScore > 85 ? 'var(--rd)' : 'var(--am)', transition: 'width .8s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 8 }}>
              Derived from confidence, area impact, height delta, and penalty exposure in the case record.
            </div>
          </div>

          {canManageCase && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div className="slb">ACTIONS</div>
              <button className="btn bp" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleFeedback('confirmed')}>
                Confirm Violation
              </button>
              <button className="btn bs" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleFeedback('needs_field_inspection')}>
                Needs Field Inspection
              </button>
              {violation.status !== 'NOTICE SENT' && violation.status !== 'RESOLVED' && violation.status !== 'DISMISSED' && (
                <button className="btn bp" style={{ width: '100%', justifyContent: 'center' }} onClick={handleGenerateNotice}>
                  Generate Legal Notice
                </button>
              )}
              {violation.status !== 'RESOLVED' && violation.status !== 'DISMISSED' && (
                <button className="btn bs" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleStatusChange('RESOLVED')}>
                  Mark Resolved
                </button>
              )}
              {violation.status === 'RESOLVED' && (
                <button className="btn bs" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleStatusChange('UNDER REVIEW')}>
                  Reopen for Review
                </button>
              )}
              <button className="btn bd2" style={{ fontSize: 12, justifyContent: 'center' }} onClick={() => handleFeedback('false_positive')}>
                Mark False Positive
              </button>
            </div>
          )}

          <div className="card">
            <div className="slb">FEEDBACK HISTORY</div>
            {feedback.map((entry) => (
              <div key={entry.id} style={{ padding: '9px 10px', marginBottom: 8, border: '1px solid var(--bd)', borderRadius: 4, background: 'var(--ev)' }}>
                <div style={{ fontSize: 11, color: 'var(--sc)' }}>{feedbackLabels[entry.feedback]}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 5, fontFamily: 'Space Mono', fontSize: 9, color: 'var(--mt)' }}>
                  <span>{entry.user_name || 'System'}</span>
                  <span>{formatDateTime(entry.created_at)}</span>
                </div>
              </div>
            ))}
            {feedback.length === 0 && <div style={{ fontSize: 11, color: 'var(--mt)' }}>No reviewer feedback recorded for this case yet.</div>}
          </div>

          {canManageCase && (
            <>
              <AINoticeCard
                notice={aiNotice}
                isLoading={aiLoading}
                error={aiError}
                onGenerate={handleGenerateAINotice}
                onClose={() => setAINotice(null)}
              />

              {aiNotice && (
                <div className="card">
                  <button
                    className="btn bp"
                    style={{ width: '100%', fontSize: 11, justifyContent: 'center' }}
                    onClick={handleCompareNotices}
                    disabled={comparisonLoading}
                  >
                    {comparisonLoading ? 'Comparing...' : '🔄 Compare with Template'}
                  </button>
                </div>
              )}

              {showComparison && (
                <NoticeComparison
                  comparison={comparison}
                  isLoading={comparisonLoading}
                  error={aiError}
                  onClose={() => setShowComparison(false)}
                />
              )}
            </>
          )}

          <div className="card">
            <div className="slb">NOTICE HISTORY</div>
            {notices.map((entry) => (
              <div key={entry.id} style={{ padding: '9px 10px', marginBottom: 8, border: '1px solid var(--bd)', borderRadius: 4, background: 'var(--ev)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--sc)' }}>{entry.template_name || `Template ${entry.template_id}`}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 9, color: 'var(--mt)' }}>{formatDateTime(entry.created_at)}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--mt)' }}>Generated by {entry.generated_by_name || 'System'}</div>
              </div>
            ))}
            {notices.length === 0 && <div style={{ fontSize: 11, color: 'var(--mt)' }}>No legal notice has been generated yet.</div>}
          </div>

          <div className="card">
            <div className="slb">RELATED CASES IN WARD</div>
            {related.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--bd)' }}>
                <div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--am)' }}>{item.id}</div>
                  <div style={{ fontSize: 11, color: 'var(--sc)' }}>{item.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge status={item.status} />
                  <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'var(--mt)', marginTop: 4 }}>Rs {item.penalty}L</div>
                </div>
              </div>
            ))}
            {related.length === 0 && <div style={{ fontSize: 11, color: 'var(--mt)' }}>No other active cases in this ward.</div>}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={() => setShowNotice(!showNotice)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx)', fontSize: 13, fontWeight: 500 }}>
              {latestNotice ? 'Latest Legal Notice' : 'Legal Notice Draft'}
              {showNotice ? '[-]' : '[+]'}
            </button>
            {showNotice && (
              <div>
                <div style={{ padding: '0 16px 10px', fontSize: 11, color: 'var(--mt)' }}>
                  {latestNotice
                    ? `Generated on ${formatDateTime(latestNotice.created_at)} using ${latestNotice.template_name || `Template ${latestNotice.template_id}`}.`
                    : 'Previewing the current draft that will be used when the first notice is generated.'}
                </div>
                <div style={{ padding: '12px 16px', fontFamily: 'Space Mono', fontSize: 10, color: 'var(--sc)', lineHeight: 1.8, background: 'rgba(8,10,13,.6)', maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap', borderTop: '1px solid var(--bd)' }}>
                  {noticeText}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 7 }}>
                  <button className="btn bp" style={{ fontSize: 11 }} onClick={downloadNotice}>Download</button>
                  <button className="btn bs" style={{ fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(noticeText); toast('Copied', 'info'); }}>Copy</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
