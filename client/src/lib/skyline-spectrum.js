// The hero spectrum, drawn as a colour DOT MATRIX on a 2D canvas.
//
// This EVOLVES the Stage 7 synthwave skyline: the bucketing, ballistics,
// auto-gain, spectral tilt and text-safe-zone mask are the same measured code
// that carried the neon bars. What changed is the mark — columns of dots
// rising from the horizon instead of solid bars — and the colour source:
// `hero-palette.js` now hands over one analogous SCHEME per song
// (foot -> body -> tip per column) rather than a travelling wave over a 7-hue
// ring. Bar-only machinery is gone: the per-bar rounded rects, the tip caps,
// the shared vertical alpha ramp and its anti-banding dither.
//
// Framework-agnostic, same split as before: this file owns bucketing,
// ballistics and drawing; `skyline-background.jsx` owns the RAF loop, the deck
// gating and the palette. Nothing here imports React and nothing here reads
// the deck.

// ---- bucketing -------------------------------------------------------------

// The band the columns span. 32 Hz is below the fundamental of almost any bass
// note that survives a lossy 30-second preview; 16 kHz is where an AAC
// preview's lowpass usually sits.
const FREQ_MIN = 32;
const FREQ_MAX = 16000;

// Column count is derived from width. A dot column wants a wider slot than a
// 3px bar sliver did — CELL_PX is the target square pitch of the grid, so the
// count also sets the dot size. Bounds, not a formula: below ~22 the spectrum
// reads blocky, above ~76 the dots get too small to register as dots.
const CELL_PX = 20;
const COLUMNS_MIN = 22;
const COLUMNS_MAX = 76;

// Dot radius as a fraction of the cell. 0.30 leaves a clear gap between dots so
// the grid reads as discrete points of light, not a fill.
const DOT_RADIUS_RATIO = 0.30;

// ---- ballistics -----------------------------------------------------------

// Release time constant, seconds. A column's DISPLAYED height is its own state
// and only ever falls exponentially toward the incoming value. Applied as
// exp(-dt / TAU) so a 120Hz and a 60Hz display decay at the same rate in
// seconds. Attack is instant by design.
const RELEASE_TAU = 0.34;

// ---- auto-gain ----------------------------------------------------------

// Two GLOBAL references for the whole spectrum — a low and a high — mapping
// [quiet, loud] onto [0, 1] so the display uses its full height on a quiet
// master and a loud one alike. Per-column auto-gain would destroy the
// spectrum's SHAPE; both of these are global, so the map is affine and
// identical for every column. Both move fast toward the signal and slowly away
// (FINDINGS B55).
const LOUD_RELEASE = 0.9992;
const QUIET_RELEASE = 0.9988;
const LOUD_FLOOR = 0.18;

// Below this the spectrum is too flat to stretch — near-silence or a single
// sustained tone. A guard, not a tuning knob.
const MIN_SPAN = 0.26;

// Applied after normalisation. Above 1 it pushes mid-level columns DOWN, which
// widens the gap between a column carrying something and one carrying almost
// nothing — the difference between a spectrum and a hedge. Swept offline
// against captured analyser frames from five previews.
const RESPONSE_GAMMA = 2.1;

// ---- spectral tilt ------------------------------------------------------

// Music has systematically less energy the higher you look; with columns
// spaced by pitch that shows up as the right-hand third being permanently
// short. A linear ramp across the (log-spaced) column index is a constant
// dB-per-octave slope — the standard analyser-display correction. Deliberately
// partial: flattening it completely also flattens the difference BETWEEN
// tracks.
const TILT_TOP = 0.14;

// ---- geometry ---------------------------------------------------------

// Fraction of the distance from the horizon to the top of the canvas that the
// tallest possible column reaches. Only the FALLBACK — the component overrides
// it with a value derived from the live navbar box, because the thing the
// ceiling actually has to clear is the nav links.
const MAX_HEIGHT_FRACTION = 0.81;

// Where the horizon sits, as a fraction of canvas height. 1 is the canvas's
// bottom edge; the component overrides this per layout with the visible height.
const DEFAULT_BASELINE = 1;

// How far the whole matrix is lifted while the reveal eases in (see the
// `reveal` render option). Small — a settle, not a slide.
const REVEAL_RISE_PX = 18;

// ---- glow -------------------------------------------------------------

// The glow is a downscaled second pass, not per-dot shadowBlur — drawing the
// dots once into a 1/4-scale buffer and letting the upscale's own bilinear
// smoothing do most of the spreading costs a 16th of the pixels. Two additive
// passes at different radii: a tight hot one and a wide low-alpha one doing
// atmosphere.
const GLOW_SCALE = 4;
const GLOW_BLUR_PX = 2;
const GLOW_WIDE_BLUR_PX = 6;
const GLOW_WIDE_SHARE = 0.34;

// ---- text safe zones -------------------------------------------------
//
// Rectangles, measured from live DOM by the component, whose alpha is knocked
// back after the dots and their glow are drawn. The falloff is a VERTICAL
// gradient sampled along a smoothstep; the buffer is at 1/4 so the ramp is
// smooth. Full-width bands (D26) so the only edge is the vertical one.
const MASK_SCALE = 4;
const MASK_FEATHER_PX = 96;
const MASK_RAMP_STOPS = 8;

// How many points along the scheme's column ramp to pre-sample into a LUT. 32
// is well below what reads as banding across the widest hero, and it is a few
// dozen colour mixes rebuilt only on a theme flip, a resize, or the ~1.4s of a
// track-change crossfade — never otherwise per frame.
const TONE_SAMPLES = 32;

const MAX_DPR = 2;

const TAU = Math.PI * 2;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function rgba([r, g, b], a) {
    return `rgba(${Math.round(clamp(r, 0, 1) * 255)}, ${Math.round(clamp(g, 0, 1) * 255)}, `
        + `${Math.round(clamp(b, 0, 1) * 255)}, ${a})`;
}

function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * A fixed, non-animated column profile for reduced motion.
 *
 * Deterministic — the same index always gives the same height — so it is a
 * skyline rather than a block, and it is identical on every load. The sine
 * gives it a centre mass; the hashed jitter keeps it from reading as a
 * mathematical arch.
 */
function staticProfile(i, n) {
    const arch = Math.sin((Math.PI * (i + 0.5)) / n) ** 0.7;
    const hash = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
    return clamp(0.18 + arch * 0.42 + hash * 0.14, 0, 1);
}

export function createSkyline(canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return null;

    // ctx.filter landed in Safari 17 and is a silent no-op before that: the
    // assignment is simply ignored, so the glow degrades to the upscale's own
    // smoothing rather than throwing.
    const filterSupported = (() => {
        try {
            ctx.filter = "blur(1px)";
            const ok = ctx.filter !== "none";
            ctx.filter = "none";
            return ok;
        } catch { return false; }
    })();

    const glowCanvas = document.createElement("canvas");
    const glowCtx = glowCanvas.getContext("2d", { alpha: true });

    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d", { alpha: true });
    let safeZones = [];

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let columns = COLUMNS_MIN;

    let raw = new Float32Array(0);       // this frame's gained bucket values
    let displayed = new Float32Array(0); // post-ballistics heights, 0..1
    let tilt = new Float32Array(0);      // per-column spectral-tilt offset

    // Column -> FFT bin mapping, rebuilt when the geometry or the analyser's
    // parameters change. Fractional on purpose (see sample()).
    let binLo = new Float32Array(0);
    let binHi = new Float32Array(0);
    let mappedFor = null; // `${columns}:${fftSize}:${sampleRate}`

    let loudRef = LOUD_FLOOR;
    let quietRef = 0;
    let frames = 0;

    // The scheme's column ramp, pre-sampled into TONE_SAMPLES entries of
    // { foot, body, tip }. Rebuilt on a theme flip, a resize, or while a
    // track-change crossfade is in flight — never otherwise per frame.
    let toneLut = [];
    let toneKey = null;
    let frozen = false;

    function rebuildBuffers(next) {
        if (next === columns && raw.length === columns) return;
        const previous = displayed;
        columns = next;
        raw = new Float32Array(columns);
        displayed = new Float32Array(columns);
        tilt = new Float32Array(columns);
        for (let i = 0; i < columns; i++) {
            tilt[i] = TILT_TOP * (columns > 1 ? i / (columns - 1) : 0);
        }
        // Resample the old heights rather than dropping to zero: a resize
        // mid-track should not blink the spectrum out.
        if (previous.length > 1) {
            for (let i = 0; i < columns; i++) {
                const t = (i / Math.max(1, columns - 1)) * (previous.length - 1);
                const lo = Math.floor(t);
                const hi = Math.min(previous.length - 1, lo + 1);
                displayed[i] = previous[lo] + (previous[hi] - previous[lo]) * (t - lo);
            }
        }
        mappedFor = null;
        toneKey = null;
    }

    /**
     * Log-spaced column edges, resolved to FRACTIONAL bin indices.
     *
     * Fractional matters. A linear FFT gives evenly spaced bins, and the low
     * columns of a log scale are each narrower than one bin — so integer
     * indexing makes several adjacent columns read the exact same bin and the
     * bass end becomes a flat plateau. Interpolating within a bin gives those
     * columns distinct values (see sample()).
     */
    function rebuildMapping(fftSize, sampleRate) {
        const key = `${columns}:${fftSize}:${sampleRate}`;
        if (key === mappedFor) return;
        mappedFor = key;
        binLo = new Float32Array(columns);
        binHi = new Float32Array(columns);
        const binWidth = sampleRate / fftSize;
        const ratio = FREQ_MAX / FREQ_MIN;
        for (let i = 0; i < columns; i++) {
            const f0 = FREQ_MIN * ratio ** (i / columns);
            const f1 = FREQ_MIN * ratio ** ((i + 1) / columns);
            binLo[i] = f0 / binWidth;
            binHi[i] = f1 / binWidth;
        }
    }

    const api = {
        /** CSS pixels in, backing store sized by dpr. Returns true if it changed. */
        resize(cssWidth, cssHeight, dpr = window.devicePixelRatio || 1) {
            const ratio = Math.min(dpr, MAX_DPR);
            const w = Math.max(1, Math.round(cssWidth));
            const h = Math.max(1, Math.round(cssHeight));
            if (w === width && h === height && ratio === pixelRatio) return false;

            width = w;
            height = h;
            pixelRatio = ratio;
            canvas.width = Math.round(w * ratio);
            canvas.height = Math.round(h * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

            glowCanvas.width = Math.max(1, Math.round((w * ratio) / GLOW_SCALE));
            glowCanvas.height = Math.max(1, Math.round((h * ratio) / GLOW_SCALE));
            maskCanvas.width = Math.max(1, Math.round((w * ratio) / MASK_SCALE));
            maskCanvas.height = Math.max(1, Math.round((h * ratio) / MASK_SCALE));

            rebuildBuffers(clamp(Math.round(w / CELL_PX), COLUMNS_MIN, COLUMNS_MAX));
            toneKey = null;
            return true;
        },

        /**
         * Reads the analyser into `raw`, log-bucketed and auto-gained.
         *
         * `bins` is passed in rather than allocated here so the caller can keep
         * one buffer for the life of the loop.
         */
        sample(analyser, bins) {
            if (!analyser) { raw.fill(0); return 0; }
            rebuildMapping(analyser.fftSize, analyser.context.sampleRate);
            analyser.getByteFrequencyData(bins);

            const limit = bins.length - 1;
            let loudest = 0;
            let quietest = 1;

            for (let i = 0; i < columns; i++) {
                const lo = binLo[i];
                const hi = binHi[i];
                let value;

                if (hi - lo < 1) {
                    // Narrower than one bin: interpolate at the centre, so
                    // adjacent sub-bin columns differ instead of plateauing.
                    const centre = clamp((lo + hi) / 2, 0, limit);
                    const a = Math.floor(centre);
                    const b = Math.min(limit, a + 1);
                    value = bins[a] + (bins[b] - bins[a]) * (centre - a);
                } else {
                    // Wider than one bin: take the MAX, not the mean. A high
                    // column spans dozens of bins and averaging buries a
                    // cymbal in the silence either side of it.
                    let peak = 0;
                    const from = clamp(Math.floor(lo), 0, limit);
                    const to = clamp(Math.ceil(hi), 0, limit);
                    for (let b = from; b <= to; b++) if (bins[b] > peak) peak = bins[b];
                    value = peak;
                }

                const level = clamp(value / 255 + tilt[i], 0, 1);
                raw[i] = level;
                if (level > loudest) loudest = level;
                if (level < quietest) quietest = level;
            }

            // Global span normalisation, applied after bucketing so the SHAPE
            // survives: one affine map applied identically to all columns.
            loudRef = loudest > loudRef
                ? loudest
                : Math.max(LOUD_FLOOR, loudRef * LOUD_RELEASE);
            quietRef = quietest < quietRef
                ? quietest
                : Math.min(loudRef, quietRef + (1 - QUIET_RELEASE));

            const span = Math.max(loudRef - quietRef, MIN_SPAN);
            for (let i = 0; i < columns; i++) {
                raw[i] = clamp((raw[i] - quietRef) / span, 0, 1) ** RESPONSE_GAMMA;
            }

            return loudest;
        },

        /** Zeroes the incoming values, so `advance` becomes a pure release. */
        silence() { raw.fill(0); },

        /** Attack-fast, release-slow. Frame-rate independent by construction. */
        advance(dt) {
            if (frozen) return;
            const keep = Math.exp(-Math.max(dt, 0) / RELEASE_TAU);
            for (let i = 0; i < columns; i++) {
                const target = raw[i];
                const current = displayed[i];
                displayed[i] = target > current
                    ? target
                    : target + (current - target) * keep;
            }
        },

        /** Loads the fixed reduced-motion profile. No animation follows it. */
        loadStaticProfile() {
            for (let i = 0; i < columns; i++) displayed[i] = staticProfile(i, columns);
            raw.set(displayed);
        },

        /**
         * Draws one frame.
         *
         * `scheme` is `hero-palette.js`'s `schemeState(theme)` — `{ version,
         * fading, toneAt(u) }`. `reveal` (0..1) fades and lifts the whole
         * matrix on play / settle; the component eases it.
         */
        render(scheme, {
            additiveGlow = true, glowAlpha = 0.85, reveal = 1,
            baseline = DEFAULT_BASELINE, maxHeightFraction = MAX_HEIGHT_FRACTION,
        } = {}) {
            if (width === 0 || height === 0) return;

            const revealAlpha = clamp(reveal, 0, 1);
            const baseY = height * clamp(baseline, 0.2, 1);
            const bandH = baseY * clamp(maxHeightFraction, 0.1, 1);

            const cell = width / columns;
            const rows = Math.max(3, Math.floor(bandH / cell));
            const dotR = Math.max(1, cell * DOT_RADIUS_RATIO);
            const rise = (1 - revealAlpha) * REVEAL_RISE_PX;

            // Pre-sample the scheme's column ramp. Rebuilt only when the theme
            // solve changes, the geometry changes, or a crossfade is running.
            const key = `${scheme.version}|${columns}`;
            if (key !== toneKey || scheme.fading || toneLut.length !== TONE_SAMPLES) {
                toneKey = key;
                toneLut = new Array(TONE_SAMPLES);
                for (let s = 0; s < TONE_SAMPLES; s++) {
                    toneLut[s] = scheme.toneAt(s / (TONE_SAMPLES - 1));
                }
            }
            const toneFor = (u) => toneLut[Math.round(clamp(u, 0, 1) * (TONE_SAMPLES - 1))];

            // One column of dots into whichever context, at scale 1/k.
            const paintDots = (target, k) => {
                for (let c = 0; c < columns; c++) {
                    const lit = Math.round(displayed[c] * rows);
                    if (lit <= 0) continue;
                    const tone = toneFor(columns > 1 ? c / (columns - 1) : 0.5);
                    const cx = (c + 0.5) * cell;
                    for (let r = 0; r < lit; r++) {
                        const t = lit > 1 ? r / (lit - 1) : 0.5; // 0 foot .. 1 tip
                        const colour = t < 0.5
                            ? mix(tone.foot, tone.body, t * 2)
                            : mix(tone.body, tone.tip, (t - 0.5) * 2);
                        const cy = baseY - (r + 0.5) * cell + rise;
                        target.beginPath();
                        target.arc(cx / k, cy / k, dotR / k, 0, TAU);
                        target.fillStyle = rgba(colour, 1);
                        target.fill();
                    }
                }
            };

            ctx.clearRect(0, 0, width, height);
            if (revealAlpha <= 0.001) { frames++; return; }

            // Glow first, into its own small surface.
            glowCtx.setTransform(1, 0, 0, 1, 0, 0);
            glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
            glowCtx.scale(pixelRatio, pixelRatio);
            paintDots(glowCtx, GLOW_SCALE);

            // Additive on a near-black page is what makes the tips bloom. On a
            // near-white one it does the opposite, so light theme composites
            // the halo normally instead.
            const haloPass = (blurPx, alpha) => {
                if (alpha <= 0) return;
                ctx.save();
                ctx.globalCompositeOperation = additiveGlow ? "lighter" : "source-over";
                ctx.globalAlpha = Math.min(1, alpha) * revealAlpha;
                if (filterSupported) ctx.filter = `blur(${blurPx}px)`;
                ctx.drawImage(glowCanvas, 0, 0, width, height);
                ctx.restore();
            };
            haloPass(GLOW_WIDE_BLUR_PX, glowAlpha * GLOW_WIDE_SHARE);
            haloPass(GLOW_BLUR_PX, glowAlpha);

            // Sharp dots.
            ctx.save();
            ctx.globalAlpha = revealAlpha;
            paintDots(ctx, 1);
            ctx.restore();

            // Text safe zones, applied LAST so they knock back the glow as well
            // as the dots — the glow is the half that was actually reaching the
            // tagline.
            if (safeZones.length) {
                maskCtx.setTransform(1, 0, 0, 1, 0, 0);
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                maskCtx.scale(pixelRatio / MASK_SCALE, pixelRatio / MASK_SCALE);
                for (const z of safeZones) {
                    const strength = clamp(z.strength, 0, 1) * revealAlpha;
                    if (strength <= 0) continue;
                    const feather = z.feather ?? MASK_FEATHER_PX;
                    const y0 = z.y - feather;
                    const total = z.h + feather * 2;
                    const rampFrac = feather / total;
                    const g = maskCtx.createLinearGradient(0, y0, 0, y0 + total);
                    for (let s = 0; s <= MASK_RAMP_STOPS; s++) {
                        const t = s / MASK_RAMP_STOPS;
                        const a = strength * (t * t * (3 - 2 * t)); // smoothstep
                        g.addColorStop(rampFrac * t, `rgba(255,255,255,${a})`);
                        g.addColorStop(1 - rampFrac * t, `rgba(255,255,255,${a})`);
                    }
                    maskCtx.fillStyle = g;
                    maskCtx.fillRect(z.x, y0, z.w, total);
                }
                ctx.save();
                ctx.globalCompositeOperation = "destination-out";
                ctx.drawImage(maskCanvas, 0, 0, width, height);
                ctx.restore();
            }

            frames++;
        },

        /**
         * Rectangles to hold the canvas back behind, in CSS pixels relative to
         * the canvas's own box. `strength` is the fraction of alpha REMOVED.
         */
        setSafeZones(zones) {
            safeZones = Array.isArray(zones) ? zones : [];
        },

        clear() {
            ctx.clearRect(0, 0, width, height);
            glowCtx.setTransform(1, 0, 0, 1, 0, 0);
            glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
        },

        /** Resets ballistics and auto-gain — used when a new track starts. */
        reset() {
            displayed.fill(0);
            raw.fill(0);
            loudRef = LOUD_FLOOR;
            quietRef = 0;
        },

        /** Tallest displayed column, 0..1. The settle probe reads this. */
        peak() {
            let max = 0;
            for (let i = 0; i < columns; i++) if (displayed[i] > max) max = displayed[i];
            return max;
        },

        dispose() {
            glowCanvas.width = 0;
            glowCanvas.height = 0;
            maskCanvas.width = 0;
            maskCanvas.height = 0;
        },

    };

    // Introspection, for the measurement harness only — `defineProperties`
    // inside a dead-code-eliminable `if`, never spread (spreading an object of
    // getters invokes them once and freezes their values).
    if (import.meta.env.DEV) {
        Object.defineProperties(api, {
            columnCount: { get: () => columns },
            frameCount: { get: () => frames },
            usesFilter: { get: () => filterSupported },
            heights: { get: () => Array.from(displayed) },
            rawLevels: { get: () => Array.from(raw) },
            safeZones: { get: () => safeZones.map((z) => ({ ...z })) },
            toneLut: { get: () => toneLut.map((t) => ({ ...t })) },
            freezeHeights: { get: () => frozen, set: (v) => { frozen = !!v; } },
            gainReference: {
                get: () => ({ loud: loudRef, quiet: quietRef, span: Math.max(loudRef - quietRef, MIN_SPAN) }),
            },
            columnEdgesHz: {
                get: () => {
                    const ratio = FREQ_MAX / FREQ_MIN;
                    return Array.from({ length: columns + 1 }, (_, i) => FREQ_MIN * ratio ** (i / columns));
                },
            },
            binRanges: {
                get: () => (binLo.length !== columns
                    ? []
                    : Array.from({ length: columns }, (_, i) => [binLo[i], binHi[i]])),
            },
        });
    }

    return api;
}
