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

    const playIconRef = useRef(null);
    const pauseIconRef = useRef(null);

    const [deckState, setDeckState] = useState(DECK.EMPTY);
    const [errorMessage, setErrorMessage] = useState(null);

    // Mirrors of props/state that timeline callbacks need without re-running
    // useGSAP (callbacks capture their closure at build time).
    const trackRef = useRef(track);
    const loadedTrackIdRef = useRef(null);
    trackRef.current = track;

    const isBusyRef = useRef(false);

    // The deck state as a REF as well as state, and every write goes through
    // applyDeckState so the two can't drift.
    //
    // handleTransport reads the ref, not the state variable. A React state
    // update isn't visible until the next render, so two presses inside one
    // frame both saw the stale value and both took the same branch — two
    // wind-ups, two play() calls. The ref is correct on the very next
    // statement, which is what a transport control needs.
    const deckStateRef = useRef(DECK.EMPTY);
    const applyDeckState = useCallback((next) => {
        deckStateRef.current = next;
        setDeckState(next);
    }, []);

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

    // THE SINGLE WRITER for the platter's speed. Nothing else may touch
    // timeScale or pause/play the spin tween.
    //
    // Three separate faults made rapid transport presses freeze the deck, all
    // measured before this rewrite:
    //
    //  1. The brake scheduled `tl.call(() => tween.pause())` 800ms out as its
    //     own timeline callback. Pressing play during the brake started a
    //     wind-up, and the ORPHANED callback then landed on top of it. Settled
    //     state after six presses: timeScale 1, paused true — fully wound up
    //     and completely stationary, while the deck reported PLAYING. The pause
    //     now lives in the brake tween's own onComplete, so killTweensOf below
    //     cancels it together with the tween that scheduled it.
    //  2. Spin-up snapped `timeScale(0)` before ramping, so resuming a platter
    //     still turning at 0.95 yanked it to a dead stop first.
    //  3. Nothing killed the previous timeScale tween, so a brake and a wind-up
    //     both wrote the property every frame and the one that happened to
    //     finish last won.
    const setSpin = useCallback((target, seconds, ease) => {
        const tween = spinTweenRef.current;
        // Reduced motion keeps the platter still — matching the load path,
        // which already declines to spin it.
        if (!tween || reduced) return;

        gsap.killTweensOf(tween);

        const from = tween.timeScale();
        const span = Math.abs(target - from);

        // Live BEFORE the ramp, never after: a paused tween ignores timeScale.
        if (target > 0) tween.play();

        if (span < 0.005) {
            tween.timeScale(target);
            if (target === 0) tween.pause();
            return;
        }

        gsap.to(tween, {
            timeScale: target,
            // Proportional to the distance actually travelled: a standing start
            // takes the full 1.2s, resuming from 0.6 takes 0.48s. A fixed
            // duration restarts a full-length ramp on every press, so fast
            // alternation never converges inside the window the invariant allows.
            duration: seconds * span,
            ease,
            onComplete: () => { if (target === 0) tween.pause(); },
        });
    }, [reduced]);

    const spinUp = useCallback(() => setSpin(1, SPIN_UP_SECONDS, "power2.out"), [setSpin]);
    const spinDown = useCallback(
        (seconds = SPIN_DOWN_SECONDS) => setSpin(0, seconds, "power2.in"),
        [setSpin],
    );

    // Timeline-positioned forms. These schedule a CALL rather than parenting the
    // timeScale tween to the choreography timeline — the tween has to stay
    // reachable by killTweensOf and outlive a timeline kill, and every position
    // in the choreography is absolute, so nothing downstream depended on the
    // spin tween's duration anyway.
    const spinUpAt = useCallback((tl, position) => { tl.call(spinUp, null, position); }, [spinUp]);
    const spinDownAt = useCallback(
        (tl, position, seconds) => { tl.call(() => spinDown(seconds), null, position); },
        [spinDown],
    );

    // ---- audio -------------------------------------------------------------

    // Synchronous fast path for the needle-contact beat. Falls through to the
    // async path when the buffer isn't warm yet (slow network), which starts
    // audio a little late rather than not at all.
    const startAudioSync = useCallback((offset = 0) => {
        const t = trackRef.current;
        if (!t?.previewUrl) return false;
        const started = audio.playCached({ previewUrl: t.previewUrl, trackId: t.id, offset });
        if (started) {
            applyDeckState(DECK.PLAYING);
            setErrorMessage(null);
        }
        return started;
    }, [applyDeckState]);

    const startAudio = useCallback(async (offset = 0) => {
        const t = trackRef.current;
        if (!t?.previewUrl) return;
        try {
            await audio.play({ previewUrl: t.previewUrl, trackId: t.id, offset });
            applyDeckState(DECK.PLAYING);
            setErrorMessage(null);
        } catch (err) {
            // Leave the deck sane: record on the platter, arm at rest, stopped.
            setErrorMessage(err?.message || "Could not play this preview.");
            applyDeckState(DECK.ERROR);
            spinDown(0.3);
            gsap.to(armRef.current, { rotation: ARM_REST, duration: 0.4 });
        }
    }, [applyDeckState, spinDown]);

    // End of preview: arm returns to rest, spin brakes, record STAYS.
    useEffect(() => {
        return audio.onEnded(() => {
            const tl = gsap.timeline();
            tl.to(armRef.current, { rotation: ARM_LIFT, duration: 0.25, ease: "power2.out" }, 0);
            tl.to(armRef.current, { rotation: ARM_REST, duration: 0.6, ease: "power2.inOut" }, 0.25);
            spinDown(SPIN_END_SECONDS);
            applyDeckState(DECK.STOPPED_LOADED);
        });
    }, [spinDown, applyDeckState]);

    // Tab blur: stop, don't auto-resume on return.
    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState !== "hidden") return;
            audio.stop();
            spinDown(0.2);
            if (deckStateRef.current === DECK.PLAYING) applyDeckState(DECK.PAUSED);
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [spinDown, applyDeckState]);

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
        applyDeckState(DECK.LOADING);

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
            spinDownAt(tl, 0.2);
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
        spinUpAt(tl, dropAt + 0.55);

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
        // Never fights the load/swap choreography, or the replay swing below.
        if (isBusyRef.current) return;
        if (!trackRef.current) return;

        // The REF, not the state variable — see applyDeckState. Reading state
        // here let two presses in one frame both take the same branch.
        const state = deckStateRef.current;

        if (state === DECK.PLAYING) {
            // Pause: audio stops, spin brakes, arm STAYS DOWN.
            audio.stop();
            spinDown();
            applyDeckState(DECK.PAUSED);
            return;
        }

        if (state === DECK.PAUSED) {
            spinUp();
            const offset = audio.getElapsed();
            // Synchronous first, same reason as needle contact: startAudioSync
            // sets PLAYING in THIS tick, so a press landing one frame later
            // already sees PLAYING and pauses rather than resuming twice. The
            // buffer is always warm here — we've played this track before.
            if (!startAudioSync(offset)) startAudio(offset);
            return;
        }

        if (state === DECK.STOPPED_LOADED || state === DECK.ERROR) {
            // Replay from the top WITHOUT re-running the load choreography.
            // Held busy for the arm's return swing: the deck has no state that
            // distinguishes "swinging back to the outer groove" from
            // STOPPED_LOADED, so without this a second press would start a
            // second swing from a half-travelled arm.
            audio.reset();
            isBusyRef.current = true;
            spinUp();
            const tl = gsap.timeline({ onComplete: () => { isBusyRef.current = false; } });
            tl.to(armRef.current, { rotation: outerGrooveAngle, duration: 0.6, ease: "power2.inOut" }, 0);
            tl.call(() => { if (!startAudioSync(0)) startAudio(0); }, null, 0.6);
        }
    }, [spinUp, spinDown, startAudio, startAudioSync, outerGrooveAngle, applyDeckState]);

    const transportLabel =
        deckState === DECK.PLAYING ? "Pause" :
        deckState === DECK.PAUSED ? "Resume" :
        deckState === DECK.STOPPED_LOADED ? "Play again" : "Play";

    // Pause bars only while genuinely playing. During LOADING the record is
    // still dropping, so the play glyph is the honest one — it flips at needle
    // contact, which doubles as the tell that playback has actually started.
    const showsPauseGlyph = deckState === DECK.PLAYING;

    // Crossfade rather than swap. overwrite:"auto" is what makes this safe under
    // the same rapid pressing item 1 is about — each new tween kills the
    // conflicting one on these exact properties instead of stacking.
    useGSAP(() => {
        if (!playIconRef.current || !pauseIconRef.current) return;
        const duration = reduced ? 0 : 0.2;
        gsap.to(playIconRef.current, {
            opacity: showsPauseGlyph ? 0 : 1,
            scale: showsPauseGlyph ? 0.65 : 1,
            duration, ease: "power2.out", overwrite: "auto",
        });
        gsap.to(pauseIconRef.current, {
            opacity: showsPauseGlyph ? 1 : 0,
            scale: showsPauseGlyph ? 1 : 0.65,
            duration, ease: "power2.out", overwrite: "auto",
        });
    }, { scope: rootRef, dependencies: [showsPauseGlyph, reduced] });

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
                    {/* The glyph is decorative — the button's accessible name
                        comes entirely from aria-label, which already tracks the
                        deck state. aria-hidden sits on the <svg> itself, a
                        DESCENDANT of the button, so it hides the artwork
                        without hiding the control (the Task 2 mistake was
                        putting it on an ancestor, which cannot be undone from
                        below). */}
                    <button
                        type="button"
                        className="turntable-start-button"
                        onClick={handleTransport}
                        disabled={!track}
                        aria-label={track ? `${transportLabel} ${track.title}` : "Play — choose a record first"}
                    >
                        <svg
                            className="turntable-start-button-glyph"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                        >
                            {/* Bounding box spans x 8-17, i.e. centred half a
                                unit RIGHT of true centre. A triangle's mass sits
                                to its left, so geometric centring reads as
                                left-leaning; ~5% of the width corrects it. */}
                            <path ref={playIconRef} className="turntable-glyph-play" d="M8 6 L17 12 L8 18 Z" />
                            <g ref={pauseIconRef} className="turntable-glyph-pause">
                                <rect x="8" y="6" width="2.8" height="12" rx="1.2" />
                                <rect x="13.2" y="6" width="2.8" height="12" rx="1.2" />
                            </g>
                        </svg>
                    </button>
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
