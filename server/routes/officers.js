import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hasGlobalAccess, intersectsWardScope, parseWardAccess } from '../middleware/access.js';

const router = Router();
router.use(authenticate);

// GET /api/officers — List all officers
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, email, role, ward_access, status, last_active, created_at
    FROM users ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END,
      name ASC
  `).all();

  const normalized = rows.map(r => ({
    ...r,
    ward_access: parseWardAccess(r.ward_access),
  }));

  if (hasGlobalAccess(req.user)) {
    return res.json({ officers: normalized });
  }

  const officers = normalized
    .filter((officer) => officer.id === req.user.id || (officer.status === 'active' && intersectsWardScope(req.user, officer.ward_access)))
    .map(({ email, ...officer }) => officer);

  res.json({ officers });
});

// POST /api/officers/invite — Invite new officer
router.post('/invite', requireRole('admin', 'commissioner'), (req, res) => {
  const db = getDb();
  const { email, name, role, ward_access } = req.body;

  if (!email?.includes('@')) return res.status(400).json({ error: 'Valid email required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Officer with this email already exists' });

  const displayName = name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const defaultHash = bcrypt.hashSync('infrawatch123', 10);

  db.prepare(`
    INSERT INTO users (name, email, password_hash, role, ward_access, status)
    VALUES (?, ?, ?, ?, ?, 'invited')
  `).run(displayName, email, defaultHash, role || 'field_officer', JSON.stringify(ward_access || []));

  db.prepare("INSERT INTO activity_logs (message, type, user_id) VALUES (?, 'info', ?)").run(
    `Invited ${displayName} (${role || 'field_officer'})`, req.user.id
  );

  res.json({ message: 'Officer invited', email });
});

// PATCH /api/officers/:id — Update officer
router.patch('/:id', requireRole('admin', 'commissioner'), (req, res) => {
  const db = getDb();
  const { role, status, ward_access } = req.body;

  const updates = [];
  const params = [];

  if (role) { updates.push('role = ?'); params.push(role); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (ward_access) { updates.push('ward_access = ?'); params.push(JSON.stringify(ward_access)); }

  if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.params.id);

  const updated = db.prepare('SELECT id, name, email, role, ward_access, status FROM users WHERE id = ?').get(req.params.id);
  res.json({ officer: updated });
});

export default router;
