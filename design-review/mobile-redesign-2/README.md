# Mobile redesign — one screen per section — 2026-09-07

Second mobile mockup pass (the first is `../mobile-redesign/`, 2026-09-03 — much
of its conservative `-fix` column already shipped as "Stage 5 continued").

Owner brief: **each section must be exactly one phone screen — no bleed into the
next.** Hero "good, not great." My Taste "keep the look, fit one screen."
Experience "needs the most work." Projects good. Connect "a bit big."

Direction picks (via `/design`): static mockups · Experience = full-bleed swipe
photo cards · Hero = lead with the crate.

## What's here

- `*.dc.html` + `canvas.json` — design-canvas source (1 overview + 6 phone
  frames, 390×844). Re-seed with the design skill's `seed-canvas.mjs` after any
  edit.
- `mobile-redesign-2.html` — seeded canvas payload (published Artifact).

## Per-section

| Section | Move |
|---|---|
| Home | Name → letterhead line. "Put a record on." + loud accent search field lead. Deck sits dimmed / arm parked until a record drops. Dot-matrix behind hero only. |
| About | Full-width portrait, left bio, all 6 chips in one wrapped row. Fills the screen (was a centred card in a void). |
| Experience | **Reworked.** Photo card at a natural landscape crop (not enlarged / stretched), year + "Now" tag on a scrim. Role + description anchored low on the screen, above a dot row + swipe hint. Hard snap, next card peeks. Drops filmstrip + centre-focus scale + the ~230px void. |
| My Taste | Poster look kept (torn cards, tape, tilt, Anton, pressing hues). One artist swipe row (was 2 rows + 2 dot sets), top 5 → numbered list inside the crate card. |
| Projects | Kept. Liner-note tracklist, mono index in pressing hue, role kicker, 2-line preview, chevron. Rows breathe to fill one screen. |
| Connect | Trimmed. Cassette chrome → spine stripe + 2 reel dots. 44px fields, full-width Send. Footer (name + larger socials) anchored to screen bottom. Walkman send-reveal untouched. |

Tokens match the app: `#0a0e1a` bg, `#eef1f8`/`#9aa3bd` text, `#6f9bff` accent,
Poppins (Anton/Oswald/Space Mono in My Taste), `--space-*` scale, 20px gutter.
Dark theme shown; light "Studio Paper" inherits every layout change.

## Not a design change — flagged

On load the page can restore a stale scroll position and land mid-hero. Fix is
code: `history.scrollRestoration = "manual"` + pin to top (or to the hash) before
Lenis starts. Tracked here, not done.

## Status

**Implemented 2026-09-07** on branch `stage5-mobile-onescreen`, merged to `main`
section by section (`5505f8a` scroll fix + About chip · `13faa47` Home ·
`7095177` My Taste · `8e1eda2` Experience · `13196c9` Connect · sweep commit for
About's `min-height`). Direction picks that landed: static mockups · Experience =
full-bleed swipe photo cards (kept big to fill the section, per owner) with the
role/caption in a static readout below · hero leads with the crate. About kept
its shipped design (only the "Plays Guitar" chip removed). Projects needed no
change — its base rule already carries a one-screen `min-height`. Full writeup:
`../STATUS.md` §2 ("Stage 5 (mobile) — one screen per section").
