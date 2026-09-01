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
const QUIET_MS = 160;

// Smaller events than this still count as input — they keep the cooldown
// alive — but can never START a trip. A dying momentum tail ends in a scatter
// of 1-4px events and its gaps stretch as it dies; without this floor one of
// those stragglers, landing just after the cooldown expired, began a whole
// extra trip. That is one of the two ways a single flick moved two sections.
const START_DELTA = 6;

// A momentum tail DECAYS, so a rise identifies a genuine second push — but
// only once the tail has actually begun. A real gesture RAMPS UP at its start
// (2 -> 5 -> 9 -> 14), and reading that ramp as a second push is the other way
// one flick moved two sections. It was invisible in testing because the
// emulator drove the active phase at a constant magnitude and so never ramped.
// Hysteresis fixes it: the magnitude has to fall to DECAY_FRACTION of the
// gesture's own peak before a rise back above REARM_FRACTION counts as new.
const DECAY_FRACTION = 0.3;
const REARM_FRACTION = 0.5;

// Treat the page as being AT a stop within this many px, so the "next stop in
// this direction" search doesn't return the one we are already sitting on.
const AT_STOP_PX = 8;

export function createSectionSnap(lenis, getSnapPoints) {
    let travelling = false;
    let cooling = false;
    let quietTimer = null;
    let failsafe = null;
    let paused = false;
    // Peak magnitude of the gesture in progress, and whether it has started
    // decaying yet — together these tell a genuine second push from both a
    // dying tail and the ramp-up at the start of the first push.
    let gesturePeak = 0;
    let hasDecayed = false;
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
        if (magnitude > gesturePeak) gesturePeak = magnitude;
        if (gesturePeak > 0 && magnitude < gesturePeak * DECAY_FRACTION) hasDecayed = true;
        // A second push has to clear BOTH tests: the previous gesture must
        // already be dying, and this event must climb back up out of that
        // tail. The ramp-up of a single flick satisfies neither, because
        // nothing has decayed yet.
        const isSecondPush =
            hasDecayed && magnitude >= START_DELTA && magnitude > gesturePeak * REARM_FRACTION;
        if (isSecondPush) {
            gesturePeak = magnitude;
            hasDecayed = false;
        }

        if (travelling) {
            // Mid-trip. Lenis is locked so these move nothing; only remember a
            // genuine second push so it can run on arrival.
            if (isSecondPush) queuedDirection = Math.sign(deltaY);
            return;
        }

        if (cooling) {
            // Dying events of the gesture that brought us here: hold the line
            // and push the deadline out until they genuinely stop.
            if (!isSecondPush) {
                restartQuiet();
                return;
            }
            // A real new push — don't make the visitor wait out the tail.
            clearTimeout(quietTimer);
            cooling = false;
            releaseLock();
        }

        // Idle: this event is the start of a brand-new gesture, so the peak
        // tracking restarts with it.
        if (!cooling && !travelling && !isSecondPush) {
            gesturePeak = magnitude;
            hasDecayed = false;
        }

        if (!deltaY || magnitude < START_DELTA) return;

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
            gesturePeak = 0;
            hasDecayed = false;
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
