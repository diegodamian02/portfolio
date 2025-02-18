import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
}));

//Spotify API Endpoint
const SPOTIFY_API_URL = "https://api.spotify.com/v1/me/top";
const SPOTIFY_ACCESS_TOKEN = process.env.SPOTIFY_ACCESS_TOKEN;

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

// API Endpoint for Top 5 Tracks
app.get("/api/spotify/top-tracks", async (req, res) => {
    const topTracks = await fetchSpotifyData("tracks?time_range=long_term&limit=5");
    res.json(topTracks.map(track => ( {
        name: track.name,
        artist: track.artists.map(artist => artist.name).join(", "),
        album: track.album.name,
        cover: track.album.images[0]?.url || ""
    })));
});

// API Endpoint for Top 5 Artist
app.get("/api/spotify/top-artists", async (req, res) => {
    const topArtists = await fetchSpotifyData("artists?time_range=long_term&limit=5");
    res.json(topArtists.map(artist => ({
        name: artist.name,
        image: artist.images[0]?.url || ""
    })));
});

app.listen(5050, () => console.log("Backend running on local host, good job buddy"));