import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './db/connection.js';

import authRoutes from './routes/auth.js';
import violationsRoutes from './routes/violations.js';
import analyticsRoutes from './routes/analytics.js';
import officersRoutes from './routes/officers.js';
import noticesRoutes from './routes/notices.js';
import settingsRoutes from './routes/settings.js';
import logsRoutes from './routes/logs.js';
import visionRoutes from './routes/vision.js';
import citizenRoutes from './routes/citizen.js';

const app = express();
const PORT = process.env.PORT || 3002;
const BOOT_TIME = Date.now();
const BUILD_TIMESTAMP = new Date().toISOString();

// Initialize DB before starting server
await initDb();

// Auto-seed if database is empty (first-boot on Render/any fresh deployment)
// Skips if AUTO_SEED=false (set this env var if you want to disable)
if (process.env.AUTO_SEED !== 'false') {
  try {
    const db = getDb();
    const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get()?.n || 0;
    if (userCount === 0) {
      console.log('[boot] Database is empty — running auto-seed...');
      const { runSeed } = await import('./db/seed.js');
      await runSeed();
      console.log('[boot] Auto-seed complete.');
    } else {
      console.log(`[boot] Database already has ${userCount} users — skipping auto-seed.`);
    }
  } catch (err) {
    console.error('[boot] Auto-seed check failed:', err.message);
    // Don't crash the server — it's still usable without demo data
  }
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/violations', violationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/officers', officersRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/citizen', citizenRoutes);

// JSON health — machine-readable
app.get('/api/health', (req, res) => {
  try {
    const db = getDb();
    const violationCount = db.prepare('SELECT COUNT(*) as n FROM violations').get()?.n || 0;
    const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get()?.n || 0;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;
    const primary = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const uptimeMs = Date.now() - BOOT_TIME;

    res.json({
      status: 'ok',
      service: 'INFRAWATCH',
      timestamp: new Date().toISOString(),
      build: BUILD_TIMESTAMP,
      uptimeMs,
      uptimeHuman: formatUptime(uptimeMs),
      database: {
        status: 'connected',
        violations: violationCount,
        users: userCount,
        seeded: violationCount > 0 && userCount > 0,
      },
      ai: {
        primaryProvider: primary,
        geminiConfigured: hasGemini,
        groqFallbackReady: hasGroq,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// HTML health — human-friendly status page at /health
app.get('/health', (req, res) => {
  let db, violationCount = 0, userCount = 0, dbOk = false;
  try {
    db = getDb();
    violationCount = db.prepare('SELECT COUNT(*) as n FROM violations').get()?.n || 0;
    userCount = db.prepare('SELECT COUNT(*) as n FROM users').get()?.n || 0;
    dbOk = true;
  } catch (err) {
    dbOk = false;
  }
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  const primary = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const uptimeMs = Date.now() - BOOT_TIME;

  const pill = (ok, label) => `<span class="pill ${ok ? 'ok' : 'err'}">${ok ? '●' : '○'} ${label}</span>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>INFRAWATCH · Service Status</title>
  <meta name="robots" content="noindex" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #080A0D;
      color: #E8E9EA;
      min-height: 100vh;
      padding: 40px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .wrap { max-width: 720px; width: 100%; }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      padding-bottom: 18px;
      border-bottom: 1px solid #1E2533;
    }
    .brand { font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700; letter-spacing: 0.1em; color: #F5A623; }
    .tag { font-size: 11px; color: #8A8F98; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px; }
    .status-headline {
      background: ${dbOk ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.1)'};
      border: 1px solid ${dbOk ? '#34C759' : '#FF3B30'};
      border-left: 3px solid ${dbOk ? '#34C759' : '#FF3B30'};
      border-radius: 8px;
      padding: 18px 22px;
      margin-bottom: 22px;
    }
    .status-headline h1 { font-size: 22px; color: ${dbOk ? '#34C759' : '#FF3B30'}; margin-bottom: 4px; }
    .status-headline p { font-size: 13px; color: #B8BCC4; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 12px; margin-bottom: 22px; }
    .card {
      background: #0F1117;
      border: 1px solid #1E2533;
      border-radius: 8px;
      padding: 16px 18px;
    }
    .card-label { font-family: 'Space Mono', monospace; font-size: 10px; color: #8A8F98; letter-spacing: 0.1em; margin-bottom: 10px; }
    .card-body { font-size: 13px; color: #E8E9EA; line-height: 1.6; }
    .pill {
      display: inline-block;
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 3px;
      font-family: 'Space Mono', monospace;
      letter-spacing: 0.05em;
      margin: 2px 4px 2px 0;
    }
    .pill.ok { background: rgba(52,199,89,0.15); color: #34C759; border: 1px solid rgba(52,199,89,0.3); }
    .pill.err { background: rgba(255,59,48,0.12); color: #FF3B30; border: 1px solid rgba(255,59,48,0.3); }
    .pill.info { background: rgba(74,158,255,0.12); color: #4A9EFF; border: 1px solid rgba(74,158,255,0.3); }
    .metric { font-family: 'Space Mono', monospace; font-size: 20px; font-weight: 700; color: #F5A623; }
    .sub { font-size: 11px; color: #5A5F68; margin-top: 3px; }
    a.btn {
      display: inline-block;
      background: linear-gradient(135deg,#F5A623,#E09612);
      color: #0A0C10;
      padding: 10px 22px;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }
    a.btn:hover { opacity: 0.92; }
    .foot { margin-top: 24px; font-size: 11px; color: #5A5F68; text-align: center; border-top: 1px solid #1E2533; padding-top: 14px; }
    .foot a { color: #F5A623; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div>
        <div class="brand">INFRAWATCH</div>
        <div class="tag">Urban Safety Crisis Response · Service Status</div>
      </div>
      <a href="/" class="btn">Open App →</a>
    </div>

    <div class="status-headline">
      <h1>${dbOk ? 'All Systems Operational' : 'Degraded Service'}</h1>
      <p>${dbOk
        ? 'Backend is healthy, database is seeded, AI providers are configured.'
        : 'Database is not reachable. AI calls may fail until resolved.'}</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">BACKEND</div>
        <div class="card-body">
          ${pill(true, 'RUNNING')}<br/>
          <div class="sub">Uptime: ${formatUptime(uptimeMs)}</div>
          <div class="sub">Build: ${BUILD_TIMESTAMP}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-label">DATABASE</div>
        <div class="card-body">
          ${pill(dbOk, dbOk ? 'CONNECTED' : 'UNREACHABLE')}
          ${pill(violationCount > 0, violationCount > 0 ? 'SEEDED' : 'EMPTY')}
          <div class="metric">${violationCount}</div>
          <div class="sub">violations · ${userCount} officers</div>
        </div>
      </div>

      <div class="card">
        <div class="card-label">AI PROVIDER</div>
        <div class="card-body">
          ${pill(hasGemini, 'GEMINI ' + (primary === 'gemini' ? '(ACTIVE)' : '(STANDBY)'))}<br/>
          ${pill(hasGroq, 'GROQ ' + (primary === 'groq' ? '(ACTIVE)' : '(FALLBACK READY)'))}
          <div class="sub" style="margin-top:8px">Auto-failover enabled on 429/quota errors</div>
        </div>
      </div>

      <div class="card">
        <div class="card-label">VERSION</div>
        <div class="card-body">
          <span class="pill info">v1.0.0-prototype</span>
          <div class="sub">Google Solution Challenge 2026</div>
          <div class="sub">Theme · Rapid Crisis Response · Open Innovation</div>
        </div>
      </div>
    </div>

    <div class="foot">
      Machine-readable JSON: <a href="/api/health">/api/health</a> ·
      GitHub: <a href="https://github.com/LordDevdeep/Infrawatch">LordDevdeep/Infrawatch</a> ·
      Aligned with UN SDG 11 &amp; SDG 16
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Helper: human uptime
function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  INFRAWATCH Server                       ║`);
  console.log(`║  Running on http://localhost:${PORT}         ║`);
  console.log(`║  Satellite-LED Municipal Enforcement Grid ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});
