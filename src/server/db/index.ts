import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "./schema.ts";

export type Param = string | number | null;
export type Row = Record<string, unknown>;

/**
 * Acceso a datos asíncrono. Hoy lo implementa SQLite (archivo local); para Hostinger se escribe otra
 * implementación con MySQL que respete esta misma interfaz y el resto del código no cambia.
 *
 * REGLA: dentro de `transaction` no se debe esperar nada de red ni de disco (solo consultas), para que
 * ninguna otra petición se cuele entre medias en la misma conexión.
 */
export interface Db {
  all<T = Row>(sql: string, params?: Param[]): Promise<T[]>;
  get<T = Row>(sql: string, params?: Param[]): Promise<T | undefined>;
  run(sql: string, params?: Param[]): Promise<{ changes: number }>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

class SqliteDb implements Db {
  private raw: DatabaseSync;
  private queue: Promise<unknown> = Promise.resolve();
  private txView: Db;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.raw = new DatabaseSync(path);
    // Espera hasta 5 s si otro proceso (un script, el panel) está escribiendo, en vez de fallar al instante.
    this.raw.exec("PRAGMA busy_timeout = 5000");
    // WAL: quien lee no bloquea a quien escribe.
    if (path !== ":memory:") this.raw.exec("PRAGMA journal_mode = WAL");
    this.dropOldSessions(); // antes del esquema: el índice nuevo necesita la columna class_id
    this.raw.exec(SCHEMA);
    this.addColumnIfMissing("orders", "attribution", "TEXT");
    // Curso terminado: la administración lo marca cuando la estudiante cumple todo (incluida la tesina presentada a Lila).
    this.addColumnIfMissing("enrollments", "completed_at", "TEXT");
    this.addColumnIfMissing("enrollments", "certificate_code", "TEXT");
    this.migrateToClasses();
    this.addColumnIfMissing("sessions", "lesson_id", "TEXT REFERENCES class_lessons (id) ON DELETE SET NULL");
    this.addColumnIfMissing("classes", "suggested_teacher_email", "TEXT");
    this.addColumnIfMissing("classes", "suggested_coteacher_emails", "TEXT");
    this.addColumnIfMissing("classes", "seed_key", "TEXT");
    this.addColumnIfMissing("classes", "is_event", "INTEGER NOT NULL DEFAULT 0");
    this.addColumnIfMissing("sessions", "cycle_id", "TEXT REFERENCES teacher_cycles (id) ON DELETE SET NULL");
    this.addColumnIfMissing("users", "can_grade", "INTEGER NOT NULL DEFAULT 1");
    this.raw.exec("CREATE UNIQUE INDEX IF NOT EXISTS classes_seed_key_idx ON classes (seed_key) WHERE seed_key IS NOT NULL");
    this.raw.exec("CREATE INDEX IF NOT EXISTS sessions_cycle_idx ON sessions (cycle_id)");
    // Dentro de una transacción, "transaction" anidada solo ejecuta la función.
    this.txView = {
      all: (s, p) => this.all(s, p),
      get: (s, p) => this.get(s, p),
      run: (s, p) => this.run(s, p),
      transaction: (fn) => fn(this.txView),
    };
  }

  /** Sesiones por cohorte (modelo anterior): se descartan junto con sus avisos; eran datos de demostración. */
  private dropOldSessions() {
    const cols = this.raw.prepare("PRAGMA table_info(sessions)").all() as { name: string }[];
    if (cols.length > 0 && !cols.some((c) => c.name === "class_id")) {
      this.raw.exec("PRAGMA foreign_keys = OFF");
      this.raw.exec("DROP TABLE IF EXISTS deliveries; DROP TABLE IF EXISTS notifications; DROP TABLE IF EXISTS session_changes; DROP TABLE IF EXISTS sessions;");
      this.raw.exec("PRAGMA foreign_keys = ON");
    }
  }

  private hasTable(name: string): boolean {
    return !!this.raw.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  }

  /**
   * Bases creadas antes de que las clases fueran propias de cada docente:
   *  - los temas del pensum pasan a ser clases (con su docente si ya tenían una) colocadas en su módulo;
   *  - las sesiones por cohorte se descartan antes (ver dropOldSessions).
   */
  private migrateToClasses() {
    if (this.hasTable("curriculum_topics")) {
      type Topic = { id: string; module_id: string; position: number; title: string; teacher_id: string | null; modality: string | null };
      const topics = this.raw
        .prepare(
          `SELECT t.id, t.module_id, t.position, t.title,
                  (SELECT tt.user_id FROM topic_teachers tt WHERE tt.topic_id = t.id ORDER BY tt.updated_at LIMIT 1) AS teacher_id,
                  (SELECT tt.modality FROM topic_teachers tt WHERE tt.topic_id = t.id ORDER BY tt.updated_at LIMIT 1) AS modality
           FROM curriculum_topics t ORDER BY t.module_id, t.position`,
        )
        .all() as Topic[];
      const now = new Date().toISOString();
      this.raw.exec("BEGIN");
      for (const t of topics) {
        const classId = crypto.randomUUID();
        this.raw.prepare("INSERT INTO classes (id, title, teacher_id, modality, created_at) VALUES (?, ?, ?, ?, ?)").run(classId, t.title, t.teacher_id, t.modality ?? "virtual", now);
        this.raw.prepare("INSERT INTO module_classes (id, module_id, class_id, position) VALUES (?, ?, ?, ?)").run(crypto.randomUUID(), t.module_id, classId, t.position);
      }
      this.raw.exec("DROP TABLE IF EXISTS topic_teachers; DROP TABLE IF EXISTS curriculum_topics; DROP TABLE IF EXISTS teacher_programs;");
      this.raw.exec("COMMIT");
    }
    if (this.hasTable("teacher_programs")) this.raw.exec("DROP TABLE teacher_programs");
  }

  /** Migración mínima: agrega una columna nueva a una tabla que ya existía en una base creada antes. */
  private addColumnIfMissing(table: string, column: string, ddl: string) {
    const cols = this.raw.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) this.raw.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }

  async all<T = Row>(sql: string, params: Param[] = []): Promise<T[]> {
    return this.raw.prepare(sql).all(...params) as unknown as T[];
  }

  async get<T = Row>(sql: string, params: Param[] = []): Promise<T | undefined> {
    return this.raw.prepare(sql).get(...params) as unknown as T | undefined;
  }

  async run(sql: string, params: Param[] = []): Promise<{ changes: number }> {
    const r = this.raw.prepare(sql).run(...params);
    return { changes: Number(r.changes) };
  }

  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    const exec = async () => {
      this.raw.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn(this.txView);
        this.raw.exec("COMMIT");
        return result;
      } catch (e) {
        this.raw.exec("ROLLBACK");
        throw e;
      }
    };
    const next = this.queue.then(exec, exec); // una transacción a la vez
    this.queue = next.catch(() => undefined);
    return next;
  }
}

export function openDb(path: string): Db {
  return new SqliteDb(path);
}

/** Base de datos del servidor. Se reutiliza entre recargas en desarrollo. */
export function getDb(): Db {
  const g = globalThis as typeof globalThis & { __fullnessDb?: Db };
  g.__fullnessDb ??= openDb(process.env.FULLNESS_DB_PATH ?? "data/fullness.sqlite");
  return g.__fullnessDb;
}

export const newId = (): string => crypto.randomUUID();
export const nowIso = (): string => new Date().toISOString();
