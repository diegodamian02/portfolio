import { useRef } from "react";
import "../styles/main.scss";
import costaVerde from "../assets/about/costa-verde.jpg";
import rutgersCampus from "../assets/about/rutgers-campus.jpg";
import trump from "../assets/trump.jpeg";
import codewiz from "../assets/codewiz.jpeg";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, SIGNATURE_EASE } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import WorkMotif from "../components/work-motif.jsx";

// Experience — Stage 3 Task 9, then Stage 9 follow-up (2026-08-27): the
// filmstrip is a NATIVE horizontal scroller now, not a ScrollTrigger pin.
//
// Task 9 rebuilt this section as a `pin: true` + `scrub` filmstrip: it held
// the section fixed and converted vertical scroll into sideways travel. That
// mechanism is exactly what made it feel like a trap — every attempt to
// "scroll down to the next section" was spent scrubbing the filmstrip
// instead. Three follow-ups chipped at the symptom (shorter pin, horizontal-
// wheel routing, a touch-drag handler) without removing the cause. This
// change removes the cause: no pin, no scrub, no ScrollTrigger driving the
// track. `.experience-viewport` is `overflow-x: auto` — the browser scrolls
// it. A vertical gesture passes straight through to the page; only a
// horizontal one (trackpad swipe, shift+wheel, touch pan) moves the
// filmstrip. `data-lenis-prevent-horizontal` on the viewport is what lets
// the native horizontal scroll through — see smooth-scroll.jsx.
//
// What's kept from Task 9: the center-focus emphasis (scale/opacity falloff),
// the once-per-card year scramble, the draw-in rail with its progress dot —
// all now driven by `viewportEl.scrollLeft` instead of ScrollTrigger
// progress. What's gone: PIN_LENGTH_VH_MULTIPLIER, ENTRY_BUFFER, the snap
// function, the pin-engage flourish, the bespoke touch handler (native
// overflow scroll gives touch drag + momentum for free). The filmstrip
// free-scrolls now — no snap of any kind; CSS scroll-snap re-snaps small
// wheel nudges back and reads as stuck (see main.scss).
//
// Content roster and the Rutgers-year reasoning are unchanged from Task 7.
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
        const viewportEl = viewportRef.current;
        const trackEl = trackRef.current;
        const cards = cardRefs.current;
        const dates = dateRefs.current;
        // Scrambled once, ever, per card — not re-fired every time the same
        // card re-becomes active on scroll-back. Tested the alternative
        // (re-fire on every activation) empirically: on a quick back-and-
        // forth the digits kept interrupting each other mid-scramble,
        // reading as noise rather than the "one deliberate detail" Task 7
        // established this effect as. Once-only kept that intact.
        const scrambled = new Array(entries.length).fill(false);
        let activeIndex = -1;
        let centers = [];
        let maxScroll = 0;

        // Rail draw + progress dot. A PAUSED timeline scrubbed by hand from
        // the scroll handler via .progress() — NOT a ScrollTrigger scrub.
        // The filmstrip is a native horizontal scroller now, so the single
        // source of truth for "where it is" is viewportEl.scrollLeft; the
        // emphasis calc, the active-card pick and this rail all read from it.
        const railTl = gsap.timeline({ paused: true });
        railTl.to(railPathRef.current, { drawSVG: "100%", ease: "none", duration: 1 }, 0);
        railTl.to(railDotRef.current, {
            motionPath: { path: railPathRef.current, autoRotate: false },
            ease: "none",
            duration: 1,
        }, 0);

        // Card width/gap are fixed (CSS clamp, not content-dependent like
        // Task 7/8's variable-height rows), so this measures synchronously on
        // mount — nothing here depends on image decode or caption line count.
        // Re-run from a ResizeObserver below for the section-scoped webfont
        // swap-in and any window resize.
        function measure() {
            // Real measured pixels on BOTH viewBox axes, not an abstract
            // width-only box with an arbitrary height — Task 7 hit this
            // exact issue on the vertical spine: a viewBox whose two axes
            // don't scale 1:1 against their real rendered box stretches a
            // circle into an ellipse. railH is the rail strip's own real
            // rendered height (not the --experience-rail-h custom property
            // string), so trackW×railH here matches real px on both axes.
            const railH = railSvgRef.current.clientHeight || 1;
            const trackW = Math.max(1, trackEl.scrollWidth);
            centers = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
            railSvgRef.current.setAttribute("viewBox", `0 0 ${trackW} ${railH}`);
            railPathRef.current.setAttribute("d", `M0,${railH / 2} L${trackW},${railH / 2}`);
            // Dot starts exactly at the path's own start point — MotionPath
            // then transforms it FORWARD from there (cx/cy matching the M
            // command), so progress:0 needs no corrective jump.
            railDotRef.current.setAttribute("cx", 0);
            railDotRef.current.setAttribute("cy", railH / 2);
            // Re-hide + re-init the scrub against the new geometry: a
            // dasharray / motion path cached against a stale `d` renders
            // wrong regardless of the progress applied on top of it (Task
            // 7/8's vertical-spine lesson).
            gsap.set(railPathRef.current, { drawSVG: "0%" });
            railTl.invalidate();
            // The native horizontal scroll range of the viewport. The track's
            // own `padding-inline: calc(50% - card-w/2)` (main.scss) is what
            // makes scrollLeft:0 center card 0 and scrollLeft:maxScroll center
            // the last card, so this needs no JS-computed offset.
            maxScroll = Math.max(0, viewportEl.scrollWidth - viewportEl.clientWidth);
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

        // Driven by viewportEl.scrollLeft — the one source of truth now that
        // the track scrolls natively. Shared by the emphasis calc, the
        // active-card pick and the rail scrub.
        function update() {
            const scrollLeft = viewportEl.scrollLeft;
            const viewportCenter = viewportEl.clientWidth / 2;
            const maxDist = viewportEl.clientWidth * FALLOFF_RANGE;
            let nearestIndex = 0;
            let nearestDist = Infinity;

            centers.forEach((c, i) => {
                const dist = Math.abs(c - scrollLeft - viewportCenter);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIndex = i;
                }
                const falloff = gsap.utils.clamp(0, 1, 1 - dist / maxDist);
                gsap.set(cards[i], {
                    scale: MIN_SCALE + (MAX_SCALE - MIN_SCALE) * falloff,
                    opacity: MIN_OPACITY + (1 - MIN_OPACITY) * falloff,
                });
            });

            setActive(nearestIndex);
            // Tabbing to an off-screen card no longer fights anything (B21):
            // there's no pin, and the card is genuinely off to the side in an
            // overflow-x container, so the browser's focus-into-view scrolls
            // the VIEWPORT sideways to reveal it — the correct axis. All
            // cards stay tabIndex=0 (set in JSX).
            railTl.progress(maxScroll > 0 ? scrollLeft / maxScroll : 0);
        }

        measure();
        update();

        // Reveal on scroll-into-view — a plain trigger, no pin, no scrub
        // (the same lightweight entrance #projects uses). Replaces the old
        // pin-engage flourish, which fired the instant the section snapped
        // to `position: fixed` — a moment that no longer exists.
        gsap.set(viewportEl, { opacity: 0, scale: 0.985 });
        const reveal = ScrollTrigger.create({
            trigger: rootRef.current,
            start: "top 80%",
            once: true,
            onEnter: () => gsap.to(viewportEl, { opacity: 1, scale: 1, duration: 0.5, ease: SIGNATURE_EASE }),
        });
        // Deep link straight to (or below) #experience: the trigger's start
        // is already above the viewport on mount, so onEnter never fires —
        // show it outright.
        if (rootRef.current.getBoundingClientRect().top < window.innerHeight * 0.8) {
            gsap.set(viewportEl, { opacity: 1, scale: 1 });
        }

        // The native horizontal scroll of the viewport is the only driver.
        // A vertical gesture never reaches here — it scrolls the page past
        // the section, which is the whole point of this rebuild.
        const onScroll = () => update();
        viewportEl.addEventListener("scroll", onScroll, { passive: true });

        // Card width/gap are CSS clamps and the section-scoped webfonts swap
        // in a beat after first paint — re-measure on any track/viewport
        // resize so centers[] and the rail geometry track real layout (the
        // same font-swap staleness smooth-scroll.jsx guards page-wide).
        const ro = new ResizeObserver(() => { measure(); update(); });
        ro.observe(trackEl);
        ro.observe(viewportEl);

        return () => {
            viewportEl.removeEventListener("scroll", onScroll);
            ro.disconnect();
            reveal.kill();
            railTl.kill();
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
                {/* data-lenis-prevent-horizontal: a horizontally-dominant
                    wheel/trackpad gesture over this element is left to the
                    browser's own overflow-x scroll instead of being fed to
                    Lenis as page scroll (checked per-event in lenis.mjs, so a
                    vertical gesture here still scrolls the page normally). The
                    same opt-out #my-taste's mobile snap rows carry. */}
                <div className="experience-viewport" ref={viewportRef} data-lenis-prevent-horizontal>
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
                                // not just whichever one is active. Tabbing to
                                // an off-screen card scrolls the viewport
                                // sideways to reveal it (native overflow-x) —
                                // it does not drive the emphasis calc directly.
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
