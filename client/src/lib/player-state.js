// The Pocket Player's state — Stage 12.2.
//
// What is loaded, whether it is playing, and whether the now-playing sheet is
// open. The dock and the sheet are two views of ONE value, so they cannot
// disagree about what is on the deck.
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
 * @property {boolean} playing    transport state, mirrored for the dock
 * @property {boolean} sheetOpen  is the now-playing sheet up
 * @property {boolean} ducked     see the note on setDucked below
 */

const initialState = {
    track: null,
    playing: false,
    sheetOpen: false,
    ducked: false,
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
 * showing the deck are separate decisions, and Stage 12.3 needs to load a
 * track while the sheet is still rising.
 */
export function setTrack(track) {
    publish({ track: track ?? null, playing: false });
}

export function setPlaying(playing) {
    // Nothing can be playing on an empty deck. Guarded here rather than at
    // each call site, because the dock's transport button and the deck's own
    // needle-contact callback are both callers and only one of them knows.
    publish({ playing: state.track ? !!playing : false });
}

export function openSheet() { publish({ sheetOpen: true }); }
export function closeSheet() { publish({ sheetOpen: false }); }
export function toggleSheet() { publish({ sheetOpen: !state.sheetOpen }); }

/**
 * Whether the player should be holding its own volume down.
 *
 * DECLARED HERE IN 12.2, NOT YET CONSUMED — and that is deliberate, so read
 * this before wiring it. `turntable-audio.js` has no single writer for the
 * master gain: `setVolume`, `followSpin`, `settleSpin` and `fadeOutAndStop`
 * all write `masterGain.gain` directly, which is fine today because they are
 * mutually exclusive phases of one deck. Ducking is the first thing that
 * needs to cut across all four — it has to survive a spin-up, a settle and a
 * transport press without any of them clobbering it.
 *
 * The audio refactor is Stage 12.3's job, where it has a real consumer. Doing
 * it in 12.2 would mean changing live audio code with nothing exercising it;
 * the deck's audio has no headless test coverage at all (no audio device in
 * headless Chromium — design-review/scratch-tests/README.md), so an untested
 * refactor there is the worst kind of speculative change. This flag exists so
 * the SHAPE is agreed now and 12.3 only has to supply the writer.
 */
export function setDucked(ducked) {
    publish({ ducked: !!ducked });
}

/** Test/lab only. Returns the store to its initial value without notifying. */
export function __resetPlayerState() {
    state = { ...initialState };
}
