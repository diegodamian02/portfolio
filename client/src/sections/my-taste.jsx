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
import { photoColorwayFor } from "../components/vinyl-record.jsx";
import { seeded01 } from "../lib/hash.js";
// Same theme-swapped pair footer.jsx's own Spotify link already uses — no
// third icon asset, no icon library, per the brief's own instruction to
// reuse whatever already renders platform marks on this site.
import spotifyWhite from "../assets/spotify_white.png";
import spotifyBlack from "../assets/spotify_black.png";

// Stage 4 Task 2 — the wall's structure and hierarchy: headliner (large) + 4
// support acts, arranged on a CSS Grid so overlap is structurally impossible
// rather than something to verify after the fact — full reasoning in
// design-review/stage4-my-taste-concept.md. Torn edges and tape accents are
// real. Task 2.5 tuned card/photo sizes to fit within roughly one screen.
// Task 3 swapped the flat --card-tint placeholders for real Spotify images,
// duotone-tinted. Task 3.5 split the section into two columns — the wall
// (this grid, headliner + support only) beside a crate column for the
// setlist — so total section height is max(wall, crate) instead of wall +
// a setlist row stacked below it. Task 3.6 (this task) is a refinement pass:
// the headliner reads smaller now, the crate went back to one plain
// numbered list (Task 3.5's five individually-torn "singles" read too busy)
// with art on only the top 3 tracks, and photo duotones use a narrower
// photoColorwayFor (vinyl-record.jsx) instead of colorwayFor — two of
// colorwayFor's five tokens are near-neutral (correct for real vinyl,
// wrong for a photo wash). Task 3.8 was a polish pass, no structural
// change: the kicker links out to Spotify (real profile URL, reused from
// footer.jsx, not invented here), every artist/track card is a real link to
// its own Spotify page, and the crate's own card lost its rotation/jitter
// (kept its torn edge/tape) so it reads as a straight list beside the
// wall's still-tilted cards.
//
// Task 3.7 (THIS task, landing after 3.8 despite the number — brief called
// it a follow-up to Task 3.6 and didn't reference 3.8 at all, so building it
// on top of 3.8's already-shipped links/straightened-crate is a superset of
// what it asked for, not a conflict; noted rather than silently reordering
// history) restructures the wall's hierarchy. Was: 1 "headliner" (data[0])
// at 2x size + 4 uniform "support" cards (data[1..4]) — hierarchy expressed
// entirely through one card's raw size. Now: "featured" (data[0..1], 2
// cards, deliberately SAME size/treatment as each other — the actual fix,
// not a rename) + "secondary" (data[2..4], 3 cards, a clearly smaller
// tier). The crate (Zone C in the brief's terms) is unchanged structurally
// — still the same single TasteCard Task 3.6 shaped and Task 3.8 straightened.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5050").replace(/\/+$/, "");

// Same account footer.jsx's own Spotify link already points at — reused
// verbatim (not a second profile) rather than hardcoding a placeholder.
const SPOTIFY_PROFILE_URL = "https://open.spotify.com/user/12182870270?si=ff914bbc78404c66";

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
// available for a card sized to deserve it (both Zone A "featured" cards
// as of Task 3.7, was just the old singular headliner before); everything
// else prefers something already close to the size it'll render at
// (<=400px covers every secondary/thumb slot on this wall at any
// breakpoint) over pulling the same 640px original into a ~200px box for
// nothing — the whole reason this project's own load-speed story (152MB ->
// 9.6MB) is worth protecting. Falls back to whatever's smallest/largest
// available if an artist only ships one size (seen on some lower-popularity
// artists).
function pickImageUrl(images, { large = false } = {}) {
    if (!Array.isArray(images) || images.length === 0) return null;
    if (large) return images[0].url;
    // Walking largest -> smallest (Spotify's own order) and taking the FIRST
    // one at or under 400px lands on the biggest size that's still small —
    // e.g. 320px out of [640, 320, 160], not the smallest available. Retina
    // displays render a ~165px CSS-wide secondary photo slot at ~330px
    // actual pixels (measured live, Task 3.7 — was ~200px/400px when there
    // were 4 uniform support cards instead of 3 secondary ones), so 320px
    // is still comfortably close to native there without pulling the full
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
// wall (secondary acts as of Task 3.7, ~185×197px at 1440px, measured live
// — was ~230×196px for the old 4-card "support" tier, Task 2.5) grow by
// roughly 6-7px per side; adding the ±4px jitter tops out around 10-11px
// per side. .my-taste-card's own margin (--space-3, 12px, unchanged by
// this task) plus half of .my-taste-wall's gap (--space-3, also unchanged)
// gives ~18px of real dead space per side — comfortably clear, a similar
// margin to before Task 3.7's regrid even though the card shape itself
// changed. Verified live too, not just by this math: a Playwright pass
// measures every rendered card's actual bounding box against its
// neighbors at 1440/1024/768px, re-run after Task 3.7's regrid with the
// same zero-overlap result (see stage4-my-taste-concept.md).
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
//
// `href` is optional too (Task 3.8), same pattern: the wall's featured/
// secondary cards (Task 3.7's rename of headliner/support — see this
// file's top comment) pass their artist's real `external_urls.spotify` and
// get wrapped in a real `<a>` (keyboard/screen-reader access, not a `div` +
// onClick — same discipline this section's alt text already follows); the
// crate's own setlist-container card passes none (it isn't itself a link —
// each track inside it links individually, see the setlist markup below),
// so `content` just falls back to plain `children`, unchanged from before
// this task. One component, one conditional, not two card mechanisms.
function TasteCard({ id, area, className, href, children }) {
    const { rotate, jitterX, jitterY, tear, tapeRotate } = cardTransform(id);
    const content = href ? (
        <a className="my-taste-card-link" href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ) : (
        children
    );
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
            {content}
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
//
// photoColorwayFor, not colorwayFor (Task 3.6) — same deterministic hash,
// restricted to the 3 tokens that read as genuinely colored once blended
// onto a photo (vinyl-record.jsx's own comment has the full reasoning);
// colorwayFor's other 2 tokens are correct for real vinyl but read as a
// plain gray photo here.
function PhotoSlot({ id, className, imageUrl, imageAlt }) {
    const [failed, setFailed] = useState(false);
    const showImage = Boolean(imageUrl) && !failed;
    return (
        <div
            className={`my-taste-photo-slot ${className}`}
            style={{ "--card-tint": `var(--vinyl-${photoColorwayFor(id)})` }}
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
    // Same minimal theme-listener footer.jsx and navbar.jsx already each
    // carry their own copy of (no shared hook exists in this codebase for
    // it) — needed here only for the kicker's Spotify mark, which theme-
    // swaps the same way footer.jsx's own copy of that exact icon does.
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

    useEffect(() => {
        fetchTopItems("tracks").then(setTracks);
        fetchTopItems("artists").then(setArtists);
    }, []);

    useEffect(() => {
        const handleTheme = () => setTheme(document.documentElement.getAttribute("data-theme") || "dark");
        window.addEventListener("themeChange", handleTheme);
        return () => window.removeEventListener("themeChange", handleTheme);
    }, []);

    // Reshape into the poster's actual roles, not one flat list each.
    // limit=5 on both server endpoints (server.js, untouched since Task 1) is
    // exactly 2 featured + 3 secondary acts (Task 3.7 — was 1 headliner + 4
    // support before) — don't add a 6th artist without re-deriving the
    // wall's grid (2 named featured-N areas + 3 secondary-N areas). The
    // crate's own list is sized around exactly 5 tracks too
    // (setlist.slice(0, 3) for thumbnails assumes at least 3 exist).
    //
    // Both featured artists get the LARGE image variant (Task 3.7) — before,
    // only data[0] (the old headliner) did, since it was the only card sized
    // to deserve it. Now both Zone A cards render at that same larger size,
    // so both get the larger source image; secondary keeps the ≤400px pick,
    // same reasoning as before, just fewer cards (3, not 4).
    const featured = artists.data.slice(0, 2).map((artist) => ({
        ...artist,
        imageAlt: artist.name,
        imageUrl: pickImageUrl(artist.images, { large: true }),
    }));
    const secondary = artists.data.slice(2, 5).map((artist) => ({
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
            {/* The section's own title — featured/secondary/setlist content
                below is content, not a second or third heading for it.
                Task 3.8: now the ONE real outbound link for this whole
                section too — "now spinning · my taste" replaced with a
                kicker that reads as a link, not decoration, per the brief.
                The <a> lives INSIDE the <h2> (not the reverse) so the
                section keeps exactly one real heading, same as before this
                task — its accessible name is just the link's own text now. */}
            <h2 className="my-taste-heading">
                <a className="my-taste-heading-link" href={SPOTIFY_PROFILE_URL} target="_blank" rel="noopener noreferrer">
                    my taste
                    <span className="my-taste-heading-dot" aria-hidden="true">·</span>
                    listen on spotify
                    {/* alt="" (decorative), unlike footer.jsx's OWN copy of
                        this same icon (alt="Spotify" there) — this icon
                        rides alongside text that already says "listen on
                        spotify," so announcing it a second time would be
                        redundant, not helpful. */}
                    <img className="my-taste-heading-icon" src={theme === "dark" ? spotifyWhite : spotifyBlack} alt="" />
                </a>
            </h2>

            <div className="my-taste-layout">
                {/* Two tiers (Task 3.7), not one dominant card + four uniform
                    ones. Zone A ("featured", data[0..1]) share ONE className/
                    photo-slot/name treatment — same size, same styling — so
                    they read as comparably prominent to EACH OTHER, which is
                    the actual fix this task is for, not just a bigger label
                    on the same old hierarchy. Zone B ("secondary",
                    data[2..4]) is the clearly smaller tier below. */}
                <div className="my-taste-wall">
                    {featured.length > 0
                        ? featured.map((artist, i) => (
                            <TasteCard
                                key={artist.id}
                                id={artist.id}
                                area={`featured-${i + 1}`}
                                className="my-taste-card--featured"
                                href={artist.external_urls?.spotify}
                            >
                                <PhotoSlot
                                    id={artist.id}
                                    className="my-taste-photo-slot--featured"
                                    imageUrl={artist.imageUrl}
                                    imageAlt={artist.imageAlt}
                                />
                                <p className="my-taste-featured-name">{artist.name}</p>
                            </TasteCard>
                        ))
                        : artists.status !== "ready" && [1, 2].map((i) => (
                            <div key={i} className="my-taste-card-placeholder" style={{ gridArea: `featured-${i}` }}>
                                {i === 1 && <SpotifyStatusMessage status={artists.status} kind="artists" />}
                            </div>
                        ))}

                    {secondary.length > 0
                        ? secondary.map((artist, i) => (
                            <TasteCard
                                key={artist.id}
                                id={artist.id}
                                area={`secondary-${i + 1}`}
                                className="my-taste-card--secondary"
                                href={artist.external_urls?.spotify}
                            >
                                <PhotoSlot
                                    id={artist.id}
                                    className="my-taste-photo-slot--secondary"
                                    imageUrl={artist.imageUrl}
                                    imageAlt={artist.imageAlt}
                                />
                                <p className="my-taste-secondary-name">{artist.name}</p>
                            </TasteCard>
                        ))
                        : artists.status !== "ready" && [1, 2, 3].map((i) => (
                            <div key={i} className="my-taste-card-placeholder" style={{ gridArea: `secondary-${i}` }} />
                        ))}
                </div>

                {/* The crate — one plain numbered list again as of Task 3.6,
                    not Task 3.5's five individually torn "singles" (read too
                    busy per direct feedback). Closer to Task 3's original
                    shape: one TasteCard (torn edge + tape, same mechanism as
                    the wall's own cards), a fanned row of the top 3 tracks'
                    art up top, then the full 5-track list below it — only
                    the top 3 carry art, not all 5, so the crate isn't
                    "1 card containing a card each." No `href` on this
                    TasteCard (Task 3.8) — the crate ITSELF isn't a link,
                    each track below links individually instead. Rotation/
                    jitter also comes off this specific card in main.scss
                    (.my-taste-card--setlist) — the wall's cards keep theirs
                    exactly as-is; only the crate straightens. */}
                <div className="my-taste-crate">
                    {tracks.status === "ready" && setlist.length > 0 ? (
                        <TasteCard id="setlist" className="my-taste-card--setlist">
                            <div className="my-taste-setlist-thumbs">
                                {setlist.slice(0, 3).map((track) => (
                                    <PhotoSlot
                                        key={track.id}
                                        id={track.id}
                                        className="my-taste-photo-slot--thumb"
                                        imageUrl={track.imageUrl}
                                        imageAlt={track.imageAlt}
                                    />
                                ))}
                            </div>
                            <ol className="my-taste-setlist">
                                {setlist.map((track, index) => (
                                    <li key={track.id ?? index} className="my-taste-setlist-item">
                                        {/* Whole row is one <a> (Task 3.8),
                                            not just the track name — a
                                            bigger, single focusable/tappable
                                            target per row, same "real <a>,
                                            not a div+onClick" discipline the
                                            wall's cards use. */}
                                        <a
                                            className="my-taste-setlist-link"
                                            href={track.external_urls?.spotify}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span className="my-taste-setlist-index">{index + 1}</span>
                                            <span className="my-taste-setlist-track">{track.name}</span>
                                            <span className="my-taste-setlist-artist">
                                                {track.artists.map((a) => a.name).join(", ")}
                                            </span>
                                        </a>
                                    </li>
                                ))}
                            </ol>
                        </TasteCard>
                    ) : (
                        <div className="my-taste-card-placeholder">
                            <SpotifyStatusMessage status={tracks.status} kind="tracks" />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
