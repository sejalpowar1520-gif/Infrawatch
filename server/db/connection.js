import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'infrawatch.db');

let db = null;
let SQL = null;

// Wrapper to mimic better-sqlite3 API
class DbWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  exec(sql) {
    this._db.exec(sql);
    this._save();
  }

  pragma(pragmaStr) {
    try {
      this._db.run(`PRAGMA ${pragmaStr}`);
    } catch (e) {
      // Ignore pragma errors for WAL mode (not supported in sql.js)
    }
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        self._save();
        const lastId = self._db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0;
        const changes = self._db.getRowsModified();
        return { lastInsertRowid: lastId, changes };
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
      bind() { return this; }
    };
  }

  transaction(fn) {
    const self = this;
    return function(...args) {
      self._db.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self._db.exec('COMMIT');
        self._save();
        return result;
      } catch (e) {
        try { self._db.exec('ROLLBACK'); } catch (_) { /* already rolled back */ }
        throw e;
      }
    };
  }

  _save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export async function initDb() {
  if (db) return db;
  
  SQL = await initSqlJs();
  
  let sqlDb;
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }
  
  db = new DbWrapper(sqlDb);
  db.pragma('foreign_keys = ON');

  // Run schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  // Lightweight migrations
  ensureColumn(db, 'notices', 'ai_generated', 'INTEGER DEFAULT 0');
  ensureColumn(db, 'notices', 'ai_provider', 'TEXT');
  ensureColumn(db, 'notices', 'ai_model', 'TEXT');
  
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}
