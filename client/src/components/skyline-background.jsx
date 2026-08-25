import { useEffect, useRef } from "react";
import { createSkyline } from "../lib/skyline-spectrum.js";
import { createPaletteCycle } from "../lib/palette-cycle.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import { DECK, onDeckState, getDeckState } from "../lib/deck-state.js";
import * as audio from "../lib/turntable-audio.js";

// The hero background: a neon skyline whose columns are the track's own
// spectrum.
//
// This REPLACES the WebGL2 fluid of Stages 7a-7d outright — solver, component
// and the `simplex-noise` dependency are deleted, not deprecated in place.
// What carried over is not code but three things that were expensive to learn
// and are still true here:
//
//   1. PRESENCE. The canvas is genuinely blank and the RAF loop genuinely
//      stopped whenever nothing is playing. This is the point of the whole
//      effect — it should not be an ambient texture a visitor stops noticing
//      before they ever press play.
//   2. SYNCHRONOUS reveal. Via deck-state.js, in the same tick as
//      audio.playCached(). Stage 1 measured what an effect costs here: 551ms.
//   3. A MEASURED settle rather than a guessed fade-out. Stop when the columns
//      are actually down, read off their real heights.
//
// Text legibility still needs an explicit mask, and it is worth saying why the
// obvious argument against one is wrong. Columns rise from the bottom edge to a
// hard ceiling and the gradient is most transparent at its top, which sounds
// like geometry doing the job for free. Measured, it does not: the tagline sits
// at 46% of the hero height and the crate at 65%, both INSIDE the columns
// rather than above them, and the glow composites with `lighter`, which adds
// alpha as well as light. Dark theme measured 1.55:1 on the tagline before the
// zones went in. They are cheaper than the fluid's were — three rectangles
// measured from the DOM, not a shader uniform — but they are not optional.

// ---- gating -----------------------------------------------------------------

// Hard ceiling on the settle window. With a 0.34s release constant a full-
// height column reaches 2% in about 1.3s, so this is a backstop against a
// pathological dt, not the mechanism — the probe below is.
const SETTLE_MAX_MS = 3000;
const SETTLE_PROBE_INTERVAL_MS = 120;
const SETTLE_HEIGHT_THRESHOLD = 0.015;

// Theme-dependent glow compositing — see skyline-spectrum.js's render().
// `alphaScale` multiplies the renderer's whole alpha ramp, and the two themes
// need genuinely different amounts of it.
//
// On a near-black page a translucent column still reads as light, because
// anything above the background is visible. On a near-white page the column has
// to be DARKER than the background to exist at all, and the same ramp that
// looks like neon on black looks like a watermark on white — measured, the
// light theme's columns faded out entirely above their lower third.
const THEME_RESPONSE = {
    dark: { additiveGlow: true, glowAlpha: 0.9, alphaScale: 1 },
    light: { additiveGlow: false, glowAlpha: 0.72, alphaScale: 1.5 },
};

const MAX_DPR = 2;

// How much alpha each text region gives up, and how far the zone extends past
// the element's own box.
//
// Three strengths rather than one, because the three elements sit at three
// depths in the gradient and one number strong enough for the deepest would
// dim the whole left half of the hero for no reason. The headline is near the
// top of the columns where they are already faint; the crate is two thirds of
// the way down where the gradient is close to opaque.
//
// The tagline gets its own zone rather than inheriting the headline's: it is
// `--secondary-text` at weight 300, so it starts with far less contrast in
// hand than the headline does, and at the headline's 0.45 it measured 3.35:1.
// That is a pass for 24px text under WCAG's large-text rule and still too thin
// for a light weight — so it is treated as normal text and held above 4.5:1.
// Every value here was solved against measured contrast; the table is in
// STATUS.md.
// Raised sharply in 7.1, and the reason is worth keeping: the rebuild's values
// were tuned against a ceiling of 0.62, where the headline sat near the
// TRANSPARENT top of the gradient and needed almost nothing. At 0.809 the same
// band of the hero carries full-height column bodies, their tip caps at alpha
// 0.92, and both additive glow passes.
//
// Measured at the new ceiling with the old strengths: dark headline 2.68:1 and
// tagline 2.62:1, from 12.62 and 5.29. The mask shape was still correct — its
// falloff and its coverage were fine — it was simply being asked to remove
// twice as much as before.
const HEADLINE_ZONE_STRENGTH = 0.8;
const TAGLINE_ZONE_STRENGTH = 0.78;
const CRATE_ZONE_STRENGTH = 0.6;
const ZONE_PAD_X = 26;
const ZONE_PAD_Y = 16;

// How much clear space to leave between the tallest possible column and the
// bottom of the navbar.
//
// The ceiling is derived from the navbar rather than being a fraction, because
// the nav links are the one thing in the hero the columns must never reach:
// they sit above the horizon-anchored gradient's transparent end, so they get
// no protection from it, and they are deliberately outside the safe zones
// (measured at "never reached" through the whole rebuild). Every other element
// is protected by a zone; this one is protected by geometry.
const NAVBAR_CLEARANCE_PX = 28;
// Used only if the navbar cannot be measured — the renderer's own default.
const FALLBACK_MAX_HEIGHT_FRACTION = 0.81;

export default function SkylineBackground() {
    const canvasRef = useRef(null);
    const reduced = useReducedMotion();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const skyline = createSkyline(canvas);
        if (!skyline) {
            // No 2D context at all. Leave an empty transparent canvas rather
            // than throwing behind the hero.
            canvas.dataset.skylineState = "unsupported";
            return;
        }

        const host = canvas.parentElement;
        const cycle = createPaletteCycle();

        const themeName = () =>
            (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

        const dpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);

        /**
         * Where the horizon sits, as a fraction of the canvas height.
         *
         * The hero is taller than the window — 1080 against 900 on desktop,
         * 1004 against 844 on a phone — and everything below the crate is
         * padding. Anchoring the columns to the canvas's bottom edge puts the
         * horizon 180px below the fold, so the skyline reads as bars running
         * off the screen rather than as standing on anything.
         *
         * Derived from the window height, not from the canvas's CURRENT top:
         * the hero is the first section, so its document position is the top of
         * the page, and reading `getBoundingClientRect().top` would make the
         * horizon depend on where the visitor happened to be scrolled when the
         * last resize fired.
         */
        let baseline = 1;
        let maxHeightFraction = FALLBACK_MAX_HEIGHT_FRACTION;
        const measureBaseline = () => {
            const box = canvas.getBoundingClientRect();
            if (box.height === 0) return;
            baseline = Math.min(1, Math.max(0.4, window.innerHeight / box.height));

            // The ceiling, in the same units the renderer wants: a fraction of
            // the horizon's distance from the top of the canvas.
            const nav = document.querySelector(".navbar")?.getBoundingClientRect();
            const horizon = box.height * baseline;
            if (!nav || horizon <= 0) {
                maxHeightFraction = FALLBACK_MAX_HEIGHT_FRACTION;
                return;
            }
            const ceiling = nav.bottom - box.top + NAVBAR_CLEARANCE_PX;
            maxHeightFraction = Math.min(0.95, Math.max(0.3, (horizon - ceiling) / horizon));
        };

        /**
         * Text safe zones, measured from the live elements rather than
         * hardcoded — the hero restacks completely on mobile (deck above
         * crate, everything centred), so any fixed fraction would be pointing
         * at empty space in one layout or straight through the type in the
         * other.
         */
        const measureSafeZones = () => {
            const box = canvas.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) return;
            // FULL-WIDTH bands, not boxes around the text.
            //
            // A box has left and right edges, and at the strength the taller
            // columns now need (0.8 against the rebuild's 0.34) those edges are
            // plainly visible: a soft oval of dimmed columns sitting behind the
            // headline, with brighter columns either side of it. Reading as a
            // smudge is exactly what this is supposed to avoid.
            //
            // Extending every zone across the whole canvas leaves only the
            // VERTICAL falloff, which has no shape to notice — it reads as
            // atmospheric haze at that height rather than as a hole around the
            // type. It costs a little brightness on the right-hand side, where
            // the deck sits on top of the columns anyway.
            const toZone = (rect, strength) => ({
                x: -ZONE_PAD_X,
                y: rect.top - box.top - ZONE_PAD_Y,
                w: box.width + ZONE_PAD_X * 2,
                h: rect.height + ZONE_PAD_Y * 2,
                strength,
            });
            const zones = [];
            const name = host?.querySelector(".hero-name")?.getBoundingClientRect();
            if (name) zones.push(toZone(name, HEADLINE_ZONE_STRENGTH));
            const tagline = host?.querySelector(".hero-tagline")?.getBoundingClientRect();
            if (tagline) zones.push(toZone(tagline, TAGLINE_ZONE_STRENGTH));
            // The crate's own box collapses to the input row when the results
            // panel is closed, so measure the row and let the pad cover the
            // rest — a zone sized to an open panel would be a hole in the
            // skyline most of the time.
            const crate = host?.querySelector(".record-crate-input-row")?.getBoundingClientRect();
            if (crate) zones.push(toZone(crate, CRATE_ZONE_STRENGTH));
            skyline.setSafeZones(zones);
        };

        const sizeToHost = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const changed = skyline.resize(rect.width, rect.height, dpr());
            measureBaseline();
            measureSafeZones();
            return changed;
        };
        sizeToHost();

        const paint = (waveAtMs) => {
            const theme = themeName();
            skyline.render(
                cycle.waveState(theme, waveAtMs),
                { ...THEME_RESPONSE[theme], baseline, maxHeightFraction },
            );
        };

        // ---- reduced motion ---------------------------------------------------
        //
        // Exactly one static frame, drawn the moment PLAYING starts and cleared
        // the moment it ends. No RAF loop is ever created on this branch — not
        // a loop that runs once, none at all — so there is nothing that could
        // later start animating.
        if (reduced) {
            let staticPlaying = getDeckState() === DECK.PLAYING;

            const drawStatic = () => {
                if (!staticPlaying) {
                    skyline.clear();
                    canvas.dataset.skylineState = "static-idle";
                    return;
                }
                sizeToHost();
                skyline.loadStaticProfile();
                // The wave is sampled at t=0 — a FIXED REFERENCE STATE, not a
                // frozen instant of the live animation.
                //
                // Both were on the table. A frozen instant would show whatever
                // phase the wave happened to be in when the visitor pressed
                // play, so the one frame a reduced-motion visitor ever sees
                // would depend on timing they cannot perceive or repeat.
                //
                // The SPATIAL half of the wave is fully present: columns still
                // sample different points on the ring by index, so the static
                // frame carries the same colour band across the skyline that
                // the animated one does. Only the travel is removed, which is
                // the part that is motion. Verified: the per-column bucket
                // DELTAS are byte-identical across two cold loads.
                //
                // What still varies between visits is the palette's own
                // starting position, which is seeded from the clock and has
                // been since 7c so that a first visit is not always mint. That
                // is deliberate and unrelated to motion — a reduced-motion
                // visitor sees the same hue everyone else would that session,
                // just not moving.
                paint(0);
                canvas.dataset.skylineState = "static-playing";
            };

            const offDeckStatic = onDeckState((next, previous) => {
                if (next === DECK.PLAYING) {
                    cycle.advanceTo(audio.getState().trackId);
                    staticPlaying = true;
                    drawStatic();
                } else if (previous === DECK.PLAYING) {
                    staticPlaying = false;
                    drawStatic();
                }
            });

            const onResizeStatic = () => drawStatic();
            const staticTheme = new MutationObserver(() => {
                cycle.invalidate();
                drawStatic();
            });
            staticTheme.observe(document.documentElement, {
                attributes: true, attributeFilter: ["data-theme"],
            });
            window.addEventListener("resize", onResizeStatic);
            drawStatic();

            if (import.meta.env.DEV) {
                window.__skylineDebug = {
                    get state() { return canvas.dataset.skylineState; },
                    get reduced() { return true; },
                    get frames() { return skyline.frameCount; },
                    get columns() { return skyline.columnCount; },
                    get heights() { return skyline.heights; },
                    get palette() { return cycle.sample(themeName()); },
                    // The spatial half of the wave is present in the static
                    // frame; the travel is not. These are what prove it.
                    get columnBuckets() { return skyline.columnBuckets; },
                    get bucketsPerEntry() { return skyline.bucketsPerEntry; },
                    get maxHeightFraction() { return maxHeightFraction; },
                    get baseline() { return baseline; },
                };
            }

            return () => {
                offDeckStatic();
                staticTheme.disconnect();
                window.removeEventListener("resize", onResizeStatic);
                skyline.dispose();
                if (import.meta.env.DEV) delete window.__skylineDebug;
            };
        }

        // ---- gates -----------------------------------------------------------
        //
        // Three independent reasons to be stopped, deliberately not collapsed
        // into one boolean: they change from different events, and any one
        // alone must be enough to hold the loop down.
        let inView = true;
        let visible = document.visibilityState !== "hidden";
        let playing = getDeckState() === DECK.PLAYING;
        let settleUntil = 0;

        let rafId = null;
        let lastTime = performance.now();
        let lastProbeAt = 0;

        // fftSize/2 — sized once the analyser exists, since fftSize is fixed
        // for the life of the node.
        let bins = null;
        const binsFor = (analyser) => {
            if (!bins || bins.length !== analyser.frequencyBinCount) {
                bins = new Uint8Array(analyser.frequencyBinCount);
            }
            return bins;
        };

        const shouldRun = () => (inView && visible) && (playing || performance.now() < settleUntil);

        const frame = (now) => {
            rafId = requestAnimationFrame(frame);
            const dt = (now - lastTime) / 1000;
            lastTime = now;

            if (playing) {
                const analyser = audio.getAnalyser();
                if (analyser) skyline.sample(analyser, binsFor(analyser));
                else skyline.silence();
            } else {
                // Settling: nothing new goes in, and the columns fall by their
                // own release ballistics rather than by a separate fade. Probed
                // on real heights instead of guessing at the exponential tail.
                skyline.silence();
                if (now >= lastProbeAt + SETTLE_PROBE_INTERVAL_MS) {
                    lastProbeAt = now;
                    if (skyline.peak() < SETTLE_HEIGHT_THRESHOLD) settleUntil = 0;
                }
            }

            skyline.advance(dt);
            paint();

            if (!shouldRun()) sync();
        };

        function sync() {
            const run = shouldRun();
            if (run && rafId === null) {
                // Reset the clock on resume. Without this the first frame back
                // from a hidden tab gets a dt of however long the tab was away,
                // which would collapse the entire release in one step.
                lastTime = performance.now();
                lastProbeAt = lastTime;
                rafId = requestAnimationFrame(frame);
            } else if (!run) {
                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                // Clear on EVERY stop, not only when a settle completes.
                //
                // Cancelling the loop leaves whatever was last drawn sitting on
                // the canvas, and the two gates that can close mid-playback —
                // scrolling the hero away, hiding the tab — would then leave a
                // full-height skyline frozen there, waiting to be seen for one
                // tick when the visitor comes back. Measured: hiding the tab
                // left 2,364,869 lit pixels behind before this.
                skyline.clear();
            }
            canvas.dataset.skylineState = run
                ? (playing ? "playing" : "settling")
                : "idle";
        }

        // ---- deck coupling ----------------------------------------------------
        //
        // Synchronous, via deck-state.js — NOT an effect watching a prop. At the
        // needle-contact call site this handler runs in the same tick as
        // audio.playCached(), which is the entire reason that function exists.
        const offDeck = onDeckState((next, previous) => {
            if (next === DECK.PLAYING) {
                // Read the track id from the audio module, not a prop: this
                // handler runs inside playCached()'s own tick and getState() is
                // already current, where a prop would be a render behind.
                cycle.advanceTo(audio.getState().trackId);
                playing = true;
                settleUntil = 0;
                // A fresh track gets fresh ballistics and a fresh auto-gain
                // reference — otherwise the first seconds of a quiet preview
                // inherit a loud one's normalisation, and vice versa.
                if (previous !== DECK.PAUSED) skyline.reset();
                sizeToHost();
                sync();
            } else if (previous === DECK.PLAYING) {
                playing = false;
                settleUntil = performance.now() + SETTLE_MAX_MS;
                lastProbeAt = performance.now();
                sync();
            }
        });

        const onVisibility = () => {
            visible = document.visibilityState !== "hidden";
            sync();
        };
        document.addEventListener("visibilitychange", onVisibility);

        // Observes the hero SECTION rather than the canvas: the same box today,
        // but the section is the thing whose visibility actually means "the
        // visitor is looking at the hero".
        const observer = new IntersectionObserver(
            ([entry]) => { inView = entry.isIntersecting; sync(); },
            { threshold: 0 },
        );
        if (host) observer.observe(host);

        // The theme can change mid-track. The cycle caches its solve per theme,
        // so the cache has to be dropped explicitly; a settled canvas also has
        // to be repainted, since no frame is coming to do it.
        const themeObserver = new MutationObserver(() => {
            cycle.invalidate();
            if (rafId === null && canvas.dataset.skylineState !== "idle") paint();
        });
        themeObserver.observe(document.documentElement, {
            attributes: true, attributeFilter: ["data-theme"],
        });

        // Repaint unconditionally rather than only when sizeToHost() reports a
        // change: it reports on the BACKING STORE, and the safe zones can move
        // without it — the hero restacking at a breakpoint moves the crate
        // several hundred pixels at a constant canvas size.
        const onResize = () => {
            sizeToHost();
            if (rafId === null && playing) paint();
        };
        window.addEventListener("resize", onResize);

        // If a track is somehow already playing when this mounts (a remount
        // mid-playback — the `reduced` dependency flipping, say), pick it up
        // rather than waiting for a transition that may never come.
        if (playing) cycle.advanceTo(audio.getState().trackId);
        sync();

        if (import.meta.env.DEV) {
            window.__skylineDebug = {
                get state() { return canvas.dataset.skylineState; },
                get reduced() { return false; },
                get running() { return rafId !== null; },
                get frames() { return skyline.frameCount; },
                get columns() { return skyline.columnCount; },
                get heights() { return skyline.heights; },
                get rawLevels() { return skyline.rawLevels; },
                get gainReference() { return skyline.gainReference; },
                get columnEdgesHz() { return skyline.columnEdgesHz; },
                get binRanges() { return skyline.binRanges; },
                get peak() { return skyline.peak(); },
                get safeZones() { return skyline.safeZones; },
                get usesFilter() { return skyline.usesFilter; },
                get usesRoundRect() { return skyline.usesRoundRect; },
                get theme() { return themeName(); },
                // The app's OWN audio module instance. Re-importing
                // turntable-audio.js from a harness can hand back a second,
                // uninitialised copy — Vite serves HMR-updated modules under a
                // `?t=` URL, and a bare dynamic import of the plain path is
                // then a different module. Reading it through here is the only
                // way a probe is guaranteed to see the instance that is
                // actually playing.
                get audioState() { return audio.getState(); },
                get analyser() { return audio.getAnalyser(); },
                get palette() { return cycle.sample(themeName()); },
                get paletteIndex() { return cycle.index; },
                get paletteTrackId() { return cycle.trackId; },
                get paletteSize() { return cycle.size; },
                get wave() { return cycle.wave; },
                get waveState() {
                    const w = cycle.waveState(themeName());
                    return { version: w.version, ringSize: w.ringSize, position: w.position, span: w.span };
                },
                get columnBuckets() { return skyline.columnBuckets; },
                set freezeHeights(v) { skyline.freezeHeights = v; },
                get freezeHeights() { return skyline.freezeHeights; },
                get bucketsPerEntry() { return skyline.bucketsPerEntry; },
                get maxHeightFraction() { return maxHeightFraction; },
                get baseline() { return baseline; },
                /** The ring position a given column is sampling, right now. */
                ringAt: (i) => {
                    const w = cycle.waveState(themeName());
                    const n = skyline.columnCount;
                    return w.position + (n > 1 ? (w.span / (n - 1)) * i : 0);
                },
                stopsAtRing: (position) => cycle.stopsAtRing(themeName(), position),
                solvedFor: (theme) => cycle.solvedFor(theme),
                setPalette: (i) => { cycle.setIndex(i); if (rafId === null) paint(); },
                paint,
            };
        }

        return () => {
            offDeck();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("resize", onResize);
            observer.disconnect();
            themeObserver.disconnect();
            if (rafId !== null) cancelAnimationFrame(rafId);
            skyline.clear();
            skyline.dispose();
            if (import.meta.env.DEV) delete window.__skylineDebug;
        };
    }, [reduced]);

    return (
        <canvas
            className="hero-skyline-canvas"
            ref={canvasRef}
            aria-hidden="true"
            data-skyline-state="init"
        />
    );
}
