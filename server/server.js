import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import querystring from "querystring";  // To handle query parameters

dotenv.config();
const app = express();
app.use(cors());

// Spotify Credentials from environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;  // This should match the redirect URI in your Spotify Developer App settings

let accessToken = "";
let refreshToken = "";

app.get("/", (req, res) => {
    res.send("Welcome to the Spotify Authentication App! Please visit /login to authenticate.");
});


// Step 1: Redirect the user to the Spotify authorization page
app.get("/login", (req, res) => {
    const scope = 'user-top-read';  // Permission to access user's top tracks and artists
    const state = 'some-random-state';  // Can be used for CSRF protection

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

// Step 2: Handle the callback from Spotify and get access token
app.get("/callback", async (req, res) => {
    const code = req.query.code;  // Get the authorization code from the query
    const state = req.query.state;  // Optionally check state for CSRF protection

    if (state !== 'some-random-state') {
        return res.status(400).send('State mismatch');
    }

    // Exchange the authorization code for an access token and refresh token
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

        // Store the access token and refresh token
        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token;

        console.log("✅ New Spotify Access Token:", accessToken);

        // You can now use the access token to make API requests to Spotify
        res.redirect("/profile");  // Redirect to a profile page or dashboard after login
    } catch (error) {
        console.error("🚨 Error during token exchange:", error.response?.data || error.message);
        res.status(500).send("Failed to get Spotify access token");
    }
});

// Step 3: Fetch user's top tracks
app.get("/api/spotify/top-tracks", async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: "Spotify access token is missing" });
    }

    try {
        const response = await axios.get(`${process.env.SPOTIFY_API_BASE_URL}/me/top/tracks?limit=5&time_range=medium_term`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        console.log("🎵 Top Tracks Response:", response.data.items);
        res.json(response.data.items);
    } catch (error) {
        console.error("🚨 Error fetching top tracks:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch top tracks" });
    }
});

// Step 4: Fetch user's top artists
app.get("/api/spotify/top-artists", async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: "Spotify access token is missing" });
    }

    try {
        const response = await axios.get(`${process.env.SPOTIFY_API_BASE_URL}/me/top/artists?limit=5&time_range=medium_term`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        res.json(response.data.items);
    } catch (error) {
        console.error("🚨 Error fetching top artists:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch top artists" });
    }
});

// Refresh Access Token when expired
app.get("/refresh_token", async (req, res) => {
    if (!refreshToken) {
        return res.status(401).json({ error: "No refresh token available" });
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

        accessToken = response.data.access_token;  // Update the access token
        console.log("✅ Access token refreshed:", accessToken);
        res.json({ access_token: accessToken });
    } catch (error) {
        console.error("🚨 Error refreshing access token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to refresh access token" });
    }
});

// Start the server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
