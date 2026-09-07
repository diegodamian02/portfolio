import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { init as audioInit } from "../lib/turntable-audio.js";
import { reportSearchClick } from "../lib/telemetry.js";
import { createPortal } from "react-dom";
import { gsap } from "../lib/gsap.js";
import { cardHueFor } from "../lib/card-hue.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";

const RESULT_LIMIT = 5;
const FETCH_LIMIT = 15;
const DEBOUNCE_MS = 400;
// The takeover, not the rect-anchored dropdown, is used for every touch device
// (any iPad, Android tablet, phone) and for narrow windows. `max-width: 768px`
// mirrors the site's mobile CSS breakpoint EXACTLY (an `innerWidth < 768` JS
// check disagreed with the inclusive CSS `max-width` at 768px itself — an
// iPad Mini in portrait — and the dropdown opened off the top of the screen).
const TOUCH_UI_QUERY = "(pointer: coarse), (max-width: 768px)";
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
    const [panelStyle, setPanelStyle] = useState(null);
    // On touch / narrow (TOUCH_UI_QUERY) the expanded bin is a full-screen
    // "dig" takeover; otherwise a rect-anchored `fixed` dropdown. Either way
    // the panel is portaled to <body> (never a descendant of .record-crate) so
    // animating it can't reflow the hero grid.
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== "undefined" && window.matchMedia(TOUCH_UI_QUERY).matches
    );
    // Kept mounted through the close animation, then unmounted by its onComplete —
    // a full-screen takeover must slide away, not just vanish.
    const [mounted, setMounted] = useState(false);

    const wrapRef = useRef(null);
    const inputRowRef = useRef(null);
    const panelRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const requestIdRef = useRef(0);
    const tlRef = useRef(null);
    const revealedRef = useRef(false);
    // The keyboard inset is written straight to the panel's --crate-kb custom
    // property (rAF-throttled) rather than held in React state — the keyboard
    // slide fires a burst of visualViewport events, and a setState per event
    // would re-render the whole component mid-open-animation.
    const kbRafRef = useRef(0);

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

    useEffect(() => {
        // One media query covers both axes — width crossing 768px and a
        // pointer changing (an iPad gaining/losing a trackpad) both flip it.
        const mq = window.matchMedia(TOUCH_UI_QUERY);
        const update = () => setIsMobile(mq.matches);
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    const showPanel = open && query.trim().length > 0;
    // The takeover is live: the input row is a fixed shelf and the portaled
    // panel fills the screen. Keyed off `mounted` (not `showPanel`) so it holds
    // through the close animation.
    const digging = isMobile && mounted;

    // Intent to be open pulls the panel into the DOM; the close animation's
    // onComplete is what takes it back out (see the reveal effect below).
    useEffect(() => {
        if (showPanel) setMounted(true);
    }, [showPanel]);

    // Desktop: position the portaled panel with `fixed` coords from the input
    // row's own rect. It opens upward from the input, escaping .home's
    // overflow:hidden (needed for the deck's crop bleed). Mobile needs none of
    // this — the panel is a CSS-positioned full-screen sheet.
    useLayoutEffect(() => {
        if (!mounted || isMobile) return;

        function measure() {
            const el = inputRowRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setPanelStyle({
                position: "fixed",
                left: rect.left,
                width: rect.width,
                bottom: window.innerHeight - rect.top + PANEL_GAP,
            });
        }

        measure();
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);
        return () => {
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
        };
    }, [mounted, isMobile, showPanel]);

    // Mobile only: keep the result list clear of the on-screen keyboard. iOS
    // pins position:fixed to the layout viewport, so the lower half of the
    // takeover would sit behind the keyboard; visualViewport reports how much
    // is covered. Written straight to the panel node, rAF-throttled — no
    // setState, so the keyboard-slide event burst can't re-render mid-anim.
    // On Android (keyboard resizes the layout viewport) this computes ~0.
    useEffect(() => {
        if (!mounted || !isMobile) return;
        const vv = window.visualViewport;
        if (!vv) return;
        const apply = () => {
            kbRafRef.current = 0;
            const px = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            panelRef.current?.style.setProperty("--crate-kb", `${px}px`);
        };
        const onChange = () => {
            if (!kbRafRef.current) kbRafRef.current = requestAnimationFrame(apply);
        };
        apply();
        vv.addEventListener("resize", onChange);
        vv.addEventListener("scroll", onChange);
        return () => {
            vv.removeEventListener("resize", onChange);
            vv.removeEventListener("scroll", onChange);
            if (kbRafRef.current) cancelAnimationFrame(kbRafRef.current);
            kbRafRef.current = 0;
        };
    }, [mounted, isMobile]);

    // Reveal / dismiss. The portaled panel is the animated element in every
    // case (a <body> child — its transform/opacity tween can't touch the hero
    // grid). Desktop: fade + 8px rise. Mobile: the panel slides up from the
    // bottom edge and the input-row shelf fades in with it; on close both
    // reverse before unmounting. The CSS park on .record-crate-panel-dig is
    // `opacity: 0` (not a transform — a CSS transform on the tweened element
    // makes GSAP stack its animated value onto it). revealedRef gates the "in"
    // animation to once per open — the desktop position effect calls
    // setPanelStyle on every scroll and each would otherwise restart the fade.
    useEffect(() => {
        if (!mounted) return;
        const panelEl = panelRef.current;
        const rowEl = inputRowRef.current;
        if (!panelEl) return;

        const finishClose = () => {
            setMounted(false);
            gsap.set(panelEl, { clearProps: "transform,opacity,visibility" });
            if (rowEl) gsap.set(rowEl, { clearProps: "opacity,visibility" });
        };

        if (showPanel) {
            if (revealedRef.current) return;
            revealedRef.current = true;
            tlRef.current?.kill();
            if (reduced) {
                gsap.set(panelEl, isMobile ? { yPercent: 0, autoAlpha: 1 } : { opacity: 1, y: 0 });
                if (isMobile && rowEl) gsap.set(rowEl, { autoAlpha: 1 });
                return;
            }
            const tl = gsap.timeline();
            if (isMobile) {
                tl.fromTo(panelEl, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0);
                if (rowEl) tl.fromTo(rowEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.18, ease: "power1.out" }, 0);
            } else {
                tl.fromTo(panelEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.24, ease: "power2.out" }, 0);
            }
            tlRef.current = tl;
            return;
        }

        // closing
        if (!revealedRef.current) return;
        revealedRef.current = false;
        tlRef.current?.kill();
        if (reduced) {
            finishClose();
            return;
        }
        const tl = gsap.timeline({ onComplete: finishClose });
        if (isMobile) {
            tl.to(panelEl, { yPercent: 100, autoAlpha: 0, duration: 0.22, ease: "power2.in" }, 0);
            if (rowEl) tl.to(rowEl, { autoAlpha: 0, duration: 0.16, ease: "power1.in" }, 0);
        } else {
            tl.to(panelEl, { opacity: 0, y: 6, duration: 0.14, ease: "power2.in" }, 0);
        }
        tlRef.current = tl;
    }, [showPanel, mounted, isMobile, reduced, panelStyle]);

    // Cards drop into the bin, staggered, whenever a fresh result set renders.
    // Targets the <li> slots, not the .record-crate-card buttons — the buttons
    // carry a CSS transform transition for their hover "pull", and a GSAP tween
    // on the same property would be re-eased every frame by that transition.
    useEffect(() => {
        if (!mounted || !showPanel || reduced) return;
        const el = panelRef.current;
        if (!el) return;
        const slots = el.querySelectorAll(".record-crate-slot");
        if (!slots.length) return;
        gsap.fromTo(
            slots,
            { opacity: 0, y: -12 },
            { opacity: 1, y: 0, duration: 0.32, stagger: 0.04, ease: "power3.out", clearProps: "opacity,transform" }
        );
    }, [mounted, showPanel, status, results, reduced]);

    useEffect(() => {
        // pointerdown, not mousedown: a touch drag never synthesises a mousedown
        // (only a tap does, after touchend), so the panel could not be dismissed
        // by touch at all (FINDINGS D32). On mobile the takeover is full-screen
        // so nothing is ever "outside" it — the chevron button and Escape are
        // the dismiss there; this covers desktop and is the backstop.
        function handlePointerDown(e) {
            const insideWrap = wrapRef.current && wrapRef.current.contains(e.target);
            const insidePanel = panelRef.current && panelRef.current.contains(e.target);
            if (!insideWrap && !insidePanel) {
                setOpen(false);
            }
        }
        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    const closeCrate = () => {
        setOpen(false);
        inputRef.current?.blur();
    };

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

        // Owner-only record of what a search actually led to — never per
        // keystroke, only on the click/Enter that picks a result. See
        // telemetry.js; this never touches what the visitor sees or waits on.
        reportSearchClick(query, track);

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
    const trimmedQuery = query.trim();

    const panelBody = (
        <div
            className={`record-crate-panel${isMobile ? " record-crate-panel-dig" : ""}`}
            style={isMobile ? undefined : panelStyle || undefined}
            ref={panelRef}
            {...(isMobile
                ? { role: "dialog", "aria-modal": "true", "aria-label": "Search the crate", "data-lenis-prevent": "" }
                : {})}
        >
            {!isMobile && (
                <span className="record-crate-bin-end" aria-hidden="true">
                    <span>Crate</span>
                </span>
            )}
            <div className="record-crate-divider" aria-hidden="true">
                <span className="record-crate-divider-q">{trimmedQuery}</span>
                {results.length > 0 && <span className="record-crate-divider-n">{results.length}</span>}
            </div>
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
                    <li
                        key={track.id}
                        className="record-crate-slot"
                        role="presentation"
                        style={{ "--spine": `var(--wax-${cardHueFor(track.id)})` }}
                    >
                        <button
                            type="button"
                            id={`${listboxId}-opt-${i}`}
                            role="option"
                            aria-selected={i === activeIndex}
                            className={`record-crate-card ${i === activeIndex ? "is-active" : ""}`}
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
                            <span className="record-crate-cue" aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>
            {!isMobile && <div className="record-crate-rail" aria-hidden="true" />}
        </div>
    );

    const panel = mounted && (isMobile || panelStyle) && createPortal(panelBody, document.body);

    return (
        <div
            className={`record-crate${digging ? " is-digging" : ""}`}
            ref={wrapRef}
            data-lenis-prevent={digging ? "" : undefined}
        >
            <div className="record-crate-input-row" ref={inputRowRef}>
                {digging && (
                    <button
                        type="button"
                        className="record-crate-close"
                        aria-label="Close search"
                        onClick={closeCrate}
                    >
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path
                                d="M3.5 6 8 10.5 12.5 6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                )}
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
