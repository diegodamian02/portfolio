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
Mapped onto this site's own data, **as of Task 3.7** (this restructured the wall's own
hierarchy — see §10; earlier tasks' briefs below describe the shape that predates it):

- **Featured (2)** — the visitor's #1 and #2 top artists (`artists.data.slice(0, 2)`).
  Deliberately identical size/treatment to each other — two cards sharing one billing
  tier, not one dominant headliner plus a second, smaller card. (Before Task 3.7: a
  single "headliner," `artists.data[0]`, at roughly 2× the size of every other card —
  direct feedback that this still read as one card taking too much space, even after
  Task 3.6's font-size cut, because the wall's *entire* hierarchy lived in that one
  comparison.)
- **Secondary (3)** — top artists #3–5 (`artists.data.slice(2, 5)`). Uniform size among
  themselves, clearly smaller than the featured pair. (Before Task 3.7: 4 cards, top
  artists #2–5.)
- **Setlist** — the top 5 tracks (`tracks.data`), one plain numbered monospace list
  inside a single torn/taped card — a fanned row of the top 3 tracks' album art above
  it, the other 2 text-only. (Task 3.5 briefly rebuilt this as 5 individually torn
  "singles," all with art; reverted at Task 3.6 — direct feedback that it read too busy.)

**Layout, as of Task 3.5, unchanged by Task 3.7:** two columns, not one stacked wall. The
featured pair + 3 secondary acts form "the wall" (left, ~60%); the setlist forms "the
crate" (right, ~40%), beside the wall rather than a strip underneath it. This is what
makes the section's total height `max(wall, crate)` instead of `wall + crate` — see §6.
Before Task 3.5, all six objects sat in a single stacked wall, setlist as a full-width row
at the bottom; that shape is superseded, not a current description. Task 3.7 restructured
what's *inside* the wall column (two tiers instead of one dominant card) without touching
this wall/crate macro-layout at all — the brief's own suggestion to try that first,
because it reuses every already-tuned wall/crate proportion rather than re-deriving them.

Visual language: torn/deckle card edges, tape/pin accents holding each card in place, a
"pinned to a corkboard" tilt on every card. All built as of Task 3 (§5), unaffected by
Task 3.7's regrouping — same mechanisms, reused, not rebuilt. Task 3 also shipped a
duotone photo filter and a film-grain overlay as part of this same visual language; both
were removed on later live feedback (§14, §15) and are gone as of 2026-08-17 — the
torn-edge/tape/tilt treatment above is what's still current.
Three self-hosted typefaces, one per role — a display face for the featured pair, a
compressed sans for secondary acts, a monospace for the setlist — never Avenir Next,
which is the system font everywhere else on the site. Photo duotones (Task 3.6) use a
narrower `photoColorwayFor` (`vinyl-record.jsx`), not `colorwayFor` — see §8.

As of Task 3.8, the poster is a real gateway out to Spotify, not just decoration: the
kicker links to the real profile, and every artist card and setlist track links to its
own real Spotify page. Only the crate's own card lost its tilt (rotation/jitter, not the
torn edge or tape) — the wall stays exactly as tilted as it's always been. See §9. (Task
3.7 landed after 3.8 despite its lower number — see §2's own note — so this still holds
for both wall tiers unchanged.)

`limit=5` on both `/api/spotify/top-artists` and `/api/spotify/top-tracks` (server.js,
untouched since before Stage 4) is exactly 2 featured + 3 secondary, and exactly 5
setlist rows. This is a **load-bearing number**, not an arbitrary default — the grid
geometry (§10) is built around 2 named featured areas + 3 named secondary areas, and a
setlist card sized for 5 rows. Changing `limit` means re-deriving the layout, not just
fetching more data.

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
| 3.5 | **Two columns** — restructure into wall (left) + crate (right) so total height is `max(wall, crate)`, not their sum. Setlist rebuilt as small torn "singles," not a list row | **DONE** 2026-08-15 |
| 3.6 | **Refinement pass** — headliner less dominant, crate back to one plain list (Task 3.5's "singles" read too busy), duotone bug fixed (2 of `colorwayFor`'s 5 tokens read as plain gray on a photo) | **DONE** 2026-08-15 |
| 3.8 | **Spotify link, clickable cards, straighten the setlist** — kicker links out to the real profile, every artist/track card is a real `<a>` to its own Spotify page, crate's rotation/jitter removed (torn edge/tape kept) | **DONE** 2026-08-15 |
| 3.7 | **Three-zone restructure** — the wall's 1 headliner + 4 support cards regrouped into 2 "featured" (comparably sized to each other) + 3 "secondary" (clearly smaller) — hierarchy from tiers, not one card's raw size. Landed *after* 3.8, see note below. Follow-up 2026-08-17 fixed 139px of dead space under each featured card's name (a copied, unverified grid-row minimum) — see §10 | **DONE** 2026-08-15, follow-up 2026-08-17 |
| 4 | **Motion** — `ScrollTrigger` pin + timed cascade (kicker → wall cards → crate), `CustomBounce`/`CustomWiggle` landings, reduced-motion and mobile (<601px) both skip straight to the settled end-state | **DONE** 2026-08-17 |
| 3.9 | **Profile avatar** — a small circular, duotoned photo of Diego's own Spotify profile, left of "MY TASTE." New `GET /api/spotify/profile` server route (`GET /me`, same auth/cache mechanism as the two top-items routes) | **DONE** 2026-08-17 |
| 4.1 | **Sell "pinning," not "bouncing" + zone titles** — pulled back `CustomBounce`'s own strength on the wall cards, added a deliberate pause before each tape/pin snap, pivoted each card's settle around the tape's own anchor instead of its center, added "MY TOP ARTISTS"/"MY TOP 5 TRACKS" zone titles with their own pop-in beats | **DONE** 2026-08-17 |
| *(live feedback, unnumbered — §14)* | Pin-after-reload bug (B30), grain texture removed, setlist row-wrap fixed (B31) | **DONE** 2026-08-17 |
| *(live feedback, unnumbered — §15)* | Duotone filter removed, pin-hold safety net fixed for real (non-maximized) desktop window heights (B32) | **DONE** 2026-08-17 |
| 5 | **Time-range switching** — UI for Spotify's `time_range` param (server already accepts it), `Flip`-powered re-rank when the underlying data changes | Not started |

**Net of all of the above, what's actually live today:** a festival-poster-styled section —
a wall of rotated, taped artist cards (2 featured + 3 secondary) on the left, a straight
setlist crate on the right, both driven by real Spotify data with real outbound links —
entering via a timed pin-and-cascade. No color filter and no grain on the photos; they
render exactly as Spotify serves them. That's a genuine reversal, not a typo: Task 3
shipped duotone + grain as the section's deliberate "photocopied show flyer" texture, and
both came off two days later on direct live feedback (§14, §15) — the right call each
time, not a wrong one being corrected.

Most of the decimal branching (3.5, 3.6, 3.7) is two real structural rebuilds, not scope
creep: 3.5 split one tall stacked wall into two side-by-side columns once 2.5's
one-screen constraint made the stack untenable, and 3.7 replaced 3.6's one-dominant-
headliner hierarchy with a featured *pair*. Each redid the task before it rather than
extending it, which is why the count went sideways (3.6 → 3.7) instead of forward (4, 5).

> Task 3.8's own brief referred to it as a follow-up to "Task 3.7's three-zone
> structure." No such task had landed in this repo at the time — the task list's build
> order above genuinely goes 3.6 → 3.8 → 3.7, not numeric order, because 3.7's own brief
> (which arrived after 3.8 shipped) referenced only Task 3.6 and never mentioned 3.8.
> Building 3.7 on top of what 3.8 had already shipped (links, straightened crate) is a
> superset of 3.7's own ask, not a conflict with it — checked and flagged rather than
> silently reordered, per CLAUDE.md's own instruction to note a brief/tree mismatch. No
> "Zone A/B/C" terminology exists in the code itself; this file uses "featured"/
> "secondary" instead — see §10.

Full detail on every row above (numbers, bugs found, verification) — including the two
unnumbered live-feedback rounds — is in `STATUS.md`'s own dated entries, in that same real
build order — this file is the durable *concept* record, `STATUS.md` is the *work log*.

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

> **Update, Task 3.5 (2026-08-15):** the third row (`"setlist setlist setlist setlist"`)
> is gone — `.my-taste-wall` is 4 columns × **2 rows** now, headliner + support only. The
> setlist moved to a sibling column, `.my-taste-crate`, via a new outer two-column grid,
> `.my-taste-layout` (§6). Treat this code block as the Task 2 snapshot; §6 has the
> current shape.

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
> **Update (2026-08-17, §15):** removed. Direct live feedback that it shifted photos
> away from their real Spotify colors — the right call at the time, reversed later on
> new information, not a discovery it was wrong when made.

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
> **Update (2026-08-17, §14):** removed. Live feedback — it read as grainy/granite-like
> static on top of the real photos, not the intended paper texture. Cut, not re-tuned;
> the duotone layers just above already carry this section's tactile treatment.

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

## 6. Task 3.5's mechanism — two columns, not one stacked wall

Direct feedback on the shipped result: the setlist sitting below the wall as a second row
meant total section height was `wall + gap + setlist` — row 1 plus row 2, still "2 pages"
even after Task 2.5's sizing pass. The fix is the same category of move Experience's own
Stage 3 made (Task 7/8 tuned a vertical spine's sizes and still didn't fit; Task 9 replaced
the paradigm — a pinned horizontal filmstrip — and that's what actually solved it): a
structural change, not another round of shrinking numbers.

**Two columns via a new outer grid, `.my-taste-layout`** (`grid-template-columns: 3fr 2fr`
— roughly 60/40, tuned from there, not derived): `.my-taste-wall` (unchanged mechanism,
now 2 rows instead of 3 — headliner + support only) sits left, a new `.my-taste-crate`
sits right. Total section height is `max(wall, crate)` by construction — CSS Grid's
`align-items: start` default row height already does this, not something built by hand.
**Measured, not assumed to follow from "columns are shorter":** desktop went from Task 3's
1.15× one screen to **1.02×** — essentially exact. Laptop 1.32× → **1.18×**.

**The crate is a stack of small torn "singles," not a list.** Each track is its own
`TasteCard` (album art + index/title/artist, `.my-taste-single`'s own horizontal flex
layout) — reusing the exact same rotation/jitter/tear/tape mechanism and `PhotoSlot`
(duotone, both fallback paths, lazy loading, alt text) Tasks 2 and 3 already built, applied
to a new card shape rather than rebuilt for it, per the brief. All 5 tracks carry album art
now (Task 3 gave only the top 3; reconsidered per this task's brief now that the container
shape changed — art on every single reads as "a crate of records," where 3-with-art +
2-text-only would have read as an inconsistent list). Track/artist text truncates with a
single-line ellipsis rather than Task 1/2's flex-wrap — deliberate: wrapped rows of
differing heights would break the crate's own vertical rhythm, which the rotation-safety
math below depends on staying predictable.

**A real overlap-margin recompute, not a copy of the wall's numbers.** A single's aspect
ratio (wide, short — ~389×89px at 1440px) makes its rotation growth asymmetric in a way
the wall's roughly-square cards don't show: growth ≈ `(W·sinθ + H·(cosθ-1))/2` vertically,
and a wide W dominates that term. At the brief's 4° ceiling that's ~13-14px of vertical
growth alone, ~17-18px with jitter — more than the wall's own support cards need despite
being a much smaller card overall. `.my-taste-card`'s own default margin (space-3, 12px,
left untouched) plus half of `.my-taste-crate`'s own gap (space-3, 12px → 6px) gives ~18px
of dead space per side, matching that need. Verified live, not just by the math: zero
overlapping pairs among the 5 singles at 1440/1024/768px, same Playwright discipline as
the wall's own check.

**A real bug found and fixed, not assumed away:** nesting `.my-taste-wall` inside a grid
TRACK (`.my-taste-layout`'s own column) instead of having it as a direct block-level child
of `.my-taste-section` changed its overflow behavior at narrow widths, even though nothing
about `.my-taste-wall`'s own CSS changed. An `fr` track's implicit minimum is `auto`
(content-based) — the grid-level version of the flex `min-width: auto` trap this project
has hit before (`FINDINGS.md` B25) — so `.my-taste-wall`'s own content could force the
track wider than the section's real available space. Measured: 37px of horizontal overflow
at 390px, 107px at 320px, that **did not exist before this task**. Fixed with
`minmax(0, 3fr) minmax(0, 2fr)` (and `minmax(0, 1fr)` in the mobile collapse) instead of
bare `fr` values on `.my-taste-layout` — re-verified 0px overflow at all 8 widths,
320–1440px.

**Mobile got taller, not shorter — expected, not a regression to chase.** 2.65× → 3.01×
one screen. The crate now adds its own stacked column (label + 5 singles) below the wall's
own stack on narrow viewports, where before there was one setlist card there instead of
six new stacked elements. Explicitly out of scope per the brief — deliberate mobile
stacking is Stage 5's job; this task's only mobile obligation (no horizontal overflow) is
met.

> **Update, Task 3.6 (2026-08-15):** the crate's "5 individually torn singles, all with
> art" shape above is **reverted** — direct feedback that it read too busy. Back to one
> plain numbered list in a single card (closer to Task 3's own original shape than to
> this section). `.my-taste-crate-label` and every `.my-taste-single*` rule this section
> describes are deleted, not just unused. See §8 for what replaced them.

## 8. Task 3.6's mechanism — dominance pull-back, list simplification, duotone fix

A refinement pass on Task 3.5's shipped result, not a structural change — the two-column
fit fix (§6) is untouched and still measures correctly (re-confirmed below).

**Headliner, less dominant.** Only one lever actually did anything: the name's own
`font-size` clamp, `clamp(2rem,4.2vw,3.5rem)` → `clamp(1.75rem,3.4vw,2.75rem)` — reverting
to Task 2's own original value (Task 2.5 had bumped it specifically to compensate for a
*shrinking photo*, the opposite problem). The old max (56px) exceeded this site's own
section-title scale (`--text-xl`, max 40px) by 40% — a reasonable definition of "content
competing with the section for attention." Tried cutting the photo `aspect-ratio` too
(16:9 → 2:1) first; measured it had **zero effect** on the headliner's own rendered
height, because the wall's row-spanning grid item stretches to whatever the two rows
actually need — and the support cards (not the headliner) already set that, both before
and after this task (see below). Reverted the aspect-ratio cut, kept only the font cut.

**A real finding, not assumed:** the wall's own top-block height is set by the **support
cards' wrapped names**, not the headliner — "Red Hot Chili Peppers" and "Stone Temple
Pilots" wrap to 3 lines at the wall's own (narrower, since Task 3.5) column width. This
predates Task 3.6 (present already in Task 3.5's own screenshots) and is unrelated to
anything this task touched. Left alone — support-card sizing is outside this task's brief
(headliner, setlist, duotone only), and touching it wasn't necessary to satisfy "headliner
still reads less dominant."

**Setlist, back to one plain list.** Reverted to Task 3's original shape (checked against
that commit before rebuilding, per the brief) — one `TasteCard` wrapping a fanned row of
the top 3 tracks' album art (`.my-taste-setlist-thumbs`/`.my-taste-photo-slot--thumb`)
above a plain numbered `.my-taste-setlist` list of all 5, mono font throughout. Task 3.5's
`.my-taste-single*` rules and `.my-taste-crate-label` are deleted, not left dead.

**Duotone gray-photo bug, fixed.** `colorwayFor`'s 5 tokens include two deliberately
near-neutral ones (`--vinyl-1` "classic black", `--vinyl-5` "marbled smoke") — correct for
an actual vinyl pressing, wrong once `grayscale(1)` + a `mix-blend-mode` wash is applied to
a *photo* instead: ~2 in 5 photos landed on a plain gray wash, by construction. Fixed with
`photoColorwayFor(id)` (`vinyl-record.jsx`) — the *same* `hash32(id)` `colorwayFor` uses,
remapped into 3 buckets instead of 5 (amber/oxblood/midnight-blue only), not a second hash.
`colorwayFor` itself is byte-for-byte unchanged; only `my-taste.jsx`'s `PhotoSlot` switched
which function it calls. Verified two ways: a standalone reimplementation of both functions
against ~20 real and synthetic ids confirmed `photoColorwayFor` never returns 1 or 5 (buckets
landed 6/6/8 — no lopsided skew), and confirmed `colorwayFor`'s own output space is
unaffected (same ids that map to 1 or 5 under `colorwayFor` still do — e.g. Oasis's real id
→ `colorwayFor` 1, `photoColorwayFor` 4).

**A real bug found and fixed, own to this task:** the first pass added
`.my-taste-card--setlist { width: 100%; }`, reasoning it was a harmless explicit statement.
Measured live instead: it caused 8–11px of horizontal overflow at 1024/768px specifically.
Root cause — `.my-taste-crate`'s flex `align-items: stretch` default already sizes the
card correctly (container width minus the card's own margin); an explicit `width: 100%`
claims the *full* container width on top of that same margin, so the card's true footprint
(width + margin) exceeds its container by ~24px. The same "`width: 100%` + margin/padding"
overflow class `.navbar`'s and `.experience-section`'s own comments already document, a
fourth occurrence, with margin instead of padding this time. Only visible at 1024/768px —
at 1440/1280px there was enough slack around the (already `max-width`-capped) content
column to hide it. Fixed by deleting the `width: 100%` declaration; re-verified 0px
overflow at all 8 widths, 320–1440px.

**Fit ratio re-run — undershoots now, on purpose, not a regression.** Desktop **1.02× →
0.72×** one screen; laptop **1.18× → 0.82×**. Two separate, both-expected causes: (1) the
crate's own height dropped sharply (654px-equivalent territory → ~360px) simply because
simplifying 5 separate torn cards into 1 list card removes 4 cards' worth of margin/
padding/tape/torn-edge overhead — an inherent, correct consequence of "read too busy,
simplify," not a bug; (2) the wall's own height (424px) is unchanged by this task (see the
support-name-wrap finding above), so it was never the thing keeping the ratio near 1.0× in
the first place. A ratio under 1.0× is not a failure of "fits in one screen" — it means the
section fits **more** comfortably, with room to spare, not less. Grew the crate back
modestly using an in-scope lever (`.my-taste-setlist-item`'s own padding, `--space-1` →
`--space-2`) to narrow the wall/crate height gap a little (104px → 64px) without fighting
the simplification itself; declined to chase an exact wall/crate match by inflating the
list further, or by touching support-card sizing (out of scope). Re-verified: zero overlap
in either column, zero horizontal overflow 320–1440px, unchanged from §6's own numbers.

## 9. Task 3.8's mechanism — real links, and a straight crate

Three independent, unrelated asks, no structural change — Task 3.6's fit fix (§8) is
untouched, and its own two numbers (0.72×/0.82× desktop/laptop) don't move, since nothing
this task did changes any element's box size, only what wraps it or how it's rotated.

**The kicker is a real outbound link.** "now spinning · my taste" is gone; the `<h2>` now
contains one `<a>` ("my taste · listen on spotify" — text-transformed to caps by the
existing `.my-taste-heading` rule, not typed in caps) whose whole line, dot separator
included, is the link — plus the Spotify glyph at its trailing edge. The URL is the real
profile already in production, `footer.jsx`'s own `open.spotify.com/user/...` link — reused,
not a second profile invented for this task. The icon is the *same* theme-swapped
white/black PNG pair `footer.jsx` already uses (no new asset, no icon library), rendered
`alt=""` here (decorative — the link's own text already says "listen on spotify," unlike
`footer.jsx`'s standalone icon-only link, which needs `alt="Spotify"` as its only
accessible name) and deliberately **not** run through this section's own duotone treatment
— Spotify's brand guidelines call for the mark's approved shape/color; `PhotoSlot`'s
`grayscale(1)` + `mix-blend-mode` wash is for the festival-poster photos, not a UI glyph.
The `<a>` lives *inside* the `<h2>`, not the reverse, so the section keeps exactly the one
real heading Task 1 established — its accessible name is just the link's text now.

**Every artist and track card is a real link.** `TasteCard` (`my-taste.jsx`) takes an
optional `href` — when present, it wraps its `children` in a real `<a>` before returning
them inside the `<article>`; when absent (the crate's own container card), behavior is
byte-identical to before this task. Headliner and all 4 support cards pass
`artist.external_urls.spotify`; each setlist row is now its own `<a>` wrapping
index+track+artist (`external_urls.spotify` from the track object) rather than plain
`<span>`s — a bigger, single tappable target per row, not just the track name. Verified
live against real API responses, not assumed from the brief: `external_urls.spotify` is
present, unmodified, on both `/api/spotify/top-artists` and `/api/spotify/top-tracks`
responses (`server.js` forwards Spotify's own `items` array verbatim, no reshaping) — spot-
checked all 5 artist hrefs and all 5 track hrefs against the raw API payload, all correct.
Real `<a>` throughout, never a `div` + `onClick`, matching this section's own existing
alt-text accessibility discipline; `target="_blank" rel="noopener noreferrer"` on every
one, since all of them take the visitor off the portfolio. Focus is a plain `outline`
(same convention as every other interactive element on the site) — checked live on a
torn-edge card specifically, since clip-path on the card clips an inner element's outline
wherever a tear cuts inward: the ring isn't a mathematically perfect rectangle on every
card, but the vast majority of its perimeter renders normally (the tears only cut a few
percent inward at their deepest points) and the result is clearly, unambiguously visible —
confirmed by screenshot, not just computed styles.

**The crate is straight now; the wall isn't.** `.my-taste-card--setlist` overrides
`.my-taste-card`'s base `transform` (rotate + jitter) back to `none` — scoped to rotation/
jitter only, per the brief's own wording. Torn edge (`--tear-N`) and the tape accent are
untouched, so the crate keeps the same paper/pinned-material language as the wall, it's
just not crooked anymore. The wall's headliner and 4 support cards are completely
unchanged — confirmed live, real computed rotation on all 5 (-2.2° to 3.84°, within the
brief's own original 2-4° band) beside the setlist card's exactly-`none` transform.

**Verification, beyond what's above:** every card and track's href spot-checked against
raw API data (not just "non-empty"); a real sequential Tab walk (not just programmatic
`.focus()`) reaches the kicker, then all 5 wall cards, then all 5 setlist rows, each
getting the same visible outline; zero horizontal overflow at the usual 320-1440px sweep;
zero console errors across a full-page scroll-through; screenshots re-captured both
themes — `design-review/capture-screenshots.mjs` (note: that script's own hardcoded
light-theme list is `['home', 'about']` only, so it doesn't cover `#my-taste` in light —
supplemented with the same scoped light-theme capture prior tasks in this section already
use, `t4-my-taste-wall-desktop-light.png`).

## 10. Task 3.7's mechanism — two tiers instead of one dominant card

Lands **after** Task 3.8 despite the lower number. This brief called itself a follow-up
to Task 3.6 specifically — it never references 3.8 — so building it on top of 3.8's
already-shipped links and straightened crate is a superset of what it asked for, not a
conflict with it. Recorded in real build order here and in `STATUS.md`, not by task
number, so the sequence stays honest.

**The diagnosis.** Task 3.6 already cut the headliner's own font-size and it still read
as dominant. The real problem was never "how big is one card" — it was that the wall's
*entire* hierarchy lived in one comparison, one big card against four uniform small ones.
Splitting into two tiers moves hierarchy to group membership instead, so no single card
has to carry it through raw size alone.

**Regrouped the same 5 cards, not a new card shape.** `artists.data[0..1]` are now
"featured" (Zone A, the brief's term — was the singular "headliner"): both render with
one shared className, one shared photo-slot aspect-ratio (16:9, unchanged from the old
headliner's own ratio), one shared name font-size — deliberately identical to each
other, since that's what "comparably prominent to each other" actually requires, not a
looser "both kind of big." `artists.data[2..4]` are "secondary" (Zone B — was the 4-card
"support" tier, now 3): one shared, visibly smaller treatment (3:2 photo ratio, same as
the old support cards). Every mechanism underneath — `TasteCard`, `PhotoSlot`, duotone,
torn edges, tape, the `href`/focus-outline work Task 3.8 built — is completely unchanged;
this task only changes which named grid area each card renders into and which of two
shared style treatments it gets.

**The grid.** `.my-taste-wall` moved from 4 columns (headliner spanning 2×2, four 1×1
support cells) to 6 columns: `featured-1`/`featured-2` each span 3 columns × 2 rows,
`secondary-1/2/3` each span 2 columns in a single, shorter row. 6 columns specifically
because it divides evenly by both 2 (the featured pair) and 3 (the secondary trio) — a
4-column grid can't express a 3-way split without uneven, independently-tuned spans that
would need their own separate justification. Chose this over the brief's other suggested
arrangement (three even columns, A | B | C) because it reuses `.my-taste-layout`'s
already-working wall/crate proportions and every fit-ratio/overflow number already tuned
for that macro-shape — the brief itself flagged this as an acceptable choice ("grouping
A+B into one wall area beside C is fine too").

Found and removed 5 now-dead CSS rules while rebuilding this (`.my-taste-card--headliner`
and `--support-1` through `--support-4`, one `grid-area` declaration each) — checked
before deleting rather than assumed: `TasteCard` already sets `gridArea` as an inline
style from its own `area` prop on the same element, and inline `style` always wins the
cascade over an external stylesheet rule for the same property. These were inert
leftovers from whenever that inline mechanism was added (Task 3.5), not something
deleting them changes the rendered result of.

**Measured the actual gap, not just relabeled it.** Real rendered card areas at 1440px:
old headliner ≈121,437px² vs. old support ≈25,480px² — a **4.77:1** ratio. New featured
≈66,738px² vs. secondary ≈35,518–37,273px² — **~1.8:1**, corrected below after a
follow-up fix; the numbers as first shipped read ≈105,387–111,078px² and ~2.9:1, inflated
by a bug (see the follow-up note at the end of this section). Either way it's a genuine,
measured reduction from the old 4.77:1 headliner:support ratio, not just new class names
on the old proportions. Checked the specific failure case the brief called out by name:
the two featured cards' own areas differ by under 5% from each other (ordinary variance
from different name lengths and per-id rotation/jitter — both share the identical grid
footprint, aspect-ratio, and font-size), confirmed by screenshot to read as clearly
comparable to each other, not "headliner, slightly smaller" beside a same-size second
card.

**Used the fit-ratio headroom deliberately, then checked what it cost.** Ratio table
(corrected — see the follow-up note below for the as-first-shipped numbers, which were
inflated by a bug):

| Breakpoint | Task 3.6 | Task 3.7 (as shipped) | Task 3.7 follow-up (corrected) |
|---|---|---|---|
| Desktop (1440×900) | 0.72× | 0.94× | **0.77×** |
| Laptop (1280×800) | 0.82× | 1.09× | **0.89×** |
| Mobile (390×844) | 2.73× | 2.68× | **2.68×** |

**Verification:** zero overlap among all 5 wall cards at 1440/1280/1024/768px; zero
horizontal overflow at the usual 320–1440px sweep; zero console errors across a full
scroll-through; every one of Task 3.8's own checks re-run and unchanged afterward — all
5 artist hrefs and 5 track hrefs still correct, a real Tab-order keyboard walk still
reaches every card with a visible outline, the wall's cards still carry their original
rotation (-2.2° to 3.84°), the crate's card is still exactly `transform: none`.
Screenshots re-captured both themes via `capture-screenshots.mjs`, supplemented with the
same scoped light-theme capture prior tasks in this section already use.

> **Follow-up (2026-08-17):** live report re-sent this same brief, adding "a large unused
> vertical gap between the headliner and the first support card." That terminology
> describes the pre-restructure state (this task had already shipped), so the specific
> relationship named didn't map onto the actual tree — but the underlying observation was
> real. Measured it directly: each featured card's own box was 358px tall while its real
> content (photo + name + padding) needed only ~220px — **139px of dead space** under
> every artist name. Root cause: the wall's `grid-template-rows` had kept the OLD
> headliner's own per-row minimum (180px × 2 = 360px) with the stated reasoning "same
> card width proportion as before, no reason to re-tune" — a real observation about WIDTH
> used, incorrectly, to justify not re-checking HEIGHT. The old headliner's content had
> already grown past that floor on its own; the new featured card's content never got
> close. Fixed by dropping the row minimum to 90px, letting `auto` size off real content
> — dead space fell to 8px (the card's own intentional padding, not leftover waste). This
> is what dropped the ratio table above from the "as shipped" column to "corrected" — the
> genuine part of this task's own "use the headroom" instruction survives fully intact
> (the featured pair is still exactly as wide as the old single headliner, just applied
> to two cards now), the numbers were just partly inflated by a bug that's now gone.
> Laptop no longer overshoots one screen at all, a strictly better result. Full
> measurements in `STATUS.md`.

## 11. Task 4's mechanism — a timed pin, not a scrub

**The two primitives this reuses, and why neither alone was the right fit.** The brief
asked for the section to pin in place (Experience's own `pin: true` mechanism) while a
timed cascade plays, then release. Experience's own pin IS scroll-scrubbed — its
timeline's progress is driven directly by how far the visitor has scrolled, which is
right for a filmstrip the visitor should feel like they're dragging through by hand, but
wrong here: a card-landing cascade that sped up or slowed down with scroll velocity would
read as broken, not intentional. About's own Task 5 entrance hold is the other half —
`lenis.stop()`/`start()` blocking real scroll input while a plain, paused, non-scrubbed
timeline plays on its own clock and calls `start()` again on completion — but About never
pins (`position: fixed`); it just holds scroll while content that's already naturally in
view finishes animating. This task combines them: Experience's `pin: true` for the visual
lock, About's hold for a timeline that runs on wall-clock time instead of scroll distance.

**Sequence, in build order:** kicker (`SplitText`, `type: "words"`, all words animated
together with no stagger — "one unified pop," the brief's own words, not a per-character
reveal) → the first wall card (a short `MotionPathPlugin` arc, ~0.18s, handing off into a
`CustomBounce` landing + `CustomWiggle` tape snap) → the remaining 4 wall cards (same
land/snap pairing, no arc, staggered ~0.1s apart via GSAP's own `stagger`) → the crate
(plain fade/slide, no bounce/wiggle — this section's one already-straightened object,
Task 3.8, so its entrance stays calm rather than borrowing the wall's tactile language).

**Why the arc is on one card, not all five.** `CustomBounce`'s own eased output isn't
monotonic — reading `node_modules/gsap/CustomBounce.js` directly rather than assuming
from the brief's snippet, its value touches 1 at each simulated ground-contact, dips
below 1 between contacts (the ball briefly airborne again), and only settles near 1 at
the very end. Driving a `motionPath`'s progress with that same ease would drag the object
backward along its curve on every bounce — the two plugins fighting each other, exactly
the failure mode the brief's own "keep it only if it doesn't fight the bounce" caveat
anticipated. Splitting the arc into its own short, plain-eased (`power2.in`) tween that
lands just short of rest, THEN handing off to a separate, plain-axis `CustomBounce` tween
for the final settle, sidesteps that: the two plugins never animate the same property in
the same tween. Kept to one card as the section's signature flourish rather than all
five, both to limit that risk's surface area and because five simultaneous/staggered arcs
read as busier than the brief's own "gentle curved trajectory" language suggested for one.

**Why `CustomBounce`'s squash tween needs its OWN target value, read at runtime, not a
bare 0.** Confirmed via `CustomBounce.create(id, {squash})`'s own source: it registers a
SECOND ease at `id + "-squash"` alongside the primary one, meant to drive a parallel
scale tween on the same element over the same duration — the standard GSAP demo pairs
`{y: target, ease: "myBounce"}` with `{scaleX, scaleY, ease: "myBounce-squash"}` at the
same timeline position. Both eases return to their start value at progress 1 by
construction, so a plain `.to()` (not `.fromTo()`) correctly rests back at whatever
scale/position the element already had. That "already had" value matters for THIS
file specifically: each wall card's rest position isn't `x:0, y:0` — it's whatever
`--card-jitter-x`/`-y` `cardTransform()` (my-taste.jsx) set inline on that exact card.
GSAP decomposes an element's EXISTING transform the first time it touches x/y/rotation/
scale on it, so rotation survives automatically without this task ever touching it — but
once a tween explicitly targets x/y (the entrance drop does), the tween's own end value
IS what the card rests at. `jitterOf()` (my-taste.jsx) reads the same two custom
properties back rather than re-deriving them, so "landed" always means "wherever
`cardTransform()` actually put this specific card," not a value that could silently
drift out of sync with it.

**Why `clearProps: "transform"` is the timeline's own last step.** The same
transform-authority fact cuts the other way at the mobile breakpoint: `.my-taste-card`'s
own `@media (max-width: 600px)` rule sets `transform: none` to un-rotate the wall on
mobile, and inline `style` always wins the cascade over that rule regardless of which
media query is active — the same cascade fact already documented in this file for Task
3.7's five deleted `grid-area` rules, now mattering for a different pair. Left in place,
GSAP's own inline `transform` (written the instant it first touched x/y/rotation/scale)
would permanently shadow that mobile override the next time the viewport crossed back
under 600px after having played this entrance above it. `clearProps` removes the inline
properties entirely once the cascade settles, handing authority back to the stylesheet —
confirmed live: every wall card's `style.transform` reads empty after the timeline
completes, with rotation/jitter still visibly present in both themes (screenshot-verified)
because the CSS rule that was there all along is doing the work again.

**Mobile and reduced-motion are their own `gsap.matchMedia()` branch, not a runtime
bail inside the full-motion path.** Both About's own entrance hold and this task's
`onEnter` carry a runtime "section taller than available viewport, don't hold scroll for
it" escape hatch — but that's a defensive check for an unusual SHORT desktop window, not
the expected case. Mobile's own measured fit ratio is 2.68× viewport height (§10's own
table) — a section that tall being genuinely pinned (whether via `position: fixed` or
GSAP's transform-based equivalent, see below) would hold a visitor captive against
content mostly cut off above/below the viewport for the whole hold, every time, not as an
edge case. Deciding this one media query earlier — before the pin is ever constructed at
all — means mobile visitors get the section's fully settled end-state immediately, the
same as reduced-motion, rather than a runtime check quietly deciding not to hold scroll
for a pin that still visually engaged moments before. Not named in this task's own "out
of scope" list (unlike Tasks 3.7/3.8, which named mobile explicitly), but the same
reasoning this section has used for mobile throughout Stage 4 still applies.

**The pin mechanism itself doesn't use `position: fixed` here — found live, not
assumed.** Checking `getComputedStyle(el).position === "fixed"` reads `"relative"` the
entire time this section is genuinely pinned; GSAP's own pin setup on this page, paired
with Lenis, uses transform-based pinning instead (auto-detected by GSAP, not configured
by this task). Verified engagement/release with an implementation-agnostic check instead
— the section's own `getBoundingClientRect().top` staying constant under continued
realistic scroll input, then moving again once released. By that measure the pin holds
for the cascade's real ~2.1s duration and releases cleanly, with normal scroll resuming
immediately after, across a full page scroll-through with zero console errors.

**One real bug found and fixed during the build.** First tried `end: "+=1"` on the pin's
`ScrollTrigger`, reasoning that since the timeline isn't scroll-scrubbed, the exact pixel
span shouldn't matter — scroll can't advance toward `end` at all while held, so the hold's
real duration is governed by `lenis.stop()`/`start()`, not by this number. True as far as
it went, but it missed why `end` still has to be wide enough for `onEnter` to reliably
FIRE in the first place: found live (Playwright, realistic small-tick scrolling, not the
big single-jump ticks that had masked this at first) that a normal momentum jump can
cross a 1px-wide start-to-end span within one `ScrollTrigger` update tick, so the pin
never visually engaged at all under fast scroll — the exact overshoot class Experience's
own `ENTRY_BUFFER` and About's own hold-correction (`lenis.scrollTo(self.start, ...)`,
both already documented elsewhere in this codebase) exist to absorb, just fatal here
instead of merely off-center, because the span was thin enough to jump clean over.
`end: "+=200"` (the same order of magnitude as Experience's own 220px buffer) fixed it.

**Timeline duration tuned by real measurement, not by feel alone.** The brief's own
"roughly 1.5–2s, not a strict target" was checked against the timeline's actual
`tl.duration()`, not estimated from the individual tween numbers by hand — the first
build measured 3.265s, meaningfully outside that range even accounting for "not a strict
target." Tightened durations and increased tween overlaps, re-measuring after each pass,
until it landed at ~2.1s.

**`capture-screenshots.mjs` needed a one-line, section-scoped fix.** Its default
per-section wait (700ms, tuned for every OTHER section's own fade/settle time) captured
this section mid-cascade — found live: Stone Temple Pilots' card and the whole crate
missing from the shot, which reads as broken/missing content to anyone looking at the
screenshot later, not as "captured 1.4s too early." Bumped to 3200ms for `#my-taste`
specifically; every other section's own 700ms is untouched.

**Two things the brief described that don't exist in this file — checked against the
tree, not built blind (CLAUDE.md's own instruction).** A profile avatar next to "MY
TASTE" (Task 3.9): no commit under that number, no mention in this file, `ROADMAP.md`, or
`STATUS.md` at any point in Stage 4's own history — it never shipped, and building it
was never part of this task's own ask regardless (the brief called it out as a separate,
unconfirmed item). A "MY TOP 5 TRACKS" label inside the crate: no such element has ever
existed in `my-taste.jsx` — the crate has only ever been a fanned row of thumbnails above
a plain numbered list (Task 3.6 onward). The crate's entrance animates that real content
instead (3 thumbnails, then 5 rows), with no separate label beat to pop.

> **Both landed for real two days later** — Task 3.9 (§12) built the avatar, Task 4.1
> (§13) built the zone titles and refined this section's own `CustomBounce`/tape-gap/
> pivot mechanics described above. The pin mechanism itself (`end: "+=200"`, the <601px
> fallback, the reduced-motion skip) is untouched by either.

## 12. Task 3.9's mechanism — the kicker's own avatar

**Reused the auth, not just the pattern.** `GET /api/spotify/profile` (`server.js`) is a
new route, but a new `fetchProfile()` function shaped exactly like the existing
`fetchTopItems()` — same `ensureAccessToken()`/`spotifyDataCache` mechanism, same
stale-while-revalidate fallback, just pointed at `GET /me` instead of `/me/top/*`. One
Spotify identity, one token, one cache — never a second auth path for a second endpoint.

**Confirmed the scope live before writing any frontend code.** This project's own
authorization scope is `user-top-read` only. Spotify's docs are explicit that `/me`'s
`email` field needs `user-read-email` and `country`/`product` need `user-read-private`,
and silent on `images` — read as "no scope needed," then actually verified by calling
the route against the real refresh token: `200`, a populated `images[]`, on the existing
scope. The brief asked to report back a real finding if the scope came up short; it
didn't, so there's nothing to report beyond "checked, confirmed working."

**A bespoke duotone circle, not PhotoSlot reused.** Same two-layer technique
(`grayscale(1) contrast(1.1)` on the photo, a `mix-blend-mode: color` tint layer above
it, one shared `--card-tint` custom property) — but PhotoSlot's own scaffolding (a
fixed-aspect-ratio slot meant to sit inside a torn-edge, taped wall/crate card) doesn't
apply to a 32px circular badge sitting inline in a text row, so `AvatarSlot`
(my-taste.jsx) is its own small component instead of PhotoSlot with different props.
`photoColorwayFor` needs an id to hash a tint from; this is the one image in the section
with no natural Spotify id (it's the owner's own account, not an artist/track), so it
hashes a fixed string constant instead — still deterministic across reloads, just salted
from a literal rather than an API id. Tried duotone first per the brief's own
instruction ("consistency has been the right call everywhere else in this stage") and
kept it — a real face reads fine through the tint in both themes, not muddy.
> **Update (2026-08-17, §15):** removed. Direct live feedback that it shifted photos
> away from their real Spotify colors — the right call at the time, reversed later on
> new information, not a discovery it was wrong when made.

**No fallback content, unlike every other image in this section.** PhotoSlot's own flat
`--card-tint` fill is a real, intentional fallback for "no photo yet." `AvatarSlot` has
no equivalent — when there's no image (a failed request, or a real Spotify response
shape this brief itself called out: an account with `images: []`, no photo ever set) it
renders nothing at all, not a placeholder circle. There's no sensible flat-color stand-in
for "a photo of a specific person," so hiding the whole element is the honest fallback,
not a missing feature. Verified both failure paths live via Playwright route
interception (a `500`, and separately a real `200` with `images: []`) — avatar absent
either way, kicker text and the rest of the section completely unaffected, zero console
errors.

**A real regression, found and fixed in the same pass.** The avatar's own width pushed
the kicker row past what fits at 390px — before this task, "MY TASTE · LISTEN ON
SPOTIFY" fit on one line there; a live mobile screenshot (not assumed safe because the
change looked small) showed it wrapping **mid-phrase** instead ("MY" / "TASTE" split
across two lines). Root cause: a bare text node between flex items is itself an
anonymous flex item, and an anonymous flex item can still shrink and wrap internally at
word boundaries even while the row's own `flex-wrap` stays `nowrap` — the row "not
wrapping" only means it doesn't split into multiple flex ROWS, not that its own text
content can't break internally once width-constrained. Fixed with `white-space: nowrap`
(stops any single text run from ever breaking internally) plus `flex-wrap: wrap` on
`.my-taste-heading-link` (the actual release valve — if the row still doesn't fit as one
line, a WHOLE chunk drops to its own line instead of a word). Mobile now reads as two
clean lines ("[avatar] MY TASTE · LISTEN ON SPOTIFY" / "[icon]"), not the pixel-tuned
mobile composition Stage 5 still owns, but no longer a broken one.

**Fit-ratio re-run, not assumed harmless.** Desktop 0.77× → 0.83×, laptop 0.89× → 0.95×
(both still comfortably under one screen), mobile 2.68× → 2.80× (mobile's own art
direction is still entirely Stage 5's). The growth is real, split between this task's
avatar and Task 4.1's two zone titles (both landed in the same pass, measured together)
— not free, but nowhere close to costing the "fits" bar either desktop or laptop already
clears.

## 13. Task 4.1's mechanism — pin over bounce, zone titles

**"Bounce" vs. "pin" is a real, measurable difference in this ease's own shape, not just
a vibe.** Sampled `CustomBounce`'s eased output directly (`gsap.parseEase("cardLand")`)
rather than trusting the "reads as generic" feedback without checking why: at the
original `strength: 0.6` the curve touches its target three separate times, with two
visible dips between (down to ~0.64, then ~0.88) — an honest multi-bounce ball. At
`strength: 0.3` (kept, `squash` also pulled back from 2 to 1) it touches once around 65%
of the way through, dips to one shallow ~0.92, and settles — a single decisive beat.
Also confirmed live and worth recording so a future tuning pass doesn't re-litigate it:
this ease never exceeds 1 at ANY strength — it approaches the target from below and dips
back, it doesn't pass through rest the way a spring/`back.out` ease would — so "arrives,
slight overshoot once, stops" (the brief's own words) reads here as "arrives, one
shallow dip, stops." The tape/pin keeps the more energetic motion by contrast, unchanged
(`CustomWiggle`/`PIN_SNAP_EASE`) — reducing the card's own strength is what makes room
for the tape's snap to read as the section's most energetic beat, not a separate change
to the tape's own config.

**Two beats, verified as two beats, not assumed from the code alone.** Added a
`PIN_BEAT_GAP`-style pause (0.15s) between each card's land tween finishing and its own
tape's pop/snap starting — was `>`/`<+=0.4` (fires the instant landing finishes), now
`>+=0.15`/`<+=0.55`. Captured a frame sequence through the live cascade (screenshots at
0/400/550/700/900/1200/1500/2000/2800ms) specifically to check the FEEL, not just the
numbers: at 550ms Oasis has landed with no tape visible yet; by 900ms its tape (and Mac
Miller's) has popped in and snapped. The pause reads as a genuinely separate beat on
screen, not just a number that's technically nonzero.

**Pivoted at the pin, not the card's own center.** Each wall card's rotation now starts
level (0deg) and animates to its own real `--card-rotate` tilt as part of the same land
tween, with `transform-origin: 50% 0%` — the tape's own anchor point (`top: -10px;
left: 50%`, main.scss's `.my-taste-card-tape`), not the card's geometric middle. Reads
as the sheet swinging into its pinned tilt around where it's actually pinned, rather
than a ball rotating around its own center on the way down. `clearProps` at the end
includes `transformOrigin` alongside `transform` so neither outlives the entrance for
any future transform this card gets (a hover effect, say — still an open item, §14).

**Zone titles needed a new wrapper layer, not new grid rules.** "MY TOP ARTISTS" /
"MY TOP 5 TRACKS," same font/case/tracking as the kicker but quieter (`opacity: 0.7`,
still a `<p>` — this section keeps exactly one real heading, Task 1's own decision,
unchanged). Putting a title above each of `.my-taste-layout`'s two columns meant wrapping
`.my-taste-wall`/`.my-taste-crate` in new `.my-taste-wall-column`/`.my-taste-crate-column`
flex containers (title + content) rather than touching `.my-taste-layout`'s own grid —
its `minmax(0, ...)` column-track fix (Task 3.5) lives on the TRACK, so it keeps working
regardless of how many wrapper layers sit inside it, re-confirmed live (0px overflow,
320–1440px) rather than assumed. `.my-taste-crate`'s own mobile `margin-top` moved to
`.my-taste-crate-column` in the same pass — left on the inner element, it would land
between the crate's own new title and its content, not between the two stacked zones,
once mobile has two titled zones instead of two plain ones.

**Duration grew, honestly, not silently.** ~2.1s (Task 4) → ~2.76s. Two new pop beats
plus two real 0.15s pauses cost real time; tightened tween overlaps after the first
build measured 3.19s, landing at a number honest about what this task actually added
rather than forced back to the original figure by cutting the very pacing it asked for.

**Verification, same rigor as Task 4's own report.** Pin engage/release re-confirmed via
`getBoundingClientRect().top` stability (not `getComputedStyle().position`, which still
reads `"relative"` on this page's transform-based pin — Task 4's own finding, reused
rather than rediscovered); zero overflow at the usual sweep; zero console errors across
a full scroll-through; fit ratio re-run (§12, above — landed in the same pass as Task
3.9 so the numbers move together). Screenshots re-captured both themes.

## 14. Live-feedback fixes — pin bug, grain removed, setlist wrap

Not a numbered task — direct live feedback on the Task 3.9/4.1 build, same day. Full
root-cause writeups live in `FINDINGS.md` (B30, B31); this section is the short version
for this doc's own continuity.

**B30 — the pin never engaged on a fresh reload.** Root cause: `#my-taste`'s own
`ScrollTrigger.create({ pin: true })` runs inside an effect gated on its Spotify fetch
resolving — a variable-timing async event. `pin: true` measures start/end and builds its
pin-spacer ONCE, at that moment. This section's self-hosted, section-scoped webfonts
(Anton/Oswald/Space Mono — first used starting here) finish their swap-in a beat after
first paint and reflow the text taller than the fallback-font layout; a live poll showed
the page still growing ~80ms *after* the pin-spacer had already been created, leaving the
cached measurement ~144px short of the section's real position — enough that the whole
`end: "+=200"` window was consumed before a visitor's continued scroll actually reached
the section. Fixed page-wide in `smooth-scroll.jsx`, not patched locally: `document.fonts.
ready` plus a debounced `ResizeObserver` on `document.body`, both calling
`ScrollTrigger.refresh()`, so any section's stale pin self-heals, not just this one.

**Grain texture cut.** §5's own "real photos, duotone, grain" section documents the
`.my-taste-section::after` feTurbulence overlay this removes — live feedback: it read as
grainy/granite-like static on real photos rather than the intended paper texture. Cut
outright, not re-tuned; at the time, `PhotoSlot`/`AvatarSlot`'s own duotone layers still
carried this section's tactile treatment on their own — those layers were themselves
removed two days later, §15 below. `position: relative` came off the section rule with it
(it existed only as that `::after`'s containing block).

**B31 — setlist rows could orphan the index number.** A live screenshot flagged the
mobile setlist as "cramped"; measuring the actual boxes found something worse — for a
long track title, index and track name landed on independent flex-wrap lines, so the
index number ("4") rendered alone, orphaned above its own track. Fixed by grouping
index+track into one nested flex unit (`.my-taste-setlist-main`) so they're one atomic
item on the row's own flex-wrap; bumped the row-gap term (`--space-2` → `--space-3`) so a
wrapped artist line reads as still-this-row rather than blurring toward the divider below.

Also investigated and ruled out: a screenshot appeared to show the fixed navbar
"floating" mid-section. Confirmed live (`getBoundingClientRect()` during a real scroll:
`top: 0`, `position: fixed`) that this is an artifact of this project's own element-
clipped screenshot tool rendering a fixed element once into a shot taller than any real
viewport — not a live bug, no code change.

## 15. Duotone removed, and the pin-hold's real desktop-height bug

Two more items of direct live feedback, same build, two days after §14. Full writeups:
`FINDINGS.md` B32; STATUS.md's own dated entry.

**Duotone filter removed.** §5/§12's own duotone mechanism (grayscale+contrast on the
`<img>`, a `--card-tint` `mix-blend-mode: color` layer above it) came off `PhotoSlot` and
`AvatarSlot` both — direct feedback: "the images still look a different color from what
spotify displays... dont do that." Photos now render exactly as Spotify serves them,
confirmed via computed styles (`filter: none`, `mix-blend-mode: normal`, zero tint-overlay
elements in the DOM), not just eyeballed from a screenshot. `--card-tint` itself survives
on `PhotoSlot` only, as the fallback fill for a missing/broken image — unaffected.
`AvatarSlot` had no fallback use for it, so its own `photoColorwayFor("diego-avatar")`
call came out entirely, not just the filter. This changes §5's "duotone" framing and
§12's "tried duotone first, kept" reasoning — both were correct calls at the time, this is
a later reversal on direct feedback, not a discovery that either was wrong when made.

**B32 — the pin-hold silently skipped itself on ordinary desktop window heights.** Live
report: "I asked you to pin the section... so I can see the animation" — desktop, wide
window, i.e. NOT the mobile/reduced-motion cases §11's own `mm.add` already excludes on
purpose. Ruled out a §14/B30 recurrence first (automated checks against local dev AND
live production both showed a clean pin-and-hold at 1440×900, even under an aggressive
fast-flick scroll) before looking elsewhere. Found live, sweeping a range of ordinary
(non-maximized) window heights: `onEnter`'s own "don't trap the visitor" safety net —
`sectionHeight > available`, unchanged since §11 — compares this section's fixed ~631px
content height against `window.innerHeight - navbarHeight`. That passes at 900px tall
(756px available) but fails at 700/660/600px tall (556/516/456px available) — all three
genuinely ordinary browser-window heights, the same reference range `FINDINGS.md` B29
already used for Experience, not edge cases. On any of them the safety net silently took
the "don't hold" branch: cascade still plays, scroll never actually captured — reads
exactly as "the pin isn't working" on a completely normal laptop window.

Fixed by widening the tolerance, not removing the check: the original concern (a section
dramatically taller than the viewport trapping a visitor) is still real at the true
extreme, just not at the 22-38% overflow these ordinary heights actually produce.
`SAFETY_NET_OVERFLOW_ALLOWANCE = 1.6` (`my-taste.jsx`) — holds up to 60% overflow,
comfortably covering 600-900px while still bailing out on a genuinely pathological window
(~480px tall, ~88% over, still skips). Re-verified live at all four heights: each now
shows a real hold (`getBoundingClientRect().top` frozen at the navbar offset for dozens
of consecutive samples) and a clean release on schedule. Note: `about.jsx`'s own hold
carries the identical strict-threshold pattern this bug came from — not touched here (out
of scope for a report specifically about `#my-taste`), flagged for whoever picks it up.

## 16. Open items for later tasks

- **Still open, not Task 4's job:** a future GSAP hover/tilt effect on `.my-taste-card`
  should double check it doesn't fight `.my-taste-card-link:hover`'s underline (Task 3.8)
  — Task 4's own entrance animation doesn't add any hover interaction, it only animates
  entry once per page view, so this concern carries forward unresolved. Any pointer-events
  trickery should still account for the whole card being one focusable, navigable link.
- **Task 5**'s `Flip` re-rank needs to account for the deterministic-by-id transform:
  if the featured pair changes after a time-range switch, each new artist's rotation/
  jitter/tear/tape values will differ from whoever they replaced (different id →
  different hash) — that's correct, not a bug, but worth confirming the `Flip`
  transition doesn't fight the CSS `transform` these cards already carry. Also now needs
  to handle an artist moving BETWEEN tiers (e.g. today's #2 featured artist becomes
  tomorrow's #3, now secondary) — Task 3.7 didn't need to consider this since tier
  membership was static within a single page load, but a re-rank makes it a real case.
- **Addressed passively by Task 4, not with an explicit load-state check.** Task 4's
  entrance animates each `.my-taste-card`'s opacity/position, not the `<img>` inside it
  directly, and `PhotoSlot`'s own `--card-tint` fallback (Task 2/3) sits underneath the
  image at all times — so a lazy-loaded image that hasn't finished fetching when its
  card's entrance plays shows the tinted fallback, not an empty box, and the real photo
  pops in silently whenever it finishes loading. In practice `loading="lazy"` has already
  fired well before a visitor finishes scrolling down to this section, so this is a rare
  path, not the common one — worth revisiting only if a future task adds a per-image
  reveal (a mask wipe, a blur-up) that would make an in-flight fetch visually obvious in
  a way a static tint doesn't.
- **Secondary-card name wrapping** ("Red Hot Chili Peppers," "Stone Temple Pilots" → 3
  lines, still true post-Task 3.7 for the same 2 of the 3 secondary cards) is a
  *confirmed* driver of card height, not a guess — found while investigating Task 3.6's
  fit-ratio drop, still present in Task 3.7's own new secondary tier. Not fixed by either
  task (out of scope for both), but worth a deliberate look whenever secondary-card
  styling is next touched: three-line names read more cramped than a one/two-line name
  would, independent of the fit-ratio question.
- **Resolved by Task 4.** Its own cascade sequences by DOM/document order (`featured-1` →
  `featured-2` → `secondary-1/2/3`), not by tier — `featured-1` gets its own arc/land/snap
  beat first (the brief's own "headliner card lands" language, still meaningful as "the
  first, visually-left card" even though Task 3.7 made it and `featured-2` equally
  prominent), then the remaining 4 cascade together, tier boundary un-observed. No
  old "1-then-4" beat survived to reuse or fight.
- ~~**Stage 5**'s mobile pass should look at the crate specifically~~ — **DONE, 2026-08-23.**
  The crate's mobile shape isn't a fit-ratio number to chase down anymore — it's a
  different object entirely: `.my-taste-crate`'s numbered list is replaced (not stacked
  alongside) by a new horizontal scroll-snap row of small track cards below 601px, inside
  a section that deliberately fills `calc(100dvh - var(--scroll-offset))`. §17 below has
  the mechanism.
- ~~**Partially addressed by Task 3.9, worth a full pass in Stage 5:** the kicker row's own
  mobile wrap~~ — **DONE, 2026-08-23.** The avatar shrinks (`--space-6` → `--space-5`) and
  the desktop tail ("· listen on spotify" + icon) is replaced by a condensed "Spotify ↗"
  one below 601px — a composed one-line row, not the flex-wrap fallback's two-line split.

## 17. Stage 5's mechanism — two horizontal scroll-snap rows, not a stacked column

Full writeup in `STATUS.md`'s own dated entry (2026-08-23) and `FINDINGS.md` B48 (the
flex min-content bug found along the way — same trap as B25/B31, one level up: a card
containing `white-space: nowrap` text needs its OWN `min-width: 0`, not just the row
container's, or it grows past its `flex: 0 0 <width>` basis and stretches every sibling
in the row to match).

Short version for anyone landing here before reading `STATUS.md`: `.my-taste-wall` and a
new `.my-taste-track-scroll` both become `overflow-x: auto; scroll-snap-type: x mandatory`
flex rows below 601px, edge-to-edge via the section's own bleed technique. Featured/
secondary's desktop size difference collapses to one shared card size (1:1 photos, one
font size) — the brief's own explicit "all 5 the same size" ask. Torn edge/tape/rotation,
dropped for mobile back in Task 3.7, are back for wall cards specifically. The section's
own `min-height` is keyed to `--scroll-offset` (not the navbar height alone, and not a
literal `100dvh`) — found live that a direct nav/hash landing pushes the section's top
down by exactly that custom property (this project's own B3 fix), so a literal-100dvh
section's bottom fell the same distance below the fold after landing that way.
