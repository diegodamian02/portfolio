import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import querystring from "querystring";

// Add CORS headers to allow your frontend domain
const allowedOrigins = ['https://www.diegodamian.com']; // Replace with your frontend URL
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
}));

// Spotify Credentials from environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

let accessToken = "";
let refreshToken = "";
let accessTokenExpiration = 0;

// Check if the user is authenticated
app.get("/api/spotify/check-auth", (req, res) => {
    if (!accessToken || Math.floor(Date.now() / 1000) >= accessTokenExpiration) {
        // If there's no access token or the token has expired, redirect to /login
        return res.redirect("/login");
    }

    // Otherwise, user is authenticated, return a success status
    return res.status(200).send('User is authenticated');
});

// Refresh Access Token when expired
const refreshAccessToken = async (req, res) => {
    if (!refreshToken) {
        return res.redirect('/login');
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
        console.log("✅ Access token refreshed:", accessToken);
    } catch (error) {
        console.error("🚨 Error refreshing access token:", error.response?.data || error.message);
        return res.redirect('/login');
    }
};

// Check if the access token is expired, and refresh it if needed
const checkAndRefreshToken = async (req, res) => {
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= accessTokenExpiration) {
        console.log("Access token expired, refreshing...");
        await refreshAccessToken(req, res); // Pass req, res to refreshAccessToken
    }

    if (!accessToken) {
        console.log("No access token, redirecting to /login...");
        return res.redirect('/login');
    }
};

// Fetch top tracks
app.get("/api/spotify/top-tracks", async (req, res) => {
    await checkAndRefreshToken(req, res);

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

// Fetch top artists
app.get("/api/spotify/top-artists", async (req, res) => {
    await checkAndRefreshToken(req, res);

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

// Start the server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
