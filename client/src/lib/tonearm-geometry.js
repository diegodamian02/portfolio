// Tonearm geometry. Its own module rather than exports from turntable.jsx —
// a file that exports both a component and helpers breaks react-refresh, and
// Phase 8's scratch needs to import these directly.

// Where on the record the stylus should sit, as a fraction of the record's
// rendered radius.
export const RADIUS_OUTER_GROOVE = 0.95;

// The inner limit is a GEOMETRIC constraint, not a stylistic choice. Sweeping
// the rotation and measuring shows the stylus radius bottoms out at ~39.3% and
// then travels back OUT as the angle keeps increasing — the pivot arm simply
// cannot reach closer to the spindle than that. 0.42 sits safely inside the
// reachable range.
//
// This matters for Phase 8: an earlier 0.35 here was unreachable, and because
// the radius-vs-angle curve is NOT monotonic, a naive solve for 35% returns a
// nonsense angle on the far side of the minimum rather than failing.
export const RADIUS_INNER_GROOVE = 0.42;
export const RADIUS_MIN_REACHABLE = 0.393;

// Fallback if the geometry can't be measured (record not yet rendered).
// Measured to land at ~94% of the record radius at 1440px. It replaces 6.5°,
// which put the stylus at ~145% — well off the disc, and swung the arm away
// from the record rather than onto it.
export const ARM_OUTER_GROOVE_FALLBACK = 25;

export function currentRotationDeg(el) {
    const t = getComputedStyle(el).transform;
    if (!t || t === "none") return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const [a, b] = m[1].split(",").map(Number);
    return (Math.atan2(b, a) * 180) / Math.PI;
}

// Angle at the pivot, by the law of cosines, for a stylus sitting `r` from the
// record's centre. Sides: L = pivot→stylus (rigid), d = pivot→centre (fixed),
// r = centre→stylus.
//
//     cos θ = (L² + d² − r²) / (2·L·d)
//
// Since r² = L² + d² − 2Ld·cos θ, a smaller θ gives a smaller r.
//
// NOTE the ROTOR direction, which runs the opposite way and was the original
// bug: this pivot sits outboard of the platter, so INCREASING the CSS rotation
// swings the stylus INWARD. Verified by sweeping the rotation and measuring:
// 30° -> 81.9% of the record radius, 25° -> 94.4%, 20.5° (rest) -> ~107% (just
// off the edge, as a parked arm should be), 6.5° -> ~145%. Hence the minus sign
// when the pivot-angle delta is converted back into a rotor angle.
export function pivotAngleDeg(L, d, r) {
    const cos = (L * L + d * d - r * r) / (2 * L * d);
    return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/**
 * Solves for the rotor rotation that places the stylus at `fraction` of the
 * record's radius, from the CURRENT rendered geometry.
 *
 * This has to be computed rather than hardcoded. The deck scales with the
 * viewport while a fixed degree value does not, so one constant can only ever be
 * correct at a single size — measured, the old 6.5° put the stylus at 104.4% of
 * the record radius at 1440px and 110.7% at 480px, i.e. off the record at every
 * breakpoint and worst at the smallest.
 *
 * L and d are rigid-body constants, so this is valid at any arm position: it
 * reads the current angle, works out how far the pivot angle must change, and
 * applies that delta.
 */
export function armAngleForRadius(rotorEl, needleEl, recordEl, platterEl, fraction) {
    if (!rotorEl || !needleEl || !recordEl || !platterEl) return null;

    const nb = needleEl.getBoundingClientRect();
    const pb = platterEl.getBoundingClientRect();
    const rr = rotorEl.getBoundingClientRect();

    const stylus = { x: nb.left + nb.width / 2, y: nb.top + nb.height / 2 };
    // Centre comes from the PLATTER, not the record: the record is mid-drop when
    // this runs and its own rect is translated, while the platter never moves.
    const centre = { x: pb.left + pb.width / 2, y: pb.top + pb.height / 2 };
    // transform-origin is `top center`.
    const pivot = { x: rr.left + rr.width / 2, y: rr.top };

    const L = Math.hypot(stylus.x - pivot.x, stylus.y - pivot.y);
    const d = Math.hypot(pivot.x - centre.x, pivot.y - centre.y);
    const rNow = Math.hypot(stylus.x - centre.x, stylus.y - centre.y);
    // offsetWidth, NOT getBoundingClientRect: the record is a square element
    // inside the spinning group, so its bounding box grows by up to √2 as it
    // rotates. offsetWidth is the layout box and ignores transforms entirely.
    const recordRadius = recordEl.offsetWidth / 2;

    if (!L || !d || !recordRadius) return null;

    const thetaNow = pivotAngleDeg(L, d, rNow);
    const thetaTarget = pivotAngleDeg(L, d, recordRadius * fraction);
    if (!Number.isFinite(thetaNow) || !Number.isFinite(thetaTarget)) return null;

    return currentRotationDeg(rotorEl) - (thetaTarget - thetaNow);
}

