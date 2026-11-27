/* eslint-disable react/prop-types */
//
// File-level for the same reason now-playing-meta.jsx carries one: `track` is
// read in several places and react/prop-types reports each access, so a
// next-line directive would suppress one and leave the rest. The repo has no
// propTypes convention and lint is held at a 7-error baseline.
import { useCallback, useEffect, useRef } from "react";
import SnowWhiteDeck from "./snow-white-deck.jsx";
import useDeckState from "../hooks/use-deck-state.js";
import { DECK } from "../lib/deck-state.js";
import { cardHueFor } from "../lib/card-hue.js";
import { openSheet } from "../lib/player-state.js";

// The hero's standing deck — Stage 12.4.
//
// Stage 12.3 moved the turntable off the phone's hero and into the bottom
// sheet, which left the hero as a name, a tagline, a search field and most of
// a screen of gradient. This puts an object back in that space: a small deck
// that mirrors what is on the real one and opens the sheet when tapped.
//
// ---------------------------------------------------------------------------
// THIS IS THE SNOW WHITE DECK, NOT A SECOND <Turntable>.
// ---------------------------------------------------------------------------
// That distinction is the whole reason this is safe. snow-white-deck.jsx is
// PRESENTATIONAL by construction (Stage 12.1): no audio, no deck-state writes,
// no crate. Two <Turntable> instances would be two GSAP timelines and two sets
// of deck-state writes racing through one module-level audio engine — the
// thing sections/home.jsx asserts against with `deckCount === 1`.
//
// So this deck is told, never asked. It reads deck state to mirror it and
// writes nothing back.
//
// THE KNOWN COST, flagged before it was built and accepted by the owner: the
// hero and the sheet now show two decks that do not look alike — Snow White
// here, the existing dark turntable in the sheet. Replacing turntable.jsx with
// the Snow White geometry is a separate, much larger job (it owns the scratch
// surface, the tonearm geometry and the pitch fader). If the mismatch reads
// badly, this component is the cheap thing to remove, not the deck to rebuild.
//
// Rings are OFF. They are a flourish sized for the full deck; at preview scale
// they are noise, and they cost frames in a hero that already runs the skyline
// canvas. setRings(false) rather than CSS, so the bursts are never fired.

export default function HeroDeckPreview({ track }) {
    const deckState = useDeckState();
    const apiRef = useRef(null);
    const loadedIdRef = useRef(null);

    const playing = deckState === DECK.PLAYING;

    // Rings off once, as soon as the deck registers its api.
    useEffect(() => { apiRef.current?.setRings(false); }, []);

    // Mirror the real deck's transport. `playing` only — LOADING deliberately
    // does not spin the platter up, because on the real deck the record is
    // still in the air at that point and a spinning preview would be ahead of
    // the thing it is mirroring.
    useEffect(() => { apiRef.current?.setPlaying(playing); }, [playing]);

    // Mirror the record itself. Keyed on id, like turntable.jsx's own
    // choreography, so a re-render with the same track does not re-drop.
    useEffect(() => {
        const api = apiRef.current;
        if (!api) return;
        if (track?.id == null) {
            if (loadedIdRef.current !== null) {
                loadedIdRef.current = null;
                api.lift();
            }
            return;
        }
        if (loadedIdRef.current === track.id) return;
        loadedIdRef.current = track.id;
        api.setRings(false);
        api.drop();
    }, [track?.id]);

    const activate = useCallback(() => {
        if (track) { openSheet(); return; }
        // Nothing loaded: the useful action is to go and pick something, so
        // send focus to the crate rather than opening an empty sheet.
        //
        // A querySelector rather than a ref threaded down from Home: the
        // crate owns that input, renders it conditionally, and moves it into
        // a portaled full-screen takeover on exactly these viewports. A ref
        // would have to survive all of that to do what one selector does.
        const input = document.querySelector(".record-crate-input");
        if (input) {
            input.focus({ preventScroll: true });
            input.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, [track]);

    return (
        <button
            type="button"
            className="hero-deck-preview"
            onClick={activate}
            aria-label={track
                ? `Open now playing — ${track.title}`
                : "Pick a record to play"}
            data-loaded={track ? "" : undefined}
        >
            <span className="hero-deck-preview-deck" aria-hidden="true">
                <SnowWhiteDeck
                    // The track's own wax colour — the same one the crate
                    // painted on the spine of the card that was tapped, and
                    // the same one the dock falls back to. A `var()` string is
                    // a valid custom-property value and resolves through
                    // color-mix() inside the deck's own styles.
                    labelColor={track?.id != null
                        ? `var(--wax-${cardHueFor(track.id)})`
                        : "var(--deck-sw-accent)"}
                    apiRef={apiRef}
                />
            </span>
            <span className="hero-deck-preview-hint">
                {track ? "tap to open" : "put a record on"}
            </span>
        </button>
    );
}
