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

// The live section-snap instance, same singleton pattern as activeLenis above:
// it's constructed inside smooth-scroll.jsx (which owns Lenis's lifecycle) but
// needs to be reachable from plain functions elsewhere. null under
// prefers-reduced-motion (no Lenis, so no snap) and in the brief window before
// smooth-scroll.jsx mounts, so every caller must use `?.`.
//
// No section reads it at present. about.jsx / my-taste.jsx / connect.jsx used
// to call getActiveSnap()?.stop() to keep the snap from firing on top of an
// entrance cascade that had frozen scroll; none of them hold scroll any more
// (2026-09-02 — holds removed outright, an animation should always be
// scrollable-away-from), so there is nothing left to suppress. Kept because
// stop()/start() is the right seam if anything ever needs to suspend snapping
// again.
let activeSnap = null;

export function setActiveSnap(instance) {
    activeSnap = instance;
}

export function getActiveSnap() {
    return activeSnap;
}

// Distinguishes "the visitor is dragging a wheel/trackpad through the page"
// from "a nav click (or any other scrollToSection() caller) is animating
// straight to a target section" — about.jsx's Task 5 scroll-hold needs this:
// without it, clicking "Experience" from the top of the page scrolls straight
// through #about's hold trigger the same as organic scrolling would, and
// gets held captive for the whole ~2.9s entrance on its way to a section the
// visitor explicitly asked to jump to. A counter, not a boolean, because a
// second nav click before the first Lenis animation's onComplete fires
// (double-click, or clicking a different link mid-scroll) must not let the
// first one's cleanup mark scrolling as "not programmatic" while the second
// is still in flight.
let programmaticScrollDepth = 0;
const programmaticScrollListeners = new Set();

export function isProgrammaticScrollActive() {
    return programmaticScrollDepth > 0;
}

// Fires synchronously on every transition, not just polled at one moment —
// about.jsx's hold subscribes so a nav click that starts WHILE it's already
// holding (not just one that started before) releases it immediately too.
export function onProgrammaticScrollChange(fn) {
    programmaticScrollListeners.add(fn);
    return () => programmaticScrollListeners.delete(fn);
}

function setProgrammaticScrollActive(active) {
    programmaticScrollListeners.forEach((fn) => fn(active));
}

// The id of the most recent scrollToSection() destination. Distinct from the
// active/inactive flag above: a pinned-entrance section (#my-taste, #connect)
// needs to know whether an in-flight nav scroll is HEADED FOR IT (play the
// entrance animation) or just passing THROUGH toward another section (snap to
// the finished state, no animation). Stays set after the scroll finishes —
// it's "where the last nav went", read once by the destination section's own
// entrance logic, overwritten by the next nav.
let lastNavTarget = null;
const sectionNavigatedListeners = new Set();

export function getLastNavTarget() {
    return lastNavTarget;
}

// Fires with the section id once a scrollToSection() to it has completed —
// the reliable "a nav click just landed here" signal for a section whose
// own ScrollTrigger onEnter never fires on that route (a nav landing stops
// at --scroll-offset, above the trigger's start line; FINDINGS B72).
export function onSectionNavigated(fn) {
    sectionNavigatedListeners.add(fn);
    return () => sectionNavigatedListeners.delete(fn);
}

function notifySectionNavigated(id) {
    sectionNavigatedListeners.forEach((fn) => fn(id));
}

// The fixed-navbar offset deliberately lives in CSS, not here:
// `.content > section { scroll-margin-top: var(--scroll-offset) }` in
// main.scss. Both scroll paths below honour it natively — see the comments
// on each — so nothing in this file reads --scroll-offset directly. Do NOT
// also subtract a navbar height here; it would be counted twice.
export function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;

    lastNavTarget = id;

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
        programmaticScrollDepth++;
        setProgrammaticScrollActive(true);
        activeLenis.scrollTo(target, {
            // force:true — about.jsx's hold calls lenis.stop() while
            // holding; without force, a nav click landing in that window
            // would silently no-op (Lenis's own scrollTo() declines to run
            // while isStopped, per its source). The hold's own
            // onProgrammaticScrollChange subscription un-stops it the
            // instant this fires, so this isn't fighting that — it's what
            // makes the hand-off work.
            force: true,
            onComplete: () => {
                programmaticScrollDepth = Math.max(0, programmaticScrollDepth - 1);
                if (programmaticScrollDepth === 0) setProgrammaticScrollActive(false);
                notifySectionNavigated(id);
            },
        });
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
    // No onComplete to hang this off in the native path; a frame after the
    // instant/smooth scroll is close enough for the destination section's
    // entrance catch-up, and reduced motion sections don't animate anyway.
    requestAnimationFrame(() => notifySectionNavigated(id));
}
