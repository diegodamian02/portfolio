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
            };
        });

        return () => mm.revert();
    }, []);

    return <>{children}</>;
}
