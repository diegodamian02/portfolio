// hero-palette.js — one analogous colour SCHEME per song, for the hero
// dot-matrix background.
//
// This REPLACES the 7-hue "electric ring + travelling wave" of Stage 7.1
// (`palette-cycle.js`). What carried over is not the palette but the two
// things that were expensive to get right and are still true here:
//
//   1. The per-theme, saturation-pinned luminance SOLVE (`adapt` /
//      `adaptToBand`). Pinning saturation FIRST is the whole trick — a solve
//      allowed to move saturation satisfies any luminance target by draining
//      the colour toward grey, which is the muted result this prevents.
//   2. The crossfade. A scheme advances one step per TRACK — not on a timer,
//      because colour is a property of the change, not of elapsed time — and
//      eases across on its own wall clock, independent of whatever is drawing
//      with it (`fadeFrom` / `fadeStartedAt` / `smoothstep`).
//
// New: each ring entry is a whole analogous FAMILY (~6 tones, ~60° span,
// authored for dark theme). The renderer samples the current family at a
// per-column position `u ∈ [0,1]` AND at a foot→body→tip vertical axis, so one
// song is a single hue with tone shifting across the columns and up each dot.
// The old "two adjacent ring entries at base and tip" gradient is gone.

/**
 * Six electric colour families. Authored for DARK theme; the per-theme solve
 * (below) turns them into deep ink on light ("Studio Paper", D27 — a mark that
 * fades toward white on paper reads as absent, so light gets ink, not glow).
 *
 * Tone order is the direction the column ramp runs, left → right: e.g. cobalt
 * goes teal-blue → indigo → blue-violet. Kept in sync with the design canvas
 * (`design-review/hero-background-options/Schemes.dc.html`).
 */
export const SCHEMES = [
    { name: "cobalt",   tones: ["#1AACEA", "#2C90FF", "#3E82FF", "#4C7DFF", "#5F6DFF", "#7A59FF"] },
    { name: "amethyst", tones: ["#7E5BFF", "#9B4DFF", "#AE48F5", "#C247E4", "#D74DD0", "#EA4DBE"] },
    { name: "ember",    tones: ["#FF7A33", "#FF5A3E", "#FF4351", "#FF3567", "#F5386F", "#E83C86"] },
    { name: "rose",     tones: ["#FF8A5C", "#FF6B8E", "#FF4DA6", "#FF3BB0", "#EA4DC8", "#D95CD0"] },
    { name: "citrine",  tones: ["#FFB81E", "#FFCE2E", "#FFE23D", "#EEEF3A", "#D6F736", "#BFF82E"] },
    { name: "fern",     tones: ["#17DDB4", "#22F0B0", "#3AF29E", "#5AF58C", "#78F07A", "#93EA66"] },
];

// Saturation floor, applied before the lightness solve. A touch below the
// skyline's 0.92: several scheme tones (citrine's yellows, rose's pinks) are
// authored less saturated than that on purpose, and forcing them up reads
// artificial. 0.86 still keeps every hue clear of grey.
const SATURATION_FLOOR = 0.86;

// HSL lightness bounds for the solve. The floor is deep — light theme's foot
// has to reach near-black ink.
const HSL_LIGHTNESS_MIN = 0.12;
const HSL_LIGHTNESS_MAX = 0.94;

// Relative-luminance targets for the three stops of a dot column, per theme.
//
//   foot  — a single target: one deep footing every tone shares, so six
//           different hues sit at the same visual weight at the bottom row.
//   body  — a BAND: the tone itself, moved only if it falls outside a legible
//           window. This is the stop that carries the hue.
//   tip   — the lit top of a column.
//       dark:  brightened toward white by `tipWhiteMix` — the hot edge that
//              makes a neon dot read as light rather than paint.
//       light: a BAND low in the range — the DEEPEST the tone can be and still
//              read as its hue. No white; ethereal-top belongs to dark.
const LUMINANCE_TARGETS = {
    dark: {
        foot: 0.055,
        body: { min: 0.16, max: 0.60 },
        tipWhiteMix: 0.5,
    },
    light: {
        foot: 0.040,
        body: { min: 0.05, max: 0.135 },
        tip: { min: 0.11, max: 0.26 },
    },
};

// One scheme step takes this long to cross-fade into the next. Long enough to
// read as a transition rather than a cut, short enough to finish well inside a
// 30-second preview.
const CROSSFADE_MS = 1400;

// ---- colour maths ----------------------------------------------------------

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

export function mixRgb(a, b, t) {
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
 * A target unreachable inside the lightness bounds returns the nearest bound —
 * the honest answer, visible in the measured luminance.
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
 * as authored when it is already inside. `adapt` equalises; this one declines
 * to — it is the half of the solve that preserves the palette.
 */
export function adaptToBand(rgb, band) {
    const current = relativeLuminance(rgb);
    if (current < band.min) return adapt(rgb, band.min);
    if (current > band.max) return adapt(rgb, band.max);
    const [h, s, l] = rgbToHsl(rgb);
    return hslToRgb(h, Math.max(s, SATURATION_FLOOR), clamp(l, HSL_LIGHTNESS_MIN, HSL_LIGHTNESS_MAX));
}

// smoothstep — the crossfade should ease at both ends, or the moment it starts
// and the moment it lands both read as small jumps.
function smoothstep(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
}

/** The three solved stops for one authored tone, in one theme. */
export function solveTone(hex, theme) {
    const raw = hexToRgb(hex) ?? [1, 1, 1];
    const T = LUMINANCE_TARGETS[theme] ?? LUMINANCE_TARGETS.dark;
    const foot = adapt(raw, T.foot);
    const body = adaptToBand(raw, T.body);
    const tip = theme === "light"
        ? adaptToBand(raw, T.tip)
        : mixRgb(body, [1, 1, 1], T.tipWhiteMix);
    return {
        foot,
        body,
        tip,
        footHex: rgbToHex(foot),
        bodyHex: rgbToHex(body),
        tipHex: rgbToHex(tip),
    };
}

// ---- the cycle -----------------------------------------------------------

/**
 * A scheme position that advances one step per track and crossfades on its own
 * wall clock, independent of whatever is consuming it.
 *
 * Advancing per TRACK rather than on a timer is Stage 7c's decision, kept: a
 * wall clock walked the whole ring while one song played, so the colour
 * stopped meaning anything.
 */
export function createSchemeCycle({
    schemes = SCHEMES,
    crossfadeMs = CROSSFADE_MS,
    now = () => performance.now(),
    // Seeded from the clock ONCE so a first visit is not always the first scheme.
    seed = Math.floor(Date.now() / 1000),
} = {}) {
    const size = schemes.length;

    // An UNBOUNDED step counter, not an index modulo `size` — a counter that
    // wraps 5 -> 0 would run the crossfade backwards through the whole ring on
    // that one transition. Wrapping happens at sample time, as a lookup.
    let step = ((seed % size) + size) % size;
    let trackId = null;
    let fadeFrom = step;
    let fadeStartedAt = -Infinity;

    let cache = null; // { theme, schemes: [{ name, tones: solvedTone[] }] }

    const solved = (theme) => {
        if (cache && cache.theme === theme) return cache.schemes;
        cache = {
            theme,
            schemes: schemes.map((s) => ({
                name: s.name,
                tones: s.tones.map((hex) => solveTone(hex, theme)),
            })),
        };
        return cache.schemes;
    };

    const at = (arr, i) => arr[((i % size) + size) % size];

    /** The shared position, eased through any crossfade in flight. */
    const currentPosition = () => {
        if (fadeStartedAt === -Infinity) return step;
        const t = crossfadeMs > 0
            ? smoothstep((now() - fadeStartedAt) / crossfadeMs)
            : 1;
        return fadeFrom + (step - fadeFrom) * t;
    };

    // One family, sampled at a column position u ∈ [0,1] -> { foot, body, tip }.
    const toneOf = (family, u) => {
        const n = family.tones.length;
        const f = clamp(u, 0, 1) * (n - 1);
        const lo = Math.floor(f);
        const hi = Math.min(n - 1, lo + 1);
        const t = f - lo;
        if (t === 0) {
            const s = family.tones[lo];
            return { foot: s.foot, body: s.body, tip: s.tip };
        }
        const a = family.tones[lo];
        const b = family.tones[hi];
        return {
            foot: mixRgb(a.foot, b.foot, t),
            body: mixRgb(a.body, b.body, t),
            tip: mixRgb(a.tip, b.tip, t),
        };
    };

    const api = {
        /**
         * Steps to the next scheme for a new track. Idempotent per track id,
         * and a no-op on the very first track — the seeded scheme IS that
         * track's scheme, and stepping on arrival would make the first record
         * of a visit the only one whose scheme was never seen.
         */
        advanceTo(id) {
            if (id == null || id === trackId) return false;
            const first = trackId === null;
            trackId = id;
            if (first) return false;
            // Resume from wherever the eased position actually is, not the last
            // landed step — otherwise a track change mid-crossfade snaps back.
            fadeFrom = currentPosition();
            step += 1;
            fadeStartedAt = now();
            return true;
        },

        /**
         * Everything the renderer needs to colour one frame, and nothing about
         * how to draw it.
         *
         * `toneAt(u)` is a pure function of the current (eased) position, so the
         * renderer can build a small fixed LUT of tone samples once and rebuild
         * it only when `version` changes (a theme flip) or `fading` is true (a
         * track-change crossfade in flight, ~1.4s).
         */
        schemeState(theme) {
            const solvedSchemes = solved(theme);
            const pos = currentPosition();
            const wrapped = ((pos % size) + size) % size;
            const i0 = Math.floor(wrapped);
            const frac = wrapped - i0;
            const familyA = at(solvedSchemes, i0);
            const familyB = at(solvedSchemes, i0 + 1);
            return {
                version: `${theme}:${size}`,
                scheme: familyA.name,
                nextScheme: familyB.name,
                fading: frac !== 0,
                blend: frac,
                toneAt: (u) => {
                    const ta = toneOf(familyA, u);
                    if (frac === 0) return ta;
                    const tb = toneOf(familyB, u);
                    return {
                        foot: mixRgb(ta.foot, tb.foot, frac),
                        body: mixRgb(ta.body, tb.body, frac),
                        tip: mixRgb(ta.tip, tb.tip, frac),
                    };
                },
            };
        },

        /** Drops the theme-solve cache — call on a `data-theme` change. */
        invalidate() { cache = null; },
    };

    // Dev-only. `defineProperties` inside a removable `if`, NOT a spread — see
    // the long note in skyline-spectrum.js: spreading an object of getters
    // invokes them and freezes their values.
    if (import.meta.env.DEV) {
        /** Forces the position, for dev sweeps and the screenshot harness. */
        api.setIndex = (i) => {
            step = ((i % size) + size) % size;
            fadeFrom = step;
            fadeStartedAt = -Infinity;
        };
        api.solvedFor = (theme) => solved(theme);
        Object.defineProperties(api, {
            index: { get: () => ((step % size) + size) % size },
            position: { get: () => currentPosition() },
            trackId: { get: () => trackId },
            size: { get: () => size },
            scheme: { get: () => at(solved("dark"), Math.floor(currentPosition())).name },
            schemes: { get: () => schemes },
        });
    }

    return api;
}
