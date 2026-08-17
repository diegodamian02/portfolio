import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useGSAP } from "@gsap/react";
import {
    gsap, ScrollTrigger, SplitText,
    CARD_LAND_EASE, CARD_LAND_SQUASH_EASE, PIN_SNAP_EASE,
} from "../lib/gsap.js";
import { getActiveLenis, isProgrammaticScrollActive, onProgrammaticScrollChange } from "../lib/scroll.js";
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
// Task 3.7 (landed after 3.8 despite the number — brief called it a
// follow-up to Task 3.6 and didn't reference 3.8 at all, so building it on
// top of 3.8's already-shipped links/straightened-crate was a superset of
// what it asked for, not a conflict; noted rather than silently reordering
// history) restructures the wall's hierarchy. Was: 1 "headliner" (data[0])
// at 2x size + 4 uniform "support" cards (data[1..4]) — hierarchy expressed
// entirely through one card's raw size. Now: "featured" (data[0..1], 2
// cards, deliberately SAME size/treatment as each other — the actual fix,
// not a rename) + "secondary" (data[2..4], 3 cards, a clearly smaller
// tier). The crate (Zone C in the brief's terms) is unchanged structurally
// — still the same single TasteCard Task 3.6 shaped and Task 3.8 straightened.
// A follow-up fix (2026-08-17) then cut a copied, unverified 180px grid-row
// minimum down to 90px — the featured tier's real content never needed the
// old headliner block's own floor, and the unused 180px was forcing dead
// space under both featured cards' names (main.scss has the full story).
//
// Task 4 adds motion on top of the above — no layout/grid/sizing change, per
// its own brief. A ScrollTrigger pin (reusing Experience's own `pin: true`
// mechanism) holds the section in view while a paused, non-scrubbed GSAP
// timeline cascades the kicker, then the wall's cards (CustomBounce
// landings + CustomWiggle tape snaps, one MotionPathPlugin arc on the first
// card), then the crate (plain fade/slide, no bounce — it's this section's
// one already-straightened object). Real scroll input is held via
// lenis.stop()/start() for the hold's duration, the same primitive About's
// own Task 5 entrance-hold uses, NOT Experience's scrub (this timeline runs
// on its own clock, not tied to scroll distance). Skipped entirely below
// 601px — see the mm.add() comment further down for why — and under
// prefers-reduced-motion, same as every other animated section on this
// site. Task 4's own brief mockup named two things that didn't exist in
// this file at the time: a profile avatar next to "MY TASTE" (Task 3.9,
// then unbuilt — checked against git log/ROADMAP.md/STATUS.md; flagged as
// its own separate open item rather than built inside Task 4) and a
// "MY TOP 5 TRACKS" label inside the crate (built for real in Task 4.1,
// below, once actually asked for).
//
// Task 3.9 adds the kicker's own avatar — AvatarSlot, below, Diego's real
// Spotify profile photo via a new GET /me-backed server route
// (server/server.js), same duotone treatment as every other photo in this
// section (tried first per the brief, kept — a real face reads fine
// through it). Renders nothing at all when there's no image to show, same
// "hide rather than show broken" discipline as PhotoSlot's own fallback.
// Not part of Task 4's own cascade (out of scope for 3.9) — renders
// immediately, same as the kicker's existing dot/Spotify-icon.
//
// Task 4.1 is a refinement pass on Task 4's cascade, not a rebuild: (1)
// CustomBounce's own `strength` on the wall cards themselves pulled back
// (0.6 -> 0.3, lib/gsap.js) after live feedback that the landing read as a
// generic ball-bounce rather than specifically "a flyer being pinned" — the
// tape/pin keeps the more energetic motion (CustomWiggle, unchanged) by
// contrast; (2) a deliberate pause (PIN_BEAT_GAP) now separates "the card
// arrives" from "it gets pinned" into two beats instead of one
// near-simultaneous motion; (3) each card's settle now includes a small
// rotation from level (0deg) into its own real tilt, pivoted around the
// tape's own anchor point (transform-origin: 50% 0%, not the card's
// center) so it reads as hinged at the pin, not spinning around its own
// middle; (4) two new zone titles ("MY TOP ARTISTS" / "MY TOP 5 TRACKS"),
// each with the kicker's own SplitText pop treatment, each popping in just
// before its own zone's cascade starts. Also ran Task 3.9's file for real
// (a follow-up brief claimed it "was already written earlier and simply
// never run" — checked against the tree: no such file existed anywhere:
// no commit, nothing in STATUS.md/ROADMAP.md beyond Task 4's own
// "flagged, not built" note. Most likely explanation, consistent with this
// project's own established workflow: the design-research chat that writes
// these briefs has no repo access and doesn't know what has or hasn't
// shipped — so "already written" probably meant "I already drafted this
// brief," not "this exists in the codebase." Built it for real here rather
// than searching for a file that was never going to exist.
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

// Stage 4 Task 3.9 — the kicker's own avatar. Same account, same token, same
// server-side auth/refresh already built for the two top-items endpoints
// (server.js's ensureAccessToken()); this just points at Spotify's Get
// Current User's Profile endpoint instead of /me/top/*. `imageUrl: null`
// (no `images` at all, or an empty array) is a real, not hypothetical,
// response shape — Spotify only populates profile images for accounts that
// have set one — so this returns null rather than throwing, and AvatarSlot
// (below) renders nothing at all for it, same "hide rather than show a
// broken image" discipline as PhotoSlot's own onError fallback.
async function fetchProfile() {
    try {
        const { data } = await axios.get(`${apiBaseUrl}/api/spotify/profile`);
        return { status: "ready", imageUrl: pickImageUrl(data.images) };
    } catch (error) {
        console.error("Error fetching profile:", error);
        return { status: "error", imageUrl: null };
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

// Task 4's entrance drops each wall card in from above, then animates it to
// "landed." Landed can't just mean x:0/y:0 — the card's own REST position
// already carries a --card-jitter-x/-y translate (this file's own
// cardTransform, above), inline-set by TasteCard on the same element GSAP is
// about to take over. GSAP decomposes whatever transform is already on an
// element the FIRST time it touches x/y/rotation/scale on it, so rotation
// survives automatically without this file ever touching it — but once a
// tween explicitly targets x/y (the entrance drop does), the tween's own end
// value is what the card rests at, not whatever the CSS custom property
// said. Reading the SAME two custom properties back (not re-deriving them
// from cardTransform/seeded01 a second time) keeps this honest: whatever
// TasteCard actually set inline is what "landed" animates toward, so a
// future change to cardTransform's own math can't silently desync the two.
function jitterOf(card) {
    const style = card.style;
    return {
        jx: parseFloat(style.getPropertyValue("--card-jitter-x")) || 0,
        jy: parseFloat(style.getPropertyValue("--card-jitter-y")) || 0,
    };
}

// Task 4.1 — the settle's own rotation target, same "read the real inline
// value back" discipline as jitterOf just above (and for the same reason:
// the entrance's rotation tween needs to land exactly where cardTransform()
// actually put this specific card, not a re-derived guess).
function rotationOf(card) {
    return parseFloat(card.style.getPropertyValue("--card-rotate")) || 0;
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

// Stage 4 Task 3.9 — the kicker's own circular avatar. Deliberately a small,
// bespoke duotone (not PhotoSlot reused as-is): PhotoSlot's own scaffolding
// — aspect-ratio slot, torn-edge parent, tape — is built for a wall/crate
// CARD, none of which applies to a tiny circular badge sitting inline in a
// text row. Same two-layer technique underneath, though (grayscale+contrast
// photo, a mix-blend-mode: color tint layer above it, one shared --card-tint
// custom property) — tried duotone first per the brief's own instruction
// ("consistency has been the right call everywhere else in this stage"),
// and a real face read fine through it, not muddy — kept, not reverted.
// photoColorwayFor needs an id to hash against; this is the one image in the
// section with no natural Spotify id of its own (it's the owner's account,
// not an artist/track), so it hashes a fixed literal instead — deterministic
// across reloads same as every other id-driven value in this file, just
// salted from a string constant rather than an API id.
//
// Renders nothing at all — not a broken-image icon, not a placeholder ring —
// when there's no image to show (fetch failed, or the account has no photo
// set, a real Spotify response shape, not hypothetical) or a real URL that
// failed to load. Same "hide rather than show broken" discipline as
// PhotoSlot's own onError fallback, just with nothing to fall back TO here
// (no flat-tint placeholder makes sense for "a photo of a specific person").
function AvatarSlot({ imageUrl, imageAlt }) {
    const [failed, setFailed] = useState(false);
    if (!imageUrl || failed) return null;
    return (
        <span className="my-taste-avatar" style={{ "--card-tint": `var(--vinyl-${photoColorwayFor("diego-avatar")})` }}>
            <img
                className="my-taste-avatar-img"
                src={imageUrl}
                alt={imageAlt}
                onError={() => setFailed(true)}
            />
            <span className="my-taste-avatar-tint" aria-hidden="true" />
        </span>
    );
}
/* eslint-enable react/prop-types */

export default function MyTaste() {
    const [tracks, setTracks] = useState({ status: "loading", data: [] });
    const [artists, setArtists] = useState({ status: "loading", data: [] });
    const [avatar, setAvatar] = useState({ status: "loading", imageUrl: null });
    // Same minimal theme-listener footer.jsx and navbar.jsx already each
    // carry their own copy of (no shared hook exists in this codebase for
    // it) — needed here only for the kicker's Spotify mark, which theme-
    // swaps the same way footer.jsx's own copy of that exact icon does.
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
    const rootRef = useRef(null);
    const kickerRef = useRef(null);
    const wallTitleRef = useRef(null);
    const crateTitleRef = useRef(null);

    useEffect(() => {
        fetchTopItems("tracks").then(setTracks);
        fetchTopItems("artists").then(setArtists);
        fetchProfile().then(setAvatar);
    }, []);

    useEffect(() => {
        const handleTheme = () => setTheme(document.documentElement.getAttribute("data-theme") || "dark");
        window.addEventListener("themeChange", handleTheme);
        return () => window.removeEventListener("themeChange", handleTheme);
    }, []);

    // Stage 4 Task 4 — the entrance cascade: a timed scroll-hold (pin, then
    // each card lands individually) rather than one blanket reveal.
    // Gated on both fetches actually being "ready" (dependencies below) —
    // building this against placeholders would mean gsap.utils.toArray()
    // below finds no real cards to select at all, and re-running once real
    // data lands is exactly what useGSAP's own dependency-array re-invoke
    // is for (same tool Experience/About already lean on for their own
    // effects, just against async data here instead of a fixed roster).
    useGSAP(() => {
        if (artists.status !== "ready" || tracks.status !== "ready") return undefined;

        const mm = gsap.matchMedia();

        // Three conditions, not two — mobile is deliberately its OWN
        // "do nothing" branch alongside reduced-motion, not folded into the
        // full-motion branch with a runtime bail. Task 3.7/3.8 both scoped
        // mobile out explicitly; this task's own brief doesn't repeat that
        // line, but the reasoning still applies and is arguably sharper
        // here: mobile's own measured fit ratio is 2.68× viewport height
        // (stage4-my-taste-concept.md §10) — pinning (position: fixed) a
        // section that tall would hold a visitor captive against content
        // most of which is cut off above/below the viewport for the whole
        // hold, which is a real regression, not just an untuned one. Every
        // other animated section on this site (About, Experience) that
        // pins/holds scroll already carries its own "section taller than
        // available, don't hold" escape hatch for exactly this failure
        // mode (see the runtime check inside onEnter below) — this is the
        // same judgment made one media query earlier, before ever
        // constructing the pin at all, since on mobile it isn't an edge
        // case, it's the guaranteed case. Deliberate mobile art direction
        // for this section (a real, tuned-for-the-breakpoint entrance) is
        // Stage 5's job, same as the layout itself.
        mm.add({
            fullMotion: "(min-width: 601px) and (prefers-reduced-motion: no-preference)",
        }, (context) => {
            if (!context.conditions.fullMotion) return undefined;

            const kickerSplit = new SplitText(kickerRef.current, { type: "words" });
            // Task 4.1 — the two zone titles, same SplitText/whole-word-pop
            // treatment as the kicker itself ("consistent with the kicker's
            // existing pop treatment," the brief's own wording) — plain
            // text, no dot/icon to worry about, so nothing about the
            // "words, not lines" reasoning above needs re-litigating here.
            const wallTitleSplit = new SplitText(wallTitleRef.current, { type: "words" });
            const crateTitleSplit = new SplitText(crateTitleRef.current, { type: "words" });
            const wallCards = gsap.utils.toArray(".my-taste-wall > .my-taste-card", rootRef.current);
            const wallTapes = gsap.utils.toArray(".my-taste-wall > .my-taste-card > .my-taste-card-tape", rootRef.current);
            const crateCard = rootRef.current.querySelector(".my-taste-crate .my-taste-card");
            const crateTape = rootRef.current.querySelector(".my-taste-crate .my-taste-card-tape");
            const crateThumbs = gsap.utils.toArray(".my-taste-photo-slot--thumb", rootRef.current);
            const setlistRows = gsap.utils.toArray(".my-taste-setlist-item", rootRef.current);

            // Defensive only — artists/tracks "ready" (checked above)
            // already implies non-empty data (fetchTopItems's own status
            // logic), so these selectors finding nothing would mean the
            // DOM and this component's own data state have desynced, not
            // an expected path.
            if (wallCards.length === 0 || !crateCard) return undefined;

            const headliner = wallCards[0];
            const headTape = wallTapes[0];
            const restCards = wallCards.slice(1);
            const restTapes = wallTapes.slice(1);
            const headJitter = jitterOf(headliner);
            const headRotation = rotationOf(headliner);

            // Hidden until the timeline reveals it — applied immediately
            // (plain gsap.set, not inside `tl`) so nothing flashes fully
            // visible before the pin/timeline actually engages, same
            // convention About's own mask-reset uses.
            gsap.set(kickerSplit.words, { opacity: 0, y: 10 });
            gsap.set(wallTitleSplit.words, { opacity: 0, y: 8 });
            gsap.set(crateTitleSplit.words, { opacity: 0, y: 8 });
            // Task 4.1 — rotation starts level (0deg), settling INTO each
            // card's own real tilt as it lands, rather than starting at
            // that tilt already. transform-origin moved to the tape's own
            // anchor point (tape sits at top: -10px; left: 50% — top-center
            // of the card, main.scss) instead of the card's own geometric
            // center, so that settle reads as hinged at the pin, the way a
            // real pinned sheet sways around where it's actually pinned,
            // not around its own middle. Reset back to center via
            // clearProps once the cascade settles (below) — this shouldn't
            // outlive the entrance for any future transform this card gets
            // (e.g. a hover effect).
            gsap.set(restCards, { opacity: 0, y: -36, rotation: 0, transformOrigin: "50% 0%" });
            // Headliner gets its own start state (a MotionPathPlugin arc
            // start point, not the plain vertical -36 the rest use) —
            // set separately so it isn't overwritten by/doesn't overwrite
            // the line above.
            gsap.set(headliner, { opacity: 0, x: -22, y: -58, rotation: 0, transformOrigin: "50% 0%" });
            gsap.set(wallTapes, { opacity: 0, scale: 0.5 });
            gsap.set(crateCard, { opacity: 0, y: 24 });
            gsap.set(crateTape, { opacity: 0, scale: 0.5 });
            gsap.set(crateThumbs, { opacity: 0, y: -14 });
            gsap.set(setlistRows, { opacity: 0, y: 10 });

            let holding = false;
            function releaseHold() {
                if (!holding) return;
                holding = false;
                getActiveLenis()?.start();
                window.removeEventListener("touchmove", blockTouchMove, { capture: true });
                window.removeEventListener("keydown", blockScrollKeys, { capture: true });
            }
            const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);
            function blockScrollKeys(e) {
                if (SCROLL_KEYS.has(e.key)) e.preventDefault();
            }
            function blockTouchMove(e) {
                e.preventDefault();
            }

            const tl = gsap.timeline({ paused: true, onComplete: releaseHold });

            // 1. Kicker — SplitText's own words, all animated together with
            //    NO stagger ("one unified pop, not a per-character reveal" —
            //    the brief's own wording). type: "words", not "chars"/
            //    "lines": the kicker <a> mixes text nodes with a dot <span>
            //    and the Spotify <img> as siblings; word-splitting only
            //    touches TEXT, leaving both untouched in place, rather than
            //    risking "lines" (measures rendered line boxes — untested
            //    against this element's own display: inline-flex row) on
            //    something that already has to hold together right.
            tl.to(kickerSplit.words, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 0);

            // Task 4.1 — "MY TOP ARTISTS" pops in just before the wall's own
            // cascade starts, same unified-pop treatment as the kicker.
            tl.to(wallTitleSplit.words, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ">-=0.2");

            // 2. Headliner — MotionPathPlugin arc handing off into
            //    CustomBounce for the actual landing, tape snapping via
            //    CustomWiggle a beat after it settles (Task 4.1 — see the
            //    PIN_BEAT_GAP note below). Arc scoped to ONE card, not the
            //    whole wall: CustomBounce's own eased output isn't
            //    monotonic (it revisits values below its target between
            //    each simulated bounce, by design — that's what reads as a
            //    bounce) — driving a motionPath's progress with that same
            //    non-monotonic ease would drag the card backward along its
            //    curve on every bounce, visibly fighting itself. Splitting
            //    the arc into its OWN short tween (plain "power2.in", no
            //    bounce) that lands just short of rest, THEN handing off to
            //    a separate plain-axis bounce tween for the final settle,
            //    sidesteps that entirely — satisfies "landing into the
            //    CustomBounce ease at the end" literally without the two
            //    plugins ever animating the same property at once.
            //
            //    Rotation is now part of this same land tween too (Task
            //    4.1): starts level (0deg, set above) and settles INTO the
            //    card's own real tilt (headRotation), pivoting around the
            //    tape's own anchor (transform-origin, set above) rather
            //    than the card's center — reads as the sheet swinging into
            //    its pinned tilt, not a ball dropping straight down.
            tl.to(headliner, {
                motionPath: { path: [{ x: -22, y: -58 }, { x: 6, y: -20 }, { x: 0, y: -6 }], curviness: 1.25 },
                opacity: 1,
                duration: 0.18,
                ease: "power2.in",
            }, 0.2);
            tl.to(headliner, { x: headJitter.jx, y: headJitter.jy, rotation: headRotation, duration: 0.4, ease: CARD_LAND_EASE }, ">");
            tl.to(headliner, { scaleX: 1.05, scaleY: 0.92, duration: 0.4, ease: CARD_LAND_SQUASH_EASE }, "<");
            // PIN_BEAT_GAP (Task 4.1): "the card arrives" and "it gets
            // pinned" are now two deliberately separate beats, not one
            // near-simultaneous motion — live feedback on the first version
            // was that the tape's snap, fired the INSTANT the card's own
            // land tween finished, buried the pinning action inside the
            // card's bounce instead of reading as its own event. ">+=0.15"
            // (was plain ">") holds on the card's OWN settled state for a
            // beat before the tape does anything at all.
            tl.to(headTape, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" }, ">+=0.15");
            tl.to(headTape, { rotation: "+=10", duration: 0.3, ease: PIN_SNAP_EASE }, "<");

            // 3. Remaining 4 wall cards — plain vertical drop (no arc),
            //    staggered ~0.1s apart per the brief, same
            //    land-then-tape-snap pairing each (now with the same
            //    PIN_BEAT_GAP and pin-pivot rotation as the headliner),
            //    just batched via `stagger` instead of one-off tweens per
            //    card.
            tl.to(restCards, {
                y: (i, target) => jitterOf(target).jy,
                rotation: (i, target) => rotationOf(target),
                opacity: 1, duration: 0.4, ease: CARD_LAND_EASE, stagger: 0.1,
            }, "-=0.35");
            tl.to(restCards, { scaleX: 1.05, scaleY: 0.92, duration: 0.4, ease: CARD_LAND_SQUASH_EASE, stagger: 0.1 }, "<");
            // "<+=0.55", not "<+=0.4" — the land tween's own 0.4s duration
            // plus the same 0.15s PIN_BEAT_GAP as the headliner above.
            // Stagger on both this batch and the land batch above share the
            // same 0.1s interval, so tape[i] still starts exactly
            // PIN_BEAT_GAP after card[i]'s OWN land finishes, for every i —
            // not just card 0 — the same self-consistency the pre-4.1
            // version already had, just with a real gap added on top.
            tl.to(restTapes, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out", stagger: 0.1 }, "<+=0.55");
            tl.to(restTapes, { rotation: "+=10", duration: 0.3, ease: PIN_SNAP_EASE, stagger: 0.1 }, "<");

            // Task 4.1 — "MY TOP 5 TRACKS" pops in just before the crate's
            // own cascade starts, same treatment as the wall's title.
            tl.to(crateTitleSplit.words, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, "-=0.35");

            // 4. Crate, last. No CustomBounce/CustomWiggle here — a clean
            //    slide/fade instead, per the brief's own call: this is the
            //    section's one deliberately-straightened object (Task 3.8),
            //    so its entrance stays calm rather than borrowing the
            //    wall's tactile "pinned-up" language.
            tl.to(crateCard, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, ">-=0.05");
            tl.to(crateTape, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" }, "<");
            tl.to(crateThumbs, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", stagger: 0.06 }, ">-=0.1");
            tl.to(setlistRows, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", stagger: 0.045 }, ">-=0.12");

            // Hand transform authority back to plain CSS once the cascade
            // settles — GSAP writes an inline `transform` the instant it
            // first touches x/y/rotation/scale on an element (this
            // timeline touches all four, across cards and tapes), and
            // inline always outranks a stylesheet rule regardless of
            // media query (this file's own Task 3.7 comment already
            // documents that cascade fact for a different pair of rules).
            // Left in place, that inline value would permanently shadow
            // `.my-taste-card`'s mobile `transform: none` override the
            // next time the viewport crosses back under 600px after
            // having played this entrance above it — clearProps removes
            // the inline properties entirely, so the stylesheet (including
            // its own media queries) regains normal authority once this
            // section is done animating anything on its own. transformOrigin
            // included for the cards specifically (Task 4.1's own pin-pivot
            // addition) — same reasoning, a future transform on these cards
            // (a hover effect, say) shouldn't inherit this entrance's
            // top-center pivot.
            tl.set(wallCards, { clearProps: "transform,transformOrigin" });
            tl.set([headTape, ...restTapes], { clearProps: "transform" });

            const navbarHeight = () =>
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--navbar-height")) || 0;

            const st = ScrollTrigger.create({
                trigger: rootRef.current,
                // navbarHeight-aware "top top", same reasoning Experience's
                // own trigger uses — keeps a nav click landing on this
                // section and the pin's own engage point in sync.
                start: () => "top top+=" + navbarHeight(),
                // Pin mechanism reused from Experience (pin: true) — but
                // unlike Experience's scrub-driven filmstrip, this timeline
                // is NOT scroll-scrubbed; it plays on its own clock once,
                // and real scroll input is held via lenis.stop()/start()
                // (About's own established mechanism for a timed hold)
                // instead. `end` doesn't gate the hold's DURATION (scroll
                // can't advance toward it at all while stopped, below, so
                // the pin holds for exactly as long as the hold does
                // regardless of this number) — it only has to be wide
                // enough that onEnter reliably FIRES under real scroll
                // momentum. First tried "+=1": found live (Playwright, a
                // fast multi-tick scroll) that a big-enough single momentum
                // jump can cross a 1px-wide start-to-end span within one
                // ScrollTrigger update tick, so the pin never visually
                // engaged at all — the exact overshoot class Experience's
                // own ENTRY_BUFFER and About's own hold-correction comments
                // already document, just fatal here instead of merely
                // off-center, because the span was thin enough to jump
                // clean over. 200 (same order of magnitude as Experience's
                // own 220px ENTRY_BUFFER) gives real momentum room to be
                // caught mid-span before `end`, without meaningfully
                // lengthening the bit of extra scroll needed to fully clear
                // the section after the hold releases.
                end: "+=200",
                pin: true,
                // Plays once per page view, same as About's own hold — a
                // 1.5-2s scroll-hold replaying every time a visitor
                // scrolls back up and down past this section would read as
                // an obstacle, not a flourish, on the second pass.
                once: true,
                onEnter: (self) => {
                    // A nav click (or any programmatic scrollToSection())
                    // already carrying the visitor straight through this
                    // section toward another one — same escape hatch
                    // About's own hold uses: resolve to the finished state
                    // instantly rather than holding scroll for content
                    // they didn't ask to watch.
                    if (isProgrammaticScrollActive()) {
                        tl.progress(1);
                        return;
                    }

                    // Same safety net About's own hold carries: if the
                    // section is genuinely taller than the space available
                    // (an unusually short/squeezed desktop window — the
                    // 600px mobile case is already excluded above, before
                    // the pin is even constructed), holding scroll captive
                    // against a view that's already cut off just traps the
                    // visitor. Still plays the cascade on its own clock,
                    // just doesn't block scroll input for it.
                    const available = window.innerHeight - navbarHeight();
                    const sectionHeight = rootRef.current.getBoundingClientRect().height;
                    if (sectionHeight > available) {
                        tl.play();
                        return;
                    }

                    holding = true;
                    const lenis = getActiveLenis();
                    if (lenis) {
                        // Correct overshoot before stopping — same fix
                        // About's own hold needed for the identical reason
                        // (Lenis's easing can carry scroll position past
                        // `start` before ScrollTrigger's next tick notices
                        // the threshold was crossed).
                        lenis.scrollTo(self.start, { immediate: true, force: true });
                        lenis.stop();
                    }
                    window.addEventListener("touchmove", blockTouchMove, { passive: false, capture: true });
                    window.addEventListener("keydown", blockScrollKeys, { capture: true });
                    tl.play();
                },
            });

            // Covers a nav click that starts WHILE already holding, not
            // just one that arrives before entry — same reasoning and same
            // mechanism as About's own subscription.
            const unsubscribe = onProgrammaticScrollChange((active) => {
                if (active && holding) {
                    tl.progress(1);
                    releaseHold();
                }
            });

            return () => {
                unsubscribe();
                releaseHold();
                st.kill();
                tl.kill();
                kickerSplit.revert();
                wallTitleSplit.revert();
                crateTitleSplit.revert();
            };
        });

        return () => mm.revert();
    }, { scope: rootRef, dependencies: [artists.status, tracks.status] });

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
        <section className="my-taste-section" ref={rootRef}>
            {/* The section's own title — featured/secondary/setlist content
                below is content, not a second or third heading for it.
                Task 3.8: now the ONE real outbound link for this whole
                section too — "now spinning · my taste" replaced with a
                kicker that reads as a link, not decoration, per the brief.
                The <a> lives INSIDE the <h2> (not the reverse) so the
                section keeps exactly one real heading, same as before this
                task — its accessible name is just the link's own text now. */}
            <h2 className="my-taste-heading">
                <a className="my-taste-heading-link" href={SPOTIFY_PROFILE_URL} target="_blank" rel="noopener noreferrer" ref={kickerRef}>
                    {/* Task 3.9 — Diego's own Spotify profile photo, left of
                        the text. Not part of kickerRef's SplitText pop (that
                        only ever touched the surrounding TEXT nodes, same as
                        the dot/icon already didn't) — renders immediately,
                        same as those two, rather than joining Task 4's
                        cascade (out of scope for this task). */}
                    <AvatarSlot imageUrl={avatar.imageUrl} imageAlt="Diego's Spotify profile photo" />
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
                {/* Task 4.1 — a title per zone (wall/crate), each its own
                    grid item now instead of .my-taste-wall/.my-taste-crate
                    sitting directly in .my-taste-layout's two columns —
                    .my-taste-layout's own grid-template-columns doesn't
                    need to change for this: it's defined on the COLUMN
                    TRACKS, not tied to which element occupies them, so
                    wrapping the same two children one level deeper doesn't
                    touch that rule at all. */}
                <div className="my-taste-wall-column">
                    <p className="my-taste-zone-title" ref={wallTitleRef}>my top artists</p>
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
                </div>

                <div className="my-taste-crate-column">
                    <p className="my-taste-zone-title" ref={crateTitleRef}>my top 5 tracks</p>
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
            </div>
        </section>
    );
}
