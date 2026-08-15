# `#my-taste` concept — the festival-lineup poster

**Written:** 2026-08-15, during Stage 4 Task 2. **This file did not exist when Task 2's
brief pointed here** — the brief assumed it had already been written (by the separate
design-research chat this project normally uses for concept work, per this project's own
memory of that workflow), but it was never saved to disk. Flagged rather than guessed
around: Task 2 proceeded anyway using the substantial inline detail its own brief already
carried, and this file is being written now, from Task 1 + Task 2's briefs and what
actually got built, so Tasks 3–5 have a real reference instead of hitting the same gap.
If an earlier, richer version of this concept exists somewhere outside this repo, treat
*that* as authoritative and reconcile it with what's recorded here — this file only knows
what Tasks 1 and 2 knew.

---

## 1. The concept

`#my-taste` is being rebuilt from a plain Spotify-stats list into a **festival-lineup
poster** — the kind of poster that lists a festival's acts by billing size, headliner
largest at the top, support acts smaller below, with a printed setlist/schedule strip.
Mapped onto this site's own data:

- **Headliner** — the visitor's #1 top artist (`artists.data[0]`). Largest card, own
  display typeface.
- **Support acts (4)** — top artists #2–5 (`artists.data.slice(1, 5)`). Uniform size
  among themselves, smaller than the headliner.
- **Setlist** — the top 5 tracks (`tracks.data`), styled like a printed ticket
  stub/setlist: index, title, artist, monospace.

Visual language: duotoned photos (Task 3), torn/deckle card edges, tape/pin accents
holding each card in place, a "pinned to a corkboard" tilt on every card, film grain
(Task 3). Three self-hosted typefaces, one per role — a display face for the headliner, a
compressed sans for support acts, a monospace for the setlist — never Avenir Next, which
is the system font everywhere else on the site.

`limit=5` on both `/api/spotify/top-artists` and `/api/spotify/top-tracks` (server.js,
untouched since before Stage 4) is exactly headliner + 4 support, and exactly 5 setlist
rows. This is a **load-bearing number**, not an arbitrary default — the grid geometry
(§3) is built around 4 named support areas and a setlist card sized for 5 rows. Changing
`limit` means re-deriving the layout, not just fetching more data.

## 2. The five tasks

Split deliberately into five small tasks rather than one large rebuild — the direct
lesson from Experience's own Stage 3 (Tasks 7→8→9): bundling structural risk (does the
layout even work?) with visual polish (do the photos read well?) meant each of those
rebuilds only discovered its real problem once it was fully built and sitting next to
everything else. Splitting keeps each task's risk isolated.

| # | Task | Status |
|---|---|---|
| 1 | **Foundations** — data reshaped into headliner/support/setlist, three typefaces wired (scoped to this section only), one real `h2`, old `.spotify-section` deleted entirely | **DONE** 2026-08-15 |
| 2 | **Layout** — the wall's structure/hierarchy: CSS Grid, flat-color placeholders, torn edges, tape accents | **DONE** 2026-08-15 |
| 3 | **Photography** — real photos, duotone blend layer, grain, image fallback cards | Not started |
| 4 | **Motion** — entrance animation, parallax, reduced-motion fallback | Not started |
| 5 | **Time-range switching** — UI for Spotify's `time_range` param (server already accepts it), `Flip`-powered re-rank when the underlying data changes | Not started |

Full detail on Tasks 1 and 2 (numbers, bugs found, verification) is in `STATUS.md`'s own
dated entries — this file is the durable *concept* record, `STATUS.md` is the *work log*.

## 3. Task 2's mechanism — grid placement, not freehand position

The original framing for this task (in whatever chat first sketched the concept) talked
about a "15% overlap budget, verified via `getBoundingClientRect`" — i.e., cards placed
freely and checked for overlap after the fact. Task 2's actual brief refined this to
something stronger, and this is what shipped:

**CSS Grid (`grid-template-areas`), not absolute positioning.** Overlap is structurally
impossible by construction — a named grid area can only ever be occupied by the one card
assigned to it — rather than something to verify after placing cards freely. This matches
how this project already prefers computed/guaranteed solutions over measured/eyeballed
ones elsewhere (e.g. the turntable's needle geometry, solved by law of cosines rather
than a tuned constant).

```
grid-template-areas:
  "headliner headliner support-1 support-2"
  "headliner headliner support-3 support-4"
  "setlist   setlist   setlist   setlist"
```

4 columns × 3 rows. The headliner spans 2×2 — it reads as the dominant object through
sheer grid footprint, the way a real poster's headliner does, rather than needing careful
freehand placement to look bigger. The 4 support acts fill the remaining 2×2 block as
four independent 1×1 areas. The setlist spans the full width along the bottom, and its
row is sized by `auto` (not `minmax(180px, auto)` like the top two rows) since a 5-row
track list needs more height than the headliner/support rows do.

Collapses to a single, un-rotated column below 600px by redeclaring
`grid-template-areas` as one column — not a second, independently-tuned set of
coordinates per breakpoint, and not this task's job to art-direct further (Stage 5 owns
deliberate mobile treatment; this task only had to confirm no overflow down to 320px,
which it does).

### Rotation and jitter — deterministic, bounded, never overlapping

Each card gets a small tilt (2–4° magnitude, sign varies) plus a few pixels of translate
jitter, both derived deterministically from the card's own id via `lib/hash.js`'s
`seeded01(id, salt)` — the **same mixing algorithm `colorwayFor` already uses** for vinyl
colorway (Stage 1), extracted to `lib/hash.js` this task so both consumers share one
implementation instead of two that could quietly drift apart. Salting the id per purpose
(`"rotate-mag"`, `"rotate-sign"`, `"jitter-x"`, `"jitter-y"`, `"tear"`, `"tape-rotate"`)
is what lets one id drive six independent-looking values without a stateful PRNG. Same id
→ same layout, every reload, every re-render — verified directly (three fresh page loads,
byte-identical transform values each time).

The rotation/jitter budget is real, computed margin, not a hope: a card rotated by θ
around its center grows its own axis-aligned bounding box by roughly
`(W·(cosθ−1) + H·sinθ) / 2` horizontally and `(W·sinθ + H·(cosθ−1)) / 2` vertically
(W/H = the card's unrotated size). At this task's own 4° ceiling, the smallest cards on
the wall (support acts, ~250×220px at 1440px) grow roughly 7–9px per side from rotation
alone; the ±4px jitter on top brings that to ~11–13px. Each card's own `margin`
(`--space-3`, 12px) plus half of `.my-taste-wall`'s `gap` (`--space-4`, 16px → 8px per
side) gives ~20px of real, laid-out dead space per side — comfortably clear, not a
photo-finish. Verified live, not just by this math: a Playwright pass measures every
rendered card's real (post-transform) bounding box against every other card's at
1440/1024/768px. Zero overlapping pairs at all three.

### Torn edges and tape

Four distinct `clip-path: polygon(...)` presets (`.my-taste-card--tear-1` through `-4`),
chosen per card via the same id-hash (`seeded01(id, "tear")`). Identical clip-paths on
every card would read as a repeating stamp, not hand-torn paper — the brief's own words.
All four presets stay within the card's own 0–100% box (no point pokes outward), so the
torn edge only ever clips inward and never adds to the rotation/jitter margin budget
above.

A small tape rectangle sits at each card's top edge, rotated by its **own** separately-
salted angle (`seeded01(id, "tape-rotate")`) — independent of the card's own tilt, per
the brief, so the tape doesn't just mirror the card underneath it.

### Placeholder tint, and a bug it surfaced

Photo slots reuse `colorwayFor(id)` exactly as `vinyl-record.jsx` does —
`--card-tint: var(--vinyl-N)` — no second tinting mechanism invented, per the brief.
**Found live, not eyeballed:** colorway 1 ("classic black") is deliberately near-invisible
against a dark turntable deck, which is correct there, but the same token reused as a
large flat rectangle next to this section's own card background (`--taste-card-bg`, also
dark in dark theme) read as a missing/broken box rather than "black vinyl." Fixed with a
theme-derived, low-opacity inset border on every photo slot (`box-shadow: inset 0 0 0
1.5px color-mix(in srgb, var(--text-color) 38%, transparent)`) so a slot's own boundary
always reads clearly regardless of how close a given tint lands to the card behind it —
the tinting mechanism itself is untouched, exactly as instructed.

Every photo slot (1 headliner + 4 support + 3 setlist thumbnails, 8 total) has
`isolation: isolate` already set, forward-compat for Task 3: a future `mix-blend-mode`
duotone overlay will composite only within a slot's own stacking context once it exists,
without this task's structure needing to change at all.

## 4. Open items for later tasks

- **Task 3** should confirm the headliner photo slot's `aspect-ratio: 4/3` (this task
  started at 4/5, found live that it crowded the headliner's own name into too thin a
  strip, corrected to 4/3) still reads well once a real photo — not a flat tint — fills
  it.
- **Task 3**'s duotone overlay is the natural place to also revisit whether the
  `--vinyl-N` reuse (§3) still needs the inset-border fix once photos give every slot
  real visual texture instead of a flat color — the border may turn out to be
  unnecessary once there's a photo underneath it, or may still earn its keep.
- **Task 5**'s `Flip` re-rank needs to account for the deterministic-by-id transform:
  if the headliner changes after a time-range switch, its new rotation/jitter/tear/tape
  values will differ from the old headliner's (different id → different hash) — that's
  correct, not a bug, but worth confirming the `Flip` transition doesn't fight the CSS
  `transform` these cards already carry.
