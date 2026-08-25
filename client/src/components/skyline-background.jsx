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
const THEME_RESPONSE = {
    dark: { additiveGlow: true, glowAlpha: 0.9 },
    light: { additiveGlow: false, glowAlpha: 0.72 },
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
const HEADLINE_ZONE_STRENGTH = 0.34;
const TAGLINE_ZONE_STRENGTH = 0.5;
const CRATE_ZONE_STRENGTH = 0.55;
const ZONE_PAD_X = 26;
const ZONE_PAD_Y = 16;

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
        const measureBaseline = () => {
            const box = canvas.getBoundingClientRect();
            if (box.height === 0) return;
            baseline = Math.min(1, Math.max(0.4, window.innerHeight / box.height));
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
            const toZone = (rect, strength) => ({
                x: rect.left - box.left - ZONE_PAD_X,
                y: rect.top - box.top - ZONE_PAD_Y,
                w: rect.width + ZONE_PAD_X * 2,
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

        const paint = () => {
            const theme = themeName();
            skyline.render(cycle.sample(theme), { ...THEME_RESPONSE[theme], baseline });
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
                paint();
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
