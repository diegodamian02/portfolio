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

// After arriving, input must be quiet for this long before another gesture is
// accepted. This is NOT a delay before moving — the first gesture fires
// instantly. It exists only so the momentum tail of the flick that triggered
// the trip cannot immediately trigger the next one and chain three sections
// off a single swipe.
const QUIET_MS = 80;

// Ignore the sub-pixel dribble at the very end of a momentum tail so it cannot
// count as a fresh gesture.
const MIN_DELTA = 2;

// Treat the page as being AT a stop within this many px, so the "next stop in
// this direction" search doesn't return the one we are already sitting on.
const AT_STOP_PX = 8;

export function createSectionSnap(lenis, getSnapPoints) {
    let travelling = false;
    let cooling = false;
    let quietTimer = null;
    let failsafe = null;
    let paused = false;
    // Magnitude of the previous event, used to tell a fresh gesture from a
    // momentum tail: a tail DECAYS, so anything that rises clearly above the
    // last event is the visitor pushing again rather than the flick dying.
    let lastMagnitude = 0;
    // A gesture that arrives mid-trip is remembered and run on arrival, so
    // flicking twice quickly moves two sections instead of the second being
    // swallowed.
    let queuedDirection = 0;
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

        if (queuedDirection !== 0 && !lenis.isStopped) {
            const direction = queuedDirection;
            queuedDirection = 0;
            const next = stopAfter(currentY(), direction);
            if (next !== undefined) {
                travelTo(next);
                return;
            }
        }
        queuedDirection = 0;
        cooling = true;
        grabLock();
        restartQuiet();
    }

    function onVirtualScroll({ deltaY }) {
        if (paused) return;

        const magnitude = Math.abs(deltaY || 0);
        // A decaying tail never rises; a new push does. The margin keeps a
        // noisy tail from registering as a fresh gesture.
        const isFreshGesture = magnitude > lastMagnitude * 1.3 + 1;
        const previousMagnitude = lastMagnitude;
        lastMagnitude = magnitude;

        if (travelling) {
            // Mid-trip. Lenis is locked so these move nothing; only remember a
            // genuine second push so it can run on arrival.
            if (isFreshGesture && magnitude >= MIN_DELTA && previousMagnitude > 0) {
                queuedDirection = Math.sign(deltaY);
            }
            return;
        }

        if (cooling) {
            // Dying events of the gesture that brought us here: hold the line
            // and push the deadline out until they genuinely stop.
            if (!isFreshGesture || magnitude < MIN_DELTA) {
                restartQuiet();
                return;
            }
            // A real new push — don't make the visitor wait out the tail.
            clearTimeout(quietTimer);
            cooling = false;
            releaseLock();
        }

        if (!deltaY || magnitude < MIN_DELTA) return;

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
            queuedDirection = 0;
            // Never leave Lenis locked because a hold interrupted us — that
            // would freeze the page for the rest of the session.
            releaseLock();
        },
        start() {
            paused = false;
            travelling = false;
            cooling = false;
            queuedDirection = 0;
            lastMagnitude = 0;
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
