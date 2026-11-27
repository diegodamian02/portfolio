import { useSyncExternalStore } from "react";
import { getDeckState, onDeckState } from "../lib/deck-state.js";

// React's view of lib/deck-state.js — Stage 12.3.
//
// Same reasoning as use-player-state.js: deck state is published
// SYNCHRONOUSLY, from turntable.jsx's applyDeckState, specifically so the
// skyline appears in the same tick as the audio it represents (see
// deck-state.js). A useState + useEffect subscription has a window between
// render and effect-run in which a publish is simply missed, and on this
// store that would show as the dock's play/pause icon disagreeing with the
// deck.
//
// getDeckState returns a STRING from a fixed set, so snapshot identity is
// stable by construction — no memoisation needed, unlike the player store
// whose snapshot is an object.
//
// This is for components that want to RE-RENDER on a deck transition. Nothing
// on the critical path uses it: the needle-contact frame subscribes to
// onDeckState directly, because a React commit is a tick too late there.
export default function useDeckState() {
    return useSyncExternalStore(onDeckState, getDeckState, getDeckState);
}
