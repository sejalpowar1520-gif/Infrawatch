import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import { parseWardAccess } from './access.js';

const JWT_SECRET = process.env.JWT_SECRET || 'infrawatch-dev-secret-key-2026';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = verifyToken(header.slice(7));
    const db = getDb();
    const user = db.prepare(
      'SELECT id, name, email, role, ward_access, status FROM users WHERE id = ?'
    ).get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      ...decoded,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      ward_access: parseWardAccess(user.ward_access),
    };

    db.prepare("UPDATE users SET last_active = datetime('now') WHERE id = ?").run(decoded.id);

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
