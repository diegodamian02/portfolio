import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../../src/lib/gsap.js";
import SnowWhiteDeck from "../../src/components/snow-white-deck.jsx";

// ---------------------------------------------------------------------------
// /lab/deck/ — the Stage 12.1 measurement page. DEV ONLY.
//
// Reached through this directory's own index.html + main.jsx, NOT through the
// app: `vite build` only builds the root index.html, so nothing under
// client/lab/ is ever emitted into dist/. The gate is the build graph itself,
// which is why App.jsx is byte-unchanged by this stage. See index.html here
// for why the first version — a DEV ternary inside App.jsx — was the wrong
// shape: it gated rendering, not loading, and dragged 4.2 MB of the site in
// behind it.
//
// Nothing in src/ imports this file. The dependency runs the other way: this
// page imports src/components/snow-white-deck.jsx, which is the one piece
// here headed for production (Stage 12.3/12.4).
//
// Deliberately NOT inside the site shell — no Navbar, no LoadingScreen, no
// SmoothScroll. Lenis would own the scroll position and the navbar would eat
// 120px of an 852px phone screen, and both would land in the frame times this
// page exists to report.
// ---------------------------------------------------------------------------

// The three crate records from the brief, colours included. These are the
// per-track label colours the real crate will pass down; three is enough to
// show that the label, both rings and the shine all read correctly against
// the two deck bodies.
const CRATE = [
    { id: "look-the-part", title: "Look The Part", color: "#6f9bff" },
    { id: "notting-hill", title: "Notting Hill", color: "#ff8a5c" },
    { id: "cowboy-nudes", title: "Cowboy Nudes", color: "#7fd6a4" },
];

// The t=0 beat: the sleeve lifts as it is tapped. It belongs to the SLEEVE,
// not the deck — in production the sleeve is a record-crate card and the deck
// has no reference to it — so it is the lab's own tween, timed to overlap the
// deck's lid and tilt exactly as the spec table describes.
const SLEEVE_LIFT = 1.04;

export default function DeckLab() {
    const rootRef = useRef(null);
    const deckApi = useRef(null);
    const sleeveRefs = useRef({});

    const [picked, setPicked] = useState(CRATE[0]);
    const [dropped, setDropped] = useState(false);
    const [rings, setRings] = useState(true);
    const [theme, setTheme] = useState(
        () => document.documentElement.getAttribute("data-theme") || "dark",
    );

    // A lab-local toggle, NOT navbar.jsx's. The real one wraps the flip in
    // document.startViewTransition() and neutralises --theme-transition-
    // duration for the capture; reproducing that here would put a 220ms
    // full-page crossfade inside every screenshot and every frame-time
    // sample. Stage 12.4 swaps the sheet's own toggle onto the real path.
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    useGSAP(() => {
        gsap.set(Object.values(sleeveRefs.current).filter(Boolean), { scale: 1 });
    }, { scope: rootRef });

    const liftSleeve = useCallback((id) => {
        const el = sleeveRefs.current[id];
        if (!el) return;
        gsap.timeline()
            .to(el, { scale: SLEEVE_LIFT, duration: 0.12, ease: "power2.out" })
            .to(el, { scale: 1, duration: 0.4, ease: "power2.inOut" });
    }, []);

    const pick = useCallback((record) => {
        setPicked(record);
        liftSleeve(record.id);
        deckApi.current?.drop();
        setDropped(true);
    }, [liftSleeve]);

    const toggleDrop = useCallback(() => {
        if (dropped) { deckApi.current?.lift(); setDropped(false); }
        else { liftSleeve(picked.id); deckApi.current?.drop(); setDropped(true); }
    }, [dropped, liftSleeve, picked]);

    // The probe the measurement scripts drive. DEV-only by construction (this
    // whole module is), and it hands back the component's OWN api object
    // rather than a second copy of anything — the same reason
    // skyline-background.jsx exposes window.__skylineDebug instead of letting
    // a probe `import()` the module, which under Vite's `?t=` HMR URLs returns
    // a second, uninitialised instance (design-review/scratch-tests/README.md).
    useEffect(() => {
        window.__deckLab = {
            drop: () => deckApi.current?.drop(),
            lift: () => deckApi.current?.lift(),
            seek: (s) => deckApi.current?.seek(s),
            duration: () => deckApi.current?.duration() ?? 0,
            progress: () => deckApi.current?.progress() ?? 0,
            setPlaying: (p) => deckApi.current?.setPlaying(p),
            setRings: (on) => { setRings(on); deckApi.current?.setRings(on); },
            pick: (id) => {
                const record = CRATE.find((r) => r.id === id);
                if (record) pick(record);
            },
            setTheme,
        };
        return () => { delete window.__deckLab; };
    }, [pick]);

    return (
        <div className="deck-lab" ref={rootRef}>
            <div className="deck-lab-bar">
                <button type="button" className="deck-lab-button" onClick={toggleDrop}>
                    {dropped ? "Lift" : "Drop"}
                </button>
                <button
                    type="button"
                    className="deck-lab-button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {theme === "dark" ? "Studio Paper" : "Graphite"}
                </button>
                <button
                    type="button"
                    className="deck-lab-button"
                    onClick={() => { setRings(!rings); deckApi.current?.setRings(!rings); }}
                >
                    {rings ? "Rings on" : "Rings off"}
                </button>
            </div>

            <p className="deck-lab-readout">
                /lab/deck — Snow White spike · {picked.title} · {picked.color}
            </p>

            <div className="deck-lab-deck">
                <SnowWhiteDeck labelColor={picked.color} apiRef={deckApi} />
            </div>

            <div className="deck-lab-crate">
                {CRATE.map((record) => (
                    <button
                        key={record.id}
                        type="button"
                        className="deck-lab-sleeve"
                        style={{ "--sleeve-color": record.color }}
                        aria-pressed={picked.id === record.id}
                        ref={(el) => { sleeveRefs.current[record.id] = el; }}
                        onClick={() => pick(record)}
                    >
                        {record.title}
                    </button>
                ))}
            </div>
        </div>
    );
}
