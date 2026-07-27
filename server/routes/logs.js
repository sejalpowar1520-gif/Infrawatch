import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { canAccessWard, hasGlobalAccess } from '../middleware/access.js';

const router = Router();
router.use(authenticate);

// GET /api/logs
router.get('/', (req, res) => {
  const db = getDb();
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const rows = db.prepare(`
    SELECT l.*, u.name as user_name
    , v.ward as violation_ward
    FROM activity_logs l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN violations v ON l.violation_id = v.id
    ORDER BY l.created_at DESC
    LIMIT ?
  `).all(hasGlobalAccess(req.user) ? limit : 500);

  const logs = rows
    .filter((log) => hasGlobalAccess(req.user) || log.user_id === req.user.id || (log.violation_ward && canAccessWard(req.user, log.violation_ward)))
    .slice(0, limit)
    .map(({ violation_ward, ...log }) => log);

  res.json({ logs });
});

export default router;
