import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/settings
router.get('/', requireRole('commissioner', 'admin'), (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  }
  res.json({ settings });
});

// PUT /api/settings
router.put('/', requireRole('admin'), (req, res) => {
  const db = getDb();
  const data = req.body;

  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))");
  for (const [key, value] of Object.entries(data)) {
    upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  db.prepare("INSERT INTO activity_logs (message, type, user_id) VALUES (?, 'info', ?)").run(
    'Settings updated', req.user.id
  );

  res.json({ message: 'Settings saved' });
});

export default router;
