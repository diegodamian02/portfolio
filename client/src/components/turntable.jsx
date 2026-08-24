import { useEffect, useRef, useState, useCallback } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, Draggable } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";
import VinylRecord from "./vinyl-record.jsx";
import StrobeRing from "./strobe-ring.jsx";
import * as audio from "../lib/turntable-audio.js";
import { DECK, emitDeckState } from "../lib/deck-state.js";
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

// Reduced motion has no spin to pin the audio to, so transport gets a plain
// gain fade at this length instead of a pitch bend.
const REDUCED_FADE_SECONDS = 0.15;

// Stage 6, Phase 9 — pitch fader. Percent units throughout, matching the
// native <input>'s own min/max, converted to a rate multiplier only at the
// point of calling setSpin/audio.setRate (1 + pitch / 100).
const PITCH_RANGE = 8;
const PITCH_DRAG_SECONDS = 0.08; // per-tick while actively dragging — near-instant
const PITCH_RETURN_SECONDS = 0.4; // the spring, on release
const PITCH_RETURN_EASE = "power2.out";
const PITCH_KEY_IDLE_MS = 500; // idle gap after a keypress before it self-centers

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
        // Publish synchronously, in this same statement run — see
        // deck-state.js. The hero's fluid background bursts on the PLAYING
        // edge, and at the needle-contact call site this line executes in the
        // same tick as playCached(), so the visual and the sound start
        // together rather than a React commit apart.
        emitDeckState(next);
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
            if (target === 0) { tween.pause(); audio.stop(); }
            else audio.settleSpin(target);
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
            // The audio rides the platter's ACTUAL timeScale rather than a
            // parallel tween of its own, so the pitch bend and fade can never
            // drift from the thing they are supposed to be following — and the
            // proportional duration above is inherited for free.
            onUpdate: () => audio.followSpin(tween.timeScale(), { stopAtFloor: target === 0 }),
            onComplete: () => {
                if (target === 0) { tween.pause(); audio.stop(); }
                else audio.settleSpin(target);
            },
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
    const startAudioSync = useCallback((offset = 0, fadeSeconds) => {
        const t = trackRef.current;
        if (!t?.previewUrl) return false;
        const started = audio.playCached({ previewUrl: t.previewUrl, trackId: t.id, offset, fadeSeconds });
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
            // The brake runs, but there is nothing left to bend: the source has
            // already reached the end of the buffer, which is what fired this.
            // Unlinking here leaves the rate at 1 for the replay that follows.
            audio.endSpinLink();
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
        // A needle drop, not a resume: the deck is treated as already at speed,
        // so playback starts at pitch with Task 2's slow fade-in rather than
        // bending up from the rate floor. Also clears any rate a previous
        // power-down left behind.
        audio.endSpinLink();
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
            // Pause: the platter brakes and the audio rides it DOWN — the pitch
            // sags and the level fades on the brake's own curve, then cuts at
            // the rate floor where it is already silent. The arm stays down.
            //
            // Reduced motion has no brake to follow, so it gets a plain short
            // fade instead. Not an abrupt cut: silence arriving in one sample is
            // the harsher of the two, and it is not a motion concern.
            if (reduced) {
                audio.fadeOutAndStop(REDUCED_FADE_SECONDS);
            } else {
                audio.beginSpinLink();
                spinDown();
            }
            applyDeckState(DECK.PAUSED);
            return;
        }

        if (state === DECK.PAUSED) {
            if (reduced) {
                const offset = audio.getElapsed();
                if (!startAudioSync(offset, REDUCED_FADE_SECONDS)) startAudio(offset);
                return;
            }

            audio.beginSpinLink();
            spinUp();

            // If the brake never reached the floor the record never actually
            // stopped — let the wind-up carry it back up rather than tearing the
            // source down and restarting it, which would both lose the groove
            // position and risk a click at non-zero gain.
            if (audio.getState().isPlaying) {
                applyDeckState(DECK.PLAYING);
                return;
            }

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
            //
            // Unlinked: a replay is a needle drop, so it starts at pitch with
            // the slow fade-in rather than bending up from the floor.
            audio.endSpinLink();
            audio.reset();
            isBusyRef.current = true;
            spinUp();
            const tl = gsap.timeline({ onComplete: () => { isBusyRef.current = false; } });
            tl.to(armRef.current, { rotation: outerGrooveAngle, duration: 0.6, ease: "power2.inOut" }, 0);
            tl.call(() => { if (!startAudioSync(0)) startAudio(0); }, null, 0.6);
        }
    }, [spinUp, spinDown, startAudio, startAudioSync, outerGrooveAngle, applyDeckState, reduced]);

    // ---- pitch fader (Stage 6, Phase 9) ------------------------------------
    //
    // Self-centering: the fader is never left off-center outside of active
    // touch (pointer OR keyboard). That removes an entire category of state
    // this control would otherwise need to carry — no offset persists across
    // pause/resume, none survives a track swap, nothing can get stuck at an
    // extreme. spinUp() above is untouched; it still always targets 1.
    //
    // Reuses beginSpinLink()/followSpin() rather than building a second
    // audio-follows-motion mechanism: the live-drag-through-spring-back
    // sequence is the exact same shape as the transport's own power ramps (a
    // ramp with a start and a settle point), just centred at 1 instead of 0.

    const faderTrackRef = useRef(null);
    const faderHandleRef = useRef(null);
    const faderInputRef = useRef(null);
    const pitchDraggableRef = useRef(null);
    // The handle's own spring-back tween (always runs, every deck state) and
    // — reduced motion only — the separate proxy tween that glides audio
    // rate back to 1 with no platter tween to piggyback on. Tracked so a
    // fast re-grab kills an in-flight return instead of fighting it.
    const pitchReturnTweenRef = useRef(null);
    const pitchAudioTweenRef = useRef(null);
    const pitchKeyIdleTimerRef = useRef(null);

    // y (the handle's own GSAP-tracked transform property, px, 0 at rest) <->
    // percent pitch. Reads minY/maxY off the Draggable instance itself rather
    // than assuming the track is perfectly symmetric above/below the resting
    // handle — it should be, but the geometry isn't asserted anywhere, and
    // this is correct either way.
    //
    // Direction assumption: top of track = +PITCH_RANGE, bottom =
    // -PITCH_RANGE. One-line flip if that's backwards — swap which side of
    // the subtraction PITCH_RANGE sits on in both functions below.
    const pitchFromY = useCallback((y) => {
        const d = pitchDraggableRef.current;
        if (!d) return 0;
        const range = d.maxY - d.minY;
        if (range <= 0) return 0;
        const t = (y - d.minY) / range; // 0 at top, 1 at bottom
        return Math.max(-PITCH_RANGE, Math.min(PITCH_RANGE, PITCH_RANGE - t * 2 * PITCH_RANGE));
    }, []);

    const yFromPitch = useCallback((pitch) => {
        const d = pitchDraggableRef.current;
        if (!d) return 0;
        const range = d.maxY - d.minY;
        const clamped = Math.max(-PITCH_RANGE, Math.min(PITCH_RANGE, pitch));
        const t = (PITCH_RANGE - clamped) / (2 * PITCH_RANGE);
        return d.minY + t * range;
    }, []);

    // The native <input> is the keyboard/SR layer, not the pointer one (see
    // the JSX below and its own comment) — this just keeps its value honest
    // whenever the POINTER path moves the handle, so a screen reader or a
    // sighted keyboard user tabbing in mid-drag reads the true position.
    const syncPitchInput = useCallback((pitch) => {
        if (faderInputRef.current) faderInputRef.current.value = pitch.toFixed(1);
    }, []);

    // Per-tick during an active drag or key-repeat. Reads deckStateRef LIVE
    // on every call rather than a value captured at gesture-start — that's
    // what makes a transport press mid-drag resolve correctly in EITHER
    // direction: pause it mid-drag and the very next tick sees PAUSED and
    // silently drops to visual-only; resume it mid-drag (from a drag that
    // started while paused) and the next tick sees PLAYING and starts
    // driving audio, picking up wherever the handle currently sits.
    const applyPitchLive = useCallback((pitch) => {
        if (deckStateRef.current !== DECK.PLAYING) return; // visual only
        if (reduced) {
            // No platter tween in this mode (setSpin no-ops), so there is
            // nothing to link to — drive the rate directly.
            audio.setRate(1 + pitch / 100);
            return;
        }
        // Defensive, not load-bearing: handlePitchPress already links when a
        // drag STARTS while already playing. This covers the one case that
        // doesn't — a drag that started while PAUSED and crossed into
        // PLAYING mid-gesture via a transport press, which links via
        // handleTransport's own beginSpinLink() call, not this one.
        if (!audio.isSpinLinked()) audio.beginSpinLink();
        setSpin(1 + pitch / 100, PITCH_DRAG_SECONDS, "power2.out");
    }, [reduced, setSpin]);

    // The spring. Always moves the handle back to centre; only touches audio
    // when the deck was actually PLAYING at the moment of release (read live,
    // same reasoning as applyPitchLive — a transport press mid-drag has
    // already changed deckStateRef by the time the finger/key lifts).
    const releasePitch = useCallback(() => {
        pitchReturnTweenRef.current?.kill();
        pitchAudioTweenRef.current?.kill();
        pitchReturnTweenRef.current = null;
        pitchAudioTweenRef.current = null;

        const handle = faderHandleRef.current;
        if (!handle) return;
        const startPitch = pitchFromY(gsap.getProperty(handle, "y"));
        const state = deckStateRef.current;

        // Visual spring. Instant under reduced motion — same convention as
        // the play/pause glyph crossfade above (duration collapses to 0
        // rather than the tween being skipped outright) — because
        // direct-manipulation dragging itself is never shortened, only this
        // untriggered afterward-animation is.
        pitchReturnTweenRef.current = gsap.to(handle, {
            y: yFromPitch(0),
            duration: reduced ? 0 : PITCH_RETURN_SECONDS,
            ease: PITCH_RETURN_EASE,
            onUpdate: () => syncPitchInput(pitchFromY(gsap.getProperty(handle, "y"))),
            onComplete: () => {
                // NOT update(true, true): Draggable's own `sticky` resync
                // (that's what the second `true` means) only runs while
                // self.isPressed — and the press ended well before this
                // 400ms tween even started, so that branch is always a
                // no-op here. With applyBounds true (the first `true`) and
                // no resync, update() instead calls applyBounds(), which
                // re-renders Draggable's own (stale, last-drag) x/y back
                // onto the handle — confirmed by instrumentation: the
                // handle visibly glided to centre, then SNAPPED back to
                // its pre-release dragged position the instant this fired.
                // update(false, false) is the actual resync: it skips
                // applyBounds and runs syncXY(true) instead, which reads
                // the CURRENT rendered position (this tween's real
                // endpoint) into Draggable's bookkeeping.
                pitchDraggableRef.current?.update(false, false);
                pitchReturnTweenRef.current = null;
            },
        });

        if (state !== DECK.PLAYING) return; // PAUSED / STOPPED_LOADED / EMPTY / etc — nothing to settle

        if (reduced) {
            // Glides smoothly over the SAME timing as the visual snap above
            // even though the snap itself is instant: prefers-reduced-motion
            // is about visual/vestibular motion, and a pitch bend easing back
            // to true is not that — the brief's own explicit ask is "audio
            // rate changes smoothly... platter visually static throughout."
            const proxy = { pitch: startPitch };
            pitchAudioTweenRef.current = gsap.to(proxy, {
                pitch: 0,
                duration: PITCH_RETURN_SECONDS,
                ease: PITCH_RETURN_EASE,
                onUpdate: () => audio.setRate(1 + proxy.pitch / 100),
                onComplete: () => { pitchAudioTweenRef.current = null; },
            });
            return;
        }

        // The ONE spring call the brief describes: setSpin's own tween IS
        // the return, and because spin-link is already active, followSpin's
        // onUpdate (wired into setSpin's onUpdate) keeps audio locked to the
        // platter for the entire return, not just snapped at the end. Left
        // linked afterward on purpose — spinUp()/spinDown() never call
        // endSpinLink() either; only a needle-drop-shaped event (swap,
        // preview end, replay) does. Ending it here would be a second,
        // narrower unlink rule that doesn't exist anywhere else in this file.
        //
        // setSpin's own `seconds` is NOT a flat duration — its actual applied
        // duration is `seconds * span` (see its own comment: "resuming from
        // 0.6 takes 0.48s"), which is what makes a standing 0-to-1 wind-up
        // take the full SPIN_UP_SECONDS while a partial one is proportionally
        // shorter. That's correct for spin up/down, where span ranges over
        // the whole [0,1]. The fader's span is at most PITCH_RANGE/100 = 0.08
        // — passed straight through, PITCH_RETURN_SECONDS would apply as
        // ~0.4*0.08 = 32ms, not 400ms, and the platter/audio return would
        // finish long before the handle's own 400ms visual spring (below) —
        // caught by instrumentation (measured rate at true 1.0 within ~150ms
        // of release), not by inspection. Dividing by span here cancels
        // setSpin's own multiplication back out, so the ACTUAL duration is
        // PITCH_RETURN_SECONDS regardless of how far off-center the fader
        // was — matching the handle's own fixed-duration spring exactly.
        const span = Math.abs(startPitch) / 100;
        const perUnitSeconds = span > 1e-4 ? PITCH_RETURN_SECONDS / span : PITCH_RETURN_SECONDS;
        setSpin(1, perUnitSeconds, PITCH_RETURN_EASE);
    }, [reduced, setSpin, pitchFromY, yFromPitch, syncPitchInput]);

    // Shared by Draggable's onPress and the input's onKeyDown — "interaction
    // starts" either way. Kills any in-flight return so a fresh grab/keypress
    // doesn't fight a tween still animating back to centre, and links spin
    // once, up front, exactly like handleTransport's own PAUSED/PLAYING
    // branches already do.
    const handlePitchPress = useCallback(() => {
        pitchReturnTweenRef.current?.kill();
        pitchAudioTweenRef.current?.kill();
        pitchReturnTweenRef.current = null;
        pitchAudioTweenRef.current = null;
        if (pitchKeyIdleTimerRef.current) {
            clearTimeout(pitchKeyIdleTimerRef.current);
            pitchKeyIdleTimerRef.current = null;
        }
        if (!reduced && deckStateRef.current === DECK.PLAYING) audio.beginSpinLink();
    }, [reduced]);

    // GSAP Draggable owns pointer/touch dragging of the visual handle. The
    // native range input (JSX below) is deliberately pointer-events:none —
    // it exists for keyboard/SR semantics only, not as a second pointer
    // target competing with Draggable for the same gesture. dependencies:
    // [reduced] so the closures below (which all ultimately read `reduced`,
    // directly or via setSpin) get rebuilt if the OS-level setting flips
    // mid-session, rather than a Draggable created once at mount staying
    // bound to a stale value forever.
    useGSAP(() => {
        if (!faderHandleRef.current || !faderTrackRef.current) return;
        const [d] = Draggable.create(faderHandleRef.current, {
            type: "y",
            bounds: faderTrackRef.current,
            cursor: "grab",
            activeCursor: "grabbing",
            onPress: handlePitchPress,
            onDrag() {
                const pitch = pitchFromY(this.y);
                syncPitchInput(pitch);
                applyPitchLive(pitch);
            },
            onRelease: releasePitch,
        });
        pitchDraggableRef.current = d;
        return () => { d.kill(); pitchDraggableRef.current = null; };
    }, { scope: rootRef, dependencies: [reduced] });

    // Keyboard path through the native input. Open question the brief itself
    // raised rather than settling: does self-centering apply to keyboard too,
    // or only pointer drag? Applied uniformly here — a control that only
    // self-centers for a mouse would be a stranger inconsistency than one
    // that centers for both. "Release" for a key has no native event, so
    // it's inferred: it fires PITCH_KEY_IDLE_MS after the last change (so
    // holding/repeating an arrow key doesn't fight its own spring-back), and
    // immediately on blur (tabbing away mid-adjustment).
    const handlePitchChange = useCallback((e) => {
        const pitch = Number(e.target.value);
        // Discrete step-per-keypress, not a continuous drag — move the
        // decorative handle to match immediately rather than tweening it.
        if (faderHandleRef.current) {
            gsap.set(faderHandleRef.current, { y: yFromPitch(pitch) });
            // See the matching comment in releasePitch's onComplete — this
            // is the same not-currently-pressed resync, needed here because
            // a keyboard nudge moves the handle via gsap.set() rather than
            // through Draggable's own drag mechanism.
            pitchDraggableRef.current?.update(false, false);
        }
        applyPitchLive(pitch);

        if (pitchKeyIdleTimerRef.current) clearTimeout(pitchKeyIdleTimerRef.current);
        pitchKeyIdleTimerRef.current = setTimeout(() => {
            pitchKeyIdleTimerRef.current = null;
            releasePitch();
        }, PITCH_KEY_IDLE_MS);
    }, [applyPitchLive, releasePitch, yFromPitch]);

    const handlePitchBlur = useCallback(() => {
        if (pitchKeyIdleTimerRef.current) {
            clearTimeout(pitchKeyIdleTimerRef.current);
            pitchKeyIdleTimerRef.current = null;
        }
        releasePitch();
    }, [releasePitch]);

    // Only the debounce timer needs its own cleanup on unmount — the
    // Draggable instance and its tweens are handled by the useGSAP above and
    // by killing on the next press/keydown.
    useEffect(() => {
        return () => {
            if (pitchKeyIdleTimerRef.current) clearTimeout(pitchKeyIdleTimerRef.current);
        };
    }, []);

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
                {/* aria-hidden removed from this wrapper — it was blocking the
                    input below from ever reaching the accessibility tree, the
                    same ancestor/descendant aria-hidden bug already fixed on
                    the transport button above, this time on the fader. Ticks
                    and the decorative handle carry their own aria-hidden
                    instead; the native range input is the one real control
                    here. */}
                <div className="turntable-fader">
                    <div className="turntable-fader-track" ref={faderTrackRef}>
                        <span className="turntable-fader-tick" style={{ top: "0%" }} aria-hidden="true" />
                        <span className="turntable-fader-tick" style={{ top: "25%" }} aria-hidden="true" />
                        <span className="turntable-fader-tick turntable-fader-tick-center" style={{ top: "50%" }} aria-hidden="true" />
                        <span className="turntable-fader-tick" style={{ top: "75%" }} aria-hidden="true" />
                        <span className="turntable-fader-tick" style={{ top: "100%" }} aria-hidden="true" />
                        <div className="turntable-fader-handle" ref={faderHandleRef} aria-hidden="true" />
                        {/* pointer-events:none (see SCSS) — GSAP Draggable
                            above owns pointer/touch dragging of the visual
                            handle; this exists purely for keyboard focus and
                            screen-reader semantics, so a pointerdown here
                            must fall through to the handle rather than being
                            captured by the input itself. */}
                        <input
                            ref={faderInputRef}
                            type="range"
                            className="turntable-fader-input"
                            min={-PITCH_RANGE}
                            max={PITCH_RANGE}
                            step={0.1}
                            defaultValue={0}
                            disabled={!track}
                            aria-label={track ? `Pitch — ${track.title}` : "Pitch"}
                            onKeyDown={handlePitchPress}
                            onChange={handlePitchChange}
                            onBlur={handlePitchBlur}
                        />
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
