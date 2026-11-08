import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { Pool } from "pg";

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  isPostgres(): boolean;
}

export function toPostgresSql(sql: string): string {
  let paramIndex = 0;
  // Replace ? placeholders with $1, $2, etc., but not if escaped
  return sql.replace(/\?/g, () => `$${++paramIndex}`);
}

function loadSqliteDatabaseSync(): any {
  try {
    const req = eval("require");
    const nodeSqlite = req("node:sqlite");
    if (nodeSqlite && nodeSqlite.DatabaseSync) {
      return nodeSqlite.DatabaseSync;
    }
  } catch {}
  return null;
}

class PostgresDatabase implements IDatabase {
  private pool: Pool;
  private schemaApplied = false;

  constructor(connectionString: string) {
    const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

    let sslConfig: any = false;
    if (!isLocal) {
      if (process.env.PG_CA_CERT) {
        sslConfig = {
          ca: process.env.PG_CA_CERT,
          rejectUnauthorized: true,
        };
      } else if (process.env.PGSSLMODE === "disable") {
        sslConfig = false;
      } else {
        sslConfig = {
          rejectUnauthorized: process.env.PG_REJECT_UNAUTHORIZED !== "false",
        };
      }
    }

    this.pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }

  isPostgres(): boolean {
    return true;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaApplied) return;
    const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, "utf-8");
      // Clean SQLite-specific keywords for Postgres if needed, or run statements
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const client = await this.pool.connect();
      try {
        for (const statement of statements) {
          // Normalize SQLite "INSERT OR IGNORE" to PostgreSQL "ON CONFLICT DO NOTHING"
          let pgStatement = statement;
          if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(pgStatement)) {
            pgStatement = pgStatement.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO") + " ON CONFLICT DO NOTHING";
          }
          try {
            await client.query(pgStatement);
          } catch (err: any) {
            // Ignore already exists errors
            if (!err.message?.includes("already exists") && !err.message?.includes("duplicate key")) {
              console.warn("Schema initialization statement warning:", err.message);
            }
          }
        }
      } finally {
        client.release();
      }
    }
    this.schemaApplied = true;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    await this.ensureSchema();
    const pgSql = toPostgresSql(sql);
    const res = await this.pool.query(pgSql, params);
    return res.rows as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    await this.ensureSchema();
    const pgSql = toPostgresSql(sql);
    const res = await this.pool.query(pgSql, params);
    return { changes: res.rowCount ?? 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class SqliteDatabase implements IDatabase {
  private db: any;
  private schemaApplied = false;

  constructor(dbPath: string) {
    const DatabaseSync = loadSqliteDatabaseSync();
    if (!DatabaseSync) {
      throw new Error(
        "Node.js built-in 'node:sqlite' DatabaseSync is not available in this Node runtime. Please use Node.js 22+."
      );
    }
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    try {
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA busy_timeout = 15000;");
    } catch {}
  }

  isPostgres(): boolean {
    return false;
  }

  private ensureSchema(): void {
    if (this.schemaApplied) return;
    try {
      const check = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trainings'").get();
      if (check) {
        // Garantizar existencia de tablas nuevas agregadas en H031
        const checkIdentities = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_auth_identities'").get();
        if (!checkIdentities) {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_auth_identities (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              provider TEXT NOT NULL,
              provider_subject TEXT NOT NULL,
              provider_email TEXT NOT NULL,
              created_at TEXT NOT NULL,
              last_login_at TEXT NOT NULL,
              UNIQUE(provider, provider_subject)
            );
            CREATE INDEX IF NOT EXISTS idx_user_auth_identities_user_id ON user_auth_identities(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_auth_identities_provider_subject ON user_auth_identities(provider, provider_subject);
            CREATE INDEX IF NOT EXISTS idx_user_auth_identities_provider_email ON user_auth_identities(provider, provider_email);
          `);
        }
        this.schemaApplied = true;
        return;
      }
    } catch {}

    const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, "utf-8");
      try {
        this.db.exec(sql);
      } catch (err: any) {
        if (!err.message?.includes("already exists") && !err.message?.includes("database is locked")) {
          throw err;
        }
      }
    }
    this.schemaApplied = true;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    this.ensureSchema();
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    this.ensureSchema();
    const stmt = this.db.prepare(sql);
    const res = stmt.get(...params);
    return (res as T) ?? null;
  }

  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    this.ensureSchema();
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return { changes: Number(result.changes ?? 0) };
  }

  async exec(sql: string): Promise<void> {
    this.ensureSchema();
    this.db.exec(sql);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }
}

let dbInstance: IDatabase | null = null;

export function getDatabase(): IDatabase {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.trim().length > 0) {
    dbInstance = new PostgresDatabase(databaseUrl);
    return dbInstance;
  }

  const defaultDbPath = path.join(process.cwd(), "data", "daom_learning.db");
  dbInstance = new SqliteDatabase(defaultDbPath);
  return dbInstance;
}

export function resetDatabaseInstance(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}
