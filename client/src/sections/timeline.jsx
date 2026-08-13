import { useRef } from "react";
import "../styles/main.scss";
import codewiz from "../assets/codewiz.jpeg";
import trump from "../assets/trump.jpeg";
import costaVerde from "../assets/about/costa-verde.jpg";
import rutgersCampus from "../assets/about/rutgers-campus.jpg";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import WorkMotif from "../components/work-motif.jsx";

// Work Experience, rebuilt as a full-bleed scroll-revealed timeline
// (Stage 3 Task 2 — see ROADMAP.md). Each entry is a cover panel: a real
// photo, or a generative motif (work-motif.jsx) where no photo exists.
//
// Moved into its own file and its own #timeline id, Stage 3 Task 4 — this
// used to share id="about" with the Bio section (see about.jsx, rebuilt the
// same task into a standalone intro). Splitting them out means "About" in
// the nav now actually means the person, and "Timeline" means the work
// history, instead of one id covering two unrelated things.
//
// Entries 1 and 2 use PLACEHOLDER photos (Unsplash, stored locally in
// assets/about/), flagged pending Diego's own photos — see STATUS.md.
// Entries 3 and 4 reuse Diego's own existing photos (trump.jpeg,
// codewiz.jpeg), already in the repo — not placeholders.
const WORK_ENTRIES = [
    {
        id: "colegio",
        role: "Colegio Peruano Británico",
        dates: "2019",
        caption: null,
        image: costaVerde,
        imageAlt: "Costa Verde, the cliffside coastline of Miraflores, Lima",
        parallax: true,
        placeholder: true,
    },
    {
        id: "rutgers",
        role: "Rutgers University",
        dates: "Sep 2021 – May 2025",
        caption: "B.S. Computer Science, minor in Music Technology.",
        image: rutgersCampus,
        imageAlt: "The gate at Old Queens, Rutgers University's original campus building",
        placeholder: true,
    },
    {
        id: "trump",
        role: "Trump National Golf Club",
        dates: "Jan – Aug 2024",
        caption: "Food runner at Clubhouse.",
        image: trump,
        imageAlt: "The Clubhouse team at Trump National Golf Club",
    },
    {
        id: "codewiz",
        role: "CodeWiz — Coding Coach",
        dates: "Aug 2024 – Jul 2025",
        caption: "Taught Python & Java to students ages 7–17.",
        image: codewiz,
        imageAlt: "Coaching a student through a laptop exercise at CodeWiz",
    },
    {
        id: "globallogic",
        role: "GlobalLogic — Trainee Test Engineer",
        dates: "May – Aug 2025",
        caption: "End-to-end test automation — Java, Selenium, Cucumber.",
        motif: "nodes",
    },
    {
        id: "capgemini",
        role: "Capgemini — Test Engineer",
        dates: "Apr 2026 – Present",
        caption: "Weekly regression testing on Archy, McDonald's AI drive-thru system.",
        motif: "scan",
        badge: true,
    },
    {
        id: "closing",
        role: "Music Technology",
        dates: null,
        caption:
            "A minor in Music Technology — the same interest behind the turntable up " +
            "top, and the thread running into what's below.",
        motif: "waveform",
    },
];

export default function Timeline() {
    const workRef = useRef(null);
    const reduced = useReducedMotion();

    // Migrates the old unthrottled `window.scroll` handler (setState on every
    // scroll event, driving a `.timeline` height percentage nothing actually
    // read visibly) to ScrollTrigger, per the Stage 2 prerequisite this task
    // was waiting on. Three independent things share one scope:
    //
    //   1. Per-panel reveal — toggleActions, NOT scrub. Each .timeline-item
    //      plays once on entering view and reverses on scrolling back above
    //      it. This is deliberately a different mechanism from the pinned,
    //      scrub-driven carousel planned for #projects (Stage 7).
    //   2. The rail fill — the one place this section IS scrubbed, since a
    //      progress indicator is supposed to track the scrollbar 1:1. Scoped
    //      to .work-experience itself, not any ancestor.
    //   3. Parallax on entry 1's photo only, scrub-linked for the same reason
    //      the rail is: continuous parallax has no "toggleActions" analogue.
    //
    // Reduced motion keeps the reveal and parallax still (panels simply are
    // visible, no swoop-in) but leaves the rail fill scrubbing — it moves
    // exactly 1:1 with the visitor's own scroll input, same category as a
    // native scrollbar thumb, not the autoplaying/differential motion
    // prefers-reduced-motion targets.
    useGSAP(() => {
        const items = gsap.utils.toArray(".timeline-item", workRef.current);

        if (reduced) {
            gsap.set(items, { opacity: 1, y: 0 });
        } else {
            items.forEach((item) => {
                gsap.fromTo(item,
                    { opacity: 0, y: 50 },
                    {
                        opacity: 1, y: 0, duration: 0.8, ease: "power2.out",
                        scrollTrigger: {
                            trigger: item,
                            start: "top 85%",
                            toggleActions: "play none none reverse",
                        },
                    });
            });

            const parallaxItem = workRef.current.querySelector('[data-parallax="true"]');
            const parallaxImg = parallaxItem?.querySelector(".timeline-image");
            if (parallaxImg) {
                gsap.fromTo(parallaxImg,
                    { yPercent: -8 },
                    {
                        yPercent: 8, ease: "none",
                        scrollTrigger: {
                            trigger: parallaxItem,
                            start: "top bottom",
                            end: "bottom top",
                            scrub: true,
                        },
                    });
            }
        }

        const railFill = workRef.current.querySelector(".timeline-rail-fill");
        if (railFill) {
            gsap.fromTo(railFill,
                { scaleY: 0 },
                {
                    scaleY: 1, ease: "none",
                    scrollTrigger: {
                        trigger: workRef.current,
                        start: "top top",
                        end: "bottom bottom",
                        scrub: true,
                    },
                });
        }
    }, { scope: workRef, dependencies: [reduced] });

    return (
        <section className="about-section work-experience" ref={workRef}>
            <h2 className="work-title">Work Experience</h2>
            <div className="timeline-container">
                <div className="timeline-rail" aria-hidden="true">
                    <div className="timeline-rail-fill" />
                </div>
                <div className="timeline">
                    {WORK_ENTRIES.map((entry) => (
                        <div
                            className="timeline-item"
                            key={entry.id}
                            data-parallax={entry.parallax ? "true" : undefined}
                        >
                            <div className="timeline-panel">
                                {entry.image && (
                                    <img src={entry.image} alt={entry.imageAlt} className="timeline-image" />
                                )}
                                {entry.motif && <WorkMotif variant={entry.motif} />}
                                {entry.badge && (
                                    <div className="timeline-badge">
                                        <span className="timeline-badge-text">Capgemini</span>
                                        <span className="timeline-badge-x" aria-hidden="true">×</span>
                                        {/* cdn.simpleicons.org/capgemini 404s (tested) — no Capgemini
                                            mark exists in the icon set, so that half of the lockup stays
                                            text. McDonald's resolves, so that half is the real mark. */}
                                        <img
                                            src="https://cdn.simpleicons.org/mcdonalds"
                                            alt="McDonald's"
                                            className="timeline-badge-icon"
                                        />
                                    </div>
                                )}
                                <div className="timeline-scrim" />
                                <div className="timeline-content">
                                    <h3>{entry.role}</h3>
                                    {entry.caption && <p>{entry.caption}</p>}
                                    {entry.dates && <span className="date">{entry.dates}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
