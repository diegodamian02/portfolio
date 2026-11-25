import { useSyncExternalStore } from "react";
import { getPlayerState, onPlayerState } from "../lib/player-state.js";

// React's view of lib/player-state.js — Stage 12.2.
//
// useSyncExternalStore, not useState + useEffect. The store publishes
// SYNCHRONOUSLY (see player-state.js for why that is load-bearing), and a
// useEffect subscription has a window between render and effect-run in which
// a publish is simply missed — the classic tearing bug, and on this store it
// would show as the dock and the sheet disagreeing about what is playing.
// useSyncExternalStore is the API React added for exactly this shape: it
// subscribes at the right time and re-reads the snapshot before committing.
//
// getPlayerState returns the SAME object identity until something actually
// changes (player-state.js's publish() no-ops when nothing differs), which is
// what makes it a valid getSnapshot — returning a fresh object each call
// would loop forever.
//
// The critical path does NOT go through this hook. Anything that must land in
// the same tick as an audio call subscribes to the store directly; this is
// for components that want a re-render, which is most of them but none of the
// urgent ones.
export default function usePlayerState() {
    return useSyncExternalStore(onPlayerState, getPlayerState, getPlayerState);
}
