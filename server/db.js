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

// ─────────────────────────────────────────────────────────────────────────────
// Read side — powers the owner-only /admin dashboard (server.js). Nothing here
// is ever reached by a visitor request. Same guarantee as the writes above:
// with DATABASE_URL unset, every function resolves to an empty result rather
// than throwing, so the dashboard renders a blank state instead of a 500.
// ─────────────────────────────────────────────────────────────────────────────

// Read mirror of safeWrite: returns `fallback` when there's no pool or the
// query fails (logged, never thrown).
async function safeRead(label, fn, fallback) {
    if (!pool) return fallback;
    try {
        await ensureSchema();
        return await fn();
    } catch (err) {
        console.error(`🚨 [db] ${label} read failed:`, err.message);
        return fallback;
    }
}

// Every windowed query shares this clause. `$1` is the window in days, or NULL
// for "all time" — kept as one reused placeholder so each query is a single
// parameter plus its own limit.
const SINCE = `($1::int IS NULL OR at >= now() - make_interval(days => $1::int))`;

// track_id / country / title can all be NULL or '' on older rows — collapse to
// something printable at the query boundary so the renderer never has to.
const TRACK_LABEL = `coalesce(nullif(title, ''), track_id, '(unknown track)')`;

async function summary(sinceDays) {
    const { rows } = await pool.query(
        `SELECT
             (SELECT count(*)               FROM plays         WHERE ${SINCE})::int AS plays,
             (SELECT count(DISTINCT visitor) FROM plays         WHERE ${SINCE})::int AS listeners,
             (SELECT count(*)               FROM search_clicks WHERE ${SINCE})::int AS searches,
             -- notes are rare and always wanted in full, so this one isn't
             -- windowed — it matches the (also unwindowed) notes section below.
             (SELECT count(*) FROM messages)::int AS messages,
             (SELECT min(at) FROM plays) AS "firstAt",
             (SELECT max(at) FROM plays) AS "lastAt"`,
        [sinceDays],
    );
    return rows[0];
}

// Daily play counts, bucketed in the viewer's timezone, densified in JS so the
// chart has one entry per day across the whole window (gaps rendered as 0).
async function playsByDay({ sinceDays, tz }) {
    const { rows } = await pool.query(
        `SELECT to_char(date_trunc('day', at AT TIME ZONE $2), 'YYYY-MM-DD') AS day,
                count(*)::int AS count
         FROM plays
         WHERE ${SINCE}
         GROUP BY 1
         ORDER BY 1`,
        [sinceDays, tz],
    );
    return densifyDays(rows, sinceDays, tz);
}

function ymdInTz(date, tz) {
    return date.toLocaleDateString('en-CA', { timeZone: tz }); // 'YYYY-MM-DD'
}
function addDays(ymd, n) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}
function densifyDays(rows, sinceDays, tz) {
    const counts = new Map(rows.map((r) => [r.day, r.count]));
    const end = ymdInTz(new Date(), tz);
    // All-time: start at the first day that has data (capped so a very old
    // first row can't produce thousands of bars). Windowed: exactly N days.
    const span = sinceDays || 180;
    let start = addDays(end, -(span - 1));
    if (!sinceDays && rows.length && rows[0].day > start) start = rows[0].day;
    const out = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push({ day: d, count: counts.get(d) || 0 });
    return out;
}

async function topTracks({ sinceDays, limit }) {
    const { rows } = await pool.query(
        `SELECT track_id AS "trackId",
                coalesce(nullif(max(title), ''), track_id, '(unknown track)') AS title,
                max(artist) AS artist,
                count(*)::int AS plays,
                count(DISTINCT visitor)::int AS listeners
         FROM plays
         WHERE ${SINCE} AND track_id IS NOT NULL
         GROUP BY track_id
         ORDER BY plays DESC, listeners DESC
         LIMIT $2`,
        [sinceDays, limit],
    );
    return rows;
}

// One row per visitor hash: who they are (coarse), when they were around, and
// the ordered list of what they played — the "what song by what user" view.
async function listeners({ sinceDays, limit }) {
    const { rows } = await pool.query(
        `SELECT visitor,
                max(country) AS country,
                max(device)  AS device,
                max(browser) AS browser,
                min(at) AS "firstAt",
                max(at) AS "lastAt",
                count(*)::int AS plays,
                (array_agg(${TRACK_LABEL} ORDER BY at))[1:25] AS tracks
         FROM plays
         WHERE ${SINCE}
         GROUP BY visitor
         ORDER BY max(at) DESC
         LIMIT $2`,
        [sinceDays, limit],
    );
    return rows;
}

async function topSearches({ sinceDays, limit }) {
    const { rows } = await pool.query(
        `SELECT term,
                count(*)::int AS clicks,
                count(DISTINCT visitor)::int AS searchers,
                (array_agg(DISTINCT ${TRACK_LABEL}))[1:6] AS picked
         FROM search_clicks
         WHERE ${SINCE}
         GROUP BY term
         ORDER BY clicks DESC
         LIMIT $2`,
        [sinceDays, limit],
    );
    return rows;
}

// Not windowed — the owner always wants every note, however old.
async function messages({ limit }) {
    const { rows } = await pool.query(
        `SELECT id, at, name, email, message, delivered,
                resend_id AS "resendId", country, device, browser
         FROM messages
         ORDER BY at DESC
         LIMIT $1`,
        [limit],
    );
    return rows;
}

// column is whitelisted by the caller, never interpolated from a request.
async function breakdown({ sinceDays, column }) {
    const col = { device: 'device', country: 'country', browser: 'browser' }[column];
    if (!col) return [];
    const { rows } = await pool.query(
        `SELECT coalesce(nullif(${col}, ''), '—') AS key, count(*)::int AS count
         FROM plays
         WHERE ${SINCE}
         GROUP BY 1
         ORDER BY count DESC
         LIMIT 15`,
        [sinceDays],
    );
    return rows;
}

const EMPTY_DASHBOARD = {
    summary: { plays: 0, listeners: 0, messages: 0, searches: 0, firstAt: null, lastAt: null },
    playsByDay: [],
    topTracks: [],
    listeners: [],
    topSearches: [],
    messages: [],
    devices: [],
    countries: [],
};

// One call, all eight queries in parallel, one object back. `sinceDays` null =
// all time; `tz` is an IANA name already validated by the caller.
export function getDashboard({ sinceDays, tz }) {
    return safeRead('dashboard', async () => {
        const [
            summaryRow, playsByDayRows, topTrackRows, listenerRows,
            topSearchRows, messageRows, deviceRows, countryRows,
        ] = await Promise.all([
            summary(sinceDays),
            playsByDay({ sinceDays, tz }),
            topTracks({ sinceDays, limit: 15 }),
            listeners({ sinceDays, limit: 50 }),
            topSearches({ sinceDays, limit: 15 }),
            messages({ limit: 100 }),
            breakdown({ sinceDays, column: 'device' }),
            breakdown({ sinceDays, column: 'country' }),
        ]);
        return {
            summary: summaryRow,
            playsByDay: playsByDayRows,
            topTracks: topTrackRows,
            listeners: listenerRows,
            topSearches: topSearchRows,
            messages: messageRows,
            devices: deviceRows,
            countries: countryRows,
        };
    }, EMPTY_DASHBOARD);
}
