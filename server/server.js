import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
let accessToken = "";

// ✅ Step 1: Get Spotify Access Token Using Client Credentials Flow
async function getSpotifyAccessToken() {
    try {
        const response = await axios.post(
            TOKEN_ENDPOINT,
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        accessToken = response.data.access_token;
        console.log("✅ New Spotify Access Token:", accessToken);
    } catch (error) {
        console.error("🚨 Error getting Spotify access token:", error.response?.data || error.message);
    }
}

// ✅ Refresh Token Every 55 Minutes
getSpotifyAccessToken();
setInterval(getSpotifyAccessToken, 55 * 60 * 1000);

// ✅ Step 2: Ensure Token Exists Before API Calls
async function ensureAccessToken() {
    if (!accessToken) {
        console.log("🔄 No access token, fetching a new one...");
        await getSpotifyAccessToken();
    }
}

// ✅ Step 3: Fetch Public Spotify Data (No Login Required)

// Fetch **Top 5 Tracks** of a Public Spotify User (YOUR ACCOUNT)
app.get("/api/spotify/top-tracks", async (req, res) => {
    await ensureAccessToken();
    if (!accessToken) {
        return res.status(500).json({ error: "Spotify access token is missing" });
    }

    const SPOTIFY_USER_ID = "your_spotify_user_id";  // Replace with your actual Spotify User ID

    try {
        const response = await axios.get(`https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/top/tracks?limit=5`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        res.json(response.data.items);
    } catch (error) {
        console.error("🚨 Error fetching Spotify top tracks:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Spotify top tracks" });
    }
});

// Fetch **Top 5 Artists** of a Public Spotify User (YOUR ACCOUNT)
app.get("/api/spotify/top-artists", async (req, res) => {
    await ensureAccessToken();
    if (!accessToken) {
        return res.status(500).json({ error: "Spotify access token is missing" });
    }

    const SPOTIFY_USER_ID = "your_spotify_user_id";  // Replace with your actual Spotify User ID

    try {
        const response = await axios.get(`https://api.spotify.com/v1/users/${SPOTIFY_USER_ID}/top/artists?limit=5`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        res.json(response.data.items);
    } catch (error) {
        console.error("🚨 Error fetching Spotify top artists:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Spotify top artists" });
    }
});

// ✅ Step 4: Start Server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
