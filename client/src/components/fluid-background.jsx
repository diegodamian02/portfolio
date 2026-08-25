import { useEffect, useRef } from "react";
import { createFluidSim } from "../lib/fluid-sim.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import { DECK, onDeckState, getDeckState } from "../lib/deck-state.js";
import * as audio from "../lib/turntable-audio.js";

// The fluid background behind the hero.
//
// Stage 7a built the solver, the theming and the visibility gating. Stage 7b
// made it PRESENCE-GATED: the canvas is blank and the loop is stopped
// whenever nothing is playing. The moment playback starts it bursts in — in
// the same tick the needle is drawn touching the record — then rides the
// track's own audio until it stops, and drains away afterwards.
//
// Stage 7c is about what it LOOKS like once it is running. 7b's field was
// technically correct and visually almost nothing: a small pool of muted dye
// pulsing near the platter. Four changes, each addressing a specific thing
// that was wrong rather than "more of everything":
//
//   1. Bloom, in the solver's display pass — dye without a glow reads as fog.
//   2. A neon palette solved per theme, so the same colour is legible on
//      near-black and on near-white instead of on one of them.
//   3. An energy model, so a punchy track and a soft one look different from
//      each other rather than both looking like the mean of the two.
//   4. Roaming emitters, so the field crosses the whole hero instead of
//      pooling where it was injected.

// ---- palette (Stage 7c) -----------------------------------------------------
//
// Seven neon hues, evenly spread around the wheel so consecutive tracks are
// obviously different rather than subtly different.
//
// 7b's palette (wine, slate, terracotta, amber, mint) is gone. Those were
// chosen to sit alongside the vinyl pressings and three of the five were
// dark, which is the worst possible property here: a dark dye on a near-black
// page has nowhere to go, and 7b's own contrast pass had to lighten wine,
// slate and terracotta so far to rescue them that they arrived as pastels
// anyway. Starting from luminous hues removes the problem instead of
// correcting it.
//
// Still fluid-only. Deliberately NOT routed through colorwayFor() or the
// vinyl pressings — those are record colours, chosen to look like vinyl.
// Separate systems.
const PALETTE = [
    { name: "mint", hex: "#7CF9DE" },
    { name: "aqua", hex: "#48D6FF" },
    { name: "violet", hex: "#A98CFF" },
    { name: "magenta", hex: "#FF6ED4" },
    { name: "coral", hex: "#FF8A6B" },
    { name: "gold", hex: "#FFC94D" },
    { name: "lime", hex: "#B4FF6B" },
];

// ---- colour solve -----------------------------------------------------------
//
// Saturation floor applied before the lightness solve. Without it the solve
// can satisfy its luminance target by desaturating (every hue reaches every
// luminance if you allow it to become grey), which is exactly the muted
// result 7c exists to undo.
const NEON_SATURATION_FLOOR = 0.92;

// Allowed relative-luminance BAND for the dye, per theme — a floor and a
// ceiling, not a target.
//
// Targeting one luminance was the obvious first move and it is wrong: it
// equalises by dragging the naturally luminous hues DOWN as hard as it lifts
// the dim ones up. Solved to a single 0.45 in dark theme, #7CF9DE came out
// #08CAA0 — a deep emerald. That is the authored bright mint destroyed by the
// arithmetic meant to protect it.
//
// A band only acts when a colour is outside it, so on dark theme mint, lime,
// gold and aqua pass through untouched at exactly the hue they were authored
// as, and only violet, magenta and coral get lifted. dyeIntensityFor then
// equalises the remaining spread in ALPHA, which is the lever that costs no
// colour — which is what it was for all along.
//
// The two bands are asymmetric because the backgrounds are. From near-black
// there is a whole scale above, so dark theme needs a floor and no ceiling.
// From near-white the only direction is down, so light theme needs a ceiling
// — and where it sits is a real trade: lower is more legible and less neon.
// 0.48 keeps violet, magenta and coral untouched and deepens the other four
// to saturated rather than dark (measurements for both bands in STATUS.md).
const DYE_LUMINANCE_DARK = { min: 0.42, max: 1 };
const DYE_LUMINANCE_LIGHT = { min: 0.2, max: 0.48 };

// Lightness bounds for the solve, in HSL. The floor is what enforces "no dark
// dye" as a hard rule rather than a hope: a hue that cannot reach the band
// without going below this simply stops at the bound, and the intensity solve
// pays the difference in alpha.
const HSL_LIGHTNESS_MIN = 0.34;
const HSL_LIGHTNESS_MAX = 0.92;

// How much relative luminance ONE splat's dye is allowed to move the
// background by. Intensity is DERIVED from this per colour and per theme (see
// dyeIntensityFor) rather than being one shared multiplier.
const TARGET_LUMINANCE_IMPACT = 0.38;
const MIN_DYE_INTENSITY = 0.25;
const MAX_DYE_INTENSITY = 1;

// Scales every splat's dye contribution before it reaches the field.
//
// The per-colour solve answers "what should ONE splat contribute", which sets
// the RATIO between colours and themes — its real job, and the thing that
// keeps mint and violet equally legible. This single measured scalar sets the
// ABSOLUTE amplitude of the composited field, where splats overlap constantly
// and 7c's much slower dissipation lets them accumulate for far longer.
//
// The two have to be separate knobs because they answer different questions,
// and the first 7c build proved what happens when the second one is missing:
// the field filled the entire viewport with white-cored dye and the headline
// went with it. Tuned by sweep against measured coverage and against measured
// text contrast, not by eye.
//
// 0.34 was the first defensible landing (peak 0.92, 36% of the hero above a
// quarter alpha). It went to 0.42 after profiling the field over 40-second
// windows instead of single instants: a continuously-injected advecting field
// BREATHES, and the spread is far wider than any single sample suggests —
// coverage ranged 0.04 to 0.84 with a median near 0.25, so roughly one second
// in eight was a lull where the hero read as almost empty. That tail is the
// "very subtle" complaint recurring at lower frequency.
//
// Three explanations were tested before raising the amplitude, and all three
// were wrong, which is why the fix is a floor rather than a mechanism:
//   - "lulls are quiet passages" — corr(energy, coverage) = 0.13, and the
//     lulls measured at energy 0.71-1.00. Not the music.
//   - "dye drifts into the masked zones" — with masking disabled the median
//     moved only 0.24 -> 0.29 and lulls 6/39 -> 4/39. Barely.
//   - "the dye disperses; more vorticity would concentrate it" — curl 30 -> 55
//     made it worse (7/39 lulls, min 0.01 against 0.07).
// Peak alpha never fell below 0.49 even in a lull, so the field is thinning,
// not emptying. Raising the amplitude lifts the whole distribution.
const FIELD_SCALE = 0.42;

// Per-theme display response, handed to the solver's display pass.
//
//   bloomIntensity — bloom ADDS light. On a dark page that is the glow. On a
//     white page every addition moves the dye toward the background, so the
//     same value that makes dark theme ethereal makes light theme washed out.
//
//   alphaGain — how fast dye becomes opaque. Light theme needs to reach solid
//     colour sooner, because a half-transparent vivid hue over white is a
//     pastel and a pastel over white is nothing.
//
// A third lever lived here briefly — whether an over-full channel could clip
// toward white, on the theory that dark theme wanted a hot neon core. It is
// gone because the measurement said so; see DISPLAY_SHADER in fluid-sim.js.
// Both were measured against the finished field at the same FIELD_SCALE, and
// they land in opposite directions from the guess. Light theme was expected to
// need MORE gain to be seen at all; at 1.9 it covered 93% of the hero above a
// quarter alpha (dark's 36%) and stopped being a background. On a white page
// the dye is LIGHTER than the ground, so it composites toward the page rather
// than away from it and reads as present at far lower alpha — the intuition
// from dark theme is exactly inverted. 0.85 puts it at 58%/29%, which is the
// same visual weight dark theme has at 1.4.
const THEME_RESPONSE = {
    dark: { bloomIntensity: 1.6, alphaGain: 1.4 },
    light: { bloomIntensity: 0.6, alphaGain: 0.85 },
};

// ---- burst ------------------------------------------------------------------
const BURST_SPLATS = 9;
const BURST_FORCE = 900;
const BURST_RADIUS = 1.9;
// Radius of the ring the burst's splats sit on, in normalised canvas units.
const BURST_RING = 0.11;
const BURST_DYE_SCALE = 0.5;

// ---- audio-driven splats ----------------------------------------------------
const SPLAT_BASE_FORCE = 520;
const SPLAT_BASE_RADIUS = 2.4;

// Cadence bounds. Which end a track sits at is set by its ENERGY, not by its
// treble — see the frame loop.
const SPLAT_MIN_INTERVAL_MS = 110;
const SPLAT_MAX_INTERVAL_MS = 420;

// A track with no sharp transients — a pad, a fade-in, a heavily compressed
// master — must still show presence, so once this long has passed since the
// last splat the next frame fires regardless of whether anything punched.
//
// Expressed as a MULTIPLE of the current cadence rather than a fixed
// millisecond count, which 7b used. A fixed fallback is wrong at both ends:
// on a driving track (110ms cadence) a 620ms floor drops five sixths of the
// beats, and on a ballad (420ms cadence) it fires between beats that were
// already sparse. As a multiple it adapts with everything else.
const SPLAT_FORCED_GAP_RATIO = 2.2;

// Punch is the ratio of the fast envelope to the slow one, so it sits near
// 1.0 on steady material and rises on a transient.
//
// 1.45, not the 1.16 this started at. Measured across four deliberately
// different tracks, 1.16 was exceeded on 57-85% of frames — a "transient
// detector" that says yes most of the time is a metronome, and the cadence
// gate behind it was doing all the actual work. The reason is that RMS over a
// 5ms window is heavily skewed, so the fast envelope rides the peaks and sits
// well above the mean even on steady material. 1.45 sits above that skew.
const PUNCH_TRIGGER = 1.45;

// Per-frame retention of the two envelopes. The fast one is the current
// moment; the slow one is what the track has been doing lately, and the whole
// measurement is the ratio between them, so they MUST be an order of
// magnitude apart in time constant. 7b's B55 was exactly this mistake at a
// smaller scale — a baseline smoothed on the signal's own timescale is a
// self-cancelling comparison and fires almost never.
const ENVELOPE_FAST_SMOOTHING = 0.72;   // ~50ms
const ENVELOPE_SLOW_SMOOTHING = 0.995;  // ~3.3s

// Broadband RMS that counts as a fully energetic track. Preview clips arrive
// at wildly different masters, so this maps the slow envelope onto a 0..1
// "how much is going on" scale. The FLOOR is the important half: a quiet
// master must still fill the hero, it just fills it more gently.
//
// Measured rather than guessed, across four tracks chosen to span the range
// (slow-envelope means): Norah Jones 0.021, Nick Drake 0.076, Daft Punk
// 0.089, Metallica 0.134 — a 6.4x spread. At 0.11 those land at energy 0.30
// (the floor), 0.69, 0.81 and 1.00, which is the spread the visitor should
// see. The first value tried was 0.17, off the top of my head, and it put
// every one of the four below 0.8 with the two quiet ones pinned to the floor
// — the entire dynamic range collapsed into "quiet".
const ENERGY_REFERENCE_RMS = 0.11;
const ENERGY_FLOOR = 0.3;

// FFT bin range. fftSize is 256 (turntable-audio.js), so there are 128 bins
// spanning 0..Nyquist — about 187Hz per bin at 48kHz.
//
// Only TREBLE is read now. 7b also tracked a bass band and drove force and
// radius from it; the energy/punch model replaced that entirely, and the bass
// read survived the rewrite feeding nothing but the debug object. Deleted
// rather than left in — a signal computed every frame with no consumer reads,
// on the next pass through this file, as something load-bearing.
const TREBLE_BIN_LO = 32;
const TREBLE_BIN_HI = 96; // ~6-18kHz: hats, air, transient sparkle

// ---- roaming ----------------------------------------------------------------
//
// Emitters wander the full canvas on a sum of two sine pairs (per axis), so
// the path never resolves into the obvious figure-eight a single Lissajous
// traces. Splats fire wherever the chosen emitter currently is, thrown along
// its direction of travel — which is what turns discrete injections into
// something that reads as a moving wave rather than a sequence of blots.
const EMITTER_COUNT = 3;

// Fraction of splats that originate at the deck instead of at a roaming
// emitter. 7b anchored everything there on the grounds that the deck is the
// source of the sound, which is right, and the whole hero is now in play,
// which is also right — this is the split between the two. The burst is
// separate and always deck-anchored: it is the needle-contact moment, and it
// has to come from the needle.
const DECK_SPLAT_SHARE = 0.34;

// Slow, wide, dye-free pushes that drag whatever colour is already in the
// field across the hero. Without them the dye expands from where it was
// injected and stops; the currents are what make it travel.
const CURRENT_INTERVAL_MS = 1500;
const CURRENT_FORCE = 340;
const CURRENT_RADIUS = 9;

// ---- settle -----------------------------------------------------------------
//
// After PLAYING ends, injection stops but the loop keeps stepping so the
// existing dye decays through the solver's OWN dissipation — layering a
// second fade on top would fight it.
const SETTLE_PROBE_INTERVAL_MS = 180;
const SETTLE_DYE_THRESHOLD = 0.035;

// Hard ceiling on the settle window. Exponential decay approaches zero
// asymptotically and never truly arrives, so the probe alone could keep the
// loop alive indefinitely on a slow tail. Raised from 7b's 4s because 7c's
// dye deliberately persists far longer (DENSITY_DISSIPATION 0.85 → 0.42) and
// the old ceiling would have become the routine exit rather than the safety
// net, cutting the tail off visibly mid-fade.
const SETTLE_MAX_MS = 7000;

// Cap DPR for the drawing buffer.
const MAX_DPR = 2;

// Nominal dt for a single non-animated frame (reduced motion).
const STATIC_FRAME_DT = 1 / 60;

/** '#6f9bff' -> [0.44, 0.61, 1.0]. Returns null on anything unparseable. */
function hexToRgb(hex) {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!match) return null;
    return [
        parseInt(match[1], 16) / 255,
        parseInt(match[2], 16) / 255,
        parseInt(match[3], 16) / 255,
    ];
}

function rgbToHex(rgb) {
    return "#" + rgb
        .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0"))
        .join("");
}

function readToken(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    return hexToRgb(raw) ?? fallback;
}

/** WCAG relative luminance, same formula the project's contrast checks use. */
function relativeLuminance([r, g, b]) {
    const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
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

function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Pushes a palette hue to full chroma and moves its LIGHTNESS only as far as
 * the theme's luminance band requires.
 *
 * Replaces 7b's adaptForContrast, which mixed a colour toward white on a dark
 * page and toward black on a light one. That worked as contrast arithmetic
 * and failed as colour: mixing toward white desaturates, so the four palette
 * entries that needed it most arrived as pastels, and mixing toward black
 * produced precisely the dark, muddy dye this stage was asked to eliminate.
 *
 * Working in HSL keeps the hue exactly and moves only lightness, with
 * saturation pinned at the floor FIRST so the solve cannot satisfy a
 * luminance bound by draining the colour — every hue reaches every luminance
 * if it is allowed to become grey on the way. Luminance is monotonic in
 * lightness at fixed hue and saturation, so a binary search converges.
 */
function adaptNeon(rgb, band) {
    const [h, s0, l0] = rgbToHsl(rgb);
    const s = Math.max(s0, NEON_SATURATION_FLOOR);
    const at = (l) => hslToRgb(h, s, l);

    const lightnessFor = (target) => {
        if (relativeLuminance(at(HSL_LIGHTNESS_MIN)) >= target) return HSL_LIGHTNESS_MIN;
        if (relativeLuminance(at(HSL_LIGHTNESS_MAX)) <= target) return HSL_LIGHTNESS_MAX;
        let lo = HSL_LIGHTNESS_MIN;
        let hi = HSL_LIGHTNESS_MAX;
        // 16 iterations resolves lightness to ~1e-5, far past what an 8-bit
        // channel can express.
        for (let i = 0; i < 16; i++) {
            const mid = (lo + hi) / 2;
            if (relativeLuminance(at(mid)) < target) lo = mid;
            else hi = mid;
        }
        return (lo + hi) / 2;
    };

    let lightness = clamp(l0, HSL_LIGHTNESS_MIN, HSL_LIGHTNESS_MAX);
    const current = relativeLuminance(at(lightness));
    if (current < band.min) lightness = lightnessFor(band.min);
    else if (current > band.max) lightness = lightnessFor(band.max);
    return at(lightness);
}

/**
 * Dye intensity that lands the same luminance impact for ANY colour in
 * EITHER theme.
 *
 * Does less work than it did in 7b, and that is the point: adaptNeon now
 * delivers every palette entry at nearly the same luminance, so this mostly
 * returns the same number for all seven. It still earns its place on the hues
 * that cannot reach the target without going dark — they arrive dimmer and
 * this is what pays the difference back in alpha.
 */
function dyeIntensityFor(colour, bgLuminance) {
    const contrast = Math.abs(relativeLuminance(colour) - bgLuminance);
    if (contrast < 1e-4) return MAX_DYE_INTENSITY;
    return clamp(TARGET_LUMINANCE_IMPACT / contrast, MIN_DYE_INTENSITY, MAX_DYE_INTENSITY);
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

/** Mean of a byte-frequency slice, normalised 0..1. */
function bandLevel(bins, lo, hi) {
    let total = 0;
    for (let i = lo; i < hi; i++) total += bins[i];
    return total / ((hi - lo) * 255);
}

/** RMS of a byte time-domain buffer, 0..1. Broadband loudness. */
function rmsLevel(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        const v = (samples[i] - 128) / 128;
        sum += v * v;
    }
    return Math.sqrt(sum / samples.length);
}

/**
 * A roaming emitter's path: two sine pairs per axis, at incommensurate
 * frequencies, so the trajectory does not close on itself within any
 * listening session.
 */
function createEmitter(index, count) {
    // Base phases are SEPARATED rather than random. With three independent
    // random phases the emitters periodically cluster in the same corner, and
    // when they do the whole field localises there — measured, that is a lull
    // where the hero shows almost nothing (coverage 6% against a typical 33%)
    // while a track is playing at full energy. Offsetting each emitter by an
    // equal share of the cycle makes the clustering case unreachable; the
    // jitter on top keeps the paths from looking like a rotating formation.
    const spread = (index / count) * Math.PI * 2;
    const axis = (quarter) => ({
        a1: randomBetween(0.17, 0.24),
        a2: randomBetween(0.1, 0.17),
        w1: randomBetween(0.05, 0.09) * Math.PI * 2,
        w2: randomBetween(0.11, 0.19) * Math.PI * 2,
        p1: spread + quarter + randomBetween(-0.4, 0.4),
        p2: Math.random() * Math.PI * 2,
    });
    // A quarter-cycle between the axes turns each path from a diagonal
    // line into an orbit, so one emitter alone already covers area.
    return { x: axis(0), y: axis(Math.PI / 2) };
}

function emitterAt(emitter, t) {
    const value = (a) => a.a1 * Math.sin(a.w1 * t + a.p1) + a.a2 * Math.sin(a.w2 * t + a.p2);
    const slope = (a) => a.a1 * a.w1 * Math.cos(a.w1 * t + a.p1)
        + a.a2 * a.w2 * Math.cos(a.w2 * t + a.p2);
    const dx = slope(emitter.x);
    const dy = slope(emitter.y);
    const length = Math.hypot(dx, dy) || 1;
    return {
        x: clamp(0.5 + value(emitter.x), 0.04, 0.96),
        y: clamp(0.5 + value(emitter.y), 0.04, 0.96),
        // Unit tangent — the direction the emitter is travelling, which is
        // the direction its dye gets thrown.
        ux: dx / length,
        uy: dy / length,
    };
}

export default function FluidBackground() {
    const canvasRef = useRef(null);
    const reduced = useReducedMotion();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const sim = createFluidSim(canvas);
        // No WebGL2, or no float render targets. The hero is perfectly good
        // without this; leave the canvas empty and transparent rather than
        // failing loudly or substituting a lesser effect.
        if (!sim) {
            canvas.dataset.fluidState = "unsupported";
            return;
        }

        const host = canvas.parentElement;

        // ---- palette index ---------------------------------------------------
        //
        // ONE COLOUR PER TRACK, advanced on the first play of a track whose id
        // differs from the last one's.
        //
        // This replaces 7b's free-running wall clock (`floor(now / 21s) % n`),
        // which was a deliberate choice at the time and is simply the wrong
        // one for what the palette is now being asked to say. A wall clock
        // makes colour a property of WHEN you pressed play; a long track drank
        // its way through the whole palette while the same song played, and
        // two different records started in the same colour whenever they
        // happened to be started inside the same 21 seconds.
        //
        // Advancing sequentially rather than hashing the id guarantees the
        // property that actually matters — consecutive tracks are never the
        // same colour. A hash cannot promise that; it collides.
        //
        // Precisely: the colour is a property of the CHANGE, not of the track.
        // Only the previous id is remembered, so pausing and resuming the same
        // record keeps its colour, but coming back to a record after playing
        // others gives it a new one. Verified rather than assumed — the check
        // that would have caught a wrong claim here reads
        // `violet -> magenta -> coral -> gold` and then `gold` again on
        // returning to the first record.
        //
        // Keying a Map on track id would make colour stick to the record
        // permanently, and it was rejected for a specific reason: once more
        // than seven records have been played the stored indices wrap, and two
        // consecutive plays can then land on the same colour — which is the one
        // guarantee this is here to provide.
        //
        // Seeded from the clock ONCE so a first visit is not always mint.
        let paletteIndex = Math.floor(Date.now() / 1000) % PALETTE.length;
        let paletteTrackId = null;
        let paletteOverride = null;
        let colourCache = null;
        // Mutable only so a dev sweep can retune it against the real page;
        // the shipped value is FIELD_SCALE.
        let fieldScale = FIELD_SCALE;

        const advancePaletteFor = (trackId) => {
            if (trackId == null || trackId === paletteTrackId) return;
            if (paletteTrackId !== null) paletteIndex = (paletteIndex + 1) % PALETTE.length;
            paletteTrackId = trackId;
            colourCache = null;
        };

        // ---- colour + theme response ----------------------------------------
        //
        // Memoised on (palette index, theme). Both change rarely — the index
        // on a track change, the theme on a click — but the solve behind it
        // calls getComputedStyle, which can force a style recalculation.
        // Recomputing per splat would put that in the frame loop several
        // times a second, and nine times in the single tick a burst occupies.
        const themeName = () =>
            (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

        const currentColour = () => {
            const index = (import.meta.env.DEV && paletteOverride !== null)
                ? paletteOverride
                : paletteIndex;
            const theme = themeName();
            if (colourCache && colourCache.index === index && colourCache.theme === theme) {
                return colourCache;
            }

            const entry = PALETTE[index];
            const raw = hexToRgb(entry.hex) ?? [1, 1, 1];
            const bgLuminance = relativeLuminance(readToken("--bg-color", [0.04, 0.05, 0.10]));
            const band = theme === "light" ? DYE_LUMINANCE_LIGHT : DYE_LUMINANCE_DARK;
            const rgb = adaptNeon(raw, band);
            const intensity = dyeIntensityFor(rgb, bgLuminance);

            sim.setDisplay(THEME_RESPONSE[theme]);

            colourCache = {
                index,
                theme,
                name: entry.name,
                intensity,
                hex: rgbToHex(rgb),
                dye: rgb.map((c) => c * intensity * fieldScale),
            };
            return colourCache;
        };

        const dpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);

        // Splat radii are expressed in units of the canvas HEIGHT, and the
        // splat shader corrects for aspect so a splat is circular on screen.
        // On a landscape hero that is exactly right. On a portrait one it is a
        // trap: a splat sized as a sensible fraction of a 900px-tall desktop
        // hero, kept circular on a 390x844 phone, spans about two thirds of
        // the width — so the same code that reads as marbled light on desktop
        // measured coverage 1.00 on mobile, a complete wash with no background
        // left anywhere.
        //
        // Scaling by the aspect ratio keeps a splat's share of the canvas
        // AREA constant instead of its shape. Landscape is unaffected (the
        // clamp makes it a no-op at aspect >= 1); portrait shrinks
        // proportionally.
        let radiusScale = 1;
        const sizeToHost = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            radiusScale = Math.min(1, rect.width / rect.height);
            return sim.resize(rect.width, rect.height, dpr());
        };

        /**
         * The deck's centre in GL normalised coords (origin bottom-left).
         *
         * Measured from the live element rather than hardcoded, so the
         * stacked mobile layout (deck above the crate) anchors correctly
         * instead of pointing at empty space. Cached because
         * getBoundingClientRect forces layout and this would otherwise run
         * per splat — nine times inside a single burst tick. Invalidated on
         * resize, the only thing that moves the deck relative to the canvas
         * (both are laid out by the same grid).
         */
        let anchor = null;
        const measureAnchor = () => {
            const box = canvas.getBoundingClientRect();
            const deck = host?.querySelector(".turntable-platter");
            if (!deck || box.width === 0 || box.height === 0) {
                anchor = { cx: 0.68, cy: 0.5 };
                return;
            }
            const d = deck.getBoundingClientRect();
            anchor = {
                cx: (d.left + d.width / 2 - box.left) / box.width,
                // GL's origin is bottom-left; the DOM's is top-left.
                cy: 1 - (d.top + d.height / 2 - box.top) / box.height,
            };
        };

        /**
         * Holds the dye back where the page has text.
         *
         * This is the one place 7c had to choose between two things the brief
         * wanted at once. Measured on the finished field: at the amplitude
         * that makes the hero look alive, the worst moment of a track put the
         * nav links at 1.1:1 and the headline at 2.4:1 against the dye behind
         * them. That is not a subtle regression — it is a recruiter landing on
         * an unreadable page, which is the one failure this site cannot have.
         *
         * The alternative was to dim the whole field until the worst case was
         * safe, which is what makes a background like this look timid: the
         * text occupies maybe a fifth of the hero and would have set the
         * ceiling for all of it.
         *
         * So the fluid runs bright everywhere and is held back only over the
         * two boxes that carry text — the navbar strip and the hero's own text
         * column. Both are MEASURED from the live DOM rather than hardcoded,
         * so the mobile layout (text stacked above the deck, nav collapsed to
         * a hamburger) masks its own boxes rather than a desktop guess. The
         * feather is wide enough that nothing reads as an edge; what a visitor
         * sees is waves thinning as they cross behind the headline, which is
         * how you would compose it by hand anyway.
         *
         * Retained fractions come from the compositing arithmetic, not taste:
         * near-white text over dye at alpha a sits at 5.2:1 for a = 0.4 and
         * 3.9:1 at 0.5, so 0.4 is the last value that clears 4.5:1 for the
         * small text. The headline only needs 3:1 (it is 4.5rem), which is why
         * its column keeps more dye than the navbar strip.
         */
        // Wide. At the steady-state field the boundary is invisible either
        // way — the dye is marbled, so there is no continuous edge for a
        // gradient to show up against. The frame that decides this is the
        // BURST, which floods the hero nearly uniformly for a second or two
        // and is the one moment a tighter falloff reads as two rectangles cut
        // out of the colour. At 0.11 (~150px at 1440) it reads as a vignette.
        const CALM_FEATHER = 0.11;
        const NAVBAR_CALM = 0.34;
        const TEXT_COLUMN_CALM = 0.44;

        const measureCalmZones = () => {
            const box = canvas.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) return;
            // DOM rect -> GL UV, flipping y (GL's origin is bottom-left).
            const toUv = (r, pad = 0) => [
                (r.left - box.left) / box.width - pad,
                1 - (r.bottom - box.top) / box.height - pad,
                (r.right - box.left) / box.width + pad,
                1 - (r.top - box.top) / box.height + pad,
            ];

            const zones = [];
            const nav = document.querySelector(".navbar");
            if (nav) {
                const r = nav.getBoundingClientRect();
                // Full width: the nav's own box is inset, but a wave crossing
                // just outside it still sits under the links' ascenders once
                // the feather is taken into account.
                zones.push({
                    rect: [-0.2, 1 - (r.bottom - box.top) / box.height - 0.01, 1.2, 1.2],
                    strength: NAVBAR_CALM,
                });
            }
            // The union of the headline block and the record crate — they are
            // siblings, not nested, and there are only two zones, so one
            // rectangle covers the whole left column rather than spending the
            // second slot on the crate alone.
            const parts = [".hero-content", ".record-crate"]
                .map((sel) => host?.querySelector(sel)?.getBoundingClientRect())
                .filter(Boolean);
            if (parts.length) {
                const union = {
                    left: Math.min(...parts.map((r) => r.left)),
                    right: Math.max(...parts.map((r) => r.right)),
                    top: Math.min(...parts.map((r) => r.top)),
                    bottom: Math.max(...parts.map((r) => r.bottom)),
                };
                zones.push({ rect: toUv(union, 0.02), strength: TEXT_COLUMN_CALM });
            }
            sim.setCalmZones(zones, CALM_FEATHER);
        };

        const emitters = Array.from({ length: EMITTER_COUNT }, (_, i) => createEmitter(i, EMITTER_COUNT));

        // ---- the burst -------------------------------------------------------
        //
        // Several splats at once, thrown outward from the deck, so the entry
        // reads as one event rather than a drip. Fired on EVERY transition
        // into PLAYING — a fresh needle drop and a resume from pause are both
        // "silence to sound", and nothing about either looks different from
        // the visitor's side, so they are not distinguished here.
        const burst = () => {
            const { dye: base } = currentColour();
            const dye = base.map((c) => c * BURST_DYE_SCALE);
            if (!anchor) measureAnchor();
            for (let i = 0; i < BURST_SPLATS; i++) {
                // Placed on a RING around the deck and thrown outward, not
                // scattered near one point. Measured in 7b: clustering them
                // made the Gaussians overlap almost completely and sum
                // straight past saturation regardless of force or radius, so
                // the burst read as a flat blown-out disc. On a ring they stay
                // distinct and it reads as something leaving the platter.
                const angle = (i / BURST_SPLATS) * Math.PI * 2 + randomBetween(-0.2, 0.2);
                const x = clamp(anchor.cx + Math.cos(angle) * BURST_RING, 0.02, 0.98);
                const y = clamp(anchor.cy + Math.sin(angle) * BURST_RING, 0.02, 0.98);
                sim.splat(
                    x, y,
                    Math.cos(angle) * BURST_FORCE,
                    Math.sin(angle) * BURST_FORCE,
                    dye,
                    BURST_RADIUS * radiusScale,
                );
            }
        };

        // ---- reduced motion ---------------------------------------------------
        //
        // One static frame appears at the moment PLAYING begins, and the
        // canvas is cleared the moment PLAYING ends. Reduced-motion visitors
        // get the same information the animation carries — the hero responds
        // to playback — with no animated injection, no per-frame audio
        // reactivity, and no RAF loop in either state.
        if (reduced) {
            const applyStatic = (next) => {
                if (next === DECK.PLAYING) {
                    advancePaletteFor(audio.getState().trackId);
                    sim.clear();
                    burst();
                    sim.step(STATIC_FRAME_DT);
                    canvas.dataset.fluidState = "static-playing";
                } else {
                    sim.clear();
                    canvas.dataset.fluidState = "static-idle";
                }
            };

            if (import.meta.env.DEV) {
                window.__fluidDebug = {
                    get frames() { return sim.frameCount; },
                    get state() { return canvas.dataset.fluidState; },
                    get reduced() { return true; },
                    get palette() { return currentColour().name; },
                };
            }

            sizeToHost();
            measureCalmZones();
            currentColour();
            applyStatic(getDeckState());
            const offDeck = onDeckState(applyStatic);
            const onResizeStatic = () => {
                anchor = null;
                measureCalmZones();
                // A resize reallocates the grids, which wipes the field — so
                // the static frame has to be re-rendered or it would vanish
                // on the next viewport change and never come back.
                if (sizeToHost()) applyStatic(getDeckState());
            };
            window.addEventListener("resize", onResizeStatic);
            return () => {
                offDeck();
                window.removeEventListener("resize", onResizeStatic);
                sim.dispose();
                if (import.meta.env.DEV) delete window.__fluidDebug;
            };
        }

        // ---- gates -----------------------------------------------------------
        //
        // Four independent reasons to be stopped, deliberately not collapsed
        // into one boolean: they change from different events and any one
        // alone must be enough to hold the loop down.
        let inView = true;
        let visible = document.visibilityState !== "hidden";
        let playing = getDeckState() === DECK.PLAYING;
        let settleUntil = 0;

        let rafId = null;
        let lastTime = performance.now();
        let nextSplatAt = 0;
        let nextCurrentAt = 0;
        let lastProbeAt = 0;
        let lastBurstAt = 0;
        let lastSplatAt = 0;
        // Seconds of energy-scaled time. This — not wall time — is what the
        // emitters travel along, so a driving track moves them faster than a
        // ballad and the pitch fader drags them with it.
        let flowClock = 0;
        let envelopeFast = 0;
        let envelopeSlow = 0;
        let envelopesPrimed = false;
        // Dev-only telemetry, written unconditionally (assigning a few numbers
        // per frame is not worth branching on) but only ever READ through the
        // import.meta.env.DEV block below, which Vite drops in production.
        let lastBands = { rms: 0, energy: 0, punch: 1, treble: 0, rate: 1 };
        let lastSplat = null;

        const analyserBins = new Uint8Array(128);
        const analyserWave = new Uint8Array(256);

        const shouldRun = () => (inView && visible) && (playing || performance.now() < settleUntil);

        const frame = (now) => {
            rafId = requestAnimationFrame(frame);
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            if (playing) {
                // The pitch fader's live value. Phase 9 verified this and the
                // platter's timeScale track each other through a whole drag
                // and its spring-back, so slowing the record visibly slows and
                // weakens the fluid on the same curve.
                const rate = audio.getRate();
                const analyser = audio.getAnalyser();

                let treble = 0;
                let rms = 0;
                if (analyser) {
                    analyser.getByteFrequencyData(analyserBins);
                    analyser.getByteTimeDomainData(analyserWave);
                    treble = bandLevel(analyserBins, TREBLE_BIN_LO, TREBLE_BIN_HI);
                    // Broadband RMS off the WAVEFORM, not a bass band off the
                    // spectrum. 7b drove everything from bass, which is a
                    // statement about arrangement rather than about energy: a
                    // sparse track with a big kick read as more energetic than
                    // a dense one without one.
                    rms = rmsLevel(analyserWave);
                }

                // PRIME both envelopes from the first real sample rather than
                // letting them climb from zero.
                //
                // Measured, not assumed: with a 3.3s time constant starting
                // at 0, the slow envelope needed about five seconds to reach
                // the track's actual level — so `energy` sat pinned at its
                // floor and `punch` (the ratio of the two) read 3.7 on
                // perfectly ordinary material for the whole opening. Every
                // track began looking like a quiet track having a seizure.
                // This is the same class of mistake as B55, one level up: not
                // the wrong time constant, the wrong starting point.
                if (!envelopesPrimed && rms > 1e-3) {
                    envelopeFast = rms;
                    envelopeSlow = rms;
                    envelopesPrimed = true;
                }
                envelopeFast = envelopeFast * ENVELOPE_FAST_SMOOTHING
                    + rms * (1 - ENVELOPE_FAST_SMOOTHING);
                envelopeSlow = envelopeSlow * ENVELOPE_SLOW_SMOOTHING
                    + rms * (1 - ENVELOPE_SLOW_SMOOTHING);

                // ENERGY: how loud the track has been lately, normalised. Sets
                // everything about the character of the field — cadence, wave
                // size, how hard the currents push, how fast the emitters
                // travel. A soft track gets slow, wide, gentle swells; a
                // punchy one gets fast, tight, forceful ones.
                const energy = clamp(envelopeSlow / ENERGY_REFERENCE_RMS, ENERGY_FLOOR, 1);
                // PUNCH: how far above that the current moment is. Ratio, not
                // difference, so it is independent of the master's level and a
                // quiet track's transients still count as transients.
                const punch = envelopeSlow > 1e-4 ? envelopeFast / envelopeSlow : 1;
                const punchExcess = clamp(punch - 1, 0, 1.4);

                lastBands = { rms, energy, punch, treble, rate, envelopeFast, envelopeSlow };

                // Emitters travel on energy-scaled time, so the flow itself
                // follows the song rather than running at a fixed speed
                // underneath it.
                flowClock += dt * lerp(0.45, 1.5, energy) * rate;

                const interval = lerp(SPLAT_MAX_INTERVAL_MS, SPLAT_MIN_INTERVAL_MS, energy)
                    * (1 - treble * 0.3) / Math.max(rate, 0.2);
                const overdue = now - lastSplatAt >= interval * SPLAT_FORCED_GAP_RATIO;

                if (now >= nextSplatAt && (punch > PUNCH_TRIGGER || overdue)) {
                    const { dye: base } = currentColour();
                    // Dye scales with energy too, but over a narrow range and
                    // off a high floor: a soft track should read as softer,
                    // not as absent.
                    const dyeScale = lerp(0.8, 1.15, energy);
                    const dye = base.map((c) => c * dyeScale);

                    // Deck or roaming emitter. The deck share keeps the
                    // platter reading as the source; the emitters are what put
                    // colour on the other side of the hero.
                    let x;
                    let y;
                    let ux;
                    let uy;
                    if (Math.random() < DECK_SPLAT_SHARE) {
                        if (!anchor) measureAnchor();
                        const angle = Math.random() * Math.PI * 2;
                        const spread = 0.05 + treble * 0.12;
                        x = clamp(anchor.cx + Math.cos(angle) * spread, 0.04, 0.96);
                        y = clamp(anchor.cy + Math.sin(angle) * spread, 0.04, 0.96);
                        ux = Math.cos(angle);
                        uy = Math.sin(angle);
                    } else {
                        const point = emitterAt(
                            emitters[Math.floor(Math.random() * emitters.length)],
                            flowClock,
                        );
                        x = point.x;
                        y = point.y;
                        ux = point.ux;
                        uy = point.uy;
                    }

                    // Soft tracks get BIGGER, slower waves and punchy ones get
                    // tighter, harder ones — the inverse relationship is the
                    // point. A gentle track rendered as small weak blobs looks
                    // broken; rendered as slow wide swells it looks calm.
                    const radius = SPLAT_BASE_RADIUS
                        * lerp(1.45, 0.85, energy)
                        * (0.85 + punchExcess * 0.45);
                    const force = SPLAT_BASE_FORCE
                        * lerp(0.55, 1, energy)
                        * (0.6 + punchExcess * 1.6)
                        * rate;

                    sim.splat(x, y, ux * force, uy * force, dye, radius * radiusScale);
                    lastSplat = { at: now, energy, punch, rms, treble, rate, force, radius, interval, x, y };
                    lastSplatAt = now;
                    nextSplatAt = now + interval;
                }

                // Currents: wide, dye-free pushes that carry existing colour
                // across the hero. Aimed along the drift of a slowly rotating
                // global direction so the field has a prevailing flow rather
                // than churning in place.
                if (now >= nextCurrentAt) {
                    const heading = flowClock * 0.21;
                    const push = CURRENT_FORCE * lerp(0.5, 1, energy) * rate;
                    sim.splat(
                        randomBetween(0.1, 0.9),
                        randomBetween(0.15, 0.85),
                        Math.cos(heading) * push,
                        Math.sin(heading) * push,
                        null,
                        CURRENT_RADIUS * radiusScale,
                        { velocityOnly: true },
                    );
                    nextCurrentAt = now + CURRENT_INTERVAL_MS / lerp(0.6, 1.4, energy);
                }
            } else if (now >= lastProbeAt + SETTLE_PROBE_INTERVAL_MS) {
                // Settling. No new dye goes in; the solver's own dissipation
                // is the fade. Stop as soon as what is left is measurably
                // gone rather than guessing at the exponential's tail.
                lastProbeAt = now;
                if (sim.peakDyeLevel() < SETTLE_DYE_THRESHOLD) settleUntil = 0;
            }

            sim.step(dt);

            if (!shouldRun()) {
                // Settle finished (or a gate closed mid-settle) — hard cut, so
                // the canvas is genuinely blank rather than holding an
                // asymptotic residue no one can see but the GPU still draws.
                sim.clear();
                sync();
            }
        };

        function sync() {
            const run = shouldRun();
            if (run && rafId === null) {
                // Reset the clock on resume. Without this the first frame back
                // from a hidden tab gets a dt of however long the tab was
                // away — the solver clamps it, but the splat scheduler would
                // still fire a burst of catch-up splats at once.
                lastTime = performance.now();
                lastProbeAt = lastTime;
                lastSplatAt = lastTime;
                nextCurrentAt = lastTime + CURRENT_INTERVAL_MS;
                rafId = requestAnimationFrame(frame);
            } else if (!run && rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            canvas.dataset.fluidState = run
                ? (playing ? "playing" : "settling")
                : "idle";
        }

        // ---- deck coupling ----------------------------------------------------
        //
        // Synchronous, via deck-state.js — NOT an effect watching a prop.
        // At the needle-contact call site this handler runs in the same tick
        // as audio.playCached(), which is the entire reason that function
        // exists (Stage 1 measured the async path landing 551ms late). An
        // effect would reintroduce exactly that gap on the visual side.
        const offDeck = onDeckState((next, previous) => {
            if (next === DECK.PLAYING) {
                // Read the track id from the audio module rather than a prop:
                // this handler runs inside playCached()'s own tick, and
                // getState() is already updated by then, whereas a prop would
                // be a render behind.
                advancePaletteFor(audio.getState().trackId);
                playing = true;
                settleUntil = 0;
                // Envelopes start from the previous track's level otherwise,
                // which makes the first second of a quiet track inherit a loud
                // one's energy (and vice versa).
                envelopeFast = 0;
                envelopeSlow = 0;
                envelopesPrimed = false;
                // Deliberately NOT clearing first on a quick pause→resume.
                // Checked live rather than assumed: residual dye from the
                // previous stop is still drifting on a velocity field the new
                // burst adds to, and the two compose into one continuous
                // swell — a clear would instead blink the hero to black at
                // the exact moment the visitor asked for sound back.
                lastBurstAt = performance.now();
                burst();
                sync();
            } else if (previous === DECK.PLAYING) {
                playing = false;
                settleUntil = performance.now() + SETTLE_MAX_MS;
                lastProbeAt = performance.now();
                sync();
            }
        });

        if (import.meta.env.DEV) {
            window.__fluidDebug = {
                get frames() { return sim.frameCount; },
                get state() { return canvas.dataset.fluidState; },
                get running() { return rafId !== null; },
                get playing() { return playing; },
                get lastBurstAt() { return lastBurstAt; },
                get peakDye() { return sim.peakDyeLevel(); },
                get palette() { return currentColour().name; },
                get paletteIndex() { return paletteIndex; },
                get paletteTrackId() { return paletteTrackId; },
                setPalette: (i) => { paletteOverride = i; colourCache = null; },
                get bands() { return lastBands; },
                get lastSplat() { return lastSplat; },
                get simResolution() { return sim.simResolution; },
                get dyeResolution() { return sim.dyeResolution; },
                get display() { return sim.displayOptions; },
                get solver() { return sim.solverOptions; },
                setDisplay: (next) => sim.setDisplay(next),
                setSolver: (next) => sim.setSolver?.(next),
                get fieldScale() { return fieldScale; },
                setFieldScale: (v) => { fieldScale = v; colourCache = null; },
                get fieldStats() { return sim.fieldStats?.(); },
                benchmark: (n) => sim.benchmark?.(n),
                get calmZones() { return sim.calmZones; },
                setCalmZones: (z, f) => sim.setCalmZones(z, f),
                burst,
                paletteEntries: PALETTE,
                solveFor: (hex, theme) => {
                    const bgL = relativeLuminance(readToken("--bg-color", [0.04, 0.05, 0.10]));
                    const t = theme ?? themeName();
                    const raw = hexToRgb(hex);
                    const adapted = adaptNeon(
                        raw,
                        t === "light" ? DYE_LUMINANCE_LIGHT : DYE_LUMINANCE_DARK,
                    );
                    const [, sat, light] = rgbToHsl(adapted);
                    return {
                        theme: t,
                        rawLuminance: relativeLuminance(raw),
                        adaptedLuminance: relativeLuminance(adapted),
                        bgLuminance: bgL,
                        contrast: Math.abs(relativeLuminance(adapted) - bgL),
                        saturation: sat,
                        lightness: light,
                        intensity: dyeIntensityFor(adapted, bgL),
                        adaptedHex: rgbToHex(adapted),
                    };
                },
            };
        }

        sizeToHost();
        measureCalmZones();
        // Establishes the theme response before the first frame — otherwise a
        // burst that lands before any colour lookup would render with the
        // solver's constructor defaults, which are dark theme's.
        currentColour();

        // Mirrors turntable.jsx's own visibilitychange handler (which lives in
        // the COMPONENT, not turntable-audio.js — see STATUS.md). One
        // deliberate difference: that handler pauses on hide and does NOT
        // auto-resume, because silently restarting audio in a backgrounded tab
        // is hostile. A background visual has the opposite expectation, so
        // this one resumes — and it only resumes into a loop at all if
        // something is still playing.
        const onVisibility = () => {
            visible = document.visibilityState !== "hidden";
            sync();
        };
        document.addEventListener("visibilitychange", onVisibility);

        // The only other IntersectionObserver in the codebase is
        // my-taste.jsx's scroll-position dots, whose shape this follows.
        // Observes the hero SECTION rather than the canvas: same box today,
        // but the section is the thing whose visibility means "the visitor is
        // looking at the hero", and it stays correct if the canvas is ever
        // inset.
        const observer = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                sync();
            },
            { threshold: 0 },
        );
        if (host) observer.observe(host);

        // The theme can change while a track is playing, and the response
        // uniforms are set inside currentColour()'s cache miss — which a
        // playing frame reaches only when it fires a splat, and a settling
        // frame never reaches at all. Watching the attribute directly makes
        // the swap immediate in both cases.
        const themeObserver = new MutationObserver(() => { currentColour(); });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        const onResize = () => { anchor = null; sizeToHost(); measureCalmZones(); };
        window.addEventListener("resize", onResize);

        // A lost context (driver reset, GPU sleep, too many live contexts)
        // arrives as an event, not an exception. Without preventDefault the
        // browser never fires restore; here we simply stop and stay stopped,
        // which leaves an empty transparent canvas rather than a frozen one.
        const onContextLost = (event) => {
            event.preventDefault();
            if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
            canvas.dataset.fluidState = "context-lost";
        };
        canvas.addEventListener("webglcontextlost", onContextLost);

        // If a track is somehow already playing when this mounts (a remount
        // mid-playback — the `reduced` dependency flipping, say), pick it up
        // rather than waiting for the next transition that may never come.
        if (playing) {
            advancePaletteFor(audio.getState().trackId);
            burst();
        }
        sync();

        return () => {
            offDeck();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("resize", onResize);
            canvas.removeEventListener("webglcontextlost", onContextLost);
            observer.disconnect();
            themeObserver.disconnect();
            if (rafId !== null) cancelAnimationFrame(rafId);
            sim.dispose();
            if (import.meta.env.DEV) delete window.__fluidDebug;
        };
    }, [reduced]);

    return (
        <canvas
            className="hero-fluid-canvas"
            ref={canvasRef}
            aria-hidden="true"
            data-fluid-state="init"
        />
    );
}
