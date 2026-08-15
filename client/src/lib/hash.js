// Shared deterministic string hash — extracted from vinyl-record.jsx's
// colorwayFor (Stage 1) so Stage 4 Task 2's card rotation/jitter can reuse
// the exact same mixing algorithm ("same hashing approach already used for
// vinyl colorway — reuse the pattern" per the Task 2 brief) instead of a
// second, copy-pasted implementation that could quietly drift from this one.
// colorwayFor itself still lives in and is exported from vinyl-record.jsx
// (Task 1's own explicit instruction) — only the underlying bit-mixing moved,
// its behavior is unchanged (re-verified: same ids still produce the same
// colorway numbers after this refactor).
//
// Deterministic, never random, by design — a card (or a vinyl pressing) must
// land on the same output across re-renders, theme switches and reloads.
// Hashes the string's characters rather than parsing it as a number: ids are
// sometimes numeric (iTunes trackIds) and sometimes not (Spotify's), and a
// character hash works for both without a type check.
export function hash32(str) {
    const s = String(str ?? "");
    let n = 0;
    for (let i = 0; i < s.length; i++) {
        n = (Math.imul(n, 31) + s.charCodeAt(i)) >>> 0;
    }
    // Final avalanche so the low bits aren't dominated by the last character
    // — iTunes trackIds are allocated in runs and share low-order structure,
    // which without this step clustered a real sample of five tracks onto
    // colourways 5, 5, 5, 3, 4. Every step re-coerces with >>> 0: JS bitwise
    // ops return SIGNED 32-bit ints, so a bare `n ^= n >>> 13` flips negative
    // above 2^31, and a caller doing `n % N` on that yields a negative index.
    n = (n ^ (n >>> 15)) >>> 0;
    n = Math.imul(n, 0x2545f491) >>> 0;
    n = (n ^ (n >>> 13)) >>> 0;
    return n;
}

// A [0, 1) float derived from id + a purpose-specific salt. Salting (not
// re-hashing the bare id twice) is what lets one id drive several
// independent-looking values — rotation angle, sign, jitter X, jitter Y,
// which torn-edge preset — without them collapsing onto the same number or
// being trivially correlated with each other.
export function seeded01(id, salt) {
    return hash32(`${id}:${salt}`) / 0xffffffff;
}
