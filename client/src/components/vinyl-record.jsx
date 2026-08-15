import { hash32 } from "../lib/hash.js";

const COLORWAY_COUNT = 5;

// Deterministic, never random. The pressing is derived from the track's own id,
// so a song always arrives on the same colourway — across re-renders, theme
// switches and reloads. Randomising per render would make the record flicker
// between pressings every time React re-ran.
//
// iTunes trackIds are numeric, but hash32 falls back to a string hash so a
// non-numeric id can't collapse every record onto colourway 1.
//
// Exported (Stage 4 Task 1) — #my-taste needs the same deterministic
// id -> colourway mapping the hero's records already use, so a given
// artist/track lands on the same pressing there too. The mixing itself now
// lives in lib/hash.js (Stage 4 Task 2, reused for card rotation/jitter) —
// this function's own behavior is unchanged by that move, re-verified same
// ids still produce the same colorway numbers.
export function colorwayFor(id) {
    if (id === null || id === undefined) return 1;
    // n % 5 can't go negative here: hash32's own final step already
    // re-coerces with >>> 0 before returning, so n is always a non-negative
    // 32-bit value — the negative-index bug (var(--vinyl--1), silently
    // falling back to black) was in an EARLIER version of this mixing that
    // skipped that re-coercion; hash32 doesn't.
    return (hash32(id) % COLORWAY_COUNT) + 1;
}

// Photo-duotone-only variant (Stage 4 Task 3.6) — NOT a second hash, the
// same hash32(id) this file already uses for colorwayFor, just remapped
// into 3 buckets instead of 5. colorwayFor's own 5 tokens include two
// (--vinyl-1 "classic black", --vinyl-5 "marbled smoke") that are
// deliberately near-neutral — correct for an actual vinyl pressing below,
// but #my-taste applies grayscale(1) + a mix-blend-mode wash to a PHOTO,
// not a flat label, and a near-neutral wash on top of a grayscale photo
// just reads as a plain gray photo. With colorwayFor's 5 roughly even
// buckets, ~2 in 5 photos hit this by construction, not chance — a real bug
// (FINDINGS.md), not a perception issue. Scoped narrowly: colorwayFor
// itself is untouched (black/smoke stay correct for the turntable's own
// real vinyl below), this only governs which token a PHOTO gets tinted
// with. Restricted to the three tokens that still read as genuinely
// colored once blended onto a photo: amber (2), oxblood (3), midnight
// blue (4).
const PHOTO_COLORWAYS = [2, 3, 4];
export function photoColorwayFor(id) {
    if (id === null || id === undefined) return PHOTO_COLORWAYS[0];
    return PHOTO_COLORWAYS[hash32(id) % PHOTO_COLORWAYS.length];
}

export default function VinylRecord({ track }) {
    if (!track) return null;

    // Destructured once: accessing track.id and track.artworkUrl directly would
    // each raise a separate react/prop-types error, and this repo has no
    // propTypes convention or dependency.
    const { id, artworkUrl } = track;

    // Points at a token rather than a colour value — the palette lives entirely
    // in main.scss, per theme, and this only chooses which one applies.
    const colorway = colorwayFor(id);

    return (
        <div
            className="vinyl-record"
            data-colorway={colorway}
            style={{ "--vinyl-base": `var(--vinyl-${colorway})` }}
        >
            <div className="vinyl-record-grooves" />
            <div
                className="vinyl-record-label"
                style={artworkUrl ? { backgroundImage: `url(${artworkUrl})` } : undefined}
            />
        </div>
    );
}
