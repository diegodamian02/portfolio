// A deterministic "pressing colour" per card — Stage 11 Phase 2.
//
// Same idea, and the same hash, as `colorwayFor` (vinyl-record.jsx) picking a
// vinyl pressing for a track: an artist card or a project card always lands on
// the same one of five hues across reloads and theme switches, so the section
// reads as a consistent set rather than a random one on every visit. Salted
// with its own purpose string (see `hash32` / `seeded01` in hash.js) so a
// track that also has a vinyl colourway does not get the two locked together.
//
// The five hues themselves are `--wax-1..5` in main.scss (oxblood, amber,
// midnight, forest, plum) — drawn from the record-store world the rest of the
// site already lives in, not invented here. This module only picks the index;
// the CSS owns what each index looks like and how strongly it tints per theme.
import { hash32 } from "./hash.js";

export const WAX_COUNT = 5;

/**
 * '4x8k2...' -> 1..5. `% WAX_COUNT` cannot go negative — hash32's final step
 * already coerces to an unsigned 32-bit value (the same reason colorwayFor
 * relies on it). `+ 1` so the result indexes `--wax-1..5` directly.
 */
export function cardHueFor(id) {
    return (hash32(`${id}:card-hue`) % WAX_COUNT) + 1;
}
