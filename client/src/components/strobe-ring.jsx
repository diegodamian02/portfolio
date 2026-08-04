// Pass 5: measured via getBoundingClientRect — the mat and the two dot
// rings ARE perfectly concentric (centers match to sub-pixel precision).
// The reported "eccentricity" was a moire effect — 100 outer dots and 88
// inner dots don't share phase, so at any given angle the visually
// "nearest" dot is sometimes from the outer ring and sometimes the inner,
// making the band's inner edge appear to wander. Fix: both rings use the
// SAME count so every dot pairs with one directly outside it (clean
// spokes, no beat pattern), and the band is narrowed with even clearance
// to the mat (43.5) and platter edge (50) on either side.
const DOT_COUNT = 72;
const OUTER_RADIUS = 48;
const INNER_RADIUS = 45.5;
const DOT_R = 0.55;

function ring(radius, keyPrefix) {
    const dots = [];
    for (let i = 0; i < DOT_COUNT; i++) {
        const angle = (i / DOT_COUNT) * 2 * Math.PI;
        const cx = 50 + radius * Math.cos(angle);
        const cy = 50 + radius * Math.sin(angle);
        dots.push(<circle key={`${keyPrefix}${i}`} cx={cx} cy={cy} r={DOT_R} className="turntable-strobe-dot" />);
    }
    return dots;
}

export default function StrobeRing() {
    return (
        <svg className="turntable-strobe-svg" viewBox="0 0 100 100" aria-hidden="true">
            {ring(OUTER_RADIUS, "o")}
            {ring(INNER_RADIUS, "i")}
        </svg>
    );
}
