// A module-level reference to the LIVE turntable's imperative controls —
// Stage 12.3.
//
// Exactly the pattern lib/scroll.js already uses for the Lenis instance, and
// for the same reason: the dock's transport button needs to reach the deck,
// but the dock is portaled to <body> and the deck may be rendered in a
// different subtree entirely (the hero on desktop, the bottom sheet on a
// phone). Threading a ref through two portals and a media query would be
// more machinery and less honest than one shared reference.
//
// WHY NOT a `playing` boolean in the player store that the dock writes:
// because the deck already owns that truth. turntable.jsx's applyDeckState is
// the single writer for deck state, and it guards transitions the store knows
// nothing about — a press during the load choreography, during a scratch, or
// on an errored deck is REFUSED (isBusyRef, scratchActive, DECK.ERROR). A
// store boolean the dock could flip would be a second source of truth that
// disagrees with the deck the moment one of those guards fires, and the
// symptom would be a pause icon on a deck that is still playing.
//
// So: the dock ASKS, the deck DECIDES, and the dock's icon is rendered from
// deck state (hooks/use-deck-state.js), never from the dock's own optimism.
//
// null before the deck mounts, and on a phone whenever the sheet's deck is
// unmounted — every caller must use `?.`.

let activeDeck = null;

/**
 * Registered by turntable.jsx on mount, cleared on unmount.
 *
 * `api` is `{ transport() }`: a single verb, deliberately. The deck's
 * transport button is one control whose meaning depends on deck state
 * (play / pause / replay), and that mapping lives in turntable.jsx's
 * handleTransport. Exposing play() and pause() separately would duplicate
 * that decision table out here, where it would drift.
 */
export function setActiveDeck(api) {
    activeDeck = api;
}

export function getActiveDeck() {
    return activeDeck;
}
