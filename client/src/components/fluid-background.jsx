import { useEffect, useRef } from "react";
import { createFluidSim } from "../lib/fluid-sim.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";

// Stage 7a — the fluid background behind the hero. Structural only: this
// task proves the solver, the gating and the theming. No AnalyserNode, no
// colorwayFor(), no deck-state coupling — that is Stage 7b, deliberately
// kept out of here.
//
// IDLE BEHAVIOUR (the brief left this a judgement call): slow, low-frequency
// splats rather than nothing at all. A perfectly static canvas is
// indistinguishable from a broken one, and telling those apart before real
// triggers exist is this task's whole purpose. Stage 7b replaces this with
// audio-driven splats; the idle loop should be REMOVED there, not stacked
// underneath them.
//
// A seed burst at startup, then periodic top-ups. Sparse top-ups alone were
// measured and rejected: with splats 1.4–2.6s apart the hero swung between
// clearly-lit and visually empty depending purely on when you happened to
// look (peak alpha ranged 16–97/255 across samples of the same config). The
// seed establishes a field immediately on arrival — the hero is never blank
// on first paint — and the top-ups then sustain it.
const IDLE_SPLAT_MIN_MS = 1600;
const IDLE_SPLAT_MAX_MS = 2800;
const SEED_SPLATS = 4;

// Impulse strength. Large numbers are expected here — the advection shader
// multiplies velocity by texel size, so this is in grid cells per second,
// not screen fractions. 900 (the first attempt) flung each splat across the
// canvas within a few frames and smeared it to nothing; 260 reads as a drift.
const IDLE_FORCE = 260;
const IDLE_RADIUS = 1.0;

// How much relative luminance the dye is allowed to move the background by,
// at full strength. Dye intensity is derived from this per theme rather than
// being a fixed multiplier — see dyeIntensityFor().
//
// A FIXED multiplier was tried first and is wrong, visibly so. At 0.45 the
// dark theme read as intended (faint accent wisps) while the light theme
// turned into a grey haze over the entire hero, washing out the deck. Same
// alpha, same token, opposite result: --accent is #6f9bff on near-black in
// dark (luminance 0.005 -> 0.35, a delta of 0.345) but #1f3fae on near-white
// in light (0.92 -> 0.06, a delta of 0.86). Per unit of alpha the light
// theme therefore moves the background 2.5x further, so a multiplier tuned
// on one theme cannot be right on the other.
//
// 0.155 is the dark theme's previously-tuned look expressed in these terms
// (0.45 x 0.345), so dark is unchanged and light is brought to match it.
const TARGET_LUMINANCE_IMPACT = 0.155;

// Clamped because the derivation divides by the accent/background contrast:
// if a future theme ever set them close together the quotient would explode.
const MIN_DYE_INTENSITY = 0.1;
const MAX_DYE_INTENSITY = 0.9;

// Cap DPR for the drawing buffer. The display pass is a single quad so it is
// nearly free, but the dye/sim grids are allocated against the drawing
// buffer's own aspect and a 3× buffer on a phone is memory spent for detail
// that the 512-wide dye grid cannot resolve anyway.
const MAX_DPR = 2;

// Nominal dt for the single reduced-motion frame. One 60fps tick's worth —
// enough for the solver to turn the seed splats into structure, not so much
// that the clamp inside step() is doing the work.
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

/**
 * Theme-aware base colour, read from --accent on :root.
 *
 * A single colour for now, per the brief — per-track colouring is Stage 7b.
 * --accent rather than a --vinyl-N: the vinyl tokens are deliberately dark,
 * near-black record colours (#0d1016 classic black, #131f42 midnight blue),
 * which as dye over the hero's own background would be invisible in dark
 * theme and a smudge in light. --accent is the one token in the system that
 * is already required to read against BOTH backgrounds — that is its job.
 */
function readAccent() {
    return readToken("--accent", [0.44, 0.61, 1.0]);
}

/** WCAG relative luminance, same formula the project's contrast checks use. */
function relativeLuminance([r, g, b]) {
    const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Dye intensity that lands the same luminance impact in either theme.
 *
 * Derived rather than hardcoded per theme so it stays correct if --accent or
 * --bg-color are ever retuned — which they have been before (light-theme
 * deck colour, Stage 1 Task 4) — instead of silently drifting out of balance.
 */
function dyeIntensityFor(accent) {
    const bg = readToken("--bg-color", [0.04, 0.05, 0.10]);
    const contrast = Math.abs(relativeLuminance(accent) - relativeLuminance(bg));
    if (contrast < 1e-4) return MAX_DYE_INTENSITY;
    const derived = TARGET_LUMINANCE_IMPACT / contrast;
    return Math.min(MAX_DYE_INTENSITY, Math.max(MIN_DYE_INTENSITY, derived));
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
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

        let accent = readAccent();
        let dyeIntensity = dyeIntensityFor(accent);
        const host = canvas.parentElement;

        // Dev-only instrumentation, wired up before any early return so it
        // exists on the reduced-motion path too (where proving the count is
        // exactly 1 is the whole assertion). `data-fluid-state` on the
        // canvas is the real, shipped queryable state — the deck's own
        // `data-deck-state` precedent — but it only reports what this code
        // BELIEVES. Proving the RAF loop actually stopped needs a frame
        // counter, and reading pixels back is not an option
        // (preserveDrawingBuffer is false, so the buffer is undefined by the
        // time anything outside the frame could sample it). Vite statically
        // replaces import.meta.env.DEV with false in a production build and
        // drops the block entirely.
        if (import.meta.env.DEV) {
            window.__fluidDebug = {
                get frames() { return sim.frameCount; },
                get state() { return canvas.dataset.fluidState; },
                get simResolution() { return sim.simResolution; },
                get dyeResolution() { return sim.dyeResolution; },
            };
        }

        const dpr = () => Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const sizeToHost = () => {
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return sim.resize(rect.width, rect.height, dpr());
        };

        /** A splat at a random point, drifting in a random direction. */
        const idleSplat = () => {
            const x = randomBetween(0.15, 0.85);
            const y = randomBetween(0.15, 0.85);
            const angle = Math.random() * Math.PI * 2;
            sim.splat(
                x, y,
                Math.cos(angle) * IDLE_FORCE,
                Math.sin(angle) * IDLE_FORCE,
                accent.map((c) => c * dyeIntensity),
                IDLE_RADIUS,
            );
        };

        /** Establishes a field so the hero is never blank on first paint. */
        const seed = () => {
            for (let i = 0; i < SEED_SPLATS; i++) idleSplat();
        };

        sizeToHost();

        // ---- reduced motion ------------------------------------------------
        //
        // Decision: ONE static frame, no RAF loop at all — not a blank canvas.
        // The brief allowed either. A blank canvas makes the hero visibly
        // poorer for the people who set the preference, while a single
        // rendered frame keeps the same visual identity (a soft accent-toned
        // wash behind the type) with provably zero ongoing motion. This
        // matches how the rest of the site treats the preference: the record
        // still drops and plays under reduced motion, it simply does not
        // animate getting there.
        if (reduced) {
            // Seed then one step, so the frame has some structure rather
            // than being a handful of raw Gaussian blobs.
            seed();
            sim.step(STATIC_FRAME_DT);
            canvas.dataset.fluidState = "static";
            return () => {
                sim.dispose();
                if (import.meta.env.DEV) delete window.__fluidDebug;
            };
        }

        // ---- the loop and its two gates -------------------------------------
        seed();
        let rafId = null;
        let lastTime = performance.now();
        let nextIdleAt = lastTime + randomBetween(IDLE_SPLAT_MIN_MS, IDLE_SPLAT_MAX_MS);

        // Two independent reasons to be stopped, deliberately not collapsed
        // into one boolean: they change from different events and either one
        // alone must be enough to hold the loop down.
        let inView = true;
        let visible = document.visibilityState !== "hidden";

        const frame = (now) => {
            rafId = requestAnimationFrame(frame);
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            if (now >= nextIdleAt) {
                idleSplat();
                nextIdleAt = now + randomBetween(IDLE_SPLAT_MIN_MS, IDLE_SPLAT_MAX_MS);
            }
            sim.step(dt);
        };

        const sync = () => {
            const shouldRun = inView && visible;
            if (shouldRun && rafId === null) {
                // Reset the clock on resume. Without this the first frame
                // back from a hidden tab gets a dt of however long the tab
                // was away — the solver clamps it, but the idle scheduler
                // would still fire a burst of catch-up splats at once.
                lastTime = performance.now();
                nextIdleAt = lastTime + randomBetween(IDLE_SPLAT_MIN_MS, IDLE_SPLAT_MAX_MS);
                rafId = requestAnimationFrame(frame);
            } else if (!shouldRun && rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            canvas.dataset.fluidState = shouldRun ? "running" : "paused";
        };

        // Mirrors turntable.jsx's own visibilitychange handler (which lives
        // in the COMPONENT, not turntable-audio.js — see STATUS.md). One
        // deliberate difference: that handler pauses on hide and does NOT
        // auto-resume, because silently restarting audio in a backgrounded
        // tab is hostile. A background visual has the opposite expectation —
        // a visitor returning to the tab should find the hero alive — so
        // this one resumes.
        const onVisibility = () => {
            visible = document.visibilityState !== "hidden";
            sync();
        };
        document.addEventListener("visibilitychange", onVisibility);

        // The brief asked to reuse navbar.jsx's IntersectionObserver. There
        // isn't one — navbar.jsx drives its scrolled state from a plain
        // scroll listener, and the hide-during-hero gating it once had was
        // removed with the orb-nav hero (see its own comment). The only
        // IntersectionObserver in the codebase is my-taste.jsx's
        // scroll-position dots, whose shape this follows: construct, observe,
        // disconnect in cleanup. Flagged in STATUS.md rather than silently
        // building against the description.
        //
        // Observes the hero SECTION (the canvas's parent) rather than the
        // canvas: same box today, but the section is the thing whose
        // visibility actually means "the visitor is looking at the hero",
        // and it stays correct if the canvas is ever inset.
        const observer = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                sync();
            },
            // Zero threshold — any sliver of hero on screen means it is being
            // looked at. The gate is for a visitor three sections deep, not
            // for shaving frames off a partial scroll.
            { threshold: 0 },
        );
        if (host) observer.observe(host);

        const onResize = () => { sizeToHost(); };
        window.addEventListener("resize", onResize);

        const onThemeChange = () => {
            accent = readAccent();
            dyeIntensity = dyeIntensityFor(accent);
        };
        window.addEventListener("themeChange", onThemeChange);

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

        sync();

        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("themeChange", onThemeChange);
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
