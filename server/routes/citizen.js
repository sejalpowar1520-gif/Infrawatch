/**
 * Citizen Reporting Portal — public (no-auth) routes
 *
 * Anyone in Bengaluru can submit a violation report.
 * Officers see these in a dedicated dashboard panel and can promote
 * a report to a full violation case.
 */

import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// ─────── PUBLIC endpoint (no auth) ───────

/**
 * POST /api/citizen/report
 * Public citizen violation submission.
 * Rate-limited per IP by simple in-memory counter.
 */
const RATE_LIMIT = new Map(); // ip → { count, resetAt }
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

router.post('/report', (req, res) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_MAX) {
      return res.status(429).json({ error: 'Too many reports from this address. Please try again in a minute.' });
    }
    entry.count++;
  } else {
    RATE_LIMIT.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  }

  const {
    reporter_name,
    reporter_phone,
    reporter_email,
    description,
    address,
    ward,
    lat,
    lng,
    photo_data_url,
  } = req.body || {};

  if (!description || String(description).trim().length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters.' });
  }

  // Cap photo size (10 MB base64 ≈ 7.5 MB raw) to avoid DB bloat
  if (photo_data_url && photo_data_url.length > 10 * 1024 * 1024) {
    return res.status(400).json({ error: 'Photo too large. Please upload a smaller image (<10 MB).' });
  }

  try {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO citizen_reports
        (reporter_name, reporter_phone, reporter_email, description, address, ward, lat, lng, photo_data_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      reporter_name || null,
      reporter_phone || null,
      reporter_email || null,
      String(description).trim(),
      address || null,
      ward || null,
      Number(lat) || null,
      Number(lng) || null,
      photo_data_url || null,
    );

    // Log public activity
    db.prepare(`
      INSERT INTO activity_logs (message, type, user_id, violation_id)
      VALUES (?, 'info', NULL, NULL)
    `).run(
      `Citizen report #${result.lastInsertRowid} received${ward ? ` · ${ward}` : ''}${reporter_name ? ` · by ${reporter_name}` : ' · anonymous'}`,
    );

    return res.status(201).json({
      success: true,
      reportId: result.lastInsertRowid,
      message: 'Thank you. Your report has been received and will be reviewed by BBMP enforcement officers within 24 hours.',
    });
  } catch (err) {
    console.error('[citizen] submit error:', err);
    return res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  }
});

// ─────── OFFICER endpoints (auth required) ───────

router.use(authenticate);

/**
 * GET /api/citizen/reports — officer-facing list of submitted reports.
 */
router.get('/reports', requireRole('inspector', 'commissioner', 'admin'), (req, res) => {
  const db = getDb();
  const { status, limit = 50 } = req.query;
  let query = `
    SELECT cr.*,
           CASE WHEN cr.linked_violation_id IS NOT NULL THEN 1 ELSE 0 END as is_linked,
           v.type as linked_violation_type
    FROM citizen_reports cr
    LEFT JOIN violations v ON cr.linked_violation_id = v.id
  `;
  const params = [];
  if (status) {
    query += ` WHERE cr.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY cr.created_at DESC LIMIT ?`;
  params.push(Math.min(200, Number(limit) || 50));

  const reports = db.prepare(query).all(...params);

  // Redact photo data URLs in list view (kept in detail view)
  const summary = reports.map(r => {
    const { photo_data_url, ...rest } = r;
    return { ...rest, has_photo: !!photo_data_url };
  });

  // Summary counts
  const counts = db.prepare(`
    SELECT status, COUNT(*) as n FROM citizen_reports GROUP BY status
  `).all().reduce((o, r) => ({ ...o, [r.status]: r.n }), {});

  res.json({ reports: summary, counts, total: reports.length });
});

/**
 * GET /api/citizen/reports/:id — full report including photo.
 */
router.get('/reports/:id', requireRole('inspector', 'commissioner', 'admin'), (req, res) => {
  const db = getDb();
  const r = db.prepare('SELECT * FROM citizen_reports WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Report not found' });
  res.json({ report: r });
});

/**
 * PATCH /api/citizen/reports/:id — update status / link to violation.
 */
router.patch('/reports/:id', requireRole('inspector', 'commissioner', 'admin'), (req, res) => {
  const db = getDb();
  const { status, linked_violation_id } = req.body || {};
  const VALID = ['pending', 'under_review', 'linked_to_case', 'dismissed'];
  if (status && !VALID.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const existing = db.prepare('SELECT id FROM citizen_reports WHERE id = ?').get(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Report not found' });

  db.prepare(`
    UPDATE citizen_reports
    SET status = COALESCE(?, status),
        linked_violation_id = COALESCE(?, linked_violation_id)
    WHERE id = ?
  `).run(status || null, linked_violation_id || null, Number(req.params.id));

  const updated = db.prepare('SELECT * FROM citizen_reports WHERE id = ?').get(Number(req.params.id));
  res.json({ report: updated });
});

export default router;
