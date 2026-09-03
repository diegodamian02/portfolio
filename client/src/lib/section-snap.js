// Section snapping — one swipe moves exactly one section, in either direction,
// however hard the swipe was; a new swipe is obeyed at once even if the
// previous one is still animating or its momentum is still arriving; and a
// horizontal gesture is left to whatever sideways scroller is under it.
//
// HISTORY, because this slot has held several mechanisms and each was replaced
// for a measured reason rather than a preference:
//
//   1. `lenis/snap`, `proximity` mode — snaps to the NEAREST stop after input
//      settles, dragging the visitor BACKWARD onto the stop they just left. A
//      mouse wheel turned slower than its debounce had every notch undone.
//   2. `lenis/snap`, `lock` mode — always advances one section, but a hard
//      flick overshoots and its guard then blocks the correction, coming to
//      rest BETWEEN sections.
//   3. A hand-rolled correction model — waits for the gesture to end, then
//      fixes where you stopped. That wait is irreducible and read as lag.
//   4. A navigation model that swallowed the rest of the flick by trying to
//      detect, from one delta magnitude, when the gesture had ended.
//   5. (4) rate-limited by a fixed dwell per section — a mandatory pause on
//      every section, the opposite of what this page is for.
//
// The lesson from (4): WHEN A GESTURE ENDS CANNOT BE RECOVERED FROM A SINGLE
// DELTA MAGNITUDE. Trackpad deltas carry ~+/-30% noise, so a decaying momentum
// tail throws spikes over any per-event rise threshold, and requiring a run of
// *small* events instead livelocks — sustained input never produces the run,
// so a held drag advanced one section and then went dead.
//
// The other lesson, from live testing rapid section-to-section swiping:
// consecutive real swipes ALWAYS overlap in the event stream. macOS momentum
// keeps firing for ~1s after you lift, so the second swipe begins on top of
// the first's tail — there is almost never a clean gap between them. So gap
// detection alone cannot carry this; the load-bearing signal is that a new
// swipe's magnitude climbs ABOVE the previous flick's decaying tail.
//
// This model, then, asks three questions, none from a single sample:
//
//   - GAP: a break in the strong-event stream longer than a tail's own
//     spacing — fingers left the surface. Rare between fast swipes, decisive
//     when it happens.
//   - REVERSAL: a short run of opposite-direction events. Momentum never
//     reverses, so this is unambiguously the visitor.
//   - RISE: input that climbs and stays well above a frozen, decaying envelope
//     of the previous flick. The envelope is captured over the flick's own
//     finger-on window and then only decays, so the flick's tail sits under it
//     while a returning finger climbs over it within ~100ms.
//
// Everything else is the tail of a swipe already acted on, and is swallowed,
// so a strong swipe can never reach a second section.
//
// Touch never snaps (native touch scroll is not routed through Lenis here) and
// there is no snap under prefers-reduced-motion (no Lenis instance exists).

// The trip between two stops, and its curve. Cubic-out because the gesture is
// consumed instantly — the move should leave at once and settle, without the
// long crawling finish of Lenis's default expo-out.
const TRAVEL_S = 0.42;
const TRAVEL_EASE = (t) => 1 - Math.pow(1 - t, 3);

// From trip start, the window over which incoming input is still assumed to be
// the ORIGINATING flick — its finger-on phase. The envelope is raised across
// this window (so it captures the flick's real plateau, not just its ramp's
// first sample), and rise/gap interruption is not considered until it passes.
const ACTIVE_WINDOW_MS = 170;

// A break in the strong-event stream this long, with the next event itself
// substantial, is a new gesture. A lone straggler after a stutter is not — it
// must be the front of a sustained run (RISE_RUN), so this is really just a
// fast path that lets a clean re-swipe after a real lift start without waiting
// out the full rise confirmation.
const NEW_GESTURE_GAP_MS = 120;

// Rise-detection is gated on the stream having gone through a TROUGH since the
// current trip started — a drop to a small fraction of the frozen envelope, or
// below START_DELTA outright. A normal flick's tail decays faster than the
// envelope and dips through this within ~400ms; a genuinely violent flick's
// tail stays large relative to the envelope and never troughs, so it cannot
// rise-trigger a second trip at all — it is bounded to one section, and the
// next real swipe lands once its momentum has fully stopped.
const TROUGH_RATIO = 0.45;

// A gap this long is momentum genuinely STOPPING — real inter-event spacing in
// a tail tops out around 40-50ms, and macOS halts momentum outright the instant
// a finger touches back down. On such a gap the envelope is re-anchored to
// whatever arrives next: if that is a returning finger, rise-detection then
// calibrates against its small first events; if it is a violent tail resuming
// after a main-thread stutter, the envelope re-anchors to the tail's own large
// level and still can't be climbed. Either way, safe.
const TROUGH_GAP_MS = 130;

// Rise-detection also has an absolute floor: a gentle swipe (tiny deltas
// throughout) must never rise-trigger off its own plateau once the envelope
// has decayed beneath it. A real re-swipe clears this within its ramp.
const RISE_MIN_DELTA = 16;

// The floor between two trips — insurance against one janked frame reading as a
// gap and against two briefly-overlapping streams thrashing. Below human
// re-swipe latency, so never felt.
const MIN_TRIP_GAP_MS = 110;

// Consecutive opposite-direction events that count as turning around. The
// counter DECAYS toward zero on same-direction events rather than resetting, so
// a straggler from the outgoing flick's tail landing between two genuine
// reversal events doesn't wipe the count and strand a down-then-up gesture.
const REVERSE_RUN = 2;

// How long the page stays locked after a trip lands with no further strong
// input — long enough to swallow the immediate post-landing tail burst (which
// would otherwise drag the page ~23px off the stop), short enough not to eat
// the front of a deliberate follow-up swipe.
const IDLE_MS = 100;

// Envelope decay constant, calibrated a little slower than real trackpad
// momentum (which is roughly exponential, tau ~200-350ms) so the envelope
// OVER-estimates where the tail is now — "clearly above the envelope" is then
// a conservative test for a returning finger that the tail itself cannot pass.
const ENV_TAU_MS = 300;

// A returning finger must exceed the decayed envelope by this factor, for this
// many consecutive events, to count as a new swipe with no gap.
const RISE_FACTOR = 1.5;
const RISE_RUN = 3;

// Smaller events than this never start a trip and never feed the envelope —
// they are tail dregs. They DO keep the post-trip lock alive while cooling.
const START_DELTA = 6;

// Treat the page as being AT a stop within this many px, so the "next stop in
// this direction" search doesn't return the one we are already sitting on.
const AT_STOP_PX = 8;

export function createSectionSnap(lenis, getSnapPoints) {
    let travelling = false;
    let cooling = false;
    let travelTarget = 0;
    let tripId = 0;
    let tripStartedAt = 0;
    let lastStrongAt = 0;
    let lastDir = 0;
    let oppositeRun = 0;
    let riseRun = 0;
    let troughSinceTrip = true;
    let env = 0;
    let envAt = 0;
    let idleTimer = null;
    let failsafe = null;
    let paused = false;
    let holdingLock = false;

    const currentY = () => lenis.actualScroll ?? window.scrollY;

    // Always re-asserts rather than short-circuiting on `holdingLock`: Lenis
    // clears isLocked itself when a scrollTo completes (its reset()), so a "we
    // already hold it" early return leaves the flag false while this module
    // believes otherwise — and the remaining tail then free-scrolls.
    function grabLock() {
        holdingLock = true;
        lenis.isLocked = true;
    }
    function releaseLock() {
        if (!holdingLock) return;
        holdingLock = false;
        lenis.isLocked = false;
    }

    // A new gesture broke through, or the visitor switched to a horizontal
    // scroller. No drift correction — a fresh trip is about to move the page,
    // or it is already on the stop.
    function endCooling() {
        clearTimeout(idleTimer);
        cooling = false;
        releaseLock();
    }
    // The cooling window expiring on its own: input has genuinely stopped.
    // Absorb any residual tail drift in one shot, then let go.
    function settleAndRelease() {
        cooling = false;
        if (holdingLock && Math.abs(currentY() - travelTarget) > 2) {
            lenis.scrollTo(travelTarget, { immediate: true, force: true });
        }
        releaseLock();
    }
    function restartIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(settleAndRelease, IDLE_MS);
    }

    function stopAfter(y, direction) {
        const points = getSnapPoints();
        if (points.length === 0) return undefined;
        return direction > 0
            ? points.find((value) => value > y + AT_STOP_PX)
            : [...points].reverse().find((value) => value < y - AT_STOP_PX);
    }

    // Where the NEXT stop is measured from. Mid-trip that is the target being
    // animated towards, not the live pixel: measuring from the pixel mid-trip
    // finds the stop BEYOND the one already being approached — the two-section
    // jump this exists to prevent.
    const anchor = () => (travelling ? travelTarget : currentY());

    function travelTo(target) {
        travelling = true;
        cooling = false;
        troughSinceTrip = false;
        travelTarget = target;
        tripStartedAt = performance.now();
        const id = ++tripId;

        clearTimeout(failsafe);
        // If something interrupts the trip so onComplete never fires, this
        // releases the guard rather than leaving snapping dead for the session.
        failsafe = setTimeout(() => endTravel(id), TRAVEL_S * 1000 + 400);

        grabLock();
        // `force` is required because we hold isLocked ourselves and Lenis
        // refuses a scrollTo while locked (lenis.mjs: `if ((this.isStopped ||
        // this.isLocked) && !force) return`). isStopped is checked separately
        // by the caller, so forcing here cannot run over an entrance freeze.
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
        // Re-take the lock the instant Lenis drops it, so the tail still
        // arriving cannot pull the page off the stop it just reached.
        cooling = true;
        grabLock();
        restartIdle();
    }

    // Match Lenis's own per-event opt-out: a gesture inside an element that
    // keeps its own scroll is not ours. Horizontal-dominant gestures are
    // already handled by the axis check; this covers a near-diagonal or
    // vertical gesture that still belongs to a nested scroller.
    function insidePreventScroll(event) {
        if (!event || typeof event.composedPath !== "function") return false;
        for (const node of event.composedPath()) {
            if (node === document.body || node === document.documentElement) return false;
            if (node && node.nodeType === 1 && typeof node.hasAttribute === "function" &&
                (node.hasAttribute("data-lenis-prevent") ||
                    node.hasAttribute("data-lenis-prevent-wheel"))) {
                return true;
            }
        }
        return false;
    }

    function onVirtualScroll({ deltaX, deltaY, event }) {
        if (paused) return;

        // Touch is NOT a snap gesture. Lenis emits `virtual-scroll` for touch
        // too, and without this guard every touch drag jumped a section and —
        // worse — scratching the record scrolled the page.
        if (event && typeof event.type === "string" && event.type.startsWith("touch")) return;

        const ax = Math.abs(deltaX || 0);
        const ay = Math.abs(deltaY || 0);

        // Horizontal-dominant gesture — it belongs to a sideways scroller
        // (Experience's filmstrip), never to section navigation. Lenis ignores
        // these for page scroll; matching that stops a diagonal swipe over the
        // filmstrip from both nudging it AND jumping the page. If we still hold
        // the post-trip lock, drop it: the visitor has moved on to browsing
        // sideways and the lock would freeze that.
        if (ax >= ay || insidePreventScroll(event)) {
            if (cooling) endCooling();
            return;
        }

        const now = performance.now();
        const magnitude = ay;
        const sinceTrip = now - tripStartedAt;
        const inActiveWindow = travelling && sinceTrip < ACTIVE_WINDOW_MS;

        // Decayed envelope, read BEFORE folding in this event.
        const envNow = envAt ? env * Math.exp(-(now - envAt) / ENV_TAU_MS) : 0;

        if (magnitude < START_DELTA) {
            // Tail dreg — never acts, but it IS the stream thinning out: mark
            // the trough so a following re-swipe can rise-trigger. And while
            // cooling it still means "input is still arriving", so the lock is
            // held until the dregs truly stop — otherwise the idle timer fires
            // mid-tail, unlocks, and the last few 1-3px events drift the page.
            troughSinceTrip = true;
            if (cooling) restartIdle();
            return;
        }

        const gap = lastStrongAt ? now - lastStrongAt : Infinity;
        lastStrongAt = now;
        // The stream dropping well below the frozen envelope is the tail
        // thinning out (a normal flick); a violent flick's tail stays large
        // relative to the envelope and never trips this.
        if (envNow > 0 && magnitude < envNow * TROUGH_RATIO) troughSinceTrip = true;

        const longGap = gap >= TROUGH_GAP_MS;
        if (longGap) {
            troughSinceTrip = true;
            riseRun = 0;
        }

        // The envelope is raised by live input only while idle or still inside
        // the originating flick's finger-on window; once a trip's active window
        // has passed (and through cooling) it can only decay, so a returning
        // finger climbs over it instead of dragging it up. A long gap re-anchors
        // it to whatever comes next (see TROUGH_GAP_MS).
        const freezeEnv = !longGap && (cooling || (travelling && !inActiveWindow));
        env = freezeEnv ? envNow : Math.max(longGap ? 0 : envNow, magnitude);
        envAt = now;

        const direction = Math.sign(deltaY);
        oppositeRun = direction !== lastDir && lastDir !== 0
            ? oppositeRun + 1
            : Math.max(0, oppositeRun - 1);
        const reversed = oppositeRun >= REVERSE_RUN;

        riseRun = magnitude > envNow * RISE_FACTOR ? riseRun + 1 : 0;
        const rising = riseRun >= RISE_RUN && troughSinceTrip && magnitude >= RISE_MIN_DELTA;

        // A gap only counts with a substantial event behind it AND the tail
        // already seen to thin (troughSinceTrip) — otherwise a main-thread
        // stutter that bunches a violent flick's events reads as a lift and
        // skips a section.
        const gapNew = gap >= NEW_GESTURE_GAP_MS && magnitude >= RISE_MIN_DELTA && troughSinceTrip;

        const isNewGesture = gapNew || reversed || rising;

        if (inActiveWindow) return;          // still the originating flick
        if (travelling && !isNewGesture) return;
        if (cooling) {
            if (!isNewGesture) {
                restartIdle();
                return;
            }
            endCooling();
        }

        if (sinceTrip < MIN_TRIP_GAP_MS) return;

        lastDir = direction;
        oppositeRun = 0;
        riseRun = 0;

        // A frame before an entrance cascade's forced scrollTo lands, or any
        // other deliberate freeze.
        if (lenis.isStopped) return;

        const target = stopAfter(anchor(), direction);
        if (target === undefined) return;

        travelTo(target);
    }

    lenis.on("virtual-scroll", onVirtualScroll);

    function reset() {
        clearTimeout(idleTimer);
        clearTimeout(failsafe);
        travelling = false;
        cooling = false;
        troughSinceTrip = true;
        lastStrongAt = 0;
        lastDir = 0;
        oppositeRun = 0;
        riseRun = 0;
        env = 0;
        envAt = 0;
        tripId++;
        releaseLock();
    }

    return {
        // Same shape the entrance holds used to call — kept as the seam for
        // anything that ever needs to suspend snapping again.
        stop() {
            paused = true;
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
