import { useCallback, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, CustomBounce } from "../lib/gsap.js";
// CustomEase is registered in lib/gsap.js (it sits in that file's
// registerPlugin call) but is NOT in its export list, unlike CustomBounce.
// Imported from the package path directly rather than widening that shared
// module for a spike: ESM caches by specifier, so "gsap/CustomEase" hands back
// the same instance registerPlugin already holds — not a second, unregistered
// copy. Promote it to lib/gsap.js's export list when this lands for real
// (Stage 12.4), together with the two eases below.
import { CustomEase } from "gsap/CustomEase";
import useReducedMotion from "../hooks/use-reduced-motion.js";

// ---------------------------------------------------------------------------
// Snow White — a CSS 3D turntable, after the Braun SK4. Stage 12.1 spike.
//
// PRESENTATIONAL ONLY. No audio, no deck-state publication, no iTunes, no
// crate. The production deck (turntable.jsx) owns all of that and is
// deliberately untouched by this file; the two do not import each other. The
// seam for Stage 12.3 is `onNeedleDown` below plus the imperative handle.
//
// CSS 3D, not three.js/R3F/Spline: one `perspective` stage, `preserve-3d`
// containers and ten transformed elements. Nothing was added to package.json
// for this.
//
// The ORDER of the deck's two rotations is why there are two nested elements
// rather than one. The spec is `rotateX(56deg) rotateZ(-24deg)` — X first,
// then Z in the already-tilted frame. GSAP writes its own fixed order
// (`translate3d() rotate() rotateX() rotateY() scale()`), so setting
// `rotationX` and `rotation` on ONE element yields `rotate(-24) rotateX(56)`,
// a different matrix and a visibly different 3/4 view (the deck's long axis
// swings instead of rolling). Splitting them across .sw-deck (X) and
// .sw-deck-body (Z) reproduces the spec's order exactly, at the cost of one
// element. Measured, not assumed — see design-review/mobile-v3/README.md.
// ---------------------------------------------------------------------------

// Timeline positions, seconds. These ARE the spec table in
// design-review/mobile-v3/README.md, transcribed once — every beat overlaps
// the next on purpose, so each constant is an absolute position in the
// timeline rather than a duration chained off the previous one. Chaining would
// re-derive the moments from whatever the durations happen to be, which is how
// the production deck's needle-contact call site once desynced from its audio
// (turntable.jsx, NEEDLE_CONTACT).
const LID_AT = 0.15,   LID_DUR = 0.70;   // 150 - 850ms
const TILT_AT = 0.10,  TILT_DUR = 1.00;  // 100 - 1100ms
const FALL_AT = 0.60,  FALL_DUR = 0.76;  // 600 - 1360ms
const ARM_AT = 1.00,   ARM_DUR = 0.55;   // 1000 - 1550ms, the swing
const NEEDLE_AT = 1.55, NEEDLE_DUR = 0.15; // 1550 - 1700ms, the drop onto wax
const SPIN_AT = 1.45;  // platter to speed + the two rings
const CONTACT_AT = NEEDLE_AT + NEEDLE_DUR; // 1700ms — where audio starts in production

// The 3/4 view. Flat (rotateX 0) is the straight-on elevation the deck rests
// at inside a closed sheet; 56deg/-24deg is the open, on-a-table reading.
const TILT_X = 56;
const TILT_Z = -24;

// Lid, about its own back edge. -105 rather than -90 so it visibly passes
// vertical and leans back, which is what reads as "swung open" rather than
// "standing up".
const LID_OPEN_X = -105;

// Tonearm, degrees of rotor rotation. 0deg = straight down from the pivot;
// the pivot sits outboard of the platter, so INCREASING rotation swings the
// stylus INWARD — confirmed the same way the production deck's angles were,
// by sweeping the rotation with the deck FLAT (rotateX 0 / rotateZ 0, where
// the deck's own plane IS the screen plane) and measuring the headshell's
// distance from the platter centre as a fraction of the record's radius:
//
//    22deg -> 1.303   (parked clear of the disc, over the deck body)
//    34deg -> 1.020
//    37deg -> ~0.956  (the outer groove)
//    42deg -> 0.856
//
// NOT solved from lib/tonearm-geometry.js: that module's law-of-cosines fit
// is for the production rig, whose pivot, arm length and platter are all
// sized differently, and whose own comment warns the radius/angle curve is
// non-monotonic. Nothing here imports it. Stage 12.4 re-derives these against
// whatever geometry the real deck ends up with.
//
// 22 rather than the production deck's ~1.07x-radius park: at 1.07 the swing
// to the groove is 6deg and reads as the arm twitching. 22deg puts the stylus
// over the deck body where an arm rest belongs, and the swing is 15deg.
const ARM_REST = 22;
const ARM_PLAY = 37;
// Arm height above the record, px. The needle-down beat is a Z drop, not more
// rotation — swinging further would walk the stylus toward the label.
const ARM_Z_UP = 15;
const ARM_Z_DOWN = 9;

// Where the record falls from, px of translateZ in the deck's local frame —
// i.e. straight up off the platter along its own normal, so the fall stays
// physically correct while the deck is still mid-tilt underneath it.
const FALL_FROM_Z = 260;
const RECORD_Z = 6;

// 33 1/3 RPM is 1.8s per revolution. Linear — a real platter's speed is
// genuinely constant and any easing reads as wobble. Same value and same
// reasoning as the production deck.
const SPIN_SECONDS = 1.8;
const SPIN_UP_SECONDS = 1.2;
const SPIN_DOWN_SECONDS = 0.8;

// Second and later drops in a visit. "~40% faster" as a timeScale, so every
// beat compresses together and the overlaps hold their relative shape.
const REPEAT_TIMESCALE = 1.4;

// Reduced motion has no choreography to hang anything off, so the record
// simply crossfades onto a deck that never tilts.
const REDUCED_FADE = 0.18;

// The deck's tilt. An object with real mass: a touch of ease-IN at the head
// (it has to be got moving) and a long settle with no overshoot, rather than
// the front-loaded SIGNATURE_EASE the sections share — that curve is built for
// UI arriving, and a deck swinging into a 3/4 view is a weight being lifted.
// cubic-bezier(0.34, 0.02, 0.18, 1) restated as the SVG path CustomEase takes;
// the C command's control points ARE the bezier's own (x1,y1,x2,y2).
CustomEase.create("swDeckTilt", "M0,0 C0.34,0.02 0.18,1 1,1");

// The record landing. 0.22 against the 0.3 My Taste's cards settled on
// (lib/gsap.js, CARD_LAND_EASE) — a disc dropping 260px onto felt is a
// quieter contact than a flyer being pinned, and the brief asks for subtle.
//
// NO `squash` key, deliberately: CustomBounce only creates the paired
// "<id>-squash" ease when squash is truthy, and a rigid 12" disc does not
// squash on contact. The cards' own squash tween is the right call for paper;
// copying it here would read as rubber.
CustomBounce.create("swRecordLand", { strength: 0.22 });

// Rings. Two, staggered, in the label colour — the beat that says "it is
// playing" without needing sound. Disable-able (api.setRings) purely so the
// perf trace can price them; see design-review/mobile-v3/perf-trace.mjs.
const RING_DUR = 1.05;
const RING_STAGGER = 0.18;
const RING_FROM = { scale: 0.52, opacity: 0.8 };
const RING_TO = { scale: 1.95, opacity: 0 };

// No propTypes convention or dependency in this codebase — same precedent as
// turntable.jsx's `track` and walkman.jsx's `rootRef`. One file-level disable
// rather than four line-disables, matching sections/experience.jsx.
/* eslint-disable react/prop-types */

/**
 * @param labelColor   the song's colour. Lands on --sw-label; the record's
 *                     label and both rings read it.
 * @param apiRef       a plain ref object. Populated with { drop, lift,
 *                     setPlaying, setRings, seek, duration } — the house
 *                     ref-as-prop idiom (walkman.jsx), not
 *                     forwardRef/useImperativeHandle, which walkman.jsx's own
 *                     note rules out for this codebase.
 * @param onNeedleDown called once per drop at CONTACT_AT, forward only. The
 *                     ONLY seam into this component: Stage 12.3 hangs
 *                     playCached() off it, at which point the same-call-site
 *                     audio rule applies (turntable.jsx's NEEDLE_CONTACT).
 */
export default function SnowWhiteDeck({ labelColor = "#6f9bff", apiRef, onNeedleDown }) {
    const reduced = useReducedMotion();

    const rootRef = useRef(null);
    const deckRef = useRef(null);
    const bodyRef = useRef(null);
    const recordRef = useRef(null);
    const spinRef = useRef(null);
    const armRef = useRef(null);
    const headRef = useRef(null);
    const lidRef = useRef(null);
    const ringRefs = useRef([]);

    const tlRef = useRef(null);
    const spinTweenRef = useRef(null);
    const ringsOnRef = useRef(true);
    // Which way the playhead is MEANT to be travelling. The spin/ring beat at
    // SPIN_AT is a callback, and a callback cannot ask GSAP which direction it
    // was crossed from: tl.reversed() reports the reverse FLAG, which a seek
    // never sets. Found on the screenshot pass — seeking from 1.7s back to 0
    // crossed SPIN_AT with reversed() still false, so the backward seek fired
    // the forward branch and the t=0 frame came out with two rings in it.
    // Every entry point (drop, lift, seek) now states its own direction.
    const dirRef = useRef(1);
    // "First drop per visit gets full timing" — per mount, which for the real
    // Pocket Player is per visit (the sheet keeps the deck mounted).
    const firstDropRef = useRef(true);
    const onNeedleDownRef = useRef(onNeedleDown);
    onNeedleDownRef.current = onNeedleDown;

    // THE SINGLE WRITER for the platter's speed. Nothing else may touch this
    // tween's timeScale or pause/play it. Lifted wholesale from the production
    // deck's setSpin, including the three faults it was rewritten to fix:
    // orphaned pause callbacks, snapping timeScale(0) before a ramp, and two
    // un-killed timeScale tweens both writing every frame.
    const spinTo = useCallback((target, seconds) => {
        const tween = spinTweenRef.current;
        // Reduced motion keeps the platter still, matching the drop path below
        // and the production deck's own behaviour.
        if (!tween || reduced) return;

        gsap.killTweensOf(tween);
        const from = tween.timeScale();

        // Live BEFORE the ramp, never after: a paused tween ignores timeScale.
        if (target > 0) tween.play();

        if (!seconds || Math.abs(target - from) < 0.005) {
            tween.timeScale(target);
            if (target === 0) tween.pause();
            return;
        }

        gsap.to(tween, {
            timeScale: target,
            duration: seconds * Math.abs(target - from),
            ease: target > from ? "power1.out" : "power2.out",
            // In the tween's OWN onComplete, not a timeline callback: that is
            // what makes killTweensOf above cancel the pause together with the
            // ramp that scheduled it.
            onComplete: () => { if (target === 0) tween.pause(); },
        });
    }, [reduced]);

    const resetRings = useCallback(() => {
        const rings = ringRefs.current.filter(Boolean);
        if (!rings.length) return;
        gsap.killTweensOf(rings);
        gsap.set(rings, { scale: RING_FROM.scale, opacity: 0 });
    }, []);

    const burstRings = useCallback(() => {
        if (!ringsOnRef.current || reduced) return;
        const rings = ringRefs.current.filter(Boolean);
        if (!rings.length) return;
        gsap.killTweensOf(rings);
        gsap.fromTo(rings, RING_FROM, {
            ...RING_TO,
            duration: RING_DUR,
            ease: "power2.out",
            stagger: RING_STAGGER,
            overwrite: "auto",
        });
    }, [reduced]);

    useGSAP(() => {
        const deck = deckRef.current;
        const body = bodyRef.current;
        const record = recordRef.current;
        const spin = spinRef.current;
        const arm = armRef.current;
        const lid = lidRef.current;
        if (!deck || !body || !record || !spin || !arm || !lid) return undefined;

        // The initial state, set explicitly rather than left to CSS. Two
        // reasons: the reverse test reads these exact matrices back out of the
        // rendered DOM, and every tween below is a plain `to` — GSAP records a
        // `to` tween's start value the first time it renders, so THIS is the
        // state a reverse() lands on, from any point.
        const setInitial = () => {
            gsap.set(deck, { rotationX: 0, transformOrigin: "50% 50%" });
            gsap.set(body, { rotation: 0, transformOrigin: "50% 50%" });
            gsap.set(record, { z: FALL_FROM_Z, opacity: 0, transformOrigin: "50% 50%" });
            gsap.set(spin, { rotation: 0, transformOrigin: "50% 50%" });
            gsap.set(arm, { rotation: ARM_REST, z: ARM_Z_UP, transformOrigin: "50% 0%" });
            gsap.set(lid, { rotationX: 0, z: 22, transformOrigin: "50% 0%" });
            resetRings();
        };
        setInitial();

        // The continuous rotation, built once and left paused at timeScale 0 —
        // never started/stopped, so the record cannot jump back to 0deg
        // mid-spin. Deliberately NOT part of the timeline: an infinite repeat
        // inside a reversible timeline has no clean progress-0 to return to.
        const spinTween = gsap.to(spin, {
            rotation: 360,
            duration: SPIN_SECONDS,
            ease: "none",
            repeat: -1,
        });
        spinTween.timeScale(0);
        spinTween.pause();
        spinTweenRef.current = spinTween;

        const tl = gsap.timeline({
            paused: true,
            // Reverse cleanup. Two things the forward tweens do not own live
            // here: the spin tween (outside the timeline, above) and the
            // rings (fired imperatively). Resetting the record's rotation is
            // invisible at this point — the disc has already flown back up off
            // the platter — and it is what makes "reverse lands on the exact
            // initial transforms" true rather than nearly true.
            onReverseComplete: () => {
                spinTo(0, 0);
                resetRings();
                gsap.set(spin, { rotation: 0 });
            },
        });
        tlRef.current = tl;

        if (reduced) {
            // No entry, no tilt, no spin, no rings. The record crossfades onto
            // a deck that stays flat with its lid already open, the arm already
            // on the groove. Fully functional, just static — the same bargain
            // the production deck's reduced-motion branch strikes.
            gsap.set(lid, { rotationX: LID_OPEN_X });
            gsap.set(arm, { rotation: ARM_PLAY, z: ARM_Z_DOWN });
            gsap.set(record, { z: RECORD_Z });
            tl.to(record, { opacity: 1, duration: REDUCED_FADE, ease: "none" }, 0);
            tl.call(() => { if (dirRef.current > 0) onNeedleDownRef.current?.(); }, null, REDUCED_FADE);
        } else {
            // 1. Lid swings open about its back edge.
            tl.to(lid, {
                rotationX: LID_OPEN_X, duration: LID_DUR, ease: "power3.out",
            }, LID_AT);

            // 2. Deck tilts flat -> 3/4. Two elements, one beat: see the
            //    rotation-order note at the top of this file.
            tl.to(deck, { rotationX: TILT_X, duration: TILT_DUR, ease: "swDeckTilt" }, TILT_AT);
            tl.to(body, { rotation: TILT_Z, duration: TILT_DUR, ease: "swDeckTilt" }, TILT_AT);

            // 3. Record falls along the platter's own normal and settles.
            //    Opacity is a separate, much shorter tween: fading over the
            //    whole 760ms would have the disc arrive translucent, and the
            //    bounce ease would drag the fade back out with it on the dip.
            tl.to(record, {
                z: RECORD_Z, duration: FALL_DUR, ease: "swRecordLand",
            }, FALL_AT);
            tl.to(record, { opacity: 1, duration: 0.18, ease: "none" }, FALL_AT);

            // 4. Platter to speed, and the rings. Before needle-down, as on a
            //    real deck: you start the platter, then drop the stylus.
            //
            //    Branched on dirRef rather than trusted to fire only
            //    forwards: GSAP does run .call() callbacks when the playhead
            //    passes them backwards, and it cannot tell the callback which
            //    way it was crossed. onReverseComplete above is the second
            //    line of defence.
            tl.call(() => {
                if (dirRef.current < 0) { spinTo(0, SPIN_DOWN_SECONDS); resetRings(); }
                else { spinTo(1, SPIN_UP_SECONDS); burstRings(); }
            }, null, SPIN_AT);

            // 5. Arm swings in, then lowers onto the wax.
            tl.to(arm, { rotation: ARM_PLAY, duration: ARM_DUR, ease: "power2.inOut" }, ARM_AT);
            tl.to(arm, { z: ARM_Z_DOWN, duration: NEEDLE_DUR, ease: "power2.in" }, NEEDLE_AT);

            // 6. Needle contact. An explicit position, not chained off the
            //    durations above — this IS the moment, and in production it is
            //    where playCached() goes.
            tl.call(() => { if (dirRef.current > 0) onNeedleDownRef.current?.(); }, null, CONTACT_AT);
        }

        const api = {
            drop() {
                dirRef.current = 1;
                tl.timeScale(firstDropRef.current ? 1 : REPEAT_TIMESCALE);
                firstDropRef.current = false;
                // play() from wherever the playhead is, so a drop landing
                // mid-lift resumes forward instead of restarting.
                tl.play();
            },
            lift() {
                dirRef.current = -1;
                // Rings are fired outside the timeline, so reverse cannot
                // unwind them — kill them here, at the top of the gesture,
                // rather than waiting for onReverseComplete.
                resetRings();
                spinTo(0, SPIN_DOWN_SECONDS);
                tl.reverse();
            },
            setPlaying(playing) {
                spinTo(playing ? 1 : 0, playing ? SPIN_UP_SECONDS : SPIN_DOWN_SECONDS);
            },
            setRings(on) {
                ringsOnRef.current = !!on;
                if (!on) resetRings();
            },
            // Measurement seams for design-review/mobile-v3/*.mjs. seek()
            // pauses and renders one exact frame, which is what makes the spec
            // screenshots deterministic instead of wall-clock-jittered.
            // resetRings() FIRST: the rings are fired imperatively from the
            // SPIN_AT callback and live outside the timeline, so a seek
            // backwards leaves whatever burst was in flight still running
            // over the frame being captured. Found on the first screenshot
            // pass — the t=0 shot had two rings in it.
            //
            // suppressEvents: false (the second argument) is deliberate: the
            // spin/ring beat IS a callback, so suppressing it would make
            // every frame at or past 1.45s show a stationary platter and no
            // rings — a picture of a state the deck never actually reaches.
            seek(seconds) {
                dirRef.current = seconds >= SPIN_AT ? 1 : -1;
                tl.pause();
                resetRings();
                tl.seek(seconds, false);
            },
            duration() { return tl.duration(); },
            progress() { return tl.progress(); },
        };
        if (apiRef) apiRef.current = api;

        return () => {
            tl.kill();
            spinTween.kill();
            tlRef.current = null;
            spinTweenRef.current = null;
            if (apiRef) apiRef.current = null;
        };
    }, { scope: rootRef, dependencies: [reduced, apiRef, spinTo, resetRings, burstRings] });

    return (
        <div className="sw-stage" ref={rootRef} style={{ "--sw-label": labelColor }}>
            {/* .sw-deck carries rotateX, .sw-deck-body carries rotateZ — the
                spec's transform order, which GSAP cannot produce from one
                element. See the note at the top of this file. */}
            <div className="sw-deck" ref={deckRef}>
                <div className="sw-deck-body" ref={bodyRef}>
                    {/* The thickness layer: the same plan shape pushed back in
                        Z and painted in the edge colour, so the tilt reveals a
                        band rather than a sheet of paper. */}
                    <div className="sw-deck-edge" aria-hidden="true" />

                    {/* Platter. Static — only .sw-record-spin inside it turns,
                        which is what lets the shine (this element's ::after,
                        a conic-gradient at a higher Z than the record) sit
                        over the record without rotating with it. */}
                    <div className="sw-platter" aria-hidden="true">
                        <div className="sw-record" ref={recordRef}>
                            <div className="sw-record-spin" ref={spinRef} />
                        </div>
                        <div className="sw-ring" ref={(el) => { ringRefs.current[0] = el; }} />
                        <div className="sw-ring" ref={(el) => { ringRefs.current[1] = el; }} />
                    </div>

                    {/* One rigid body: the counterweight is this element's
                        ::before, but the headshell is a real child because it
                        IS the stylus position and the arm angles were measured
                        from its rect (see .sw-arm-head in main.scss). It
                        carries no transform, so it rides the arm's layer
                        rather than adding one. */}
                    <div className="sw-arm" ref={armRef} aria-hidden="true">
                        <div className="sw-arm-head" ref={headRef} />
                    </div>

                    {/* pointer-events: none in the SCSS — the lid spends most
                        of its life lying over the whole deck. */}
                    <div className="sw-lid" ref={lidRef} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}
