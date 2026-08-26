import { useRef } from "react";
import "../styles/main.scss";
import costaVerde from "../assets/about/costa-verde.jpg";
import rutgersCampus from "../assets/about/rutgers-campus.jpg";
import trump from "../assets/trump.jpeg";
import codewiz from "../assets/codewiz.jpeg";
import { useGSAP } from "@gsap/react";
import { gsap, SIGNATURE_EASE, FILMSTRIP_SETTLE_EASE } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import WorkMotif from "../components/work-motif.jsx";
import { getActiveLenis } from "../lib/scroll.js";

// Experience — Stage 3 Task 9. REPLACES Task 7/8's vertical alternating-
// spine layout entirely: a pinned, horizontally-scrubbed filmstrip instead
// of a tall stacked list. Built because Task 8's own numbers proved the
// vertical shape couldn't hold both "images should read as real photos" and
// "fits on one screen" at once — every row's height was dominated by the
// image (removing the old text column never traded against that, it just
// added height on top of it), so bigger photos could only ever mean a taller
// section. Pinning at a FIXED footprint and scrubbing sideways removes that
// coupling outright: six entries cost the same vertical space as one.
//
// Content roster and the Rutgers-year reasoning are unchanged from Task 7 —
// see that commit. Nothing else survives structurally: no .experience-item/
// -connector/-card-as-flex-row, no vertical .experience-spine, no per-card
// hover-only caption. Read this file fresh rather than assuming Task 8's
// shape still applies anywhere.
const EXPERIENCE_ENTRIES = [
    {
        id: "colegio",
        year: "2019",
        role: "Colegio Peruano Británico",
        caption: null,
        image: costaVerde,
        imageAlt: "Costa Verde, the cliffside coastline of Miraflores, Lima",
    },
    {
        id: "rutgers",
        year: "2021",
        role: "Rutgers University",
        caption: "B.S. Computer Science, minor in Music Technology.",
        image: rutgersCampus,
        imageAlt: "The gate at Old Queens, Rutgers University's original campus building",
    },
    {
        id: "trump",
        year: "2024",
        role: "Trump National Golf Club",
        caption: "Food runner at Clubhouse.",
        image: trump,
        imageAlt: "The Clubhouse team at Trump National Golf Club",
    },
    {
        id: "codewiz",
        year: "2024",
        role: "CodeWiz — Coding Coach",
        caption: "Taught Python & Java to students ages 7–17.",
        image: codewiz,
        imageAlt: "Coaching a student through a laptop exercise at CodeWiz",
    },
    {
        id: "globallogic",
        year: "2025",
        role: "GlobalLogic — Trainee Test Engineer",
        caption: "End-to-end test automation — Java, Selenium, Cucumber.",
        motif: "nodes",
    },
    {
        id: "capgemini",
        year: "2026",
        role: "Capgemini — Test Engineer",
        caption: "Weekly regression testing on Archy, McDonald's AI drive-thru system.",
        motif: "scan",
        // cdn.simpleicons.org/capgemini 404s (tested, unchanged since Task 7)
        // — no Capgemini mark exists in the icon set, so the lockup stays
        // mixed: "Capgemini" as text, the real McDonald's mark for the half
        // that resolves.
        clientBadge: true,
    },
];

function ClientBadge() {
    return (
        <div className="experience-client-badge">
            <span className="experience-client-badge-text">Capgemini</span>
            <span className="experience-client-badge-x" aria-hidden="true">×</span>
            <img src="https://cdn.simpleicons.org/mcdonalds" alt="McDonald's" className="experience-client-badge-icon" />
        </div>
    );
}

// No propTypes convention or dependency in this codebase (checked
// package.json/node_modules before relying on that, same as turntable.jsx's
// `track` prop and smooth-scroll.jsx's `children`) — a single block-disable
// here rather than one eslint-disable-next-line per usage, since `entry`/
// `entries` are each read at many separate lines across these three
// components, not just at their destructuring site. Held at the 16-error
// baseline deliberately (CLAUDE.md) — this suppresses the new errors this
// file's props would otherwise add, it doesn't remove any of the existing
// 16.
/* eslint-disable react/prop-types */
function EntryMedia({ entry }) {
    return (
        <div className="experience-media">
            {entry.image && <img src={entry.image} alt={entry.imageAlt} className="experience-image" />}
            {entry.motif && <WorkMotif variant={entry.motif} />}
            {entry.clientBadge && <ClientBadge />}
        </div>
    );
}

// Reduced-motion fallback — a forced horizontal scrub is a poor fit for
// reduced-motion users (brief's own words), so this isn't the filmstrip with
// the pin/scrub/scale removed, it's a genuinely different, plain document:
// no pin, no transform, everything in normal document flow and always
// visible. Picked via a JS-level branch (useReducedMotion() below), not a
// CSS-hidden duplicate — rendering both would mean every photo on the page
// loads twice.
function ExperienceStatic({ entries }) {
    return (
        <section className="experience-section experience-section--static">
            <h2 className="experience-title">Experience</h2>
            <div className="experience-container">
                <ul className="experience-static-list">
                    {entries.map((entry) => (
                        <li className="experience-static-item" key={entry.id}>
                            <EntryMedia entry={entry} />
                            <div className="experience-static-info">
                                <span className="experience-static-date">{entry.year}</span>
                                <h3>{entry.role}</h3>
                                {entry.caption && <p>{entry.caption}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

// How far off-center (as a fraction of viewport width) a card can be before
// it's fully receded to MIN_SCALE/MIN_OPACITY. 0.42 means a card has to be
// most of a viewport-width away to bottom out — tuned so the immediate
// neighbors of the active card are still clearly visible (this is a
// filmstrip, not a single-card-at-a-time carousel) while still reading as a
// clear falloff, not a flat wash of equal-weight cards.
const FALLOFF_RANGE = 0.42;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.08;
const MIN_OPACITY = 0.4;

function ExperienceFilmstrip({ entries }) {
    const rootRef = useRef(null);
    const viewportRef = useRef(null);
    const trackRef = useRef(null);
    const railSvgRef = useRef(null);
    const railPathRef = useRef(null);
    const railDotRef = useRef(null);
    const cardRefs = useRef([]);
    const dateRefs = useRef([]);
    cardRefs.current = [];
    dateRefs.current = [];

    useGSAP(() => {
        const cards = cardRefs.current;
        const dates = dateRefs.current;
        // Scrambled once, ever, per card — not re-fired every time the same
        // card re-becomes active on scroll-back. Tested the alternative
        // (re-fire on every activation) empirically: on a quick back-and-
        // forth scrub the digits kept interrupting each other mid-scramble,
        // reading as noise rather than the "one deliberate detail" Task 7
        // established this effect as. Once-only kept that intact.
        const scrambled = new Array(entries.length).fill(false);
        let activeIndex = -1;
        let centers = [];
        let scrollDistance = 0;

        // Card width/gap are fixed (CSS clamp, not content-dependent like
        // Task 7/8's variable-height rows), so unlike that build this can
        // measure synchronously on mount rather than deferring to a
        // ScrollTrigger onEnter — nothing here depends on image decode or
        // caption line count.
        function measure() {
            const viewportW = viewportRef.current.clientWidth;
            const trackW = trackRef.current.scrollWidth;
            // Real measured pixels on BOTH viewBox axes, not an abstract
            // width-only box with an arbitrary height — Task 7 hit this
            // exact issue on the vertical spine: a viewBox whose two axes
            // don't scale 1:1 against their real rendered box stretches a
            // circle into an ellipse. railH is the rail strip's own real
            // rendered height (not the --experience-rail-h custom property
            // string), so trackW×railH here matches real px on both axes
            // the same way SPINE_W×H did there.
            const railH = railSvgRef.current.clientHeight || 1;
            centers = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
            railSvgRef.current.setAttribute("viewBox", `0 0 ${Math.max(1, trackW)} ${railH}`);
            railPathRef.current.setAttribute("d", `M0,${railH / 2} L${Math.max(1, trackW)},${railH / 2}`);
            // Dot starts pinned exactly at the path's own start point —
            // MotionPathPlugin then transforms it FORWARD from wherever it
            // already sits, same convention Task 7's vertical dot used
            // (cx/cy matching the path's M command exactly), so progress:0
            // needs no corrective jump.
            railDotRef.current.setAttribute("cx", 0);
            railDotRef.current.setAttribute("cy", railH / 2);
            // Re-hide against the real geometry — same DrawSVGPlugin
            // re-application-after-`d`-change reasoning Task 7/8 used for
            // the vertical spine: a dasharray computed against stale
            // geometry leaves the draw looking wrong regardless of what
            // drawSVG value gets applied on top of it afterward.
            gsap.set(railPathRef.current, { drawSVG: "0%" });
            scrollDistance = Math.max(0, trackW - viewportW);
            return { viewportW, trackW };
        }

        function setActive(i) {
            if (i === activeIndex) return;
            if (activeIndex >= 0 && cards[activeIndex]) cards[activeIndex].classList.remove("is-active");
            cards[i].classList.add("is-active");
            activeIndex = i;
            if (!scrambled[i]) {
                scrambled[i] = true;
                gsap.to(dates[i], {
                    scrambleText: { text: entries[i].year, chars: "0123456789", speed: 0.5 },
                    duration: 0.35,
                });
            }
        }

        // Driven by the CURRENT track x (read directly off the tween's own
        // target, not re-derived from ScrollTrigger progress separately) —
        // one source of truth for "where the filmstrip actually is" shared
        // by the emphasis calc, the active-card pick, and (implicitly) the
        // rail draw/dot, which all move off the SAME scrubbed timeline.
        function updateEmphasis() {
            const trackX = gsap.getProperty(trackRef.current, "x");
            const viewportCenter = viewportRef.current.clientWidth / 2;
            const maxDist = viewportRef.current.clientWidth * FALLOFF_RANGE;
            let nearestIndex = 0;
            let nearestDist = Infinity;

            centers.forEach((c, i) => {
                const dist = Math.abs(c + trackX - viewportCenter);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIndex = i;
                }
                const falloff = gsap.utils.clamp(0, 1, 1 - dist / maxDist);
                gsap.set(cards[i], {
                    scale: MIN_SCALE + (MAX_SCALE - MIN_SCALE) * falloff,
                    opacity: MIN_OPACITY + (1 - MIN_OPACITY) * falloff,
                });
                // Found in testing, not guessed: a real Tab-key walk through
                // every card (all six stayed tabIndex=0 regardless of scrub
                // position in an earlier version) reached ones sitting well
                // off-screen, transform-hidden by .experience-viewport's
                // overflow: hidden — and the BROWSER's native "scroll the
                // newly-focused element into view" heuristic doesn't know a
                // horizontal CSS transform put it there, so it tried
                // correcting with a vertical document scroll instead,
                // shoving real scrollY forward by ~289px in one Tab press
                // and visibly fighting the pin. Pulling near-invisible
                // cards out of the tab order entirely (rather than trying
                // to detect and undo the browser's own corrective scroll
                // after the fact) means Tab simply never lands on one, so
                // the browser never has a reason to try.
                cards[i].tabIndex = falloff > 0.15 ? 0 : -1;
            });

            setActive(nearestIndex);
        }

        measure();

        const navbarHeight = () =>
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--navbar-height")) || 0;

        // ENTRY_BUFFER — reported live, not caught in an idle test: "the
        // pin doesn't look centered" on a real trackpad. Root cause:
        // ordinary scroll momentum (Lenis's easing, or even just a normal
        // fast trackpad swipe) routinely carries scrollY PAST `start`
        // before the pin visually engages — the browser doesn't stop the
        // instant a threshold is crossed, it keeps gliding — and because
        // scrub reads real scroll position directly, that overshoot became
        // real scrub progress on the very first frame anyone saw this
        // section, off-centering card 0 by 150-175px (measured, scales
        // with viewport width) before any deliberate scrub input.
        //
        // First fix attempt was the same primitive About's Task 5 hold and
        // Task 8's entrance-pin both use for this exact class of problem —
        // lenis.scrollTo(self.start, {immediate:true, force:true}) inside
        // onEnter. Dropped after testing: unlike those two, this pin never
        // calls lenis.stop(), so scroll stays fully live the whole time —
        // and an immediate, force:true scrollTo fired from INSIDE a
        // scrollTrigger callback that's itself mid-way through processing a
        // live scrub synchronously re-enters Lenis's own scroll handling.
        // Confirmed by isolating it: with the correction in place, scrollY
        // read back completely frozen (Playwright verified zero movement
        // across 15 consecutive wheel ticks) — About's/Task 8's version
        // never hits this because .stop() right after the snap means
        // nothing re-enters afterward; this pin has nothing to stop.
        //
        // This version never touches real scroll position at all: the
        // timeline's first ENTRY_BUFFER px of scroll do nothing visually
        // (nothing is scheduled there — every real tween below starts at
        // time ENTRY_BUFFER, so the track/rail/dot simply hold their
        // pre-scrub gsap.set() state through that whole window), silently
        // absorbing whatever momentum carried the pin's engagement instead
        // of fighting it. 220px comfortably covers the measured 150-175px
        // range with margin. Declared BEFORE the timeline below — `end`
        // and `snapTo` both close over it inside functions GSAP may resolve
        // synchronously as part of constructing the ScrollTrigger, so it
        // has to already exist by then, not just by the time those
        // functions are eventually CALLED.
        const ENTRY_BUFFER = 220;

        // scrollTrigger is defined INLINE on the timeline's own config, not
        // built separately via ScrollTrigger.create() and attached after —
        // found via testing, not assumed: an early version created the
        // trigger standalone (pin+scrub configured on it) and pointed a
        // separately-created timeline at that INSTANCE via
        // `{ scrollTrigger: st }`. The pin half worked (a bare
        // ScrollTrigger.create() with pin:true genuinely pins on its own),
        // which is exactly what made this hard to catch from the pin alone
        // — but nothing actually wires an existing ScrollTrigger instance
        // to DRIVE a timeline's scrub that way, so the timeline had no
        // paused:true and no real scrub link, and simply autoplayed to its
        // end the instant it was created — track jumped straight to
        // x:-scrollDistance before any scroll input, confirmed via
        // Playwright (gentle small-tick scrolling still read x:-2280,
        // fully-scrubbed, on the very first frame the pin engaged). The fix
        // is what GSAP actually documents for this: pass the scrollTrigger
        // CONFIG OBJECT to gsap.timeline() directly, which constructs one
        // correctly-linked trigger for you.
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: rootRef.current,
                // navbarHeight-aware, same reasoning Task 7/8 used for their
                // own triggers — a nav click lands #experience per its CSS
                // scroll-margin-top (B3, lib/scroll.js), which already
                // accounts for the navbar; a plain "top top" here would
                // engage the pin at a DIFFERENT scroll position than where
                // a nav click lands, desyncing the two.
                start: () => "top top+=" + navbarHeight(),
                end: () => "+=" + (scrollDistance + ENTRY_BUFFER),
                pin: true,
                scrub: 0.3,
                invalidateOnRefresh: true,
                snap: entries.length > 1 ? {
                    snapTo: (value) => {
                        // Custom function, not a plain snapTo fraction —
                        // the entry buffer means progress:0 now spans a
                        // whole dead-zone segment, not one instantaneous
                        // point, so evenly-spaced fractions of the WHOLE
                        // 0-1 range would land snap targets past where
                        // each card's own segment actually sits. Maps
                        // progress back into buffer-adjusted card-index
                        // space, snaps to the nearest whole card, then back.
                        const total = scrollDistance + ENTRY_BUFFER;
                        const px = value * total;
                        const cardPx = Math.max(0, px - ENTRY_BUFFER);
                        const cardIndex = Math.round(cardPx / (scrollDistance / (entries.length - 1)));
                        const snappedPx = ENTRY_BUFFER + cardIndex * (scrollDistance / (entries.length - 1));
                        return snappedPx / total;
                    },
                    // Live feedback: "I get in between years and then it
                    // locks... doesn't feel that natural." Was
                    // SIGNATURE_EASE at 0.3s — that curve front-loads
                    // almost all its motion into the first third by design
                    // (lib/gsap.js), which is exactly what read as a
                    // lunge-then-hold "lock" instead of a settle. Swapped
                    // to FILMSTRIP_SETTLE_EASE (an even, un-front-loaded
                    // ease-out) with a slightly longer duration so the
                    // snap reads as a glide to rest, not a snap-lock.
                    duration: 0.45,
                    ease: FILMSTRIP_SETTLE_EASE,
                } : undefined,
                onRefreshInit: measure,
                onUpdate: updateEmphasis,
                onEnter: () => {
                    // The brief's "pin's engage transition" — CustomEase,
                    // and deliberately on the VIEWPORT wrapper, not the
                    // cards (those are already independently driven every
                    // frame by updateEmphasis; animating them here too
                    // would fight those same-frame gsap.set() calls).
                    //
                    // Opacity is NOT part of this anymore. It used to
                    // fromTo(0 -> 1) here on the theory that this was the
                    // section's reveal — it isn't: gsap.set() below already
                    // makes the viewport opacity:1 once, on mount, long
                    // before the user has scrolled anywhere near this
                    // section (confirmed by sampling: opacity already
                    // reads 1 while the section is still 400px+ away in
                    // normal document flow). So this fromTo was re-hiding
                    // and re-revealing content that was already fully
                    // visible, at the exact moment the pin engaged —
                    // measured mid-fade opacity dipping to ~0.84 right as
                    // the section snapped to `position: fixed`, which is
                    // the "abrupt... glitchy" flash live feedback called
                    // out. A scale-only settle keeps the tactile "it just
                    // caught" cue without ever touching opacity.
                    gsap.fromTo(viewportRef.current,
                        { scale: 0.985 },
                        { scale: 1, duration: 0.4, ease: SIGNATURE_EASE });
                },
            },
        });
        const st = tl.scrollTrigger;
        // Function-based end values (x here, "end" above) re-evaluate on
        // ScrollTrigger's own invalidate — required for this to survive a
        // window resize, since scrollDistance is measured, not constant.
        tl.to(trackRef.current, { x: () => -scrollDistance, duration: () => scrollDistance, ease: "none" }, ENTRY_BUFFER);
        tl.to(railPathRef.current, { drawSVG: "100%", duration: () => scrollDistance, ease: "none" }, ENTRY_BUFFER);
        tl.to(railDotRef.current, {
            motionPath: { path: railPathRef.current, autoRotate: false },
            duration: () => scrollDistance,
            ease: "none",
        }, ENTRY_BUFFER);

        // Initial state before any scroll input — card 0 centered, active,
        // scrambled once immediately (reads as part of the section simply
        // having arrived, not as a scroll-triggered event, since nothing
        // has scrolled yet).
        gsap.set(viewportRef.current, { opacity: 1, scale: 1 });
        updateEmphasis();

        // Mobile: a horizontal touch drag moves the filmstrip directly —
        // the touch counterpart to the horizontal-wheel fix wired globally in
        // smooth-scroll.jsx (gestureOrientation: "both"). Touch needs its OWN
        // path rather than reusing that one: Lenis leaves touch scrolling
        // NATIVE by default (`syncTouch: false`, deliberately unchanged) so
        // real OS scroll physics keep driving every section's normal vertical
        // drag, this one included — hijacking touch globally to get the
        // wheel fix's benefit would also change scroll FEEL everywhere else
        // on mobile, for sections that already work.
        //
        // So this talks to the live Lenis instance directly, and only acts
        // when a gesture over THIS viewport is horizontally dominant — a
        // vertical drag here is untouched and keeps using the same native
        // scroll path it already does today.
        let touchStartX = 0;
        let touchStartY = 0;
        let touchLastX = 0;
        let touchIsHorizontal = null; // decided once per gesture, on first move, not re-decided mid-drag

        function onTouchStart(e) {
            const t = e.touches[0];
            touchStartX = touchLastX = t.clientX;
            touchStartY = t.clientY;
            touchIsHorizontal = null;
        }
        function onTouchMove(e) {
            const t = e.touches[0];
            if (touchIsHorizontal === null) {
                touchIsHorizontal = Math.abs(t.clientX - touchStartX) > Math.abs(t.clientY - touchStartY);
            }
            if (!touchIsHorizontal) return; // vertical — leave the native scroll path alone
            const lenis = getActiveLenis();
            if (!lenis) return; // reduced motion never mounts this component at all, but guard anyway
            if (e.cancelable) e.preventDefault();
            // Same sign Lenis's own touch handling uses internally
            // (lenis.mjs onTouchMove: deltaX = -(clientX - start)) — dragging
            // the content LEFT is "forward", the same direction scrolling
            // down already is everywhere else on the page.
            const stepDx = -(t.clientX - touchLastX);
            touchLastX = t.clientX;
            lenis.scrollTo(lenis.scroll + stepDx, { immediate: true });
        }
        const viewportEl = viewportRef.current;
        // touchstart stays passive — nothing to prevent there, the gesture's
        // direction isn't known yet. touchmove cannot be passive: preventing
        // the browser's own scroll interpretation only works from a
        // non-passive listener.
        viewportEl.addEventListener("touchstart", onTouchStart, { passive: true });
        viewportEl.addEventListener("touchmove", onTouchMove, { passive: false });

        return () => {
            st.kill();
            viewportEl.removeEventListener("touchstart", onTouchStart);
            viewportEl.removeEventListener("touchmove", onTouchMove);
        };
    }, { scope: rootRef, dependencies: [] });

    return (
        <section className="experience-section" ref={rootRef}>
            <h2 className="experience-title">Experience</h2>
            {/* Shell exists purely so the fixed-height .experience-viewport can be
                centered within the space actually left BELOW the title (real flex
                layout) instead of the section's total height (the old fixed
                top: calc(50%...), which never accounted for the title at all) —
                see main.scss for why that overlapped the title on real, common
                window heights. */}
            <div className="experience-viewport-shell">
                <div className="experience-viewport" ref={viewportRef}>
                    <div className="experience-track" ref={trackRef}>
                        <svg className="experience-rail" aria-hidden="true" ref={railSvgRef}>
                            <path className="experience-rail-path" ref={railPathRef} />
                            <circle className="experience-rail-dot" ref={railDotRef} cx={0} cy={0} r={4} />
                        </svg>
                        {EXPERIENCE_ENTRIES.map((entry, i) => (
                            <div
                                className="experience-card"
                                key={entry.id}
                                ref={(el) => { if (el) cardRefs.current[i] = el; }}
                                // Focusable so a keyboard user can reach every
                                // card's peek-on-focus description (main.scss),
                                // not just whichever one is currently active —
                                // doesn't drive the scrub itself (see STATUS.md
                                // for why: syncing scroll position to focus
                                // order risks fighting Lenis/the pin, and
                                // nothing in the brief asked for it).
                                tabIndex={0}
                                role="group"
                                aria-label={entry.year + " — " + entry.role + (entry.caption ? " — " + entry.caption : "")}
                            >
                                <span
                                    className="experience-date"
                                    ref={(el) => { if (el) dateRefs.current[i] = el; }}
                                >
                                    {entry.year}
                                </span>
                                <EntryMedia entry={entry} />
                                <div className="experience-info">
                                    <h3>{entry.role}</h3>
                                    {entry.caption && <p>{entry.caption}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
/* eslint-enable react/prop-types */

export default function Experience() {
    const reduced = useReducedMotion();
    return reduced
        ? <ExperienceStatic entries={EXPERIENCE_ENTRIES} />
        : <ExperienceFilmstrip entries={EXPERIENCE_ENTRIES} />;
}
