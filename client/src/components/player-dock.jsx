import { createPortal } from "react-dom";
import usePlayerState from "../hooks/use-player-state.js";
import useDeckState from "../hooks/use-deck-state.js";
import { openSheet } from "../lib/player-state.js";
import { getActiveDeck } from "../lib/deck-controls.js";
import { DECK } from "../lib/deck-state.js";

// The floating glass mini-player — Stage 12.2, wired to the real deck in 12.3.
//
// Sits at the foot of every section on a phone. Tapping it opens the
// now-playing sheet; the transport button is the one control that works
// without opening anything.
//
// NO ANIMATION, deliberately — the roadmap puts the dock's entrance and the
// dock <-> sheet Flip in 12.4. It appears and disappears with `data-shown`.
// Building the motion now would mean building it twice, because the Flip in
// 12.4 needs the dock and the sheet's header to be two states of one element
// and that changes the markup.
//
// Portaled to <body> for the same reason the sheet is: `position: fixed`
// inside the hero's grid is a relayout waiting to happen, and the dock has to
// outlive every section it floats over.

// ---------------------------------------------------------------------------
// TWO STORES, ON PURPOSE, AND THEY ARE NOT INTERCHANGEABLE.
//
//   player-state  — what the player UI is showing (which track, sheet up?)
//   deck-state    — what the deck's transport is actually doing
//
// The icon is rendered from DECK STATE, never from a local optimistic
// boolean. turntable.jsx's handleTransport refuses a press outright while the
// load choreography is running, while a scratch owns the platter, or on an
// errored deck. A dock that flipped its own icon on tap would show "pause"
// over a deck that never started. Asking and then rendering what actually
// happened is one extra store subscription and no lies.
// ---------------------------------------------------------------------------

// PAUSED and STOPPED_LOADED both mean "a record is on the deck, not
// sounding": paused mid-track with the arm down, or finished with the arm
// back at rest. Both show a play triangle, because both resume on a press —
// handleTransport maps STOPPED_LOADED to a replay (arm swings out again).
// LOADING shows one too: the record is dropping, nothing is audible yet, and
// a pause icon there would invite a press the deck is about to refuse.
const SOUNDING = new Set([DECK.PLAYING]);

export default function PlayerDock() {
    const { track, sheetOpen } = usePlayerState();
    const deckState = useDeckState();

    const playing = SOUNDING.has(deckState);

    // Hidden when there is nothing loaded, and while the sheet is up — the
    // sheet IS the player at that point, and a dock peeking under it is just
    // a second copy of the same controls.
    const shown = !!track && !sheetOpen;

    return createPortal(
        <div className="player-dock" data-shown={shown ? "" : undefined} aria-hidden={shown ? undefined : "true"}>
            {/* The whole panel is the open affordance. A <button> wrapping
                the transport <button> would be invalid HTML (nested
                interactive content, and a real accessibility failure — a
                screen reader cannot offer the inner control), so the panel is
                a div with its own button sibling, and the two are separate
                tab stops with separate labels. */}
            <button
                type="button"
                className="player-dock-open"
                onClick={openSheet}
                aria-label={track ? `Open now playing — ${track.title}` : "Open now playing"}
                tabIndex={shown ? 0 : -1}
            >
                <span
                    className="player-dock-art"
                    style={track?.color ? { "--dock-art": track.color } : undefined}
                    aria-hidden="true"
                />
                <span className="player-dock-meta">
                    <span className="player-dock-title">{track?.title ?? ""}</span>
                    <span className="player-dock-artist">{track?.artist ?? ""}</span>
                </span>
            </button>

            <button
                type="button"
                className="player-dock-transport"
                // The deck decides. getActiveDeck() is null between the dock
                // mounting and the deck registering, and on a phone whenever
                // the sheet's deck is unmounted — hence `?.` rather than an
                // assertion. A press that lands in that window is a no-op,
                // which is the correct outcome: there is no deck to transport.
                onClick={() => getActiveDeck()?.transport()}
                aria-label={playing ? `Pause ${track?.title ?? ""}` : `Play ${track?.title ?? ""}`}
                tabIndex={shown ? 0 : -1}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {playing
                        ? (
                            <g>
                                <rect x="8" y="6" width="2.8" height="12" rx="1.2" />
                                <rect x="13.2" y="6" width="2.8" height="12" rx="1.2" />
                            </g>
                        )
                        // Same half-unit rightward nudge as the deck's own
                        // transport glyph (turntable.jsx): a triangle's mass
                        // sits to its left, so geometric centring reads as
                        // left-leaning.
                        : <path d="M8 6 L17 12 L8 18 Z" />}
                </svg>
            </button>
        </div>,
        document.body,
    );
}
