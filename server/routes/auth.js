import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { parseWardAccess } from '../middleware/access.js';

const router = Router();

// POST /api/auth/otp-request
router.post('/otp-request', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'No officer found with this email' });

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO otp_tokens (email, otp, expires_at) VALUES (?, ?, ?)').run(email, otp, expiresAt);

  // In production, send via SMS/email. In dev, print to console.
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  OTP for ${email}`);
  console.log(`║  Code: ${otp}`);
  console.log(`║  Expires in 10 minutes`);
  console.log(`╚══════════════════════════════════════╝\n`);

  res.json({ message: 'OTP sent successfully', email });
});

// POST /api/auth/otp-verify
router.post('/otp-verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  const db = getDb();
  const token = db.prepare(
    "SELECT * FROM otp_tokens WHERE email = ? AND otp = ? AND used = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1"
  ).get(email, otp);

  if (!token) return res.status(401).json({ error: 'Invalid or expired OTP' });

  // Mark OTP as used
  db.prepare('UPDATE otp_tokens SET used = 1 WHERE id = ?').run(token.id);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare("UPDATE users SET last_active = datetime('now'), status = 'active' WHERE id = ?").run(user.id);

  const jwt = signToken(user);
  res.json({
    token: jwt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ward_access: parseWardAccess(user.ward_access),
    },
  });
});

// POST /api/auth/login (password fallback)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  db.prepare("UPDATE users SET last_active = datetime('now') WHERE id = ?").run(user.id);

  const jwt = signToken(user);
  res.json({
    token: jwt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ward_access: parseWardAccess(user.ward_access),
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, ward_access, status FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    user: {
      ...user,
      ward_access: parseWardAccess(user.ward_access),
    },
  });
});

export default router;
