import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollToSection, getActiveLenis } from "../lib/scroll.js";

// How long after a hash change we keep correcting for late-arriving layout.
// #my-taste's Spotify data lands ~300ms in; 2s covers a slow API round trip
// without leaving a listener armed indefinitely.
const SETTLE_MS = 2000;

// Any of these means the visitor took over. We stop correcting immediately —
// re-scrolling underneath someone who is deliberately scrolling is hostile.
const TAKEOVER_EVENTS = ["wheel", "touchstart", "keydown"];

// <Navigate> (used by the /about, /project, /contact redirect routes) only
// updates the URL via history.replaceState — it does NOT scroll the viewport
// to a hash fragment the way a real browser navigation would. Without this,
// landing on e.g. /about (from a bookmark, or the Spotify OAuth callback
// redirect) leaves the URL at /#about but the page scrolled to wherever it
// already was.
export function useHashScroll() {
    const location = useLocation();

    useEffect(() => {
        if (!location.hash) return;
        const id = location.hash.slice(1);

        // Scrolling once on mount is not enough. #my-taste renders its Spotify
        // content asynchronously and grows ~811px when the data resolves, which
        // pushes #about and #connect down by that much. A single rAF-scheduled
        // scrollIntoView measures the pre-data layout, commits to it, and leaves
        // the visitor ~811px above the section they asked for — a miss far
        // larger than the navbar offset this file exists to get right.
        //
        // So re-issue the scroll whenever the document's height changes, for a
        // bounded window. The correction lands while the first smooth scroll is
        // still in flight, so it reads as one continuous movement rather than a
        // jump.
        let observer = null;
        let timer = null;
        let stopped = false;

        const stop = () => {
            if (stopped) return;
            stopped = true;
            observer?.disconnect();
            clearTimeout(timer);
            for (const ev of TAKEOVER_EVENTS) window.removeEventListener(ev, takeOver);
        };

        const takeOver = () => {
            stop();
            // Disarming the observer only prevents FUTURE scrolls. A wheel
            // gesture does not reliably abort a smooth scroll that is already
            // animating (measured: the visitor scrolls up 400px, and the page
            // glides right back down to the target anyway), so pin the page
            // where they left it.
            //
            // With Lenis active, the native pin below is not enough on its
            // own: Lenis writes the scroll position itself every RAF tick
            // toward its OWN remembered target, which pinning the native
            // scrollTop does not touch — the very next tick would glide the
            // page right back, same failure as the one this comment already
            // describes, one layer up. lenis.scrollTo(currentPosition,
            // { immediate: true }) is the Lenis-native equivalent: it collapses
            // animatedScroll/targetScroll onto where the page already is and
            // stops its animate loop (verified against
            // node_modules/lenis/dist/lenis.mjs — scrollTo's immediate branch
            // calls reset(), which calls animate.stop()).
            const lenis = getActiveLenis();
            if (lenis) {
                lenis.scrollTo(lenis.animatedScroll, { immediate: true });
            } else {
                // No Lenis instance: either reduced motion (never constructed
                // one) or a takeover landing in the brief window before it
                // mounted. Same-position + instant is the documented native
                // way to cancel an in-flight smooth scroll.
                window.scrollTo({ top: window.scrollY, behavior: "instant" });
            }
        };

        const go = () => {
            if (!stopped) scrollToSection(id);
        };

        // Defer a frame so the route's sections are mounted before we measure.
        const frame = requestAnimationFrame(go);
        observer = new ResizeObserver(go);
        observer.observe(document.body);
        timer = setTimeout(stop, SETTLE_MS);
        for (const ev of TAKEOVER_EVENTS) {
            window.addEventListener(ev, takeOver, { passive: true });
        }

        return () => {
            cancelAnimationFrame(frame);
            stop();
        };
    }, [location.hash]);
}
