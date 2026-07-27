CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT,
  role TEXT CHECK(role IN ('admin','commissioner','inspector','field_officer')) DEFAULT 'field_officer',
  ward_access TEXT DEFAULT '[]',
  status TEXT CHECK(status IN ('active','invited','inactive')) DEFAULT 'active',
  last_active DATETIME,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS violations (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  ward TEXT NOT NULL,
  ward_no TEXT,
  type TEXT NOT NULL,
  detected_date DATE NOT NULL,
  confidence INTEGER CHECK(confidence BETWEEN 0 AND 100),
  status TEXT CHECK(status IN ('NEW','UNDER REVIEW','NOTICE SENT','RESOLVED','DISMISSED')) DEFAULT 'NEW',
  officer_id INTEGER REFERENCES users(id),
  penalty REAL DEFAULT 0,
  area INTEGER DEFAULT 0,
  height_delta REAL DEFAULT 0,
  survey_no TEXT,
  owner_name TEXT,
  zone TEXT,
  last_approved_year INTEGER,
  lat REAL,
  lng REAL,
  city TEXT DEFAULT 'Bengaluru',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id TEXT NOT NULL REFERENCES violations(id),
  officer_id INTEGER REFERENCES users(id),
  officer_name TEXT,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id TEXT NOT NULL REFERENCES violations(id),
  user_id INTEGER REFERENCES users(id),
  feedback TEXT CHECK(feedback IN ('confirmed','false_positive','needs_field_inspection')) NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS image_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id TEXT NOT NULL REFERENCES violations(id),
  created_by INTEGER REFERENCES users(id),
  provider TEXT,
  model TEXT,
  before_image_name TEXT,
  after_image_name TEXT,
  predicted_type TEXT NOT NULL,
  confidence INTEGER CHECK(confidence BETWEEN 0 AND 100),
  change_detected INTEGER DEFAULT 1,
  summary TEXT,
  rationale TEXT,
  recommended_action TEXT,
  evidence_points TEXT,
  raw_response TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_case_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id TEXT NOT NULL REFERENCES violations(id),
  created_by INTEGER REFERENCES users(id),
  provider TEXT,
  model TEXT,
  confidence INTEGER CHECK(confidence BETWEEN 0 AND 100),
  risk_level TEXT CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
  recommendation_code TEXT CHECK(recommendation_code IN ('confirm_violation', 'needs_field_inspection', 'generate_legal_notice', 'mark_false_positive')) NOT NULL,
  executive_summary TEXT NOT NULL,
  why_flagged TEXT NOT NULL,
  legal_basis TEXT,
  permit_analysis TEXT,
  action_reason TEXT,
  evidence_gaps TEXT,
  inspection_checklist TEXT,
  notice_strategy TEXT,
  commissioner_brief TEXT,
  raw_response TEXT,
  approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'overridden')) DEFAULT 'pending',
  final_action TEXT CHECK(final_action IN ('confirm_violation', 'needs_field_inspection', 'generate_legal_notice', 'mark_false_positive')),
  override_notes TEXT,
  decided_by INTEGER REFERENCES users(id),
  decided_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  violation_id TEXT NOT NULL REFERENCES violations(id),
  template_id INTEGER,
  generated_by INTEGER REFERENCES users(id),
  ai_generated INTEGER DEFAULT 0,
  ai_provider TEXT,
  ai_model TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notice_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  type TEXT CHECK(type IN ('info','success','warn','error')) DEFAULT 'info',
  user_id INTEGER REFERENCES users(id),
  violation_id TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS citizen_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_name TEXT,
  reporter_phone TEXT,
  reporter_email TEXT,
  description TEXT NOT NULL,
  address TEXT,
  ward TEXT,
  lat REAL,
  lng REAL,
  photo_data_url TEXT,
  status TEXT CHECK(status IN ('pending','under_review','linked_to_case','dismissed')) DEFAULT 'pending',
  linked_violation_id TEXT REFERENCES violations(id),
  created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_violations_ward ON violations(ward);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_city ON violations(city);
CREATE INDEX IF NOT EXISTS idx_notes_violation ON notes(violation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_violation ON feedback_events(violation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_analyses_violation ON image_analyses(violation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_case_reviews_violation ON ai_case_reviews(violation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at DESC);
