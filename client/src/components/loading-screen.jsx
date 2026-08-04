import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import "../styles/main.scss";

const SESSION_KEY = "introPlayed";

export default function LoadingScreen() {
    const reduced = useReducedMotion();
    const containerRef = useRef(null);
    const wrapRef = useRef(null);
    const textRef = useRef(null);
    const cursorRef = useRef(null);
    const [shouldPlay] = useState(() => !window.sessionStorage.getItem(SESSION_KEY));
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        window.sessionStorage.setItem(SESSION_KEY, "1");
    }, []);

    // Scroll is locked only while the sequence is actually visible/active —
    // released the instant it finishes, reduced-motion is on, or it's skipped.
    useEffect(() => {
        const active = shouldPlay && !reduced && !finished;
        document.body.style.overflow = active ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [shouldPlay, reduced, finished]);

    useGSAP(() => {
        if (!shouldPlay || reduced) return;

        const styles = getComputedStyle(containerRef.current);
        const accentColor = styles.getPropertyValue("--accent").trim();
        const textColor = styles.getPropertyValue("--text-color").trim();

        const split = new SplitText(textRef.current, { type: "chars" });
        let tl = null;
        let cancelled = false;

        const build = () => {
            if (tl) tl.kill();

            const wrapRect = wrapRef.current.getBoundingClientRect();
            const rects = split.chars.map((char) => char.getBoundingClientRect());

            tl = gsap.timeline({ onComplete: () => setFinished(true) });

            tl.set(split.chars, { opacity: 0, color: accentColor }).set(cursorRef.current, {
                opacity: 1,
                left: rects[0].left - wrapRect.left,
                top: rects[0].top - wrapRect.top,
                height: rects[0].height,
            });

            split.chars.forEach((char, i) => {
                const rect = rects[i];
                const next = rects[i + 1];
                const target = next
                    ? { left: next.left - wrapRect.left, top: next.top - wrapRect.top, height: next.height }
                    : { left: rect.right - wrapRect.left, top: rect.top - wrapRect.top, height: rect.height };

                tl.to(char, { opacity: 1, color: textColor, duration: 0.05, ease: "none" }).to(
                    cursorRef.current,
                    { ...target, duration: 0.03, ease: "none" }
                );
            });

            tl.call(() => cursorRef.current.classList.add("is-blinking")).to(
                containerRef.current,
                { opacity: 0, duration: 0.6, ease: "power2.inOut" },
                "+=0.7"
            );
        };

        document.fonts.ready.then(() => {
            if (!cancelled) build();
        });

        const onResize = () => build();
        window.addEventListener("resize", onResize);

        return () => {
            cancelled = true;
            window.removeEventListener("resize", onResize);
            if (tl) tl.kill();
            split.revert();
        };
    }, { scope: containerRef, dependencies: [shouldPlay, reduced] });

    if (!shouldPlay || reduced || finished) return null;

    return (
        <div className="loading-screen" ref={containerRef} aria-hidden="true">
            <div className="loading-screen-text-wrap" ref={wrapRef}>
                <p className="loading-screen-text" ref={textRef}>be<br />different</p>
                <span className="loading-cursor" ref={cursorRef} />
            </div>
        </div>
    );
}
