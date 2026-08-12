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
