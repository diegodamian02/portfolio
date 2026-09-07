import { useEffect, useRef } from "react";
import { createSkyline } from "../lib/skyline-spectrum.js";
import { createSchemeCycle } from "../lib/hero-palette.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import { DECK, onDeckState, getDeckState } from "../lib/deck-state.js";
import * as audio from "../lib/turntable-audio.js";

// The hero background: a colour dot matrix whose columns are the track's own
// spectrum. (Evolved from the Stage 7 neon skyline — the loop, gating and
// presence model below are unchanged; the mark is dots now and the colour is
// one analogous SCHEME per song, `hero-palette.js`.)
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

// Theme-dependent compositing — see skyline-spectrum.js's render(). The
// per-theme colour SOLVE moved into hero-palette.js (dots solve electric on
// dark, deep ink on light), so all that is left here is the glow:
//
//   * On a near-black page the halo is LIGHT — it adds to the background, so
//     it reads as glow and the gaps between dots stay black.
//   * On a near-white page adding light moves the glow TOWARD the background,
//     so light theme composites the halo normally and keeps it faint — a gap
//     the halo has tinted reads as an intrusion next to a crisp ink dot.
const THEME_RESPONSE = {
    dark: { additiveGlow: true, glowAlpha: 0.9 },
    light: { additiveGlow: false, glowAlpha: 0.28 },
};

// How fast the whole matrix fades and lifts in on play / out on settle. A
// settle, not a slide — ~0.3s to most of the way there.
const REVEAL_TAU = 0.3;

const MAX_DPR = 2;

// How much alpha each text region gives up, and how far the zone extends past
// the element's own box.
//
// TWO zones, not the three this had through 7.1, and the merge is a fix rather
// than a tidy-up. Zones compose the way overlapping alpha does, `1-(1-a)(1-b)`,
// and since D26 made every zone a FULL-WIDTH band, any two whose vertical
// extents meet overlap along their whole length. The headline's band ended 25px
// above where the tagline's began, so with a 96px feather on each they
// overlapped almost entirely and composed 0.80 and 0.78 into an effective
// **0.956** — a near-total hole in the skyline about 400px tall, which rendered
// as a white fog band straight across the middle of the hero. Neither number
// was ever meant to be that, and nothing in either one said so.
//
// The headline and the tagline are one block of copy sitting 25px apart. One
// zone over both, at one strength, is what they are, and it is the only shape
// that cannot compound with itself.
//
// PER THEME, and that is not a fudge either. The mask exists to hold a contrast
// RATIO, and how much alpha it has to remove to hold one depends on how close
// the columns land to the text in luminance — which flips with the theme, and
// not in step:
//
//   * `.hero-tagline` is `--secondary-text`, luminance 0.367 on dark and 0.077
//     on light. On dark it is a MID tone and the columns behind it are the
//     brightest thing in the frame, so they close on it fast.
//   * On light the columns are deep ink and the tagline is nearly as dark as
//     the body text, so they close from the other side, more slowly.
//
// Measured at a single 0.70 across both: dark 3.63:1 against light 5.15:1, from
// the same mask. The tagline is the binding element in both themes — 24px at
// weight 300, which WCAG would let through at 3:1 as large text and which this
// site holds to 4.5:1 anyway, because a thin weight is not what that rule had in
// mind. The headline and the crate then follow with a wide margin.
const ZONE_STRENGTH = {
    dark: { copy: 0.85, crate: 0.55 },
    // Light copy: 0.70 (Phase 1) -> 0.74 (Phase 3). The Studio Paper ground
    // swap lightened --secondary-text (#454e68 -> #57503f, a warmer but
    // higher-luminance ink) so .hero-tagline's own margin against the mask
    // thinned from 5.17:1 to 4.74:1 — still >=4.5 but closer to the floor
    // than every other measurement on this page, which all sit >=5. 0.74
    // restores a >=5:1 margin (measured — see the Phase 3 STATUS entry) at
    // the cost of a touch more knock-back on the tallest columns; not
    // rechecked against dark, which keeps its own 0.85 untouched.
    light: { copy: 0.74, crate: 0.55 },
};
const ZONE_PAD_X = 26;
const ZONE_PAD_Y = 16;

// Per-theme mask feather (Stage 11), passed through to the renderer per zone.
// Dark keeps the renderer's own 96 (undefined -> module default). Light gets a
// shorter ramp: its Stage 11 columns are opaque, so a 96px feather climbing
// into the tallest columns paints a visible band of paper across their upper
// third — a tighter fade keeps the knock-back close to the text it protects,
// and on a full-width band there is no horizontal edge to notice (D26).
const ZONE_FEATHER = { dark: undefined, light: 56 };

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
        const cycle = createSchemeCycle();

        // "Is the visitor actually looking at the hero" — the gate that lets
        // .hero-skyline-canvas be full-bleed without the matrix overlapping
        // #about. Snapped to #about the hero still owns the strip above it:
        // viewport 0 -> navbar bottom is covered by the opaque fixed navbar,
        // then a ~24px gap (#about lands at --scroll-offset = navbar + 24) shows
        // the hero's bottom edge. A plain threshold:0 observer treats any of
        // that as "in view" and the matrix keeps drawing in the gap. Shrinking
        // the observer's top edge past the whole strip (navbar + 24 + a few px
        // of slack, since a zero-area touch still reports isIntersecting at
        // threshold 0) makes the hero read as gone once it's essentially
        // scrolled off — sync()/drawStatic() then clear the canvas. Both
        // branches use this; rebuilt on resize because --navbar-height steps at
        // two breakpoints.
        const makeHeroObserver = (onChange) => {
            const navH = document.querySelector(".navbar")?.getBoundingClientRect().height ?? 144;
            const obs = new IntersectionObserver(
                ([entry]) => onChange(entry.isIntersecting),
                { threshold: 0, rootMargin: `-${Math.round(navH + 40)}px 0px 0px 0px` },
            );
            if (host) obs.observe(host);
            return obs;
        };

        const themeName = () =>
            (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

        const dpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);

        // A theme flip re-solves every dot's colour at once, and the two
        // per-theme solves aren't on a line (electric on dark, deep ink on
        // light — hero-palette.js), so there is nothing to tween: left alone it
        // lands in a single frame while the page behind it crossfades over
        // --theme-transition. When the matrix is actually on screen, fade the
        // canvas out, repaint at the new solve while it's invisible, fade back.
        //
        // WAAPI, not a CSS transition on the element: the D8 catch-all
        // (main.scss, last rule) puts a `transition` shorthand on every element
        // for the length of the switch and would win the specificity tie here.
        // A no-op at rest — the canvas is genuinely blank then.
        const FADE_EASE = "cubic-bezier(0.4, 0, 0.2, 1)"; // == --theme-transition-ease
        let themeFade = null;
        let themeRepaintTimer = 0;
        const fadeThroughThemeFlip = (repaint) => {
            cycle.invalidate();

            const state = canvas.dataset.skylineState;
            if (state !== "playing" && state !== "settling" && state !== "static-playing") {
                repaint();
                return;
            }

            const ms = parseFloat(
                getComputedStyle(canvas).getPropertyValue("--theme-transition-duration"),
            ) || 180;

            themeFade?.cancel();
            window.clearTimeout(themeRepaintTimer);

            // One keyframe -> animates from the live opacity to 0; forwards fill
            // holds it there until the repaint swaps the colours underneath.
            themeFade = canvas.animate([{ opacity: 0 }], { duration: ms, easing: FADE_EASE, fill: "forwards" });
            themeRepaintTimer = window.setTimeout(() => {
                repaint();
                themeFade?.cancel();
                themeFade = canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: FADE_EASE });
            }, ms);
        };

        /**
         * Where the horizon sits, as a fraction of the canvas height.
         *
         * The canvas is full-bleed (== the hero, == one viewport tall), so
         * `innerHeight / box.height` is ~1 and the horizon lands on the canvas's
         * own bottom edge — the fold. The clamp still matters: if the canvas
         * ever measures TALLER than the window (a short mobile viewport, a
         * transient resize), baseline drops below 1 to keep the horizon at the
         * viewport bottom rather than letting it fall off-screen.
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
            const strength = ZONE_STRENGTH[themeName()];
            const feather = ZONE_FEATHER[themeName()];
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
                feather,
            });
            const zones = [];
            // The union of the headline and the tagline, as one band.
            const name = host?.querySelector(".hero-name")?.getBoundingClientRect();
            const tagline = host?.querySelector(".hero-tagline")?.getBoundingClientRect();
            const copy = [name, tagline].filter(Boolean);
            if (copy.length) {
                const top = Math.min(...copy.map((r) => r.top));
                const bottom = Math.max(...copy.map((r) => r.bottom));
                zones.push(toZone({ top, height: bottom - top }, strength.copy));
            }
            // The crate's own box collapses to the input row when the results
            // panel is closed, so measure the row and let the pad cover the
            // rest — a zone sized to an open panel would be a hole in the
            // skyline most of the time.
            const crate = host?.querySelector(".record-crate-input-row")?.getBoundingClientRect();
            if (crate) zones.push(toZone(crate, strength.crate));
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

        // 0..1, eased in `frame()` — fades and lifts the whole matrix in on play
        // and out on settle. Stays at 1 on the reduced-motion branch (which
        // shows/hides by clearing the canvas, not by fading).
        let revealProgress = 1;

        const paint = () => {
            const theme = themeName();
            skyline.render(
                cycle.schemeState(theme),
                { ...THEME_RESPONSE[theme], baseline, maxHeightFraction, reveal: revealProgress },
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
            // Same gate as the animated branch: without it the static frame's
            // bottom edge overlaps #about in the band under the navbar once the
            // hero is scrolled away (the canvas is full-bleed).
            let inView = true;

            const drawStatic = () => {
                if (!staticPlaying || !inView) {
                    skyline.clear();
                    canvas.dataset.skylineState = staticPlaying ? "static-hidden" : "static-idle";
                    return;
                }
                sizeToHost();
                skyline.loadStaticProfile();
                // One static frame — the fixed reduced-motion column profile in
                // the current scheme, at full reveal (no fade-in animation).
                //
                // What still varies between visits is the scheme's own starting
                // position, seeded from the clock so a first visit is not always
                // the same family. Deliberate and unrelated to motion — a
                // reduced-motion visitor sees the scheme everyone else would
                // this session, just not moving.
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

            let staticObserver = makeHeroObserver((v) => { inView = v; drawStatic(); });
            const onResizeStatic = () => {
                staticObserver.disconnect();
                staticObserver = makeHeroObserver((v) => { inView = v; drawStatic(); });
                drawStatic();
            };
            const staticTheme = new MutationObserver(() => {
                // fadeThroughThemeFlip already calls cycle.invalidate().
                fadeThroughThemeFlip(drawStatic);
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
                    get scheme() { return cycle.schemeState(themeName()); },
                    get toneLut() { return skyline.toneLut; },
                    get maxHeightFraction() { return maxHeightFraction; },
                    get baseline() { return baseline; },
                };
            }

            return () => {
                offDeckStatic();
                staticObserver.disconnect();
                staticTheme.disconnect();
                window.removeEventListener("resize", onResizeStatic);
                window.clearTimeout(themeRepaintTimer);
                themeFade?.cancel();
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
                // on real heights instead of guessing at the exponential tail —
                // and on the reveal fade too, so the loop runs long enough to
                // draw the matrix all the way out.
                skyline.silence();
                if (now >= lastProbeAt + SETTLE_PROBE_INTERVAL_MS) {
                    lastProbeAt = now;
                    if (skyline.peak() < SETTLE_HEIGHT_THRESHOLD && revealProgress < 0.02) {
                        settleUntil = 0;
                    }
                }
            }

            // Fade + lift toward playing / away on settle. exp() keeps it
            // frame-rate independent, same as the column ballistics.
            const revealTarget = playing ? 1 : 0;
            revealProgress += (revealTarget - revealProgress) * (1 - Math.exp(-Math.max(dt, 0) / REVEAL_TAU));

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
                // A fresh track gets fresh ballistics, a fresh auto-gain
                // reference and a fresh fade-in — otherwise the first seconds
                // of a quiet preview inherit a loud one's normalisation, and
                // the matrix pops in at full strength. Resuming from a pause
                // keeps the ballistics/gain and just eases the reveal back up.
                if (previous !== DECK.PAUSED) {
                    skyline.reset();
                    revealProgress = 0;
                }
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

        // Observes the hero SECTION (not the canvas): the section is the thing
        // whose visibility means "the visitor is looking at the hero". When it
        // reads as gone, sync() cancels the loop AND clears the canvas, so a
        // full-bleed canvas can't overlap #about below the navbar.
        let observer = makeHeroObserver((v) => { inView = v; sync(); });
        const reobserveHero = () => { observer.disconnect(); observer = makeHeroObserver((v) => { inView = v; sync(); }); };

        // The theme can change mid-track. Three things depend on it and none of
        // them recompute on their own: the cycle caches its solve per theme, the
        // safe zones now carry a per-theme strength, and a settled canvas has to
        // be repainted by hand because no frame is coming to do it.
        const themeObserver = new MutationObserver(() => {
            measureSafeZones();
            // fadeThroughThemeFlip owns cycle.invalidate() and, while a track
            // is up, hides the colour swap behind an opacity fade. The repaint
            // it runs only matters for a settled/paused canvas that still has
            // pixels on it — the running loop re-solves on its own next frame.
            fadeThroughThemeFlip(() => {
                if (rafId === null && canvas.dataset.skylineState !== "idle") paint();
            });
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
            reobserveHero();
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
                get reveal() { return revealProgress; },
                get safeZones() { return skyline.safeZones; },
                get usesFilter() { return skyline.usesFilter; },
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
                get scheme() { return cycle.schemeState(themeName()); },
                get schemeIndex() { return cycle.index; },
                get schemeTrackId() { return cycle.trackId; },
                get schemeCount() { return cycle.size; },
                get schemePosition() { return cycle.position; },
                get toneLut() { return skyline.toneLut; },
                set freezeHeights(v) { skyline.freezeHeights = v; },
                get freezeHeights() { return skyline.freezeHeights; },
                get maxHeightFraction() { return maxHeightFraction; },
                get baseline() { return baseline; },
                solvedFor: (theme) => cycle.solvedFor(theme),
                setScheme: (i) => { cycle.setIndex(i); if (rafId === null) paint(); },
                paint,
            };
        }

        return () => {
            offDeck();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("resize", onResize);
            observer?.disconnect();
            themeObserver.disconnect();
            window.clearTimeout(themeRepaintTimer);
            themeFade?.cancel();
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
