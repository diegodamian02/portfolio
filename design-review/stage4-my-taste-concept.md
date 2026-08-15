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

Visual language: duotoned photos, torn/deckle card edges, tape/pin accents holding each
card in place, a "pinned to a corkboard" tilt on every card, film grain. All built as of
Task 3 (§5). Three self-hosted typefaces, one per role — a display face for the headliner,
a compressed sans for support acts, a monospace for the setlist — never Avenir Next, which
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
| 2.5 | **Fit within one screen** — retrofit of the section's own first requirement ("one panel, one page"), which never got a checkable target until now. Card/photo sizes and spacing tuned down; grid architecture, tinting, torn edges/tape all untouched | **DONE** 2026-08-15 |
| 3 | **Photography** — real photos, duotone blend layer, grain, image fallback cards | **DONE** 2026-08-15 |
| 4 | **Motion** — entrance animation, parallax, reduced-motion fallback | Not started |
| 5 | **Time-range switching** — UI for Spotify's `time_range` param (server already accepts it), `Flip`-powered re-rank when the underlying data changes | Not started |

Full detail on Tasks 1, 2, 2.5 and 3 (numbers, bugs found, verification) is in
`STATUS.md`'s own dated entries — this file is the durable *concept* record, `STATUS.md`
is the *work log*.

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
the wall (support acts, ~250×220px at 1440px when this was written) grew roughly 7–9px
per side from rotation alone; the ±4px jitter on top brought that to ~11–13px. Each
card's own `margin` (`--space-3`, 12px) plus half of `.my-taste-wall`'s `gap`
(`--space-4`, 16px → 8px per side) gave ~20px of real, laid-out dead space per side —
comfortably clear, not a photo-finish. Verified live, not just by this math: a Playwright
pass measures every rendered card's real (post-transform) bounding box against every
other card's at 1440/1024/768px. Zero overlapping pairs at all three.

> **Update, Task 2.5 (2026-08-15):** support acts shrank to ~230×196px as part of the fit
> pass below, and `.my-taste-wall`'s `gap` dropped `--space-4` → `--space-3` (card `margin`
> unchanged). New budget: ~7–8px/side from rotation, ~11–12px with jitter, against ~18px/
> side of dead space (12px margin + 6px half-gap) — tighter than the original ~20px but
> still comfortably clear. Re-verified live the same way: zero overlapping pairs at
> 1440/1024/768px after the resize. `cardTransform()`'s own comment in `my-taste.jsx` has
> the current numbers; treat this block's numbers as the Task 2 snapshot, that comment and
> §5 below as current.

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

## 4. Task 2.5's mechanism — fit within one screen

`ROADMAP.md`'s and the section's own original brief said "one panel, one page" from the
start, but no task before this one turned that into something measurable. Retrofitted
here, while the wall is still flat placeholders and cheap to resize — deferring it to
Task 3 would mean re-doing this against locked-in photo crops instead.

**Method** — Experience's own Stage 3 Task 9 fit pass, reused exactly: section height as
a multiple of one available screen (viewport height minus `--navbar-height`), measured
live, not estimated, at 1440×900 / 1280×800 / 390×844. Numbers, before/after, and the
levers used (headliner/support photo `aspect-ratio`, card padding, wall `gap`, section
padding, setlist per-item padding — in that preference order, photo crops and whitespace
before any text size or content cut) are in `STATUS.md`'s own dated entry, not duplicated
here. Desktop landed at **1.15×** (down from 1.53×), inside Experience's own achieved
band; mobile stayed the worst by a wide margin on purpose — Stage 5 owns mobile art
direction, this task's only obligation there was confirming no horizontal overflow, which
held (0px, 320–1440px).

**Nothing structural changed.** `grid-template-areas`, the id-hash mechanism, torn-edge
presets, tape accents, and the tinting mechanism are all exactly as Task 2 shipped them —
this was a sizing/spacing pass only. The one exception worth flagging for Task 3: the
photo `aspect-ratio` values are no longer what §3/§4 describe (see the update block in §3
and the note below) — Task 3 should crop against the *current* ratios, not the ones this
file originally shipped with.

## 5. Task 3's mechanism — real photos, duotone, grain

Additive to Task 2's structure, per the brief: no change to `grid-template-areas`, the
id-hash rotation/jitter/tear/tape mechanism, or the fit-pass sizes from §4. Everything
below happens *inside* the photo slots Task 2 already built.

**Images.** `artist.images[]` for the headliner and 4 support cards, `track.album.images[]`
for the setlist's 3 thumbnail slots. Spotify's own arrays are sorted largest → smallest
(verified live against real API responses, not assumed) — the headliner's bigger slot
takes `images[0]`; every smaller slot takes the first entry at or under 400px, landing on
Spotify's own middle size (e.g. 320px out of `[640, 320, 160]`) rather than the full-size
original, in service of this project's own load-speed goal. `loading="lazy"` on every
`<img>` — the section sits mid-page, below the fold on initial load.

**Duotone.** `grayscale(1) contrast(1.1)` on the `<img>` strips it to tone; a separate
absolutely-positioned layer using the exact same `--card-tint` custom property Task 2's
flat placeholder used (`mix-blend-mode: color`, full opacity — that blend mode takes this
layer's hue/saturation and the photo's own luminosity, so opacity isn't what controls the
effect) recolors it. No second tinting mechanism, per the brief. Both layers are
`position: absolute; inset: 0` inside the slot (now `position: relative`), so neither
touches the slot's own `aspect-ratio` — confirmed structurally, not just visually: the
img/tint's own `getBoundingClientRect()` is pixel-identical to the slot's, regardless of
the photo's native size, because taking them out of flow means they never contribute to
the parent's own sizing.

**`object-fit: cover`, verified against non-square sources.** Every real image Spotify
actually returned during this task was square (checked live, all 5 artists + all 3 album
covers) — real data never exercises a crop. Verified the mechanism itself instead with
synthetic 1200×300 and 300×1200 SVGs swapped into a real slot: both cropped correctly, no
stretching, in a live screenshot.

**Grain.** Reused `.record-crate-panel`'s own `feTurbulence`-in-a-data-URI recipe (a
`::after` pseudo-element, `main.scss`) rather than a second grain mechanism — that one is
tuned to be almost imperceptible (opacity 0.03); this one is allowed to read as texture on
purpose (the concept doc's own "photocopied flyer, not photo with a filter" framing), so
it's tuned higher, opacity 0.05, `mix-blend-mode: overlay`. One overlay for the whole
section (`.my-taste-section::after`), not per-card.

**Two fallback paths land on the identical treatment** — Task 2's flat `--card-tint` fill,
with the same border (see below): an empty `images[]` (API returned none) and, new this
task, a present URL that fails to load (`<img onError>` sets a `failed` flag, which
un-renders the `<img>`/tint pair entirely and lets the slot's own base `background:
var(--card-tint)` show through). Both verified live via a mocked API response — an
artist with `images: []`, and a support card pointed at a URL guaranteed to 404 — neither
produced a broken-image icon or a console exception (one benign browser-level "failed to
load resource" network log for the deliberately-broken URL, expected, not a JS error).

**Colorway-1 border — explicitly re-evaluated, kept.** Task 2's inset border (§3) existed
to keep `--vinyl-1` ("classic black") legible as a flat placeholder fill. With real photos
in the happy path, that specific problem is gone — a photo's own tonal variation reads as
an edge regardless of colorway. But the fallback above still renders the exact same flat
fill in production now (a real, not hypothetical, failure mode), so the border still earns
its keep there. Kept unconditionally (applied to every slot, not just fallback-state ones)
so a slot never visibly changes shape between its image and fallback states. Re-verified
directly: forced the (colorway-1) headliner into the empty-array fallback and screenshotted
both themes — full detail in `FINDINGS.md` B26's own Task 3 update.

**Fit ratio unchanged.** Predicted and confirmed: since the img/tint layers are taken out
of flow (`position: absolute`), a slot's rendered size is still driven entirely by its own
`aspect-ratio`, exactly as when it held a flat placeholder. Re-ran §4's ratio table —
identical to the Task 2.5 numbers, no retuning needed.

## 6. Open items for later tasks

- **Task 5**'s `Flip` re-rank needs to account for the deterministic-by-id transform:
  if the headliner changes after a time-range switch, its new rotation/jitter/tear/tape
  values will differ from the old headliner's (different id → different hash) — that's
  correct, not a bug, but worth confirming the `Flip` transition doesn't fight the CSS
  `transform` these cards already carry.
- **Task 4**'s entrance animation should account for the now-real `<img>` elements — a
  `SplitText`/fade-in timed against `naturalWidth`/`complete` on a lazy-loaded image that
  hasn't finished fetching yet could animate an empty box. Worth a load-state check that
  didn't need to exist while every slot was a synchronous flat `<div>`.
