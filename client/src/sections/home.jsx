import { useCallback, useEffect, useRef } from "react";
import "../styles/main.scss";
import Turntable from "../components/turntable.jsx";
import RecordCrate from "../components/record-crate.jsx";
import SkylineBackground from "../components/skyline-background.jsx";
import PlayerDock from "../components/player-dock.jsx";
import BottomSheet from "../components/bottom-sheet.jsx";
import NowPlayingMeta from "../components/now-playing-meta.jsx";
import HeroDeckPreview from "../components/hero-deck-preview.jsx";
import { DECK, onDeckState } from "../lib/deck-state.js";
import { reportPlay } from "../lib/telemetry.js";
import { onProgrammaticScrollChange } from "../lib/scroll.js";
import usePlayerState from "../hooks/use-player-state.js";
import useTouchUI from "../hooks/use-touch-ui.js";
import {
    closeSheet, getPlayerState, openSheet, setTrack,
} from "../lib/player-state.js";

// ---------------------------------------------------------------------------
// Stage 12.3 — the deck has TWO HOMES, and which one it uses is the only
// thing this file decides.
//
//   desktop / fine pointer : the hero's `.hero-deck-stage`, exactly as before
//   touch / narrow         : inside the Pocket Player's bottom sheet
//
// The spec's one-paragraph direction (design-review/mobile-v3/README.md §1):
// on phones the site stops being a scrolling page with a turntable in it and
// becomes an app shell. The crate STAYS in the hero — only the deck moves.
//
// RENDERED IN ONE PLACE OR THE OTHER, never both. Two <Turntable> instances
// would be two GSAP timelines, two Draggables and two sets of deck-state
// writes racing each other through a single module-level audio engine.
//
// The deck is NOT unmounted when the sheet closes. The sheet is always mounted
// and parks itself offscreen with a transform (`pointer-events: none` when
// shut, never `display: none`), so the deck inside it keeps playing with the
// sheet down — which is the entire point of a mini-player — and stays
// measurable, which matters because the arm's rest angle is derived from laid
// out geometry.
//
// Crossing the breakpoint mid-session DOES remount the deck (a rotation, or a
// desktop window dragged narrow). The audio engine is a module-level singleton
// and survives it, so sound continues; the GSAP timelines rebuild, so a drop
// in flight at that exact moment is lost. Judged acceptable: it needs a
// rotation inside a ~1.6s window, and the alternative is reparenting a live 3D
// subtree between two portals, which React does by remounting anyway.
// ---------------------------------------------------------------------------

export default function Home() {
    // The loaded record lives in the player store, not in local state. One
    // value feeds the deck's `track` prop (which is what drives the whole drop
    // choreography — see turntable.jsx's useGSAP on `track?.id`) and the dock's
    // readout, so they cannot disagree about what is on the platter.
    const { track, sheetOpen } = usePlayerState();
    const touchUI = useTouchUI();

    // Owner-only play log. Fires on LOADING/EMPTY -> PLAYING only, never on a
    // resume (PAUSED -> PLAYING) — the same edge skyline-background.jsx
    // already uses to decide whether ballistics need resetting, reused here
    // for the same reason: it is the one place "a new record actually started"
    // is already distinguished from "playback continued."
    //
    // Reads the store directly inside the listener rather than closing over
    // `track`: the subscription is registered once (empty deps), so a closure
    // would see whatever was loaded at mount, not the record that is actually
    // on the deck when the edge fires later. This used to be a ref synced by
    // its own effect; the store makes that bookkeeping unnecessary.
    useEffect(() => onDeckState((next, previous) => {
        if (next === DECK.PLAYING && previous !== DECK.PAUSED) {
            reportPlay(getPlayerState().track);
        }
    }), []);

    // touchUI read through a ref inside `pick` below, so the crate's onSelect
    // prop stays referentially stable across a breakpoint change — RecordCrate
    // holds it in callbacks of its own, and a new function identity there is a
    // re-subscription for no reason.
    const touchUIRef = useRef(touchUI);
    touchUIRef.current = touchUI;

    // A nav click closes the sheet.
    //
    // The navbar is z-index 1000 and the sheet is 80, so the bar stays
    // tappable over an open sheet — visible in
    // design-review/screenshots/mobile-v3-sheet-dark.png. Without this, a tap
    // on "Projects" scrolls a page that nobody can see, behind a dialog that
    // is still marked aria-modal, and the visitor's next gesture dismisses a
    // sheet onto a section they did not watch themselves travel to.
    //
    // Hooked to onProgrammaticScrollChange rather than to the navbar, because
    // that is the existing signal for "something is driving the page
    // somewhere deliberately" — it covers nav clicks, deep links and
    // use-hash-scroll's ResizeObserver re-issue, which are all the same
    // intent and would otherwise need three subscriptions.
    //
    // Closing also restarts Lenis through the sheet's own cleanup, which the
    // scroll then needs. scrollToSection() passes `force: true` precisely so
    // it is not refused by a stopped instance, so the ordering is safe either
    // way.
    //
    // NOT the whole answer to the layering. Raising the sheet above the
    // navbar, or hiding the bar while the sheet is up, is a 12.4 decision —
    // this only makes sure the two cannot leave the visitor somewhere they
    // did not ask to be.
    useEffect(() => onProgrammaticScrollChange((active) => {
        if (active && getPlayerState().sheetOpen) closeSheet();
    }), []);

    // Picking a record from the crate. On a phone this also raises the sheet,
    // so the drop is visible — the deck is inside it.
    //
    // Order matters and is not arbitrary: setTrack() first, openSheet()
    // second. setTrack is what changes `track.id` and starts the deck's
    // choreography, and the sheet's own rise is 620ms against a ~1.6s drop, so
    // the record is in the air while the sheet is still coming up. Opening
    // first would be a sheet sitting open over an empty deck for a frame.
    const pick = useCallback((record) => {
        setTrack(record);
        if (touchUIRef.current) openSheet();
    }, []);

    const deck = <Turntable track={track} />;

    return (
        // data-pocket-player mirrors the touchUI decision into CSS.
        //
        // The grid cannot re-derive it from a media query: TOUCH_UI_QUERY is
        // `(pointer: coarse), (max-width: 768px)` and the hero's mobile block
        // is `max-width: 768px` alone. A touch tablet 900px wide is touchUI
        // (deck in the sheet) but NOT mobile-CSS, so it would keep the
        // two-column "content deck" / "crate deck" grid with nothing in the
        // deck column — content crushed into 44% beside a void. Attribute
        // rather than a second copy of the query, so there is one decision.
        <section className="home" data-pocket-player={touchUI ? "" : undefined}>
            {/* The accent "atmosphere floor" the dot matrix sits on. A plain
                element, not the canvas's own background, so the dark and light
                gradients can be stacked and opacity-crossfaded on a theme flip
                (main.scss). First in the DOM so it stays under the canvas. */}
            <div className="hero-atmosphere" aria-hidden="true" />
            {/* Stage 7 — full-bleed, behind everything, pointer-events:none.
                First in the DOM so it paints under the positioned hero
                content even before z-index is considered. Replaces the
                .hero-vu-slot waveform concept outright: that reserved a
                40–50px strip inside .hero-content, and nothing will ever
                render there now. */}
            <SkylineBackground />
            <div className="hero-content">
                <h1 className="hero-name">Diego Damian</h1>
                <p className="hero-tagline">welcome to my playground</p>
            </div>
            <RecordCrate onSelect={pick} />

            {touchUI
                ? (
                    <>
                        {/* The hero's standing deck (12.4). Mirrors the real
                            deck and opens the sheet; it is the presentational
                            Snow White deck, never a second <Turntable> — see
                            hero-deck-preview.jsx for why that distinction is
                            what makes it safe. */}
                        <div className="hero-preview-stage">
                            <HeroDeckPreview track={track} />
                        </div>
                        <PlayerDock />
                        <BottomSheet
                            open={sheetOpen}
                            onClose={closeSheet}
                            label={track ? `Now playing — ${track.title}` : "Now playing"}
                        >
                            <div className="sheet-deck-stage">{deck}</div>
                            <NowPlayingMeta track={track} />
                        </BottomSheet>
                    </>
                )
                : <div className="hero-deck-stage">{deck}</div>}
        </section>
    );
}
