// Palette cycling for the hero background — a standalone module, with no
// knowledge of whatever is drawing with it.
//
// Stage 7's task brief assumed this already existed as its own piece, carved
// out of the fluid work. It did not: through 7a–7d the palette lived inline in
// `fluid-background.jsx`, wired directly to a WebGL dye colour, and nothing
// about it was reusable. It is a module now, and the only thing it knows about
// its consumer is that the consumer wants two colours and a crossfade.
//
// What survives from the fluid work, because it was measured rather than
// guessed:
//
//   * The seven-hue neon list. 7b shipped wine/slate/mint/amber/terracotta and
//     FINDINGS B54 measured four of those ten colour x theme combinations
//     pinning the contrast solve at its clamp — a dark hue on a near-black page
//     cannot be rescued, because alpha only interpolates toward the background.
//     7c replaced them on direct instruction ("stay away from darker colors...
//     bright mint, glowing... 7 colors in rotation").
//   * `adapt()`, the saturation-pinned lightness solve. Pinning saturation
//     FIRST is the whole trick: a solve allowed to move saturation satisfies
//     any luminance target by draining the colour toward grey, which is exactly
//     the muted result this is supposed to prevent.
//
// What is new here is the SECOND stop. A skyline column is a gradient, so each
// palette entry is solved twice — once deep for the column's base, once bright
// for its tip — and the two targets are per theme.

/**
 * Seven electric hues, spread around the wheel so consecutive tracks read as
 * obviously different rather than subtly different.
 *
 * Stage 7.1 moved these from *bright* to *electric*, which is a smaller change
 * than it sounds and a different one than the brief described. Every entry in
 * the previous list was already at HSL saturation 100% (mint at 92%) — nothing
 * muted or earthy had been in rotation since 7c. What they actually were was
 * **high-lightness**: aqua `#48D6FF`, violet `#A98CFF`, magenta `#FF6ED4` and
 * coral `#FF8A6B` all sat at L 71–81%, which is where a fully saturated hue
 * starts reading as a pastel. Dropping lightness at fixed saturation is what
 * makes a colour read as neon.
 *
 * `gold` left the rotation and `azure` joined it. Warm coverage is carried by
 * orange on its own now, and the ring was missing a true blue between cyan and
 * violet — a 75-degree gap, the widest on the wheel.
 *
 * Deliberately NOT the vinyl pressing colours (`colorwayFor`) — those are
 * chosen to look like vinyl. Separate systems.
 */
export const PALETTE = [
    { name: "mint", hex: "#7CF9DE" },       // kept by explicit request
    { name: "cyan", hex: "#00E5FF" },       // was aqua #48D6FF (L 64%)
    { name: "azure", hex: "#4C7DFF" },      // new — the ring had no true blue
    { name: "violet", hex: "#9B4DFF" },     // was #A98CFF (L 77%)
    { name: "magenta", hex: "#FF2BC0" },    // was #FF6ED4 (L 72%)
    { name: "orange", hex: "#FF6B15" },     // was coral #FF8A6B (L 71%)
    { name: "chartreuse", hex: "#C6FF29" }, // was lime #B4FF6B (L 71%)
];

// Saturation floor, applied before the lightness solve — see the header.
const SATURATION_FLOOR = 0.92;

// HSL lightness bounds for the solve. The floor is lower than the fluid's 0.34
// because a gradient's BASE stop is allowed to be deep in a way a translucent
// dye never was: it is a solid shape with a bright tip directly above it, so it
// reads as depth rather than as a colour that failed.
const HSL_LIGHTNESS_MIN = 0.2;
const HSL_LIGHTNESS_MAX = 0.94;

// Relative-luminance targets for the two gradient stops, per theme.
//
// The peak targets are deliberately MODEST, and this is the one number in the
// file most likely to be "improved" back into being wrong. A first pass put the
// dark-theme tip at 0.82 on the reasoning that a bright page-background gap
// means a bright tip. Rendered, every hue arrived as a pastel: magenta solved
// to #ffe0f6, mint to #9efbe7, aqua to #c3f2ff — near-whites with a tint. That
// is B54's lesson in a new costume. Saturation is pinned at 0.92, so a high
// luminance target can only be met by driving HSL lightness toward 0.9+, and
// every hue converges on white up there no matter how saturated it is nominally.
//
// The white-hot core comes from where it should: the additive glow pass, which
// blooms overlapping columns past the palette without the palette having to be
// near-white to begin with.
//
// The BASE is a target and the PEAK is a BAND, and the asymmetry is the point.
//
// The base stop is meant to be a uniform deep footing for every hue, so pinning
// it to one luminance is exactly right — that is what makes seven different
// colours sit at the same visual weight.
//
// The peak stop is meant to be the AUTHORED colour. A target drags naturally
// dim hues up as hard as it pulls bright ones down, and at 0.52 that still
// arrived pastel for the three darkest: violet #c7b4ff, magenta #ffa0e3, coral
// #ffaa93. A band only acts on a colour that is outside it, so on dark theme
// magenta (0.37), coral (0.44), violet (0.40), aqua (0.57) and gold (0.64) all
// pass through at the hex they were authored as, and only lime is pulled down.
//
// The two themes are not mirror images, because the backgrounds are not. On
// near-black there is room above and the band is wide. On near-white the only
// legible direction is down, so the light band is a narrow one low in the
// range: a light-theme column is deep ink at the base and saturated colour at
// the tip — the same gradient read the other way up.
// Stage 7.1 moved both dark-theme numbers, and the reason is a direct
// consequence of going electric. A saturated hue is DARKER than its pastel
// version — that is most of what "electric" means. Measured: the new entries
// land at luminance 0.195 (violet), 0.234 (azure), 0.268 (magenta) and 0.318
// (orange), all of them *below* the old peak floor of 0.34. Left alone, the
// band would have lifted five of the seven straight back into the pastels this
// change exists to remove.
//
// So the floor drops to 0.18 and the ceiling rises to 0.85, which is wide
// enough that **all seven authored hexes pass through untouched** on dark
// theme.
//
// The base then has to come down with it, and this is the part that is easy to
// miss: at the old 0.16 the base would have been BRIGHTER than violet's own
// peak (0.195), inverting the gradient for two of the seven entries. 0.085
// keeps a visible ramp for the darkest hue (2.3x) without flattening the
// brightest (9x for mint). A darker footing also makes the lit tip pop harder,
// which is the actual ask.
//
// Stage 11 pushed the whole light range DEEP, and this is the real fix for the
// "the colours don't hit" the owner reported. The lesson from D27 is that alpha
// trades SATURATION on a light ground — so the way to get a column that reads
// as its colour without being flat opaque (which forces the text mask into a
// visible pale band, see skyline-background.jsx) is to make the colour deep
// enough that even at 0.7-0.9 alpha over paper it still lands as that hue
// rather than a tint of it. base 0.11 -> 0.055; the peak band drops to
// {0.10, 0.24} so that mint, cyan and chartreuse become a deep teal / forest
// / moss instead of the pale-leaning teal 0.32 gave, and azure / violet /
// magenta / orange (authored luminance 0.19-0.32) are pulled DOWN into it
// rather than passing straight through. A light-theme column is now ink at the
// foot and deep saturated colour at the tip — the same gradient dark theme
// reads the other way up, just genuinely dark on both ends.
const LUMINANCE_TARGETS = {
    dark: { base: 0.085, peak: { min: 0.18, max: 0.85 } },
    light: { base: 0.055, peak: { min: 0.10, max: 0.24 } },
};

// How long one palette step takes to cross over. Long enough to read as a
// transition rather than a cut, short enough that it has finished well inside
// a 30-second preview.
const CROSSFADE_MS = 1400;

// ---- the travelling wave (Stage 7.1) ----------------------------------------
//
// Until now every column showed the same hue pair at the same instant, so a
// palette change was one colour swapping everywhere at once. The wave adds a
// SPATIAL phase: what a column samples depends on the shared position AND on
// its own horizontal index, so a band of colour travels across the skyline.
//
// It lives here rather than in the renderer because the renderer has no
// business knowing what a palette entry is — decoupling the two is why this
// module exists at all.
//
// Both numbers are expressed in PALETTE ENTRIES, not pixels or hues, so they
// stay meaningful if the palette grows or shrinks.

// How much of the ring is visible across the full hero width. At 1.15 you see
// a little more than one palette step end to end: the left edge is mid-way
// between two hues and the right edge is mid-way between the next two, which
// reads as one travelling band rather than as a rainbow. Above ~2 it stops
// looking like a wave and starts looking like a test pattern.
const WAVE_SPAN_ENTRIES = 1.15;

// How fast the band travels, in palette entries per second. 0.14 is one step
// every ~7.1s, so a given hue takes about 8.2s to cross the hero — a lava-lamp
// drift rather than a chase light. Slow enough that it never competes with the
// columns' own audio-driven motion, which is the fast thing on screen.
const WAVE_SPEED_ENTRIES_PER_SECOND = 0.14;

// Continuous and one-directional, not a bounce. A ping-pong has two turning
// points where the motion visibly stops and reverses, and on a ring — where
// the last hue is adjacent to the first — there is no seam that would justify
// one. Left to right, because the hero reads that way.
const WAVE_DIRECTION = -1;

// ---- colour maths -----------------------------------------------------------

/** '#6f9bff' -> [0.44, 0.61, 1.0]. Returns null on anything unparseable. */
export function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex).trim());
    if (!match) return null;
    return [
        parseInt(match[1], 16) / 255,
        parseInt(match[2], 16) / 255,
        parseInt(match[3], 16) / 255,
    ];
}

export function rgbToHex(rgb) {
    return "#" + rgb
        .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0"))
        .join("");
}

/** WCAG relative luminance, the same formula the project's contrast checks use. */
export function relativeLuminance([r, g, b]) {
    const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two linear-ish RGB triples. */
export function contrastRatio(a, b) {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function rgbToHsl([r, g, b]) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const toChannel = (t) => {
        let v = t;
        if (v < 0) v += 1;
        if (v > 1) v -= 1;
        if (v < 1 / 6) return p + (q - p) * 6 * v;
        if (v < 1 / 2) return q;
        if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6;
        return p;
    };
    return [toChannel(h + 1 / 3), toChannel(h), toChannel(h - 1 / 3)];
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function mixRgb(a, b, t) {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    ];
}

/**
 * Solves a hue to an exact relative-luminance target, moving LIGHTNESS only.
 *
 * Saturation is pinned to the floor before the search begins, so the solve
 * cannot cheat by desaturating. Luminance is monotonic in lightness at fixed
 * hue and saturation, so a binary search converges; 18 iterations resolves
 * lightness far past what an 8-bit channel can express.
 *
 * A target that is unreachable inside the lightness bounds returns the nearest
 * bound rather than failing — which is the honest answer, and the caller can
 * see it in the measured luminance.
 */
export function adapt(rgb, target) {
    const [h, s0] = rgbToHsl(rgb);
    const s = Math.max(s0, SATURATION_FLOOR);
    const at = (l) => hslToRgb(h, s, l);

    if (relativeLuminance(at(HSL_LIGHTNESS_MIN)) >= target) return at(HSL_LIGHTNESS_MIN);
    if (relativeLuminance(at(HSL_LIGHTNESS_MAX)) <= target) return at(HSL_LIGHTNESS_MAX);

    let lo = HSL_LIGHTNESS_MIN;
    let hi = HSL_LIGHTNESS_MAX;
    for (let i = 0; i < 18; i++) {
        const mid = (lo + hi) / 2;
        if (relativeLuminance(at(mid)) < target) lo = mid;
        else hi = mid;
    }
    return at((lo + hi) / 2);
}

/**
 * Moves a hue only as far as a luminance BAND requires, and leaves it exactly
 * as authored when it is already inside.
 *
 * This is the half of the solve that preserves the palette. `adapt` equalises;
 * this one declines to.
 */
export function adaptToBand(rgb, band) {
    const current = relativeLuminance(rgb);
    if (current < band.min) return adapt(rgb, band.min);
    if (current > band.max) return adapt(rgb, band.max);
    // Still pin saturation — an authored hue inside the band may be duller than
    // the floor, and the floor is what makes it read as neon at all.
    const [h, s, l] = rgbToHsl(rgb);
    return hslToRgb(h, Math.max(s, SATURATION_FLOOR), clamp(l, HSL_LIGHTNESS_MIN, HSL_LIGHTNESS_MAX));
}

/** Both gradient stops for one palette entry in one theme. */
export function solveEntry(entry, theme) {
    const raw = hexToRgb(entry.hex) ?? [1, 1, 1];
    const targets = LUMINANCE_TARGETS[theme] ?? LUMINANCE_TARGETS.dark;
    const base = adapt(raw, targets.base);
    const peak = adaptToBand(raw, targets.peak);
    return {
        name: entry.name,
        base,
        peak,
        baseHex: rgbToHex(base),
        peakHex: rgbToHex(peak),
        baseLuminance: relativeLuminance(base),
        peakLuminance: relativeLuminance(peak),
    };
}

// smoothstep — the crossfade should ease at both ends, or the moment it starts
// and the moment it lands both read as small jumps.
function smoothstep(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
}

// ---- the cycle --------------------------------------------------------------

/**
 * A palette position that advances one step per track and crossfades on its own
 * wall clock, independent of whatever is consuming it.
 *
 * The gradient the consumer wants is TWO ADJACENT ENTRIES at once — entry i at
 * the column's base, entry i+1 at its tip. That is what makes it a sunset
 * rather than a tint, and it means one step forward changes both stops, with
 * the old tip becoming the new base. So the crossfade genuinely has two
 * adjacent palette entries in flight at any moment, which is what the Stage 7
 * brief asked the gradient to be built from.
 *
 * Advancing per TRACK rather than on a timer is Stage 7c's decision and it is
 * kept deliberately: a wall clock walked through the whole palette while one
 * song played, so the colour stopped meaning anything. Colour is a property of
 * the change, not of elapsed time.
 */
export function createPaletteCycle({
    palette = PALETTE,
    crossfadeMs = CROSSFADE_MS,
    now = () => performance.now(),
    // Seeded from the clock ONCE so a first visit is not always mint.
    seed = Math.floor(Date.now() / 1000),
} = {}) {
    const size = palette.length;

    // An UNBOUNDED step counter, not an index modulo `size`.
    //
    // The position is continuous now (the wave samples between entries), and a
    // counter that wraps 6 -> 0 makes the crossfade run *backwards* through the
    // whole ring on that one transition. Wrapping happens at sample time, in
    // `ringLerp`, where it is a lookup rather than a direction.
    let step = ((seed % size) + size) % size;
    let trackId = null;
    let fadeFrom = step;
    let fadeStartedAt = -Infinity;

    let cache = null; // { theme, entries: solved[] }

    const solved = (theme) => {
        if (cache && cache.theme === theme) return cache.entries;
        cache = { theme, entries: palette.map((entry) => solveEntry(entry, theme)) };
        return cache.entries;
    };

    const at = (entries, i) => entries[((i % size) + size) % size];

    /**
     * One stop, at a FRACTIONAL ring position — the whole basis of the wave.
     *
     * Interpolating between adjacent solved entries rather than between two
     * discrete palette steps is what lets a column sit anywhere on the ring,
     * and it subsumes the old crossfade exactly: with no wave offset, a fade
     * from step k to k+1 is `ringLerp` walking the same interval.
     */
    const ringLerp = (entries, position, key) => {
        const wrapped = ((position % size) + size) % size;
        const i0 = Math.floor(wrapped);
        const t = wrapped - i0;
        if (t === 0) return at(entries, i0)[key];
        return mixRgb(at(entries, i0)[key], at(entries, i0 + 1)[key], t);
    };

    /** The shared position, eased through any crossfade in flight. */
    const currentPosition = () => {
        if (fadeStartedAt === -Infinity) return step;
        const t = crossfadeMs > 0
            ? smoothstep((now() - fadeStartedAt) / crossfadeMs)
            : 1;
        return fadeFrom + (step - fadeFrom) * t;
    };

    const stopsAt = (entries, position) => ({
        base: ringLerp(entries, position, "base"),
        peak: ringLerp(entries, position + 1, "peak"),
    });

    const api = {
        /**
         * Steps the palette for a new track. Idempotent per track id, and a
         * no-op on the very first track — the seeded colour is that track's
         * colour, and stepping on arrival would make the first record of a
         * visit the only one whose colour was never seen.
         */
        advanceTo(id) {
            if (id == null || id === trackId) return false;
            const first = trackId === null;
            trackId = id;
            if (first) return false;
            // Resume from wherever the eased position actually is, not from the
            // last landed step — otherwise a track change during a crossfade
            // snaps backwards before moving on.
            fadeFrom = currentPosition();
            step += 1;
            fadeStartedAt = now();
            return true;
        },

        /**
         * The two gradient stops for this instant, in a given theme.
         *
         * `offset` moves along the ring in palette entries; the renderer passes
         * a column's own wave phase there. Omitted, this is exactly the
         * pre-wave behaviour.
         */
        sample(theme, offset = 0) {
            const entries = solved(theme);
            const position = currentPosition() + offset;
            const { base, peak } = stopsAt(entries, position);
            const settled = Math.round(((position % size) + size) % size);
            return {
                base,
                peak,
                baseName: at(entries, settled).name,
                peakName: at(entries, settled + 1).name,
                position,
                fading: fadeStartedAt !== -Infinity && currentPosition() !== step,
            };
        },

        /**
         * Everything the renderer needs to draw one frame of the travelling
         * wave, and nothing about how to draw it.
         *
         * `sample` is a pure function of ring position, so the renderer can
         * pre-build a fixed set of gradients tiling the ring ONCE and then do
         * nothing per frame but pick one per column. That is the difference
         * between 44 `createLinearGradient` calls every frame and none.
         *
         * `version` changes only when the solved colours change — i.e. on a
         * theme flip — and is the renderer's cache key.
         *
         * `atMs` is passed in rather than read from the clock so a caller can
         * ask for a specific instant. Reduced motion asks for 0.
         */
        waveState(theme, atMs = now()) {
            const entries = solved(theme);
            const travel = WAVE_DIRECTION * (atMs / 1000) * WAVE_SPEED_ENTRIES_PER_SECOND;
            return {
                version: `${theme}:${size}`,
                ringSize: size,
                position: currentPosition() + travel,
                span: WAVE_SPAN_ENTRIES,
                sample: (position) => stopsAt(entries, position),
            };
        },

        /** Drops the theme-solve cache — call on a `data-theme` change. */
        invalidate() { cache = null; },
    };

    // Dev-only. `defineProperties` inside a removable `if`, NOT a spread — see
    // the long note in skyline-spectrum.js: spreading an object of getters
    // invokes them and freezes their values. `solvedFor` shipped to production
    // before this block existed.
    if (import.meta.env.DEV) {
        /** Forces the position, for dev sweeps and the screenshot harness. */
        api.setIndex = (i) => {
            step = ((i % size) + size) % size;
            fadeFrom = step;
            fadeStartedAt = -Infinity;
        };
        api.solvedFor = (theme) => solved(theme);
        /** The stops at an arbitrary ring position — used to trace the wave. */
        api.stopsAtRing = (theme, position) => stopsAt(solved(theme), position);
        Object.defineProperties(api, {
            index: { get: () => ((step % size) + size) % size },
            position: { get: () => currentPosition() },
            trackId: { get: () => trackId },
            size: { get: () => size },
            palette: { get: () => palette },
            wave: {
                get: () => ({
                    span: WAVE_SPAN_ENTRIES,
                    speedEntriesPerSecond: WAVE_SPEED_ENTRIES_PER_SECOND,
                    direction: WAVE_DIRECTION,
                }),
            },
        });
    }

    return api;
}
