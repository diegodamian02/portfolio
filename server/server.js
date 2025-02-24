import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";


dotenv.config();
const app = express();
app.use(cors());

//Spotify API Endpoint
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
let accessToken = "";

/* Callback discarded :( maybe for some other time
app.get("/callback", async (req, res) => {
    const code = req.query.code || null;
    try {
        const reponse = await axios.post(
            "https://accounts.spotify.com/api/token",
            querystring.stringify({
                grant_type: "authroization_code",
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }),
            { headers: {"Content-Type": "application/x-www-form-urlencoded"}}
        );

        const { access_token, refresh_token} = response.data;
        res.redirect(`https://www.diegodamian.com/?access_token=${access_token}&refresh_token=${refresh_token}`);
    } catch (error) {
        console.error("Error exchanging code for token:", error.response?.data  || error.message);
        res.send("Authentication failed");
    }
});

// Function to fetch Spotify data
async function fetchSpotifyData(endpoint) {
    try{
        const response = await axios.get(`${SPOTIFY_API_URL}/${endpoint}`, {
            headers: {
                Authorization: `Bearer ${SPOTIFY_ACCESS_TOKEN}`,
            },
        });
        return response.data.items;
    } catch (error) {
        console.error("Error fetching Spotify data:", error.response?.data || error.message);
        return [];
    }
}

*/

// Function to get a new access token
async function getSpotifyAccessToken() {
    try {
        const response = await axios.post(
            TOKEN_ENDPOINT,
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
            }).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded"}}
        );

        accessToken = response.data.access_token;
        console.log("New Spotify Access Token:", accessToken);
    } catch (error) {
        console.error("Error getting Spotify access token:", error.response.data || error.message);
    }
}

getSpotifyAccessToken();
setInterval(getSpotifyAccessToken, 55 * 60 * 1000);

async function ensureAccessToken() {
    if (!accessToken) {
        console.log("🔄 No access token, fetching a new one...");
        await getSpotifyAccessToken();
    }
}
// API Endpoint for Top 5 Tracks - Fetching
app.get("/api/spotify/top-tracks", async (req, res) => {
    await ensureAccessToken();
    if (!accessToken) {
        return res.status(500).json({error: "Spotify access token is missing"});
    }

    try{
        const reponse = await axios.get("https://api.spotify.com/v1/me/top/tracks?limit=5", {
            headers: {Authorization: `Bearer ${accessToken}`},
        });
        res.json(response.data.items);
    } catch (error) {
        console.error("Error fetching Spotify top tracks:", error.response?.data || error.message);
        res.status(500).json({error: "Failed to fetch Spotify top tracks"});
    }
});

// API Endpoint for Top 5 Artist

app.get("/api/spotify/top-artists", async (req, res) => {
    await ensureAccessToken();
    if (!accessToken) {
        return res.status(500).json({error: "Spotify access token is missing"});
    }

    try {
        const response = await axios.get("https://api.spotify.com/v1/me/top/artists?limit=5", {
            headers: { Authorization: `Bearer ${accessTokenk}` },
        });
        res.json(response.data.items);
    } catch (error) {
        console.error("Error fetching Spotify top artists:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Spotify top artists" });
    }
});


app.listen(5050, () => console.log("Backend running on railways, good job buddy"));