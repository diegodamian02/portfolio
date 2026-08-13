import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";

// Generative backgrounds for timeline entries that have no photo. Three
// variants, one component — each panel that needs one names it by `variant`
// rather than this being three separate files, since they share the same
// "quiet, looping, decorative" contract and the same reduced-motion gate.
//
// All three are aria-hidden: they sit behind real caption text (role,
// company, dates) that already carries the entry's meaning, same as
// .timeline-image never needed alt text beyond the entry's own name.

const NODES = [
    { x: 60, y: 70 }, { x: 160, y: 40 }, { x: 260, y: 90 },
    { x: 340, y: 50 }, { x: 100, y: 170 }, { x: 220, y: 190 },
    { x: 320, y: 160 }, { x: 190, y: 120 },
];
const EDGES = [
    [0, 7], [1, 7], [2, 7], [1, 2], [3, 2],
    [0, 4], [7, 5], [2, 6], [5, 6], [4, 5],
];

// eslint-disable-next-line react/prop-types
function NodesMotif({ reduced }) {
    const rootRef = useRef(null);

    useGSAP(() => {
        if (reduced) return;
        const circles = rootRef.current.querySelectorAll(".work-motif-node");
        const tween = gsap.to(circles, {
            scale: 1.5,
            opacity: 1,
            transformOrigin: "center",
            duration: 1.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: { each: 0.3, from: "random" },
        });
        return () => tween.kill();
    }, { scope: rootRef, dependencies: [reduced] });

    return (
        <svg ref={rootRef} className="work-motif work-motif-nodes" viewBox="0 0 400 260"
            preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {EDGES.map(([a, b], i) => (
                <line key={i} className="work-motif-edge"
                    x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} />
            ))}
            {NODES.map((n, i) => (
                <circle key={i} className="work-motif-node" cx={n.x} cy={n.y} r="5" />
            ))}
        </svg>
    );
}

// eslint-disable-next-line react/prop-types
function ScanMotif({ reduced }) {
    const rootRef = useRef(null);

    useGSAP(() => {
        if (reduced) return;
        const bar = rootRef.current.querySelector(".work-motif-scan-bar");
        const tween = gsap.fromTo(bar,
            { yPercent: -20 },
            { yPercent: 120, duration: 4, repeat: -1, ease: "power1.inOut" });
        return () => tween.kill();
    }, { scope: rootRef, dependencies: [reduced] });

    return (
        <div ref={rootRef} className="work-motif work-motif-scan" aria-hidden="true">
            <div className="work-motif-scan-grid" />
            <div className="work-motif-scan-bar" />
        </div>
    );
}

// 24 bars, heights fixed at build time (not random per render) so the
// reduced-motion static frame is deterministic rather than reshuffling on
// every remount.
const BAR_HEIGHTS = [30, 55, 40, 70, 50, 85, 60, 35, 65, 45, 90, 55, 40, 75, 50, 30, 60, 80, 45, 65, 35, 55, 70, 40];

// eslint-disable-next-line react/prop-types
function WaveformMotif({ reduced }) {
    const rootRef = useRef(null);

    useGSAP(() => {
        if (reduced) return;
        const bars = rootRef.current.querySelectorAll(".work-motif-bar");
        const tween = gsap.to(bars, {
            scaleY: 0.4,
            transformOrigin: "center",
            duration: 1.1,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            stagger: { each: 0.08, from: "center" },
        });
        return () => tween.kill();
    }, { scope: rootRef, dependencies: [reduced] });

    return (
        <svg ref={rootRef} className="work-motif work-motif-waveform" viewBox="0 0 400 200"
            preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            {BAR_HEIGHTS.map((h, i) => {
                const x = 8 + i * 16;
                return (
                    <rect key={i} className="work-motif-bar"
                        x={x} y={100 - h / 2} width="8" height={h} rx="4" />
                );
            })}
        </svg>
    );
}

// eslint-disable-next-line react/prop-types
export default function WorkMotif({ variant }) {
    const reduced = useReducedMotion();
    if (variant === "nodes") return <NodesMotif reduced={reduced} />;
    if (variant === "scan") return <ScanMotif reduced={reduced} />;
    if (variant === "waveform") return <WaveformMotif reduced={reduced} />;
    return null;
}
