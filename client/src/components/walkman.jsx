// A left-to-right sweep across the five --viz-neon-N tokens (main.scss),
// NOT colorwayFor() — a deliberate replacement, flagged rather than left
// silent. colorwayFor() is a HASH: it scatters colours across the row at
// random, which is what you want for record pressings (a song should
// always arrive on the same, arbitrary-looking pressing) and exactly what
// you don't want for a spectrum analyser, where the colours reading as an
// ordered ramp is the whole visual idiom. The vinyl palette itself was
// also wrong here for a second, simpler reason — see --viz-neon-N's own
// comment in main.scss: two of the five pressings are darker than the
// walkman's case, so those bars read as holes rather than light.
//
// `count - 1` in the denominator so the ramp spans the full 1..5 range
// endpoint to endpoint regardless of how many bars a row has; guarded for
// count === 1, where the division would be 0/0.
function neonRamp(index, count) {
    if (count <= 1) return 1;
    return 1 + Math.round((index / (count - 1)) * 4);
}

// The send-success takeover's own prop — Stage 3 Task 11.2's follow-up.
// Purely presentational: every part GSAP touches is reached by class name
// off `rootRef` (connect.jsx queries `.walkman-*` the same way Portfolio/My
// Taste/Experience already reach their own sub-elements — gsap.utils.toArray
// / querySelector off one root ref, not a forwardRef/useImperativeHandle
// pair per part, which has no precedent anywhere else in this codebase).
// No internal state, no internal GSAP — every animation lives in
// connect.jsx's own sequence effect, this file only draws the shapes.
//
// Built as flat HTML+SVG layers, not one monolithic SVG with embedded
// <foreignObject> text: the LCD screen and EQ bars are real DOM text/divs
// absolutely positioned over a plain SVG body, so the self-hosted DSEG7
// font and ScrambleTextPlugin (both DOM-text mechanisms) apply normally,
// without foreignObject's own cross-browser text-rendering quirks.
//
// Coordinates below are percentages of the walkman's own rendered box,
// derived from a 220x140 reference viewBox (the SVG body's own
// coordinate space) — a future redraw of walkman-body's shapes should
// recompute these against the same box, not eyeball new ones.
//
// The EQ row under the LCD. Recoloured onto the neon ramp along with the
// left window's visualizer below — the ask named "the waveform bar," i.e.
// the left window, but these two rows are the same visual family sitting
// 20px apart on one device, and leaving this one on the old vinyl palette
// while the other went neon would read as an oversight rather than a
// choice. Flagged as slightly wider than the literal ask.
const EQ_BAR_COUNT = 5;
const EQ_BARS = Array.from({ length: EQ_BAR_COUNT }, (_, i) => ({
    id: `eq-bar-${i}`,
    neon: neonRamp(i, EQ_BAR_COUNT),
}));

// The left window's own bar visualizer — was a plain empty rect (the
// cassette bay's own backdrop, still IS that during Phase 1's arrival;
// see .walkman-visualizer's own comment in main.scss for how the two
// share that space without conflicting).
//
// 8 bars, up from 6: measured against the window's real box (209x138 at
// the walkman's own rest width), 6 flex:1 bars came out ~30px wide against
// a ~41px resting height — near-square blocks, which is why the row read
// as coloured tiles rather than a waveform. 8 bars in the same box are
// ~20px wide against a taller resting height (main.scss), a ratio that
// actually reads as bars.
const VIZ_BAR_COUNT = 8;
const VIZ_BARS = Array.from({ length: VIZ_BAR_COUNT }, (_, i) => ({
    id: `viz-bar-${i}`,
    neon: neonRamp(i, VIZ_BAR_COUNT),
}));

// "ALL DONE" — the second copy change here, and the second time this
// comment has had to be corrected against a real screenshot rather than a
// theory. "CHEERS!" (the previous choice) was reported back as rendering
// GARBLED ("ehEEr98") — investigated before touching this string again:
// the underlying DOM text was verified correct and stable the entire time
// (sampled .textContent every 100ms through a full send — it resolved to
// exactly "CHEERS!" and never changed again), so this was never a
// scramble/charset/timing bug. It's a font characteristic of DSEG7
// Classic itself: a true 7-segment display can't form a full-height
// capital B, C, D, H, N, R (etc.) without it colliding with a digit
// (capital B looks like 8, capital D looks like 0), so the font
// substitutes smaller, differently-shaped "lowercase-style" glyphs for
// those letters specifically — by design, not a bug in this font. Only a
// handful of letters (A, E, F, G, L, O among them) get real full-height
// capital forms. Confirmed by rendering the full alphabet at this exact
// size and screenshotting it in chunks: "CHEERS!" opens with two of the
// worst offenders back to back (C, then H), which is why it read as
// garbage at a glance — swapping the word doesn't fix the font, it just
// avoids stacking bad glyphs together. "ALL DONE" mostly uses the clean
// set (A, L, L, O, E) with only "d"/"n" in their small styled form, which
// stayed legible in context in a real screenshot before this was picked.
// The FULL original copy still renders as normal, fully accessible text
// elsewhere in #connect (the heading itself, post-send — connect.jsx) —
// this is an added decorative confirmation on the device, not a
// replacement for the readable one.
export const WALKMAN_LCD_TEXT = "ALL DONE";

// No propTypes convention/dependency in this codebase (same precedent as
// turntable.jsx's `track` prop) — one line-disable for `rootRef`, a plain
// ref object passed straight through from connect.jsx.
// eslint-disable-next-line react/prop-types
export default function Walkman({ rootRef }) {
    // Ghost layer: every non-space character becomes '8' (7-segment's own
    // "all segments lit" glyph), spaces stay spaces — same shape as the lit
    // string so the two layers line up character-for-character, matching a
    // real calculator's always-present "unlit 8" backdrop under whatever
    // digits are actually showing.
    const ghostText = WALKMAN_LCD_TEXT.replace(/\S/g, "8");

    return (
        <div className="walkman" ref={rootRef} aria-hidden="true">
            <svg className="walkman-body" viewBox="0 0 220 140" preserveAspectRatio="xMidYMid meet" focusable="false">
                <rect className="walkman-body-case" x="6" y="6" width="208" height="128" rx="16" />
                {/* Cassette bay well — sits BEHIND .walkman-bay/.walkman-lid (the
                    real DOM elements GSAP/Flip target), drawn here only so the
                    bay reads as a recessed compartment even before anything
                    has landed in it. */}
                <rect className="walkman-body-well" x="18" y="18" width="100" height="66" rx="6" />
                {/* Screen bezel — the real .walkman-screen div sits on top,
                    positioned to this same rect. */}
                <rect className="walkman-body-bezel" x="126" y="16" width="84" height="38" rx="4" />
                {/* Button row — decorative only, three flat glyphs (play triangle,
                    pause bars, stop square), same hand-drawn-shape convention
                    About's own icon set uses (stroke/fill, no library). */}
                <g className="walkman-buttons">
                    <rect x="18" y="94" width="30" height="20" rx="4" />
                    <path d="M28 100.5 L28 107.5 L36 104 Z" className="walkman-button-glyph" />
                    <rect x="54" y="94" width="30" height="20" rx="4" />
                    <rect x="61" y="100" width="4" height="8" className="walkman-button-glyph" />
                    <rect x="69" y="100" width="4" height="8" className="walkman-button-glyph" />
                    <rect x="90" y="94" width="30" height="20" rx="4" />
                    <rect x="99" y="100" width="12" height="8" className="walkman-button-glyph" />
                </g>
            </svg>

            {/* The cassette bay's own well + lid — real DOM elements (not SVG),
                positioned by percentage over walkman-body-well above. The bay
                is the Flip landing target (connect.jsx measures its real rect,
                no hardcoded offsets); the lid starts open (scaleY near 0,
                hinged at its top edge) and CustomBounce-snaps shut once the
                cassette settles into the bay. */}
            <div className="walkman-bay" />
            <div className="walkman-lid" />

            {/* The left window's bar visualizer — sits in the exact same box
                as .walkman-bay/.walkman-lid above it in paint order (DOM
                order alone puts it on top, no z-index needed), hidden
                (opacity: 0) until connect.jsx reveals it right after the lid
                snaps shut. Before that reveal it stays invisible on purpose:
                Phase 1 still needs that same physical space to show the
                cassette landing and the lid closing over it, and a lit-up
                visualizer showing through mid-animation would fight that
                moment rather than follow it. */}
            <div className="walkman-visualizer" aria-hidden="true">
                {VIZ_BARS.map((bar) => (
                    <span
                        key={bar.id}
                        className="walkman-visualizer-bar"
                        style={{ "--viz-bar-color": `var(--viz-neon-${bar.neon})` }}
                    />
                ))}
            </div>

            {/* LCD screen — ghost (dim, always-on "8" pattern) layer behind,
                lit (real message, ScrambleTextPlugin target) layer on top,
                stacked via CSS grid so both occupy the exact same box. */}
            <div className="walkman-screen">
                <div className="walkman-screen-ghost" aria-hidden="true">{ghostText}</div>
                <div className="walkman-screen-lit" />
            </div>

            {/* EQ bars — idle-looping height oscillation once the takeover
                settles (connect.jsx), staggered per bar. */}
            <div className="walkman-eq">
                {EQ_BARS.map((bar) => (
                    <span
                        key={bar.id}
                        className="walkman-eq-bar"
                        style={{ "--eq-bar-color": `var(--viz-neon-${bar.neon})` }}
                    />
                ))}
            </div>

            {/* Cord — a simple curve from the case's top edge out to a plug,
                wiggled via a small looping rotation around its own anchor
                point (connect.jsx), not MorphSVGPlugin (not part of this
                project's registered plugin set — lib/gsap.js). */}
            <svg className="walkman-cord" viewBox="0 0 60 70" preserveAspectRatio="none" focusable="false">
                <path className="walkman-cord-path" d="M4 4 C 30 10, 6 30, 26 40 S 44 62, 40 68" />
                <circle className="walkman-cord-plug" cx="40" cy="68" r="5" />
            </svg>
        </div>
    );
}
