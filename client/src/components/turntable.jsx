import { useEffect, useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import VinylRecord from "./vinyl-record.jsx";
import StrobeRing from "./strobe-ring.jsx";
import * as audio from "../lib/turntable-audio.js";
import { DECK } from "../lib/deck-state.js";
import { armAngleForRadius, RADIUS_OUTER_GROOVE, ARM_OUTER_GROOVE_FALLBACK } from "../lib/tonearm-geometry.js";

// 33⅓ RPM is 1.8s per revolution. Linear, because a real platter's speed is
// genuinely constant — any easing reads as wobble.
const SPIN_SECONDS = 1.8;
const SPIN_UP_SECONDS = 1.2;
const SPIN_DOWN_SECONDS = 0.8;
const SPIN_END_SECONDS = 1.0;

// Tonearm angles, degrees. Rest matches the CSS resting transform.
const ARM_REST = 20.5;
// Rest parks the stylus just OUTSIDE the record edge (~107% of its radius).
// Lift moves a little further out again before the arm swings inward, which
// reads as raising the arm clear before it travels. Both sit outboard of the
// playing angle, because increasing rotation moves the stylus inward.
const ARM_LIFT = 18.5;

export default function Turntable({ track = null }) {
    const reduced = useReducedMotion();

    const rootRef = useRef(null);
    const spinRef = useRef(null);
    const armRef = useRef(null);
    const needleRef = useRef(null);
    const recordWrapRef = useRef(null);
    const platterRef = useRef(null);

    // The continuous rotation, built once and left paused. Every choreography
    // beat manipulates its timeScale rather than starting/stopping it, so the
    // platter never jumps back to 0deg mid-spin.
    const spinTweenRef = useRef(null);
    const timelineRef = useRef(null);

    const [deckState, setDeckState] = useState(DECK.EMPTY);
    const [errorMessage, setErrorMessage] = useState(null);

    // Mirrors of props/state that timeline callbacks need without re-running
    // useGSAP (callbacks capture their closure at build time).
    const trackRef = useRef(track);
    const loadedTrackIdRef = useRef(null);
    trackRef.current = track;

    const isBusyRef = useRef(false);

    // Evaluated at TWEEN START (GSAP accepts function values), not at build
    // time, so the record has finished dropping and the geometry is settled.
    const outerGrooveAngle = useCallback(() => {
        const a = armAngleForRadius(
            armRef.current,
            needleRef.current,
            // Queried rather than ref'd: VinylRecord takes no ref prop, and
            // adding one would mean propTypes plumbing this repo doesn't use.
            platterRef.current?.querySelector(".vinyl-record"),
            platterRef.current,
            RADIUS_OUTER_GROOVE);
        return a === null ? ARM_OUTER_GROOVE_FALLBACK : a;
    }, []);

    // ---- spin control ------------------------------------------------------

    useGSAP(() => {
        if (!spinRef.current) return;
        gsap.set(spinRef.current, { rotation: 0, transformOrigin: "50% 50%" });
        const tween = gsap.to(spinRef.current, {
            rotation: 360,
            duration: SPIN_SECONDS,
            ease: "none",
            repeat: -1,
        });
        tween.timeScale(0);
        tween.pause();
        spinTweenRef.current = tween;
        return () => { tween.kill(); spinTweenRef.current = null; };
    }, { scope: rootRef });

    const spinUp = useCallback((tl, position) => {
        const tween = spinTweenRef.current;
        if (!tween) return;
        tl.call(() => { tween.timeScale(0); tween.play(); }, null, position);
        tl.to(tween, { timeScale: 1, duration: SPIN_UP_SECONDS, ease: "power2.out" }, position);
    }, []);

    const spinDown = useCallback((tl, position, duration = SPIN_DOWN_SECONDS) => {
        const tween = spinTweenRef.current;
        if (!tween) return;
        tl.to(tween, { timeScale: 0, duration, ease: "power2.in" }, position);
        tl.call(() => tween.pause(), null, position + duration);
    }, []);

    // ---- audio -------------------------------------------------------------

    // Synchronous fast path for the needle-contact beat. Falls through to the
    // async path when the buffer isn't warm yet (slow network), which starts
    // audio a little late rather than not at all.
    const startAudioSync = useCallback((offset = 0) => {
        const t = trackRef.current;
        if (!t?.previewUrl) return false;
        const started = audio.playCached({ previewUrl: t.previewUrl, trackId: t.id, offset });
        if (started) {
            setDeckState(DECK.PLAYING);
            setErrorMessage(null);
        }
        return started;
    }, []);

    const startAudio = useCallback(async (offset = 0) => {
        const t = trackRef.current;
        if (!t?.previewUrl) return;
        try {
            await audio.play({ previewUrl: t.previewUrl, trackId: t.id, offset });
            setDeckState(DECK.PLAYING);
            setErrorMessage(null);
        } catch (err) {
            // Leave the deck sane: record on the platter, arm at rest, stopped.
            setErrorMessage(err?.message || "Could not play this preview.");
            setDeckState(DECK.ERROR);
            spinTweenRef.current?.pause();
            gsap.to(spinTweenRef.current, { timeScale: 0, duration: 0.3 });
            gsap.to(armRef.current, { rotation: ARM_REST, duration: 0.4 });
        }
    }, []);

    // End of preview: arm returns to rest, spin brakes, record STAYS.
    useEffect(() => {
        return audio.onEnded(() => {
            const tl = gsap.timeline();
            tl.to(armRef.current, { rotation: ARM_LIFT, duration: 0.25, ease: "power2.out" }, 0);
            tl.to(armRef.current, { rotation: ARM_REST, duration: 0.6, ease: "power2.inOut" }, 0.25);
            spinDown(tl, 0, SPIN_END_SECONDS);
            setDeckState(DECK.STOPPED_LOADED);
        });
    }, [spinDown]);

    // Tab blur: stop, don't auto-resume on return.
    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState !== "hidden") return;
            audio.stop();
            spinTweenRef.current?.pause();
            setDeckState((s) => (s === DECK.PLAYING ? DECK.PAUSED : s));
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, []);

    // ---- choreography ------------------------------------------------------

    useGSAP(() => {
        if (!track) return;
        if (loadedTrackIdRef.current === track.id) return;

        const isSwap = loadedTrackIdRef.current !== null;
        loadedTrackIdRef.current = track.id;
        setErrorMessage(null);

        // Guard overlap: a rapid second pick must not stack timelines or leave
        // two audio sources running.
        if (timelineRef.current) { timelineRef.current.kill(); timelineRef.current = null; }
        audio.stop();
        isBusyRef.current = true;
        setDeckState(DECK.LOADING);

        // Start decoding NOW, in parallel with the choreography — not at the
        // needle-contact callback.
        //
        // Measured: without this, play() ran fetch + decodeAudioData inside the
        // callback and audio started 551ms after the needle landed. The timeline
        // position was correct; the buffer simply wasn't ready yet. The animation
        // gives us ~1.6s of cover and decode takes ~0.5s, so by contact the
        // buffer is cached and play() resolves on a microtask.
        //
        // Errors are swallowed here on purpose — startAudio() runs the same load
        // at contact and owns the ERROR state. This is only a warm-up.
        if (track.previewUrl) audio.load(track.previewUrl).catch(() => {});

        // Reduced motion: no entry, no swap, no spin, no arm swing. The record
        // simply appears and plays. Fully functional, just static.
        if (reduced) {
            gsap.set(recordWrapRef.current, { opacity: 1, y: 0, scale: 1, rotation: 0 });
            gsap.set(armRef.current, { rotation: outerGrooveAngle() });
            isBusyRef.current = false;
            startAudio(0);
            return;
        }

        const tl = gsap.timeline({ onComplete: () => { isBusyRef.current = false; } });
        timelineRef.current = tl;

        let dropAt = 0;

        if (isSwap) {
            // The removal beat is what makes this read as a SWAP rather than a
            // load — arm off first, then brake, then the record leaves.
            tl.to(armRef.current, { rotation: ARM_LIFT, duration: 0.25, ease: "power2.out" }, 0);
            tl.to(armRef.current, { rotation: ARM_REST, duration: 0.5, ease: "power2.inOut" }, 0.25);
            spinDown(tl, 0.2);
            tl.to(recordWrapRef.current, {
                y: "-=120", opacity: 0, scale: 0.94,
                duration: 0.5, ease: "power2.in",
            }, 0.55);
            dropAt = 1.05;
        }

        // 1. Record enters and drops onto the platter, with a settle.
        tl.fromTo(recordWrapRef.current,
            { y: -260, opacity: 0, scale: 1.08, rotation: -8 },
            { y: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.75, ease: "back.out(1.6)" },
            dropAt);

        // 2. Spin-up — a mechanical wind-up, not a snap to speed.
        spinUp(tl, dropAt + 0.55);

        // 3. Arm lifts, swings to the outer groove, lowers.
        tl.to(armRef.current, { rotation: ARM_LIFT, duration: 0.3, ease: "power2.out" }, dropAt + 0.6);
        tl.to(armRef.current, { rotation: outerGrooveAngle, duration: 0.7, ease: "power2.inOut" }, dropAt + 0.9);

        // 4. Audio starts EXACTLY at needle contact.
        //
        // Deliberately a .call() at an explicit position rather than chained
        // after the swing's duration: chaining would re-derive the moment from
        // whatever the tween durations happen to be, so any later timing tweak
        // would silently desync the two. This position IS needle contact.
        const NEEDLE_CONTACT = dropAt + 1.6;
        tl.call(() => {
            // Synchronous first: playCached() starts the source in THIS tick,
            // the same one GSAP wrote the arm's final position in. The async
            // fallback only runs if the decode hasn't finished yet.
            if (!startAudioSync(0)) startAudio(0);
        }, null, NEEDLE_CONTACT);

        return () => { tl.kill(); };
    }, { scope: rootRef, dependencies: [track?.id, reduced] });

    // ---- transport ---------------------------------------------------------

    const handleTransport = useCallback(() => {
        // Never fights the load/swap choreography.
        if (isBusyRef.current) return;
        if (!trackRef.current) return;

        if (deckState === DECK.PLAYING) {
            // Pause: audio stops, spin brakes, arm STAYS DOWN.
            audio.stop();
            const tl = gsap.timeline();
            spinDown(tl, 0);
            setDeckState(DECK.PAUSED);
            return;
        }

        if (deckState === DECK.PAUSED) {
            const tl = gsap.timeline();
            spinUp(tl, 0);
            startAudio(audio.getElapsed());
            return;
        }

        if (deckState === DECK.STOPPED_LOADED || deckState === DECK.ERROR) {
            // Replay from the top WITHOUT re-running the load choreography.
            audio.reset();
            const tl = gsap.timeline();
            spinUp(tl, 0);
            tl.to(armRef.current, { rotation: outerGrooveAngle, duration: 0.6, ease: "power2.inOut" }, 0);
            tl.call(() => startAudio(0), null, 0.6);
        }
    }, [deckState, spinUp, spinDown, startAudio, outerGrooveAngle]);

    const transportLabel =
        deckState === DECK.PLAYING ? "Pause" :
        deckState === DECK.PAUSED ? "Resume" :
        deckState === DECK.STOPPED_LOADED ? "Play again" : "Play";

    return (
        <div className="turntable" ref={rootRef} data-deck-state={deckState}>
            <div className="turntable-plinth">
                <div className="turntable-fader" aria-hidden="true">
                    <div className="turntable-fader-track">
                        <span className="turntable-fader-tick" style={{ top: "0%" }} />
                        <span className="turntable-fader-tick" style={{ top: "25%" }} />
                        <span className="turntable-fader-tick turntable-fader-tick-center" style={{ top: "50%" }} />
                        <span className="turntable-fader-tick" style={{ top: "75%" }} />
                        <span className="turntable-fader-tick" style={{ top: "100%" }} />
                        <div className="turntable-fader-handle" />
                    </div>
                </div>

                {/* aria-hidden moved OFF this container and onto the decorative
                    children individually: aria-hidden on an ancestor cannot be
                    overridden by a descendant, so the transport button could
                    never be exposed while the parent was hidden. */}
                <div className="turntable-controls">
                    <div className="turntable-power-led" aria-hidden="true" />
                    <div className="turntable-speed-buttons" aria-hidden="true">
                        <div className="turntable-speed-button" />
                        <div className="turntable-speed-button" />
                    </div>
                    <button
                        type="button"
                        className="turntable-start-button"
                        onClick={handleTransport}
                        disabled={!track}
                        aria-label={track ? `${transportLabel} ${track.title}` : "Play — choose a record first"}
                    />
                </div>

                <div className="turntable-arm-rest" aria-hidden="true" />

                <div className="turntable-platter-mount">
                    <div className="turntable-platter" ref={platterRef}>
                        {/* Platter, strobe ring and record all live inside the
                            spin group so they rotate as one object. */}
                        <div className="turntable-platter-spin" ref={spinRef} data-platter="">
                            <StrobeRing />
                            <div className="turntable-mat" aria-hidden="true" />
                            <div className="vinyl-record-wrap" ref={recordWrapRef}>
                                <VinylRecord track={track} />
                            </div>
                            <div className="turntable-spindle" aria-hidden="true" />
                        </div>
                    </div>
                </div>

                <div className="turntable-tonearm" aria-hidden="true">
                    <div className="turntable-tonearm-bearing" />
                    <div className="turntable-tonearm-pivot" />
                    <div className="turntable-tonearm-rotor" ref={armRef}>
                        <div className="turntable-tonearm-counterweight-stub" />
                        <div className="turntable-tonearm-counterweight" />
                        <div className="turntable-tonearm-arm">
                            <div className="turntable-tonearm-head">
                                <div className="turntable-tonearm-needle" ref={needleRef} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {errorMessage && (
                <p className="turntable-error" role="status">{errorMessage}</p>
            )}
        </div>
    );
}
