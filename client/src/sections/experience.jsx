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

// Experience — Stage 3 Task 7. Rebuilds the full-bleed scroll-revealed
// timeline (Stage 3 Task 2, then Task 3's trims) as a compact, alternating
// two-column layout meant to read in one entrance beat rather than unfold
// over a long scroll. Renamed from Timeline/#timeline throughout the app
// (App.jsx, lib/sections.js, this file) — the section covers education
// (Colegio, Rutgers) and coaching (CodeWiz) as much as jobs, so "Timeline"
// undersold what it actually is.
//
// Same content roster as before, minus the closing "Music Technology" beat
// (About's bio already makes that bridge to #my-taste — Task 4/5 — so this
// section no longer needs to reach for it) and minus full month/date ranges
// (a compact year-only badge replaces the "Sep 2021 – May 2025" style text).
//
// Rutgers shows 2021, its START year, not 2025 (its end year) — flagged per
// the brief's own request to double-check this. Two independent reasons,
// not just a coin flip: (1) the brief already decided CodeWiz — ALSO a
// multi-year span (Aug 2024 – Jul 2025) — shows 2024, its start year;
// showing Rutgers' END year would be the one entry breaking that pattern.
// (2) more importantly, a vertical spine reads chronologically at a glance —
// start years keep every badge in this list monotonically increasing (2019,
// 2021, 2024, 2024, 2025, 2026); using 2025 for Rutgers would put a bigger
// number ABOVE two smaller ones (Trump/CodeWiz, 2024) two slots below it,
// which reads as a mistake on a spine whose whole job is "chronological at a
// glance," not as "Rutgers ran long."
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
        // cdn.simpleicons.org/capgemini 404s (tested, unchanged from the old
        // build) — no Capgemini mark exists in the icon set, so the lockup
        // stays mixed: "Capgemini" as text, the real McDonald's mark for the
        // half that resolves. Stays an overlay on the thumbnail (its
        // original position, just resized down), not moved beside the role
        // text — see the render below for why.
        clientBadge: true,
    },
];

// Spine SVG width, in the SAME px units as its viewBox (viewBox is set to
// match real measured height at animation time, but width is this fixed
// constant both places — see the useGSAP effect below and
// .experience-spine's CSS width, which must match). Small enough to read as
// a line with a node on it, not a bar.
const SPINE_W = 8;
const SPINE_DOT_R = 3;

// Total entrance budget, by design: spine draw ~1s, last node's card
// finishing ~0.4s after the dot reaches it — comes in under the brief's
// "~1.5s total, fast and confident" ceiling with room to spare, verified
// against the actual built timeline's .duration(), not just these source
// constants (see STATUS.md).
const SPINE_DRAW_DURATION = 0.95;
const CARD_DURATION = 0.4;
const SCRAMBLE_DURATION = 0.3;

export default function Experience() {
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const spineSvgRef = useRef(null);
    const spinePathRef = useRef(null);
    const spineDotRef = useRef(null);
    const reduced = useReducedMotion();

    // One entrance moment, not a sustained scroll sequence — the previous
    // build's per-panel toggleActions reveal, scrubbed rail-fill, and
    // scrubbed parallax are ALL gone, not adapted. ScrollTrigger fires once;
    // everything downstream runs on GSAP's own ticker from that single
    // trigger, same "decoupled from scroll input once started" shape
    // about.jsx's Task 5 hold uses for its own entrance.
    useGSAP(() => {
        const items = gsap.utils.toArray(".experience-item", listRef.current);
        const cards = gsap.utils.toArray(".experience-card", listRef.current);
        const badges = gsap.utils.toArray(".experience-badge", listRef.current);

        if (reduced) {
            gsap.set(cards, { opacity: 1, x: 0, y: 0 });
            gsap.set(spinePathRef.current, { drawSVG: "100%" });
            gsap.set(spineDotRef.current, { opacity: 0 });
            return;
        }

        gsap.set(cards, { opacity: 0, y: 16 });
        gsap.set(spineDotRef.current, { opacity: 0 });
        // Placeholder geometry so DrawSVGPlugin has a valid path to measure
        // before the real height is known (nothing renders regardless,
        // since drawSVG: "0%" hides the path no matter what its underlying
        // length is) — the real d/viewBox get set, and drawSVG re-applied
        // against THAT geometry, inside onEnter below.
        spinePathRef.current.setAttribute("d", `M${SPINE_W / 2},0 L${SPINE_W / 2},800`);
        gsap.set(spinePathRef.current, { drawSVG: "0%" });

        ScrollTrigger.create({
            trigger: rootRef.current,
            start: "top 70%",
            once: true,
            onEnter: () => {
                // Measured here, not at mount — by the time a visitor has
                // scrolled this far, images/fonts have had the whole rest of
                // the page's scroll to decode/settle, so this reads the
                // section's real, stable layout rather than a pre-paint
                // guess (same reasoning about.jsx's onEnter measurements
                // use).
                const listRect = listRef.current.getBoundingClientRect();
                const H = Math.max(1, listRect.height);

                spineSvgRef.current.setAttribute("viewBox", `0 0 ${SPINE_W} ${H}`);
                spinePathRef.current.setAttribute("d", `M${SPINE_W / 2},0 L${SPINE_W / 2},${H}`);
                // Re-hide against the NEW geometry — DrawSVGPlugin's
                // stroke-dasharray is computed from the path's length at the
                // moment drawSVG is set, so changing `d` after the earlier
                // "0%" (set against the 800px placeholder) would otherwise
                // leave a dasharray sized for the wrong length.
                gsap.set(spinePathRef.current, { drawSVG: "0%" });
                gsap.set(spineDotRef.current, { opacity: 1 });

                // Each badge's own rendered center, as a fraction of the
                // spine's total height — NOT an assumed 1/6, 2/6, 3/6...
                // even split, since entries with a caption vs. entries
                // without one (colegio has none) render at slightly
                // different heights. Real measurement, same discipline as
                // the height itself.
                const nodeTimes = badges.map((badge) => {
                    const r = badge.getBoundingClientRect();
                    const centerY = r.top + r.height / 2 - listRect.top;
                    const fraction = Math.min(1, Math.max(0, centerY / H));
                    return fraction * SPINE_DRAW_DURATION;
                });

                const tl = gsap.timeline();
                tl.to(spinePathRef.current, { drawSVG: "100%", duration: SPINE_DRAW_DURATION, ease: "none" }, 0);
                // Same duration, same linear ease, started at the same
                // timeline position as the draw above — rather than one
                // onUpdate driving both, keeping them as two independently
                // deterministic tweens is enough to stay visually locked
                // together (GSAP evaluates both from the same clock every
                // tick) without the extra proxy-object indirection turntable
                // tilt (about.jsx) needed for a DIFFERENT reason (two
                // properties on one element, not two elements together).
                tl.to(spineDotRef.current, {
                    motionPath: { path: spinePathRef.current, autoRotate: false },
                    duration: SPINE_DRAW_DURATION,
                    ease: "none",
                }, 0);

                items.forEach((item, i) => {
                    const t = nodeTimes[i] ?? 0;
                    // Scoped to ONLY the six year badges (brief's explicit
                    // constraint) — titles/captions never touch
                    // ScrambleTextPlugin.
                    tl.to(badges[i], {
                        scrambleText: { text: EXPERIENCE_ENTRIES[i].year, chars: "0123456789", speed: 0.5 },
                        duration: SCRAMBLE_DURATION,
                    }, t);
                    tl.to(cards[i], { opacity: 1, y: 0, duration: CARD_DURATION, ease: SIGNATURE_EASE }, t);
                });
            },
        });
    }, { scope: rootRef, dependencies: [reduced] });

    return (
        <section className="experience-section" ref={rootRef}>
            <h2 className="experience-title">Experience</h2>
            <div className="experience-container">
                <div className="experience-list" ref={listRef}>
                    <svg className="experience-spine" aria-hidden="true" ref={spineSvgRef}>
                        <path className="experience-spine-path" ref={spinePathRef} />
                        <circle
                            className="experience-spine-dot"
                            ref={spineDotRef}
                            cx={SPINE_W / 2}
                            cy={0}
                            r={SPINE_DOT_R}
                        />
                    </svg>
                    {EXPERIENCE_ENTRIES.map((entry, i) => (
                        <div
                            className={"experience-item experience-item--" + (i % 2 === 0 ? "left" : "right")}
                            key={entry.id}
                        >
                            <div className="experience-connector" aria-hidden="true" />
                            <span className="experience-badge">{entry.year}</span>
                            <div className="experience-card">
                                <div className="experience-media">
                                    {entry.image && (
                                        <img src={entry.image} alt={entry.imageAlt} className="experience-image" />
                                    )}
                                    {entry.motif && <WorkMotif variant={entry.motif} />}
                                    {entry.clientBadge && (
                                        // Kept as an overlay on the thumbnail (its original
                                        // position, just resized down for the smaller card) rather
                                        // than moved beside the role heading — "Capgemini —
                                        // Test Engineer" already sits right next to the content
                                        // side, and repeating "Capgemini" immediately beside itself
                                        // in the same text flow would read as a stutter in a way it
                                        // never did when the badge lived in the previous full-bleed
                                        // panel's own corner, spatially apart from the role text.
                                        <div className="experience-client-badge">
                                            <span className="experience-client-badge-text">Capgemini</span>
                                            <span className="experience-client-badge-x" aria-hidden="true">×</span>
                                            {/* cdn.simpleicons.org/capgemini 404s (tested) — no Capgemini
                                                mark exists in the icon set, so that half of the lockup stays
                                                text. McDonald's resolves, so that half is the real mark. */}
                                            <img
                                                src="https://cdn.simpleicons.org/mcdonalds"
                                                alt="McDonald's"
                                                className="experience-client-badge-icon"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="experience-content">
                                    <h3>{entry.role}</h3>
                                    {entry.caption && <p>{entry.caption}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
