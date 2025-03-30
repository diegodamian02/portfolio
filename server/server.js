import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import querystring from 'querystring';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());  // Parse JSON bodies

// Spotify Credentials from environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

let accessToken = "";
let refreshToken = "";
let accessTokenExpiration = 0; // In seconds (Unix timestamp)

// Email sending setup
const transporter = nodemailer.createTransport({
    service: 'gmail',  // You can change this to your email provider
    auth: {
        user: 'diegodamiango02@gmail.com',  // Use your email
        pass: '770802Crash',   // Use your email password or app-specific password
    },
});

// Spotify authentication flow
app.get("/login", (req, res) => {
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

// Handle callback and exchange the authorization code for access and refresh tokens
app.get("/callback", async (req, res) => {
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
        refreshToken = response.data.refresh_token;  // Save the refresh token
        accessTokenExpiration = Math.floor(Date.now() / 1000) + 3600; // Set expiration time (1 hour)

        console.log("✅ New Spotify Access Token:", accessToken);
        res.redirect("/profile");
    } catch (error) {
        console.error("🚨 Error during token exchange:", error.response?.data || error.message);
        res.status(500).send("Failed to get Spotify access token");
    }
});

// Refresh Access Token when expired
const refreshAccessToken = async () => {
    if (!refreshToken) {
        throw new Error("No refresh token available");
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
        throw new Error("Failed to refresh access token");
    }
};

// Check if the access token is expired, and refresh it if needed
const checkAndRefreshToken = async () => {
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= accessTokenExpiration) {
        console.log("Access token expired, refreshing...");
        await refreshAccessToken();
    }

    if (!accessToken) {
        console.log("No access token, redirecting to /login...");
        return false; // Token is missing or expired and cannot be refreshed
    }
    return true; // Token is valid
};

// Fetch top tracks
app.get("/api/spotify/top-tracks", async (req, res) => {
    const tokenValid = await checkAndRefreshToken();  // Ensure token is valid before making the request

    if (!tokenValid) {
        return res.redirect("/login"); // Redirect to login if token is missing or invalid
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
    const tokenValid = await checkAndRefreshToken();  // Ensure token is valid before making the request

    if (!tokenValid) {
        return res.redirect("/login"); // Redirect to login if token is missing or invalid
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

// Send email functionality
app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    // Compose email
    const mailOptions = {
        from: email,  // Sender's email
        to: 'diegodamiango02@gmail.com',  // Receiver's email
        subject: 'New Contact Form Submission',
        text: `You have a new message from ${name} (${email}):\n\n${message}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error sending email');
        }
        console.log('Email sent: ' + info.response);
        return res.status(200).send('Email sent successfully');
    });
});

// Start the server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`🚀 Backend running on port ${PORT}`);
});
