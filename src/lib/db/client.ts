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
    
      // Garantizar que la cuenta de administrador principal sea daom.weightlifting@gmail.com en Postgres
      try {
        await this.pool.query("UPDATE users SET role = 'ADMIN' WHERE LOWER(email) = 'daom.weightlifting@gmail.com'");
      } catch (err) {
        console.warn("Error reconciliando rol ADMIN en Postgres:", err);
      }

      // Garantizar columna google_meet_url en Postgres
      try {
        await this.pool.query("ALTER TABLE training_editions ADD COLUMN IF NOT EXISTS google_meet_url TEXT");
      } catch (err) {
        // Ignorar si ya existe
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
      // Garantizar que la cuenta de administrador principal sea daom.weightlifting@gmail.com (DAOM-LEARNING-RECOVERY-02)
      try {
        const existingTarget = this.db.prepare("SELECT id FROM users WHERE LOWER(email) = 'daom.weightlifting@gmail.com'").get();
        if (!existingTarget) {
          const legacyAdmin = this.db.prepare("SELECT id FROM users WHERE email = 'admin@daom-weightlifting.com' AND role = 'ADMIN'").get();
          if (legacyAdmin) {
            this.db.prepare("UPDATE users SET email = 'daom.weightlifting@gmail.com', full_name = 'Equipo Directivo DAOM (Admin)' WHERE id = ?").run(legacyAdmin.id);
          }
        }
      } catch {}
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

        // Garantizar columna stage en material_assets (DAOM-LEARNING-CAMPUS-01)
        try {
          const matCols = this.db.prepare("PRAGMA table_info(material_assets)").all();
          const hasStage = matCols.some((c: any) => c.name === "stage");
          if (!hasStage) {
            this.db.exec("ALTER TABLE material_assets ADD COLUMN stage TEXT NOT NULL DEFAULT 'before'");
          }
        } catch {}

        // Garantizar columna whatsapp_group_url en training_editions (DAOM-LEARNING-MANUAL-ENROLLMENTS-01)
        try {
          const editionCols = this.db.prepare("PRAGMA table_info(training_editions)").all();
          const hasWhatsappCol = editionCols.some((c: any) => c.name === "whatsapp_group_url");
          if (!hasWhatsappCol) {
            this.db.exec("ALTER TABLE training_editions ADD COLUMN whatsapp_group_url TEXT");
          }
        } catch {}

        // Garantizar tabla password_recovery_tokens (DAOM-LEARNING-CAMPUS-01)
        try {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS password_recovery_tokens (
              token_id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              token_hash TEXT NOT NULL UNIQUE,
              expires_at TEXT NOT NULL,
              used_at TEXT,
              revoked_at TEXT,
              created_by TEXT NOT NULL DEFAULT 'LOCAL_ADMIN_CLI',
              created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_recovery_tokens_user ON password_recovery_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_recovery_tokens_hash ON password_recovery_tokens(token_hash);
          `);
        } catch {}

        // Garantizar columna google_meet_url en training_editions
        try {
          const editionCols = this.db.prepare("PRAGMA table_info(training_editions)").all();
          const hasMeet = editionCols.some((c: any) => c.name === "google_meet_url");
          if (!hasMeet) {
            this.db.exec("ALTER TABLE training_editions ADD COLUMN google_meet_url TEXT");
          }
        } catch {}

        // Garantizar tabla scholarships (DAOM-LEARNING-ADMIN-2.0)
        try {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS scholarships (
              id TEXT PRIMARY KEY,
              enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              capacitacion_id TEXT NOT NULL REFERENCES trainings(capacitacion_id),
              oferta_id TEXT REFERENCES training_editions(oferta_id),
              percentage NUMERIC NOT NULL,
              original_amount NUMERIC NOT NULL,
              discounted_amount NUMERIC NOT NULL,
              remaining_amount NUMERIC NOT NULL,
              currency TEXT NOT NULL DEFAULT 'ARS',
              granted_by TEXT NOT NULL,
              reason TEXT,
              created_at TEXT NOT NULL,
              UNIQUE(enrollment_id)
            );
            CREATE INDEX IF NOT EXISTS idx_scholarships_user ON scholarships(user_id);
            CREATE INDEX IF NOT EXISTS idx_scholarships_enrollment ON scholarships(enrollment_id);
            CREATE INDEX IF NOT EXISTS idx_scholarships_capacitacion ON scholarships(capacitacion_id);
          `);
        } catch {}
        // Garantizar tablas académicas 2.0 (DAOM-LEARNING-2.0-ACADEMIC-ENGINE)
        try {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS jornadas (
              id TEXT PRIMARY KEY,
              capacitacion_id TEXT NOT NULL REFERENCES trainings(capacitacion_id) ON DELETE CASCADE,
              oferta_id TEXT REFERENCES training_editions(oferta_id) ON DELETE CASCADE,
              nombre TEXT NOT NULL,
              descripcion TEXT,
              modalidad TEXT NOT NULL DEFAULT 'presencial',
              precio_individual NUMERIC NOT NULL DEFAULT 0,
              cupo_independiente INTEGER NOT NULL DEFAULT 0,
              cupos_ocupados INTEGER NOT NULL DEFAULT 0,
              orden INTEGER NOT NULL DEFAULT 0,
              is_active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS encuentros (
              id TEXT PRIMARY KEY,
              jornada_id TEXT NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
              capacitacion_id TEXT NOT NULL REFERENCES trainings(capacitacion_id) ON DELETE CASCADE,
              nombre TEXT NOT NULL,
              contenido TEXT,
              fecha TEXT NOT NULL,
              hora_inicio TEXT NOT NULL,
              hora_fin TEXT NOT NULL,
              zona_horaria TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
              duracion_horas NUMERIC NOT NULL DEFAULT 1.0,
              modalidad TEXT NOT NULL DEFAULT 'presencial',
              ubicacion_fisica TEXT,
              google_calendar_event_id TEXT,
              google_meet_url TEXT,
              attendance_qr_token TEXT NOT NULL,
              attendance_code TEXT NOT NULL,
              attendance_valid_until TEXT NOT NULL,
              orden INTEGER NOT NULL DEFAULT 0,
              is_active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS encuentro_attendances (
              id TEXT PRIMARY KEY,
              encuentro_id TEXT NOT NULL REFERENCES encuentros(id) ON DELETE CASCADE,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
              method TEXT NOT NULL,
              attended_at TEXT NOT NULL,
              verified_by TEXT,
              notes TEXT,
              created_at TEXT NOT NULL,
              UNIQUE(encuentro_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS enrollment_jornadas (
              id TEXT PRIMARY KEY,
              enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
              jornada_id TEXT NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
              price_paid NUMERIC NOT NULL DEFAULT 0,
              is_package INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              UNIQUE(enrollment_id, jornada_id)
            );
            CREATE TABLE IF NOT EXISTS waitlists (
              id TEXT PRIMARY KEY,
              jornada_id TEXT NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              is_package_wait INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL DEFAULT 'waiting',
              reserved_until TEXT,
              notified_at TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              UNIQUE(jornada_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS encuentro_recoveries (
              id TEXT PRIMARY KEY,
              original_encuentro_id TEXT NOT NULL REFERENCES encuentros(id) ON DELETE CASCADE,
              target_encuentro_id TEXT NOT NULL REFERENCES encuentros(id) ON DELETE CASCADE,
              user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              enrollment_id TEXT NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
              authorized_by TEXT NOT NULL,
              is_attended INTEGER NOT NULL DEFAULT 0,
              attended_at TEXT,
              reason TEXT,
              created_at TEXT NOT NULL,
              UNIQUE(target_encuentro_id, user_id)
            );
          `);
        } catch {}

        // Garantizar columnas en certificates (horas_certificadas, version, etc.)
        try {
          const certCols = this.db.prepare("PRAGMA table_info(certificates)").all();
          const hasHoras = certCols.some((c: any) => c.name === "horas_certificadas");
          if (!hasHoras) {
            this.db.exec("ALTER TABLE certificates ADD COLUMN horas_certificadas NUMERIC DEFAULT 0");
            this.db.exec("ALTER TABLE certificates ADD COLUMN jornadas_acreditadas TEXT");
            this.db.exec("ALTER TABLE certificates ADD COLUMN encuentros_acreditados_count INTEGER DEFAULT 0");
            this.db.exec("ALTER TABLE certificates ADD COLUMN version INTEGER DEFAULT 1");
          }
        } catch {}

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
