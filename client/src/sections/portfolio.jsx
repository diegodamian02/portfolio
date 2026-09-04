import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useGSAP } from "@gsap/react";
import { gsap, Flip, SIGNATURE_EASE } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import { getActiveLenis } from "../lib/scroll.js";
import { cardHueFor } from "../lib/card-hue.js";
import projects from "../data/projectsData";
import "../styles/main.scss";

// Hand-drawn, stroke, currentColor — the one icon convention this codebase
// has (about.jsx's fact chips, turntable.jsx's transport glyphs). No icon
// library exists in package.json; a single chevron doesn't justify adding
// one. Rotated 180deg via CSS when its row is open (.portfolio-item.is-open).
const ChevronIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5.5 8 4.5 4.5L14.5 8" />
    </svg>
);

// Task 10.2 — scroll a just-opened row's full expanded content into view when
// it doesn't already fit. Reuses --scroll-offset (main.scss), the same
// nav-clearance constant scroll.js's own scrollToSection() reads via CSS
// scroll-margin-top rather than a duplicated JS number.
//
// NOT read as getComputedStyle(root).getPropertyValue("--scroll-offset") —
// tried that first and it silently returned 0 every time (caught live, not
// assumed correct from the code reading right): --scroll-offset is a
// calc(var(--navbar-height) + 24px) expression, and a plain custom-property
// read returns that unresolved calc() STRING, not a used-value number —
// parseFloat("calc(144px + 24px)") is NaN, and `|| 0` swallowed it silently.
// scrollMarginTop is a real used-value CSS property, not an arbitrary custom
// property string, so the browser resolves it to an actual px number even
// though its source is a calc()'d custom property — the exact same read
// Lenis's own scrollTo(element) does internally (confirmed in
// node_modules/lenis/dist/lenis.mjs) for this same reason. `.portfolio-item`
// doesn't carry scroll-margin-top itself (only `.content > section` does).
//
// Reads it off `#projects` specifically, found via getElementById rather
// than rowEl.closest("section") — tried closest() first and it silently
// returned 0 too (caught live): App.jsx wraps this component's own returned
// `<section className="portfolio-section">` inside a SECOND, outer
// `<section id="projects">`, so closest() from a row finds the inner one,
// which was never the element `.content > section` matched. getElementById
// is also what scrollToSection() itself uses to locate a section, so this
// stays consistent with the one other place in the codebase doing the same
// kind of lookup rather than inventing a second way to find it.
//
// Called AFTER everything else has settled (Flip's own onComplete, or a
// couple of frames after the reduced-motion state commit), not concurrently
// with the toggle — tried computing this once, upfront, and firing it
// alongside Flip.from() first, since that's what "read as one motion" most
// directly suggests. Live testing found that unreliable for reasons outside
// this component entirely: opening OR closing a row — even with Flip fully
// disabled (reduced motion) and every scroll call/scrollTop write this app
// makes traced and ruled out — measurably moves window.scrollY on its own,
// consistently and instantly, the moment the row's real content height
// changes. Confirmed it isn't scroll-anchoring (disabled overflow-anchor
// both via a real first-paint stylesheet rule and via inline styles on every
// element — no change), isn't a focus-follow effect (drift persisted with
// focus established well before the toggle, and with the button blurred
// before the layout change), isn't this app's own useHashScroll correction
// (persisted well past its own 2s settle window), and isn't a Playwright/
// headless artifact (reproduced headed, with real mouse-dispatched clicks).
// Whatever the underlying browser mechanism actually is, a delta computed
// against a "before" snapshot can't reliably predict where things land once
// it's also had a say — so instead of racing it, this measures the REAL,
// final position once both it and Flip are done, and corrects only if the
// row still isn't fully visible. Usually a small top-up, not a large jump,
// since that other mechanism is already doing part of the work.
function scrollExpandedRowIntoView(rowEl, { instant }) {
    if (!rowEl) return;

    const sectionEl = document.getElementById("projects") || rowEl;
    const navOffset = parseFloat(getComputedStyle(sectionEl).scrollMarginTop) || 0;
    const rect = rowEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const visibleTop = navOffset;
    const visibleBottom = viewportHeight;

    let delta = 0;
    if (rect.bottom > visibleBottom) {
        // Taller than the space actually available between the nav and the
        // viewport's own bottom edge — the whole row can never fit at once.
        // Land the top just below the nav (the same spot every anchor link
        // on this site already lands on) rather than chasing a bottom that
        // will always be a screen-height away.
        delta = rect.height > visibleBottom - visibleTop
            ? rect.top - visibleTop
            : rect.bottom - visibleBottom;
    } else if (rect.top < visibleTop) {
        // Bottom already fits, but something moved this row's own top
        // behind the fixed navbar — pull it down just clear of it.
        delta = rect.top - visibleTop;
    }

    if (delta === 0) return;

    const lenis = getActiveLenis();
    if (lenis) {
        lenis.scrollTo(lenis.scroll + delta, { immediate: instant, force: true });
    } else {
        // No Lenis instance: reduced motion (smooth-scroll.jsx never
        // constructs one in that mode) or a call landing before it's
        // mounted — native scroll is correct either way, same fallback
        // scrollToSection() itself uses.
        window.scrollBy({ top: delta, behavior: instant ? "instant" : "smooth" });
    }
}

// Stage 3 Task 10 (#projects) — refined list, single-open accordion, GSAP
// entrance. Direction from ROADMAP.md's Q1 still applies: shared design
// system (type scale, spacing, content-width tokens, main.scss), not
// bespoke material — this task is layout/interaction, not new visual
// language. Video/description/link handling is untouched from before this
// task; only the title, content column, dead CSS, and the open/close +
// entrance mechanics changed.
export default function Portfolio() {
    const [expandedProject, setExpandedProject] = useState(null);
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const prefersReducedMotion = useReducedMotion();

    // Single-open accordion, swap coordinated via GSAP Flip rather than the
    // old row closing and the new one opening reading as two separate
    // actions. Flip.getState() reads every row's real, current
    // offsetHeight/position BEFORE React touches the DOM; flushSync forces
    // that state update to commit synchronously (not on React's own batched
    // schedule) so Flip.from() below measures the real "after" layout on
    // the very next line instead of racing a pending render — the standard
    // GSAP-Flip-with-React pattern for exactly this case. Reduced-motion
    // visitors skip straight to the plain state change, no Flip involved —
    // same discipline already established for About/Experience/My Taste's
    // own entrances.
    const toggleProject = (id) => {
        const nextId = expandedProject === id ? null : id;
        const container = listRef.current;

        if (!container) {
            // Ref not attached yet — shouldn't happen once mounted. Degrades
            // to the plain state change, same as before this task; no row
            // element to measure for a scroll target anyway.
            setExpandedProject(nextId);
            return;
        }

        if (prefersReducedMotion) {
            // flushSync here for the same reason the Flip branch below
            // needs it: measuring the row's real settled position requires
            // the DOM commit to have already happened, not be pending on
            // React's own batched schedule. Instant jump, not an eased
            // scroll — functional correction, not decoration, so reduced
            // motion gets the repositioning without the animation, same
            // distinction already made elsewhere on this site (Task 10's
            // own entrance, About's hold).
            //
            // Deferred one frame, not called synchronously right here — see
            // scrollExpandedRowIntoView's own comment. The browser's own
            // reaction to this same DOM commit (confirmed live, present with
            // zero animation involved and no scroll call of this app's own
            // in sight) still needs a frame to happen; measuring before that
            // computes a target that's already stale by the next paint.
            flushSync(() => setExpandedProject(nextId));
            if (nextId !== null) {
                requestAnimationFrame(() => {
                    scrollExpandedRowIntoView(container.querySelector(`[data-project-id="${nextId}"]`), { instant: true });
                });
            }
            return;
        }

        const state = Flip.getState(container.querySelectorAll(".portfolio-item, .portfolio-details"));

        // Pin the container's own height for the tween's duration. Found
        // live while building the scroll target below: .portfolio-list has
        // no explicit `position` (defaults to static) and no height of its
        // own — it's sized purely by its children's normal-flow
        // contribution. `absolute: true` (Task 10.1) takes every row out of
        // flow AT ONCE for the tween, so with nothing pinning it,
        // .portfolio-list collapsed to 0px height for the whole ~400ms —
        // confirmed via a frame-by-frame poll: total document height
        // dropped by ~895px the instant the tween started and didn't
        // recover until it finished, with #connect and the footer shifting
        // upward to fill the gap the entire time. That's a real, page-wide
        // reflow happening WHILE Flip's own tween runs, independent of
        // anything scroll-related — it just had no way to surface before
        // this task, since nothing previously depended on document-level
        // geometry staying stable mid-tween. It's exactly what was
        // corrupting the scroll target below (computed once, synchronously,
        // against the correct pre-collapse layout, then landing wrong once
        // the page reflowed underneath it during the 400ms that followed).
        // GSAP's own documented fix for this exact Flip + absolute +
        // accordion combination: lock the container to a fixed pixel height
        // so it can't collapse, release it once the tween completes. Locked
        // to whichever of the before/after states is taller, not just
        // "before" — pinning to only the pre-toggle height would leave the
        // container briefly shorter than a taller incoming row needs, right
        // as Flip's own cleanup returns children to normal flow a beat
        // before this component's onComplete below clears the lock.
        const beforeHeight = container.offsetHeight;

        flushSync(() => setExpandedProject(nextId));

        // Still normal static flow at this exact point — Flip.from() below
        // is what switches everything to `position: absolute`, and it
        // hasn't run yet — so this is a real, natural measurement of the
        // new committed state's own height, not a guess.
        const afterHeight = container.offsetHeight;
        container.style.height = `${Math.max(beforeHeight, afterHeight)}px`;

        Flip.from(state, {
            // Re-queried AFTER the DOM update — Flip diffs this "after" set
            // against `state`'s "before" set itself: present in both means
            // tween the row's real height/position (its own bounding box
            // changed as content above/below it opened or closed); present
            // only in "after" is onEnter (the newly-opened row's own
            // .portfolio-details, which didn't exist a moment ago); present
            // only in "before" is onLeave (the row that just closed).
            targets: container.querySelectorAll(".portfolio-item, .portfolio-details"),
            // Task 10.1 fix. duration/ease here match the mockup's own
            // measured feel exactly (power2.inOut, 0.4s) — these were
            // already being passed explicitly before (not left at Flip's
            // defaults, contrary to that being the first suspected cause),
            // just with the wrong values (0.5s + SIGNATURE_EASE). The
            // bigger contributor, confirmed live with a per-frame bounding-
            // box trace on an uninvolved sibling row: WITHOUT `absolute:
            // true`, the closing/opening rows tween their real height while
            // still sitting in normal document flow, so every row below
            // them gets pushed around twice at once — once by the browser's
            // own native reflow as that live height changes, and again by
            // Flip's own transform correction for the same delta. The trace
            // showed exactly that: a hard jump, ~480ms of real easing, then
            // a second hard ~210px snap the instant the tween ended (the
            // leftover, un-eased delta the two mechanisms hadn't agreed on).
            // `absolute: true` is GSAP's own documented fix for this exact
            // list/accordion case — it takes every animating target out of
            // flow for the tween's duration so siblings move purely off
            // Flip's computed delta, not fighting native reflow too.
            // getState()'s own scope was NOT the bug — it was already the
            // whole list (all four rows), not just the clicked one, despite
            // that being the second suspected cause.
            duration: 0.4,
            ease: "power2.inOut",
            absolute: true,
            onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.15 }),
            onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2 }),
            onComplete: () => {
                // Releases the height lock above back to auto —
                // .portfolio-list resumes sizing itself off its real
                // children.
                container.style.height = "";
                // The scroll-into-view check runs HERE, after Flip's own
                // tween has finished, not before — see
                // scrollExpandedRowIntoView's own comment for why. One
                // extra frame first: the whatever-it-is browser mechanism
                // that comment describes doesn't necessarily finish
                // reacting in the exact same frame Flip's onComplete fires
                // (measured live: without this, the correction consistently
                // undershot by single-digit-to-teens pixels, not the large
                // miss an actually-wrong calculation would produce — a
                // one-frame-late measurement, not a wrong one). Swap case
                // (row A closes, row B opens) scrolls toward B, the row the
                // visitor is actually trying to see — closing a row with
                // nothing new opening never reaches this at all (nextId is
                // only non-null when something is opening).
                if (nextId !== null) {
                    requestAnimationFrame(() => {
                        scrollExpandedRowIntoView(container.querySelector(`[data-project-id="${nextId}"]`), { instant: false });
                    });
                }
            },
        });
    };

    // Entrance — a lightweight staggered reveal on scroll-into-view, no
    // pin, no scrub. This section doesn't have Experience's "more content
    // than fits" problem, so it doesn't need a scroll-hold the way
    // About/My Taste's own entrances do — which is also why this is a
    // scrollTrigger embedded directly on the tween rather than a separate
    // ScrollTrigger.create()/onEnter pair: there's no extra hold logic to
    // coordinate, so the simpler form is the honest one. `once: true` is
    // every existing entrance on this site's own convention (About, My
    // Taste) — no toggleActions/reverse precedent exists anywhere in the
    // tree to mirror instead, which settles the brief's own open question
    // here. Gated through gsap.matchMedia(), the pattern Stage 2
    // established for every media-query-scoped subsystem.
    useGSAP(() => {
        const rows = gsap.utils.toArray(".portfolio-item", listRef.current);
        if (!rows.length) return;

        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
            gsap.set(rows, { opacity: 0, y: 24 });

            gsap.to(rows, {
                opacity: 1,
                y: 0,
                duration: 0.45,
                ease: SIGNATURE_EASE,
                stagger: 0.09,
                clearProps: "opacity,transform",
                scrollTrigger: {
                    trigger: listRef.current,
                    start: "top 80%",
                    once: true,
                },
            });
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
            gsap.set(rows, { opacity: 1, y: 0 });
        });
    }, { scope: rootRef });

    return (
        <section className="portfolio-section" ref={rootRef}>
            <h2 className="portfolio-title">Projects</h2>
            <p className="portfolio-subtitle">Here are some of my selected projects worth sharing.</p>

            <div className="portfolio-list" ref={listRef}>
                {projects.map((project) => {
                    const isOpen = expandedProject === project.id;
                    const detailsId = `project-details-${project.id}`;

                    // Stage 11 Phase 2 — per-project "pressing" hue, same hash
                    // as #my-taste's cards. Keyed on the title, not the id:
                    // there are only four projects and their ids are the
                    // integers 1-4, which hash32 clusters (3 of 4 landed on one
                    // hue); the titles are distinct strings and split cleanly.
                    // Interim anyway — Phase 3 rebuilds this as a tracklist.
                    const hue = cardHueFor(project.title);

                    return (
                        <div
                            key={project.id}
                            className={`portfolio-item${isOpen ? " is-open" : ""}`}
                            data-project-id={project.id}
                            style={{ "--card-bg": `var(--card-tint-${hue})`, "--card-wax": `var(--wax-${hue})` }}
                        >
                            {/* Expandable Header — Stage 5 (continued): role is
                                a kicker ABOVE the title now, not a second column
                                floated right (two columns each wrapped
                                independently on a phone and read as a tangle).
                                Chevron sits at the top-right. */}
                            <button
                                className="portfolio-header"
                                onClick={() => toggleProject(project.id)}
                                aria-expanded={isOpen}
                                aria-controls={detailsId}
                            >
                                <span className="project-role">{project.role}</span>
                                <span className="project-title">{project.title}</span>
                                <span className="portfolio-chevron"><ChevronIcon /></span>
                            </button>

                            {/* The description is always rendered now — CSS
                                clamps it to 2 lines by default and the row's
                                own .is-open class un-clamps it (main.scss).
                                Moving it out of .portfolio-details means a
                                collapsed card actually says what the project is
                                instead of just its name. Its clamp -> full
                                height change lands inside the same flushSync
                                render toggleProject drives, so Flip.from's
                                "after" measurement captures it — the standard
                                Flip accordion pattern. */}
                            <p className="portfolio-summary">{project.description}</p>

                            {/* Expandable Content — video + links only now. */}
                            {isOpen && (
                                <div className="portfolio-details" id={detailsId}>
                                    {project.video && (
                                        // width/height as real HTML attributes (not just CSS) —
                                        // Task 10.1 fix. These establish the video's intrinsic
                                        // aspect-ratio synchronously, at layout time, independent
                                        // of whether the resource itself has loaded yet. Needed
                                        // because Flip.from()'s own "after" measurement (toggleProject
                                        // above) runs synchronously in the same tick as the DOM
                                        // commit — long before the video's async metadata load can
                                        // resolve, confirmed live via frame-by-frame trace (the
                                        // element still reported height:auto's collapsed/placeholder
                                        // size at the exact instant Flip read it, even though the
                                        // video finished loading a few frames later). Without a
                                        // reserved box, Flip locks in a too-small target height, the
                                        // row's true content height was 210px taller once the video's
                                        // real size applied, and the difference landed as an abrupt,
                                        // un-animated snap the instant the tween's own inline
                                        // overrides cleared — independent of duration/ease/absolute,
                                        // and not fixable by tuning any of those.
                                        <video
                                            controls
                                            preload="metadata"
                                            className="portfolio-video"
                                            width={project.videoWidth}
                                            height={project.videoHeight}
                                        >
                                            <source src={project.video} type="video/webm" />
                                            Your browser does not support the video tag.
                                        </video>
                                    )}
                                    <div className="portfolio-links">
                                        {project.github && <a href={project.github} target="_blank" rel="noopener noreferrer">GitHub</a>}
                                        {project.liveDemo && <a href={project.liveDemo} target="_blank" rel="noopener noreferrer">Live</a>}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
