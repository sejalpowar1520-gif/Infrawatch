import { initDb, getDb } from './connection.js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Run the full seed. Called either:
 *   - by `npm run seed` (standalone CLI script)
 *   - automatically from server/index.js on first boot if the DB is empty
 *
 * Safe to re-run — drops & recreates all tables.
 */
export async function runSeed() {
  await initDb();
  const db = getDb();

  // Clear existing data (disable FK checks, drop and recreate)
  db.pragma('foreign_keys = OFF');
  db.exec(`
    DROP TABLE IF EXISTS activity_logs;
    DROP TABLE IF EXISTS ai_case_reviews;
    DROP TABLE IF EXISTS image_analyses;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS notices;
    DROP TABLE IF EXISTS notice_templates;
    DROP TABLE IF EXISTS otp_tokens;
    DROP TABLE IF EXISTS violations;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS users;
  `);
  db.pragma('foreign_keys = ON');

  // Recreate schema
  const __dirname2 = dirname(fileURLToPath(import.meta.url));
  const schema = readFileSync(join(__dirname2, 'schema.sql'), 'utf-8');
  db.exec(schema);

  return _seedBody(db);
}

async function _seedBody(db) {

// ── CONSTANTS — realistic Bengaluru data ────────────────────────────────────
const WARDS = [
  "Koramangala","Jayanagar","Indiranagar","Whitefield","HSR Layout",
  "Malleshwaram","Basavanagudi","Yelahanka","Hebbal","Marathahalli",
  "Bellandur","BTM Layout","Rajajinagar","Banashankari","JP Nagar"
];

const VTYPES = [
  "Unauthorized 4th floor construction",
  "Setback violation - front",
  "Commercial use in residential zone",
  "No sanctioned plan",
  "Encroachment on stormwater drain",
  "Rooftop extension without permit",
  "Basement conversion violation",
];

// Realistic Bengaluru street patterns — ward-specific addresses
const ADDRS_BY_WARD = {
  "Koramangala":     ["80 Feet Road, Koramangala 4th Block", "5th Block, Koramangala, near Forum Mall", "7th Block, 17th Main Road, Koramangala", "6th Block, 80 Feet Road, Koramangala", "1st Block, Koramangala Industrial Layout"],
  "Jayanagar":       ["11th Main, 4th Block, Jayanagar", "9th Block, 22nd Cross, Jayanagar", "4th T Block, Jayanagar 560041", "3rd Block, 39th Cross, Jayanagar", "8th Block, Kanakapura Road, Jayanagar"],
  "Indiranagar":     ["100 Feet Road, Indiranagar 1st Stage", "12th Main, HAL 2nd Stage, Indiranagar", "CMH Road, Indiranagar", "CMH Double Road, Indiranagar 560038", "Old Madras Road, Indiranagar"],
  "Whitefield":      ["ITPL Main Road, Whitefield", "Hoodi Circle, Whitefield 560048", "Varthur Road, Whitefield", "Kadugodi Main Road, Whitefield", "Whitefield Main Road, opposite Phoenix Marketcity"],
  "HSR Layout":      ["2nd Main, 4th Cross, HSR Sector 6", "27th Main, HSR Sector 2", "17th Cross, HSR Sector 7", "14th Main, HSR Sector 1", "5th A Cross, HSR Sector 3"],
  "Malleshwaram":    ["Sampige Road, Malleshwaram 15th Cross", "8th Main, Malleshwaram 560003", "18th Cross, Malleshwaram", "Margosa Road, Malleshwaram", "11th Main, 17th Cross, Malleshwaram"],
  "Basavanagudi":    ["Gandhi Bazaar Main Road, Basavanagudi", "DVG Road, Basavanagudi 560004", "Bull Temple Road, Basavanagudi", "North Road, Basavanagudi", "South End Road, Basavanagudi"],
  "Yelahanka":       ["Ananthpura Gate, Yelahanka New Town", "Kogilu Main Road, Yelahanka", "Jakkur Main Road, Yelahanka 560064", "Attur Layout, Yelahanka", "Doddaballapur Road, Yelahanka"],
  "Hebbal":          ["Ring Road, Hebbal Kempapura", "Outer Ring Road, Hebbal 560024", "Bellary Road, near Hebbal Flyover", "Nagawara Main Road, Hebbal", "Sahakarnagar, Hebbal"],
  "Marathahalli":    ["Outer Ring Road, Marathahalli Bridge", "Kundalahalli Gate, Marathahalli", "Varthur Road, Marathahalli 560037", "Sai Baba Temple Road, Marathahalli", "AECS Layout, Marathahalli"],
  "Bellandur":       ["Outer Ring Road, Bellandur 560103", "Devarabisanahalli, Bellandur", "Kariyammana Agrahara, Bellandur", "Iblur Village, Bellandur", "Sarjapur Road, near Bellandur Lake"],
  "BTM Layout":      ["16th Main, BTM 2nd Stage", "29th Main, BTM 1st Stage", "100 Feet Ring Road, BTM Layout", "Silk Board Junction, BTM Layout", "Mico Layout, BTM 2nd Stage"],
  "Rajajinagar":     ["1st Block, Rajajinagar Industrial Town", "Dr Rajkumar Road, Rajajinagar 6th Block", "5th Block, Rajajinagar 560010", "West of Chord Road, Rajajinagar", "60 Feet Road, Rajajinagar 2nd Block"],
  "Banashankari":    ["Kanakapura Main Road, Banashankari 3rd Stage", "24th Main, Banashankari 2nd Stage", "100 Feet Ring Road, Banashankari", "Kathriguppe Main Road, BSK 3rd Stage", "Padmanabhanagar, Banashankari"],
  "JP Nagar":        ["24th Main, JP Nagar 6th Phase", "15th Cross, JP Nagar 2nd Phase", "Bannerghatta Road, JP Nagar 560078", "7th Phase, JP Nagar, opposite Brigade Millennium", "Mico Layout, JP Nagar"],
};

const PENALTIES = [2.4,3.1,4.7,5.6,6.9,7.3,8.7,9.8,11.4,14.6,15.2,18.3,19.1,22.8,31.2];

const OWNERS = [
  "Ramesh Babu Naidu","Surekha Patel","Mohan Krishnamurthy","Anita Desai","Venkat Raju",
  "Lakshmi Bai","Arun Hegde","Sangeetha Rao","Nagesh Shetty","Meera Iyengar",
  "Harish Gowda","Kavya Shenoy","Pradeep Bhat","Shobha Chandrashekar","Mahesh Prabhu",
  "Geetha Ramanna","Vijay Anand","Deepa Kulkarni","Raghavendra Rao","Nandini Acharya",
  "Siddharth Hegde","Anjali Menon","Krishnamurthy S","Radhika Vaidyanathan","Naveen Kumar",
];

const ZONES = ["Residential (R2)","Residential (R1)","Mixed Use (MU-1)","Commercial (C-1)","Residential (R3)"];
const APPROVED_YEARS = [2015,2016,2017,2018,2019,2020,2021,2022];

// Ward center coordinates (lat, lng) for Bengaluru — real map-accurate coords
const WARD_COORDS = {
  "Koramangala":    [12.9352, 77.6245],
  "Jayanagar":      [12.9250, 77.5838],
  "Indiranagar":    [12.9784, 77.6408],
  "Whitefield":     [12.9698, 77.7500],
  "HSR Layout":     [12.9116, 77.6389],
  "Malleshwaram":   [13.0035, 77.5708],
  "Basavanagudi":   [12.9423, 77.5737],
  "Yelahanka":      [13.1007, 77.5963],
  "Hebbal":         [13.0358, 77.5970],
  "Marathahalli":   [12.9591, 77.7019],
  "Bellandur":      [12.9257, 77.6761],
  "BTM Layout":     [12.9166, 77.6101],
  "Rajajinagar":    [12.9886, 77.5523],
  "Banashankari":   [12.9255, 77.5468],
  "JP Nagar":       [12.9063, 77.5857],
};

// Hash helper for deterministic-but-varied pseudo-random
function hashInt(seed, salt) {
  return Math.abs(Math.floor(Math.sin(seed * 9301 + salt * 49297) * 233280) % 1000);
}

// ── SEED USERS ───────────────────────────────────────────────────────────────
const passwordHash = bcrypt.hashSync('infrawatch123', 10);

const insertUser = db.prepare(`
  INSERT INTO users (name, email, phone, password_hash, role, ward_access, status, last_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
`);

const users = [
  { name: "Inspector Ramesh Kumar",  email: "ramesh.kumar@bbmp.gov.in",  phone: "+91-9876543210", role: "inspector",     wards: '["Koramangala","HSR Layout"]',     status: "active",   ago: "-1 hours" },
  { name: "Inspector Priya Nair",    email: "priya.nair@bbmp.gov.in",    phone: "+91-9876543211", role: "inspector",     wards: '["Jayanagar","JP Nagar","BTM Layout"]', status: "active", ago: "-3 hours" },
  { name: "Inspector Arjun Reddy",   email: "arjun.reddy@bbmp.gov.in",   phone: "+91-9876543212", role: "inspector",     wards: '["Whitefield","Marathahalli","Bellandur"]', status: "active", ago: "-2 hours" },
  { name: "Inspector Kavitha Rao",   email: "kavitha.rao@bbmp.gov.in",   phone: "+91-9876543213", role: "inspector",     wards: '["Malleshwaram","Basavanagudi","Rajajinagar"]', status: "active", ago: "-6 hours" },
  { name: "Officer Suresh Hegde",    email: "suresh.hegde@bbmp.gov.in",  phone: "+91-9876543214", role: "field_officer", wards: '["Yelahanka","Hebbal"]',           status: "active",   ago: "-1 days" },
  { name: "Officer Deepak Shetty",   email: "deepak.shetty@bbmp.gov.in", phone: "+91-9876543215", role: "field_officer", wards: '["Banashankari","Indiranagar"]',   status: "active",   ago: "-4 hours" },
  { name: "Rahul Sharma IAS",        email: "rahul.sharma@bbmp.gov.in",  phone: "+91-9876543216", role: "commissioner",  wards: '"all"',                            status: "active",   ago: "-2 hours" },
  { name: "Admin User",              email: "admin@infrawatch.gov.in",   phone: "+91-9000000000", role: "admin",         wards: '"all"',                            status: "active",   ago: "-0 hours" },
];

const userIds = {};
for (const u of users) {
  const info = insertUser.run(u.name, u.email, u.phone, passwordHash, u.role, u.wards, u.status, u.ago);
  userIds[u.name] = info.lastInsertRowid;
}

const OFFICERS = [
  "Inspector Ramesh Kumar", "Inspector Priya Nair", "Inspector Arjun Reddy",
  "Inspector Kavitha Rao", "Officer Suresh Hegde", "Officer Deepak Shetty",
];

// ── SEED VIOLATIONS ──────────────────────────────────────────────────────────
const TODAY = new Date("2026-04-11T09:00:00+05:30");

const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const insertViolation = db.prepare(`
  INSERT INTO violations (id, address, ward, ward_no, type, detected_date, confidence, status, officer_id, penalty, area, height_delta, survey_no, owner_name, zone, last_approved_year, lat, lng, city)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Bengaluru')
`);

const insertNote = db.prepare(`
  INSERT INTO notes (violation_id, officer_id, officer_name, text, created_at)
  VALUES (?, ?, ?, ?, datetime('now'))
`);

// Status distribution targets ~ 15% NEW, 35% UNDER REVIEW, 30% NOTICE SENT, 15% RESOLVED, 5% DISMISSED
// (ASSIGNED / IN_PROGRESS from spec map to UNDER REVIEW since the schema enum is fixed)
function pickStatus(i, total) {
  const r = (i * 37) % 100; // deterministic pseudo-random 0-99
  if (r < 15) return "NEW";              // 15%
  if (r < 50) return "UNDER REVIEW";     // 35%
  if (r < 80) return "NOTICE SENT";      // 30%
  if (r < 95) return "RESOLVED";         // 15%
  return "DISMISSED";                    // 5%
}

// Confidence 62-97 (maps to 0.62-0.97 in user spec, integer in our schema)
function pickConfidence(i) {
  return 62 + ((i * 13 + 7) % 36); // 62..97
}

// Insert violations directly (no transaction wrapper - sql.js handles saves per-statement)
for (let i = 0; i < 214; i++) {
  // Spread over last 45 days with some clustering at recent dates
  const ageDays = Math.floor((hashInt(i, 1) / 1000) * 45);
  const ageHours = hashInt(i, 2) % 24;
  const dt = new Date(TODAY);
  dt.setDate(dt.getDate() - ageDays);
  dt.setHours(9 + ageHours % 10);

  const status = pickStatus(i, 214);
  const ward = WARDS[i % WARDS.length];
  const officerName = OFFICERS[i % OFFICERS.length];
  const officerId = userIds[officerName] || 1;
  const id = `#IW-${2847 + i}`;

  // Pick a ward-specific realistic address
  const wardAddrs = ADDRS_BY_WARD[ward] || ADDRS_BY_WARD["Koramangala"];
  const addr = wardAddrs[i % wardAddrs.length] + ", Bengaluru";

  // Generate lat/lng with small random offset within ward
  const [baseLat, baseLng] = WARD_COORDS[ward];
  const lat = baseLat + (((i * 7 + 3) % 100) - 50) * 0.0003;
  const lng = baseLng + (((i * 13 + 7) % 100) - 50) * 0.0003;

  insertViolation.run(
    id,
    addr,
    ward,
    `Ward ${68 + (i % 15)}`,
    VTYPES[i % VTYPES.length],
    fmtDate(dt),
    pickConfidence(i),
    status,
    officerId,
    PENALTIES[i % PENALTIES.length],
    180 + ((i * 37) % 540),
    parseFloat((2.1 + ((i * 9) % 31) / 10).toFixed(1)),
    `${47 + (i % 153)}/${1 + (i % 4)}`,
    OWNERS[i % OWNERS.length],
    ZONES[i % 5],
    APPROVED_YEARS[i % APPROVED_YEARS.length],
    lat,
    lng
  );

  // Add officer notes to a handful of early cases for realism
  if (i === 0) {
    insertNote.run(id, officerId, officerName, "Satellite imagery shows unauthorized 3rd floor addition. Owner notice delivered; awaiting response within statutory 7-day window.");
  } else if (i === 3) {
    insertNote.run(id, officerId, officerName, "Field inspection confirmed structural deviation from sanctioned plan. Property owner claims G+2 approval; records indicate G+1 only.");
  } else if (i === 7) {
    insertNote.run(id, officerId, officerName, "SWD encroachment verified — construction debris blocking natural drain. Escalating to Commissioner for stop-work order.");
  }
}

// ── SEED NOTICE TEMPLATES ────────────────────────────────────────────────────
const insertTemplate = db.prepare(`INSERT INTO notice_templates (name, body) VALUES (?, ?)`);

insertTemplate.run("Ward Level Notice", `NOTICE OF ILLEGAL CONSTRUCTION

Ref No.: {violation_id}
Date: {date}

To: {owner_name}
{address}

You are hereby directed to halt all unauthorized construction and submit valid permits within 7 days.

Penalty under BBMP Act Sec 321 may be imposed.

— Issued by BBMP Ward Office`);

insertTemplate.run("Commissioner Escalation", `ESCALATION TO COMMISSIONER

Ref: {violation_id} | Date: {date}

Re: Unresolved violation at {address}
Owner: {owner_name}

Despite Ward Notice, structure remains in violation. Commissioner intervention requested.

Prepared by: {officer_name}`);

insertTemplate.run("Court Filing Draft", `COURT FILING DRAFT

Case No.: {violation_id}
Date: {date}

Before: District Magistrate

Complainant: BBMP
vs.
Respondent: {owner_name}
{address}

Petition under Section 321, BBMP Act for demolition and recovery.`);

// ── SEED SETTINGS ────────────────────────────────────────────────────────────
const insertSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);

insertSetting.run('satellite_source', 'ISRO Bhuvan');
insertSetting.run('scan_frequency', 'Bi-weekly');
insertSetting.run('confidence_threshold', '85');
insertSetting.run('active_wards', JSON.stringify(WARDS.slice(0, 10)));
insertSetting.run('active_city', 'Bengaluru');

// ── SEED ACTIVITY LOGS ──────────────────────────────────────────────────────
const insertLog = db.prepare(`INSERT INTO activity_logs (message, type, user_id, violation_id, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))`);

const logs = [
  { m: "Satellite pass complete — Ward 68, 71, 72", ty: "info", ago: "-14 minutes" },
  { m: "Notice #IW-2851 generated — Koramangala", ty: "success", ago: "-18 minutes" },
  { m: "New violation flagged — HSR Layout Sector 3", ty: "warn", ago: "-23 minutes" },
  { m: "Officer Priya Menon reviewed #IW-2847", ty: "info", ago: "-30 minutes" },
  { m: "Permit DB sync complete — 2,841 records", ty: "success", ago: "-47 minutes" },
  { m: "Auto-flagged #IW-2863 — Whitefield 94%", ty: "warn", ago: "-56 minutes" },
  { m: "Commissioner escalation — Banashankari", ty: "warn", ago: "-67 minutes" },
  { m: "Field inspection assigned — Priya Menon", ty: "info", ago: "-77 minutes" },
  { m: "System boot — all modules operational", ty: "success", ago: "-2 hours" },
  { m: "Ward 72–76 scan queued", ty: "info", ago: "-3 hours" },
];

for (const l of logs) {
  insertLog.run(l.m, l.ty, 1, null, l.ago);
}

// ── SEED INTEGRATIONS (as settings) ─────────────────────────────────────────
insertSetting.run('integrations', JSON.stringify([
  { name: "BBMP Permit Database", status: "LIVE", lastSync: "2 hours ago", records: "2,841" },
  { name: "Revenue Dept API", status: "LIVE", lastSync: "4 hours ago", records: "12,487" },
  { name: "Email SMTP Gateway", status: "LIVE", lastSync: "6 min ago", records: "—" },
  { name: "Webhook Endpoint", status: "ERROR", lastSync: "6 hours ago", records: "—" },
]));

  console.log('✓ Database seeded successfully');
  console.log(`  - ${users.length} officers`);
  console.log('  - 214 violations');
  console.log('  - 3 notice templates');
  console.log(`  - ${logs.length} activity logs`);
  console.log('  - Settings configured');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email: admin@infrawatch.gov.in');
  console.log('  Password: infrawatch123');
  console.log('  (Or use OTP — code will print to server console)');

  return { users: users.length, violations: 214 };
} // end of _seedBody

// ── CLI entry point ────────────────────────────────────────────────────────
// Runs only if this file is invoked directly (e.g. `node db/seed.js` or `npm run seed`).
// Auto-seed from server/index.js imports runSeed() directly and skips this.
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMainModule || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed:', err);
      process.exit(1);
    });
}
