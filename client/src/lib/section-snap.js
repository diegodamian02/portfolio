// Section snapping — one swipe moves exactly one section, in either direction,
// however hard the swipe was, and a new swipe is obeyed at once even if the
// previous one is still animating.
//
// HISTORY, because this slot has held several mechanisms and each was replaced
// for a measured reason rather than a preference:
//
//   1. `lenis/snap`, `proximity` mode. Snaps to the NEAREST stop after input
//      settles. It drags the visitor BACKWARD onto the stop they just left, so
//      a mouse wheel turned slower than its debounce had every notch undone —
//      8 notches x 100px produced net 0px, permanently.
//   2. `lenis/snap`, `lock` mode. Always advances one section, but a hard flick
//      overshoots and its internal guard then blocks the correction, coming to
//      rest BETWEEN sections (2 of 6 flicks).
//   3. A hand-rolled version of (1) with a departure rule. Correct, but a
//      CORRECTION model: it waits for the gesture to end, then fixes where you
//      stopped. That wait is irreducible and read as lag.
//   4. A navigation model that swallowed the rest of the flick by trying to
//      detect, from the deltas, when the gesture had ended.
//   5. The same, rate-limited by a fixed dwell per section.
//
// The lesson from (4) is the important one: WHEN A GESTURE ENDS CANNOT BE
// RECOVERED FROM DELTA MAGNITUDES. Three detectors were tried and all three
// failed against measurement:
//
//   - Per-event rise: trackpad deltas carry ~+/-30% noise, so a decaying tail
//     throws spikes that clear any rise threshold. ~8% of hard flicks doubled.
//   - Run-of-spent-events: strong input reset the run counter AND extended the
//     deadline, so a held drag held its own exit shut. A 2.4s continuous drag
//     advanced ONE section and then went dead — "sometimes it won't let me".
//   - Decay ratio over a 0.5-1.2s horizon (momentum decays, a finger does not):
//     across 600 trials per model, a wobbling held finger falls to 0.844 of its
//     earlier peak while an extreme tail still reaches 0.898-0.995. The
//     distributions OVERLAP. No threshold exists, at any window size.
//
// (5) sidestepped that by never asking the question, but it bought the answer
// with a mandatory pause on every section, which is the opposite of what this
// page is for.
//
// So this asks a question that IS answerable from the stream. Two facts hold
// regardless of how hard the swipe was:
//
//   - Momentum never PAUSES. It is delivered at the display rate until it
//     stops. Fingers leaving the surface and returning always leave a gap.
//   - Momentum never REVERSES. An opposite-direction event is, without any
//     ambiguity, the visitor.
//
// Everything else in the stream is treated as the tail of a swipe already
// acted on and is swallowed, so a strong swipe can never reach a second
// section. Nothing is inferred from magnitude, so nothing can be misread.

// The trip between two stops, and its curve. An out-ease is right because the
// gesture is consumed instantly — the move should leave at once and settle.
// Lenis's default scrollTo easing is expo-out, whose last 10% crawls; over a
// full section that long slow finish is what read as sluggish.
const TRAVEL_S = 0.45;
const TRAVEL_EASE = (t) => 1 - Math.pow(1 - t, 3);

// A break in the event stream this long means the swipe ended and another
// began. Momentum arrives at the display rate and thins only slightly as it
// dies — the widest gap inside a modelled tail is 40ms — so this sits far
// above anything a tail produces while staying under the time it takes to lift
// and re-plant fingers.
const NEW_GESTURE_GAP_MS = 110;

// Insurance, not pacing: the floor between two trips. It exists so a single
// janked frame in the wheel stream cannot read as a gap, and so two input
// streams that briefly overlap cannot thrash the page back and forth. No human
// re-swipes or turns around inside this, so it is never felt.
const MIN_TRIP_GAP_MS = 130;

// How many consecutive opposite-direction events count as turning around. One
// is not enough: trackpad deltas jitter, and a single stray sample of the wrong
// sign in the middle of a swipe would otherwise send the page back.
const REVERSE_RUN = 2;

// How long after the last event the page is released. Until then Lenis stays
// locked so the arriving tail cannot drag the page off the stop it landed on —
// measured at 23px past every target when it was left unlocked.
const IDLE_MS = 150;

// Smaller events than this can never START a trip. A dying tail ends in a
// scatter of 1-4px events; without this floor one of those stragglers began a
// whole extra trip.
const START_DELTA = 6;

// Treat the page as being AT a stop within this many px, so the "next stop in
// this direction" search doesn't return the one we are already sitting on.
const AT_STOP_PX = 8;

export function createSectionSnap(lenis, getSnapPoints) {
    let travelling = false;
    let travelTarget = 0;
    let tripId = 0;
    let tripStartedAt = 0;
    let lastEventAt = 0;
    let lastDir = 0;
    // Set once a swipe has been acted on. Everything that follows is its tail
    // until the stream shows a gap or a reversal.
    let consumed = false;
    let oppositeRun = 0;
    let idleTimer = null;
    let failsafe = null;
    let paused = false;
    let holdingLock = false;

    const currentY = () => lenis.actualScroll ?? window.scrollY;

    // Always re-asserts rather than short-circuiting on `holdingLock`. Lenis
    // clears isLocked itself when a scrollTo completes (its reset()), so a
    // "we already hold it" early return leaves the flag false while this module
    // believes otherwise — and the whole remaining tail then free-scrolls.
    function grabLock() {
        holdingLock = true;
        lenis.isLocked = true;
    }
    function releaseLock() {
        if (!holdingLock) return;
        holdingLock = false;
        lenis.isLocked = false;
    }

    function restartIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            consumed = false;
            releaseLock();
        }, IDLE_MS);
    }

    function stopAfter(y, direction) {
        const points = getSnapPoints();
        if (points.length === 0) return undefined;
        return direction > 0
            ? points.find((value) => value > y + AT_STOP_PX)
            : [...points].reverse().find((value) => value < y - AT_STOP_PX);
    }

    // Where the NEXT stop should be measured from. Mid-trip that is the target
    // being animated towards, not the live scroll position: interrupting a trip
    // half-way and measuring from the current pixel would find the stop beyond
    // the one we are already heading to, which is exactly the two-section jump
    // this is meant to prevent.
    const anchor = () => (travelling ? travelTarget : currentY());

    function travelTo(target) {
        travelling = true;
        travelTarget = target;
        tripStartedAt = performance.now();
        const id = ++tripId;

        clearTimeout(failsafe);
        // If something interrupts the trip so onComplete never fires — an
        // entrance hold's own forced scrollTo replacing the animation — this
        // releases the guard rather than leaving snapping dead for the session.
        failsafe = setTimeout(() => endTravel(id), TRAVEL_S * 1000 + 400);

        grabLock();
        // `force` is required because we hold isLocked ourselves, and Lenis
        // refuses a scrollTo while locked (lenis.mjs: `if ((this.isStopped ||
        // this.isLocked) && !force) return`). isStopped is checked separately
        // by the caller, so forcing here cannot run over an entrance hold.
        // `lock: true` keeps Lenis ignoring wheel input for the trip; it still
        // EMITS virtual-scroll, which is why the guards below still see the
        // tail.
        lenis.scrollTo(target, {
            duration: TRAVEL_S,
            easing: TRAVEL_EASE,
            lock: true,
            force: true,
            onComplete: () => endTravel(id),
        });
    }

    // `id` guards against a superseded trip's completion landing after a newer
    // one has already started and clearing its state.
    function endTravel(id) {
        if (id !== tripId) return;
        clearTimeout(failsafe);
        travelling = false;
        // Take the lock back the moment Lenis drops it, so the tail still
        // arriving cannot pull the page off the stop it just reached. The idle
        // timer is restarted alongside it — without that, a swipe whose tail
        // ends before the trip does would leave the page locked forever.
        grabLock();
        restartIdle();
    }

    function onVirtualScroll({ deltaY, event }) {
        if (paused) return;

        // Touch is NOT a snap gesture. Lenis emits `virtual-scroll` for touch
        // events as well as wheel ones, and missing this guard had two live
        // consequences: every touch drag on a phone jumped a whole section
        // (this module has always documented touch as untouched), and — worse
        // — scratching the record scrolled the page instead. `.turntable-platter`
        // sets `touch-action: none`, which stops the BROWSER scrolling but not
        // this, so the scratch gesture was being read as a scroll and the page
        // moved out from under the finger mid-stroke.
        if (event && typeof event.type === "string" && event.type.startsWith("touch")) return;

        const now = performance.now();
        const gap = lastEventAt ? now - lastEventAt : Infinity;
        lastEventAt = now;
        // Every event, however small, keeps the lock alive — the page must stay
        // pinned to its stop for as long as anything is still arriving.
        restartIdle();

        const direction = Math.sign(deltaY || 0);
        if (!direction || Math.abs(deltaY) < START_DELTA) return;

        oppositeRun = lastDir !== 0 && direction !== lastDir ? oppositeRun + 1 : 0;
        const reversed = oppositeRun >= REVERSE_RUN;
        // A gap means fingers left the surface; a reversal means they moved the
        // other way. Momentum can do neither, so either one is the visitor
        // starting again — and a swipe that has already been acted on is
        // otherwise still in progress, tail included.
        const isNewGesture = gap >= NEW_GESTURE_GAP_MS || reversed;
        if (consumed && !isNewGesture) return;

        if (now - tripStartedAt < MIN_TRIP_GAP_MS) return;

        lastDir = direction;
        oppositeRun = 0;

        // A hold has frozen scrolling for an entrance cascade (about.jsx,
        // my-taste.jsx, connect.jsx). Those call stop() on us too, but this
        // also covers the frame before that lands — and it is what keeps the
        // forced scrollTo above from overriding a deliberate freeze.
        if (lenis.isStopped) return;

        const target = stopAfter(anchor(), direction);

        // Nothing further in that direction — the top of the page or the last
        // section. Leave the event alone so Lenis scrolls normally into the
        // remaining slack rather than the gesture feeling dead.
        if (target === undefined) return;

        consumed = true;
        travelTo(target);
    }

    lenis.on("virtual-scroll", onVirtualScroll);

    function reset() {
        clearTimeout(idleTimer);
        clearTimeout(failsafe);
        travelling = false;
        consumed = false;
        lastEventAt = 0;
        lastDir = 0;
        oppositeRun = 0;
        tripId++;
        releaseLock();
    }

    return {
        // Same shape the entrance holds already call (about.jsx, my-taste.jsx,
        // connect.jsx), so swapping the mechanism underneath needs no changes
        // in those files.
        stop() {
            paused = true;
            // Never leave Lenis locked because a hold interrupted us — that
            // would freeze the page for the rest of the session.
            reset();
        },
        start() {
            paused = false;
            reset();
        },
        destroy() {
            reset();
            lenis.off("virtual-scroll", onVirtualScroll);
        },
    };
}
