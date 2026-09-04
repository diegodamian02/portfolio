import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SIGNATURE_EASE } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";

// The footer social links (footer.jsx). Inline stroke SVGs — one per brand —
// that "self-draw" on hover/focus the way dalelarroder.com's icons do
// (framer-motion `pathLength` 0->1 there; GSAP DrawSVGPlugin here, already
// registered in ../lib/gsap.js and already used for #connect's input
// underlines — no new dependency). `currentColor` means the icons are
// theme-correct for free, which retires footer.jsx's old per-theme PNG swap
// AND the light-theme bug where the white-only LinkedIn PNG sat invisible on
// the near-white footer.
//
// Same "quiet, decorative, reduced-motion-gated" contract as work-motif.jsx:
// under prefers-reduced-motion the icons render fully drawn and static, and
// hover is just the CSS colour/chip change (main.scss `.social-icon`).

// viewBox is 24 for all three. LinkedIn + GitHub are the lucide paths; the
// GitHub tail is kept as its own <path> (`.social-icon-tail`) so it can draw
// after the body and then wag. Spotify has no lucide equivalent — it's a
// stroke-built mark (outer ring + three broadcast arcs) so it draws in
// consistently with the other two rather than being an odd fill glyph.
const ICONS = {
    linkedin: {
        label: "LinkedIn",
        render: () => (
            <>
                <path className="social-icon-path"
                    d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect className="social-icon-path" x="2" y="9" width="4" height="12" />
                <circle className="social-icon-path" cx="4" cy="4" r="2" />
            </>
        ),
    },
    github: {
        label: "GitHub",
        render: () => (
            <>
                <path className="social-icon-path"
                    d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path className="social-icon-path social-icon-tail" d="M9 18c-4.51 2-5-2-7-2" />
            </>
        ),
    },
    spotify: {
        label: "Spotify",
        render: () => (
            <>
                <circle className="social-icon-path" cx="12" cy="12" r="10" />
                <path className="social-icon-path" d="M6 15.2c3.6-1.1 7.6-.7 10.8 1.1" />
                <path className="social-icon-path" d="M5.4 11.6c4.4-1.4 9.6-.8 13.4 1.6" />
                <path className="social-icon-path" d="M6.2 8c5-1.5 10.6-.8 14.4 1.9" />
            </>
        ),
    },
};

// eslint-disable-next-line react/prop-types
export default function SocialIcon({ name, href }) {
    const icon = ICONS[name];
    const reduced = useReducedMotion();
    const rootRef = useRef(null);
    const tlRef = useRef(null);
    const wagRef = useRef(null);

    const { contextSafe } = useGSAP(() => {
        if (reduced) return undefined;
        // DrawSVGPlugin needs an explicit starting state or the strokes just
        // render fully drawn with nothing to draw from (same note as
        // connect.jsx's underline setup).
        gsap.set(rootRef.current.querySelectorAll(".social-icon-path"), { drawSVG: "100%" });
        return () => { tlRef.current?.kill(); wagRef.current?.kill(); };
    }, { scope: rootRef, dependencies: [reduced] });

    const play = contextSafe(() => {
        if (reduced || !rootRef.current) return;
        const svg = rootRef.current.querySelector(".social-icon-svg");
        const body = rootRef.current.querySelectorAll(".social-icon-path:not(.social-icon-tail)");
        const tail = rootRef.current.querySelector(".social-icon-tail");

        tlRef.current?.kill();
        wagRef.current?.kill();
        wagRef.current = null;

        const tl = gsap.timeline();
        tlRef.current = tl;
        tl.fromTo(svg, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: "back.out(1.7)" }, 0);
        tl.fromTo(body, { drawSVG: "0%" },
            { drawSVG: "100%", duration: 0.5, stagger: 0.07, ease: SIGNATURE_EASE }, 0);

        if (tail) {
            tl.fromTo(tail, { drawSVG: "0%" },
                { drawSVG: "100%", duration: 0.32, ease: SIGNATURE_EASE }, ">-0.08");
            // ...then the octocat tail wags, like dalelarroder.com's does.
            // svgOrigin pins the pivot to the tail's attach point in the
            // SVG's own coordinate space (≈ where it meets the body).
            tl.add(() => {
                wagRef.current = gsap.to(tail, {
                    rotation: 14, svgOrigin: "9 18",
                    duration: 0.26, repeat: -1, yoyo: true, ease: "sine.inOut",
                });
            });
        }
    });

    const reset = contextSafe(() => {
        if (reduced || !rootRef.current) return;
        tlRef.current?.kill();
        wagRef.current?.kill();
        wagRef.current = null;
        const svg = rootRef.current.querySelector(".social-icon-svg");
        const tail = rootRef.current.querySelector(".social-icon-tail");
        gsap.to(svg, { scale: 1, duration: 0.2 });
        if (tail) gsap.to(tail, { rotation: 0, svgOrigin: "9 18", duration: 0.2 });
        gsap.set(rootRef.current.querySelectorAll(".social-icon-path"), { drawSVG: "100%" });
    });

    return (
        <a
            ref={rootRef}
            className="social-icon"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={icon.label}
            onMouseEnter={play}
            onMouseLeave={reset}
            onFocus={(e) => { if (e.target.matches(":focus-visible")) play(); }}
            onBlur={reset}
        >
            <svg className="social-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                {icon.render()}
            </svg>
        </a>
    );
}
