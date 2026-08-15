import { useState, useEffect } from "react";
import axios from "axios";
// Latin + latin-ext subsets specifically, not the package-default imports
// (`@fontsource/oswald/400.css` etc.) — the default pulls EVERY unicode
// subset the family ships (cyrillic, cyrillic-ext, vietnamese...), which
// measured out to 46 font files / 620KB in the build for three families
// this site only ever renders in Latin script. Latin-ext (not just latin)
// is kept deliberately, not trimmed further: track/artist titles come from
// live Spotify data this code doesn't control, and accented Latin names
// (Beyoncé, Björk) are a real, not hypothetical, case for a "top artists"
// list — dropping to latin-only risks a fallback-font flash on exactly the
// data this section exists to show.
import "@fontsource/anton/latin-400.css";
import "@fontsource/anton/latin-ext-400.css";
import "@fontsource/oswald/latin-400.css";
import "@fontsource/oswald/latin-500.css";
import "@fontsource/oswald/latin-600.css";
import "@fontsource/oswald/latin-ext-400.css";
import "@fontsource/oswald/latin-ext-500.css";
import "@fontsource/oswald/latin-ext-600.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "@fontsource/space-mono/latin-ext-400.css";
import "@fontsource/space-mono/latin-ext-700.css";
import "../styles/main.scss";

// Stage 4 Task 1 — foundations only. This section is being rebuilt as a
// festival-lineup poster (headliner/support/setlist, duotoned photos,
// torn-edge cards, grain — the full concept is in ROADMAP.md's Stage 4 entry
// now, not just this session's chat). Split into five small tasks rather
// than one big one, the way Experience was NOT split (Stage 3 Tasks 7/8/9
// each had to re-discover a structural problem the previous one's polish had
// been layered on top of). This task carries none of the layout/image risk —
// it only proves the data is shaped right and the three new typefaces are
// legible. No wall, no cards, no photos, no motion: all later tasks.
//
// This trailing-slash-safe base URL and the independent-per-list
// loading/error/empty fetch pattern are unchanged from the pre-Stage-4
// implementation — see git history for that reasoning if it's ever unclear
// why fetchTopItems() is shaped this way.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5050").replace(/\/+$/, "");

// This section shows MY Spotify listening data — one fixed identity, fetched
// and cached server-side, served to every visitor as read-only content.
// There is no per-visitor auth: nobody ever sees a Spotify login prompt from
// this component. A failure here should never take down the section: tracks
// and artists are fetched independently, and each renders its own
// loading/error/empty state under a heading that's always present.
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
    if (status === "loading") return <p className="my-taste-status">Loading my top {kind}…</p>;
    if (status === "error") return <p className="my-taste-status">My listening data is taking a nap — check back soon.</p>;
    if (status === "empty") return <p className="my-taste-status">Nothing here yet — check back once I&rsquo;ve been listening more.</p>;
    return null;
}

export default function MyTaste() {
    const [tracks, setTracks] = useState({ status: "loading", data: [] });
    const [artists, setArtists] = useState({ status: "loading", data: [] });

    useEffect(() => {
        fetchTopItems("tracks").then(setTracks);
        fetchTopItems("artists").then(setArtists);
    }, []);

    // Reshape into the poster's actual roles, not one flat list each.
    // limit=5 on both server endpoints (server.js, untouched this task) is
    // exactly headliner + 4 support acts — don't add a 6th artist or a 4th
    // track without re-deriving Task 2's wall geometry, which is built
    // around these two counts.
    //
    // imageAlt is computed here, alongside the data, even though nothing
    // renders an <img> yet (Task 3 wires in the real photos/album art) —
    // same discipline as experience.jsx's imageAlt fields: the convention
    // lives with the data it describes, not invented fresh once the layout
    // that needs it exists.
    const headliner = artists.data[0]
        ? { ...artists.data[0], imageAlt: artists.data[0].name }
        : null;
    const support = artists.data.slice(1, 5).map((artist) => ({
        ...artist,
        imageAlt: artist.name,
    }));
    const setlist = tracks.data.map((track) => ({
        ...track,
        imageAlt: `Album cover — ${track.name} by ${track.artists.map((a) => a.name).join(", ")}`,
    }));

    return (
        <section className="my-taste-section">
            {/* The section's own title — headliner/support/setlist content
                below is content, not a second or third heading for it. Was
                three equal, unhierarchied h2s ("My Spotify Journey" /
                "My Favorite Tracks" / "My Favorite Artists") before this
                task; a screen reader announced three section headings for
                what is one section. */}
            <h2 className="my-taste-heading">now spinning · my taste</h2>

            <SpotifyStatusMessage status={artists.status} kind="artists" />
            {artists.status === "ready" && headliner && (
                <div className="my-taste-headliner">
                    <p className="my-taste-headliner-name">{headliner.name}</p>
                </div>
            )}
            {artists.status === "ready" && support.length > 0 && (
                <ul className="my-taste-support">
                    {support.map((artist) => (
                        <li key={artist.id} className="my-taste-support-name">{artist.name}</li>
                    ))}
                </ul>
            )}

            <SpotifyStatusMessage status={tracks.status} kind="tracks" />
            {tracks.status === "ready" && setlist.length > 0 && (
                <ol className="my-taste-setlist">
                    {setlist.map((track, index) => (
                        <li key={track.id ?? index} className="my-taste-setlist-item">
                            <span className="my-taste-setlist-index">{index + 1}</span>
                            <span className="my-taste-setlist-track">{track.name}</span>
                            <span className="my-taste-setlist-artist">
                                {track.artists.map((a) => a.name).join(", ")}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
