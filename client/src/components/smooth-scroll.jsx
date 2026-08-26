import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "../lib/gsap.js";
import { setActiveLenis } from "../lib/scroll.js";

// Mounted ONCE, wrapping the whole app (see App.jsx) — never per-section. A
// second instance would mean two independent scroll owners fighting for the
// same window.

// gsap.matchMedia() is the pattern established here for every later stage's
// reduced-motion gating, per ROADMAP.md. It is not tween-specific: `.add()`
// runs an arbitrary setup function on match and automatically calls whatever
// it returns as cleanup on unmatch OR on revert, which is exactly "construct
// this subsystem under one condition, tear it down under the other" — the
// same shape Stage 3/6/7 will want for actual timelines, just applied here to
// a non-GSAP object (Lenis) instead. Kept as ONE gate rather than splitting
// the decision across a React hook (mount <ReactLenis> or don't) AND a
// separate matchMedia call for the ticker wiring — one mechanism, one source
// of truth for "is smooth scroll on".
//
// react-lenis (the `lenis/react` integration) was evaluated and not used: its
// <ReactLenis root> requires children to construct anything at all
// (`if (!children) return null` — verified in node_modules/lenis/dist/lenis-react.mjs),
// which means the reduced-motion gate would have to be expressed a second way
// in JSX on top of this matchMedia block. Constructing Lenis directly matches
// the brief's own ticker snippet without translating it through that API.
//
// `children` below is otherwise flagged by react/prop-types: this repo has no
// propTypes convention or dependency (see Turntable's `track` prop, same
// shape). Held at the 16-error baseline deliberately — unlike `track`,
// nothing else in this task's diff removes an existing error to net back to
// 16, so this one is suppressed explicitly rather than left to grow the count.
// eslint-disable-next-line react/prop-types
export default function SmoothScroll({ children }) {
    useGSAP(() => {
        const mm = gsap.matchMedia();

        // Smooth scrolling is disabled ENTIRELY under reduced motion, not just
        // shortened — smooth scroll is itself a vestibular trigger. No Lenis
        // instance exists in that mode; native scroll runs, and
        // scroll-margin-top (still present on .content > section) is the only
        // offset mechanism left, same as before this stage existed.
        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const lenis = new Lenis({
                // Live feedback on Experience's pinned horizontal filmstrip:
                // a visitor's first instinct is to swipe/scroll SIDEWAYS
                // through content presented sideways, and by default that
                // gesture does nothing at all — Lenis's default
                // gestureOrientation is "vertical", which reads only deltaY
                // (checked in node_modules/lenis/dist/lenis.mjs's
                // onVirtualScroll: `let delta = deltaY` is the fallthrough
                // for anything other than "both"/"horizontal"). A horizontal
                // trackpad swipe produces a large deltaX and a near-zero
                // deltaY, so it contributed nothing to scroll — which is what
                // actually made the section feel like a trap: the only way
                // through it was persistent vertical scrolling, because the
                // natural gesture was silently a no-op.
                //
                // "both" makes Lenis pick whichever axis dominates a given
                // WHEEL event (`Math.abs(deltaY) > Math.abs(deltaX) ? deltaY
                // : deltaX`, same file) and feed THAT into the one real
                // scroll position every ScrollTrigger on the page already
                // reads — Experience's pin/scrub needs no code of its own to
                // pick this up, it's driven by the same
                // `lenis.on("scroll", ScrollTrigger.update)` wiring below.
                // Verified: a horizontal-wheel-only gesture moved the
                // filmstrip as far as an equivalent vertical one.
                //
                // This is a WHEEL-only fix, on purpose, not a touch one —
                // `syncTouch` (below) is left at its default `false`, so
                // touch input never reaches this branch at all (onVirtualScroll
                // gates the whole delta/gestureOrientation calculation behind
                // `syncTouch && isTouch || smoothWheel && isWheel`; with
                // syncTouch off, a touch event fails that check before
                // gestureOrientation is even read, same file). That's
                // deliberate: Lenis leaves touch scrolling NATIVE by default
                // because OS touch-scroll physics already feel better than
                // anything rebuilt on top of them, and turning that off
                // globally to get this one section's benefit would change
                // scroll FEEL on every mobile section, not just this one.
                // Experience's own horizontal-touch-drag support is instead a
                // few lines in experience.jsx that talk to this same Lenis
                // instance directly (via lib/scroll.js's getActiveLenis()),
                // scoped to that one viewport — see the comment there.
                //
                // The wheel path above DOES apply everywhere, though, which is
                // why the two native horizontal scroll-snap rows in #my-taste
                // (mobile only) carry `data-lenis-prevent-horizontal` — see
                // my-taste.jsx. Without that, hovering one with a trackpad and
                // swiping sideways would ALSO register as a horizontal-
                // dominant wheel gesture and try to move the page. The
                // turntable's pitch fader needs no equivalent opt-out — GSAP
                // Draggable drives it via pointer events, a pathway Lenis's
                // wheel/touch listeners never see either way.
                gestureOrientation: "both",
                // Live feedback: "the render when we scroll down is not that
                // smooth." Measured first, not assumed — a CPU-throttled (4x)
                // rAF-timing trace across a full top-to-bottom scroll showed
                // ZERO dropped frames (worst frame 17.7ms, budget is 16.7ms),
                // so this was never a jank/paint-performance problem. What WAS
                // measurable: Lenis's default lerp (0.1, left unset before
                // this) kept the page visibly gliding for ~824ms after a
                // decisive wheel gesture stopped — nearly a full second of
                // "coasting" disconnected from input, which reads as laggy/
                // syrupy rather than responsive. 0.2 cuts that to ~460ms
                // (measured, same test) while keeping genuine momentum/smoothing
                // — not so tight it feels like native 1:1 scroll, which would
                // defeat the reason Lenis is here at all. Re-verified after
                // the change: About's scroll-hold still plateaus correctly
                // (~2.9s, unaffected — it hard-stops via lenis.stop(), not
                // lerp-based settling), Experience's pin/scrub still scrubs
                // and snaps correctly both directions, frame timing unchanged.
                lerp: 0.2,
                // We drive the RAF loop ourselves via GSAP's ticker below, so
                // Lenis must not also run its own — two RAF loops on the same
                // scroll would drift against each other over time.
                autoRaf: false,
                // We own the reduced-motion decision above (whether Lenis
                // exists at all); this only guards the narrow window where the
                // OS setting flips mid-session, so Lenis doesn't also apply
                // its own lerp-forcing on top of ours.
                respectReducedMotion: false,
            });

            setActiveLenis(lenis);

            // Keeps ScrollTrigger's cached positions in sync with Lenis's
            // virtual scroll on every Lenis-driven scroll event — without
            // this, ScrollTrigger measures against the real (unmoving, since
            // Lenis intercepts native scroll) document scroll and every
            // trigger fires at the wrong position once Stage 3/6/7 add any.
            lenis.on("scroll", ScrollTrigger.update);

            // Found live (reload #my-taste, scroll down — the pin never
            // engaged): several sections build their OWN ScrollTrigger
            // (my-taste.jsx, experience.jsx) inside effects gated on async
            // data, each firing at whatever moment its own fetch happens to
            // resolve — not a fixed, coordinated mount order. A `pin: true`
            // trigger's start/end and pin-spacer height are all measured
            // ONCE, at creation. If ANY later layout shift moves that
            // section — a sibling section's own pin-spacer inserting after
            // it, or (confirmed live, via a body-height poll immediately
            // after page load) this site's own self-hosted, section-scoped
            // webfonts (Anton/Oswald/Space Mono, first used starting at
            // #my-taste) finishing their swap-in a beat after first paint
            // and reflowing that text — the cached measurement goes stale
            // silently; nothing re-measures it. Measured: #my-taste's own
            // body-height poll was still growing 80ms+ AFTER its pin-spacer
            // had already been created, leaving its start ~144px short of
            // the section's real, settled position — enough that the whole
            // "+=200" engagement window was consumed before the visitor's
            // continued scroll actually reached the section, which reads
            // exactly as "the pin never engages."
            //
            // ScrollTrigger.refresh() re-measures EVERY currently-registered
            // trigger against current layout, not just one — a single,
            // page-wide fix rather than a per-section patch, and the right
            // place for it since this component already owns ScrollTrigger's
            // lifecycle for the whole app. document.fonts.ready targets the
            // confirmed mechanism directly; the debounced ResizeObserver on
            // <body> is the general safety net for anything else (a future
            // section, a slow image without a reserved aspect-ratio, another
            // sibling's pin-spacer) that shifts total page height after any
            // trigger has already been created. 200ms debounce: comfortably
            // past the ~80ms of post-creation growth measured live, without
            // refreshing on every intermediate resize tick while things are
            // still actively mounting.
            let refreshTimeout;
            const scheduleRefresh = () => {
                clearTimeout(refreshTimeout);
                refreshTimeout = setTimeout(() => ScrollTrigger.refresh(), 200);
            };
            document.fonts.ready.then(scheduleRefresh);
            const bodyResizeObserver = new ResizeObserver(scheduleRefresh);
            bodyResizeObserver.observe(document.body);

            // One clock for both. gsap.ticker's callback receives elapsed time
            // in SECONDS; Lenis.raf expects MILLISECONDS, hence * 1000.
            // lagSmoothing(0) turns off GSAP's own tab-backgrounding
            // catch-up jump, which would otherwise fight Lenis's velocity
            // tracking with a large synthetic time delta after a background
            // tab regains focus.
            const raf = (time) => lenis.raf(time * 1000);
            gsap.ticker.add(raf);
            gsap.ticker.lagSmoothing(0);

            return () => {
                gsap.ticker.remove(raf);
                lenis.destroy();
                setActiveLenis(null);
                clearTimeout(refreshTimeout);
                bodyResizeObserver.disconnect();
            };
        });

        return () => mm.revert();
    }, []);

    return <>{children}</>;
}
