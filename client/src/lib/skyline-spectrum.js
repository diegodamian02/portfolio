// A synthwave skyline spectrum, drawn on a 2D canvas.
//
// Framework-agnostic on purpose, same split the WebGL fluid used: this file
// owns bucketing, ballistics and drawing; `skyline-background.jsx` owns the
// RAF loop, the deck gating and the palette. Nothing here imports React and
// nothing here reads the deck.
//
// audioMotion-analyzer is the obvious reference for this effect and is NOT
// used or adapted: it is AGPL-3.0, and bundling that into a deployed site
// carries real copyleft obligations rather than an attribution line. Its
// TECHNIQUES — log frequency scale, attack/release ballistics, gradient fills
// — are textbook spectrum-analyser practice and are reimplemented here from
// first principles. Same posture as Stage 7a's: Navier-Stokes was fair game,
// Pavel Dobryakov's actual source was not.

// ---- bucketing --------------------------------------------------------------

// The band the columns span. 32 Hz is below the fundamental of almost any
// bass note that survives a lossy 30-second preview; 16 kHz is where an AAC
// preview's lowpass usually sits, and columns mapped above it would be dead
// width on every track.
const FREQ_MIN = 32;
const FREQ_MAX = 16000;

// Column count is derived from width rather than fixed, so a 390px phone does
// not get 44 three-pixel slivers. Bounds, not a formula, are what matter here:
// below ~20 it reads as blocky, above ~48 as noise.
const COLUMN_PX = 30;
const COLUMNS_MIN = 20;
const COLUMNS_MAX = 44;

// ---- ballistics -------------------------------------------------------------

// Release time constant, seconds. This is the whole answer to "it looked
// abrupt": a column's DISPLAYED height is its own state, and it only ever
// falls exponentially toward the incoming value.
//
// Expressed as a time constant and applied as exp(-dt / TAU) rather than as a
// per-frame multiplier, so a 120Hz display and a 60Hz display decay at the
// same rate in seconds. A bare `h *= 0.92` per frame is the common form and it
// is frame-rate dependent by construction.
const RELEASE_TAU = 0.34;

// Attack is instant by design (a new value above the displayed height is
// adopted outright), so a kick lands on the frame it happens. The analyser's
// own smoothingTimeConstant is what keeps that from being per-frame noise.

// ---- auto-gain --------------------------------------------------------------

// TWO references for the whole spectrum, not one, and not one per column.
//
// Per-column auto-gain is what Stage 7d's ribbons used, and it is wrong here:
// it normalises every column to its own history, so every column eventually
// reaches full height and the spectrum's SHAPE — the entire point of a
// skyline — is destroyed. Both references here are global, so the map they
// apply is affine and identical for every column; the shape survives exactly.
//
// Normalising against the PEAK ALONE is not enough either, and this is the
// measured part. `getByteFrequencyData` maps decibels linearly onto 0-255, and
// real music does not go near the bottom of that window: measured over three
// previews, per-octave peaks ran 234 down to 104 (Daft Punk), 189 to 43 (Norah
// Jones), 135 to 28 (Metallica). Dividing any of those by their own maximum
// leaves everything bunched in the top half — the first build measured column
// heights spanning 0.54 to 0.92, which draws as a solid block with a texture,
// not as a skyline.
//
// So the span is normalised, not the peak: a low reference as well as a high
// one, mapping [quiet, loud] onto [0, 1]. That is what lets a display use its
// full height on a quiet master and a loud one alike.
//
// Both move fast toward the signal and slowly away from it — a reference that
// chases its own signal as fast as it rises is not a reference (FINDINGS B55).
const LOUD_RELEASE = 0.9992;
const QUIET_RELEASE = 0.9988;
const LOUD_FLOOR = 0.18;

// Below this the spectrum is too flat to stretch — near-silence, or a single
// sustained tone. Stretching it anyway would gain noise up into a full-height
// skyline during a quiet passage.
//
// A guard, not a tuning knob: across five captured previews the measured span
// never fell below it, so it never bound and 0.26 vs 0.34 scored identically.
// It exists for the case the captures do not contain.
const MIN_SPAN = 0.26;

// Applied after normalisation. Above 1 it pushes mid-level columns DOWN,
// which widens the gap between a column carrying something and a column
// carrying almost nothing — the difference between a skyline and a hedge.
//
// Swept offline against captured analyser frames from five previews rather
// than tuned live: 167-189 frames per track replayed through this exact
// pipeline at 60 combinations of tilt x gamma x span. Scored on mean height
// near 0.45, per-frame spread, treble not stubbed, and — the one that stops
// this collapsing into a compressor — the loud track and the quiet track
// still differing from each other. Full table in STATUS.md.
const RESPONSE_GAMMA = 2.1;

// ---- spectral tilt ----------------------------------------------------------

// Music has systematically less energy the higher you look, and with columns
// spaced by pitch that shows up as the right-hand third of the hero being
// permanently short. Measured across three previews, the per-column mean fell
// monotonically end to end: 0.90 -> 0.21 (Daft Punk), 0.62 -> 0.10 (Norah
// Jones), and Metallica's peaked mid-scale and fell to 0.10.
//
// Added in normalised byte space, and BEFORE the span references see it, so
// they adapt to the tilted spectrum rather than fighting it. Columns are
// log-spaced uniformly, so a linear ramp across the column index IS a constant
// dB-per-octave slope — the standard analyser-display correction.
//
// Deliberately partial, and much smaller than the first attempt. Flattening
// the tilt completely also flattens the difference BETWEEN tracks, and a
// bass-heavy mix reading as bass-heavy is the thing the whole effect is for.
// 0.30 measured as an overcorrection: on a dense, heavily-compressed master
// (Daft Punk) it lifted the whole spectrum into the top of the range — mean
// height 0.81 with only 0.46 of per-frame spread, which draws as a tall block.
// 0.14 keeps the treble off the floor without erasing the slope.
const TILT_TOP = 0.14;

// ---- geometry ---------------------------------------------------------------

// Fraction of the distance from the horizon to the top of the canvas that the
// tallest possible column reaches. A hard bound, not a tendency.
//
// This is only the FALLBACK. The component overrides it with a value derived
// from the live navbar box (see `maxHeightFraction` in render()), because the
// thing the ceiling actually has to clear is the nav links, and their position
// is a measured constant on this site rather than a fraction anyone can name.
//
// 0.62 shipped in the rebuild and was too low: on desktop the tallest possible
// column topped out 342px down a 900px window, and because a column only
// reaches the ceiling on a peak, the *typical* tallest column sat nearer 450px
// — "almost at the middle", which is exactly what it looked like.
const MAX_HEIGHT_FRACTION = 0.81;

// Where the horizon sits, as a fraction of canvas height. 1 puts it on the
// canvas's bottom edge, which is the obvious default and measured wrong: the
// hero is 1080px tall against a 900px window, its bottom 340px hold nothing but
// padding, and 180px of that is below the fold. Columns then rise from a
// horizon nobody can see and appear to run off the bottom of the screen. The
// component overrides this per layout with the visible height.
const DEFAULT_BASELINE = 1;

// Every column is drawn at least this tall while playing, so the skyline is a
// continuous horizon rather than a row of gaps with three bars in it.
const MIN_HEIGHT_FRACTION = 0.012;

// Widened in 7.1. The gap is not empty space, it is the thing that makes the
// columns read as separate objects — and it has to survive the glow bleeding
// into it from both sides, which at 0.16 it did not.
const GAP_RATIO = 0.22;
const CORNER_RATIO = 0.42;

// ---- glow -------------------------------------------------------------------

// The glow is a downscaled second pass, not per-bar shadowBlur.
//
// shadowBlur re-blurs every bar independently every frame — 44 separate blur
// operations, and the cost scales with the blur radius squared. Drawing the
// same bars once into a canvas at 1/6 scale and letting the upscale's own
// bilinear smoothing do most of the spreading costs a 36th of the pixels, and
// the `filter` blur that sharpens it is applied to that small surface rather
// than to the full-resolution hero. Measured comparison in STATUS.md.
// 1/4, not 1/6. The upscale's own bilinear smoothing IS part of the blur, and
// at 1/6 it contributes about six CSS pixels before `filter` adds anything —
// which, on a 27px-wide column with a 7px gap, is already enough to close the
// gap. A tighter buffer is the difference between a neon line and a wash.
const GLOW_SCALE = 4;

// TWO additive passes, at different radii, rather than one.
//
// `globalAlpha` caps at 1, so with a single pass already at 0.9 there was no
// headroom left to make the glow stronger — the only lever was a brighter
// palette, which fights the move to saturated (and therefore darker) hues.
//
// The first attempt at this read as OPAQUE rather than bright: a 9px blur on a
// 1/6 buffer is a ~54px halo, so every column's glow reached its neighbours and
// the lower half of the hero filled in solid. The fix is not less glow but
// TIGHTER glow — a neon tube is a thin hot line with a close halo, and what
// makes it read as light rather than as paint is the dark gap beside it.
//
// The wide pass survives at low alpha, doing atmosphere rather than brightness.
const GLOW_BLUR_PX = 2;
const GLOW_WIDE_BLUR_PX = 6;
const GLOW_WIDE_SHARE = 0.34;

// A short bright cap at each column's own tip, in CSS pixels.
//
// This exists because of a real limitation in the shared-gradient design: every
// column samples ONE gradient spanning the full height range, which is what
// makes height map to colour — but it also means a column's own tip lands
// wherever its height happens to put it, and only a full-height column ever
// reaches the bright end. Short columns were all base colour, all the time.
//
// A cap drawn at each column's actual top gives every one of them the same
// crisp lit edge regardless of height. It is the one part of a spectrum
// analyser's look that cannot come out of a shared vertical ramp.
const TIP_CAP_PX = 3;
const TIP_CAP_ALPHA = 0.92;

// ---- text safe zones --------------------------------------------------------
//
// Rectangles, measured from live DOM by the component, whose alpha is knocked
// back after the columns and their glow are drawn.
//
// The first build of this stage claimed the geometry made a mask unnecessary —
// columns rise from the bottom edge to a hard ceiling, so they were supposed to
// stay clear of the type on their own. Measured, that was wrong twice over. The
// hero's tagline sits at 46% of the hero height and the record crate at 65%,
// both well inside the columns rather than above them; and the glow is
// composited with `lighter`, which adds ALPHA as well as light, so it lifts the
// canvas's opacity above the gradient's own wherever it spreads. Dark theme
// measured 1.55:1 on the tagline and 2.00:1 on the crate input before this.
//
// Each zone is drawn as a STACK of concentric rounded rects, not one rect.
//
// A single rect is plainly visible in the render — a rectangular panel of
// dimmed columns behind the headline and another behind the crate, reading as a
// bug rather than as depth. A downscaled buffer feathers by about one source
// texel, which is nowhere near enough: the eye finds a straight edge in a field
// of vertical bars instantly.
//
// An ellipse with a radial falloff was the next idea and it does not fit the
// shape of the problem: for a wide, short text line, an ellipse whose CORE
// still covers the text has to be about 2.4x the line's width, which swallows
// the hero.
//
// So the falloff is built by accumulation instead. MASK_STEPS rounded rects,
// each inset a little further, each at the per-layer alpha that composes to
// `strength` once all of them have landed — exactly, since n layers of alpha a
// compose to 1-(1-a)^n. The result is a ramp that follows the box's own shape
// and reaches zero MASK_FEATHER_PX outside it, with no edge anywhere.
const MASK_SCALE = 8;
// Widened from 64 in 7.1. The zones are full-width bands now, so the only edge
// left is the vertical one, and a longer ramp is what keeps it from reading as
// a horizontal line across the columns.
const MASK_FEATHER_PX = 96;
const MASK_STEPS = 7;

// ---- gradient stops ---------------------------------------------------------
//
// Offsets run 0 at the TOP of the tallest possible column to 1 at the
// baseline, and every column samples the same gradient — so height maps to
// colour by construction: a short column is all base, a tall one runs the
// whole ramp and its tip is the bright peak hue.
//
// The alpha ramp is doing two jobs at once. It is the ethereal fade a
// synthwave tip wants, AND it is the reason hero type stays legible: the part
// of a column nearest the text is the part that is nearly transparent, so the
// contrast problem is solved by the same shape that makes it look right,
// rather than by a separate mask (which is what the fluid needed).
// The peak alpha is deliberately well short of opaque. At 0.96 the columns read
// as a solid wall of colour across the lower half of the hero rather than as
// light, and every text zone then needed a mask strong enough to be visible as
// a dark smudge in its own right. Backing the whole ramp off does more for
// legibility than any mask does, and it is the change that makes the field look
// like a glow instead of a bar chart.
// Backed off again in 7.1, and further than the rebuild's own reduction. The
// columns are much taller now, so the same alpha covers far more of the hero
// and the field read as a solid pane of colour rather than as light. Neon is
// LOW coverage at HIGH contrast; the body of a tube is dim and the edge is what
// burns. The tip cap above supplies the burn, which is what makes it safe for
// the body to be this transparent.
const STOPS = [
    { at: 0.00, colour: "peak", alpha: 0.00 },
    { at: 0.20, colour: "peak", alpha: 0.22 },
    { at: 0.52, colour: "mid", alpha: 0.34 },
    { at: 0.82, colour: "base", alpha: 0.44 },
    { at: 1.00, colour: "base", alpha: 0.50 },
];

// ---- the travelling wave ----------------------------------------------------
//
// The palette module owns the wave's shape; this owns making it cheap.
//
// Every column now samples the ring at its own position, so a single shared
// gradient no longer works. Building one gradient per column per frame would be
// 44 `createLinearGradient` calls plus ~220 `addColorStop`s every frame, in both
// the main and the glow context.
//
// Instead the ring is TILED once into a fixed set of gradients, at positions
// that never move. The wave then travels by each column picking a different
// bucket, which costs an add, a multiply and a floor. Rebuilt only when the
// solved colours change (a theme flip) or the geometry does (a resize).
//
// 24 buckets per palette entry puts each step at ~1/24th of the distance
// between two authored hues — far below what is visible as banding, and 168
// gradient objects total for a seven-entry ring.
const BUCKETS_PER_ENTRY = 24;

const MAX_DPR = 2;

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
    // smoothing rather than throwing. Detected rather than assumed so the
    // measurement harness can report which path a browser actually took.
    const filterSupported = (() => {
        try {
            ctx.filter = "blur(1px)";
            const ok = ctx.filter !== "none";
            ctx.filter = "none";
            return ok;
        } catch { return false; }
    })();

    const roundRectSupported = typeof ctx.roundRect === "function";

    const glowCanvas = document.createElement("canvas");
    const glowCtx = glowCanvas.getContext("2d", { alpha: true });

    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d", { alpha: true });
    let safeZones = [];

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let columns = COLUMNS_MIN;

    let raw = new Float32Array(0);      // this frame's gained bucket values
    let displayed = new Float32Array(0); // post-ballistics heights, 0..1
    let tilt = new Float32Array(0);     // per-column spectral-tilt offset

    // Column -> FFT bin mapping, rebuilt when the geometry or the analyser's
    // parameters change. Fractional on purpose (see sample()).
    let binLo = new Float32Array(0);
    let binHi = new Float32Array(0);
    let mappedFor = null; // `${columns}:${fftSize}:${sampleRate}`

    let loudRef = LOUD_FLOOR;
    let quietRef = 0;
    let frames = 0;

    // One gradient per ring bucket, tiling the whole palette — see
    // BUCKETS_PER_ENTRY. Rebuilt on a theme flip or a resize, never per frame.
    let gradients = [];
    let glowGradients = [];
    let caps = [];
    let gradientKey = null;
    let frozen = false;
    // Column -> bucket, rebound each render because it closes over the wave's
    // current position. Exposed for the harness so the travel can be traced
    // without re-deriving the mapping.
    let bucketOf = () => 0;

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
        // mid-track should not blink the skyline out.
        if (previous.length > 1) {
            for (let i = 0; i < columns; i++) {
                const t = (i / Math.max(1, columns - 1)) * (previous.length - 1);
                const lo = Math.floor(t);
                const hi = Math.min(previous.length - 1, lo + 1);
                displayed[i] = previous[lo] + (previous[hi] - previous[lo]) * (t - lo);
            }
        }
        mappedFor = null;
        gradientKey = null;
    }

    /**
     * Log-spaced column edges, resolved to FRACTIONAL bin indices.
     *
     * Fractional matters. A linear FFT gives evenly spaced bins, and the low
     * columns of a log scale are each narrower than one bin — so integer
     * indexing makes several adjacent columns read the exact same bin and the
     * bass end of the skyline becomes a flat plateau. Interpolating within a
     * bin gives those columns distinct values (see sample()).
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

            rebuildBuffers(clamp(Math.round(w / COLUMN_PX), COLUMNS_MIN, COLUMNS_MAX));
            gradientKey = null;
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
            // survives: this is one affine map applied identically to all
            // columns, not a per-column rescale.
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
            // Only ever true in development — the setter is behind the DEV
            // block below, so production has no way to reach it. It exists
            // because a still of a travelling colour wave is unreadable when
            // the bars are also moving: freezing the heights isolates the one
            // variable the screenshots are meant to show.
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

        render(wave, {
            additiveGlow = true, glowAlpha = 0.85, scale = 1, baseline = DEFAULT_BASELINE,
            maxHeightFraction = MAX_HEIGHT_FRACTION, alphaScale = 1,
        } = {}) {
            if (width === 0 || height === 0) return;

            const baseY = height * clamp(baseline, 0.2, 1);
            const maxBar = baseY * clamp(maxHeightFraction, 0.1, 1) * scale;
            const top = baseY - maxBar;

            const buckets = wave.ringSize * BUCKETS_PER_ENTRY;
            const key = `${wave.version}|${maxBar}|${baseY}|${alphaScale}`;

            if (key !== gradientKey) {
                gradientKey = key;
                gradients = new Array(buckets);
                glowGradients = new Array(buckets);
                caps = new Array(buckets);
                for (let b = 0; b < buckets; b++) {
                    const { base, peak } = wave.sample(b / BUCKETS_PER_ENTRY);
                    const pick = { base, mid: mix(base, peak, 0.5), peak };
                    const g = ctx.createLinearGradient(0, top, 0, baseY);
                    const gg = glowCtx.createLinearGradient(
                        0, top / GLOW_SCALE, 0, baseY / GLOW_SCALE,
                    );
                    for (const stop of STOPS) {
                        const colour = rgba(pick[stop.colour], clamp(stop.alpha * alphaScale, 0, 1));
                        g.addColorStop(stop.at, colour);
                        gg.addColorStop(stop.at, colour);
                    }
                    gradients[b] = g;
                    glowGradients[b] = gg;
                    caps[b] = rgba(peak, TIP_CAP_ALPHA);
                }
            }

            const slot = width / columns;
            const gap = slot * GAP_RATIO;
            const barWidth = Math.max(1, slot - gap);
            const minBar = baseY * MIN_HEIGHT_FRACTION;

            // Column -> bucket. The wave's whole visible behaviour is this one
            // line: the shared position moves with time, the per-column term
            // does not, so the pattern slides sideways.
            const spread = columns > 1 ? wave.span / (columns - 1) : 0;
            bucketOf = (i) => {
                const ring = wave.position + spread * i;
                const b = Math.round(ring * BUCKETS_PER_ENTRY);
                return ((b % buckets) + buckets) % buckets;
            };

            const capHeight = Math.max(1, TIP_CAP_PX);

            const paint = (target, k, ramps) => {
                for (let i = 0; i < columns; i++) {
                    const bucket = bucketOf(i);
                    const h = Math.max(minBar, displayed[i] * maxBar);
                    const x = (i * slot + gap / 2) / k;
                    const y = (baseY - h) / k;
                    const w = barWidth / k;
                    const bh = h / k;
                    const r = Math.min(w * CORNER_RATIO, bh / 2);

                    target.fillStyle = ramps[bucket];
                    target.beginPath();
                    if (roundRectSupported) target.roundRect(x, y, w, bh, [r, r, 0, 0]);
                    else target.rect(x, y, w, bh);
                    target.fill();

                    // The lit edge, at this column's own tip rather than at a
                    // fixed point on the shared ramp.
                    const ch = Math.min(capHeight / k, bh);
                    target.fillStyle = caps[bucket];
                    target.beginPath();
                    if (roundRectSupported) target.roundRect(x, y, w, ch, [r, r, 0, 0]);
                    else target.rect(x, y, w, ch);
                    target.fill();
                }
            };

            ctx.clearRect(0, 0, width, height);

            // Glow first, into its own small surface.
            glowCtx.setTransform(1, 0, 0, 1, 0, 0);
            glowCtx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
            glowCtx.scale(pixelRatio, pixelRatio);
            paint(glowCtx, GLOW_SCALE, glowGradients);

            // Additive on a near-black page is what makes the tips bloom. On a
            // near-white one it does the opposite — adding light moves the
            // glow TOWARD the background — so light theme composites the halo
            // normally instead.
            const haloPass = (blurPx, alpha) => {
                if (alpha <= 0) return;
                ctx.save();
                ctx.globalCompositeOperation = additiveGlow ? "lighter" : "source-over";
                ctx.globalAlpha = Math.min(1, alpha);
                if (filterSupported) ctx.filter = `blur(${blurPx}px)`;
                ctx.drawImage(glowCanvas, 0, 0, width, height);
                ctx.restore();
            };
            haloPass(GLOW_WIDE_BLUR_PX, glowAlpha * GLOW_WIDE_SHARE);
            haloPass(GLOW_BLUR_PX, glowAlpha);

            paint(ctx, 1, gradients);

            // Text safe zones, applied LAST so they knock back the glow as
            // well as the columns — the glow is the half that was actually
            // reaching the tagline.
            if (safeZones.length) {
                maskCtx.setTransform(1, 0, 0, 1, 0, 0);
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
                maskCtx.scale(pixelRatio / MASK_SCALE, pixelRatio / MASK_SCALE);
                for (const z of safeZones) {
                    const strength = clamp(z.strength, 0, 1);
                    if (strength <= 0) continue;
                    maskCtx.fillStyle =
                        `rgba(255,255,255,${1 - (1 - strength) ** (1 / MASK_STEPS)})`;
                    for (let k = 0; k < MASK_STEPS; k++) {
                        const grow = MASK_FEATHER_PX * (1 - k / MASK_STEPS);
                        const x = z.x - grow;
                        const y = z.y - grow;
                        const w = z.w + grow * 2;
                        const h = z.h + grow * 2;
                        maskCtx.beginPath();
                        if (roundRectSupported) {
                            maskCtx.roundRect(x, y, w, h, Math.min(w, h) / 2);
                        } else {
                            maskCtx.rect(x, y, w, h);
                        }
                        maskCtx.fill();
                    }
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

    // Introspection, for the measurement harness only — and defined with
    // `defineProperties` inside a dead-code-eliminable `if`, not written into
    // the literal above and not spread into it. Both alternatives are traps:
    //
    //   * Inline in the literal, a property is not tree-shakeable (a minifier
    //     cannot prove nothing reads it by name), so Stage 7d shipped
    //     `fieldStats`, `benchmark` and `setSolver` to production and the first
    //     build of this file shipped five of these getters.
    //   * Spread as `...(DEV ? { get x() {...} } : {})`, which is how 7d fixed
    //     that, the getters are INVOKED once by the spread and their values
    //     copied. They stop being live. It reads as working and reports a
    //     constant: `columnCount` sat at its construction-time 20 while the
    //     renderer was really drawing 44.
    //
    // An `if` statement is genuinely removed by the minifier, and the getters
    // inside it stay getters.
    if (import.meta.env.DEV) {
        Object.defineProperties(api, {
            columnCount: { get: () => columns },
            frameCount: { get: () => frames },
            usesFilter: { get: () => filterSupported },
            usesRoundRect: { get: () => roundRectSupported },
            heights: { get: () => Array.from(displayed) },
            rawLevels: { get: () => Array.from(raw) },
            safeZones: { get: () => safeZones.map((z) => ({ ...z })) },
            // The bucket each column is currently drawing with. Two frames of
            // this is the proof that the wave travels.
            columnBuckets: {
                get: () => Array.from({ length: columns }, (_, i) => bucketOf(i)),
            },
            bucketsPerEntry: { get: () => BUCKETS_PER_ENTRY },
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
            // Empty until the first sample(), since the mapping needs the
            // analyser's fftSize and sample rate to exist.
            binRanges: {
                get: () => (binLo.length !== columns
                    ? []
                    : Array.from({ length: columns }, (_, i) => [binLo[i], binHi[i]])),
            },
        });
    }

    return api;
}
