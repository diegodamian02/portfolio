import express from 'express';  // Import express
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import querystring from 'querystring';

// Initialize express app
const app = express();  // <-- Here you initialize the app

dotenv.config();

// Spotify Credentials from environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'https://diegos-portfolio-gud6.onrender.com';

let accessToken = '';
let refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || '';
let accessTokenExpiration = 0; // In seconds (Unix timestamp)

app.use(cors());  // Add CORS middleware to allow cross-origin requests

// Spotify authentication flow
app.get('/login', (req, res) => {
    const scope = 'user-top-read';  // Permission to access user's top tracks and artists
    const state = 'some-random-state';

    const authUrl = `https://accounts.spotify.com/authorize?` +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            scope: scope,
            state: state,
        });

    res.redirect(authUrl);
});

// Callback to handle the response from Spotify OAuth
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;

    if (state !== 'some-random-state') {
        return res.status(400).send('State mismatch');
    }

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

// Check if the access token is expired, and refresh it if needed
const checkAndRefreshToken = async (req, res, next) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const needsRefresh = !accessToken || currentTime >= accessTokenExpiration;

    if (needsRefresh) {
        console.log('Access token missing/expired, refreshing...');
        const refreshed = await refreshAccessToken();
        if (!refreshed || !accessToken) {
            return res.status(401).json({
                error: 'Spotify refresh token missing',
                loginUrl: `${BACKEND_BASE_URL}/login`,
            });
        }
    }

    next(); // Continue to the next middleware
};

// Check auth status for the frontend
app.get('/api/spotify/check-auth', async (req, res) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = currentTime >= accessTokenExpiration;

    if (!accessToken || isExpired) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            return res.json({ authenticated: true });
        }
        return res.status(401).json({
            authenticated: false,
            loginUrl: `${BACKEND_BASE_URL}/login`,
        });
    }

    res.json({ authenticated: true });
});

// Fetch top tracks
app.get('/api/spotify/top-tracks', checkAndRefreshToken, async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: 'Spotify access token is missing' });
    }

    try {
        const response = await axios.get(`${process.env.SPOTIFY_API_BASE_URL}/me/top/tracks?limit=5&time_range=medium_term`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        console.log('🎵 Top Tracks Response:', response.data.items);
        res.json(response.data.items);
    } catch (error) {
        console.error('🚨 Error fetching top tracks:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch top tracks' });
    }
});

// Fetch top artists
app.get('/api/spotify/top-artists', checkAndRefreshToken, async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: 'Spotify access token is missing' });
    }

    try {
        const response = await axios.get(`${process.env.SPOTIFY_API_BASE_URL}/me/top/artists?limit=5&time_range=medium_term`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        res.json(response.data.items);
    } catch (error) {
        console.error('🚨 Error fetching top artists:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch top artists' });
    }
});

// ============================================================
// TEMP — Phase 0 iTunes probe routes (turntable-hero validation)
// Throwaway diagnostic code. Not part of the app. Remove before
// building the real feature — do not commit as-is.
// ============================================================

const ALLOWED_PROXY_HOSTS = [/(^|\.)mzstatic\.com$/, /(^|\.)itunes\.apple\.com$/];

function isAllowedProxyHost(hostname) {
    return ALLOWED_PROXY_HOSTS.some((re) => re.test(hostname));
}

async function searchWithRetryOn403(params, retriesLeft) {
    try {
        return { res: await axios.get('https://itunes.apple.com/search', { params }), retried: false };
    } catch (err) {
        if (err.response?.status === 403 && retriesLeft > 0) {
            await new Promise((r) => setTimeout(r, 500));
            const inner = await searchWithRetryOn403(params, retriesLeft - 1);
            return { ...inner, retried: true };
        }
        throw err;
    }
}

app.get('/api/itunes/probe', async (req, res) => {
    const summary = {
        searchOk: false,
        searchStatus: null,
        resultsCount: 0,
        previewUrlsFound: 0,
        previewUrl: null,
        retriedOn403: false,
        previewStatus: null,
        previewHeaders: null,
        corsHeaderPresent: false,
        error: null,
    };

    try {
        const { res: searchRes, retried } = await searchWithRetryOn403(
            { term: 'daft punk', entity: 'song', limit: 3 },
            1
        );
        summary.retriedOn403 = retried;
        summary.searchStatus = searchRes.status;
        summary.searchOk = searchRes.status === 200;

        const results = searchRes.data?.results || [];
        summary.resultsCount = results.length;
        summary.previewUrlsFound = results.filter((r) => r.previewUrl).length;

        console.log(`[itunes-probe] search status=${summary.searchStatus} results=${summary.resultsCount} withPreviewUrl=${summary.previewUrlsFound} retriedOn403=${retried}`);

        const previewUrl = results.find((r) => r.previewUrl)?.previewUrl || null;
        summary.previewUrl = previewUrl;

        if (previewUrl) {
            let previewRes;
            try {
                previewRes = await axios.head(previewUrl);
            } catch (headErr) {
                console.log(`[itunes-probe] HEAD failed (${headErr.message}), falling back to ranged GET`);
                previewRes = await axios.get(previewUrl, { headers: { Range: 'bytes=0-1023' } });
            }

            summary.previewStatus = previewRes.status;
            summary.previewHeaders = previewRes.headers;
            summary.corsHeaderPresent = !!previewRes.headers['access-control-allow-origin'];

            console.log('[itunes-probe] preview response headers:', previewRes.headers);
            console.log(`[itunes-probe] access-control-allow-origin = ${previewRes.headers['access-control-allow-origin'] || '(absent)'}`);
        }

        res.json(summary);
    } catch (error) {
        console.error('🚨 [itunes-probe] error:', error.response?.status, error.message);
        summary.error = error.message;
        res.status(500).json(summary);
    }
});

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

const PROBE_TEST_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>iTunes probe</title></head>
<body style="font-family: monospace; padding: 2rem; max-width: 900px;">
  <h2>iTunes Tier-1 audio probe</h2>
  <button id="run">Run automated tests (2a + 2b, raw + proxy)</button>
  <button id="play-raw" disabled>2c: play+analyze RAW previewUrl</button>
  <button id="play-proxy" disabled>2c: play+analyze PROXY previewUrl</button>
  <pre id="out" style="white-space: pre-wrap; background:#111; color:#0f0; padding:1rem; margin-top:1rem;"></pre>
  <script>
    const out = document.getElementById('out');
    const log = (label, data) => { out.textContent += label + ': ' + JSON.stringify(data, null, 2) + '\\n\\n'; };

    let rawUrl = null, proxyUrl = null;

    async function testDirectFetch(url, label) {
      try {
        const r = await fetch(url);
        log(label + ' fetch()', { ok: r.ok, status: r.status, type: r.type });
        return true;
      } catch (err) {
        log(label + ' fetch() FAILED', { message: err.message });
        return false;
      }
    }

    async function testDecodeAudioData(url, label) {
      try {
        const r = await fetch(url);
        const buf = await r.arrayBuffer();
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuf = await ctx.decodeAudioData(buf.slice(0));
        log(label + ' decodeAudioData()', { ok: true, durationSec: audioBuf.duration, byteLength: buf.byteLength });
        return true;
      } catch (err) {
        log(label + ' decodeAudioData() FAILED', { message: err.message });
        return false;
      }
    }

    async function testAnalyser(url, label) {
      return new Promise((resolve) => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = url;
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audio.volume = 0.05;
        audio.play().then(() => {
          setTimeout(() => {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            const sum = data.reduce((a, b) => a + b, 0);
            log(label + ' Analyser after 1.2s playback', { sumOfBins: sum, allZero: sum === 0, sample: Array.from(data.slice(0, 10)) });
            audio.pause();
            resolve(sum);
          }, 1200);
        }).catch((err) => {
          log(label + ' audio.play() FAILED', { message: err.message });
          resolve(null);
        });
      });
    }

    document.getElementById('run').addEventListener('click', async () => {
      out.textContent = '';
      const probeRes = await fetch('/api/itunes/probe').then((r) => r.json());
      log('server-side probe summary', probeRes);

      if (!probeRes.previewUrl) { log('ABORT', 'no previewUrl found'); return; }
      rawUrl = probeRes.previewUrl;
      proxyUrl = '/api/itunes/preview-proxy?url=' + encodeURIComponent(rawUrl);

      log('--- 2a/2b RAW previewUrl ---', rawUrl);
      await testDirectFetch(rawUrl, '[raw]');
      await testDecodeAudioData(rawUrl, '[raw]');

      log('--- 2a/2b PROXY previewUrl ---', proxyUrl);
      await testDirectFetch(proxyUrl, '[proxy]');
      await testDecodeAudioData(proxyUrl, '[proxy]');

      document.getElementById('play-raw').disabled = false;
      document.getElementById('play-proxy').disabled = false;
    });

    document.getElementById('play-raw').addEventListener('click', () => testAnalyser(rawUrl, '[raw]'));
    document.getElementById('play-proxy').addEventListener('click', () => testAnalyser(proxyUrl, '[proxy]'));
  </script>
</body>
</html>`;

app.get('/probe-test', (req, res) => {
    res.type('html').send(PROBE_TEST_HTML);
});

// ============================================================
// END TEMP probe routes
// ============================================================

// Start the server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
