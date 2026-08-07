import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/main.scss";
import spotify_diego from "../assets/spotify_diego.jpg";

// Trailing-slash-safe: VITE_API_BASE_URL + "/api/..." would otherwise collide
// into "//api/..." if the env var has a trailing slash, which Express treats
// as a different, unregistered path (a plain 404, not our JSON error
// handler). Stripping it here means the env var's exact formatting can never
// silently break every request.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5050").replace(/\/+$/, "");

// This section shows MY Spotify listening data — one fixed identity, fetched
// and cached server-side, served to every visitor as read-only content.
// There is no per-visitor auth: nobody ever sees a Spotify login prompt from
// this component. (Contrast with the turntable hero, which calls iTunes
// directly from the browser for each visitor's own search — see README.md.)
// A failure here should never take down the section: tracks and artists are
// fetched independently, and each renders its own loading/error/empty state
// under a heading that's always present.
async function fetchTopItems(kind) {
    try {
        const { data } = await axios.get(`${apiBaseUrl}/api/spotify/top-${kind}`);
        return { status: Array.isArray(data) && data.length === 0 ? "empty" : "ready", data };
    } catch (error) {
        console.error(`Error fetching top ${kind}:`, error);
        return { status: "error", data: [] };
    }
}

function SpotifyStatusMessage({ status, kind }) {
    if (status === "loading") return <p>Loading my top {kind}…</p>;
    if (status === "error") return <p>My listening data is taking a nap — check back soon.</p>;
    if (status === "empty") return <p>Nothing here yet — check back once I've been listening more.</p>;
    return null;
}

export default function MyTaste() {
    const [tracks, setTracks] = useState({ status: "loading", data: [] });
    const [artists, setArtists] = useState({ status: "loading", data: [] });

    useEffect(() => {
        fetchTopItems("tracks").then(setTracks);
        fetchTopItems("artists").then(setArtists);
    }, []);

    return (
        <section className="about-section spotify-section">
            <div className="spotify-track-image">
                <a href="https://open.spotify.com/user/12182870270?si=630dee87f85a4ced"><img src={spotify_diego} alt="Top Tracks" className="track-image"/></a>
                <h2> My Spotify Journey</h2>
            </div>

            <h2> My Favorite Tracks</h2>
            <div className="spotify-track-list">
                <SpotifyStatusMessage status={tracks.status} kind="tracks" />
                {tracks.status === "ready" && tracks.data.map((track, index) => (
                    <div key={track.id ?? index} className="spotify-track-item">
                        <span className="track-number">{index + 1}</span>
                        <div className="track-details">
                            <a href={`https://open.spotify.com/track/${track.id}`} target="_blank"
                               rel="noopener noreferrer">
                                <p className="track-name">{track.name}</p>
                            </a>
                            <p className="track-artist">
                                {track.artists.map(artist => (
                                    <a
                                        key={artist.id}
                                        href={`https://open.spotify.com/artist/${artist.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {artist.name}
                                    </a>
                                ))}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <h2> My Favorite Artists</h2>
            <div className="top-artists-list">
                <SpotifyStatusMessage status={artists.status} kind="artists" />
                {artists.status === "ready" && artists.data.map((artist) => (
                    <div key={artist.id} className="artist-item">
                        <a href={`https://open.spotify.com/artist/${artist.id}`} target="_blank"
                           rel="noopener noreferrer">
                            <img
                                src={artist.images[0]?.url}
                                alt={artist.name}
                                className="spotify-artist-img"
                            />
                            <p>{artist.name}</p>
                        </a>
                    </div>
                ))}
            </div>
        </section>
    );
}
