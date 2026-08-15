const COLORWAY_COUNT = 5;

// Deterministic, never random. The pressing is derived from the track's own id,
// so a song always arrives on the same colourway — across re-renders, theme
// switches and reloads. Randomising per render would make the record flicker
// between pressings every time React re-ran.
//
// iTunes trackIds are numeric, but this falls back to a string hash so a
// non-numeric id can't collapse every record onto colourway 1.
// Exported (Stage 4 Task 1) — #my-taste needs the same deterministic
// id -> colourway mapping the hero's records already use, so a given
// artist/track lands on the same pressing there too. Not consumed there yet
// (Task 3 wires in the actual tinting); this only makes the function
// reachable from outside this file, nothing about its behavior changes.
export function colorwayFor(id) {
    if (id === null || id === undefined) return 1;

    // Hash the id's DIGITS rather than taking the raw value mod 5. iTunes
    // trackIds are allocated in runs, so consecutive ids share low-order
    // structure and a plain `% 5` clusters them — measured, five real tracks
    // came out 5, 5, 5, 3, 4. Mixing every character spreads them.
    let n = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) {
        n = (Math.imul(n, 31) + s.charCodeAt(i)) >>> 0;
    }
    // Final avalanche so the low bits aren't dominated by the last character.
    // Every step re-coerces with >>> 0: JS bitwise operators return SIGNED
    // 32-bit ints, so a bare `n ^= n >>> 13` flips negative above 2^31 and
    // `n % 5` then yields a negative index — which produced var(--vinyl--1),
    // an undefined token that silently fell back to black.
    n = (n ^ (n >>> 15)) >>> 0;
    n = Math.imul(n, 0x2545f491) >>> 0;
    n = (n ^ (n >>> 13)) >>> 0;

    return (n % COLORWAY_COUNT) + 1;
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
