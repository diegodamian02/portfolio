// Section snapping — a wheel/trackpad gesture moves the page to the next
// section and nothing else. One gesture, one section.
//
// HISTORY, because this is the third mechanism in this slot and each was
// replaced for a measured reason rather than a preference:
//
//   1. `lenis/snap`, `proximity` mode. Snaps to the NEAREST stop after input
//      settles. It drags the visitor BACKWARD onto the stop they just left, so
//      a mouse wheel turned slower than its debounce had every notch undone —
//      8 notches x 100px produced net 0px, permanently.
//   2. `lenis/snap`, `lock` mode. Fixes that by always advancing one section,
//      but a hard flick overshoots and its internal guard then blocks the
//      correction, coming to rest BETWEEN sections (2 of 6 flicks).
//   3. A hand-rolled version of (1) with a departure rule. Correct — 60/60
//      landings, no trap — but it is a CORRECTION model: it waits for the
//      gesture to end, then fixes where you stopped. That wait is irreducible
//      (it is what separates "paused mid-scroll" from "done scrolling") and it
//      is what read as a delay and as the page moving on its own.
//
// This is a NAVIGATION model instead, which is what removes the delay rather
// than shortening it. The gesture does not settle anywhere and then get
// corrected; it is consumed immediately as "go to the next section", and the
// page is locked for the trip so momentum cannot fight it. There is no
// debounce before the move at all.
//
// Deliberate non-goals, unchanged: touch never snaps (native touch scroll is
// not routed through Lenis here — phone scrolling is untouched), and there is
// no snap under prefers-reduced-motion, because no Lenis instance exists then.

// The trip between two stops.
const TRAVEL_S = 0.6;

// How long input must be QUIET before the gesture is considered over. This is
// NOT a delay before moving — the first event of a gesture fires instantly.
//
// It has to outlast the GAPS INSIDE a momentum tail, not just the tail's
// length. A hard flick's tail stretches its own inter-event gaps as it dies —
// measured out to ~220ms — and at 160ms the cooldown expired in the middle of
// one. Everything after that was read as fresh input: the lock came off (the
// page drifted 17-24px off the stop) and tail events large enough to pass
// START_DELTA began whole extra trips, which is how a powerful scroll skipped
// a section. 400ms clears the largest gaps seen.
const QUIET_MS = 400;

// Smaller events than this still count as input — they keep the cooldown
// alive — but can never START a trip. A dying momentum tail ends in a scatter
// of 1-4px events and its gaps stretch as it dies; without this floor one of
// those stragglers, landing just after the cooldown expired, began a whole
// extra trip. That is one of the two ways a single flick moved two sections.
const START_DELTA = 6;

// How many consecutive sub-START_DELTA events mean the previous gesture's
// momentum has become negligible.
//
// Earlier versions tried to spot a genuine SECOND push by looking for a RISE
// in magnitude, on the reasoning that a tail only ever decays. That is true of
// the trend but not of the samples: real trackpad deltas carry about +/-30%
// noise, so a decaying tail throws occasional spikes that clear any rise test,
// and roughly 8% of hard flicks still jumped two sections because of one. No
// threshold fixes that — the signal genuinely overlaps.
//
// So this does not try to recognise a new push at all. It waits for the OLD
// gesture to stop mattering: once several events in a row are too small to
// start a trip anyway, whatever arrives next can be treated on its own merits.
// A tail that has decayed below the floor cannot itself start anything, so
// there is no spike to be fooled by.
const TAIL_SPENT_EVENTS = 3;

// Treat the page as being AT a stop within this many px, so the "next stop in
// this direction" search doesn't return the one we are already sitting on.
const AT_STOP_PX = 8;

export function createSectionSnap(lenis, getSnapPoints) {
    let travelling = false;
    let cooling = false;
    let quietTimer = null;
    let failsafe = null;
    let paused = false;
    // Consecutive events too small to start a trip. Once this passes
    // TAIL_SPENT_EVENTS the previous gesture's momentum is spent and a new one
    // is free to act.
    let weakRun = 0;
    let holdingLock = false;

    const currentY = () => lenis.actualScroll ?? window.scrollY;

    // Lenis clears its own lock the moment a scrollTo finishes, but the flick's
    // momentum is still arriving for a few hundred ms after that. Unlocked,
    // those leftover events drag the page straight back off the stop —
    // measured at 23px past every target. So the lock is held through the
    // cooldown as well, and only released once input has genuinely stopped.
    function grabLock() {
        if (holdingLock) return;
        holdingLock = true;
        lenis.isLocked = true;
    }
    function releaseLock() {
        if (!holdingLock) return;
        holdingLock = false;
        lenis.isLocked = false;
    }

    function restartQuiet() {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(() => {
            cooling = false;
            releaseLock();
        }, QUIET_MS);
    }

    function stopAfter(y, direction) {
        const points = getSnapPoints();
        if (points.length === 0) return undefined;
        return direction > 0
            ? points.find((value) => value > y + AT_STOP_PX)
            : [...points].reverse().find((value) => value < y - AT_STOP_PX);
    }

    function travelTo(target) {
        travelling = true;
        clearTimeout(failsafe);
        // If something interrupts the trip so onComplete never fires — an
        // entrance hold's own forced scrollTo replacing the animation — this
        // releases the guard rather than leaving snapping dead for the session.
        failsafe = setTimeout(endTravel, TRAVEL_S * 1000 + 400);
        // lock: true is what makes "no delay" possible. Lenis ignores wheel
        // input while locked (it still EMITS virtual-scroll, which is why the
        // guards below still see the momentum tail), so the trip cannot be
        // fought by the rest of the flick. Verified against lenis.mjs: scrollTo
        // sets isLocked on start and reset() clears it on completion.
        lenis.scrollTo(target, { duration: TRAVEL_S, lock: true, onComplete: endTravel });
    }

    function endTravel() {
        clearTimeout(failsafe);
        if (!travelling) return;
        travelling = false;

        cooling = true;
        grabLock();
        restartQuiet();
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

        const magnitude = Math.abs(deltaY || 0);
        const strong = magnitude >= START_DELTA;
        weakRun = strong ? 0 : weakRun + 1;

        // Mid-trip: swallow everything. Lenis is locked so these move nothing.
        // Nothing is queued for later either — a queued advance was how a hard
        // flick could still turn into two sections, and one section per gesture
        // is the requirement no matter how hard the gesture was.
        if (travelling) return;

        if (cooling) {
            // Still inside the gesture that brought us here. Hold the line and
            // push the deadline out. The lock stays on, so none of this moves
            // the page off the stop.
            restartQuiet();
            // Only once its momentum has decayed past the point of being able
            // to start anything does a later event get to act on its own.
            if (weakRun < TAIL_SPENT_EVENTS) return;
            if (!strong) return;
            clearTimeout(quietTimer);
            cooling = false;
            releaseLock();
        }

        if (!deltaY || !strong) return;

        // A hold has frozen scrolling for an entrance cascade (about.jsx,
        // my-taste.jsx, connect.jsx). Those call stop() on us too, but this
        // also covers the frame before that lands — without it scrollTo would
        // be refused and `travelling` would stick forever.
        if (lenis.isStopped) return;

        const target = stopAfter(currentY(), Math.sign(deltaY));

        // Nothing further in that direction — the top of the page or the last
        // section. Leave the event alone so Lenis scrolls normally into the
        // remaining slack rather than the gesture feeling dead.
        if (target === undefined) return;

        travelTo(target);
    }

    lenis.on("virtual-scroll", onVirtualScroll);

    return {
        // Same shape the entrance holds already call (about.jsx, my-taste.jsx,
        // connect.jsx), so swapping the mechanism underneath needs no changes
        // in those files.
        stop() {
            paused = true;
            clearTimeout(quietTimer);
            clearTimeout(failsafe);
            travelling = false;
            cooling = false;
            // Never leave Lenis locked because a hold interrupted us — that
            // would freeze the page for the rest of the session.
            releaseLock();
        },
        start() {
            paused = false;
            travelling = false;
            cooling = false;
            weakRun = 0;
            releaseLock();
        },
        destroy() {
            clearTimeout(quietTimer);
            clearTimeout(failsafe);
            releaseLock();
            lenis.off("virtual-scroll", onVirtualScroll);
        },
    };
}
