import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/main.scss";
import spotify_diego from "../assets/spotify_diego.jpg";

export default function MyTaste() {
    const [topTracks, setTopTracks] = useState([]);
    const [topArtists, setTopArtists] = useState([]);
    const [loading, setLoading] = useState(true);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

    const fetchSpotifyData = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/api/spotify/check-auth`);
            setLoading(true);

            if (response.status == 200) {
                const trackRes = await axios.get(`${apiBaseUrl}/api/spotify/top-tracks`);
                setTopTracks(trackRes.data);

                const artistRes = await axios.get(`${apiBaseUrl}/api/spotify/top-artists`);
                setTopArtists(artistRes.data);

                setLoading(false);
            }
        } catch (error) {
            console.error("Error Fetching Spotify Data", error);
            if (error?.response?.status === 401) {
                window.location.href = `${apiBaseUrl}/login`;
                return;
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpotifyData();
    }, []);

    return (
        <section className="about-section spotify-section">
            <div className="spotify-track-image">
                <a href="https://open.spotify.com/user/12182870270?si=630dee87f85a4ced"><img src={spotify_diego} alt="Top Tracks" className="track-image"/></a>
                <h2> My Spotify Journey</h2>
            </div>
            <div className="spotify-track-list">
                {loading ? (
                    <p>Loading top tracks...</p>
                ) : (
                    topTracks.map((track, index) => (
                        <div key={index} className="spotify-track-item">
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
                    ))
                )}
            </div>

            <h2> My Favorite Artists</h2>
            <div className="top-artists-list">
                {loading ? (
                    <p>Loading top artists...</p>
                ) : (
                    topArtists.map((artist, index) => (
                        <div key={index} className="artist-item">
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
                    ))
                )}
            </div>
        </section>
    );
}
