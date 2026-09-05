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
    
    CREATE TABLE IF NOT EXISTS dj_members (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES dj_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_dj_members_session
      ON dj_members(session_id);

    CREATE TABLE IF NOT EXISTS dj_track_actions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      dj_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      track_uri TEXT NOT NULL,
      track_name TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES dj_sessions(id),
      FOREIGN KEY (dj_id) REFERENCES dj_members(id)
    );

    CREATE INDEX IF NOT EXISTS idx_dj_track_actions_session
      ON dj_track_actions(session_id);

    CREATE INDEX IF NOT EXISTS idx_dj_track_actions_track
      ON dj_track_actions(session_id, track_id);
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

export type DjMember = {
  id: string;
  sessionId: string;
  name: string;
  createdAt: number;
};

export type DjTrackAction = {
  id: string;
  sessionId: string;
  djId: string;
  trackId: string;
  trackUri: string;
  trackName: string;
  artistName: string;
  addedAt: number;
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

export function createDjMember(
  sessionId: string,
  name: string,
): DjMember {
  const database = getDatabase();

  const id = randomBytes(12).toString("base64url");
  const createdAt = Date.now();

  database
    .prepare(`
      INSERT INTO dj_members (
        id,
        session_id,
        name,
        created_at
      )
      VALUES (?, ?, ?, ?)
    `)
    .run(
      id,
      sessionId,
      name,
      createdAt,
    );

  return {
    id,
    sessionId,
    name,
    createdAt,
  };
}

export function getDjMember(
  sessionId: string,
  djId: string,
): DjMember | null {
  const database = getDatabase();

  const row = database
    .prepare(`
      SELECT
        id,
        session_id,
        name,
        created_at
      FROM dj_members
      WHERE id = ?
        AND session_id = ?
    `)
    .get(djId, sessionId) as
    | {
        id: string;
        session_id: string;
        name: string;
        created_at: number;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function createDjTrackAction(
  sessionId: string,
  djId: string,
  track: {
    id: string;
    uri: string;
    name: string;
    artists: string[];
  },
): DjTrackAction {
  const database = getDatabase();

  const id = randomBytes(12).toString("base64url");
  const addedAt = Date.now();

  database
    .prepare(`
      INSERT INTO dj_track_actions (
        id,
        session_id,
        dj_id,
        track_id,
        track_uri,
        track_name,
        artist_name,
        added_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      sessionId,
      djId,
      track.id,
      track.uri,
      track.name,
      track.artists.join(", "),
      addedAt,
    );

  return {
    id,
    sessionId,
    djId,
    trackId: track.id,
    trackUri: track.uri,
    trackName: track.name,
    artistName: track.artists.join(", "),
    addedAt,
  };
}

function randomSessionId() {
  return randomBytes(18).toString("base64url");
}
