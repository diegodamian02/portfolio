import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { init as audioInit } from "../lib/turntable-audio.js";
import { createPortal } from "react-dom";
import { gsap } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";

const RESULT_LIMIT = 5;
const FETCH_LIMIT = 15;
const DEBOUNCE_MS = 400;
const MOBILE_BREAKPOINT = 768;
const PANEL_GAP = 10;

// Search goes through our own backend rather than calling Apple directly.
// Apple's Search API inspects the User-Agent and, on iOS, 301-redirects to a
// `musics://` deep link instead of returning JSON — which a browser fetch
// cannot follow, so every iPhone/iPad visitor got an empty crate. See the
// /api/itunes/search handler in server/server.js for the full explanation.
// Trailing-slash-safe for the same reason as my-taste.jsx.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5050").replace(/\/+$/, "");

function toTrack(result) {
    return {
        id: result.trackId,
        title: result.trackName,
        artist: result.artistName,
        artworkUrl: result.artworkUrl100?.replace("100x100", "600x600") || result.artworkUrl100,
        artworkThumbUrl: result.artworkUrl60,
        previewUrl: result.previewUrl,
    };
}

export default function RecordCrate({ onSelect }) {
    const reduced = useReducedMotion();
    const listboxId = useId();

    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState("idle"); // idle | loading | results | empty | error
    const [results, setResults] = useState([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [openDirection, setOpenDirection] = useState("up");
    const [panelStyle, setPanelStyle] = useState(null);

    const wrapRef = useRef(null);
    const inputRowRef = useRef(null);
    const panelRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const requestIdRef = useRef(0);

    const runSearch = useCallback(async (term) => {
        const reqId = ++requestIdRef.current;
        setStatus("loading");
        try {
            const url = `${apiBaseUrl}/api/itunes/search?limit=${FETCH_LIMIT}&term=${encodeURIComponent(term)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`bad status ${res.status}`);
            const data = await res.json();
            if (reqId !== requestIdRef.current) return;
            const filtered = (data.results || []).filter((r) => r.previewUrl).slice(0, RESULT_LIMIT).map(toTrack);
            setResults(filtered);
            setStatus(filtered.length ? "results" : "empty");
            setActiveIndex(-1);
        } catch {
            if (reqId !== requestIdRef.current) return;
            setStatus("error");
        }
    }, []);

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value);
        clearTimeout(debounceRef.current);

        if (!value.trim()) {
            requestIdRef.current++;
            setStatus("idle");
            setResults([]);
            setOpen(false);
            return;
        }

        setOpen(true);
        debounceRef.current = setTimeout(() => runSearch(value.trim()), DEBOUNCE_MS);
    };

    useEffect(() => () => clearTimeout(debounceRef.current), []);

    const showPanel = open && query.trim().length > 0;

    // The panel is portaled to <body> and positioned with `fixed` coords
    // computed from the input row's own rect — NOT rendered as a normal
    // descendant of .record-crate. .home has overflow:hidden (needed for
    // the deck's intentional right-edge crop bleed), and this section is
    // exactly 100vh, so a same-ancestor absolutely-positioned panel near
    // the bottom of a short viewport would get vertically clipped by
    // that same overflow:hidden. Escaping via portal is what actually
    // guarantees "never clips off-screen", not just picking a direction.
    useLayoutEffect(() => {
        if (!showPanel || !inputRowRef.current) return;

        function measure() {
            const rect = inputRowRef.current.getBoundingClientRect();
            const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
            let direction = "up";
            if (isMobile) {
                // The crate sits directly below the deck at this width
                // (grid reorders it there), so "up" is guaranteed to
                // overlap the turntable — "down" only risks the tail of
                // the (internally-scrollable) list falling past the
                // current scroll position, which just needs a page
                // scroll to reach, not a genuine off-screen clip. Bias
                // hard toward "down"; "up" is the fallback only when the
                // input is essentially at the bottom of the viewport.
                const spaceBelow = window.innerHeight - rect.bottom;
                direction = spaceBelow >= 50 ? "down" : "up";
            }
            setOpenDirection(direction);
            setPanelStyle(
                direction === "up"
                    ? { position: "fixed", left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + PANEL_GAP }
                    : { position: "fixed", left: rect.left, width: rect.width, top: rect.bottom + PANEL_GAP }
            );
        }

        measure();
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);
        return () => {
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
        };
    }, [showPanel]);

    useEffect(() => {
        const el = panelRef.current;
        if (!el || !panelStyle) return;
        const offset = openDirection === "up" ? 8 : -8;
        if (reduced) {
            gsap.set(el, { opacity: showPanel ? 1 : 0, y: 0 });
            return;
        }
        if (showPanel) {
            gsap.fromTo(el, { opacity: 0, y: offset }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
        } else {
            gsap.to(el, { opacity: 0, y: offset, duration: 0.2, ease: "power2.out" });
        }
    }, [showPanel, openDirection, reduced, panelStyle]);

    useEffect(() => {
        function handlePointerDown(e) {
            const insideWrap = wrapRef.current && wrapRef.current.contains(e.target);
            const insidePanel = panelRef.current && panelRef.current.contains(e.target);
            if (!insideWrap && !insidePanel) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, []);

    const selectTrack = (track) => {
        // Unlock the AudioContext HERE, synchronously, inside the real click /
        // Enter handler — never from a useEffect reacting to the selection.
        //
        // An effect runs after React commits, by which point the user-gesture
        // context is gone. iOS then refuses to unlock the context, and because
        // desktop browsers don't enforce the same rule it would work perfectly
        // in development and fail silently on every iPhone. That is the worst
        // possible failure shape, and it is why this call is not in an effect.
        //
        // init() is idempotent: one AudioContext, created lazily, reused forever.
        audioInit();

        onSelect?.(track);
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
            return;
        }
        if (!showPanel || status !== "results" || results.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        } else if (e.key === "Enter") {
            if (activeIndex >= 0 && results[activeIndex]) {
                e.preventDefault();
                selectTrack(results[activeIndex]);
            }
        }
    };

    const isLoading = status === "loading";
    const showStale = isLoading && results.length > 0;

    const panel = showPanel && panelStyle && createPortal(
        <div className={`record-crate-panel record-crate-panel-${openDirection}`} style={panelStyle} ref={panelRef}>
            <ul className="record-crate-list" role="listbox" id={listboxId}>
                {status === "loading" && results.length === 0 && (
                    <li className="record-crate-status-row" aria-live="polite">searching the crate…</li>
                )}
                {status === "empty" && (
                    <li className="record-crate-status-row">nothing in the crate for that</li>
                )}
                {status === "error" && (
                    <li className="record-crate-status-row">couldn&apos;t reach the crate — try again</li>
                )}
                {(status === "results" || showStale) && results.map((track, i) => (
                    <li key={track.id} role="presentation">
                        <button
                            type="button"
                            id={`${listboxId}-opt-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            className={`record-crate-row ${i === activeIndex ? "is-active" : ""} ${i === 2 ? "has-inlay" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectTrack(track)}
                            onMouseEnter={() => setActiveIndex(i)}
                        >
                            <span
                                className="record-crate-sleeve"
                                style={track.artworkThumbUrl ? { backgroundImage: `url(${track.artworkThumbUrl})` } : undefined}
                            />
                            <span className="record-crate-meta">
                                <span className="record-crate-title">{track.title}</span>
                                <span className="record-crate-artist">{track.artist}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>,
        document.body
    );

    return (
        <div className="record-crate" ref={wrapRef}>
            <div className="record-crate-input-row" ref={inputRowRef}>
                <span
                    className={`record-crate-glyph ${isLoading && !reduced ? "is-spinning" : "is-idle"}`}
                    aria-hidden="true"
                >
                    <svg viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
                        <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                    </svg>
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    className="record-crate-input"
                    placeholder="put a record on…"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => query.trim() && setOpen(true)}
                    onKeyDown={handleKeyDown}
                    role="combobox"
                    aria-expanded={showPanel}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
                    autoComplete="off"
                />
            </div>
            {panel}
        </div>
    );
}
