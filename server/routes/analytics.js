import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { buildWardScope } from '../middleware/access.js';

const router = Router();
router.use(authenticate);

const TYPE_KEYS = {
  'Unauthorized Floor Addition': 'UF',
  'No Building Permit': 'NP',
  'Encroachment on Public Land': 'EP',
  'Commercial Use in Residential Zone': 'CR',
  'Setback Violation': 'SV',
  'Illegal Basement Construction': 'IB',
};

const periodFilter = (period) => {
  switch (period) {
    case 'month': return "AND v.detected_date >= date('now', '-30 days')";
    case 'quarter': return "AND v.detected_date >= date('now', '-90 days')";
    case 'year': return "AND v.detected_date >= date('now', '-365 days')";
    default: return '';
  }
};

const scopedFilters = (user, period) => {
  const wardScope = buildWardScope(user, 'v.ward');
  const clauses = [];
  const params = [];

  if (wardScope.clause) {
    clauses.push(wardScope.clause);
    params.push(...wardScope.params);
  }

  return {
    clause: clauses.length ? ` AND ${clauses.join(' AND ')}` : '',
    period: periodFilter(period),
    params,
  };
};

// GET /api/analytics/summary
router.get('/summary', (req, res) => {
  const db = getDb();
  const scope = scopedFilters(req.user, req.query.period);

  const total = db.prepare(`SELECT COUNT(*) as c FROM violations v WHERE 1=1${scope.clause} ${scope.period}`).get(...scope.params).c;
  const newCount = db.prepare(`SELECT COUNT(*) as c FROM violations v WHERE status = 'NEW'${scope.clause} ${scope.period}`).get(...scope.params).c;
  const reviewCount = db.prepare(`SELECT COUNT(*) as c FROM violations v WHERE status = 'UNDER REVIEW'${scope.clause} ${scope.period}`).get(...scope.params).c;
  const noticeCount = db.prepare(`SELECT COUNT(*) as c FROM violations v WHERE status = 'NOTICE SENT'${scope.clause} ${scope.period}`).get(...scope.params).c;
  const resolved = db.prepare(`SELECT COUNT(*) as c FROM violations v WHERE status = 'RESOLVED'${scope.clause} ${scope.period}`).get(...scope.params).c;
  const dismissed = db.prepare(`SELECT COUNT(*) as c FROM violations v WHERE status = 'DISMISSED'${scope.clause} ${scope.period}`).get(...scope.params).c;
  const revenue = db.prepare(`SELECT COALESCE(SUM(penalty), 0) as s FROM violations v WHERE 1=1${scope.clause} ${scope.period}`).get(...scope.params).s;

  res.json({
    total, new: newCount, underReview: reviewCount,
    noticeSent: noticeCount, resolved, dismissed,
    revenue: parseFloat((revenue / 10).toFixed(1)),
    pending: newCount + reviewCount + noticeCount,
  });
});

// GET /api/analytics/trends — Monthly detection counts
router.get('/trends', (req, res) => {
  const db = getDb();
  const wardScope = buildWardScope(req.user, 'ward');
  const wardClause = wardScope.clause ? ` AND ${wardScope.clause}` : '';
  const period = periodFilter(req.query.period).replaceAll('v.', '');
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', detected_date) as month, COUNT(*) as count
    FROM violations
    WHERE 1=1${wardClause} ${period}
    GROUP BY month
    ORDER BY month ASC
  `).all(...wardScope.params);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data = rows.map(r => {
    const [, m] = r.month.split('-');
    return { m: MONTHS[parseInt(m, 10) - 1], v: r.count, month: r.month };
  });

  res.json({ trends: data });
});

// GET /api/analytics/wards — Ward-level breakdown
router.get('/wards', (req, res) => {
  const db = getDb();
  const wardScope = buildWardScope(req.user, 'ward');
  const wardClause = wardScope.clause ? ` AND ${wardScope.clause}` : '';
  const period = periodFilter(req.query.period).replaceAll('v.', '');
  const rows = db.prepare(`
    SELECT
      ward,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status != 'RESOLVED' AND status != 'DISMISSED' THEN 1 ELSE 0 END) as pending,
      ROUND(AVG(julianday('now') - julianday(detected_date))) as avg_days,
      ROUND(SUM(penalty) / 10.0, 1) as revenue
    FROM violations
    WHERE 1=1${wardClause} ${period}
    GROUP BY ward
    ORDER BY count DESC
  `).all(...wardScope.params);

  res.json({ wards: rows });
});

// GET /api/analytics/types — By violation type
router.get('/types', (req, res) => {
  const db = getDb();
  const scope = scopedFilters(req.user, req.query.period);
  const rows = db.prepare(`
    SELECT type as name, COUNT(*) as v
    FROM violations v
    WHERE 1=1${scope.clause} ${scope.period}
    GROUP BY type
    ORDER BY v DESC
  `).all(...scope.params);

  const colors = ['#FF4545','#F5A623','#00C9A7','#4A9EFF','#A78BFA','#4A5468'];
  const data = rows.map((r, i) => ({ ...r, c: colors[i % colors.length] }));

  res.json({ types: data });
});

// GET /api/analytics/type-trends - Monthly counts by type
router.get('/type-trends', (req, res) => {
  const db = getDb();
  const scope = scopedFilters(req.user, req.query.period);
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', v.detected_date) as month, v.type, COUNT(*) as count
    FROM violations v
    WHERE 1=1${scope.clause} ${scope.period}
    GROUP BY month, v.type
    ORDER BY month ASC
  `).all(...scope.params);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.month)) {
      const [, monthNum] = row.month.split('-');
      grouped.set(row.month, {
        m: MONTHS[parseInt(monthNum, 10) - 1],
        UF: 0,
        NP: 0,
        EP: 0,
        CR: 0,
        SV: 0,
        IB: 0,
      });
    }

    const key = TYPE_KEYS[row.type];
    if (key) grouped.get(row.month)[key] = row.count;
  }

  res.json({ trends: [...grouped.values()] });
});

// GET /api/analytics/confidence — Confidence distribution
router.get('/confidence', (req, res) => {
  const db = getDb();
  const scope = scopedFilters(req.user, req.query.period);
  const ranges = [
    { label: '70-79%', min: 70, max: 79 },
    { label: '80-89%', min: 80, max: 89 },
    { label: '90-95%', min: 90, max: 95 },
    { label: '96-100%', min: 96, max: 100 },
  ];

  const data = ranges.map(r => {
    const row = db.prepare(`SELECT COUNT(*) as c FROM violations v WHERE confidence >= ? AND confidence <= ?${scope.clause} ${scope.period}`)
      .get(r.min, r.max, ...scope.params);
    return { r: r.label, c: row.c };
  });

  res.json({ confidence: data });
});

// GET /api/analytics/resolution-time — Resolution time distribution
router.get('/resolution-time', (req, res) => {
  const db = getDb();
  const scope = scopedFilters(req.user, req.query.period);
  const buckets = [
    { label: '<7d', max: 7 },
    { label: '7-14', min: 7, max: 14 },
    { label: '14-30', min: 14, max: 30 },
    { label: '30-60', min: 30, max: 60 },
    { label: '>60', min: 60 },
  ];

  const data = buckets.map(b => {
    let sql = `SELECT COUNT(*) as c FROM violations v WHERE status = 'RESOLVED'${scope.clause} ${scope.period}`;
    const params = [...scope.params];
    if (b.min !== undefined) { sql += " AND (julianday(updated_at) - julianday(detected_date)) >= ?"; params.push(b.min); }
    if (b.max !== undefined) { sql += " AND (julianday(updated_at) - julianday(detected_date)) < ?"; params.push(b.max); }
    const row = db.prepare(sql).get(...params);
    return { r: b.label, c: row.c };
  });

  res.json({ resolution: data });
});

// GET /api/analytics/quality - Derived operational quality metrics
router.get('/quality', (req, res) => {
  const db = getDb();
  const scope = scopedFilters(req.user, req.query.period);
  const totals = db.prepare(`
    WITH latest_feedback AS (
      SELECT f.violation_id, f.feedback
      FROM feedback_events f
      INNER JOIN (
        SELECT violation_id, MAX(id) as max_id
        FROM feedback_events
        GROUP BY violation_id
      ) latest ON latest.max_id = f.id
    )
    SELECT
      COUNT(*) as total,
      COALESCE(AVG(confidence), 0) as avg_confidence,
      SUM(CASE WHEN status = 'DISMISSED' THEN 1 ELSE 0 END) as dismissed,
      SUM(CASE WHEN status = 'NOTICE SENT' THEN 1 ELSE 0 END) as notices,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN confidence >= 90 THEN 1 ELSE 0 END) as high_confidence,
      SUM(
        CASE WHEN COALESCE(
          lf.feedback,
          CASE
            WHEN v.status = 'DISMISSED' THEN 'false_positive'
            WHEN v.status = 'UNDER REVIEW' THEN 'needs_field_inspection'
            WHEN v.status IN ('NOTICE SENT', 'RESOLVED') THEN 'confirmed'
            ELSE NULL
          END
        ) IS NOT NULL THEN 1 ELSE 0 END
      ) as reviewed_cases,
      SUM(
        CASE WHEN COALESCE(
          lf.feedback,
          CASE
            WHEN v.status IN ('NOTICE SENT', 'RESOLVED') THEN 'confirmed'
            ELSE NULL
          END
        ) = 'confirmed' THEN 1 ELSE 0 END
      ) as confirmed_cases,
      SUM(
        CASE WHEN COALESCE(
          lf.feedback,
          CASE
            WHEN v.status = 'DISMISSED' THEN 'false_positive'
            ELSE NULL
          END
        ) = 'false_positive' THEN 1 ELSE 0 END
      ) as false_positive_cases,
      SUM(
        CASE WHEN COALESCE(
          lf.feedback,
          CASE
            WHEN v.status = 'UNDER REVIEW' THEN 'needs_field_inspection'
            ELSE NULL
          END
        ) = 'needs_field_inspection' THEN 1 ELSE 0 END
      ) as field_inspection_cases
    FROM violations v
    LEFT JOIN latest_feedback lf ON lf.violation_id = v.id
    WHERE 1=1${scope.clause} ${scope.period}
  `).get(...scope.params);

  const total = totals.total || 0;
  const pct = (value) => total ? Number(((value / total) * 100).toFixed(1)) : 0;
  const reviewedCases = totals.reviewed_cases || 0;
  const reviewedPct = (value) => reviewedCases ? Number(((value / reviewedCases) * 100).toFixed(1)) : 0;
  const copilot = db.prepare(`
    WITH latest_reviews AS (
      SELECT r.*
      FROM ai_case_reviews r
      INNER JOIN (
        SELECT violation_id, MAX(id) as max_id
        FROM ai_case_reviews
        GROUP BY violation_id
      ) latest ON latest.max_id = r.id
    )
    SELECT
      COUNT(*) as ai_reviewed_cases,
      SUM(CASE WHEN lr.approval_status = 'approved' THEN 1 ELSE 0 END) as approved_reviews,
      SUM(CASE WHEN lr.approval_status = 'overridden' THEN 1 ELSE 0 END) as overridden_reviews,
      SUM(CASE WHEN lr.recommendation_code = 'generate_legal_notice' THEN 1 ELSE 0 END) as notice_guided_cases,
      SUM(CASE WHEN lr.recommendation_code = 'needs_field_inspection' THEN 1 ELSE 0 END) as inspection_guided_cases
    FROM latest_reviews lr
    INNER JOIN violations v ON v.id = lr.violation_id
    WHERE 1=1${scope.clause} ${scope.period}
  `).get(...scope.params);
  const decidedReviews = (copilot.approved_reviews || 0) + (copilot.overridden_reviews || 0);
  const decidedPct = (value) => decidedReviews ? Number(((value / decidedReviews) * 100).toFixed(1)) : 0;

  res.json({
    quality: {
      avgConfidence: Number((totals.avg_confidence || 0).toFixed(1)),
      falsePositiveRate: pct(totals.dismissed || 0),
      noticeConversion: pct(totals.notices || 0),
      resolutionRate: pct(totals.resolved || 0),
      highConfidenceShare: pct(totals.high_confidence || 0),
      reviewedCases,
      reviewCoverage: pct(reviewedCases),
      confirmedCases: totals.confirmed_cases || 0,
      confirmedRate: reviewedPct(totals.confirmed_cases || 0),
      falsePositiveCases: totals.false_positive_cases || 0,
      falsePositiveShare: reviewedPct(totals.false_positive_cases || 0),
      fieldInspectionCases: totals.field_inspection_cases || 0,
      fieldInspectionRate: reviewedPct(totals.field_inspection_cases || 0),
      aiReviewedCases: copilot.ai_reviewed_cases || 0,
      aiCoverage: pct(copilot.ai_reviewed_cases || 0),
      aiApprovedReviews: copilot.approved_reviews || 0,
      aiApprovalRate: decidedPct(copilot.approved_reviews || 0),
      aiOverriddenReviews: copilot.overridden_reviews || 0,
      aiOverrideRate: decidedPct(copilot.overridden_reviews || 0),
      aiNoticeRecommendations: copilot.notice_guided_cases || 0,
      aiInspectionRecommendations: copilot.inspection_guided_cases || 0,
    },
  });
});

export default router;
