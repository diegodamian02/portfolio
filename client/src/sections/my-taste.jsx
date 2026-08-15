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
import { colorwayFor } from "../components/vinyl-record.jsx";
import { seeded01 } from "../lib/hash.js";

// Stage 4 Task 2 — the wall's structure and hierarchy: headliner (large) + 4
// support acts, arranged on a CSS Grid so overlap is structurally impossible
// rather than something to verify after the fact — full reasoning in
// design-review/stage4-my-taste-concept.md. Torn edges and tape accents are
// real. Task 2.5 tuned card/photo sizes to fit within roughly one screen.
// Task 3 swapped the flat --card-tint placeholders for real Spotify images,
// duotone-tinted. Task 3.5 (this task) split the section into two columns —
// the wall (this grid, headliner + support only now) beside a new crate
// column of setlist "singles" — so total section height is max(wall, crate)
// instead of wall + a setlist row stacked below it. Still no motion, no
// time-range UI (Tasks 4 and 5).
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5050").replace(/\/+$/, "");

async function fetchTopItems(kind) {
    try {
        const { data } = await axios.get(`${apiBaseUrl}/api/spotify/top-${kind}`);
        return { status: Array.isArray(data) && data.length === 0 ? "empty" : "ready", data };
    } catch (error) {
        console.error(`Error fetching top ${kind}:`, error);
        return { status: "error", data: [] };
    }
}

// Spotify's own image arrays are sorted largest -> smallest (verified live
// against real /api/spotify/top-artists and /api/spotify/top-tracks
// responses this task, not assumed from docs) — typically 640/320/160 for
// artist photos, 640/300/64 for album art. `large` picks the biggest
// available for the headliner's own bigger slot; everything else prefers
// something already close to the size it'll render at (<=400px covers every
// support/thumb slot on this wall at any breakpoint) over pulling the same
// 640px original into a ~200px box for nothing — the whole reason this
// project's own load-speed story (152MB -> 9.6MB) is worth protecting.
// Falls back to whatever's smallest/largest available if an artist only
// ships one size (seen on some lower-popularity artists).
function pickImageUrl(images, { large = false } = {}) {
    if (!Array.isArray(images) || images.length === 0) return null;
    if (large) return images[0].url;
    // Walking largest -> smallest (Spotify's own order) and taking the FIRST
    // one at or under 400px lands on the biggest size that's still small —
    // e.g. 320px out of [640, 320, 160], not the smallest available. Retina
    // displays render a ~230px CSS-wide support slot at ~460px actual
    // pixels, so 320px is close to native there without pulling the full
    // 640px original.
    const small = images.find((img) => !img.width || img.width <= 400);
    return (small ?? images[images.length - 1]).url;
}

function SpotifyStatusMessage({ status, kind }) {
    if (status === "loading") return <p className="my-taste-status">Loading my top {kind}…</p>;
    if (status === "error") return <p className="my-taste-status">My listening data is taking a nap — check back soon.</p>;
    if (status === "empty") return <p className="my-taste-status">Nothing here yet — check back once I&rsquo;ve been listening more.</p>;
    return null;
}

// Rotation magnitude: 2-4° per the brief, never smaller — every card should
// visibly tilt, not just some of them landing near 0° by chance. Jitter:
// small translate on top of the rotation, same idea as a photo not sitting
// perfectly square on a pinned corkboard.
const ROTATE_MIN_DEG = 2;
const ROTATE_MAX_DEG = 4;
const JITTER_RANGE_PX = 8; // total range; actual offset is ±(this / 2)
const TAPE_ROTATE_MAX_DEG = 10;
const TEAR_PRESET_COUNT = 4;

// One deterministic transform per card id — same id always produces the same
// rotation/jitter/tear-preset/tape-angle, across reloads and re-renders, the
// same guarantee colorwayFor already makes for tint (both now share hash.js's
// mixing). Salted per purpose (see seeded01) so these four values don't
// collapse onto correlated numbers for a given id.
//
// Margin budget: a card rotated by θ around its center grows its own
// axis-aligned bounding box by roughly ((W·(cosθ-1) + H·sinθ)) / 2
// horizontally and ((W·sinθ + H·(cosθ-1))) / 2 vertically (W/H = the card's
// unrotated size). At the brief's own 4° ceiling, the smallest cards on this
// wall (support acts, ~230×196px at 1440px post-Task-2.5 — smaller than
// Task 2's own ~250×220px, the fit pass shrank the photo slots) grow by
// roughly 7-8px per side; adding the ±4px jitter tops out around 11-12px per
// side. .my-taste-card's own margin (--space-3, 12px, unchanged by the fit
// pass on purpose) plus half of .my-taste-wall's gap (--space-3 as of
// Task 2.5, down from --space-4 — 12px → 6px per side) gives ~18px of real
// dead space per side — still comfortably clear, tighter than Task 2's ~20px
// but not a photo-finish. Verified live too, not just by this math: a
// Playwright pass measures every rendered card's actual bounding box against
// its neighbors at 1440/1024/768px, re-run after Task 2.5's resizing with
// the same zero-overlap result (see stage4-my-taste-concept.md).
function cardTransform(id) {
    const magnitude = ROTATE_MIN_DEG + seeded01(id, "rotate-mag") * (ROTATE_MAX_DEG - ROTATE_MIN_DEG);
    const sign = seeded01(id, "rotate-sign") < 0.5 ? -1 : 1;
    const rotate = magnitude * sign;
    const jitterX = (seeded01(id, "jitter-x") - 0.5) * JITTER_RANGE_PX;
    const jitterY = (seeded01(id, "jitter-y") - 0.5) * JITTER_RANGE_PX;
    const tear = 1 + Math.floor(seeded01(id, "tear") * TEAR_PRESET_COUNT);
    const tapeRotate = (seeded01(id, "tape-rotate") - 0.5) * 2 * TAPE_ROTATE_MAX_DEG;
    return { rotate, jitterX, jitterY, tear, tapeRotate };
}

/* eslint-disable react/prop-types */
// No propTypes convention/dependency in this codebase (same precedent as
// turntable.jsx's `track` prop) — one block-disable rather than per-line,
// since these props are read at several places in TasteCard/PhotoSlot, not
// just their destructuring site.
// `area` is optional (Task 3.5) — the wall's cards pass one (a named grid
// area), the crate's singles don't (they're flex-column items, not grid
// cells); `gridArea: undefined` is simply omitted by React/the style object,
// so this is the same component either way, not a second card mechanism.
function TasteCard({ id, area, className, children }) {
    const { rotate, jitterX, jitterY, tear, tapeRotate } = cardTransform(id);
    return (
        <article
            className={`my-taste-card my-taste-card--tear-${tear} ${className}`}
            style={{
                gridArea: area,
                "--card-rotate": `${rotate.toFixed(2)}deg`,
                "--card-jitter-x": `${jitterX.toFixed(1)}px`,
                "--card-jitter-y": `${jitterY.toFixed(1)}px`,
                "--tape-rotate": `${tapeRotate.toFixed(1)}deg`,
            }}
        >
            <div className="my-taste-card-tape" />
            {children}
        </article>
    );
}

// Task 2's flat --card-tint fill is now the FALLBACK, not the default — it
// still renders on its own (this component's base markup never changed,
// exactly the forward-compat Task 2 built isolation: isolate for) whenever
// there's no image to show: `imageUrl` missing (empty images[] from the
// API) or a real URL that failed to load (`onError`, below — network flake,
// expired CDN link, a failure mode that didn't exist until this task
// actually loads live network images for the first time). Both paths land
// on the exact same treatment, not two different-looking failures.
//
// When there IS an image: grayscale(1) contrast(1.1) flattens it to tone
// only, then a separate --card-tint layer blended with mix-blend-mode:
// color recolors it — hue/saturation from the tint, luminosity from the
// photo underneath, the standard single-hue duotone technique. Both layers
// are position:absolute + inset:0 inside the slot (position:relative,
// main.scss), so neither touches the slot's own aspect-ratio/rotation/
// jitter box — additive to Task 2's structure, per the brief.
function PhotoSlot({ id, className, imageUrl, imageAlt }) {
    const [failed, setFailed] = useState(false);
    const showImage = Boolean(imageUrl) && !failed;
    return (
        <div
            className={`my-taste-photo-slot ${className}`}
            style={{ "--card-tint": `var(--vinyl-${colorwayFor(id)})` }}
        >
            {showImage && (
                <>
                    <img
                        className="my-taste-photo-slot-img"
                        src={imageUrl}
                        alt={imageAlt}
                        loading="lazy"
                        onError={() => setFailed(true)}
                    />
                    <div className="my-taste-photo-slot-tint" />
                </>
            )}
        </div>
    );
}
/* eslint-enable react/prop-types */

export default function MyTaste() {
    const [tracks, setTracks] = useState({ status: "loading", data: [] });
    const [artists, setArtists] = useState({ status: "loading", data: [] });

    useEffect(() => {
        fetchTopItems("tracks").then(setTracks);
        fetchTopItems("artists").then(setArtists);
    }, []);

    // Reshape into the poster's actual roles, not one flat list each.
    // limit=5 on both server endpoints (server.js, untouched since Task 1) is
    // exactly headliner + 4 support acts — don't add a 6th artist or a 4th
    // support act without re-deriving the wall's grid (4 named support-N
    // areas). The crate (below) isn't grid-area-bound, but was still sized
    // this task around exactly 5 singles.
    const headliner = artists.data[0]
        ? {
            ...artists.data[0],
            imageAlt: artists.data[0].name,
            imageUrl: pickImageUrl(artists.data[0].images, { large: true }),
        }
        : null;
    const support = artists.data.slice(1, 5).map((artist) => ({
        ...artist,
        imageAlt: artist.name,
        imageUrl: pickImageUrl(artist.images),
    }));
    const setlist = tracks.data.map((track) => ({
        ...track,
        imageAlt: `Album cover — ${track.name} by ${track.artists.map((a) => a.name).join(", ")}`,
        imageUrl: pickImageUrl(track.album?.images),
    }));

    return (
        <section className="my-taste-section">
            {/* The section's own title — headliner/support/setlist content
                below is content, not a second or third heading for it. */}
            <h2 className="my-taste-heading">now spinning · my taste</h2>

            <div className="my-taste-layout">
                <div className="my-taste-wall">
                    {artists.status === "ready" && headliner ? (
                        <TasteCard id={headliner.id} area="headliner" className="my-taste-card--headliner">
                            <PhotoSlot
                                id={headliner.id}
                                className="my-taste-photo-slot--headliner"
                                imageUrl={headliner.imageUrl}
                                imageAlt={headliner.imageAlt}
                            />
                            <p className="my-taste-headliner-name">{headliner.name}</p>
                        </TasteCard>
                    ) : (
                        <div className="my-taste-card-placeholder" style={{ gridArea: "headliner" }}>
                            <SpotifyStatusMessage status={artists.status} kind="artists" />
                        </div>
                    )}

                    {support.length > 0
                        ? support.map((artist, i) => (
                            <TasteCard key={artist.id} id={artist.id} area={`support-${i + 1}`} className="my-taste-card--support">
                                <PhotoSlot
                                    id={artist.id}
                                    className="my-taste-photo-slot--support"
                                    imageUrl={artist.imageUrl}
                                    imageAlt={artist.imageAlt}
                                />
                                <p className="my-taste-support-name">{artist.name}</p>
                            </TasteCard>
                        ))
                        : artists.status !== "ready" && [1, 2, 3, 4].map((i) => (
                            <div key={i} className="my-taste-card-placeholder" style={{ gridArea: `support-${i}` }} />
                        ))}
                </div>

                {/* The crate — Task 3.5. Setlist as a stack of small torn
                    "singles" beside the wall, not a row underneath it. Each
                    single reuses TasteCard (same rotation/jitter/torn-edge/
                    tape mechanism as the wall's own cards, no area prop since
                    this is a flex column, not a grid) and PhotoSlot (same
                    duotone/fallback/lazy-load behavior Task 3 built) — only
                    the internal layout and size are new. */}
                <div className="my-taste-crate">
                    <p className="my-taste-crate-label">setlist</p>
                    {tracks.status === "ready" && setlist.length > 0 ? (
                        setlist.map((track, index) => (
                            <TasteCard key={track.id ?? index} id={track.id ?? index} className="my-taste-single">
                                <PhotoSlot
                                    id={track.id}
                                    className="my-taste-photo-slot--single"
                                    imageUrl={track.imageUrl}
                                    imageAlt={track.imageAlt}
                                />
                                <div className="my-taste-single-text">
                                    <span className="my-taste-single-index">{index + 1}</span>
                                    <span className="my-taste-single-track">{track.name}</span>
                                    <span className="my-taste-single-artist">
                                        {track.artists.map((a) => a.name).join(", ")}
                                    </span>
                                </div>
                            </TasteCard>
                        ))
                    ) : (
                        <div className="my-taste-card-placeholder my-taste-crate-placeholder">
                            <SpotifyStatusMessage status={tracks.status} kind="tracks" />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
