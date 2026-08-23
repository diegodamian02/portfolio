import { colorwayFor } from "./vinyl-record.jsx";

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
// EQ bar colours come from colorwayFor() (the SAME deterministic
// id -> --vinyl-N mapping the turntable/My Taste already use for
// pressings/photos), per the brief's own instruction not to hardcode
// them — salted per bar index so the 5 bars don't collapse onto one
// repeated colour by chance the way an unsalted hash could.
const EQ_BAR_COUNT = 5;
const EQ_BARS = Array.from({ length: EQ_BAR_COUNT }, (_, i) => ({
    id: `eq-bar-${i}`,
    colorway: colorwayFor(`walkman-eq-${i}`),
}));

// "CHEERS!" — not the requested "thank you for reaching out!" verbatim.
// Two independent constraints, both checked live with real screenshots
// before picking this, not assumed: (1) size — the LCD box/font-size
// (main.scss) were tuned against "MESSAGE SENT" (12 characters); the
// requested sentence is 27, clips badly at the same scale, and shrinking
// the font enough to fit it renders it unreadable, not just small; (2)
// DSEG7 Classic's glyph shapes — T, N and K in particular render as
// distorted, hard-to-read forms at this size (confirmed by rendering
// "THANK YOU!" and "THANKS" and screenshotting both: neither reads as
// English at a glance). "CHEERS!" still says thank you, and its letters
// (C H E E R S) avoid all three of those glyphs entirely — screenshotted
// and confirmed legible before committing. The FULL original copy still
// renders as normal, fully accessible text in .contact-success itself
// (connect.jsx) — this is an added decorative confirmation on the device,
// not a replacement for the readable one.
export const WALKMAN_LCD_TEXT = "CHEERS!";

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
                        style={{ "--eq-bar-color": `var(--vinyl-${bar.colorway})` }}
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
