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

const ALLOWED_ORIGINS = [
    'https://diegodamian.com',
    'https://www.diegodamian.com',
    'http://localhost:5173',
];

app.use(cors({ origin: ALLOWED_ORIGINS }));

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
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
