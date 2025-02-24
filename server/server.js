import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import querystring from "querystring";

dotenv.config();
const app = express();
app.use(cors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}));

//Spotify API Endpoint
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.get("/login", (req, res) => {
    const scope = "user-read-private user-read-email user-top-read";
    const authUrl = "https://accounts.spotify.com/authorize?" + querystring.stringify({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: "S256",
        code_challenge: "challenge_value",

    });
    res.redirect(authUrl);
})

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


/*Function to fetch Spotify data
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

// Fetch user profile data

app.get("/api/spotify/profile", async (req, res) => {
    const access_token = req.query.access_token;

    if (!access_token) {
        return res.status(400).json({ error: "Access token required"});
    }

    try {
        const response = await axios.get("https://api.spotify.com/v1/me", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Spotify profile"});
    }
});


// API Endpoint for Top 5 Tracks - Fetching
app.get("/api/spotify/top-tracks", async (req, res) => {
    const access_token = req.query.access_token;
    if (!access_token){
        return res.status(400).json({error: "Access token required"});
    }

    try{
        const reponse = await axios.get("https://api.spotify.com/v1/me/top/tracks?limit=5", {
            headers: {Authorization: `Bearer ${access_token}`},
        });
        res.json(response.data.items);
    } catch (error) {
        console.error("Error fetching Spotify top tracks:", error.response?.data || error.message);
        res.status(500).json({error: "Failed to fetch Spotify top tracks"});
    }
});

// API Endpoint for Top 5 Artist

app.get("/api/spotify/top-artists", async (req, res) => {
    const access_token = req.query.access_token;
    if (!access_token) {
        return res.status(400).json({ error: "Access token required" });
    }

    try {
        const response = await axios.get("https://api.spotify.com/v1/me/top/artists?limit=5", {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        res.json(response.data.items);
    } catch (error) {
        console.error("Error fetching Spotify top artists:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch Spotify top artists" });
    }
});


app.listen(5050, () => console.log("Backend running on railways, good job buddy"));