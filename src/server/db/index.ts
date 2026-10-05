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
    this.raw.exec(SCHEMA);
    // Dentro de una transacción, "transaction" anidada solo ejecuta la función.
    this.txView = {
      all: (s, p) => this.all(s, p),
      get: (s, p) => this.get(s, p),
      run: (s, p) => this.run(s, p),
      transaction: (fn) => fn(this.txView),
    };
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
