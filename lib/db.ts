import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";

const dbPath = path.join(process.cwd(), "data", "rundj.db");

let db: Database.Database | null = null;

function getDatabase() {
  if (db) return db;

  const fs = require("fs");
  const dataDir = path.dirname(dbPath);

  fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(dbPath);

  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS dj_sessions (
      id TEXT PRIMARY KEY,
      runner_id TEXT NOT NULL,
      spotify_session TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dj_sessions_runner
      ON dj_sessions(runner_id);

    CREATE INDEX IF NOT EXISTS idx_dj_sessions_expires
      ON dj_sessions(expires_at);
  `);

  return db;
}

export type DjSession = {
  id: string;
  runnerId: string;
  spotifySession: string;
  status: "active" | "ended";
  createdAt: number;
  expiresAt: number;
};

export function createDjSession(
  runnerId: string,
  spotifySession: string,
): DjSession {
  const database = getDatabase();

  const id = randomSessionId();

  const createdAt = Date.now();
  const expiresAt = createdAt + 3 * 60 * 60 * 1000;

  database
    .prepare(`
      INSERT INTO dj_sessions (
        id,
        runner_id,
        spotify_session,
        status,
        created_at,
        expires_at
      )
      VALUES (?, ?, ?, 'active', ?, ?)
    `)
    .run(
      id,
      runnerId,
      spotifySession,
      createdAt,
      expiresAt,
    );

  return {
    id,
    runnerId,
    spotifySession,
    status: "active",
    createdAt,
    expiresAt,
  };
}

export function getDjSession(id: string): DjSession | null {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT
        id,
        runner_id,
        spotify_session,
        status,
        created_at,
        expires_at
      FROM dj_sessions
      WHERE id = ?
    `)
    .get(id) as
    | {
        id: string;
        runner_id: string;
        spotify_session: string;
        status: "active" | "ended";
        created_at: number;
        expires_at: number;
      }
    | undefined;

  if (!row) return null;

  if (row.status !== "active") return null;

  if (row.expires_at <= Date.now()) {
    database
      .prepare(`
        UPDATE dj_sessions
        SET status = 'ended'
        WHERE id = ?
      `)
      .run(id);

    return null;
  }

  return {
    id: row.id,
    runnerId: row.runner_id,
    spotifySession: row.spotify_session,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function endDjSession(id: string) {
  const database = getDatabase();

  database
    .prepare(`
      UPDATE dj_sessions
      SET status = 'ended'
      WHERE id = ?
    `)
    .run(id);
}

function randomSessionId() {
  return randomBytes(18).toString("base64url");
}