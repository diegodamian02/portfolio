// The Pocket Player's state — Stage 12.2, narrowed in 12.3.
//
// What is loaded, and whether the now-playing sheet is open. The dock and the
// sheet are two views of ONE value, so they cannot disagree about what is on
// the deck.
//
// NOT "whether it is playing". 12.2 kept a `playing` boolean here and 12.3
// removed it, because the deck already owns that truth: turntable.jsx's
// applyDeckState is the single writer for deck state, and it REFUSES
// transitions this store knows nothing about — a transport press during the
// load choreography, during a scratch, or on an errored deck does not change
// what the deck is doing (isBusyRef, scratchActive, DECK.ERROR). A boolean
// here that the dock could flip was a second source of truth that would
// disagree with the deck the moment one of those guards fired, and the
// symptom would be a pause icon on a deck that never started. The dock now
// renders its icon from deck state (hooks/use-deck-state.js) and asks the
// deck to act via lib/deck-controls.js.
//
// ---------------------------------------------------------------------------
// WHY THIS IS A MODULE AND NOT REACT CONTEXT
// ---------------------------------------------------------------------------
// Same reason deck-state.js exists, and that file is worth reading before
// changing this one. Context (or any useState round-trip) publishes on React's
// schedule: a subscriber's effect runs AFTER commit, a tick later than the
// write. Stage 1 measured exactly that failure on the audio path — the deck's
// sound started 551ms after the needle was drawn touching the record, and
// playCached() exists solely to close that gap by starting the source in the
// SAME statement run as the visual.
//
// Stage 12.3 moves the real turntable into the sheet, which means the needle
// drop, the audio start and the dock's "now playing" readout all have to land
// in one tick. A module-level value with synchronous listeners can do that; a
// context cannot. Components that genuinely want a re-render use
// hooks/use-player-state.js, which subscribes here — so React gets its update
// too, just not on the critical path.
//
// Deliberately NOT merged into deck-state.js. That module answers "what is the
// deck's transport doing" (EMPTY / LOADING / PLAYING / …) and is written by
// turntable.jsx alone. This answers "what is the player UI showing" — a
// different question with a different writer, and a sheet can be open over a
// deck that is PAUSED, or shut over one that is PLAYING.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PlayerState
 * @property {object|null} track  the loaded track, or null for an empty deck
 * @property {boolean} sheetOpen  is the now-playing sheet up
 */

const initialState = {
    track: null,
    sheetOpen: false,
};

let state = { ...initialState };
const listeners = new Set();

// THE SINGLE WRITER. Every mutation below funnels through here, for the same
// reason turntable.jsx routes every deck-state write through applyDeckState:
// two code paths writing the same value is how they drift.
//
// Listeners are invoked SYNCHRONOUSLY, inside the caller's own statement run.
// A subscriber that throws must not stop the others from being told, or the
// dock and the sheet end up describing different tracks — hence the try/catch
// per listener rather than one around the loop.
function publish(patch) {
    const previous = state;
    const next = { ...state, ...patch };

    // No-op guard. Without it, a component that re-publishes the same track on
    // every render drives a synchronous notify storm through every subscriber.
    let changed = false;
    for (const key of Object.keys(next)) {
        if (next[key] !== previous[key]) { changed = true; break; }
    }
    if (!changed) return;

    state = next;
    listeners.forEach((fn) => {
        try {
            fn(state, previous);
        } catch (error) {
            // Swallowed on purpose, logged so it is not invisible. A broken
            // subscriber is a bug in that subscriber, not a reason to leave
            // the rest of the UI stale.
            console.error("[player-state] listener threw", error);
        }
    });
}

export function getPlayerState() {
    return state;
}

/** Subscribers receive (next, previous) so they can act on an EDGE. */
export function onPlayerState(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * Loads a track. Passing null empties the deck.
 *
 * Does NOT open the sheet and does NOT start playback — picking a record and
 * showing the deck are separate decisions, and 12.3 loads the track while the
 * sheet is still rising.
 *
 * Playback is not this function's business either. Setting a track here is
 * what makes `track.id` change on the <Turntable> below it, and the deck's
 * own choreography reacts to that: drop, spin-up, arm swing, and audio at
 * needle contact. That sequence has always been driven by the track prop and
 * 12.3 did not change it.
 */
export function setTrack(track) {
    publish({ track: track ?? null });
}

export function openSheet() { publish({ sheetOpen: true }); }
export function closeSheet() { publish({ sheetOpen: false }); }
export function toggleSheet() { publish({ sheetOpen: !state.sheetOpen }); }

// ---------------------------------------------------------------------------
// setDucked() WAS DECLARED HERE IN 12.2 AND REMOVED IN 12.3. Read this before
// adding it back.
//
// The 12.2 note said the master-gain refactor was 12.3's job, "where it has a
// real consumer". It turned out there is no consumer, and there is no ducking
// anywhere in the app: `deck-state.js` mentions "Phase 10 (ducking)" in a
// comment, but no code implements it and nothing in the Pocket Player needs
// it — the sheet opens over a page that makes no sound of its own.
//
// So the honest options were to invent a consumer, or to delete the flag. The
// underlying observation stands and is still true: turntable-audio.js has no
// single writer for the master gain — `setVolume`, `followSpin`, `settleSpin`
// and `fadeOutAndStop` all write `masterGain.gain` directly. That is FINE
// today because they are mutually exclusive phases of one deck, and it only
// becomes a bug when something needs to hold the gain down ACROSS those
// phases.
//
// Introducing a gain mixer with exactly one input, to serve a flag with no
// consumer, in a module with no headless test coverage (there is no audio
// device in headless Chromium — design-review/scratch-tests/README.md), is
// speculative architecture with real risk and no payoff. It is recorded as a
// known constraint in FINDINGS instead, so whoever adds the first real
// ducking consumer finds the analysis already done rather than discovering it
// mid-feature.
// ---------------------------------------------------------------------------

/** Test/lab only. Returns the store to its initial value without notifying. */
export function __resetPlayerState() {
    state = { ...initialState };
}
