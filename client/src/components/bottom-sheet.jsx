import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import { gsap, Draggable, InertiaPlugin } from "../lib/gsap.js";
import useReducedMotion from "../hooks/use-reduced-motion.js";

// The now-playing bottom sheet — Stage 12.2, the shell only.
//
// Portaled to <body>, like the record crate's mobile takeover
// (record-crate.jsx): a fixed, transform-animated panel nested inside the
// hero grid is a relayout waiting to happen, and at the top of <body> it is a
// clean compositor layer with nothing above it to disturb.
//
// Stage 12.3 puts the real turntable inside. This file knows nothing about
// decks, tracks or audio — it is a container that opens, closes and can be
// thrown shut.

// 620ms, from the drop spec's "0-620 sheet rises" beat. The sheet is the
// slowest thing in that sequence on purpose: every other beat overlaps it.
const OPEN_SECONDS = 0.62;
const CLOSE_SECONDS = 0.42;
const REDUCED_FADE = 0.18;

// How far down the sheet must be dragged before release dismisses it rather
// than snapping back. A third is the common bottom-sheet figure and it
// matches the gesture: past a third, the sheet reads as "going", and snapping
// it back feels like the phone arguing.
const DISMISS_RATIO = 0.35;

// …or this fast, regardless of distance. A flick barely moves the sheet
// before the finger leaves, so distance alone makes a deliberate throw feel
// ignored. px/sec, read from InertiaPlugin's own velocity tracker.
const DISMISS_VELOCITY = 700;

// How far a finger must travel down, from a scroller already at its top,
// before the gesture is handed from native scrolling to the sheet. Small
// enough not to feel laggy, large enough that the jitter in a stationary
// thumb cannot trip it.
const PULL_THRESHOLD = 8;

/**
 * @param open       controlled by the caller (the player store, in practice)
 * @param onClose    called when the sheet dismisses ITSELF — drag, scrim tap,
 *                   Escape. Never called in response to `open` going false.
 * @param label      accessible name for the dialog
 * @param children   the sheet's scrollable content
 *
 * No `eslint-disable react/prop-types` here, unlike every other prop-taking
 * component in this repo. One was added out of habit and eslint reported it
 * as an UNUSED directive: the rule does not fire on this file, because every
 * prop is either given a default or used only as an opaque value, and
 * react/prop-types only reports props it can see being accessed. Left off
 * rather than suppressed — a disable that suppresses nothing is noise, and it
 * would hide a real violation added later.
 */
export default function BottomSheet({ open, onClose, label = "Now playing", children }) {
    const reduced = useReducedMotion();

    const rootRef = useRef(null);
    const scrimRef = useRef(null);
    const sheetRef = useRef(null);
    const grabberRef = useRef(null);
    const headRef = useRef(null);
    const scrollRef = useRef(null);

    const draggableRef = useRef(null);
    // The element focus should return to once the sheet closes. Captured at
    // open, because by close time the dock button may have re-rendered.
    const restoreFocusRef = useRef(null);

    // Mirrors `open` for callbacks that are built once and would otherwise
    // close over a stale value.
    const openRef = useRef(open);
    openRef.current = open;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const sheetHeight = useCallback(
        () => sheetRef.current?.offsetHeight || window.innerHeight,
        [],
    );

    // ---- open / close ------------------------------------------------------
    //
    // The sheet is ALWAYS mounted and always in the DOM; `open` only moves it.
    // Unmounting it would throw away the Draggable and the scroll position on
    // every dismiss, and would make the dock -> sheet Flip in Stage 12.4
    // impossible (Flip needs both states to exist).
    useGSAP(() => {
        const sheet = sheetRef.current;
        const scrim = scrimRef.current;
        if (!sheet || !scrim) return;

        gsap.killTweensOf([sheet, scrim]);

        if (open) {
            gsap.set(rootRef.current, { pointerEvents: "auto" });
            if (reduced) {
                // A crossfade, not a rise. Same bargain the deck's own
                // reduced-motion branch strikes: the thing still works, it
                // just does not travel.
                gsap.set(sheet, { y: 0 });
                gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: REDUCED_FADE });
                gsap.fromTo(sheet, { opacity: 0 }, { opacity: 1, duration: REDUCED_FADE });
            } else {
                gsap.set(sheet, { opacity: 1 });
                gsap.to(scrim, { opacity: 1, duration: OPEN_SECONDS * 0.6, ease: "power2.out" });
                gsap.to(sheet, { y: 0, duration: OPEN_SECONDS, ease: "power3.out" });
            }
        } else {
            const hide = () => gsap.set(rootRef.current, { pointerEvents: "none" });
            if (reduced) {
                gsap.to(scrim, { opacity: 0, duration: REDUCED_FADE });
                gsap.to(sheet, { opacity: 0, duration: REDUCED_FADE, onComplete: hide });
            } else {
                gsap.to(scrim, { opacity: 0, duration: CLOSE_SECONDS, ease: "power2.in" });
                gsap.to(sheet, {
                    y: sheetHeight(),
                    duration: CLOSE_SECONDS,
                    ease: "power2.in",
                    onComplete: hide,
                });
            }
        }
    }, { dependencies: [open, reduced], scope: rootRef });

    // Park offscreen on mount, before the first paint, so a closed sheet is
    // never briefly visible. gsap.set in useGSAP runs after layout, which is
    // soon enough — but only because the CSS also starts it translated.
    useGSAP(() => {
        if (open) return;
        gsap.set(sheetRef.current, { y: sheetHeight() });
        gsap.set(rootRef.current, { pointerEvents: "none" });
    }, { dependencies: [], scope: rootRef });

    // ---- drag to dismiss ---------------------------------------------------
    useGSAP(() => {
        const sheet = sheetRef.current;
        const scroller = scrollRef.current;
        if (!sheet || !scroller) return undefined;

        // ONE dismissal decision, shared by both gesture paths — the
        // Draggable on the grabber and the hand-driven pull from the content.
        // Two copies of this would drift, and "the sheet closes at a
        // different distance depending on where you grabbed it" is the kind
        // of bug nobody reports precisely.
        const settle = (travelled, velocity) => {
            const far = travelled > sheetHeight() * DISMISS_RATIO;
            const fast = velocity > DISMISS_VELOCITY;

            if (far || fast) {
                // Hand back to the caller rather than animating out here. The
                // open/close effect above owns the exit tween, so there is one
                // place that knows where the sheet is — two animators on the
                // same property is the bug this codebase has already fixed
                // twice (turntable.jsx's setSpin).
                onCloseRef.current?.();
                return;
            }
            gsap.to(sheet, { y: 0, duration: 0.34, ease: "power3.out" });
        };

        // Velocity tracking, switched on explicitly. The Draggable below runs
        // with inertia OFF (see there), and without inertia Draggable does
        // not track velocity for you — so this is what makes
        // InertiaPlugin.getVelocity() return a real number on both gesture
        // paths rather than 0.
        InertiaPlugin.track(sheet, "y");

        const [draggable] = Draggable.create(sheet, {
            type: "y",
            // Only the grabber and the header start a drag by themselves. The
            // content area is handed over manually, and only from its top —
            // see the pull handler below.
            trigger: [grabberRef.current, headRef.current].filter(Boolean),
            // Down only. minY 0 is the open position; dragging up past it
            // would lift the sheet off the bottom of the screen.
            bounds: { minY: 0, maxY: window.innerHeight },
            edgeResistance: 0.9,
            // Inertia OFF, deliberately, despite this being the "Draggable +
            // inertia" item on the roadmap. A sheet's release is a BINARY
            // decision — dismiss or return — and settle() below makes it from
            // distance and velocity. A throw animation on top of that is a
            // second animator writing `y`, and it won: with inertia on, a
            // short drag from the grabber left the sheet stranded at y=46
            // instead of snapping back, because the throw outlived settle()'s
            // tween (sheet-gesture.mjs case B). Velocity still decides —
            // that is what InertiaPlugin.track() above is for — the plugin
            // just no longer animates.
            inertia: false,
            allowNativeTouchScrolling: false,
            onDragEnd() { settle(this.y, InertiaPlugin.getVelocity(sheet, "y")); },
        });
        draggableRef.current = draggable;

        // ---- the part that is actually hard --------------------------------
        //
        // "Drag to dismiss, but only from scroll-top." A downward swipe in
        // the sheet's content means SCROLL when there is content above it,
        // and DISMISS when there is not. The direction is not known at
        // touch-down, so the gesture can be neither claimed nor declined
        // there.
        //
        // THE BROWSER WILL NOT LET YOU DECIDE LATER. The first attempt left
        // `touch-action: pan-y` on the scroller and tried to hand the gesture
        // to Draggable once the finger had moved past a threshold. Measured:
        // of fourteen dispatched touch-moves the handler received exactly
        // ONE. Chrome resolves a vertical pan into a scroll on the first
        // move, cancels the pointer stream, and never asks again — so the
        // threshold was never reached and the sheet would not dismiss from
        // its content at all (sheet-gesture.mjs case D).
        //
        // So the gesture has to be owned BEFORE it starts, which means
        // `touch-action` has to be right before it starts:
        //
        //   scrollTop <= 0  ->  touch-action: none, and this handler runs the
        //                       whole gesture: downward hands off to
        //                       Draggable, upward is scrolled by hand
        //   scrollTop  > 0  ->  touch-action: pan-y, and the browser scrolls
        //                       natively with momentum, untouched
        //
        // Done this way rather than with `touch-action: pan-down` (which
        // would express exactly this and need no JS) because the directional
        // values have patchy Safari support, and iOS is the target. This is
        // engine-agnostic and testable in Chromium, which is all that can run
        // here — see README section 7.
        //
        // The cost: the FIRST upward flick from the very top is scrolled by
        // hand and so has no momentum. Subsequent gestures are native. A
        // 12.4 polish item, noted in the roadmap, not a correctness problem.
        const AT_TOP = 0;
        let mode = null; // null -> browser owns it | "undecided" | "pull" | "scroll"
        let startY = 0;
        let startTop = 0;
        let pullY = 0;

        // touch-action must be correct BEFORE the next gesture begins, so it
        // is re-synced on every scroll rather than computed on pointerdown —
        // by pointerdown the browser has already decided what it will claim.
        const syncTouchAction = () => {
            scroller.style.touchAction = scroller.scrollTop <= AT_TOP ? "none" : "pan-y";
        };
        syncTouchAction();

        const onScroll = () => { if (mode === null) syncTouchAction(); };

        const onPointerDown = (event) => {
            if (!event.isPrimary) return;
            startY = event.clientY;
            startTop = scroller.scrollTop;
            mode = startTop <= AT_TOP ? "undecided" : null;
        };

        const onPointerMove = (event) => {
            if (mode === null) return; // scrolled content: the browser has it
            const dy = event.clientY - startY;

            if (mode === "undecided") {
                if (dy >= PULL_THRESHOLD) {
                    mode = "pull";
                    pullY = 0;
                } else {
                    if (dy <= -PULL_THRESHOLD) mode = "scroll";
                    return;
                }
            }

            if (mode === "scroll") {
                // Owned by hand, because touch-action is none at the top.
                scroller.scrollTop = startTop - dy;
                return;
            }

            // mode === "pull". Driven directly rather than through
            // Draggable.startDrag(), which does NOT work here: the Draggable
            // is created with `trigger` limited to the grabber and the
            // header, and it declines a drag that begins outside its trigger.
            // Measured — with touch-action already correct and all thirteen
            // pointermoves arriving, startDrag() left the sheet at y=0 for
            // the whole gesture (sheet-gesture.mjs case D). Ten lines of
            // hand-driving is cheaper and more predictable than widening the
            // trigger to the whole sheet and then fighting it back off the
            // scroller.
            pullY = Math.max(0, dy);
            gsap.set(sheet, { y: pullY });
        };

        const endGesture = () => {
            // Same velocity source as the Draggable path, so a flick from
            // the content and a flick from the grabber dismiss at the same
            // speed.
            if (mode === "pull") settle(pullY, InertiaPlugin.getVelocity(sheet, "y"));
            mode = null;
            syncTouchAction();
        };

        // pointerdown/pointermove are NOT passive. Draggable and this handler
        // both need preventDefault available; inside a passive listener the
        // call is ignored and Chrome logs "Unable to preventDefault inside
        // passive event listener invocation."
        scroller.addEventListener("pointerdown", onPointerDown, { passive: false });
        scroller.addEventListener("pointermove", onPointerMove, { passive: false });
        scroller.addEventListener("pointerup", endGesture, { passive: true });
        scroller.addEventListener("pointercancel", endGesture, { passive: true });
        scroller.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            scroller.removeEventListener("pointerdown", onPointerDown);
            scroller.removeEventListener("pointermove", onPointerMove);
            scroller.removeEventListener("pointerup", endGesture);
            scroller.removeEventListener("pointercancel", endGesture);
            scroller.removeEventListener("scroll", onScroll);
            draggable.kill();
            InertiaPlugin.untrack(sheet, "y");
            draggableRef.current = null;
        };
    }, { dependencies: [reduced], scope: rootRef });

    // ---- escape, and focus -------------------------------------------------
    useEffect(() => {
        if (!open) return undefined;

        restoreFocusRef.current = document.activeElement;
        // The panel itself takes focus, not the first control: a screen
        // reader should hear the dialog's name before its contents.
        sheetRef.current?.focus({ preventScroll: true });

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onCloseRef.current?.();
            }
        };
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            const restore = restoreFocusRef.current;
            if (restore && document.contains(restore)) restore.focus({ preventScroll: true });
        };
    }, [open]);

    // Page behind the sheet must not scroll with it. `overflow: hidden` on
    // <body> rather than a scroll-position lock, because the sheet is
    // full-bleed and nothing behind it is visible anyway.
    //
    // NOTE FOR STAGE 12.3: the real site runs Lenis (smooth-scroll.jsx), which
    // drives scroll from its own rAF loop and will keep going straight through
    // this. Mounting the sheet in the app means calling lenis.stop() on open
    // and lenis.start() on close as well — this line alone is not enough
    // there, and the lab has no Lenis, so the lab cannot catch it.
    useEffect(() => {
        if (!open) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    return createPortal(
        <div className="sheet-root" ref={rootRef} data-open={open ? "" : undefined}>
            {/* A plain div, not a button: it is decorative chrome, and the
                dialog already has Escape and an explicit close control. A
                button here would be an unlabelled tab stop in front of the
                real content. */}
            <div className="sheet-scrim" ref={scrimRef} onClick={() => onCloseRef.current?.()} />

            <div
                className="sheet"
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                aria-hidden={open ? undefined : "true"}
                tabIndex={-1}
            >
                <div className="sheet-grabber" ref={grabberRef}>
                    <span className="sheet-grabber-bar" aria-hidden="true" />
                </div>

                <div className="sheet-head" ref={headRef}>
                    <p className="sheet-title">{label}</p>
                    <button
                        type="button"
                        className="sheet-close"
                        onClick={() => onCloseRef.current?.()}
                        aria-label="Close now playing"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M6 9 L12 15 L18 9" fill="none" stroke="currentColor"
                                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                {/* touch-action: pan-y in the SCSS — the pull handler above
                    needs pointermove to keep arriving during a vertical
                    gesture, which `none` would suppress and `auto` would hand
                    entirely to the browser. */}
                <div className="sheet-scroll" ref={scrollRef}>
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
