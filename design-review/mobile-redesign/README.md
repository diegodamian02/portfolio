# Mobile redesign mockups — 2026-09-03

Exploration of how the six mobile sections could look less cluttered. Not a
shipped stage; no `ROADMAP.md`/`STATUS.md`/`FINDINGS.md` changes. This is
input for a future Stage 5 (mobile) pass.

## What's here

- `*.dc.html` + `canvas.json` — the design-canvas source (19 phone/overview
  frames). Edited visually in the published canvas; re-seed with the design
  skill's `seed-canvas.mjs` after any source edit.
- `mobile-redesign.html` — the seeded canvas payload (published Artifact).
- `capture.mjs` — renders every `*.dc.html` to a PNG. Run from repo root:
  `node design-review/mobile-redesign/capture.mjs`
- PNGs: `../screenshots/mobile-redesign/*.png` — one per frame, for the
  no-repo-access research chat.

## The argument

Each section is `min-height: 100svh` but fills ~40–60% of it, so content
floats in a void. Plus repeated scaffolding (`#my-taste`: 3 labels, 2 swipe
rows, 2 dot sets) and four unrelated scroll idioms (filmstrip, swipe rows,
accordion, static stack).

Two directions per section:

| Section | `-current` | `-fix` (conservative) | `-system` (unified) |
|---|---|---|---|
| Home | deck cramped, ~420px gap above name | hero pulled up, deck to gutter, 44px+ targets | name → label, loud crate prompt, **horizontal pitch fader** |
| About | full-height, centred bio, 3/6 facts | left-aligned bio, wrapped tag row, all 6 facts | portrait → header avatar, 2-up fact grid, content-height |
| Experience | 1 card, no swipe hint, ~230px void | year-on-card, peek, dot row | **vertical timeline rail**, 6 rows, drops the filmstrip |
| My Taste | 3 labels, 2 swipe rows, 2 dot sets, voids | close voids, snap rows to gutter | 1 swipe row (artists) + **numbered list** (top 5) |
| Projects | 2-col title/role split → tangle | single column, mono role kicker, chevron | cards + one-line preview in collapsed state |
| Connect | loud cassette chrome, forced min-height | tighter, 44px inputs, full-width send | chrome → single spine stripe, larger footer socials |

Shared "system" principles: drop one-section-one-screen on phones; one mono
section header; one horizontal idiom (peek-carousel) used once; one card; one
20px edge rhythm with snap-align (no symmetric half-cards).

Mockups match the real tokens: `#0a0e1a` bg, Poppins (Anton/Oswald/Space Mono
in `#my-taste`), the `--space-*` scale, 20px gutter.
