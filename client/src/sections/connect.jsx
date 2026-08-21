import { useState, useRef } from 'react';
import '../styles/main.scss';
import axios from 'axios';
import { useGSAP } from '@gsap/react';
import { gsap, ScrollTrigger, SplitText, SIGNATURE_EASE } from '../lib/gsap.js';
import { getActiveLenis, isProgrammaticScrollActive, onProgrammaticScrollChange } from '../lib/scroll.js';

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

// Same trailing-slash guard as my-taste.jsx: a trailing slash on the env var
// would produce "//api/contact", which Express treats as an unregistered path.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/+$/, '');

const EMPTY = { name: '', email: '', message: '', website: '' };

export default function Connect() {
    const rootRef = useRef(null);
    const containerRef = useRef(null);
    const titleRef = useRef(null);
    const descriptionRef = useRef(null);
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

    // The entry-hold pin + reveal — plays once, on first scroll into the
    // section, then releases for good (Task 3 builds on "free scroll both
    // ways" after this point, so nothing here may hold scroll a second
    // time). Runs unconditionally under `(prefers-reduced-motion:
    // no-preference)` only, same single-branch gating as About/My Taste —
    // unlike those two, nothing here needs a matching reduced-motion branch
    // to correct a pre-hidden rest state: nothing is hidden by CSS by
    // default (no mask element, no data-driven per-card transform), so a
    // reduced-motion visitor who never enters this matchMedia branch simply
    // sees the section's real, unaltered DOM — already exactly right,
    // without a line of extra code for it.
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
            setStatus('sent');
            setFormData(EMPTY);
        } catch (error) {
            // The server sends a visitor-safe string for the cases it can
            // anticipate (validation, rate limit, SMTP down); anything else
            // falls back to a generic line rather than surfacing an axios dump.
            setErrorMessage(
                error.response?.data?.error ||
                "Something went wrong sending that. Please try again, or email me directly at diegodamiango02@gmail.com."
            );
            setStatus('error');
        }
    };

    const isSending = status === 'sending';

    return (
        <section className="contact-section" ref={rootRef}>
            {/* data-state mirrors turntable.jsx's own data-deck-state precedent
                — the full idle/sending/sent/error machine, not just a single
                hardcoded "sent" flag, so a future send-state animation pass
                has every state to hook into, not only the success one. The
                entry pin/reveal below doesn't read it — that's a one-time
                scroll-entry transition, unrelated to send state. */}
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
                        <button type="button" className="submit-button" onClick={() => setStatus('idle')}>
                            Send another
                        </button>
                    </div>
                ) : (
                    <form className="contact-form" onSubmit={handleSubmit} noValidate>
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
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea
                                name="message"
                                id="message"
                                rows="5"
                                maxLength={5000}
                                value={formData.message}
                                onChange={handleChange}
                                disabled={isSending}
                                required
                                aria-invalid={Boolean(messageError)}
                                aria-describedby={messageError ? 'message-error' : undefined}
                            />
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
            </div>
        </section>
    );
}
