import express from 'express';  // Import express
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import querystring from 'querystring';
import crypto from 'crypto';
import { Resend } from 'resend';
import { recordPlay, recordSearchClick, recordMessage } from './db.js';
import { visitorContext } from './visitor.js';

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

// Needed for the contact form's POST body — nothing parsed JSON before this,
// so req.body was undefined on any POST. The cap is deliberately tiny: the
// only body this server accepts is a three-field contact form.
app.use(express.json({ limit: '10kb' }));

// Cloudflare -> Railway -> here, so the socket address is always a proxy's.
// Without this, express's req.ip is the proxy and every visitor would share
// one rate-limit bucket. See clientIp() below for why CF-Connecting-IP is
// still preferred over the X-Forwarded-For chain this enables.
app.set('trust proxy', true);

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

// Get Current User's Profile — new endpoint for this project (Stage 4 Task
// 3.9), everything above this line was /me/top/{type} only. Same account,
// same token, same ensureAccessToken()/spotifyDataCache mechanism as
// fetchTopItems — reusing rather than standing up a second auth path. Cache
// key "profile" has no time_range component (this endpoint doesn't take one).
//
// Scope check, done live against the real API rather than assumed from
// docs: this project's authorization scope (above) is 'user-top-read' only,
// added for the two top-items endpoints. Spotify's own docs for Get Current
// User's Profile say email needs user-read-email and country/product needs
// user-read-private — silent on whether `images` needs anything at all,
// which reads as "it doesn't," but confirmed by actually calling this route
// against the live refresh token before wiring up the frontend: 200, with a
// populated images[], on the existing user-top-read-only scope. No scope
// change needed.
async function fetchProfile() {
    const cacheKey = 'profile';
    const cached = spotifyDataCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.items;
    }

    try {
        await ensureAccessToken();
        const response = await axios.get(
            `${process.env.SPOTIFY_API_BASE_URL}/me`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const items = response.data;
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

// Fetch profile (avatar) — only the piece #my-taste's kicker actually needs
// (images[]) is exposed, not the full /me payload (email, country, product
// etc. — none of it visitor-facing, no reason to forward it past this route).
app.get('/api/spotify/profile', async (req, res) => {
    try {
        const profile = await fetchProfile();
        res.json({ images: profile.images || [] });
    } catch (error) {
        respondSpotifyError(error, res, 'profile');
    }
});

// === Contact form ===
// Visitor-facing and unauthenticated, which drives every decision here:
//   1. It must never silently succeed. The previous implementation alert()ed
//      "thank you" *before* firing the request, at a Heroku endpoint that had
//      been dead since the free tier ended — every message sent through it was
//      lost, and the sender was told it worked.
//   2. It must not be usable as an open spam relay (honeypot + rate limit).
//   3. Replying must be one click, so the visitor's address goes in replyTo.
//
// Delivery goes over Resend's HTTPS API rather than SMTP, and that is not a
// preference — Railway blocks outbound SMTP (ports 25/465/587/2525) on every
// plan below Pro, so a Nodemailer transport hangs until the request times out
// and Cloudflare returns its own 502. See:
// https://docs.railway.com/networking/outbound-networking
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// Resend's sandbox sender needs no domain verification. Its one restriction —
// it can only deliver to the Resend account owner's own address — happens to
// be exactly this form's delivery model, so no verified-domain slot is spent.
// Override with a verified domain sender if that ever changes.
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev';

// While the sandbox sender above is in use this MUST be the Resend account
// owner's own address — it is the only address Resend will deliver to, and a
// mismatch is rejected rather than silently dropped. Defaulted here so it's
// one less env var to forget on a fresh deploy. Once send.diegodamian.com is
// verified this restriction lifts and it can be any address.
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'diegodamiango02@gmail.com';

const CONTACT_MAX = { name: 100, email: 254, message: 5000 };
const CONTACT_RATE_MAX = 5;
const CONTACT_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const contactAttempts = new Map(); // ip -> timestamp[]

// Bounded so a long-running instance can't accumulate an entry per unique IP
// forever. unref() so this timer never holds the process open on its own.
setInterval(() => {
    const cutoff = Date.now() - CONTACT_RATE_WINDOW_MS;
    for (const [ip, hits] of contactAttempts) {
        const live = hits.filter((t) => t > cutoff);
        if (live.length) contactAttempts.set(ip, live);
        else contactAttempts.delete(ip);
    }
}, CONTACT_RATE_WINDOW_MS).unref();

let resendClient = null;
function getResend() {
    if (!resendClient) resendClient = new Resend(RESEND_API_KEY);
    return resendClient;
}

// Cloudflare sets CF-Connecting-IP itself and strips any inbound copy, so it's
// trustworthy here in a way a raw X-Forwarded-For chain isn't — the Railway
// *.up.railway.app origin is still directly reachable, so a spoofed XFF could
// otherwise let someone dodge the rate limit.
function clientIp(req) {
    return req.get('CF-Connecting-IP') || req.ip || 'unknown';
}

// Read-only check. Deliberately does NOT record the attempt: a visitor who
// mistypes their email five times would otherwise be locked out for an hour
// without ever having sent a message. Pruning expired hits here doubles as
// the per-IP cleanup, and never creates an entry for an unseen IP.
function isRateLimited(ip) {
    const cutoff = Date.now() - CONTACT_RATE_WINDOW_MS;
    const hits = (contactAttempts.get(ip) || []).filter((t) => t > cutoff);
    if (hits.length) contactAttempts.set(ip, hits);
    else contactAttempts.delete(ip);
    return hits.length >= CONTACT_RATE_MAX;
}

// Recorded only once a submission is valid and about to be delivered, so the
// budget tracks real outbound mail rather than typos. Called before the send
// rather than after success, so a failing SMTP server can't be hammered.
function recordContactAttempt(ip) {
    const hits = contactAttempts.get(ip) || [];
    hits.push(Date.now());
    contactAttempts.set(ip, hits);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact(body) {
    const read = (key) => (typeof body?.[key] === 'string' ? body[key].trim() : '');
    // CR/LF stripped from the two fields that land in mail *headers* — a
    // newline there is the classic header-injection vector.
    const name = read('name').replace(/[\r\n]/g, ' ');
    const email = read('email').replace(/[\r\n]/g, '');
    const message = read('message');

    if (!name || !email || !message) return { error: 'Name, email, and message are all required.' };
    if (name.length > CONTACT_MAX.name) return { error: 'That name is too long.' };
    if (email.length > CONTACT_MAX.email || !EMAIL_RE.test(email)) {
        return { error: "That email address doesn't look right." };
    }
    if (message.length > CONTACT_MAX.message) return { error: 'That message is too long.' };

    return { value: { name, email, message } };
}

app.post('/api/contact', async (req, res) => {
    if (!RESEND_API_KEY) {
        console.error('🚨 [contact] RESEND_API_KEY not set — refusing submissions rather than dropping them.');
        return res.status(503).json({ error: "The form isn't available right now — please email me directly." });
    }

    // Honeypot: a field hidden from humans via CSS. Anything that fills it is
    // automated. Return 200 so the bot has no signal that it was caught.
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
        console.warn('[contact] honeypot tripped — dropping silently');
        return res.json({ ok: true });
    }

    const ip = clientIp(req);
    if (isRateLimited(ip)) {
        return res.status(429).json({ error: "You've sent several messages already — try again a little later." });
    }

    const { error, value } = validateContact(req.body);
    if (error) return res.status(400).json({ error });

    recordContactAttempt(ip);

    try {
        const { data, error: sendError } = await getResend().emails.send({
            from: `Portfolio contact <${CONTACT_FROM_EMAIL}>`,
            to: CONTACT_TO_EMAIL,
            replyTo: `${value.name} <${value.email}>`,
            subject: `Portfolio contact from ${value.name}`,
            // Plain text only, deliberately: visitor input never gets
            // interpolated into HTML, so there's no escaping to get wrong.
            text: `${value.name} <${value.email}> wrote:\n\n${value.message}\n`,
        });

        // The SDK resolves with { data, error } instead of throwing, so an
        // unchecked call would report success on a rejected send — exactly
        // the failure this endpoint exists to eliminate.
        if (sendError) {
            console.error(`🚨 [contact] Resend rejected the send: ${sendError.name} — ${sendError.message}`);
            // Recorded even on a rejected send — this is the owner's own
            // record of who tried to reach them, independent of whether
            // Resend's sandbox restriction (or anything else) blocked delivery.
            recordMessage({ ...value, resendId: null, delivered: false, ...visitorContext(req) });
            return res.status(502).json({ error: "That didn't go through — please try again, or email me directly." });
        }

        // The Resend id is what you search on at resend.com/emails to see
        // delivery/bounce status for a specific message.
        console.log(`✉️  [contact] message relayed from ${value.email} (resend id ${data?.id})`);
        // Fire-and-forget, same as every other db.js call — a slow or failing
        // insert must never delay or fail the response the visitor is waiting on.
        recordMessage({ ...value, resendId: data?.id ?? null, delivered: true, ...visitorContext(req) });
        res.json({ ok: true });
    } catch (err) {
        // Network-level failure reaching Resend at all.
        console.error('🚨 [contact] send failed:', err.message);
        res.status(502).json({ error: "That didn't go through — please try again, or email me directly." });
    }
});

// === iTunes search proxy ===
// Apple's Search API inspects the User-Agent. On an iOS UA it answers a search
// with a 301 to `musics://mzstoreservices-st.itunes.apple.com/search?...` — a
// custom-scheme deep link into the Music app — instead of returning JSON. A
// browser fetch cannot follow a redirect to a non-HTTP scheme, so the request
// dies with ERR_FAILED and every iPhone/iPad visitor saw an empty record crate.
//
// Phase 0's "direct client-side fetch confirmed, no proxy needed" probe was run
// from a desktop User-Agent, so it never covered this. Viewport is irrelevant —
// a desktop browser sending an iOS UA fails identically, and a phone sending a
// desktop UA succeeds.
//
// Proxying through Node fixes it: axios sends its own User-Agent, so Apple
// returns ordinary JSON. Apple's response is passed through untouched, so the
// client's existing parsing is unchanged.
const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const ITUNES_TERM_MAX = 100;
const ITUNES_CACHE_TTL_MS = 10 * 60 * 1000;
const ITUNES_CACHE_MAX = 200; // bounded so varied terms can't grow this forever
const itunesCache = new Map(); // `${term}:${limit}` -> { body, expiresAt }

// Generous by human standards (a visitor types a handful of queries), tight
// enough that this can't be used as a free general-purpose iTunes proxy.
const ITUNES_RATE_MAX = 30;
const ITUNES_RATE_WINDOW_MS = 60 * 1000;
const itunesHits = new Map(); // ip -> timestamp[]

function itunesRateLimited(ip) {
    const cutoff = Date.now() - ITUNES_RATE_WINDOW_MS;
    const hits = (itunesHits.get(ip) || []).filter((t) => t > cutoff);
    if (hits.length >= ITUNES_RATE_MAX) {
        itunesHits.set(ip, hits);
        return true;
    }
    hits.push(Date.now());
    itunesHits.set(ip, hits);
    return false;
}

setInterval(() => {
    const cutoff = Date.now() - ITUNES_RATE_WINDOW_MS;
    for (const [ip, hits] of itunesHits) {
        const live = hits.filter((t) => t > cutoff);
        if (live.length) itunesHits.set(ip, live);
        else itunesHits.delete(ip);
    }
}, ITUNES_RATE_WINDOW_MS).unref();

app.get('/api/itunes/search', async (req, res) => {
    const term = typeof req.query.term === 'string' ? req.query.term.trim() : '';
    if (!term) return res.status(400).json({ error: 'Missing term' });
    if (term.length > ITUNES_TERM_MAX) return res.status(400).json({ error: 'Term too long' });

    const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 25);
    const cacheKey = `${term.toLowerCase()}:${limit}`;

    const cached = itunesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.body);
    }

    if (itunesRateLimited(clientIp(req))) {
        return res.status(429).json({ error: 'Too many searches — slow down a moment.' });
    }

    try {
        const { data } = await axios.get(ITUNES_SEARCH_URL, {
            params: { media: 'music', entity: 'song', limit, term },
            timeout: 8000,
        });

        if (itunesCache.size >= ITUNES_CACHE_MAX) {
            // Map preserves insertion order, so the first key is the oldest.
            itunesCache.delete(itunesCache.keys().next().value);
        }
        itunesCache.set(cacheKey, { body: data, expiresAt: Date.now() + ITUNES_CACHE_TTL_MS });

        res.json(data);
    } catch (error) {
        console.error('🚨 [itunes-search] failed:', error.response?.status || error.message);
        res.status(502).json({ error: 'Search is unavailable right now' });
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

// === Play / search-click telemetry ===
// Owner-only records — see db.js's header. Both endpoints share the same
// shape: validate just enough to keep garbage out, record visitor context via
// visitor.js (no raw IP ever reaches a table), and respond immediately without
// waiting on the insert. A slow or dead database must never be something a
// visitor's turntable or search box can feel.
//
// Deliberately NOT rate-limited or gated behind CORS beyond the existing
// ALLOWED_ORIGINS check — a fake flood of these only pollutes the owner's own
// table, it can't spend a shared budget the way the iTunes/contact routes'
// upstream calls can, and no data leaves this server as a result.
const EVENT_MAX = { term: 200, trackId: 100, title: 300, artist: 300 };

function readEventField(body, key, max) {
    const value = body?.[key];
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
}

// A play is logged only for the fresh-drop edge (LOADING/EMPTY -> PLAYING),
// never a resume from PAUSED — that distinction is made client-side, in
// home.jsx's deck-state subscription, using the same edge condition
// skyline-background.jsx already relies on for its own reset logic. This
// route trusts that the client only calls it on that edge; it has no way to
// verify deck state itself, and doesn't need to — the worst a misbehaving
// client can do is add rows to the owner's own table.
app.post('/api/events/play', (req, res) => {
    const trackId = readEventField(req.body, 'trackId', EVENT_MAX.trackId);
    const title = readEventField(req.body, 'title', EVENT_MAX.title);
    const artist = readEventField(req.body, 'artist', EVENT_MAX.artist);
    res.status(204).end(); // acknowledge before the insert even starts
    if (trackId) recordPlay({ trackId, title, artist, ...visitorContext(req) });
});

// A search-click is logged only when a visitor picks a result — never per
// keystroke of the debounced search — so this fires from record-crate.jsx's
// selection handler, carrying the term that was actually searched alongside
// the track it led to.
app.post('/api/events/search-click', (req, res) => {
    const term = readEventField(req.body, 'term', EVENT_MAX.term);
    const trackId = readEventField(req.body, 'trackId', EVENT_MAX.trackId);
    const title = readEventField(req.body, 'title', EVENT_MAX.title);
    const artist = readEventField(req.body, 'artist', EVENT_MAX.artist);
    res.status(204).end();
    if (term) recordSearchClick({ term, trackId, title, artist, ...visitorContext(req) });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
