import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import '../styles/main.scss';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, SplitText, SIGNATURE_EASE, Flip, WALKMAN_POP_EASE } from '../lib/gsap.js';
import { getActiveLenis, isProgrammaticScrollActive, onProgrammaticScrollChange } from '../lib/scroll.js';
import useReducedMotion from '../hooks/use-reduced-motion.js';
import Walkman, { WALKMAN_LCD_TEXT } from '../components/walkman.jsx';

// Stage 3 Task 11.2 — Task 2 of the pair Task 11 opened (numbered as a
// decimal follow-up, same convention as Task 10.1/10.2, not a new top-level
// item) — an entry-only scroll-hold pin, brought in scrolling from
// #projects. The brief that asked for this named "#my-taste, #experience" in
// the same breath as if they shared one pin mechanism — re-reading both
// live (not assumed) shows they don't. #my-taste's pin (my-taste.jsx) is a
// standalone `ScrollTrigger.create({ pin: true, once: true, onEnter })`
// holding real scroll input via `lenis.stop()`/`lenis.start()` while a
// paused, un-scrubbed timeline plays once and releases the hold from its own
// `onComplete` — exactly "pin briefly, reveal, release," which is what this
// task actually wants. #experience's pin is a structurally different thing:
// `gsap.timeline({ scrollTrigger: { pin: true, scrub: 0.3, ... } })`, pinned
// for its ENTIRE scroll-through distance and continuously driven BY scroll
// position rather than released on a timer — there's no "reveal completes,
// then release" moment there at all, since the pin only ever ends because
// the visitor scrolled far enough to exhaust it. That mechanism was traced
// back further still: #my-taste's own comments credit About's Task 5
// entrance-hold (about.jsx) as the ORIGINAL source of the timed-hold
// primitive it reuses — so this section follows About/My-Taste's actual
// pattern below, not a new one, and not Experience's scrub. Flagged here
// rather than silently building against the brief's own (inaccurate)
// framing, per this project's working agreement.
//
// The reveal itself uses SplitText only, not DrawSVGPlugin — the brief said
// "SplitText and/or DrawSVGPlugin," and this section has no SVG in it at
// all to draw (checked the tree before assuming one should exist); About's
// own entrance is the same shape (SplitText cascades, no DrawSVGPlugin —
// that plugin is scoped to Experience's rail path, a real line that needs
// tracing, which nothing here has).
//
// Asset-load gating ("fonts, images... per the existing pin-not-engaging-
// after-reload fix from #my-taste") is NOT re-implemented here. Re-read
// smooth-scroll.jsx before assuming it needed a per-section copy: B30's fix
// lives there, page-wide — `document.fonts.ready` plus a debounced
// `ResizeObserver` on `document.body`, both calling a single
// `ScrollTrigger.refresh()` that re-measures EVERY currently-registered
// trigger, not just #my-taste's. This section's own trigger (below) is
// covered by that same refresh automatically; adding a second, section-local
// copy would just be a duplicate mechanism racing the real one.

// The send-success walkman takeover — Stage 3 Task 12. The brief itself
// carried no task number; numbered here as the next fresh top-level item
// (not a further decimal off Task 11, the way 10.1/10.2/11.2 each were) —
// this is new, separate functionality layered on an already-complete
// Task 11.2, not a fix or extension of that same feature the way each of
// those three was to ITS OWN parent task. Re-read this whole file fresh per
// this brief's own explicit instruction, rather than assuming Task 11/11.2's
// shape still applies unchanged — it does, this is built on top of it, not a
// replacement.
//
// A single React-owned "flight" element (CASSETTE_FLIP_ID below), not raw
// `document.createElement`/`appendChild` — GSAP's own Flip demos usually
// assume vanilla DOM, but this app is React-rendered; a node React doesn't
// know about, inserted directly into a parent React DOES reconcile
// (.contact-section), risks a real conflict the next time React touches
// that parent's children. Rendering it through React state instead (see
// `flightSlot` below) keeps React the sole owner of every node in the tree,
// GSAP only ever touches style/transform on nodes React already placed.
const CASSETTE_FLIP_ID = 'connect-cassette-flight';

// EQ bars + cord — a small, self-contained looping timeline, started once
// Phase 1 begins and left running through settle into indefinite idle
// (Phase 2 step 10). Colours are set by walkman.jsx itself (colorwayFor,
// per the brief's own instruction not to hardcode them) — this only drives
// the motion. Plain sine easing + repeat:-1/yoyo:true, not CustomWiggle:
// CustomWiggle's own shape is built to DECAY back to exactly 0 once
// (My Taste's tape-snap, lib/gsap.js) — reusing it here as a manual
// repeat:-1/yoyo pairing would fight that decay every single cycle instead
// of reading as one continuous idle sway.
function startIdleLoop(walkmanEl) {
    const eqBars = walkmanEl.querySelectorAll('.walkman-eq-bar');
    const cordEl = walkmanEl.querySelector('.walkman-cord');
    const loop = gsap.timeline();

    if (eqBars.length) {
        loop.to(eqBars, {
            scaleY: () => gsap.utils.random(0.45, 1.55),
            duration: () => gsap.utils.random(0.5, 0.95),
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            stagger: { each: 0.11, from: 'random' },
        }, 0);
    }
    if (cordEl) {
        loop.to(cordEl, {
            rotation: 5,
            duration: 1.7,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
        }, 0);
    }
    return loop;
}

// Same trailing-slash guard as my-taste.jsx: a trailing slash on the env var
// would produce "//api/contact", which Express treats as an unregistered path.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/+$/, '');

const EMPTY = { name: '', email: '', message: '', website: '' };

export default function Connect() {
    const rootRef = useRef(null);
    const containerRef = useRef(null);
    const titleRef = useRef(null);
    const descriptionRef = useRef(null);
    const cassetteRef = useRef(null);
    const flightRef = useRef(null);
    const walkmanRootRef = useRef(null);
    const scrimRef = useRef(null);
    // Whether the walkman has EVER popped in this session — Phase 0 (the
    // pop-in itself) only plays once; every later successful send jumps
    // straight to Phase 1, per the brief's own explicit instruction. A
    // ref, not state: it doesn't drive any render, only a later function's
    // own branch.
    const hasPoppedInRef = useRef(false);
    // The currently-running idle loop (EQ bars + cord), if any — killed
    // explicitly at the START of every new send sequence so a second send
    // in the same session can never stack a duplicate infinite tween on
    // top of the first.
    const idleLoopRef = useRef(null);
    // The Phase 0-2 timeline itself, kept only so component unmount can
    // kill it if a send happens to be mid-sequence when the visitor
    // navigates away.
    const sequenceTlRef = useRef(null);

    const [formData, setFormData] = useState(EMPTY);
    // idle | sending | sent | error — the previous version had no notion of
    // this at all: it alert()ed a thank-you before the request was even sent,
    // so a failure was invisible to the visitor and the message was lost.
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    // Separate from the send-level errorMessage above: this is a client-side
    // validation error (never sent, not the server's opinion), shown under
    // the one field the brief calls out — message. Cleared on any edit to
    // that field, mirroring how `status === 'error'` already resets on any
    // edit below.
    const [messageError, setMessageError] = useState('');
    // Persists once true for the rest of the session — the walkman, once it
    // has appeared, stays in the document (settled, idle-looping) even
    // after the visitor clicks "send another message" and the form
    // reappears, so the NEXT send can smoothly re-run Phase 1 onto it
    // rather than popping in from scratch a second time.
    const [walkmanVisible, setWalkmanVisible] = useState(false);
    // True only once the CURRENT sequence's Phase 2 has actually finished —
    // gates the "send another message" affordance (brief's own 9b) so it
    // can't appear mid-takeover, and gates nothing else.
    const [settled, setSettled] = useState(false);
    // The flying cassette clone's own slot, in .contact-section-relative
    // px — null when not in flight. React-rendered (see the module
    // comment above for why), briefly re-styled by JS to the bay's own
    // rect right before Flip.from runs, then cleared back to null once the
    // flight tween completes.
    const [flightSlot, setFlightSlot] = useState(null);

    const prefersReducedMotion = useReducedMotion();

    // The entry-hold pin + reveal — plays once, on first scroll into the
    // section, then releases for good (this section behaves as normal
    // in-flow content afterward, free scroll both directions). Runs
    // unconditionally under `(prefers-reduced-motion: no-preference)` only,
    // same single-branch gating as About/My Taste — unlike those two,
    // nothing here needs a matching reduced-motion branch to correct a
    // pre-hidden rest state: nothing is hidden by CSS by default (no mask
    // element, no data-driven per-card transform), so a reduced-motion
    // visitor who never enters this matchMedia branch simply sees the
    // section's real, unaltered DOM — already exactly right, without a
    // line of extra code for it.
    useGSAP(() => {
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
            const titleSplit = new SplitText(titleRef.current, { type: 'words' });
            // type: "words" — same reasoning My Taste's own kicker comment
            // gives: this description's text nodes wrap an inline
            // `<a href="mailto:...">`; word-splitting only touches TEXT,
            // leaving the link's own element untouched (still one real,
            // clickable `<a>` after SplitText reverts), rather than risking
            // "lines" or "chars" tearing into or duplicating it.
            const descriptionSplit = new SplitText(descriptionRef.current, { type: 'words' });
            // The compose box, batched as one stagger group rather than
            // individually SplitText'd — these are form CONTROLS, not text
            // to fragment. `.contact-hp` (the honeypot) is deliberately
            // excluded: it's already invisible (off-screen, aria-hidden),
            // so animating it would just be wasted work.
            const formTargets = gsap.utils.toArray('.contact-form .form-group, .contact-form .submit-button', rootRef.current);

            if (formTargets.length === 0) return undefined;

            let holding = false;
            function releaseHold() {
                if (!holding) return;
                holding = false;
                getActiveLenis()?.start();
                window.removeEventListener('touchmove', blockTouchMove, { capture: true });
                window.removeEventListener('keydown', blockScrollKeys, { capture: true });
            }
            const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
            function blockScrollKeys(e) {
                if (SCROLL_KEYS.has(e.key)) e.preventDefault();
            }
            function blockTouchMove(e) {
                e.preventDefault();
            }

            const tl = gsap.timeline({ paused: true, onComplete: releaseHold });

            // Same cascade shape as About's own entrance (title -> body ->
            // detail group, each waiting an explicit beat for the group
            // before it rather than chaining off its duration) and the same
            // SIGNATURE_EASE curve every calm, one-time entrance on this
            // site already shares.
            tl.from(titleSplit.words, { opacity: 0, y: 16, duration: 0.5, ease: SIGNATURE_EASE, stagger: 0.06 }, 0);
            tl.from(descriptionSplit.words, { opacity: 0, y: 12, duration: 0.4, ease: SIGNATURE_EASE, stagger: 0.02 }, '>+=0.2');
            tl.from(formTargets, { opacity: 0, y: 14, duration: 0.4, ease: SIGNATURE_EASE, stagger: 0.08 }, '>+=0.25');

            const navbarHeight = () =>
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;

            const st = ScrollTrigger.create({
                trigger: rootRef.current,
                // navbarHeight-aware "top top", same reasoning as every
                // other pinned section's own trigger (About/My
                // Taste/Experience) — keeps a nav click landing on #connect
                // and this pin's own engage point in sync.
                start: () => 'top top+=' + navbarHeight(),
                pin: true,
                // Plays once per page view, same as About/My Taste's own
                // hold — replaying a scroll-hold every time a visitor
                // scrolls back down past this section (it's the LAST
                // section — a revisit is a real, easy case here, not
                // hypothetical) would read as an obstacle, not a flourish,
                // on the second pass.
                once: true,
                onEnter: () => {
                    // A nav click already carrying the visitor straight to
                    // #connect (or through it) — resolve the reveal
                    // instantly rather than holding scroll for an entrance
                    // they didn't ask to watch. Same escape hatch About/My
                    // Taste's own holds use.
                    if (isProgrammaticScrollActive()) {
                        tl.progress(1);
                        return;
                    }

                    // Same safety net About's own hold carries: measured
                    // against the CONTAINER's real content height
                    // (title + description + form), not the outer
                    // .contact-section shell — that shell is deliberately
                    // taller than its content on most viewports (flex-
                    // centered inside a navbar-aware min-height floor, see
                    // main.scss), so measuring the shell itself would
                    // compare the wrong two numbers and could skip the hold
                    // even when the real content fits comfortably.
                    const available = window.innerHeight - navbarHeight();
                    const contentHeight = containerRef.current.getBoundingClientRect().height;
                    if (contentHeight > available) {
                        tl.play();
                        return;
                    }

                    holding = true;
                    const lenis = getActiveLenis();
                    if (lenis) {
                        // NO overshoot correction here — unlike About/My
                        // Taste, tested and found actively harmful rather
                        // than copied on faith. Those two need it because
                        // their entrances read something OTHER than plain
                        // pinned/not-pinned state before freezing (About's
                        // own centered `start` math, My Taste's tighter
                        // engagement window) where landing scroll a little
                        // past `start` visibly matters. This pin has no
                        // scrub and nothing reads `self.progress` — GSAP had
                        // already snapped the section to its pinned position
                        // (top === navbarHeight, confirmed via live
                        // instrumentation) by the time onEnter fires at all,
                        // overshoot or not. Forcing scroll BACK to exactly
                        // `self.start` landed it precisely on the pin's own
                        // boundary and — confirmed live, traced frame by
                        // frame — that boundary snap made ScrollTrigger
                        // unpin the section on the spot, dropping it into
                        // unpinned document flow ~200px away from the
                        // pinned position for the ENTIRE reveal, a real
                        // visible jump right as the hold engaged. Simply not
                        // correcting anything and going straight to stop()
                        // leaves the pin exactly where it already snapped.
                        lenis.stop();
                    }
                    window.addEventListener('touchmove', blockTouchMove, { passive: false, capture: true });
                    window.addEventListener('keydown', blockScrollKeys, { capture: true });
                    tl.play();
                },
            });

            // Covers a nav click that starts WHILE already holding, not just
            // one that arrives before entry — same reasoning and mechanism
            // as About/My Taste's own subscription.
            const unsubscribe = onProgrammaticScrollChange((active) => {
                if (active && holding) {
                    tl.progress(1);
                    releaseHold();
                }
            });

            return () => {
                unsubscribe();
                releaseHold();
                st.kill();
                tl.kill();
                titleSplit.revert();
                descriptionSplit.revert();
            };
        });

        return () => mm.revert();
    }, { scope: rootRef, dependencies: [] });

    // Component-unmount safety net for the send-sequence's own tweens —
    // separate from the entry-pin's own useGSAP above on purpose: that one
    // is scroll-triggered and scoped/cleaned up by useGSAP's own dependency
    // lifecycle; this one is click-triggered and built fresh (a plain
    // function call, not a dependency-driven effect re-run) every time a
    // send succeeds, so it needs its own plain-unmount cleanup instead.
    useEffect(() => {
        return () => {
            idleLoopRef.current?.kill();
            sequenceTlRef.current?.kill();
        };
    }, []);

    // The walkman send-success takeover itself. `cassetteFlipState` is
    // `Flip.getState(...)` captured on the REAL textarea-cassette a moment
    // ago in handleSubmit, while it was still mounted — real DOM rects, not
    // a hardcoded offset, per the brief's own explicit instruction.
    function runSendSequence(cassetteFlipState) {
        const walkmanEl = walkmanRootRef.current;
        const sectionEl = rootRef.current;
        if (!walkmanEl || !sectionEl) return;

        // Kill any previous idle loop FIRST, unconditionally — explicit
        // requirement: a second send in the same session must replace the
        // running EQ/cord loop, never stack a second infinite one on top.
        idleLoopRef.current?.kill();
        idleLoopRef.current = null;
        sequenceTlRef.current?.kill();

        const lidEl = walkmanEl.querySelector('.walkman-lid');
        const litEl = walkmanEl.querySelector('.walkman-screen-lit');

        if (prefersReducedMotion) {
            // Skip straight to the settled end state — no scrim, no
            // scale-up, no scramble, no infinite loop (the brief's own
            // wording). The flying-cassette clone, if one was mounted for
            // this send, is dropped without ever animating it.
            gsap.set(walkmanEl, { clearProps: 'transform', opacity: 1, scale: 1 });
            if (lidEl) gsap.set(lidEl, { scaleY: 1 });
            if (litEl) litEl.textContent = WALKMAN_LCD_TEXT;
            setFlightSlot(null);
            setSettled(true);
            return;
        }

        const bayEl = walkmanEl.querySelector('.walkman-bay');
        const hasPoppedIn = hasPoppedInRef.current;
        hasPoppedInRef.current = true;
        setSettled(false);

        // Real-rect measurements for the takeover's own scale + centering —
        // taken now, against the walkman's own natural (untransformed) rest
        // position, never guessed. Capped so the takeover can never overflow
        // .contact-section even at the narrowest currently-supported width
        // (390px, verified live) — measured against the section's OWN box
        // rather than a hardcoded breakpoint number, so it stays correct if
        // either the width this project supports or this content changes.
        const walkmanRect = walkmanEl.getBoundingClientRect();
        const sectionRect = sectionEl.getBoundingClientRect();
        const DESIRED_SCALE = 2.3;
        const SAFE_FRACTION = 0.86;
        const maxScaleW = (sectionRect.width * SAFE_FRACTION) / walkmanRect.width;
        const maxScaleH = (sectionRect.height * SAFE_FRACTION) / walkmanRect.height;
        const finalScale = Math.min(DESIRED_SCALE, maxScaleW, maxScaleH);
        const deltaX = (sectionRect.left + sectionRect.width / 2) - (walkmanRect.left + walkmanRect.width / 2);
        const deltaY = (sectionRect.top + sectionRect.height / 2) - (walkmanRect.top + walkmanRect.height / 2);

        const tl = gsap.timeline({ onComplete: () => setSettled(true) });
        sequenceTlRef.current = tl;

        // Phase 0 — reveal. Skipped on any send after the first: the
        // walkman is already visible/settled from a prior send in this
        // session, so this run jumps straight to Phase 1 instead of
        // popping in from scratch a second time, per the brief's own
        // explicit instruction.
        if (!hasPoppedIn) {
            gsap.set(walkmanEl, { opacity: 0, scale: 0.5 });
            tl.to(walkmanEl, { opacity: 1, scale: 1, duration: 0.45, ease: WALKMAN_POP_EASE });
        }

        // Phase 1 — arrival.
        // 2. The cassette flies into the bay. Flip.from morphs the OLD,
        //    already-captured cassette state onto `flightRef.current` — a
        //    DIFFERENT element than the one `cassetteFlipState` was captured
        //    from (the real cassette unmounted with the form the instant
        //    status flipped to "sent"), matched purely by the shared
        //    data-flip-id both carry. Confirmed against
        //    node_modules/gsap/Flip.js directly before relying on it: Flip
        //    matches state entries by that id, not by literal node
        //    identity, which is exactly the documented technique for "this
        //    element became that one" rather than "this element moved."
        //    Re-styled to the bay's own rect immediately beforehand so
        //    Flip's own internal getState(targets) call reads THAT as the
        //    target/end position.
        if (cassetteFlipState && bayEl && flightRef.current) {
            const flight = flightRef.current;
            const bayRect = bayEl.getBoundingClientRect();
            flight.style.left = `${bayRect.left - sectionRect.left}px`;
            flight.style.top = `${bayRect.top - sectionRect.top}px`;
            flight.style.width = `${bayRect.width}px`;
            flight.style.height = `${bayRect.height}px`;

            const flip = Flip.from(cassetteFlipState, {
                targets: flight,
                duration: 0.5,
                ease: SIGNATURE_EASE,
                onComplete: () => setFlightSlot(null),
            });
            tl.add(flip, hasPoppedIn ? 0 : '>');
        } else {
            setFlightSlot(null);
        }

        // 3. Lid snaps shut over the landed cassette.
        if (lidEl) {
            tl.to(lidEl, { scaleY: 1, duration: 0.35, ease: WALKMAN_POP_EASE }, hasPoppedIn ? '>-=0.1' : '>-=0.15');
        }

        // 4. Scrim appears — scoped to the section (main.scss: position
        //    absolute against .contact-section, never position: fixed).
        tl.to(scrimRef.current, { opacity: 1, duration: 0.3 }, '<');

        // 5. Walkman scales up and centers within the section, over the
        //    scrim. A pure transform on a permanently position:static
        //    element (main.scss's own comment on .walkman has the full
        //    reasoning) — it never leaves normal flow, which is what makes
        //    "back to normal in-flow content" later (step 9) as simple as
        //    animating the SAME transform back to none.
        tl.to(walkmanEl, { x: deltaX, y: deltaY, scale: finalScale, duration: 0.55, ease: SIGNATURE_EASE }, '<');

        // 6. EQ bars + cord — start looping now, keep running right through
        //    settle into indefinite idle (step 10). Nothing later restarts
        //    them; this is the only place this sequence starts them.
        tl.call(() => {
            idleLoopRef.current = startIdleLoop(walkmanEl);
        }, [], '<+=0.1');

        // 7. Thank-you line resolves into the LCD screen through the ghost
        //    layer underneath it (walkman.jsx's own ghost/lit stacked pair).
        if (litEl) {
            tl.to(litEl, {
                scrambleText: { text: WALKMAN_LCD_TEXT, chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ', speed: 0.4 },
                duration: 0.55,
            }, '<+=0.15');
        }

        // Phase 2 — settle. A held beat first so the takeover actually
        // reads as a moment arrived at, not a blur passed through.
        // 8. Scrim fades out.
        tl.to(scrimRef.current, { opacity: 0, duration: 0.4 }, '+=0.5');
        // 9. Walkman animates back down into its normal in-flow position —
        //    clearProps once it lands so nothing about a future transform
        //    on this element (a hover effect, say) inherits a stale inline
        //    value, same discipline My Taste's own cascade uses for its
        //    cards (Task 4).
        tl.to(walkmanEl, {
            x: 0, y: 0, scale: 1, duration: 0.6, ease: SIGNATURE_EASE,
            onComplete: () => gsap.set(walkmanEl, { clearProps: 'transform' }),
        }, '<');
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (status === 'error') setStatus('idle');
        if (name === 'message' && messageError) setMessageError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === 'sending') return;

        // Client-side validation, scoped to the message field per the brief
        // — name/email's required-ness is still enforced by the existing
        // server round-trip (`validateContact` in server.js), surfaced
        // through the same generic contact-error banner as any other send
        // failure. `noValidate` on the <form> means the browser won't catch
        // this on its own; nothing did before this check existed.
        if (!formData.message.trim()) {
            setMessageError('Please write a message before sending.');
            return;
        }
        setMessageError('');

        setStatus('sending');
        setErrorMessage('');

        try {
            await axios.post(`${apiBaseUrl}/api/contact`, formData);

            // Real DOM rect + Flip state, captured on the ACTUAL cassette
            // element while it's still mounted — this has to happen before
            // the flushSync below, which unmounts the form (and the
            // cassette with it) in the same tick.
            let cassetteFlipState = null;
            let nextFlightSlot = null;
            if (cassetteRef.current && rootRef.current) {
                const rect = cassetteRef.current.getBoundingClientRect();
                const sectionRect = rootRef.current.getBoundingClientRect();
                nextFlightSlot = {
                    left: rect.left - sectionRect.left,
                    top: rect.top - sectionRect.top,
                    width: rect.width,
                    height: rect.height,
                };
                cassetteRef.current.setAttribute('data-flip-id', CASSETTE_FLIP_ID);
                cassetteFlipState = Flip.getState(cassetteRef.current);
            }

            setFormData(EMPTY);
            flushSync(() => {
                setWalkmanVisible(true);
                setFlightSlot(nextFlightSlot);
                setStatus('sent');
            });
            runSendSequence(cassetteFlipState);
        } catch (error) {
            // The server sends a visitor-safe string for the cases it can
            // anticipate (validation, rate limit, SMTP down); anything else
            // falls back to a generic line rather than surfacing an axios dump.
            setErrorMessage(
                error.response?.data?.error ||
                "Something went wrong sending that. Please try again, or email me directly at diegodamiango02@gmail.com."
            );
            setStatus('error');
            // Nothing about the walkman/sequence is touched on failure —
            // the brief's own requirement: it stays hidden (a first-ever
            // failure) or exactly as it was, settled and idle-looping (a
            // failure after an earlier successful send).
        }
    };

    // "Send another message" (Phase 2 step 9b) — re-shows the compose box.
    // The walkman itself is untouched: it stays visible, settled, idle-
    // looping, ready for runSendSequence to smoothly re-run Phase 1 onto it
    // on the next successful send rather than popping in again.
    const handleSendAnother = () => {
        setSettled(false);
        setStatus('idle');
    };

    const isSending = status === 'sending';

    return (
        <section className="contact-section" ref={rootRef}>
            {/* Section-scoped dim scrim (Phase 1 step 4) — position: absolute
                against .contact-section (main.scss), never position: fixed,
                so it can never cover anything outside #connect or follow
                scroll past it. */}
            <div className="connect-scrim" ref={scrimRef} aria-hidden="true" />

            {/* data-state mirrors turntable.jsx's own data-deck-state precedent
                — the full idle/sending/sent/error machine, not just a single
                hardcoded "sent" flag. The entry pin/reveal above doesn't
                read it — that's a one-time scroll-entry transition, unrelated
                to send state. */}
            <div className="contact-container" data-state={status} ref={containerRef}>
                <h2 className="contact-title" ref={titleRef}>Let&apos;s have a coffee talk</h2>
                <p className="contact-description" ref={descriptionRef}>
                    Let&apos;s connect and build something amazing together — reach me directly at{' '}
                    <a href="mailto:diegodamiango02@gmail.com">diegodamiango02@gmail.com</a> or send a message below.
                </p>

                {status === 'sent' ? (
                    <div className="contact-success" role="status">
                        <p>Thanks for reaching out — your message is on its way.</p>
                        <p>I&apos;ll get back to you soon.</p>
                    </div>
                ) : (
                    <form className="contact-form" onSubmit={handleSubmit} noValidate>
                        {/* Name + email side by side — was two full-width stacked
                            fields, the largest single chunk of vertical space in
                            the form for two short values. A 2-col grid (below,
                            .contact-form-row) halves that footprint; each input's
                            OWN padding also shrank (.form-group input, below) —
                            font-size stays 1rem so this doesn't trip iOS Safari's
                            zoom-on-focus-under-16px behavior. */}
                        <div className="contact-form-row">
                            <div className="form-group">
                                <label htmlFor="name">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    maxLength={100}
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={isSending}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    maxLength={254}
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isSending}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            {/* Cassette-shaped compose box — a tape label (paper
                                card + two reel windows, main.scss) around the
                                real textarea, not a second control. The reels
                                are decorative (pointer-events: none) so they
                                never sit between the visitor's pointer and the
                                textarea itself. Sized down and dimmed in
                                main.scss so they read as quiet shell chrome,
                                not something competing with the text below
                                them while the visitor is actively typing.
                                rows="3", not the old "5" — paired with the
                                textarea's own bigger padding/line-height
                                (main.scss), this reads as a compact modern
                                message field rather than a large blank block;
                                resize: vertical (unchanged) still lets a
                                visitor drag it taller for a long message. */}
                            <div className="message-cassette" ref={cassetteRef}>
                                <div className="message-cassette-reels" aria-hidden="true">
                                    <span className="message-cassette-reel" />
                                    <span className="message-cassette-reel" />
                                </div>
                                <textarea
                                    name="message"
                                    id="message"
                                    rows="3"
                                    maxLength={5000}
                                    value={formData.message}
                                    onChange={handleChange}
                                    disabled={isSending}
                                    required
                                    aria-invalid={Boolean(messageError)}
                                    aria-describedby={messageError ? 'message-error' : undefined}
                                />
                            </div>
                            {messageError && (
                                <p className="field-error" id="message-error" role="alert">{messageError}</p>
                            )}
                        </div>

                        {/* Honeypot — hidden from humans, irresistible to bots.
                            aria-hidden + tabIndex keep it out of the keyboard
                            and screen-reader path so it never traps a real
                            visitor. The server drops anything that fills it. */}
                        <div className="contact-hp" aria-hidden="true">
                            <label htmlFor="website">Leave this field empty</label>
                            <input
                                type="text"
                                name="website"
                                id="website"
                                tabIndex={-1}
                                autoComplete="off"
                                value={formData.website}
                                onChange={handleChange}
                            />
                        </div>

                        {status === 'error' && (
                            <p className="contact-error" role="alert">{errorMessage}</p>
                        )}

                        <button type="submit" className="submit-button" disabled={isSending}>
                            {isSending ? 'Sending…' : 'Send Message'}
                        </button>
                    </form>
                )}

                {/* The flying cassette clone (Phase 1 step 2) — React-owned
                    (see the module comment above for why), positioned by JS
                    right before Flip.from runs. Purely decorative: never the
                    real, functional textarea, which already unmounted with
                    the form the instant status flipped to "sent" (1a). */}
                {flightSlot && (
                    <div
                        className="cassette-flight"
                        ref={flightRef}
                        data-flip-id={CASSETTE_FLIP_ID}
                        style={{ left: flightSlot.left, top: flightSlot.top, width: flightSlot.width, height: flightSlot.height }}
                    />
                )}

                {/* The walkman — persists once shown (walkmanVisible), across
                    both the form and success views, so a second send in the
                    same session animates onto an already-settled device
                    instead of popping one in from scratch again. Rest state
                    is normal in-flow content (main.scss's own comment on
                    .walkman) — free to scroll away from and back to. */}
                {walkmanVisible && <Walkman rootRef={walkmanRootRef} />}

                {status === 'sent' && settled && (
                    <button type="button" className="submit-button" onClick={handleSendAnother}>
                        Send another message
                    </button>
                )}
            </div>
        </section>
    );
}
