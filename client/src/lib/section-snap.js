// Vertical section snap — the page settles onto a section's resting line when
// a wheel/trackpad gesture ends near one.
//
// This replaces `lenis/snap`, which was tried first and could not express the
// behaviour this site needs. Both of its modes failed, measured rather than
// assumed:
//
//   - `proximity` always snaps to the NEAREST line. Correct landings (6/6 in
//     testing) but it drags the visitor BACKWARD onto the line they just left.
//     With a mouse wheel turned slower than the debounce, every notch was
//     undone: 8 notches x 100px produced net 0px of travel, permanently. A
//     visitor scrolling deliberately could not leave a section at all.
//   - `lock` always advances one section in the gesture's direction, which
//     fixes that, but a hard flick overshoots the target and its internal
//     "already snapping" guard then blocks the correction — 2 of 6 flicks came
//     to rest stranded BETWEEN sections (the exact thing snapping exists to
//     prevent).
//
// The missing rule is one line of intent: snap to the nearest line, EXCEPT
// when that line is the one the gesture started on — then carry the visitor on
// to the next line in the direction they are actually travelling. That single
// distinction is what separates "you overshot, let me settle you back" from
// "you are trying to leave, stop fighting me", and neither library mode can
// see the difference because neither knows where the gesture began.
//
// Deliberate non-goals, matching the lenis/snap behaviour this replaces:
// touch never snaps (a native touch scroll is not routed through Lenis here,
// and phone snapping is its own design problem), and there is no snap at all
// under prefers-reduced-motion, because no Lenis instance exists in that mode.

// How long input must be quiet before the page is treated as having come to
// rest. Together with DURATION_S this is the whole felt latency of a snap:
// measured end to end, 120 + 0.30s settles 350ms after the last input, down
// from 1116ms for the first `lenis/snap` version, which read as the page
// lurching on its own long after the visitor had stopped.
//
// A value this low is only safe because of the departure rule below. The
// 500ms this started at was chosen purely to out-wait a slow mouse wheel, and
// it did not even succeed — a wheel turned slower than the debounce was still
// trapped. The trap is handled by intent now, not by waiting, which frees this
// number to be about responsiveness alone.
//
// 60ms was measured too and settles in 217ms, but is NOT used: it is shorter
// than the irregular 30-80ms gaps that appear at the end of a real trackpad
// momentum tail and when a finger is repositioned mid-drag, so it would fire
// inside a live gesture — the exact "the page is fighting me" failure this
// whole mechanism exists to avoid. 120ms keeps real margin against that.
const DEBOUNCE_MS = 120;

// The glide onto the line, once the snap has been decided. Purely cosmetic —
// it cannot cause a mis-landing — so it is tuned as short as still reads as a
// settle rather than a jump.
const DURATION_S = 0.30;

// How far from a line the visitor can come to rest and still be pulled onto
// it, as a fraction of viewport height. This number is doing two jobs at once,
// which is why it is not larger:
//
//   - It must exceed HALF the largest gap between adjacent sections, or the
//     middle of that gap becomes a dead band the visitor can rest in. At 0.40
//     (the first value shipped) the about->experience gap of 706px against a
//     850px viewport left a 26px band, and it was found immediately.
//   - It must stay BELOW half the height of a genuinely tall section, so that
//     section's middle stays freely scrollable. #projects with a row expanded
//     is 1133px (1.33x viewport); at 0.55 the reachable band in its middle is
//     ~199px, so its video and description can still be read.
//
// 0.55 satisfies both across 1280x680 -> 1920x1080. A section taller than
// 1.1x the viewport keeps a free middle by construction, which is the property
// that makes this safe for content that grows.
const THRESHOLD_RATIO = 0.55;

// Within this many px of a line, treat the page as already resting ON it —
// both for "nothing to correct" and for "this gesture started here".
const AT_LINE_PX = 8;

export function createSectionSnap(lenis, getSnapPoints) {
    let timer = null;
    // The line the visitor is currently docked at — the one they were resting
    // on before they started scrolling away. NOT "where this gesture began":
    // that was the first attempt and it only worked for a single notch, because
    // the second notch starts somewhere off the line and the rule stops
    // applying, so the page snapped backward again. It has to persist across
    // the whole departure until they actually reach somewhere else.
    let anchor = null;
    // How many times in a row we have pulled the visitor back onto `anchor`.
    // The first pull-back is right: someone who stops a short way into a gap
    // has simply come to rest between sections, and settling them is the whole
    // point. A SECOND one against the same line means they are trying to
    // leave and we are fighting them — that is the mouse-wheel trap, where
    // every notch was undone and the page never advanced at all. So the first
    // is allowed and the rest are not.
    let backSnaps = 0;
    let lastDirection = 0;
    let paused = false;

    const currentY = () => lenis.actualScroll ?? window.scrollY;

    function nearestLine(y) {
        let best = null;
        let bestDistance = Infinity;
        for (const value of getSnapPoints()) {
            const distance = Math.abs(value - y);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = value;
            }
        }
        return best;
    }

    function onVirtualScroll({ deltaY }) {
        if (paused) return;
        // On the first event of a new gesture, if the page is sitting ON a
        // line, that is where the visitor is departing from. Sampled here
        // rather than when the snap runs, by which point the gesture has
        // already carried the page off it. If they are mid-gap the previous
        // anchor is kept — that is what lets a sequence of small notches
        // accumulate into a real departure instead of each one being undone.
        if (timer === null) {
            const y = currentY();
            const line = nearestLine(y);
            if (line !== null && Math.abs(line - y) <= AT_LINE_PX) anchor = line;
        }
        if (deltaY) lastDirection = Math.sign(deltaY);
        clearTimeout(timer);
        timer = setTimeout(run, DEBOUNCE_MS);
    }

    function run() {
        timer = null;
        if (paused) return;

        const points = getSnapPoints();
        if (points.length === 0) return;

        const y = currentY();
        const threshold = window.innerHeight * THRESHOLD_RATIO;

        const nearest = nearestLine(y);
        if (nearest === null) return;
        if (Math.abs(nearest - y) <= AT_LINE_PX) {
            // Resting on a line already; nothing to correct. Arriving here is
            // also what clears the fight counter — the visitor is settled, so
            // the next departure starts from a clean slate.
            if (anchor !== nearest) backSnaps = 0;
            anchor = nearest;
            return;
        }

        // The rule both library modes were missing. If the nearest line is the
        // one the visitor is docked at and snapping would drag them back onto
        // it, and we have already pulled them back once, they are deliberately
        // leaving — carry them to the next line in the direction they are
        // actually travelling instead of undoing their scroll again.
        const wouldGoBackward = Math.sign(nearest - y) === -lastDirection;
        const fightingDeparture =
            nearest === anchor && wouldGoBackward && lastDirection !== 0 && backSnaps >= 1;

        if (!fightingDeparture) {
            // Ordinary case: settle onto the nearest line if it is close
            // enough. Out of range means the visitor is deep inside a section
            // taller than the threshold allows for — leave them alone.
            if (Math.abs(nearest - y) > threshold) return;
            if (nearest === anchor) backSnaps += 1;
            else backSnaps = 0;
            anchor = nearest;
            lenis.scrollTo(nearest, { duration: DURATION_S });
            return;
        }

        const ahead = lastDirection > 0
            ? points.find((value) => value > y + AT_LINE_PX)
            : [...points].reverse().find((value) => value < y - AT_LINE_PX);
        if (ahead === undefined) return; // end of the page

        // Reaching the next line usually means travelling nearly a whole gap,
        // which is further than `threshold` — so the normal threshold cannot
        // be the test here, or an insistent visitor gets stranded mid-gap
        // (measured: stuck at 897, with the next line 491px away against a
        // 467px threshold). What matters instead is whether there is anything
        // BETWEEN the two lines worth stopping on:
        //
        //   - Gap within about one screen: the section fits the viewport, so
        //     mid-gap is just the seam between two sections. Carry them across
        //     it however far it is.
        //   - Gap larger than that: the section is genuinely taller than the
        //     screen (#projects with a row expanded, 1.33x) and its middle is
        //     real content. Fall back to the threshold, which leaves that
        //     middle freely scrollable.
        const gap = Math.abs(ahead - anchor);
        const fitsOneScreen = gap <= window.innerHeight * 1.05;
        if (!fitsOneScreen && Math.abs(ahead - y) > threshold) return;

        backSnaps = 0;
        anchor = ahead;
        lenis.scrollTo(ahead, { duration: DURATION_S });
    }

    lenis.on("virtual-scroll", onVirtualScroll);

    return {
        // stop()/start() keep the same shape the section entrance holds already
        // call on the old lenis/snap instance (about.jsx, my-taste.jsx,
        // connect.jsx), so this swap needs no changes in those files.
        stop() {
            paused = true;
            clearTimeout(timer);
            timer = null;
        },
        start() {
            paused = false;
        },
        destroy() {
            clearTimeout(timer);
            timer = null;
            lenis.off("virtual-scroll", onVirtualScroll);
        },
    };
}
