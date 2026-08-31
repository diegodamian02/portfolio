import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import '../styles/main.scss';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, SplitText, SIGNATURE_EASE, Flip, WALKMAN_POP_EASE, PIN_SNAP_EASE } from '../lib/gsap.js';
import {
    getActiveLenis, getActiveSnap, isProgrammaticScrollActive, onProgrammaticScrollChange,
    getLastNavTarget, onSectionNavigated,
} from '../lib/scroll.js';
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
// tracing, which nothing here has). DrawSVGPlugin gets its actual first use
// in this file below the Task 1 revision comment (the J-card's name-field
// underline) — still no SVG here worth tracing for the entry reveal itself.
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

// ---- Task 1 revision (2026-08-26) — cassette J-card guestbook note ----
//
// Re-read this whole file fresh per the revision brief's own explicit
// instruction before touching anything, rather than assuming the brief's
// own framing ("styled as a cassette J-card... not the cassette body")
// described a from-scratch build. It doesn't: Task 12's compose box
// already existed as a cassette-styled textarea (`.message-cassette`), it
// just wasn't the WHOLE card — name/email sat above it as a separate boxed
// 2-column row, and a plain `.submit-button` sat below. This revision
// unifies all three into one tall/narrow `.jcard` (below), and makes the
// send fire optimistically.
//
// "Optimistic" here means `runSendSequence` — the walkman takeover — now
// starts the instant client-side validation passes, in the SAME tick as
// the click, not after `await axios.post(...)` resolves like Task 12
// originally had it. The network request is fired separately below and
// handled entirely out of band (`sendFailed`/`sendFailedMessage`): a
// failure can only ever surface AFTER the takeover has already played in
// full, never instead of it and never reversing it, per the brief's own
// explicit requirement. This collapses the send-level state machine from
// `idle | sending | sent | error` down to effectively `idle | sent` —
// there's no longer a "waiting on the network" state worth showing, since
// nothing on screen waits for the network anymore. `status` keeps its name
// and its `data-state` hookup (still mirrors turntable.jsx's own
// `data-deck-state` precedent) but only ever takes those two values now.
//
// Email — dropped by the original revision (a one-way guestbook note, no
// reply mechanism), brought BACK the next day by direct request: an
// entirely anonymous message risks losing a real recruiter lead with no
// way to follow up, which cuts against this whole site's actual purpose.
// Re-added as OPTIONAL, not required — the guestbook's low-friction feel
// stays intact for a visitor who just wants to leave a note, while anyone
// who wants a reply can leave a way to reach them. Styled to match the
// name field exactly (`.jcard-email-*`, main.scss) rather than reintroduced
// as a boxed contact-form input, and validated client-side only when
// non-empty (EMAIL_RE below) — an optional field should never block a send
// for being blank, only for being genuinely malformed.
const EMPTY = { name: '', email: '', message: '', website: '' };

// Deliberately simpler than server.js's own EMAIL_RE — this only gates the
// client-side "does this look malformed" shake, the server is still the
// real authority and re-validates independently.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Auto-grow cap for the message textarea (below) — JS drives the smooth
// height tween up to this, `.jcard-textarea`'s own `max-height` (main.scss)
// takes over with `overflow-y: auto` beyond it so an unusually long message
// still has a hard ceiling rather than growing the card indefinitely.
const MESSAGE_MAX_HEIGHT = 420;

// Same trailing-slash guard as my-taste.jsx: a trailing slash on the env var
// would produce "//api/contact", which Express treats as an unregistered path.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/+$/, '');

// The heading itself IS the confirmation message on a successful send — a
// genuine text transformation of the existing element (ScrambleTextPlugin,
// runSendSequence below), not a second block of copy stacked underneath
// it. Per the brief's own explicit requirement: exactly one message on
// screen after a send, not the original heading left sitting above a
// separate success paragraph (the previous shape, now removed).
const HEADLINE_IDLE = "Let's Connect!";
const HEADLINE_SENT = 'Thank you for reaching out!';

// Reintroduced by direct request after Task 12.2 removed the old
// mailto-fallback description entirely ("i dont need any description box
// under that — its very straightforward"). This is a different paragraph
// with a different job: not an email fallback (there's no email path at
// all anymore, Task 1 revision), just a friendly note before the compose
// box. Shown only alongside the form (see the JSX below) — hidden the
// instant `status === 'sent'`, same as the form itself, so Task 12.3's own
// requirement still holds: exactly one message on screen after a send.
const CONTACT_DESCRIPTION =
    "Thank you for taking the time to view my portfolio, I hope you had fun playing your favorite tunes! Feel free to leave a message.";

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
    const vizBars = walkmanEl.querySelectorAll('.walkman-visualizer-bar');
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
    // Left-window visualizer — its own bar set (walkman.jsx), same
    // repeat:-1/yoyo:true idle shape as the EQ bars above but timed
    // independently (a different random range/duration, staggered from a
    // different starting point) so the two windows don't visibly mirror
    // each other.
    if (vizBars.length) {
        loop.to(vizBars, {
            // Range widened from 0.4-1.8: paired with the shorter resting
            // bar height in main.scss, this is what makes the row read as a
            // spectrum analyser reacting to something rather than a set of
            // blocks breathing in place. The top of the range is bounded by
            // that resting height (26% x 2.4 = 62% of the padded window), so
            // no bar can grow past its own container.
            scaleY: () => gsap.utils.random(0.35, 2.4),
            duration: () => gsap.utils.random(0.4, 0.85),
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            stagger: { each: 0.09, from: 'edges' },
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

export default function Connect() {
    const rootRef = useRef(null);
    const containerRef = useRef(null);
    // titleRef / descriptionRef stay on the OUTER <h2>/<p> (layout position,
    // the role toggle). titleTextRef / descriptionTextRef are on an inner
    // <span> that React only ever renders a constant string into — every
    // DOM-rewriting op (SplitText's entrance surgery, ScrambleTextPlugin on
    // send) points at the inner span so React never holds a stale child
    // record of a node SplitText moved. Splitting the <h2> directly and then
    // PLAYING that ~1.5s reveal on a nav click (rather than snapping it)
    // reopened B56: a concurrent re-render during the play window threw
    // `insertBefore` and blanked the page ~1/15. Same inner-span fix
    // my-taste.jsx's kicker already uses.
    const titleRef = useRef(null);
    const titleTextRef = useRef(null);
    const descriptionRef = useRef(null);
    const descriptionTextRef = useRef(null);
    // The J-card root — Flip flight source (data-flip-id below) AND the
    // thing runSendSequence measures. Was scoped to just `.message-cassette`
    // (the message field alone) before this revision; now the whole card
    // flies, per the brief's own framing ("the card becoming a cassette").
    const cassetteRef = useRef(null);
    const nameInputRef = useRef(null);
    const nameStripRef = useRef(null);
    const nameUnderlineRef = useRef(null);
    const emailInputRef = useRef(null);
    const emailStripRef = useRef(null);
    const emailUnderlineRef = useRef(null);
    const messageRef = useRef(null);
    const messageBodyRef = useRef(null);
    const submitRef = useRef(null);
    const flightRef = useRef(null);
    const walkmanRootRef = useRef(null);
    // Wraps the "send another message" button so its entrance fade+rise
    // (the effect below) animates a plain div's transform — the button's
    // own transform is left free for its :hover scale, and the div carries
    // no CSS transition to fight GSAP's per-frame writes.
    const resetWrapRef = useRef(null);
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
    // idle | sent — see the Task 1 revision comment above for why this no
    // longer carries a "sending" or "error" value. Still gates form-vs-
    // walkman visibility and `data-state`, same as before.
    const [status, setStatus] = useState('idle');
    // Client-side validation errors — never sent, the server's opinion is a
    // separate thing (sendFailed, below). Cleared on any edit to the field
    // it belongs to.
    const [nameError, setNameError] = useState('');
    // Only ever set for a genuinely malformed address (EMAIL_RE) — an
    // EMPTY email is not an error, since the field is optional.
    const [emailError, setEmailError] = useState('');
    const [messageError, setMessageError] = useState('');
    // Set from the fire-and-forget request in handleSubmit's own .catch —
    // entirely separate from the optimistic animation, which has already
    // started (or finished) by the time this can ever become true. Never
    // read by runSendSequence or anything animation-related.
    const [sendFailed, setSendFailed] = useState(false);
    const [sendFailedMessage, setSendFailedMessage] = useState('');
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
            // Split the inner text spans, never the <h2>/<p> themselves — see
            // the titleTextRef comment where the refs are declared. Both spans
            // hold nothing but a constant string, so React never reconciles a
            // child of the node SplitText is rewriting.
            const titleSplit = new SplitText(titleTextRef.current, { type: 'words' });
            // type: "words", not "lines" or "chars" — this is plain prose
            // with no inline element inside it (unlike the old mailto-
            // fallback description this replaced), so there's no risk here,
            // just consistency with titleSplit/formTargets' own granularity.
            const descriptionSplit = new SplitText(descriptionTextRef.current, { type: 'words' });
            // The J-card enters as ONE unit, not a per-field stagger — Task
            // 1's revision made it read as a single physical object (one
            // card, torn edge and all), so animating its three internal
            // pieces in one after another would read as the card
            // assembling itself rather than arriving. `.contact-hp` (the
            // honeypot) is excluded same as before: already invisible
            // (off-screen, aria-hidden), animating it is wasted work.
            const formTargets = gsap.utils.toArray('.contact-form .jcard', rootRef.current);

            // The name/email underlines' rest state — undrawn — has to be
            // set explicitly before anything else touches it (DrawSVGPlugin's
            // own requirement: without an initial gsap.set, the path just
            // renders fully stroked and "draws in on focus" has nothing to
            // draw from). Scoped to this same reduced-motion branch: with
            // no-preference reduced motion, skipping this entirely leaves
            // the underline visibly drawn at rest, which is the correct,
            // simpler result for that visitor (no motion needed either way).
            if (nameUnderlineRef.current) {
                gsap.set(nameUnderlineRef.current, { drawSVG: '0%' });
            }
            if (emailUnderlineRef.current) {
                gsap.set(emailUnderlineRef.current, { drawSVG: '0%' });
            }

            if (formTargets.length === 0) return undefined;

            let holding = false;
            function releaseHold() {
                if (!holding) return;
                holding = false;
                getActiveLenis()?.start();
                // Resume the site-wide section snap, paused on hold engage.
                getActiveSnap()?.start();
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

            // titleSplit.revert() runs HERE unconditionally, not only in this
            // effect's own cleanup (below) — a send can happen long after
            // this reveal finished, and by then the inner title span needs to
            // be plain text again so ScrambleTextPlugin (runSendSequence) has a
            // real string to read/scramble rather than SplitText's own
            // leftover per-word wrapper spans. Wrapping `releaseHold` rather
            // than calling `.revert()` directly on `tl`'s `onComplete` keeps
            // `releaseHold`'s own `holding` guard intact for its OTHER job
            // (undoing the scroll-lock) — this call must fire every time the
            // timeline completes, including the isProgrammaticScrollActive
            // skip below (`tl.progress(1)`), where `releaseHold` itself
            // no-ops because `holding` was never set true.
            const tl = gsap.timeline({
                paused: true,
                onComplete: () => {
                    titleSplit.revert();
                    releaseHold();
                },
            });

            // Same cascade shape as About's own entrance (title -> body ->
            // visual) and the same SIGNATURE_EASE curve every calm, one-time
            // entrance on this site shares. The J-card overlaps the tail of
            // the description rather than waiting a clear beat after it: this
            // is a TWO-COLUMN layout, so a strict title->desc->card sequence
            // left the entire right half of the section empty for ~0.7s after
            // the left column had fully resolved — reads as half-broken on a
            // nav click, where the visitor lands on it all at once rather
            // than scrolling it into view. Overlapping keeps both columns
            // visibly filling in together.
            tl.from(titleSplit.words, { opacity: 0, y: 16, duration: 0.5, ease: SIGNATURE_EASE, stagger: 0.06 }, 0);
            tl.from(descriptionSplit.words, { opacity: 0, y: 12, duration: 0.4, ease: SIGNATURE_EASE, stagger: 0.02 }, '>+=0.15');
            tl.from(formTargets, { opacity: 0, y: 14, duration: 0.4, ease: SIGNATURE_EASE }, '>-=0.4');

            const navbarHeight = () =>
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;

            // One guarded starter, three entry points — same structure as
            // my-taste.jsx (see its longer comment). The `pin: true` +
            // `end: '+=200'` ScrollTrigger this replaced left a pin-spacer
            // that (a) displaced the section ~200px on nav revisits and
            // (b) — once a retirePin() tried to collapse it mid-scroll —
            // made a fresh nav click OVERSHOOT the section entirely, dropping
            // the visitor into the footer with the heading and the top of the
            // J-card scrolled up behind the navbar. No pin now; the hold is
            // lenis.stop() + input blockers, About's mechanism.
            let entranceStarted = false;
            function beginEntrance({ hold, snapTo } = {}) {
                if (entranceStarted) return;
                entranceStarted = true;
                if (hold) {
                    holding = true;
                    const lenis = getActiveLenis();
                    if (lenis) {
                        if (snapTo != null) lenis.scrollTo(snapTo, { immediate: true, force: true });
                        lenis.stop();
                    }
                    getActiveSnap()?.stop();
                    window.addEventListener('touchmove', blockTouchMove, { passive: false, capture: true });
                    window.addEventListener('keydown', blockScrollKeys, { capture: true });
                }
                tl.play();
            }
            function resolveEntrance() {
                if (entranceStarted) return;
                entranceStarted = true;
                tl.progress(1);
            }

            const st = ScrollTrigger.create({
                trigger: rootRef.current,
                // Start line just below where a nav click lands the section
                // (--scroll-offset = navbar + 24), so onEnter fires on an
                // organic downward scroll AND on a nav/deep-link landing that
                // stops at the offset. The organic hold then snaps back to the
                // exact offset, so +32 only needs to be >24.
                start: () => 'top top+=' + (navbarHeight() + 32),
                once: true,
                onEnter: () => {
                    // A nav click / deep link TO this section plays the reveal
                    // (direct request, twice: it should animate in on click,
                    // not just appear). Merely being scrolled through by a nav
                    // aimed elsewhere still snaps — but #connect is the last
                    // section, so in practice `lastNavTarget` is only ever
                    // 'connect' here. The B56 insertBefore crash this play
                    // window used to reopen is now closed structurally: title
                    // and description are split on inner spans React never
                    // reconciles (see the SplitText calls above), so a
                    // concurrent re-render mid-play can't leave React holding a
                    // stale child node. Verified with the b56 stress run.
                    if (isProgrammaticScrollActive()) {
                        if (getLastNavTarget() === 'connect') beginEntrance({ hold: false });
                        else resolveEntrance();
                        return;
                    }

                    // Organic scroll. Safety net: measured against the
                    // CONTAINER's real content height (title + form), not the
                    // outer .contact-section shell, which is deliberately
                    // taller than its content (flex-centered inside a
                    // navbar-aware min-height floor). If the content itself is
                    // taller than the window, play without freezing scroll.
                    const available = window.innerHeight - navbarHeight();
                    const contentHeight = containerRef.current.getBoundingClientRect().height;
                    if (contentHeight > available) {
                        beginEntrance({ hold: false });
                        return;
                    }
                    beginEntrance({ hold: true, snapTo: document.getElementById('connect') });
                },
            });

            // onEnter only fires on a fresh downward crossing. A deep link /
            // nav that resolved before this effect mounted lands the section
            // already past the line — resolve it here (snap, same reasoning as
            // the onEnter programmatic branch above).
            if (rootRef.current.getBoundingClientRect().top < window.innerHeight * 0.9) {
                resolveEntrance();
            }

            // Fires on the nav scroll's own completion. If onEnter already
            // started the reveal mid-scroll this no-ops (entranceStarted); it
            // only does work when onEnter never fired — the section was already
            // past the start line when the nav began — and there a play still
            // reads as a clean arrival, so play rather than snap.
            const unsubNav = onSectionNavigated((id) => {
                if (id === 'connect') beginEntrance({ hold: false });
            });

            // A nav click that starts WHILE the organic hold is running:
            // release it, snapping the timeline only if the visitor is leaving.
            const unsubscribe = onProgrammaticScrollChange((active) => {
                if (active && holding) {
                    if (getLastNavTarget() !== 'connect') tl.progress(1);
                    releaseHold();
                }
            });

            return () => {
                unsubscribe();
                unsubNav();
                releaseHold();
                st.kill();
                tl.kill();
                titleSplit.revert();
                // Only reverted here, unlike titleSplit's own unconditional
                // revert above (tl's onComplete) — nothing later reads this
                // paragraph's plain text (no ScrambleTextPlugin target, no
                // scramble-on-send), so there's no correctness reason to
                // revert it any earlier than normal unmount.
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

    // "Send another message" mounts abruptly the moment the takeover settles
    // (`status === 'sent' && settled`). Fade + rise it in over the takeover's
    // own SIGNATURE_EASE beat so it arrives rather than pops. Runs on the
    // wrapper (see resetWrapRef) so the button's :hover scale stays intact;
    // clearProps so nothing lingers for the next send.
    useEffect(() => {
        if (status !== 'sent' || !settled || prefersReducedMotion) return;
        if (!resetWrapRef.current) return;
        gsap.from(resetWrapRef.current, {
            opacity: 0, y: 8, duration: 0.45, ease: SIGNATURE_EASE, clearProps: 'all',
        });
    }, [status, settled, prefersReducedMotion]);

    // Found empirically, not assumed: with the compose form comfortably
    // centered in view (scrollIntoView({block:'center'}) on the submit
    // button — a completely ordinary amount of scroll, not a contrived
    // edge case), .contact-title lands ENTIRELY behind the fixed navbar
    // once send succeeds (measured live: heading top 73px, bottom 128px,
    // navbar's own bottom edge at 144px — the whole heading box sits
    // inside the navbar's span). That heading is now the ONLY confirmation
    // message on screen (the brief's own requirement) — invisible in the
    // realistic case defeats the point of it existing. Nudges scroll up
    // just enough to clear the navbar, and only when actually needed (a
    // visitor already scrolled such that the heading has room is left
    // alone — this must never fight or override normal scrolling).
    function ensureHeadlineVisible() {
        const navbarHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;
        const MARGIN = 16;
        const rect = titleRef.current.getBoundingClientRect();
        if (rect.top >= navbarHeight + MARGIN) return;

        const targetY = window.scrollY + rect.top - (navbarHeight + MARGIN);
        const lenis = getActiveLenis();
        if (lenis && !prefersReducedMotion) {
            lenis.scrollTo(targetY, { duration: 0.6 });
        } else {
            window.scrollTo({ top: targetY, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
        }
    }

    // The walkman send-success takeover itself. `cassetteFlipState` is
    // `Flip.getState(...)` captured on the REAL J-card a moment ago in
    // handleSubmit, while it was still mounted — real DOM rects, not a
    // hardcoded offset, per the brief's own explicit instruction. Unchanged
    // by the Task 1 revision beyond that: this function doesn't care
    // whether the caller awaited a network response first or not, only
    // that it's handed a real Flip state and called at the right moment —
    // handleSubmit now calls it synchronously, immediately after
    // validation passes, instead of inside a resolved promise.
    function runSendSequence(cassetteFlipState, titleTextBefore) {
        const walkmanEl = walkmanRootRef.current;
        const sectionEl = rootRef.current;
        if (!walkmanEl || !sectionEl) return;

        ensureHeadlineVisible();

        // Kill any previous idle loop FIRST, unconditionally — explicit
        // requirement: a second send in the same session must replace the
        // running EQ/cord loop, never stack a second infinite one on top.
        idleLoopRef.current?.kill();
        idleLoopRef.current = null;
        sequenceTlRef.current?.kill();

        const lidEl = walkmanEl.querySelector('.walkman-lid');
        const litEl = walkmanEl.querySelector('.walkman-screen-lit');

        const vizEl = walkmanEl.querySelector('.walkman-visualizer');

        if (prefersReducedMotion) {
            // Skip straight to the settled end state — no scale-up, no
            // scramble, no infinite loop (the brief's own wording). The
            // flying-cassette clone, if one was mounted for this send, is
            // dropped without ever animating it. The headline swap still
            // happens (it's the confirmation message itself, not a motion
            // flourish) but as a plain text swap, no scramble.
            gsap.set(walkmanEl, { clearProps: 'transform', opacity: 1, scale: 1 });
            if (lidEl) gsap.set(lidEl, { scaleY: 1 });
            if (vizEl) gsap.set(vizEl, { opacity: 1 });
            if (litEl) litEl.textContent = WALKMAN_LCD_TEXT;
            titleTextRef.current.textContent = HEADLINE_SENT;
            setFlightSlot(null);
            setSettled(true);
            return;
        }

        const bayEl = walkmanEl.querySelector('.walkman-bay');
        const hasPoppedIn = hasPoppedInRef.current;
        hasPoppedInRef.current = true;
        setSettled(false);

        // EVERY rect this sequence needs is measured HERE, in one block, while
        // the walkman is still at its natural untransformed rest size — before
        // Phase 0's own `gsap.set(walkmanEl, { scale: 0.5 })` below.
        //
        // The bay's rect used to be read 20 lines further down, AFTER that
        // scale(0.5) had already been applied, which is why the cassette never
        // actually landed in the bay: Flip was being handed a destination box
        // half the real bay's size and offset from it (measured live —
        // destination 108.6x73 against a real bay of 209.1x138), so the
        // cassette flew to a too-small rectangle floating over the front of
        // the device instead of seating into the slot. The whole point of this
        // animation is the message going INTO the walkman, so this is the
        // ordering that matters most in this function; keep all four
        // measurements together and above any gsap.set that transforms the
        // walkman.
        const walkmanRect = walkmanEl.getBoundingClientRect();
        const sectionRect = sectionEl.getBoundingClientRect();
        const bayRect = bayEl ? bayEl.getBoundingClientRect() : null;

        // Capped so the takeover can never overflow .contact-section even at
        // the narrowest currently-supported width (390px, verified live) —
        // measured against the section's OWN box rather than a hardcoded
        // breakpoint number.
        //
        // 1.35, down from 2.3. That 2.3 was tuned against a walkman whose rest
        // width was min(260px, 78%); Task 12.3 nearly doubled that to
        // min(460px, 92%) to make the device the confirmation state's
        // centerpiece, and the old multiplier came along unchanged — so the
        // takeover was scaling a 460px device to 1058px, filling the viewport
        // edge to edge and then shrinking all the way back, the single largest
        // chunk of motion in the sequence and the one that read as least
        // purposeful. At the device's current rest size a gentler step forward
        // (460 -> 621px) reads as emphasis without the balloon-and-deflate —
        // and now without a scrim behind it (removed by direct request).
        const DESIRED_SCALE = 1.35;
        const SAFE_FRACTION = 0.86;
        const maxScaleW = (sectionRect.width * SAFE_FRACTION) / walkmanRect.width;
        const maxScaleH = (sectionRect.height * SAFE_FRACTION) / walkmanRect.height;
        const finalScale = Math.min(DESIRED_SCALE, maxScaleW, maxScaleH);

        const tl = gsap.timeline({ onComplete: () => setSettled(true) });
        sequenceTlRef.current = tl;

        // Every step below is placed at an EXPLICIT absolute time on the
        // timeline, computed from the constants here — no bare `'>'` /
        // `'<'` / `'+='` relative positions anywhere in this sequence.
        //
        // That is not a style preference, it's the fix for the other half of
        // what made this feel broken. `'>'` means "the end of the timeline as
        // it currently stands," and the heading scramble is added at position
        // 0 with a 0.6s duration — so the walkman's pop-in, appended with no
        // position argument at all, silently inherited a 0.6s start, and the
        // cassette flight chained off `'>'` after THAT. Measured live: the
        // form unmounted on click and a large empty cassette rectangle then
        // sat motionless on an otherwise blank section for 1050ms before
        // anything moved. Absolute positions make each beat's timing readable
        // on the page and impossible to shift by accident when a tween's
        // duration changes.
        const POP_DUR = 0.4;
        const FLIGHT_DUR = 0.5;
        // The flight starts BEFORE the pop-in has fully settled (0.35 of 0.4)
        // so the two overlap into one gesture rather than reading as "device
        // appears" then, separately, "cassette moves."
        const flightStart = hasPoppedIn ? 0 : 0.35;
        const canFly = Boolean(cassetteFlipState && bayRect && flightRef.current);
        // When the cassette is seated in the bay — the beat the rest of the
        // sequence hangs off.
        const landed = canFly ? flightStart + FLIGHT_DUR : (hasPoppedIn ? 0 : POP_DUR);
        const LID_DUR = 0.32;
        const lidShut = landed + LID_DUR;

        // The heading itself becomes the confirmation message — a genuine
        // transformation of the SAME element (ScrambleTextPlugin), not a
        // second block of text added below it (the brief's own explicit
        // requirement; .contact-success, the old separate two-paragraph
        // block, is gone). Runs from the very start of the sequence,
        // alongside the walkman's own pop-in/arrival, so the page reads as
        // one coordinated confirmation rather than the heading catching up
        // later. `upperAndLowerCase` (ScrambleTextPlugin's own built-in
        // preset) — this is a real sentence, mixed case and punctuation,
        // not the site's other scrambleText usages (experience.jsx's
        // digit-only year scramble, the walkman LCD's own curated
        // segment-friendly charset), so there's no established charset to
        // reuse here; the plugin's own default preset for prose is the
        // right fit.
        tl.to(titleTextRef.current, {
            scrambleText: { text: HEADLINE_SENT, chars: 'upperAndLowerCase', speed: 0.3 },
            duration: 0.6,
        }, 0);

        // Heading glide — the sent-state layout (main.scss) moves the heading
        // from the compose column to screen centre; without this it teleports
        // there in the same frame the form unmounts. Compare the text box
        // captured pre-reflow (handleSubmit) against where it landed, offset
        // the <h2> back by that delta, and ride it to zero over the takeover's
        // opening beat — measured on the inner span both times so the
        // left→centre align switch doesn't skew the delta. clearProps so no
        // stale transform lingers on an element the scramble/settle also
        // touch. Runs at 0, alongside the scramble and the walkman's arrival.
        if (titleTextBefore && titleRef.current && titleTextRef.current) {
            const after = titleTextRef.current.getBoundingClientRect();
            const dx = (titleTextBefore.left + titleTextBefore.width / 2) - (after.left + after.width / 2);
            const dy = (titleTextBefore.top + titleTextBefore.height / 2) - (after.top + after.height / 2);
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                tl.from(titleRef.current, {
                    x: dx, y: dy, duration: 0.55, ease: SIGNATURE_EASE,
                    clearProps: 'transform',
                }, 0);
            }
        }

        // Phase 0 — reveal. Skipped on any send after the first: the
        // walkman is already visible/settled from a prior send in this
        // session, so this run jumps straight to Phase 1 instead of
        // popping in from scratch a second time, per the brief's own
        // explicit instruction. Runs at 0, alongside the heading scramble
        // above rather than queued behind it.
        if (!hasPoppedIn) {
            gsap.set(walkmanEl, { opacity: 0, scale: 0.5 });
            tl.to(walkmanEl, { opacity: 1, scale: 1, duration: POP_DUR, ease: WALKMAN_POP_EASE }, 0);
        }

        // Phase 1 — arrival.
        // 2. The cassette flies into the bay. Flip.from morphs the OLD,
        //    already-captured cassette state onto `flightRef.current` — a
        //    DIFFERENT element than the one `cassetteFlipState` was captured
        //    from (the real J-card unmounted with the form the instant
        //    status flipped to "sent"), matched purely by the shared
        //    data-flip-id both carry. Confirmed against
        //    node_modules/gsap/Flip.js directly before relying on it: Flip
        //    matches state entries by that id, not by literal node
        //    identity, which is exactly the documented technique for "this
        //    element became that one" rather than "this element moved."
        //    Re-styled to the bay's own rect immediately beforehand so
        //    Flip's own internal getState(targets) call reads THAT as the
        //    target/end position. Flip handles the aspect-ratio change on
        //    its own (Task 1 revision: the source is now the whole tall/
        //    narrow J-card, not the old roughly-square message-only box) —
        //    it's a plain rect morph, nothing here assumes a particular
        //    source shape.
        if (canFly) {
            const flight = flightRef.current;
            flight.style.left = `${bayRect.left - sectionRect.left}px`;
            flight.style.top = `${bayRect.top - sectionRect.top}px`;
            flight.style.width = `${bayRect.width}px`;
            flight.style.height = `${bayRect.height}px`;

            const flip = Flip.from(cassetteFlipState, {
                targets: flight,
                duration: FLIGHT_DUR,
                ease: SIGNATURE_EASE,
            });
            tl.add(flip, flightStart);

            // 2b. The clone dissolves as the lid comes down over it, rather
            //     than being yanked out of the DOM the instant Flip finishes.
            //     .cassette-flight is a SIBLING of .walkman (z-index 7 vs 6 —
            //     it has to be, it's positioned against .contact-section, and
            //     .walkman's own z-index makes the device one stacking unit
            //     that nothing external can be interleaved between), so a
            //     clone still at full opacity would paint on TOP of the lid
            //     closing over it — the cassette sitting in front of the very
            //     door meant to be shutting on it. Cross-fading it out across
            //     the first two thirds of the lid's travel is what sells the
            //     read the whole animation exists for: the tape goes in, the
            //     lid closes, it's inside now. setFlightSlot moves here from
            //     Flip's own onComplete for the same reason.
            tl.to(flight, {
                opacity: 0,
                duration: 0.2,
                ease: 'none',
                onComplete: () => setFlightSlot(null),
            }, landed);
        } else {
            setFlightSlot(null);
        }

        // 3. Lid snaps shut over the landed cassette.
        if (lidEl) {
            tl.to(lidEl, { scaleY: 1, duration: LID_DUR, ease: WALKMAN_POP_EASE }, landed);
        }

        // 4. The walkman steps forward — held until the clone is gone
        //    (landed + 0.2). The clone does NOT scale with the walkman (it
        //    isn't a child of it), so starting the scale-up while it was
        //    still visible pulled the bay out from under a cassette that
        //    stayed exactly where it was — measured live at the old timings,
        //    150ms of the two visibly detaching.
        //
        //    Scale in place — no translate. The sent-state layout
        //    (`.contact-container[data-state="sent"]`, main.scss) already
        //    centres the player under the title, so "step forward" is just a
        //    small grow for emphasis; translating to the section's geometric
        //    centre from here would only shove it up into the heading. There
        //    used to be a dim scrim behind this beat — removed by direct
        //    request ("why does the background change? can we remove that?");
        //    the grow reads fine on its own against the section's real
        //    background. Still a pure transform on a position:static element,
        //    so settling back (step 9) is just `scale: 1`.
        const stepForward = landed + 0.2;
        tl.to(walkmanEl, { scale: finalScale, duration: 0.5, ease: SIGNATURE_EASE }, stepForward);

        // 5b. Left window's bar visualizer fades in as the lid finishes
        //     sealing — before this, that same physical space was showing the
        //     cassette arrive (walkman.jsx's own comment on
        //     .walkman-visualizer has the full reasoning for why it can't
        //     just be visible the whole time).
        if (vizEl) {
            tl.to(vizEl, { opacity: 1, duration: 0.3 }, lidShut - 0.1);
        }

        // 6. EQ bars + cord + the left window's bars — start looping now,
        //    keep running right through settle into indefinite idle (step
        //    10). Nothing later restarts them; this is the only place this
        //    sequence starts them.
        tl.call(() => {
            idleLoopRef.current = startIdleLoop(walkmanEl);
        }, [], lidShut - 0.1);

        // 7. Thank-you line resolves into the LCD screen through the ghost
        //    layer underneath it (walkman.jsx's own ghost/lit stacked pair).
        const LCD_DUR = 0.55;
        const lcdStart = lidShut;
        if (litEl) {
            tl.to(litEl, {
                scrambleText: { text: WALKMAN_LCD_TEXT, chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ', speed: 0.4 },
                duration: LCD_DUR,
            }, lcdStart);
        }

        // Phase 2 — settle. A held beat first so the takeover actually
        // reads as a moment arrived at, not a blur passed through. Measured
        // from the LAST thing to finish (the LCD resolving) rather than from
        // whatever happened to be at the end of the timeline.
        const settleStart = lcdStart + LCD_DUR + 0.3;
        // 9. Walkman scales back to its rest size in its already-centred
        //    in-flow position — clearProps once it lands so nothing about a
        //    future transform on this element (a hover effect, say) inherits
        //    a stale inline value, same discipline My Taste's own cascade
        //    uses for its cards (Task 4).
        tl.to(walkmanEl, {
            scale: 1, duration: 0.5, ease: SIGNATURE_EASE,
            onComplete: () => gsap.set(walkmanEl, { clearProps: 'transform' }),
        }, settleStart);
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (name === 'name' && nameError) setNameError('');
        if (name === 'email' && emailError) setEmailError('');
        if (name === 'message' && messageError) setMessageError('');
    };

    // Focus/blur on the name/email strips — a small lift (translateY), and
    // each field's own underline's DrawSVGPlugin draw-in/out. overwrite:
    // "auto" on every tween here (single-writer rule): tabbing in and
    // immediately back out fires focus then blur in rapid succession, and
    // without it the two tweens would race on the same y/drawSVG properties
    // instead of the second cleanly cutting off the first.
    const handleNameFocus = () => {
        if (prefersReducedMotion) return;
        gsap.to(nameStripRef.current, { y: -2, duration: 0.25, ease: SIGNATURE_EASE, overwrite: 'auto' });
        gsap.to(nameUnderlineRef.current, { drawSVG: '100%', duration: 0.35, ease: SIGNATURE_EASE, overwrite: 'auto' });
    };
    const handleNameBlur = () => {
        if (prefersReducedMotion) return;
        gsap.to(nameStripRef.current, { y: 0, duration: 0.25, ease: SIGNATURE_EASE, overwrite: 'auto' });
        // Only draws back out if the field is still empty — a filled name
        // keeps its line drawn, which doubles as free "this field has
        // content" feedback with no extra state to track.
        if (!formData.name.trim()) {
            gsap.to(nameUnderlineRef.current, { drawSVG: '0%', duration: 0.3, ease: SIGNATURE_EASE, overwrite: 'auto' });
        }
    };

    // Identical shape to handleNameFocus/Blur above (same field treatment,
    // different element) — email being optional doesn't change how it
    // behaves while focused, only whether it's required to have a value.
    const handleEmailFocus = () => {
        if (prefersReducedMotion) return;
        gsap.to(emailStripRef.current, { y: -2, duration: 0.25, ease: SIGNATURE_EASE, overwrite: 'auto' });
        gsap.to(emailUnderlineRef.current, { drawSVG: '100%', duration: 0.35, ease: SIGNATURE_EASE, overwrite: 'auto' });
    };
    const handleEmailBlur = () => {
        if (prefersReducedMotion) return;
        gsap.to(emailStripRef.current, { y: 0, duration: 0.25, ease: SIGNATURE_EASE, overwrite: 'auto' });
        if (!formData.email.trim()) {
            gsap.to(emailUnderlineRef.current, { drawSVG: '0%', duration: 0.3, ease: SIGNATURE_EASE, overwrite: 'auto' });
        }
    };

    const handleMessageFocus = () => {
        if (prefersReducedMotion) return;
        gsap.to(messageBodyRef.current, { y: -2, duration: 0.25, ease: SIGNATURE_EASE, overwrite: 'auto' });
    };
    const handleMessageBlur = () => {
        if (prefersReducedMotion) return;
        gsap.to(messageBodyRef.current, { y: 0, duration: 0.25, ease: SIGNATURE_EASE, overwrite: 'auto' });
    };

    // Auto-grow, not the browser's native snap-resize — the brief's own
    // explicit ask ("subtle micro-motion... so it doesn't just snap-
    // resize"). The measure-then-tween dance below (shrink to `auto` for
    // one synchronous read, then immediately hand back the PREVIOUS
    // explicit height as the tween's own "from") is what keeps this from
    // visibly flashing: everything up to the gsap.to call happens in one
    // JS tick, before the browser paints anything, so the only height the
    // visitor ever sees rendered is the one already on screen and the one
    // the tween eases into — never the momentary `auto` in between.
    // overwrite: "auto" is load-bearing here specifically: fast typing
    // fires this on every keystroke, and without it each keystroke would
    // stack a new tween on top of the last one instead of redirecting it.
    // resize: none in CSS (main.scss) — deliberately dropped the manual
    // drag-resize handle this field used to have (Task 12's own version):
    // it would fight this auto-grow the next time the visitor typed,
    // shrinking a manually-enlarged box back down against their own choice.
    const handleMessageChange = (e) => {
        handleChange(e);
        const el = messageRef.current;
        if (!el) return;
        const previousHeight = el.style.height || `${el.getBoundingClientRect().height}px`;
        el.style.height = 'auto';
        const targetHeight = Math.min(el.scrollHeight, MESSAGE_MAX_HEIGHT);
        el.style.height = previousHeight;
        if (prefersReducedMotion) {
            el.style.height = `${targetHeight}px`;
        } else {
            gsap.to(el, { height: targetHeight, duration: 0.25, ease: SIGNATURE_EASE, overwrite: 'auto' });
        }
    };

    // Tactile press/release on the submit tab — onPointerDown compresses it
    // (a real weight, not a hover color-swap), onPointerUp/onPointerLeave
    // springs it back out using WALKMAN_POP_EASE (lib/gsap.js) rather than a
    // new ease: that's already this file's own "one clear decisive contact"
    // shape (the walkman's pop-in, the lid snapping shut), and reusing it
    // here ties the compose card's own submit motion to the device it's
    // about to feed into — a deliberate continuity choice, not a
    // coincidence. onPointerLeave covers a press that drags off the button
    // before release, so it can never get stuck compressed.
    const handleSubmitPress = () => {
        if (prefersReducedMotion) return;
        gsap.to(submitRef.current, { scale: 0.92, y: 2, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
    };
    const handleSubmitRelease = () => {
        if (prefersReducedMotion) return;
        gsap.to(submitRef.current, { scale: 1, y: 0, duration: 0.35, ease: WALKMAN_POP_EASE, overwrite: 'auto' });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const nameValue = formData.name.trim();
        const emailValue = formData.email.trim();
        const messageValue = formData.message.trim();
        const nameEmpty = !nameValue;
        const messageEmpty = !messageValue;
        // Optional — only invalid when NON-empty and malformed. An empty
        // email is never a validation failure, unlike name/message.
        const emailInvalid = Boolean(emailValue) && !EMAIL_RE.test(emailValue);

        // Name/message/email(if given) all validated client-side now (Task
        // 1 revision — the message alone used to be the only one checked
        // here). Shake/highlight whichever field(s) are invalid rather than
        // showing red text alone, per the brief's own explicit requirement,
        // and move focus to the first invalid field so a keyboard/screen-
        // reader visitor lands somewhere meaningful rather than nowhere.
        if (nameEmpty || emailInvalid || messageEmpty) {
            if (nameEmpty) setNameError('Please add your name.');
            if (emailInvalid) setEmailError("That email address doesn't look right.");
            if (messageEmpty) setMessageError('Please write a message before sending.');
            if (!prefersReducedMotion) {
                // CustomWiggle's "pinSnap" (lib/gsap.js) — built exactly for
                // a relative, net-zero shake (its own comment: the ease
                // returns to precisely 0, safe to drive with "+=N"), the
                // same ease My Taste's own tape-snap already uses. A plain
                // color flash covers the reduced-motion case instead (CSS,
                // driven by aria-invalid below), so nothing here needs a
                // parallel non-motion branch of its own.
                if (nameEmpty) gsap.to(nameStripRef.current, { x: '+=8', duration: 0.4, ease: PIN_SNAP_EASE, overwrite: 'auto' });
                if (emailInvalid) gsap.to(emailStripRef.current, { x: '+=8', duration: 0.4, ease: PIN_SNAP_EASE, overwrite: 'auto' });
                if (messageEmpty) gsap.to(messageBodyRef.current, { x: '+=8', duration: 0.4, ease: PIN_SNAP_EASE, overwrite: 'auto' });
            }
            const firstInvalidRef = nameEmpty ? nameInputRef : emailInvalid ? emailInputRef : messageRef;
            firstInvalidRef.current?.focus();
            return;
        }
        setNameError('');
        setEmailError('');
        setMessageError('');
        // A fresh attempt clears any banner left over from a PRIOR failed
        // send — the brief's own requirement that a new success doesn't
        // leave a stale failure notice sitting on screen.
        setSendFailed(false);

        // Real DOM rect + Flip state, captured on the ACTUAL J-card while
        // it's still mounted — this has to happen before setFormData(EMPTY)
        // below, which unmounts the form (and the card with it) in the same
        // tick via flushSync. Same ordering constraint FINDINGS.md's B45
        // documents for why every measurement here has to run before
        // anything transforms.
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

        // The heading's rendered-text box in the CURRENT (compose) layout —
        // measured on the inner span so it's tight to the glyphs, immune to
        // the left-align → centre-align switch the sent layout brings.
        // runSendSequence rides it from here to its new centred home instead
        // of letting the reflow below teleport it. Same before-flushSync
        // ordering rule as the Flip state above.
        const titleTextBefore = titleTextRef.current
            ? titleTextRef.current.getBoundingClientRect()
            : null;

        // Snapshot the payload before formData resets below. email is sent
        // as-is (possibly '') — server.js treats a blank string the same as
        // absent.
        const payload = { name: nameValue, email: emailValue, message: messageValue, website: formData.website };

        setFormData(EMPTY);
        flushSync(() => {
            setWalkmanVisible(true);
            setFlightSlot(nextFlightSlot);
            setStatus('sent');
        });
        // Fires immediately, synchronously, in the same click — does NOT
        // wait on the request below. The whole point of Task 1's revision:
        // the visitor sees the card become a cassette and the walkman take
        // over the instant they submit, not after a round trip. A failure
        // (caught below) is handled entirely out of band, after the fact —
        // this call is never delayed, reversed, or interrupted by it.
        runSendSequence(cassetteFlipState, titleTextBefore);

        axios.post(`${apiBaseUrl}/api/contact`, payload).catch((error) => {
            // Nothing about the walkman/sequence is touched here — it has
            // already played, in full, by the time this can even run. Only
            // the out-of-band banner (JSX below) reacts to this.
            setSendFailed(true);
            setSendFailedMessage(
                error.response?.data?.error ||
                "That didn't go through — please try again, or email me directly at diegodamiango02@gmail.com."
            );
        });
    };

    // "Send another message" — a FULL reset, not just re-showing the
    // compose box. This deliberately REVERSES Task 12's own original
    // design (which kept the walkman visible/settled across this click on
    // purpose, so a second send would replay only Phase 1 onto an
    // already-landed device rather than popping in from scratch again) —
    // flagged here as a real discrepancy, not silently overwritten: this
    // brief explicitly asks for the walkman to return to hidden and for
    // hasPoppedInRef to reset, so the NEXT send pops it in fresh, same as
    // the very first one. Every loop/tween this feature owns is killed
    // here rather than left to the next `runSendSequence` call, since the
    // walkman is about to unmount entirely (`setWalkmanVisible(false)`) —
    // nothing should still be ticking against an element that's gone.
    const handleSendAnother = () => {
        idleLoopRef.current?.kill();
        idleLoopRef.current = null;
        sequenceTlRef.current?.kill();
        sequenceTlRef.current = null;
        hasPoppedInRef.current = false;

        if (prefersReducedMotion) {
            titleTextRef.current.textContent = HEADLINE_IDLE;
        } else {
            gsap.to(titleTextRef.current, {
                scrambleText: { text: HEADLINE_IDLE, chars: 'upperAndLowerCase', speed: 0.3 },
                duration: 0.5,
            });
        }

        setSettled(false);
        setWalkmanVisible(false);
        setStatus('idle');
        setSendFailed(false);
        setSendFailedMessage('');
    };

    return (
        <section className="contact-section" ref={rootRef}>
            {/* data-state mirrors turntable.jsx's own data-deck-state precedent
                — idle | sent only now (Task 1 revision collapsed the old
                sending/error values, see the module comment above). The
                entry pin/reveal above doesn't read it — that's a one-time
                scroll-entry transition, unrelated to send state. */}
            <div className="contact-container" data-state={status} ref={containerRef}>
                {/* Left column — heading, intro copy, and (if a send fails)
                    the out-of-band failure banner. Split into its own
                    column by direct request ("put the text on the left
                    side and the J cassette on the right side... fit the
                    entire design into one page"): stacked, the card's own
                    height used to add directly on top of the text's, which
                    is why this section needed more than one viewport's
                    worth of height to begin with. Side by side, the
                    section's total height is the TALLER of the two
                    columns, not their sum — the actual fix for "fit into
                    one page," not just a rearrangement. */}
                <div className="contact-copy">
                {/* role="status" only once this IS the confirmation message
                    — .contact-success (the old separate two-paragraph
                    block) is gone, so this heading is now the only
                    accessible confirmation text there is. Not set at rest,
                    where it's a plain heading with no live-region reason. */}
                {/* Inner span is the SplitText / ScrambleText target, never the
                    <h2> itself — React only ever renders a constant string
                    here, so it never reconciles a child of the node GSAP
                    rewrites (B56). The <h2> keeps the ref for layout/role. */}
                <h2 className="contact-title" ref={titleRef} role={status === 'sent' ? 'status' : undefined}>
                    <span className="contact-title-text" ref={titleTextRef}>{HEADLINE_IDLE}</span>
                </h2>

                {/* No separate success block here anymore (.contact-success,
                    "Thanks for reaching out.../I'll get back to you soon.")
                    — the heading above IS the confirmation message now
                    (ScrambleTextPlugin, runSendSequence). Exactly one
                    message on screen after a send, per the brief.

                    This description is a DIFFERENT paragraph from that old
                    one (a friendly note, not an email fallback) and is
                    scoped to the SAME condition as the form below it —
                    hidden the instant a send succeeds, so the "exactly one
                    message on screen" guarantee still holds. */}
                {status !== 'sent' && (
                    <p className="contact-description" ref={descriptionRef}>
                        <span className="contact-description-text" ref={descriptionTextRef}>{CONTACT_DESCRIPTION}</span>
                    </p>
                )}

                {/* Send failure — Task 1 revision. Entirely out of band from
                    the optimistic success animation: by the time a real
                    network failure can arrive here, the takeover has
                    already played in full (or is still playing), never the
                    other way around. Sits above .walkman-stage rather than
                    back inside a form that's already gone by the time this
                    could ever show. */}
                {sendFailed && (
                    <p className="contact-error contact-error-toast" role="alert">
                        {sendFailedMessage}
                        <button
                            type="button"
                            className="contact-error-dismiss"
                            onClick={() => setSendFailed(false)}
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    </p>
                )}
                </div>

                {/* Right column — the J-card while composing, then the
                    walkman takeover once a send succeeds. Both live in the
                    SAME column (never both at once — status flips between
                    them) so switching from one to the other never shifts
                    the text column beside it. */}
                <div className="contact-visual">
                {status !== 'sent' && (
                    <form className="contact-form" onSubmit={handleSubmit} noValidate>
                        {/* The J-card — Task 1's revision, restyled
                            2026-08-27 to read as an actual cassette insert
                            (main.scss's own comment on .jcard has the full
                            reasoning). One tall/narrow physical object — a
                            spine-fold band, a name+email header, message
                            dominating the body, submit tab at the bottom —
                            not three stacked form elements the way Task 12's
                            version had it (a boxed name/email row, a
                            separate message-cassette box, a plain button
                            below). This is also the Flip flight source now
                            (cassetteRef/data-flip-id, runSendSequence) — the
                            WHOLE card becomes the cassette that flies into
                            the walkman's bay, not just the message panel
                            like before. */}
                        <div className="jcard" ref={cassetteRef}>
                            {/* The spine-fold band — a real J-card structural
                                feature (main.scss's own comment on
                                .jcard-spine has the full reasoning), not a
                                decorative pin — replaces the first version's
                                .jcard-tape, which was #my-taste's corkboard
                                language, not a cassette's. */}
                            <div className="jcard-spine" aria-hidden="true" />

                            {/* Name (required) + email (optional) — grouped
                                as one header block (.jcard-header) so they
                                read as a single "from" line, not two of the
                                card's three sections. */}
                            <div className="jcard-header">
                                <div className="jcard-name-strip" ref={nameStripRef}>
                                    <label htmlFor="name">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        id="name"
                                        ref={nameInputRef}
                                        className="jcard-name-input"
                                        maxLength={100}
                                        placeholder="Your name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        onFocus={handleNameFocus}
                                        onBlur={handleNameBlur}
                                        required
                                        aria-invalid={Boolean(nameError)}
                                        aria-describedby={nameError ? 'name-error' : undefined}
                                    />
                                    {/* Hand-drawn-style underline instead of a
                                        boxed input — DrawSVGPlugin draws it in on
                                        focus (handleNameFocus above), out again
                                        on blur only if the field is still empty.
                                        viewBox is intentionally non-square (100 x
                                        4) so the dash pattern stretches evenly
                                        across the strip's real width regardless
                                        of the card's own responsive size. */}
                                    <svg className="jcard-name-underline" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                                        {/* A gentle wobble (quadratic curve), not a
                                            straight line — "hand-drawn-style," per
                                            the brief. vector-effect keeps the
                                            stroke a constant on-screen thickness
                                            despite preserveAspectRatio="none"
                                            stretching this non-uniformly. */}
                                        <path ref={nameUnderlineRef} d="M0 2.5 Q 25 0.5 50 2.5 T 100 2" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                </div>
                                {nameError && (
                                    <p className="field-error" id="name-error" role="alert">{nameError}</p>
                                )}

                                {/* Email — brought back optional, by direct
                                    request, after the original revision
                                    dropped it: an anonymous-only guestbook
                                    risks losing a real lead with no way to
                                    reply. "(optional)" sits right in the
                                    label so nobody reads this as a second
                                    required field and hesitates to send at
                                    all — same visual treatment as name
                                    (.jcard-email-*, main.scss), not a boxed
                                    contact-form input. */}
                                <div className="jcard-email-strip" ref={emailStripRef}>
                                    <label htmlFor="email">
                                        Email <span className="jcard-email-optional-tag">(optional)</span>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        ref={emailInputRef}
                                        className="jcard-email-input"
                                        maxLength={254}
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onFocus={handleEmailFocus}
                                        onBlur={handleEmailBlur}
                                        aria-invalid={Boolean(emailError)}
                                        aria-describedby={emailError ? 'email-error' : undefined}
                                    />
                                    <svg className="jcard-email-underline" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                                        <path ref={emailUnderlineRef} d="M0 2.5 Q 25 0.5 50 2.5 T 100 2" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                </div>
                                {emailError && (
                                    <p className="field-error" id="email-error" role="alert">{emailError}</p>
                                )}
                            </div>

                            {/* Main body — dominates the card's own vertical
                                space, the way a tracklist panel dominates a
                                real J-card. The reel-window decoration is the
                                same markup/logic Task 12's .message-cassette
                                already had, just relocated/renamed
                                (.jcard-reels/.jcard-reel, main.scss) — this
                                part isn't new. */}
                            <div className="jcard-message-body" ref={messageBodyRef}>
                                <div className="jcard-reels" aria-hidden="true">
                                    <span className="jcard-reel" />
                                    <span className="jcard-reel" />
                                </div>
                                <label htmlFor="message" className="jcard-message-label">Message</label>
                                <textarea
                                    name="message"
                                    id="message"
                                    ref={messageRef}
                                    className="jcard-textarea"
                                    rows="6"
                                    maxLength={5000}
                                    placeholder="Write something…"
                                    value={formData.message}
                                    onChange={handleMessageChange}
                                    onFocus={handleMessageFocus}
                                    onBlur={handleMessageBlur}
                                    required
                                    aria-invalid={Boolean(messageError)}
                                    aria-describedby={messageError ? 'message-error' : undefined}
                                />
                            </div>
                            {messageError && (
                                <p className="field-error" id="message-error" role="alert">{messageError}</p>
                            )}

                            {/* Submit — a cassette-tab/record-button, not a
                                generic rectangle (.jcard-submit, main.scss,
                                reuses .turntable-start-button's own inset-
                                shadow "recessed physical control"
                                convention). Press/release handled by GSAP
                                above (handleSubmitPress/Release), not a CSS
                                hover swap — a real pressed/released feel per
                                the brief's own explicit ask. Text is
                                unconditional now ("Send Message") — the old
                                "Sending…" branch depended on a waiting state
                                that no longer exists (the form unmounts
                                synchronously the instant a valid submit
                                clears validation, so there's nothing left to
                                show a mid-flight label for). */}
                            <div className="jcard-tab-row">
                                <button
                                    type="submit"
                                    className="jcard-submit"
                                    ref={submitRef}
                                    onPointerDown={handleSubmitPress}
                                    onPointerUp={handleSubmitRelease}
                                    onPointerLeave={handleSubmitRelease}
                                >
                                    {/* A small flat cassette glyph (body +
                                        two reels + tape window) — replaces
                                        the first version's plain accent dot,
                                        by direct request to fit the design
                                        rather than read as a generic record
                                        button. Same flat-shape, no-icon-
                                        library convention walkman.jsx's own
                                        SVG parts use. */}
                                    <svg className="jcard-submit-icon" viewBox="0 0 20 14" aria-hidden="true" focusable="false">
                                        <rect className="jcard-submit-icon-body" x="1" y="1" width="18" height="12" rx="2" />
                                        <rect className="jcard-submit-icon-window" x="8.6" y="6.2" width="2.8" height="1.6" />
                                        <circle className="jcard-submit-icon-reel" cx="6.5" cy="7" r="2" />
                                        <circle className="jcard-submit-icon-reel" cx="13.5" cy="7" r="2" />
                                    </svg>
                                    Send Message
                                </button>
                            </div>
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
                    </form>
                )}

                {/* The walkman — mounted only while walkmanVisible, unlike
                    Task 12's own original design (which kept it mounted
                    permanently once shown). This brief explicitly asks for
                    "send another message" to return the walkman to hidden,
                    a real reversal handled in handleSendAnother — flagged
                    there, not silently changed. Rest state is normal
                    in-flow content (main.scss's own comment on .walkman) —
                    free to scroll away from and back to while it's up.
                    The reset button lives in the SAME wrapper as the
                    walkman (not floating separately below it) so the two
                    read as one unit — "the next action," not an orphaned
                    link underneath unrelated content. */}
                {walkmanVisible && (
                    <div className="walkman-stage">
                        <Walkman rootRef={walkmanRootRef} />
                        {status === 'sent' && settled && (
                            <div className="walkman-reset-wrap" ref={resetWrapRef}>
                                <button type="button" className="walkman-reset-button" onClick={handleSendAnother}>
                                    Send another message
                                </button>
                            </div>
                        )}
                    </div>
                )}
                </div>

                {/* The flying cassette clone (Phase 1 step 2) — React-owned
                    (see the module comment above for why), positioned by JS
                    right before Flip.from runs. Purely decorative: never the
                    real, functional J-card, which already unmounted with
                    the form the instant status flipped to "sent" (1a). Kept
                    as a plain rounded-rect paper card (not a full torn-edge/
                    tape replica of the real card) — it's a functional
                    geometry proxy for the Flip morph, not a visual replica;
                    the morph itself is what sells the shape change.
                    Deliberately OUTSIDE .contact-visual, as a direct child
                    of .contact-container instead: it's positioned in
                    absolute px against .contact-section (main.scss), never
                    relative to either column, so which column nests it in
                    the DOM makes no visual difference — kept as a sibling
                    of both rather than inside the one it happens to fly
                    out of. */}
                {flightSlot && (
                    <div
                        className="cassette-flight"
                        ref={flightRef}
                        data-flip-id={CASSETTE_FLIP_ID}
                        style={{ left: flightSlot.left, top: flightSlot.top, width: flightSlot.width, height: flightSlot.height }}
                    />
                )}
            </div>
        </section>
    );
}
