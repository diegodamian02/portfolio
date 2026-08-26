// Minimal Postgres logging: what got played, what search led to a pick, and
// who left a contact message. Owner-only records — nothing here is ever read
// back by the frontend; it exists for `railway connect Postgres` / the
// dashboard query console, not for an API route.
//
// GUARANTEE: every export in this file is safe to call whether or not
// DATABASE_URL is set. Locally, nobody runs Postgres — `npm run dev` has never
// needed it — so if the env var is missing every function below becomes a
// no-op that resolves immediately. Nothing in server.js branches on whether
// the database exists; it just calls these and moves on.
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';

// Small pool on purpose. This is a handful of inserts per visitor action, not
// a request-per-connection API — 3 connections is generous for that and stays
// well under whatever cap the Postgres plan has.
const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, max: 3 }) : null;

let schemaReady = null; // Promise, created once, memoized — see ensureSchema()

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS plays (
        id        BIGSERIAL PRIMARY KEY,
        at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        track_id  TEXT,
        title     TEXT,
        artist    TEXT,
        visitor   TEXT,
        country   TEXT,
        device    TEXT,
        browser   TEXT
    );
    CREATE TABLE IF NOT EXISTS search_clicks (
        id        BIGSERIAL PRIMARY KEY,
        at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        term      TEXT,
        track_id  TEXT,
        title     TEXT,
        artist    TEXT,
        visitor   TEXT,
        country   TEXT,
        device    TEXT,
        browser   TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
        id          BIGSERIAL PRIMARY KEY,
        at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        name        TEXT,
        email       TEXT,
        message     TEXT,
        resend_id   TEXT,
        delivered   BOOLEAN,
        visitor     TEXT,
        country     TEXT,
        device      TEXT,
        browser     TEXT
    );
`;

// Called lazily by the first write rather than at module load, so a server
// that never gets a single visitor action never opens a connection at all.
// Memoized so concurrent early requests share one CREATE TABLE run instead of
// racing each other.
function ensureSchema() {
    if (!pool) return Promise.resolve();
    if (!schemaReady) {
        schemaReady = pool.query(SCHEMA).catch((err) => {
            console.error('🚨 [db] schema setup failed:', err.message);
            schemaReady = null; // let the next write try again rather than wedge forever
            throw err;
        });
    }
    return schemaReady;
}

// The one rule every write in this file follows: never let a database problem
// become a visitor-facing failure. Every call site in server.js fires these
// without awaiting them before responding, and every one of them swallows its
// own errors — logged, not thrown.
async function safeWrite(label, fn) {
    if (!pool) return; // DATABASE_URL unset — see the guarantee above
    try {
        await ensureSchema();
        await fn();
    } catch (err) {
        console.error(`🚨 [db] ${label} insert failed:`, err.message);
    }
}

export function recordPlay({ trackId, title, artist, visitor, country, device, browser }) {
    return safeWrite('play', () => pool.query(
        `INSERT INTO plays (track_id, title, artist, visitor, country, device, browser)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [trackId, title, artist, visitor, country, device, browser],
    ));
}

export function recordSearchClick({ term, trackId, title, artist, visitor, country, device, browser }) {
    return safeWrite('search_click', () => pool.query(
        `INSERT INTO search_clicks (term, track_id, title, artist, visitor, country, device, browser)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [term, trackId, title, artist, visitor, country, device, browser],
    ));
}

export function recordMessage({ name, email, message, resendId, delivered, visitor, country, device, browser }) {
    return safeWrite('message', () => pool.query(
        `INSERT INTO messages (name, email, message, resend_id, delivered, visitor, country, device, browser)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [name, email, message, resendId, delivered, visitor, country, device, browser],
    ));
}
