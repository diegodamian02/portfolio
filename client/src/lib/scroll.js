// Module-level singleton reference to the live Lenis instance, in the same
// spirit as turntable-audio.js's AudioContext singleton: scrollToSection() is
// called from plain functions (navbar.jsx's click handler, use-hash-scroll.js's
// ResizeObserver callback) that sit outside the component which owns Lenis, so
// a shared mutable reference is simpler and more honest than threading it
// through props or context for two call sites.
//
// null under prefers-reduced-motion — smooth-scroll.jsx never constructs a
// Lenis instance in that mode, so this reference is the single switch that
// decides which code path every scroll in the app takes.
let activeLenis = null;

export function setActiveLenis(instance) {
    activeLenis = instance;
}

export function getActiveLenis() {
    return activeLenis;
}

// The fixed-navbar offset deliberately lives in CSS, not here:
// `.content > section { scroll-margin-top: var(--scroll-offset) }` in
// main.scss. Both scroll paths below honour it natively — see the comments
// on each — so nothing in this file reads --scroll-offset directly. Do NOT
// also subtract a navbar height here; it would be counted twice.
export function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    if (activeLenis) {
        // Lenis's own scrollTo reads getComputedStyle(target).scrollMarginTop
        // (and scrollPaddingTop on the scroller) when given an element, exactly
        // the same native CSS property scroll-margin-top resolves to — verified
        // by injecting Lenis into the live page: scrollTo(#about) with NO
        // offset argument landed the section 168.0px (measured 167.97,
        // -0.03px float noise) below the viewport top at 1440px, matching
        // --scroll-offset exactly. Passing a manual offset here would be a
        // SECOND copy of the navbar-height number Stage 0 deliberately put in
        // exactly one place; Lenis reading the CSS property directly avoids
        // that duplication entirely rather than just hiding it behind
        // getComputedStyle(documentElement).
        activeLenis.scrollTo(target);
        return;
    }

    // No Lenis instance: either prefers-reduced-motion (smooth-scroll.jsx
    // never constructs one), or a call landing in the brief window before it
    // has mounted. scrollIntoView() honours scroll-margin-top the same way,
    // so behaviour stays correct either way; only the animation choice needs
    // to be made explicitly here, since native CSS scroll-behavior: smooth is
    // being removed as part of this stage (it fought Lenis) and can no longer
    // supply a default.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "instant" : "smooth" });
}
