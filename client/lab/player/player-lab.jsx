import { useCallback, useEffect, useRef, useState } from "react";
import SnowWhiteDeck from "../../src/components/snow-white-deck.jsx";
import BottomSheet from "../../src/components/bottom-sheet.jsx";
import PlayerDock from "../../src/components/player-dock.jsx";
import usePlayerState from "../../src/hooks/use-player-state.js";
import useDeckState from "../../src/hooks/use-deck-state.js";
import { setTrack, openSheet, closeSheet } from "../../src/lib/player-state.js";
import { setActiveDeck } from "../../src/lib/deck-controls.js";
import { DECK, emitDeckState, getDeckState } from "../../src/lib/deck-state.js";

// ---------------------------------------------------------------------------
// /lab/player/ — the Stage 12.2 shell, exercised. DEV ONLY (see index.html).
//
// What this is for: the dock and the sheet are production components living
// in src/, but nothing mounts them yet — Stage 12.3 does that, when the real
// turntable moves in. This page mounts them over a dummy scrolling page so
// the STRUCTURE can be reviewed on a phone before any of the real deck's
// audio, deck-state or crate wiring is touched.
//
// The deck inside the sheet is the 12.1 Snow White spike, standing in for the
// real turntable. It is the right stand-in precisely because it is
// presentational: if the sheet works around it, the sheet is not leaning on
// anything the real deck will not also provide.
//
// STAGE 12.3 — this page now stands in for turntable.jsx on BOTH of the seams
// the real deck owns, so the dock is exercised here exactly as it is on the
// live site:
//
//   setActiveDeck({ transport })  the dock's button calls into the deck
//   emitDeckState(...)            the dock's icon is rendered from deck state
//
// emitDeckState is normally written by turntable.jsx's applyDeckState ALONE,
// and that single-writer rule is real — see lib/deck-state.js. This page is
// the one deliberate exception: it is dev-only by construction (its own Vite
// entry, never in build.rollupOptions.input, 0 bytes of production JS proven
// by A/B in STATUS §2), and the alternative — a lab that drives the dock
// through some other path — would be a lab that cannot catch a break in the
// path the site actually uses.
//
// The sheet's content is deliberately TALLER THAN THE SHEET. The one genuinely
// hard behaviour here is "drag to dismiss, but only from scroll-top", and it
// cannot be tested at all against content that does not scroll.
// ---------------------------------------------------------------------------

const CRATE = [
    { id: "look-the-part", title: "Look The Part", artist: "Ezra Collective", color: "#6f9bff" },
    { id: "notting-hill", title: "Notting Hill", artist: "Ezra Collective", color: "#ff8a5c" },
    { id: "cowboy-nudes", title: "Cowboy Nudes", artist: "Ezra Collective", color: "#7fd6a4" },
];

// Filler so the page behind the dock scrolls, and so the sheet's own content
// overflows. Text rather than boxes: a real sheet will hold a tracklist and
// notes, and text is what exposes a scroll container behaving oddly.
const NOTES = [
    "Recorded live, two takes, no click.",
    "The horn line enters on the second bar and never resolves.",
    "B-side was cut from the same session.",
    "Pressed at 45rpm on the first run, 33 after.",
    "Sleeve art by the drummer's sister.",
    "Out of print since the reissue.",
    "The bassline is the whole song.",
    "Mixed in a flat above a chip shop.",
];

export default function PlayerLab() {
    const { track, sheetOpen } = usePlayerState();
    const deckState = useDeckState();
    const playing = deckState === DECK.PLAYING;
    const deckApi = useRef(null);
    const [theme, setTheme] = useState(
        () => document.documentElement.getAttribute("data-theme") || "dark",
    );

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    // Stand in for turntable.jsx's transport. The real one (handleTransport)
    // decides what a press MEANS from live deck state and refuses it outright
    // mid-load, mid-scratch or on an errored deck; this one only has to be a
    // single verb that flips the spin and publishes the result, because the
    // dock must not assume anything beyond that.
    //
    // Spin first, publish second, both synchronous: the dock's icon comes from
    // deck state, so publishing before the visual would briefly describe a
    // deck that had not moved yet.
    const transport = useCallback(() => {
        if (!track) return;
        const next = !(getDeckState() === DECK.PLAYING);
        deckApi.current?.setPlaying(next);
        emitDeckState(next ? DECK.PLAYING : DECK.PAUSED);
    }, [track]);

    // Re-registered when `transport` changes, for the reason turntable.jsx's
    // own registration spells out: a closure pinned at mount would hold a
    // stale `track`.
    useEffect(() => {
        setActiveDeck({ transport });
        return () => setActiveDeck(null);
    }, [transport]);

    const pick = useCallback((record) => {
        setTrack(record);
        openSheet();
        // The drop is the deck's own business; the store only records that a
        // record was chosen. On the live site this call site is just
        // setTrack() — the real deck's own useGSAP reacts to `track.id`
        // changing and runs the whole drop itself.
        emitDeckState(DECK.LOADING);
        deckApi.current?.drop();
    }, []);

    const eject = useCallback(() => {
        deckApi.current?.lift();
        setTrack(null);
        closeSheet();
        emitDeckState(DECK.EMPTY);
    }, []);

    return (
        <div className="player-lab">
            <header className="player-lab-bar">
                <button
                    type="button"
                    className="deck-lab-button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                    {theme === "dark" ? "Studio Paper" : "Graphite"}
                </button>
                <button type="button" className="deck-lab-button" onClick={eject} disabled={!track}>
                    Eject
                </button>
            </header>

            <p className="deck-lab-readout">
                /lab/player/ — Stage 12.2 shell · {track ? track.title : "nothing loaded"}
                {" · "}{playing ? "playing" : "stopped"}{sheetOpen ? " · sheet up" : ""}
            </p>

            <section className="player-lab-crate">
                <h2 className="player-lab-h">In the crate</h2>
                {CRATE.map((record) => (
                    <button
                        key={record.id}
                        type="button"
                        className="player-lab-sleeve"
                        style={{ "--sleeve-color": record.color }}
                        aria-pressed={track?.id === record.id}
                        onClick={() => pick(record)}
                    >
                        <span className="player-lab-sleeve-title">{record.title}</span>
                        <span className="player-lab-sleeve-artist">{record.artist}</span>
                    </button>
                ))}
            </section>

            {/* Dummy sections, so the dock has something to float over and
                the page behind the sheet has somewhere to scroll to. */}
            {["About", "Experience", "Projects", "Connect"].map((name) => (
                <section className="player-lab-section" key={name}>
                    <h2 className="player-lab-h">{name}</h2>
                    <p>
                        Placeholder for the real section. The dock should float over this
                        without covering the last line of any of them, and scrolling here
                        must not move the sheet.
                    </p>
                </section>
            ))}

            <PlayerDock />

            <BottomSheet
                open={sheetOpen}
                onClose={closeSheet}
                label={track ? `Now playing — ${track.title}` : "Now playing"}
            >
                <div className="player-lab-sheet-deck">
                    <SnowWhiteDeck
                        labelColor={track?.color || "#6f9bff"}
                        apiRef={deckApi}
                        // The real deck starts audio at needle contact and
                        // publishes PLAYING from the same tick. Mirrored here
                        // so the dock's icon flips at the same moment of the
                        // drop that it will on the site.
                        onNeedleDown={() => emitDeckState(DECK.PLAYING)}
                    />
                </div>

                <div className="player-lab-sheet-meta">
                    <p className="player-lab-sheet-title">{track?.title ?? "No record"}</p>
                    <p className="player-lab-sheet-artist">{track?.artist ?? ""}</p>
                    <button
                        type="button"
                        className="deck-lab-button"
                        onClick={transport}
                        disabled={!track}
                    >
                        {playing ? "Pause" : "Play"}
                    </button>
                </div>

                {/* The scroll test. Drag down from HERE and the sheet must
                    not move until the list is scrolled back to its top. */}
                <ul className="player-lab-notes">
                    {NOTES.map((note) => <li key={note}>{note}</li>)}
                </ul>
            </BottomSheet>
        </div>
    );
}
