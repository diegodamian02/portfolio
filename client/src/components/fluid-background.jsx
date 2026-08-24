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
// 7a's idle-splat placeholder loop is GONE, as 7a's own comment said it
// should be, rather than left running underneath the audio-driven splats.

// ---- palette (Stage 7b) ----------------------------------------------------
//
// Fluid-only. Deliberately NOT routed through colorwayFor() or the vinyl
// pressings — those are record colours, chosen to look like vinyl, and mint
// in particular would be a bizarre record. Separate systems.
const PALETTE = [
    { name: "wine", hex: "#A6335D" },
    { name: "slate", hex: "#404D73" },
    { name: "mint", hex: "#BBF2ED" },
    { name: "amber", hex: "#c97a1a" },
    { name: "terracotta", hex: "#b3552a" },
];

// How long each palette colour holds.
//
// DERIVED FROM WALL-CLOCK TIME, not advanced by a timer and not reset on
// play. The brief offered a free-running background clock or a reset-to-first
// on every PLAYING; this is the free-running option, implemented as
// `floor(now / period) % length` so there is no interval to start, stop, leak
// or drift, and no state to reset. Consecutive plays land on different
// colours for free, and a long track drifts through the palette as it plays —
// new splats simply start arriving in the next colour while existing dye is
// still the previous one, which the solver blends on its own.
const PALETTE_PERIOD_MS = 21000;

// ---- burst -----------------------------------------------------------------
const BURST_SPLATS = 6;
const BURST_FORCE = 520;
const BURST_RADIUS = 1.15;
// Radius of the ring the burst's splats sit on, in normalised canvas units.
const BURST_RING = 0.09;

// ---- audio-driven splats ---------------------------------------------------
const SPLAT_BASE_FORCE = 300;
const SPLAT_BASE_RADIUS = 1.0;

// Refractory floor between audio-driven splats. Bass transients on a busy
// track arrive far faster than the fluid can read as distinct events; without
// a floor the field saturates into a wash and the beat stops being legible.
const SPLAT_MIN_INTERVAL_MS = 95;
const SPLAT_MAX_INTERVAL_MS = 320;

// A splat fires when bass exceeds its own running average by this much —
// adaptive rather than an absolute threshold, because preview clips arrive at
// wildly different masters and a fixed cutoff either never fires on a quiet
// track or fires every frame on a loud one.
const BASS_TRIGGER_RATIO = 1.18;

// Per-frame retention of the running bass baseline. 0.92 was the first
// attempt and is far too fast: at 60fps that is a ~0.2s time constant, so the
// "average" chased the current level almost exactly and bass essentially
// never exceeded it by 18% — measured, 2 splats fired in 3.6s of a busy
// track. 0.99 is a ~1.7s baseline, which is what a transient can actually
// stand out against.
const BASS_AVERAGE_SMOOTHING = 0.99;

// A track with no sharp transients (a pad, a fade-in, a sustained vocal) must
// still show presence — the hero looking dead while audio plays would defeat
// the whole point of presence-gating. So the refractory has a companion
// ceiling: once this long has passed since the last splat, the next eligible
// frame fires regardless of whether bass beat its baseline.
const SPLAT_FORCED_GAP_MS = 480;

// FFT bin ranges. fftSize is 256 (turntable-audio.js), so there are 128 bins
// spanning 0..Nyquist — about 187Hz per bin at 48kHz.
const BASS_BIN_LO = 1;
const BASS_BIN_HI = 8;    // ~190-1500Hz: kick/bass fundamentals
const TREBLE_BIN_LO = 32;
const TREBLE_BIN_HI = 96; // ~6-18kHz: hats, air, transient sparkle

// ---- settle ----------------------------------------------------------------
//
// After PLAYING ends, injection stops but the loop keeps stepping so the
// existing dye decays through the solver's OWN dissipation — 7a tuned that
// curve, and layering a second fade on top would fight it.
const SETTLE_PROBE_INTERVAL_MS = 180;
// Probe value below which the field counts as gone. Chosen so the THRESHOLD
// is the routine exit and the ceiling below stays a genuine safety net: at
// 0.02 the decay was still at 0.024 when the 4s ceiling fired, so the bound
// was doing the work on every single pause. Verified that what remains at
// this level is imperceptible by reading the real canvas back, not by
// assuming — see STATUS.md.
const SETTLE_DYE_THRESHOLD = 0.035;

// Hard ceiling on the settle window. Exponential decay approaches zero
// asymptotically and never truly arrives, so the probe alone could keep the
// loop alive indefinitely on a slow tail. Same reasoning as 7a's reduced
// motion being a hard single-frame cut rather than a trust in an asymptote.
const SETTLE_MAX_MS = 4000;

// How much relative luminance the dye is allowed to move the background by.
// Intensity is DERIVED from this per colour and per theme (see
// dyeIntensityFor) rather than being one shared multiplier.
const TARGET_LUMINANCE_IMPACT = 0.155;
const MIN_DYE_INTENSITY = 0.1;
const MAX_DYE_INTENSITY = 0.9;

// Minimum luminance separation a dye colour must have from the page
// background before the intensity solve can hit its target. Set to
// TARGET_LUMINANCE_IMPACT / MAX_DYE_INTENSITY plus a little headroom — below
// this the solve saturates at its clamp and the colour renders weaker than
// the rest of the palette. adaptForContrast() lightens or darkens a colour
// until it clears this.
const MIN_DYE_CONTRAST = 0.19;

// Scales every splat's dye contribution down before it reaches the field.
//
// dyeIntensityFor() solves for what ONE splat should contribute, which is the
// right question for 7a's sparse idle drops but not for 7b, where splats
// overlap constantly — a 7-splat burst plus beat-driven top-ups summed well
// past saturation and pinned peak dye at a flat 1.0 for entire tracks.
//
// The division of labour is deliberate: the per-colour solve sets the RATIO
// between colours and themes (its real job — keeping mint and wine equally
// legible on either background), and this single measured scalar sets the
// absolute amplitude of the composited field. Tuned by sweep, not by eye:
// The burst gets its own multiplier on top (BURST_DYE_SCALE) because the two
// need opposite corrections: measured in the real page, the burst peaked at a
// healthy 0.69 while the ongoing splats sustained only ~0.10, so the hero lit
// up on arrival and then faded out underneath a track that was still playing.
const FIELD_OVERLAP_SCALE = 0.55;

// The burst overlaps six splats at once, so it needs LESS dye per splat than
// a lone beat-driven one to land at a comparable peak. Separating the two is
// what allows the sustained field to come up without the entry saturating.
const BURST_DYE_SCALE = 0.45;

// Cap DPR for the drawing buffer. The display pass is a single quad so it is
// nearly free, but the dye/sim grids are allocated against the drawing
// buffer's own aspect and a 3× buffer on a phone is memory spent for detail
// that the 512-wide dye grid cannot resolve anyway.
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

function readToken(name, fallback) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    return hexToRgb(raw) ?? fallback;
}

/** WCAG relative luminance, same formula the project's contrast checks use. */
function relativeLuminance([r, g, b]) {
    const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Dye intensity that lands the same luminance impact for ANY colour in
 * EITHER theme.
 *
 * 7a established this solve for a single colour (--accent) and it is doing
 * more work now. A shared multiplier is not merely imprecise across a
 * five-colour palette, it inverts: mint (#BBF2ED, ~87% lightness) against
 * near-black dark theme has a luminance delta of ~0.82, while against
 * near-white light theme it is ~0.11 — so the SAME dye that is bright and
 * legible in dark theme is nearly the page background itself in light. Each
 * colour therefore gets its own solve per theme; all ten combinations are
 * verified rather than spot-checked (numbers in STATUS.md).
 */
function dyeIntensityFor(colour) {
    const bg = readToken("--bg-color", [0.04, 0.05, 0.10]);
    const contrast = Math.abs(relativeLuminance(colour) - relativeLuminance(bg));
    if (contrast < 1e-4) return MAX_DYE_INTENSITY;
    const derived = TARGET_LUMINANCE_IMPACT / contrast;
    return Math.min(MAX_DYE_INTENSITY, Math.max(MIN_DYE_INTENSITY, derived));
}

/**
 * Nudges a palette colour away from the page background until it has enough
 * luminance contrast for the intensity solve to reach its target.
 *
 * Necessary because the solve alone cannot rescue a colour that sits ON the
 * background: alpha only interpolates between the two, so no amount of it
 * makes a dark blue legible over near-black — it just approaches dark blue.
 * Verified across all ten colour x theme pairs rather than assumed, and four
 * of them failed: wine (contrast 0.108), slate (0.072) and terracotta (0.158)
 * against dark theme, and mint (0.129) against light. All four pinned the
 * solve at its 0.9 clamp, which is the model reporting "I cannot get there"
 * — those four would have rendered visibly weaker than the rest of the
 * palette while the numbers looked deliberate.
 *
 * Mixing toward white on a dark page and toward black on a light one keeps
 * the hue and moves only the lightness, which is the same thing this
 * project's own tokens already do by hand — --accent, --vinyl-N and the deck
 * colours all ship separate light/dark values. This derives that adjustment
 * instead of hand-authoring ten hexes, so the palette stays one list.
 */
function adaptForContrast(rgb, bgLuminance) {
    const towardWhite = bgLuminance < 0.5;
    const mix = (t) => rgb.map((c) => (towardWhite ? c + (1 - c) * t : c * (1 - t)));
    if (Math.abs(relativeLuminance(rgb) - bgLuminance) >= MIN_DYE_CONTRAST) return rgb;
    // Binary search the smallest mix that clears the threshold — luminance is
    // monotonic in t along either direction, so this converges, and 12
    // iterations is well past the precision an 8-bit channel can express.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 12; i++) {
        const t = (lo + hi) / 2;
        if (Math.abs(relativeLuminance(mix(t)) - bgLuminance) >= MIN_DYE_CONTRAST) hi = t;
        else lo = t;
    }
    return mix(hi);
}

/** Index into PALETTE for a given instant. Stateless — see PALETTE_PERIOD_MS. */
function paletteIndexAt(nowMs) {
    return Math.floor(nowMs / PALETTE_PERIOD_MS) % PALETTE.length;
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

        // Palette colour, memoised on (palette index, theme).
        //
        // Both inputs change rarely — the index every PALETTE_PERIOD_MS, the
        // theme on a click — but the solve behind it calls getComputedStyle,
        // which can force a style recalculation. Recomputing per splat would
        // put that in the frame loop several times a second, and seven times
        // in the single tick a burst occupies.
        let colourCache = null;
        // Dev-only palette pin, for capturing one screenshot per colour. The
        // first attempt at that froze Date.now() globally instead, which also
        // froze the intro loading screen's own animation and hung the page —
        // the wall-clock derivation is deliberately global, so the seam has to
        // be here rather than on the clock. `import.meta.env.DEV` is replaced
        // with false at build time, so the whole branch is dropped.
        let paletteOverride = null;
        const currentColour = () => {
            const index = (import.meta.env.DEV && paletteOverride !== null)
                ? paletteOverride
                : paletteIndexAt(Date.now());
            const theme = document.documentElement.getAttribute("data-theme");
            if (colourCache && colourCache.index === index && colourCache.theme === theme) {
                return colourCache;
            }
            const entry = PALETTE[index];
            const raw = hexToRgb(entry.hex) ?? [1, 1, 1];
            const bgLuminance = relativeLuminance(readToken("--bg-color", [0.04, 0.05, 0.10]));
            const rgb = adaptForContrast(raw, bgLuminance);
            const intensity = dyeIntensityFor(rgb);
            colourCache = {
                index,
                theme,
                name: entry.name,
                intensity,
                dye: rgb.map((c) => c * intensity * FIELD_OVERLAP_SCALE),
            };
            return colourCache;
        };

        const dpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const sizeToHost = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return sim.resize(rect.width, rect.height, dpr());
        };

        /**
         * Where splats originate, in GL normalised coords (origin bottom-left).
         *
         * ANCHORED ON THE TURNTABLE, not random across the canvas — the brief
         * offered both. The hero's entire premise is that the deck is the
         * source of the sound (goal 4), and dye welling out of the platter
         * says that where scattered dye just says "animated wallpaper". It
         * also keeps the field away from the headline on the left, which 7a's
         * own contrast work showed is the part of the hero worth protecting.
         *
         * Measured from the live element rather than hardcoded, so the
         * stacked mobile layout (deck above the crate) anchors correctly
         * instead of pointing at empty space.
         */
        // Cached: getBoundingClientRect forces layout, and this would
        // otherwise run per splat — seven times inside a single burst tick.
        // Invalidated on resize, which is the only thing that moves the deck
        // relative to the canvas (both are laid out by the same grid).
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

        const originNear = (spread) => {
            if (!anchor) measureAnchor();
            return [
                Math.min(0.98, Math.max(0.02, anchor.cx + randomBetween(-spread, spread))),
                Math.min(0.98, Math.max(0.02, anchor.cy + randomBetween(-spread, spread))),
            ];
        };

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
                // scattered near one point. Measured: clustering them made
                // seven Gaussians overlap almost completely and sum straight
                // past saturation regardless of force or radius, so the burst
                // read as a flat blown-out disc. On a ring they stay distinct
                // and the burst reads as something leaving the platter.
                const angle = (i / BURST_SPLATS) * Math.PI * 2 + randomBetween(-0.25, 0.25);
                const x = Math.min(0.98, Math.max(0.02, anchor.cx + Math.cos(angle) * BURST_RING));
                const y = Math.min(0.98, Math.max(0.02, anchor.cy + Math.sin(angle) * BURST_RING));
                sim.splat(
                    x, y,
                    Math.cos(angle) * BURST_FORCE,
                    Math.sin(angle) * BURST_FORCE,
                    dye,
                    BURST_RADIUS,
                );
            }
        };

        // ---- reduced motion ---------------------------------------------------
        //
        // REVISED IN 7b, and this is a real accessibility decision rather than
        // a detail — 7a rendered one static frame unconditionally at mount,
        // which made sense when the fluid was ambient. Now that PRESENCE is
        // the signal, an always-on frame would say "something is playing" when
        // nothing is.
        //
        // So: one static frame appears at the moment PLAYING begins, and the
        // canvas is cleared the moment PLAYING ends. Reduced-motion visitors
        // get the same information the animation carries — the hero responds
        // to playback — with no animated injection, no per-frame audio
        // reactivity, and no RAF loop in either state.
        if (reduced) {
            const applyStatic = (next) => {
                if (next === DECK.PLAYING) {
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
                };
            }

            sizeToHost();
            applyStatic(getDeckState());
            const offDeck = onDeckState(applyStatic);
            const onResizeStatic = () => {
                anchor = null;
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
        // alone must be enough to hold the loop down. `playing` and
        // `settleUntil` are 7b's addition; the other two are 7a's.
        let inView = true;
        let visible = document.visibilityState !== "hidden";
        let playing = getDeckState() === DECK.PLAYING;
        let settleUntil = 0;

        let rafId = null;
        let lastTime = performance.now();
        let nextSplatAt = 0;
        let bassAverage = 0;
        let lastProbeAt = 0;
        let lastBurstAt = 0;
        // Dev-only telemetry, written unconditionally (assigning two numbers
        // per frame is not worth branching on) but only ever READ through the
        // import.meta.env.DEV block below, which Vite drops in production.
        let lastBands = { bass: 0, treble: 0, rate: 1 };
        let lastSplat = null;
        let lastSplatAt = 0;

        const analyserBins = new Uint8Array(128);

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

                let bass = 0;
                let treble = 0;
                if (analyser) {
                    analyser.getByteFrequencyData(analyserBins);
                    bass = bandLevel(analyserBins, BASS_BIN_LO, BASS_BIN_HI);
                    treble = bandLevel(analyserBins, TREBLE_BIN_LO, TREBLE_BIN_HI);
                }

                bassAverage = bassAverage * BASS_AVERAGE_SMOOTHING
                    + bass * (1 - BASS_AVERAGE_SMOOTHING);
                lastBands = { bass, treble, rate, average: bassAverage };

                // Treble shortens the gap between splats, bass decides whether
                // this particular moment is worth one. Both scale with rate,
                // so a slowed record fires less often as well as more weakly.
                const interval = (SPLAT_MAX_INTERVAL_MS
                    - (SPLAT_MAX_INTERVAL_MS - SPLAT_MIN_INTERVAL_MS) * treble) / Math.max(rate, 0.2);

                const isTransient = bass > bassAverage * BASS_TRIGGER_RATIO && bass > 0.02;
                const overdue = now - lastSplatAt >= SPLAT_FORCED_GAP_MS;
                if (now >= nextSplatAt && (isTransient || overdue)) {
                    const { dye } = currentColour();
                    // Treble also widens the scatter: a bright, busy passage
                    // throws dye further from the deck than a dark one.
                    const [x, y] = originNear(0.08 + treble * 0.22);
                    const angle = Math.random() * Math.PI * 2;
                    const force = SPLAT_BASE_FORCE * (0.45 + bass * 1.6) * rate;
                    const radius = SPLAT_BASE_RADIUS * (0.7 + bass * 0.9);
                    sim.splat(
                        x, y,
                        Math.cos(angle) * force,
                        Math.sin(angle) * force,
                        dye,
                        radius,
                    );
                    lastSplat = { at: now, bass, treble, rate, force, radius, interval };
                    lastSplatAt = now;
                    nextSplatAt = now + interval;
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
                playing = true;
                settleUntil = 0;
                // Deliberately NOT clearing first on a quick pause→resume.
                // Checked live rather than assumed: residual dye from the
                // previous stop is still drifting on a velocity field the new
                // burst adds to, and the two compose into one continuous
                // swell — a clear would instead blink the hero to black at
                // the exact moment the visitor asked for sound back, which is
                // the worse of the two. Screenshotted; see STATUS.md.
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
                setPalette: (i) => { paletteOverride = i; colourCache = null; },
                get bands() { return lastBands; },
                get lastSplat() { return lastSplat; },
                get simResolution() { return sim.simResolution; },
                get dyeResolution() { return sim.dyeResolution; },
                paletteEntries: PALETTE,
                solveFor: (hex) => {
                    const bgL = relativeLuminance(readToken("--bg-color", [0.04, 0.05, 0.10]));
                    const raw = hexToRgb(hex);
                    const adapted = adaptForContrast(raw, bgL);
                    return {
                        rawLuminance: relativeLuminance(raw),
                        adaptedLuminance: relativeLuminance(adapted),
                        bgLuminance: bgL,
                        contrast: Math.abs(relativeLuminance(adapted) - bgL),
                        intensity: dyeIntensityFor(adapted),
                        adaptedHex: "#" + adapted.map((c) =>
                            Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join(""),
                    };
                },
            };
        }

        sizeToHost();

        // Mirrors turntable.jsx's own visibilitychange handler (which lives in
        // the COMPONENT, not turntable-audio.js — see STATUS.md). One
        // deliberate difference: that handler pauses on hide and does NOT
        // auto-resume, because silently restarting audio in a backgrounded tab
        // is hostile. A background visual has the opposite expectation, so
        // this one resumes — and under 7b it only resumes into a loop at all
        // if something is still playing.
        const onVisibility = () => {
            visible = document.visibilityState !== "hidden";
            sync();
        };
        document.addEventListener("visibilitychange", onVisibility);

        // The only IntersectionObserver in the codebase is my-taste.jsx's
        // scroll-position dots, whose shape this follows (7a's brief pointed
        // at navbar.jsx, which has none — see STATUS.md). Observes the hero
        // SECTION rather than the canvas: same box today, but the section is
        // the thing whose visibility means "the visitor is looking at the
        // hero", and it stays correct if the canvas is ever inset.
        const observer = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                sync();
            },
            { threshold: 0 },
        );
        if (host) observer.observe(host);

        const onResize = () => { anchor = null; sizeToHost(); };
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
        if (playing) burst();
        sync();

        return () => {
            offDeck();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("resize", onResize);
            canvas.removeEventListener("webglcontextlost", onContextLost);
            observer.disconnect();
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
