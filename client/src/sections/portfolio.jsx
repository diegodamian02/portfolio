import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useGSAP } from "@gsap/react";
import { gsap, Flip, SIGNATURE_EASE } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import projects from "../data/projectsData";
import "../styles/main.scss";

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

        if (!container || prefersReducedMotion) {
            setExpandedProject(nextId);
            return;
        }

        const state = Flip.getState(container.querySelectorAll(".portfolio-item, .portfolio-details"));

        flushSync(() => setExpandedProject(nextId));

        Flip.from(state, {
            // Re-queried AFTER the DOM update — Flip diffs this "after" set
            // against `state`'s "before" set itself: present in both means
            // tween the row's real height/position (its own bounding box
            // changed as content above/below it opened or closed); present
            // only in "after" is onEnter (the newly-opened row's own
            // .portfolio-details, which didn't exist a moment ago); present
            // only in "before" is onLeave (the row that just closed).
            targets: container.querySelectorAll(".portfolio-item, .portfolio-details"),
            duration: 0.5,
            ease: SIGNATURE_EASE,
            onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.15 }),
            onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2 }),
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

                    return (
                        <div key={project.id} className="portfolio-item">
                            {/* Expandable Header */}
                            <button
                                className="portfolio-header"
                                onClick={() => toggleProject(project.id)}
                                aria-expanded={isOpen}
                                aria-controls={detailsId}
                            >
                                <span className="project-title">{project.title}</span>
                                <span className="project-role">{project.role}</span>
                            </button>

                            {/* Expandable Content */}
                            {isOpen && (
                                <div className="portfolio-details" id={detailsId}>
                                    <p>{project.description}</p>
                                    {project.video && (
                                        <video controls preload="metadata" className="portfolio-video">
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
