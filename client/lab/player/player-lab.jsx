import { useCallback, useEffect, useRef, useState } from "react";
import SnowWhiteDeck from "../../src/components/snow-white-deck.jsx";
import BottomSheet from "../../src/components/bottom-sheet.jsx";
import PlayerDock from "../../src/components/player-dock.jsx";
import usePlayerState from "../../src/hooks/use-player-state.js";
import {
    setTrack, setPlaying, openSheet, closeSheet, onPlayerState,
} from "../../src/lib/player-state.js";

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
    const { track, playing, sheetOpen } = usePlayerState();
    const deckApi = useRef(null);
    const [theme, setTheme] = useState(
        () => document.documentElement.getAttribute("data-theme") || "dark",
    );

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    // The store is the single source of truth for "is it playing"; the deck
    // is told, not asked. Subscribed directly rather than through the hook so
    // the deck is driven in the SAME tick as the store write — this is the
    // seam Stage 12.3 replaces with the real deck's transport, and getting
    // the timing shape right here is the point of the exercise.
    useEffect(() => onPlayerState((next, previous) => {
        if (next.playing !== previous.playing) deckApi.current?.setPlaying(next.playing);
    }), []);

    const pick = useCallback((record) => {
        setTrack(record);
        openSheet();
        // The drop is the deck's own business; the store only records that a
        // record was chosen. In 12.3 this call site becomes the real deck's
        // load, and its needle-contact callback is what sets playing — not
        // this function.
        deckApi.current?.drop();
    }, []);

    const eject = useCallback(() => {
        deckApi.current?.lift();
        setTrack(null);
        closeSheet();
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
                    <SnowWhiteDeck labelColor={track?.color || "#6f9bff"} apiRef={deckApi} />
                </div>

                <div className="player-lab-sheet-meta">
                    <p className="player-lab-sheet-title">{track?.title ?? "No record"}</p>
                    <p className="player-lab-sheet-artist">{track?.artist ?? ""}</p>
                    <button
                        type="button"
                        className="deck-lab-button"
                        onClick={() => setPlaying(!playing)}
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
