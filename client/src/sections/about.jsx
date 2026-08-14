import { useRef } from "react";
import "../styles/main.scss";
import diego from "../assets/diego.png";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, SplitText } from "../lib/gsap.js";
import { getActiveLenis, isProgrammaticScrollActive, onProgrammaticScrollChange } from "../lib/scroll.js";

// About Me — the calm intro card, Stage 3 Task 4. Replaces the old
// .bio-section entirely (photo + two paragraphs + Rutgers logo + flag
// icons) with a tighter format: portrait, name, one placeholder line, fact
// chips. Now id="about" — see timeline.jsx (formerly the second half of
// this file) for what moved to id="timeline".
//
// Deliberately the opposite mode from Timeline: single viewport, one
// entrance that runs once and settles, no scroll-scrubbed spectacle. Timeline
// already owns that register — this section exists to feel calm next to it.
//
// No Tabler icon library exists anywhere in this project — checked
// package.json and node_modules, neither has any icon dependency at all, not
// just a missing guitar glyph. Rather than adding a dependency for five small
// glyphs, these are hand-drawn inline SVGs (stroke, currentColor), matching
// the one icon convention this codebase already has: turntable.jsx's
// play/pause glyphs are hand-drawn paths, not a library. Flagged in
// STATUS.md.
// Task 5 replaces the single "Lima → Chicago" arrow chip (which implied one
// direct move and silently dropped the Rutgers/New Jersey years in between)
// with two independent facts. LocationIcon (the old pin glyph) is gone with
// it — FlagIcon and SkylineIcon below replace it, same hand-drawn convention.
const FlagIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17.5V3" />
        <path d="M5 4c1.4-1 3-1 4.5 0s3.1 1 4.5 0v7c-1.4 1-3 1-4.5 0s-3.1-1-4.5 0V4Z" />
    </svg>
);

const SkylineIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17.5h15" />
        <path d="M4.5 17.5V8.5l2.5-1.8 2.5 1.8v9" />
        <path d="M9.5 17.5V4.5l3-2 3 2v13" />
        <path d="M6.2 11h.8M11.7 9h.8M11.7 12h.8" />
    </svg>
);

const EducationIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7.5 10 4l8 3.5-8 3.5-8-3.5Z" />
        <path d="M5.5 9.2v3.6c0 1 2 2.2 4.5 2.2s4.5-1.2 4.5-2.2V9.2" />
        <path d="M17 7.5v4.8" />
    </svg>
);

const FocusIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
        <path d="m7 10.3 2 2 4-4.6" />
    </svg>
);

const MusicIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 15.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M9.5 13.5V3.8l6-1.3v9.4" />
        <path d="M15.5 13.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    </svg>
);

const GuitarIcon = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.2 2.2 15.8 5.8" />
        <path d="M11 3.4 9.3 5.1a1.4 1.4 0 0 0 0 2l.2.2a1.4 1.4 0 0 0 2 0l1.7-1.7" />
        <path d="m9.6 8.4-2.3 2.3" />
        <path d="M9.9 9.6c1.8 1.8 2 4.6.5 6.1a4 4 0 0 1-5.7-5.7c1.5-1.5 4.3-1.3 6.1.5Z" />
        <path d="M4.5 15.5 3 17" />
    </svg>
);

// Order: origin, current city, education, current focus, loves music, plays
// guitar. Task 5 split the one "Lima → Chicago" chip into two independent,
// accurate facts in the same two slots, rather than one journey line that
// implied a direct move and left out the Rutgers/New Jersey years between.
const CHIPS = [
    { icon: FlagIcon, label: "From Lima, Peru" },
    { icon: SkylineIcon, label: "Based in Chicago" },
    { icon: EducationIcon, label: "Rutgers — CS + Music Tech" },
    { icon: FocusIcon, label: "Test Automation" },
    { icon: MusicIcon, label: "Loves Music" },
    { icon: GuitarIcon, label: "Plays Guitar" },
];

export default function About() {
    const rootRef = useRef(null);
    const portraitWrapRef = useRef(null);
    const portraitRef = useRef(null);
    const maskRef = useRef(null);
    const nameRef = useRef(null);
    const bioRef = useRef(null);
    const chipsRef = useRef(null);

    // Two effects, both gated through gsap.matchMedia() — the pattern Stage 2
    // established for every media-query-scoped subsystem in this codebase,
    // not just tween construction:
    //
    //   1. Entrance — runs once per page view (ScrollTrigger `once: true`,
    //      not toggleActions/reverse: Timeline's panels replay on re-entry
    //      because they're a scrolling sequence, this is a single intro
    //      beat). Portrait wipes first; name, bio and chips cascade after in
    //      strict sequence, each waiting on the previous group finishing
    //      rather than firing together.
    //   2. Idle tilt — pointer:fine AND no-preference, combined in one query
    //      string rather than two separate checks, so a touch device or a
    //      reduced-motion setting each independently suppress it.
    //
    // A third match handles the reduced-motion case explicitly rather than
    // leaving it as "whatever CSS defaults to" — the portrait mask's REST
    // state has to cover the photo (so the no-preference branch has
    // something to wipe away), so something has to explicitly move it
    // aside when the entrance never runs.
    useGSAP(() => {
        gsap.set(maskRef.current, { xPercent: 0 });

        const mm = gsap.matchMedia();

        mm.add("(prefers-reduced-motion: no-preference)", () => {
            const nameSplit = new SplitText(nameRef.current, { type: "words" });
            const bioSplit = new SplitText(bioRef.current, { type: "words" });
            const chips = gsap.utils.toArray(".about-me-chip", chipsRef.current);

            // Task 5 fix — a fast scroll used to drag straight past this
            // section into Timeline before the ~2.9s entrance (traced in
            // Task 4) finished playing, cutting it off mid-sequence.
            //
            // First implementation used GSAP's own ScrollTrigger `pin` with
            // a fixed pixel distance, releasing when scroll crossed it.
            // Dropped after testing, for two compounding reasons: (1) a
            // fixed distance can't be both short AND reliable — Lenis's
            // easing is heavily front-loaded (a single hard flick covered
            // ~45% of its total target distance in the first ~100ms in
            // testing), so any distance short enough to feel brief for a
            // normal scroll was also short enough for one aggressive flick
            // to clear in a couple of frames; (2) patching that by
            // re-clamping scroll position on every attempted exit fought
            // Lenis's own in-flight target and, under GSAP's ticker/Lenis
            // rAF timing, occasionally reached the release call twice in
            // the same frame — the second kill() interrupted the first
            // one's pin revert mid-way and left a stale `position: fixed`
            // on the section permanently, with the document scrolling
            // freely underneath it. Reproduced repeatedly, not a one-off.
            //
            // This version holds SCROLL INPUT itself instead of reacting to
            // scroll position after the fact — nothing to clamp, nothing to
            // race, nothing to revert:
            //   - lenis.stop()/start() for wheel/trackpad input (Lenis's
            //     own primitive for this — halts any in-flight momentum
            //     too, not just future input).
            //   - a direct, non-passive touchmove listener for touch —
            //     this project's Lenis instance runs with the default
            //     syncTouch:false (smooth-scroll.jsx), meaning touch
            //     scrolling is native, not routed through Lenis at all, so
            //     lenis.stop() alone doesn't affect it. Verified via Lenis's
            //     own source before relying on either path.
            //
            // `tl` is a plain, paused timeline with NO scrollTrigger of its
            // own — genuinely decoupled from scroll input, not just
            // un-scrubbed. A separate ScrollTrigger below calls tl.play()
            // once, on entry; the timeline then runs to completion on
            // GSAP's own ticker regardless of what scroll input does (or
            // doesn't do) in the meantime.
            let holding = false;

            function releaseHold() {
                if (!holding) return;
                holding = false;
                getActiveLenis()?.start();
                window.removeEventListener("touchmove", blockTouchMove, { capture: true });
                window.removeEventListener("keydown", blockScrollKeys, { capture: true });
            }

            const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]);
            function blockScrollKeys(e) {
                if (SCROLL_KEYS.has(e.key)) e.preventDefault();
            }
            function blockTouchMove(e) {
                e.preventDefault();
            }

            const tl = gsap.timeline({
                paused: true,
                onComplete: releaseHold,
            });

            tl.to(maskRef.current, { xPercent: 100, duration: 0.7, ease: "power3.inOut" }, 0);
            // ">" — starts the instant the wipe above finishes ("immediately
            // followed by", per the brief).
            tl.from(nameSplit.words, { opacity: 0, y: 16, duration: 0.5, ease: "power2.out", stagger: 0.06 }, ">");
            // ">+=0.25" / ">+=0.3" — explicit pauses between groups, not
            // chained durations, so the gap is exact regardless of how long
            // the group before it took (same reasoning turntable.jsx uses
            // for needle contact: an absolute position can't drift).
            tl.from(bioSplit.words, { opacity: 0, y: 12, duration: 0.4, ease: "power2.out", stagger: 0.025 }, ">+=0.25");
            tl.from(chips, { opacity: 0, y: 10, duration: 0.4, ease: "power2.out", stagger: 0.08 }, ">+=0.3");

            // Covers a nav click that starts WHILE already holding, not just
            // one that arrives before entry — e.g. a mid-entrance click on
            // "Connect". Without this, lenis.stop() would leave Lenis
            // stopped forever once the forced nav scrollTo (see
            // lib/scroll.js) moved past it, since only this hold's own
            // releaseHold() ever calls lenis.start().
            const unsubscribe = onProgrammaticScrollChange((active) => {
                if (active && holding) {
                    tl.progress(1);
                    releaseHold();
                }
            });

            ScrollTrigger.create({
                trigger: rootRef.current,
                // "top top" (not Task 4's "top 80%") — holding while the
                // section is only 80% into view would freeze the viewport on
                // a half-scrolled frame, which reads as a stutter rather
                // than an intro. Holding once the section already fills the
                // viewport reads as a deliberate pause instead.
                start: "top top",
                once: true,
                onEnter: () => {
                    // A nav click already scrolling straight through
                    // #about toward another section — the visitor asked to
                    // go there, not to watch an intro they didn't request.
                    // Resolve to the finished state instantly (nothing is
                    // left invisible if they scroll back up to look later)
                    // and never hold at all.
                    if (isProgrammaticScrollActive()) {
                        tl.progress(1);
                        return;
                    }
                    holding = true;
                    getActiveLenis()?.stop();
                    window.addEventListener("touchmove", blockTouchMove, { passive: false, capture: true });
                    window.addEventListener("keydown", blockScrollKeys, { capture: true });
                    tl.play();
                },
            });

            return () => {
                unsubscribe();
                releaseHold();
                tl.kill();
                nameSplit.revert();
                bioSplit.revert();
            };
        });

        mm.add("(prefers-reduced-motion: reduce)", () => {
            gsap.set(maskRef.current, { xPercent: 100 });
        });

        mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
            const wrap = portraitWrapRef.current;
            const img = portraitRef.current;

            // quickTo, not repeated .to() calls per mousemove — a fresh
            // tween on every event would stack/fight itself at the pointer
            // rates a mousemove listener fires at. quickTo keeps ONE tween
            // per property and just retargets it, which is what makes rapid
            // updates cheap. Small range: this should read as depth, not
            // a gimmick.
            const MAX_TILT = 8;
            // scale is set once, here, alongside the perspective baseline —
            // GSAP composes every tracked transform component (rotateX,
            // rotateY, scale...) into one written string, so apply() below
            // only ever touching rotateX/rotateY doesn't drop this. The
            // overscan is what keeps rotation from uncovering the circular
            // clip's background at the corners, same reasoning as
            // timeline.jsx's parallax overscan.
            gsap.set(img, { transformPerspective: 900, scale: 1.12 });

            // quickTo targets a plain proxy object, not the DOM node's
            // rotateX/rotateY directly. Two quickTo instances writing to
            // the SAME element's rotateX and rotateY independently hit a
            // real GSAP quirk here — the browser's native independent
            // `rotate` CSS property combines both axes into one value, and
            // GSAP's quick-setter "reset" path warns "rotateY not eligible
            // for reset" and silently no-ops rather than writing it. Routing
            // through a proxy sidesteps that: quickTo only ever touches
            // plain numbers, and the one gsap.set() that actually reaches
            // the DOM combines both axes in a single call.
            const state = { rx: 0, ry: 0 };
            const apply = () => gsap.set(img, { rotateX: state.rx, rotateY: state.ry });
            const setRotateY = gsap.quickTo(state, "ry", { duration: 0.4, ease: "power3", onUpdate: apply });
            const setRotateX = gsap.quickTo(state, "rx", { duration: 0.4, ease: "power3", onUpdate: apply });

            const onMove = (e) => {
                const rect = wrap.getBoundingClientRect();
                const relX = (e.clientX - rect.left) / rect.width - 0.5;
                const relY = (e.clientY - rect.top) / rect.height - 0.5;
                setRotateY(relX * MAX_TILT * 2);
                setRotateX(relY * -MAX_TILT * 2);
            };
            const onLeave = () => { setRotateX(0); setRotateY(0); };

            wrap.addEventListener("mousemove", onMove);
            wrap.addEventListener("mouseleave", onLeave);

            return () => {
                wrap.removeEventListener("mousemove", onMove);
                wrap.removeEventListener("mouseleave", onLeave);
                gsap.set(img, { rotateX: 0, rotateY: 0 });
            };
        });

        return () => mm.revert();
    }, { scope: rootRef });

    return (
        <section className="about-me-section" ref={rootRef}>
            <div className="about-me-container">
                <div className="about-me-portrait-wrap" ref={portraitWrapRef}>
                    <img src={diego} alt="Diego Damian" className="about-me-portrait" ref={portraitRef} />
                    <div className="about-me-portrait-mask" ref={maskRef} aria-hidden="true" />
                </div>
                <div className="about-me-text">
                    <h2 className="about-me-name" ref={nameRef}>Diego Damian</h2>
                    {/* Placeholder — Diego is writing the real copy separately. */}
                    <p className="about-me-bio" ref={bioRef}>
                        [Placeholder bio — one or two sentences on who I am and what I build, coming soon.]
                    </p>
                    <ul className="about-me-chips" ref={chipsRef}>
                        {CHIPS.map(({ icon: Icon, label }) => (
                            <li className="about-me-chip" key={label}>
                                <span className="about-me-chip-icon" aria-hidden="true"><Icon /></span>
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
