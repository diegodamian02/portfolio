// Explicit deck states, in their own module rather than exported from
// turntable.jsx — a file that exports both a component and constants breaks
// react-refresh's fast reload.
//
// Phases 8 (scratch), 9 (pitch) and 10 (ducking) each hang behaviour off these,
// so the set is deliberate rather than a pile of booleans.
export const DECK = {
    EMPTY: "EMPTY",                   // no record on the platter
    LOADING: "LOADING",               // record dropping / arm swinging / decoding
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",                 // transport pressed — arm stays DOWN on the record
    STOPPED_LOADED: "STOPPED_LOADED", // preview finished — arm returned to rest
    ERROR: "ERROR",
};

// ---- live deck state, published synchronously (Stage 7b) -------------------
//
// The hero's fluid background needs to know the instant playback begins, and
// "the instant" is load-bearing rather than approximate. turntable.jsx's
// needle-contact callback calls audio.playCached() and then applyDeckState()
// back to back inside ONE GSAP timeline tick, specifically so the sound
// starts in the same frame the arm is drawn touching the record — Stage 1
// measured the async path landing 551ms late and playCached() exists solely
// to close that gap.
//
// A React state round-trip would reintroduce exactly that failure on the
// visual side: an effect watching deckState runs after commit, a tick later.
// So deck state is published here as well, from the same single writer
// (applyDeckState), and subscribers are invoked SYNCHRONOUSLY — the fluid's
// burst therefore lands in the same tick as the audio it represents.
//
// Same shape as turntable-audio.js's own onEnded(): a module-level listener
// Set with an unsubscribe return, not a new event-bus abstraction.

let currentDeckState = DECK.EMPTY;
const deckStateListeners = new Set();

/**
 * Publishes a deck-state transition. Called only by turntable.jsx's
 * applyDeckState, which is already the single writer for this value.
 *
 * Listeners receive (next, previous) so a subscriber can act on a specific
 * EDGE — entering PLAYING — rather than re-deriving it from its own copy.
 */
export function emitDeckState(next) {
    const previous = currentDeckState;
    if (next === previous) return;
    currentDeckState = next;
    deckStateListeners.forEach((fn) => fn(next, previous));
}

export function onDeckState(fn) {
    deckStateListeners.add(fn);
    return () => deckStateListeners.delete(fn);
}

export function getDeckState() {
    return currentDeckState;
}
