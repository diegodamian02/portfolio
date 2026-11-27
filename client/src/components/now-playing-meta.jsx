/* eslint-disable react/prop-types */
//
// FILE-LEVEL, not the `eslint-disable-next-line` this repo normally uses.
// `track` is read in eight places (id, title, artist, artworkUrl,
// artworkThumbUrl), and react/prop-types reports each access separately, so a
// next-line directive would suppress one of eight and leave seven. The repo
// has no propTypes convention and no `prop-types` dependency, and CLAUDE.md
// holds lint at a 7-error baseline that this file must not add to.
//
// A first attempt put `// eslint-disable-next-line` above the explanatory
// comment rather than above the function, which made it apply to the comment:
// eslint then reported it as an UNUSED directive while all eight errors stood.
import { useEffect, useRef } from "react";
import * as audio from "../lib/turntable-audio.js";
import useDeckState from "../hooks/use-deck-state.js";
import { DECK } from "../lib/deck-state.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";

// What is on the deck, and how far through it we are — Stage 12.4.
//
// Sits under the deck inside the bottom sheet. Before this the sheet held the
// deck and nothing else: the header carried the track name and the rest was
// empty space.
//
// ---------------------------------------------------------------------------
// THE PROGRESS LINE DOES NOT RE-RENDER REACT.
// ---------------------------------------------------------------------------
// It is written straight to a CSS custom property from a rAF loop, the same
// technique record-crate.jsx uses for the keyboard inset. A setState per frame
// would be 60 React commits a second competing with the deck's own GSAP
// timeline and the skyline's canvas for the same main thread — and this is a
// phone, where Stage 12.1 measured the whole deck fitting in a 60Hz budget
// with nothing to spare at 4x CPU throttle.
//
// The loop only runs while the deck is PLAYING. Everything else (paused,
// stopped, loading) holds its last position, which is the honest reading: a
// paused deck has not moved.
//
// Elapsed comes from turntable-audio.getElapsed(), which derives it from the
// AudioContext clock — not from a counter this component keeps. That matters
// because the pitch fader changes playbackRate: a wall-clock counter would
// drift away from the audio the moment anyone touched it, and the audio
// module already does this arithmetic correctly for its own purposes.

function clock(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function NowPlayingMeta({ track }) {
    const deckState = useDeckState();
    const reduced = useReducedMotion();
    const barRef = useRef(null);
    const elapsedRef = useRef(null);
    const totalRef = useRef(null);

    const playing = deckState === DECK.PLAYING;

    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return undefined;

        let frame = 0;
        // A generation id, not a boolean. design-review/mobile-v3's own
        // rAF probe was bitten by exactly this (D39): a shared flag let a
        // previous loop resume after a new one had started, and the two
        // then fought over the same target.
        let live = true;

        const paint = () => {
            const duration = audio.getDuration();
            const elapsed = audio.getElapsed();
            const ratio = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 0;
            bar.style.setProperty("--progress", ratio.toFixed(4));
            if (elapsedRef.current) elapsedRef.current.textContent = clock(elapsed);
            if (totalRef.current) {
                totalRef.current.textContent = duration > 0 ? clock(duration) : "--:--";
            }
        };

        // Paint once regardless of state, so a paused or just-stopped deck
        // shows where it actually is rather than an empty bar.
        paint();

        if (!playing) return () => { live = false; };

        const tick = () => {
            if (!live) return;
            paint();
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);

        return () => {
            live = false;
            if (frame) cancelAnimationFrame(frame);
        };
    }, [playing, track?.id]);

    if (!track) return null;

    return (
        <div className="np-meta">
            <div className="np-meta-head">
                {/* The 600px artwork here, not the 60px thumbnail the dock
                    uses — this box is ~64px on a 3x phone, so the small one
                    would be visibly soft. */}
                {(track.artworkUrl || track.artworkThumbUrl) && (
                    <img
                        className="np-meta-art"
                        src={track.artworkUrl || track.artworkThumbUrl}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                    />
                )}
                <div className="np-meta-text">
                    <p className="np-meta-title">{track.title}</p>
                    <p className="np-meta-artist">{track.artist}</p>
                </div>
            </div>

            {/* role="group" with an accessible name rather than a progressbar
                role: this is NOT interactive (there is no scrubbing yet) and
                a progressbar that cannot be moved invites the attempt. The
                times below are real text, so a screen reader gets the
                position from them without a redundant live region. */}
            <div className="np-meta-progress" role="group" aria-label="Preview position">
                <div className="np-meta-track" ref={barRef} data-reduced={reduced ? "" : undefined}>
                    <span className="np-meta-fill" aria-hidden="true" />
                </div>
                <div className="np-meta-times">
                    <span ref={elapsedRef}>0:00</span>
                    {/* Apple's previews are about 30s, but the real decoded
                        length is used — it has varied by track, and a
                        hardcoded 30 would mis-scale the bar rather than fail
                        visibly. "--:--" until the buffer is decoded. */}
                    <span ref={totalRef}>--:--</span>
                </div>
            </div>
        </div>
    );
}
