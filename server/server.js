import express from 'express';  // Import express
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import querystring from 'querystring';
import crypto from 'crypto';

// Initialize express app
const app = express();  // <-- Here you initialize the app

dotenv.config();

// Spotify Credentials from environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const PORT = process.env.PORT || 5050;
// No hardcoded prod fallback here on purpose — BACKEND_BASE_URL must be set explicitly
// via the platform's env vars (Railway, etc.) in every real deployment.
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || `http://localhost:${PORT}`;

let accessToken = '';
let refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || '';
let accessTokenExpiration = 0; // In seconds (Unix timestamp)
let pendingOAuthState = null; // Set per /login attempt, checked once in /callback

// Refresh a little before actual expiry (Spotify access tokens last ~1hr) so
// an in-flight request can't land on a token that expires mid-request.
const TOKEN_EXPIRY_BUFFER_SECONDS = 60;

// === Spotify integration: architecture note ===
// This app has exactly ONE Spotify identity: the site owner's. Visitors never
// authenticate, never see a Spotify consent screen, and never hold a token —
// they only ever receive the owner's already-fetched top-tracks/top-artists
// JSON as read-only display content for the #my-taste section. `/login` is a
// manual, owner-only tool for minting/renewing SPOTIFY_REFRESH_TOKEN; it is
// gated below and must never be linked to from anything visitor-facing.
// (iTunes, by contrast, powers the turntable hero and is public/per-visitor
// with no auth at all — see README.md for the full split.)
const LOGIN_SECRET = process.env.SPOTIFY_LOGIN_SECRET || '';

function isAuthorizedLoginRequest(req) {
    if (!LOGIN_SECRET) return true; // unset (e.g. local dev) — leave the route open
    const given = Buffer.from(String(req.query.key || ''));
    const expected = Buffer.from(LOGIN_SECRET);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Top-tracks/top-artists change slowly — cache responses so a burst of
// visitors doesn't spend the shared rate-limit bucket on identical data.
const SPOTIFY_DATA_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
const spotifyDataCache = new Map(); // `${type}:${time_range}` -> { items, expiresAt }
const VALID_TIME_RANGES = new Set(['short_term', 'medium_term', 'long_term']);

// Comma-separated ALLOWED_ORIGINS env var overrides these defaults — handy while
// cutting over DNS (e.g. temporarily allowing a *.up.railway.app preview origin)
// without a code change/redeploy.
const DEFAULT_ALLOWED_ORIGINS = [
    'https://diegodamian.com',
    'https://www.diegodamian.com',
    'http://localhost:5173',
];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : DEFAULT_ALLOWED_ORIGINS;

app.use(cors({ origin: ALLOWED_ORIGINS }));

// Spotify authentication flow — owner-only, see architecture note above.
app.get('/login', (req, res) => {
    if (!isAuthorizedLoginRequest(req)) {
        return res.status(404).end(); // don't hint that this route exists
    }

    const scope = 'user-top-read';  // Permission to access user's top tracks and artists
    // A random, single-use value per attempt — the whole point of the OAuth
    // `state` param is CSRF protection, which a hardcoded literal doesn't
    // actually provide (an attacker would just know it in advance).
    pendingOAuthState = crypto.randomBytes(16).toString('hex');

    const authUrl = `https://accounts.spotify.com/authorize?` +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            scope: scope,
            state: pendingOAuthState,
        });

    res.redirect(authUrl);
});

// Callback to handle the response from Spotify OAuth
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;

    if (!state || !pendingOAuthState || state !== pendingOAuthState) {
        return res.status(400).send('State mismatch');
    }
    pendingOAuthState = null; // one-time use

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token || refreshToken;
        accessTokenExpiration = Math.floor(Date.now() / 1000) + 3600; // Set expiration time (1 hour)

        if (!refreshToken) {
            console.error('No refresh token received');
            return res.status(400).send('Refresh token missing');
        }

        console.log('✅ New Spotify Access Token:', accessToken);
        console.log('✅ New Refresh Token (store in SPOTIFY_REFRESH_TOKEN):', refreshToken);
        res.redirect(`${FRONTEND_BASE_URL}/about`);
    } catch (error) {
        console.error('🚨 Error during token exchange:', error.response?.data || error.message);
        res.status(500).send('Failed to get Spotify access token');
    }
});

// Refresh Access Token when expired
const refreshAccessToken = async () => {
    if (!refreshToken) {
        console.log('No refresh token available');
        return false;
    }

    try {
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        accessToken = response.data.access_token;
        accessTokenExpiration = Math.floor(Date.now() / 1000) + 3600; // Set expiration time (1 hour)
        console.log('✅ Access token refreshed:', accessToken);
        return true;
    } catch (error) {
        console.error('🚨 Error refreshing access token:', error.response?.data || error.message);
        return false;
    }
};

// Ensures a usable access token is cached, refreshing it if needed — the
// ONLY place a new access token gets requested from a normal data request.
// Cached in `accessToken` and reused across every visitor until it's within
// TOKEN_EXPIRY_BUFFER_SECONDS of expiring. Throws on failure; callers decide
// what to do (fetchTopItems below serves stale cached data instead of
// failing outright, which is why this isn't Express middleware anymore).
async function ensureAccessToken() {
    const currentTime = Math.floor(Date.now() / 1000);
    const needsRefresh = !accessToken || currentTime >= accessTokenExpiration - TOKEN_EXPIRY_BUFFER_SECONDS;

    if (needsRefresh) {
        console.log('🔄 Access token missing/near expiry, refreshing...');
        const refreshed = await refreshAccessToken();
        if (!refreshed || !accessToken) {
            // This log line is the only reason BACKEND_BASE_URL exists — the
            // owner reads server logs to find the re-auth URL. Visitors never
            // see this; it never reaches an HTTP response.
            console.error(`🚨 Spotify refresh failed — visit ${BACKEND_BASE_URL}/login?key=<SPOTIFY_LOGIN_SECRET> to re-authenticate.`);
            throw new Error('Spotify access token unavailable');
        }
    }
}

// Owner-only debug/health endpoint — not called by the frontend. Handy for
// manually checking "is the cached Spotify auth still alive?" without
// hitting the data endpoints (and their cache) directly.
app.get('/api/spotify/check-auth', async (req, res) => {
    try {
        await ensureAccessToken();
        res.json({ authenticated: true });
    } catch {
        res.status(401).json({ authenticated: false });
    }
});

// Shared fetch for both /me/top/tracks and /me/top/artists. Two layers of
// resilience, since every visitor reads the same owner's slow-changing data
// and nothing here should ever be able to break the #my-taste section for a
// visitor the way the old sign-in-redirect bug did:
//   1. A 20-minute cache — most requests never touch Spotify at all.
//   2. Stale-while-revalidate — if the cache is due for a refresh but the
//      live Spotify call fails (dead token, 429, network blip), keep
//      serving the last known-good data instead of erroring out. A visitor
//      only ever sees an error if there is truly no cached data yet (e.g.
//      right after a fresh deploy with a dead refresh token).
// Only these two "Get User's Top Items" endpoints are used anywhere in this
// file; see README.md for which other Spotify endpoints are safe vs.
// deprecated if you're extending this later.
async function fetchTopItems(type, timeRange) {
    const cacheKey = `${type}:${timeRange}`;
    const cached = spotifyDataCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.items;
    }

    try {
        await ensureAccessToken();
        const response = await axios.get(
            `${process.env.SPOTIFY_API_BASE_URL}/me/top/${type}?limit=5&time_range=${timeRange}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const items = response.data.items;
        spotifyDataCache.set(cacheKey, { items, expiresAt: Date.now() + SPOTIFY_DATA_CACHE_TTL_MS });
        return items;
    } catch (error) {
        if (cached) {
            console.error(`🚨 [spotify] live refresh failed for ${cacheKey}, serving stale cache:`, error.response?.status || error.message);
            return cached.items;
        }
        throw error;
    }
}

// Maps a failed Spotify call to a clean, visitor-safe response — no auth
// mechanics or internal error detail ever goes to the client. The real
// status (401 = dead refresh token, 403 = dev-mode/scope issue, 429 = rate
// limited, or a network failure) is always logged server-side, since that
// distinction only matters to whoever's reading the logs, not to a visitor.
function respondSpotifyError(error, res, label) {
    const status = error.response?.status;
    console.error(`🚨 [spotify] ${label} failed (status ${status ?? 'n/a'}):`, error.response?.data || error.message);
    res.status(503).json({ error: 'Spotify data is temporarily unavailable' });
}

function resolveTimeRange(value) {
    return VALID_TIME_RANGES.has(value) ? value : 'medium_term';
}

// Fetch top tracks
app.get('/api/spotify/top-tracks', async (req, res) => {
    try {
        const items = await fetchTopItems('tracks', resolveTimeRange(req.query.time_range));
        res.json(items);
    } catch (error) {
        respondSpotifyError(error, res, 'top tracks');
    }
});

// Fetch top artists
app.get('/api/spotify/top-artists', async (req, res) => {
    try {
        const items = await fetchTopItems('artists', resolveTimeRange(req.query.time_range));
        res.json(items);
    } catch (error) {
        respondSpotifyError(error, res, 'top artists');
    }
});

// iTunes preview-audio proxy — currently unused by the app. Probing (see
// commit "chore: validate iTunes CORS") confirmed the mzstatic.com preview
// CDN already sends access-control-allow-origin: *, so the turntable hero
// fetches preview audio directly and doesn't need this. Kept, host-locked,
// as the documented fallback if Apple ever tightens CORS on that CDN —
// don't delete as dead code without re-checking that first.
const ALLOWED_PROXY_HOSTS = [/(^|\.)mzstatic\.com$/, /(^|\.)itunes\.apple\.com$/];

function isAllowedProxyHost(hostname) {
    return ALLOWED_PROXY_HOSTS.some((re) => re.test(hostname));
}

app.get('/api/itunes/preview-proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url param' });

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid url' });
    }

    if (!isAllowedProxyHost(parsed.hostname)) {
        return res.status(403).json({ error: 'Host not allowed' });
    }

    try {
        const upstream = await axios.get(url, {
            responseType: 'stream',
            headers: req.headers.range ? { Range: req.headers.range } : {},
            validateStatus: () => true,
        });

        res.status(upstream.status);
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Content-Type', upstream.headers['content-type'] || 'audio/mp4');
        if (upstream.headers['content-length']) res.set('Content-Length', upstream.headers['content-length']);
        if (upstream.headers['accept-ranges']) res.set('Accept-Ranges', upstream.headers['accept-ranges']);
        if (upstream.headers['content-range']) res.set('Content-Range', upstream.headers['content-range']);

        upstream.data.pipe(res);
    } catch (error) {
        console.error('🚨 [preview-proxy] error:', error.message);
        res.status(502).json({ error: 'Upstream fetch failed' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
