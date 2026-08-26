import { useEffect, useRef, useState } from "react";
import "../styles/main.scss";
import Turntable from "../components/turntable.jsx";
import RecordCrate from "../components/record-crate.jsx";
import SkylineBackground from "../components/skyline-background.jsx";
import { DECK, onDeckState } from "../lib/deck-state.js";
import { reportPlay } from "../lib/telemetry.js";

export default function Home() {
    const [nowPlaying, setNowPlaying] = useState(null);

    // Owner-only play log. Fires on LOADING/EMPTY -> PLAYING only, never on a
    // resume (PAUSED -> PLAYING) — the same edge skyline-background.jsx
    // already uses to decide whether ballistics need resetting, reused here
    // for the same reason: it is the one place "a new record actually started"
    // is already distinguished from "playback continued."
    //
    // A ref rather than reading `nowPlaying` directly in the subscription: the
    // listener is registered once (empty deps) so its closure would otherwise
    // see whatever `nowPlaying` was on mount, not the track that's actually
    // loaded when the edge fires later.
    const nowPlayingRef = useRef(null);
    useEffect(() => { nowPlayingRef.current = nowPlaying; }, [nowPlaying]);
    useEffect(() => onDeckState((next, previous) => {
        if (next === DECK.PLAYING && previous !== DECK.PAUSED) {
            reportPlay(nowPlayingRef.current);
        }
    }), []);

    return (
        <section className="home">
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
            <RecordCrate onSelect={setNowPlaying} />
            <div className="hero-deck-stage">
                <Turntable track={nowPlaying} />
            </div>
        </section>
    );
}
