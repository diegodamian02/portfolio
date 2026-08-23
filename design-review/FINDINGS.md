# Design Review — diegodamian.com

**Captured:** 2026-08-08 · **Build:** commit `ba70f10` · **Screenshots:** `design-review/screenshots/`

This document is written to be **self-contained**. It can be pasted into a chat that
has no access to this repository. Screenshots are separate image files in
`screenshots/` — attach the relevant ones alongside it.

> **Scope:** this file covers *design* — what's wrong and what should change. For
> project state and the changelog, see [`STATUS.md`](./STATUS.md). For **order of
> work**, see [`ROADMAP.md`](./ROADMAP.md).
>
> **§8 (open questions) is now answered and §9 (sequencing) is superseded** —
> `ROADMAP.md` is authoritative for both.
>
> **§1 is also dated, not current** (caught 2026-08-17, not fixed here — a full
> rewrite of the site snapshot is a bigger task than this pass): it still describes
> the turntable as inert with nothing playing, true when this file was captured
> (2026-08-08) but not since Stage 1. Multiple sections it describes have also been
> substantially rebuilt since (`#my-taste` is no longer "records as vinyl," Experience
> is a pinned filmstrip, not the original timeline). For the CURRENT site state, use
> `ROADMAP.md` §0 — kept live, not a point-in-time capture. §2–7's individual bug/
> problem entries are still each individually dated and marked FIXED/superseded where
> applicable, so those stay reliable read one at a time; it's §1's own single "here's
> what the site is today" framing that no longer holds as a whole.

---

## 1. What the site is

A single-page React portfolio for Diego Damian, a software engineer (Rutgers CS,
minor in Music Technology). The organising idea is **"welcome to my playground"**,
expressed as a working turntable in the hero: search a record crate for any song,
drop it on the platter, and a 30-second preview plays.

**Current reality:** the turntable is built and looks excellent, but it is inert.
The audio engine, drop animation, platter spin, and scratch interaction are all
unbuilt. Searching returns results and places artwork on a motionless disc. Nothing
plays.

### Page structure

One scrolling page, six anchored sections (Stage 3 Task 4 split the old
`#about` — portrait/name/bio/facts, then a separate `#timeline` — work
history — see `STATUS.md`):

| Anchor | Contents |
|---|---|
| `#home` | Turntable hero + record-crate search input |
| `#about` | Calm intro card: portrait, name, one-line bio, fact chips |
| `#timeline` | Full-bleed scroll-revealed work-experience panels (formerly lived at `#about`) |
| `#my-taste` | Diego's top Spotify tracks and artists (read-only, server-cached) |
| `#projects` | Expandable project list |
| `#connect` | Contact form (now working, sends via Resend) |

### Stack and constraints

- **React 18** + **Vite 6**, plain **SCSS** (one 1,980-line `main.scss`), no CSS framework
- **GSAP 3.15** with `ScrollTrigger`, `SplitText`, `Draggable`, `InertiaPlugin` — all
  registered, but only SplitText is currently used (in the intro animation)
- Theming via CSS custom properties on `:root` / `[data-theme="light"]`
- **No** 3D libraries. React Three Fiber was explored for an earlier concept and
  deliberately abandoned; nothing from that era is installed.
- Express backend on Railway, Cloudflare in front. Frontend is a static SPA served
  by Caddy.
- `@react-spring/web` and `@use-gesture/react` are still installed but **orphaned** —
  they powered a superseded "orb navigation" hero and nothing imports them.

**Practical implication for any design proposal:** GSAP is already paid for in the
bundle and is the natural tool for new motion work. Adding a second animation
library needs to justify its weight. The JS bundle is currently 410.99 kB (150.32 kB
gzipped).

### Design tokens (from `client/src/styles/main.scss`)

```
Dark theme (default)          Light theme
--bg-color        #0a0e1a     #f6f7fb
--text-color      #eef1f8     #0d1220
--secondary-text  #9aa3bd     #454e68
--accent          #6f9bff     #1f3fae
--bg-inverted     #f6f7fb     #0a0e1a     ← flips with theme
--text-inverted   #0d1220     #eef1f8     ← flips with theme
```

Plus a fixed "roasted maple" palette for the record crate (`--crate-maple-*`,
around `#c08c4e`) that deliberately stays the same warm wood in both themes.

Typeface throughout is **Avenir Next**.

---

## 2. Screenshot index

| File | Shows |
|---|---|
| `home-desktop.png` | Turntable hero, 1440px |
| `home-mobile.png` | Turntable hero, 390px |
| `home-light.png` | Hero in light theme |
| `00-loading-desktop.png` | Intro animation mid-sequence ("be different" typewriter) |
| `projects-desktop.png` | Slideshow band + project list |
| `projects-mobile.png` | Same, 390px |
| `my-taste-desktop.png` | Spotify section with live data |
| `my-taste-mobile.png` | Same, 390px |
| `about-desktop.png` | Bio + work experience |
| `about-light.png` | **Same section, light theme — shows the contrast bug inverted** |
| `about-mobile.png` | Same, 390px (5,658px tall) |
| `connect-desktop.png` | Contact form |
| `connect-mobile.png` | Same, 390px |

**Stage 1 Task 4 set** (2026-08-11). Colourway and amber shots have the platter pinned to
0° so the sheen and the translucency glow — both gradients in the *record's* frame — land
in the same place in every capture.

| File | Shows |
|---|---|
| `t4-deck-light-BEFORE.png` / `t4-deck-light-AFTER.png` | The D3b fix. Plinth vs page 11.7 → 28.5 L\* |
| `t4-amber-BEFORE-dark.png` / `t4-amber-AFTER-dark.png` | Chocolate brown → translucent amber |
| `t4-colorway-{1..5}-{dark,light}.png` | All five pressings against the new plinth |
| `t4-button-{EMPTY,PLAYING,PAUSED}-{dark,light}.png` | Transport button in each state |
| `t4-deck-1440-dark.png` / `t4-deck-480-dark.png` | Button proportion at both size tiers (44px / 36px) |

**Stage 1 Task 5 set** (2026-08-12).

| File | Shows |
|---|---|
| `t5-deck-dark.png` / `t5-deck-light.png` | The deck after the gradient split — button dome now lit from above in BOTH themes |
| `t5-button-dark.png` / `t5-button-light.png` | Transport button close-up, same |
| `t5-deck-theme-dark.png` / `t5-deck-theme-light.png` | Theme endpoints, deck only |

A fixed navbar overlays these captures wherever it happened to sit during scroll.
That is a screenshot artifact, not a layout bug — but see finding **B3**, which is
a real bug in the same area.

---

## 3. The core diagnosis

**The hero and everything below it are two different websites.**

The turntable is a bespoke, *material* design — a real object with weight, surface,
shadow, and correct mechanical geometry. The tonearm angle was computed with the
law of cosines; the strobe ring was rebuilt to fix a moiré artifact.

One screen down, the site becomes a conventional 2020-era portfolio template:
centered headings, an auto-rotating image, a row of cards. The two halves share a
color palette and nothing else — no shared sense of material, depth, or physicality.

A visitor reads this as *"the impressive part is a demo, the rest is filler."* That
costs more than any single unfinished animation.

**This is the central design question to resolve before anything else gets built.**

---

## 4. Bugs — fixable now, no design decisions required

### B1 — "Work Experience" heading is invisible in *both* themes — **FIXED 2026-08-08**

> Fixed by `.work-title { color: var(--text-inverted); }`. Measured from the rendered
> DOM: **17.44:1 dark / 17.03:1 light**, against a 3:1 requirement for large text.
> Full audit and the B2 fix below.

`.work-experience` sets `background-color: var(--bg-inverted)`, but `.work-title`
sets `color: var(--text-color)`. Both tokens flip together with the theme, so the
text always lands on a background of near-identical lightness:

- Dark theme: `#eef1f8` on `#f6f7fb` → contrast ratio **≈1.04:1**
- Light theme: `#0d1220` on `#0a0e1a` → contrast ratio **≈1.02:1**

WCAG AA requires 3:1 for large text. Visible in both `about-desktop.png` and
`about-light.png` as a ghost.

**Fix:** `.work-title { color: var(--text-inverted); }` — one line.

`.project-slideshow-section` already pairs `--bg-inverted` with `--text-inverted`
correctly, so this is an oversight rather than a pattern.

### B2 — Timeline date text has the same root cause — **FIXED 2026-08-08**

> **Correction:** this originally named `.timeline-content` as the culprit. That was
> wrong — `.timeline-content` sets only `text-align` and correctly *inherits*
> `--text-inverted`. The offender is **`.date`**. The original reading came from a
> `grep -A10` that ran past the block and caught the following rule.

`.date` used `--secondary-text` on the inverted background: **2.35:1 dark / 2.33:1
light**, against 4.5:1 for body text. Same root cause as B1 — the background inverts
but the text token doesn't follow.

**Fix:** added a `--secondary-text-inverted` token, defined in both themes as the
opposite theme's `--secondary-text`, completing the inverted trio alongside
`--bg-inverted` / `--text-inverted`. Result: **7.71:1 dark / 7.65:1 light.**

Chosen over the alternative (`--text-inverted` at reduced opacity) because opacity
composites differently against a light vs dark backdrop, so one alpha yields
**asymmetric contrast between themes** — 0.65 gives 5.68:1 dark but 7.52:1 light. The
explicit token lands at 7.71 / 7.65, near-identical in both.

### The full `--bg-inverted` audit

Every rule setting `--bg-inverted`, and every text/border colour beneath it:

| Selector | Colour source | Verdict |
|---|---|---|
| `.work-experience` | `--bg-inverted` bg + `--text-inverted` | ✅ already correct |
| `.work-title` | ~~`--text-color`~~ → `--text-inverted` | **B1, fixed** |
| `.date` | ~~`--secondary-text`~~ → `--secondary-text-inverted` | **B2, fixed** |
| `.timeline-container`, `.timeline`, `.timeline-item` | no colour → inherits | ✅ |
| `.timeline-content` | `text-align` only → inherits `--text-inverted` | ✅ |
| `.timeline-content h3` / `p` | no colour → inherits | ✅ |
| `.timeline-image` | `border-radius` only, no colour | ✅ n/a |

**The audit surface is now a single region.** `.project-slideshow-section` was the only
other `--bg-inverted` rule and Task 2 deleted it, so `.work-experience` is the sole
inverted band and is now the reference pattern. No borders, links, or hover states
exist inside it, and `.date` is used nowhere else in the app.

**One note, not a contrast bug:** `.timeline-logo` sets a fixed `background: #fff`.
In dark theme that white card sits on the `#f6f7fb` inverted band — nearly the same
lightness, so the Capgemini and GlobalLogic cards lose their edge and read as floating
logos. That's a *decorative* boundary rather than text contrast, and resolving it means
choosing a card treatment, so it belongs with the Stage 3 design-system work as part
of **D5** — not here.

### B3 — Nav links scroll their own target under the navbar — **FIXED 2026-08-10**

`scrollToSection()` called `element.scrollIntoView()` with no offset, while the navbar
is `position: fixed`. Every section's top edge landed flush at the viewport top, i.e.
*behind* the bar. Worst case was `#my-taste`: its "My Spotify Journey" heading and
profile photo were scrolled entirely out of sight, so clicking "My Taste" dropped the
visitor mid-section onto the "My Favorite Tracks" subheading, above a row of
half-sliced artist photos. See `screenshots/b3-nav-offset-before.png` vs
`b3-nav-offset-after.png`.

The navbar is taller than the "roughly 100px" this finding originally estimated, and
its height is **content-driven** — 40px of vertical padding plus the `.logo` `h1`'s
line box and default margins — so it changes at the two breakpoints where `.logo`'s
font-size drops. Measured: **143.44px** at ≥769px, **118.56px** at 768px, **105.16px**
at 480px.

**Fixed with `scroll-margin-top`, not a JS offset.** One token, one rule:

```scss
:root { --navbar-height: 144px; --scroll-offset: calc(var(--navbar-height) + 24px); }
@media (max-width: 768px) { :root { --navbar-height: 120px; } }
@media only screen and (max-width: 480px) { :root { --navbar-height: 108px; } }

.content > section { scroll-margin-top: var(--scroll-offset); }
```

CSS was preferred over `offsetTop - navbarHeight` because it is honoured by *every*
route into a section — `scrollIntoView()`, a cold load on `/#about`, the `<Navigate>`
redirect routes, back/forward, find-in-page — rather than only the one code path that
remembers to subtract.

Measured after, at all four widths. Every section's top edge now clears the navbar's
bottom edge by a consistent **~25px**:

| Width | navbar | section top lands at | clearance |
|---|---|---|---|
| 1440 / 1024 | 143.44px | 168px | 24.6px |
| 768 | 118.56px | 144px | 25.4px |
| 480 | 105.16px | 132px | 26.8px |

`#home` is unaffected: it sits at document top, so the offset clamps to 0 and the hero
still starts flush with no gap above it (verified, `scrollY = 0`).

> **Known coupling.** `--navbar-height` is a *measured* constant, not a derived one —
> `.navbar` has no explicit height, so nothing forces the two to agree. The `.logo`
> font-size rules carry comments pointing back at the token. The durable fix is
> `.navbar { height: var(--navbar-height) }`, deliberately deferred: restyling the
> navbar was out of scope here and it belongs with **B4** / Stage 3.

### B3b — Direct hash landings missed by ~811px — **FIXED 2026-08-10**

Found while verifying B3 on the `use-hash-scroll.js` path, and **pre-existing**, not
introduced by the B3 fix — the same 811px miss is measurable on the code before it
(`/#about` landed at `y=3027` where 3838 was correct; after B3, `y=2859` where 3670
was correct — an identical shortfall, just shifted by the new offset).

**Cause:** `useHashScroll` scrolled once, one animation frame after mount. But
`#my-taste` renders its Spotify content asynchronously and **grows from 875px to
1686px** when the data resolves ~300ms later, pushing `#about` and `#connect` down by
811px. The scroll had already committed to the pre-data layout.

This mattered because it was the *Spotify OAuth callback's* own return path: `/about`,
`/project` and `/contact` all `<Navigate>` to a hash, and all three inherited the race.

**Fix:** re-issue the scroll on a `ResizeObserver` of `document.body` for a bounded
2s window after the hash changes. The correction lands while the first smooth scroll
is still animating, so it reads as one continuous movement. A `wheel` / `touchstart` /
`keydown` cancels it, so the page never fights a visitor who scrolls themselves —
and because a wheel gesture does *not* reliably abort an in-flight smooth scroll
(measured: scrolled up 400px, page glided straight back to the target), the handler
also pins the page with `scrollTo({ top: scrollY, behavior: "instant" })`.

All eight paths now land at exactly the token offset — see the B3 table.

### B3c — Nav clicks never update the URL — **FIXED 2026-08-10**

`handleNavClick` called `e.preventDefault()` and then scrolled, so the address bar
stayed at `/` no matter which section you were on. Sections couldn't be linked or
shared, and no nav item could be marked `aria-current`.

**Chose `replaceState` over `pushState`.** `pushState` would make Back walk backwards
through sections, which sounds like orientation but on a five-section one-pager means a
visitor who clicked through everything needs **five Back presses to leave the site** —
history trapping. `replaceState` delivers the actual goal (a copyable link straight to
`#projects`) while Back keeps meaning "leave", which is what a visitor expects here.
Verified: four nav clicks add **0** history entries.

It also removes the double-scroll risk by construction. Raw `history.replaceState`
never notifies react-router, so `location.hash` doesn't change, so `useHashScroll`
cannot re-fire on top of the scroll already running. Measured **0 scroll-direction
reversals** on a nav click, i.e. one continuous movement.

`aria-current="page"` now marks the active item, seeded from the URL so a shared link
arrives with the right item highlighted, and synced on `hashchange` so back/forward
keep it accurate.

> **Known limitation:** this tracks *navigation*, not scroll position — the highlight
> does not follow you as you scroll past sections. A true scroll-spy needs
> `ScrollTrigger`, which arrives in Stage 2.

### B4 — Mobile navigation — **FIXED 2026-08-10**

> **Correction to the original finding.** It read *"only the 'D.' logo and a theme
> toggle. No links, no hamburger. Phone visitors have no navigation at all."* That was
> true when `home-mobile.png` was captured, but **stale by the time it was fixed**:
> Task 2 (`f7911ac`) removed the navbar's hide-during-hero link gating, so the desktop
> links had been rendering at mobile ever since. The real state at 390px was *worse
> than missing* — five links wrapping onto two lines with **"About Me" split across the
> break** ("About" on line 1, "Me" on line 2) and colliding with the logo. Broken
> navigation that looks deliberate is harder to excuse than none.

The rest of the finding held: `isMenuActive` was never applied to any className, and
`.hamburger` / `.navbar-mobile` were both `display: none` with no media query anywhere
to re-enable them.

**Where the links actually stopped fitting, measured:** one line down to 480px, wrapping
at 390px and below. But fitting is the wrong test — at ≤768px they render at 1rem/0.8rem
with ~19px tap targets, far under the 44px minimum. Hence the breakpoint choice.

**Fixed** with a slide-down panel below 768px:

- `.navbar-right` (links + toggle) is replaced by a hamburger at ≤768px.
- The panel drops from under the bar on `--bg-color`, so it reads as an extension of
  the navbar and themes for free. The turntable stays visible below it.
- Five destinations plus the theme toggle, every row ≥44px, full-row tap targets.
- Escape closes, outside click closes, focus returns to the hamburger, `Tab` is
  contained to the panel, body scroll locks while open and releases on close.
- Selecting a destination closes the panel and scrolls with the Task 4
  `--scroll-offset`. Verified landing at **24px clearance at 768 / 480 / 390px**.

Screenshots: `b4-nav-{1440,1024,768,480}-{dark,light}-{closed,open}.png`.

### B4a — Accessibility of the hamburger (FINDINGS §6) — **FIXED 2026-08-10**

The hamburger was a `<div>` with `onClick`: not focusable, not keyboard-operable. It is
now a real `<button type="button">` with `aria-expanded`, `aria-controls`, and an
`aria-label` that flips between "Open menu" and "Close menu".

Keyboard-only pass verified end to end: one `Tab` reaches the hamburger, `Enter` opens,
`Tab` cycles Home → Projects → My Taste → About Me → Let's Connect → theme toggle →
back to the hamburger without escaping into the page, `Enter` navigates, `Escape`
closes and returns focus to the hamburger.

> The remaining §6 items — the theme toggle's missing `aria-label`, the two `role="img"`
> spans, the duplicate `<h1>`, and the skip-link — were **deliberately left alone**.
> They are Stage 8. The toggle's markup was moved into a shared helper so it could
> render in both the bar and the panel, but its attributes are byte-identical to before.

### B9 — iPhone visitors got zero search results — **FIXED 2026-08-08**

The record crate returned "couldn't reach the crate — try again" for every query on
iPhone. Root cause: **Apple's iTunes Search API inspects the User-Agent** and, for an
`iPhone` UA, answers with a `301` to
`musics://mzstoreservices-st.itunes.apple.com/search?…` — a custom-scheme deep link
into the Music app. A browser `fetch` cannot follow a redirect to a non-HTTP scheme,
so it fails with `net::ERR_FAILED`.

Measured across five device profiles. **It is iPhone-specific, not mobile-generally:**

| Device | Direct fetch to Apple |
|---|---|
| Pixel 5, Galaxy S9+, Galaxy Tab S4 (Android) | ✅ 200 |
| iPad (gen 7) | ✅ 200 |
| **iPhone 13** | ❌ `Failed to fetch` |

Viewport is irrelevant — a 1440px desktop sending an iPhone UA fails identically, and
a 390px viewport sending a desktop UA succeeds.

**Fix:** search now routes through `GET /api/itunes/search` on our own backend. Node
sends its own User-Agent, so Apple returns ordinary JSON. Response is passed through
untouched. Includes a 10-minute bounded cache (repeat query 234ms → 2ms) and a
30/minute per-IP limit so it can't be used as a general-purpose iTunes proxy.

**The lesson worth keeping:** the README claimed *"Phase 0 — CORS/iTunes probe —
confirmed direct client-side search, no backend proxy needed."* That probe ran from a
desktop User-Agent. A single-UA probe does not establish that a third-party API
behaves the same for all clients.

### B5 — `client/.env` breaks local development — **FIXED 2026-08-08**

> Corrected to `http://localhost:5050`. Severity was higher than originally recorded:
> once B9's fix routed search through the backend, a malformed `VITE_API_BASE_URL`
> broke **the record crate as well as `#my-taste`**. Production is unaffected —
> Railway supplies `https://api.diegodamian.com`.

```
VITE_API_BASE_URL=server-production-4a86.up.railway.app
```

No `https://` scheme, and pointing at an old Railway subdomain rather than
`api.diegodamian.com`. Without a scheme, axios treats it as a *relative* path, so
`#my-taste` fails locally. Production is unaffected (Railway supplies its own value).

### B6 — Slideshow duplicates the project list, and drifts from it — **FIXED 2026-08-08**

`projects.jsx` hardcoded its own array of three projects instead of reading
`data/projectsData.js`, which has four. The Rutgers project was silently missing from
the slideshow. Two sources of truth for the same content, already out of sync.

**Resolved by deleting the slideshow entirely** (`ROADMAP.md` Q3). `projectsData.js`
is now the single source of truth, and the section lists all four projects. Removed
`sections/projects.jsx`, its CSS, and three PNGs it alone referenced. Verified: the
heading and intro line are intact and the leading/trailing gaps where it sat both
measure 0px.

### B7 — Rutgers logo is clipped in the bio section — **DOES NOT REPRODUCE 2026-08-10**

**No bug here. Nothing changed.** Re-verified from the tree and fresh captures at
1440 / 1024 / 768 / 480 in both themes: the logo renders **complete and undistorted at
every width.**

What made it look sliced in `about-desktop.png` / `about-mobile.png` is the **fixed
navbar overlaying the element capture** — the artifact this file already warns about in
§2. The navbar's opaque band sits across the middle of `.bio-left`, hiding the centre of
the "R" and leaving only the bottom of its legs visible as two red bars. Scroll the logo
clear of the bar, or delete `.navbar` before capturing, and the full R is there.

Measured, which is what settles it:

| | value |
|---|---|
| natural | 496×439 (aspect **1.13**) |
| rendered image | 150×132.75 (aspect **1.13** — no distortion) |
| element box | 250×232.8 |
| `object-fit` | `fill` (harmless: height is `auto`, so aspect is preserved) |

**On the content-box question the task raised:** `.university-logo` *does* use
`width: 150px; padding: 50px` under `content-box`, so the padding adds outside the
declared width and the element occupies 250×233 for a 150px logo. That is the same
pattern Task 5 found on `.navbar`, but here it produces **dead space, not clipping** —
there is nothing to clip against, because no ancestor constrains or hides overflow
(`.bio-section`, `.bio-container` and `.bio-left` are all `overflow: visible`).

**Left unfixed deliberately.** Resizing the logo "so it balances against the 200px
photo" is a judgement about visual weight with no defect behind it — a design decision,
which this task says to stop and report rather than make. It belongs with the Stage 3
design-system pass, alongside **D5**.

**The rest of the bio audit, as requested** — only `.university-logo` has the
content-box padding pattern, and nothing else is broken:

| Selector | Declared | Rendered | Verdict |
|---|---|---|---|
| `.profile-photo` | 200×200, no padding | 200×200 | ✅ |
| `.flag` | 20×15, `object-fit: cover` | 20×15 | ✅ crops by design (natural 1.5 → 1.33) |
| `.timeline-logo` | `padding: 60px 40px` | 507×400 | ✅ already sets `box-sizing: border-box` |
| `.university-logo` | 150px + 50px padding | 250×233 | ⚠️ dead space, renders fine |

### B8 — `#my-taste` mobile layout is visibly broken — **FIXED 2026-08-10**

All three defects reproduced exactly as recorded, and all three are fixed. Alignment
only — no restyling, no new hierarchy, no material treatment. The Stage 4 redesign
still replaces this section wholesale.

**1. Track numbers detached from their tracks.** Cause was exactly as predicted:
`.spotify-track-item { flex-direction: column }` in the 768px block, which stacked the
number above the title while the list's `align-items: center` centred it on its own
line. Removed — the base rule's row direction is correct at every width.

**2. Number aligned to the block's centre, not the title (desktop).**
`align-items: center` centred the number against the midpoint of the whole two-line
block, so "1" floated between "Just Like Heaven" and "The Cure". Changed to
`baseline`, which puts it on the track title's own baseline. Verified **0.0px delta**
at all five widths, including rows where the title wraps to two lines.

**3. Dividers not aligned to their content.** `.track-number` had `padding: 5px 10px`,
starting the number 10px inside the row's own `border-bottom`. Zeroed the horizontal
padding and gave the number a fixed `min-width` so titles share one column. Verified
**0.0px** between the rule's left edge and the content's.

**4. Artist grid stepping and orphans.** `display: flex` with
`justify-content: space-between` + `flex-wrap` threw a short final row out to the
container's edges, and `align-items: center` made two-line names ("Red Hot Chili
Peppers") sit at a different vertical offset than their neighbours. Replaced with a
grid using `align-items: start`, so every image shares a top edge.

> **Column counts are arithmetic, not taste.** The server hardcodes `limit=5`
> (`/me/top/:type`), so there are always exactly 5 artists — and with 5 items only
> **5 columns (one row)** or **3 columns (3+2)** avoid stranding one alone. An
> `auto-fit` grid resolved to 4 columns at 768px and 2 at 480px, producing **4+1** and
> **2+2+1** — the orphan this was meant to remove. Explicit counts instead: 5 above
> 768px, 3 below. Revisit if that limit ever changes.

Verified at 1440 / 1024 / 768 / 480 / 390, both themes, and no horizontal overflow down
to 320px.

### D10 — every `#my-taste` responsive override is dead code — **FIXED, Stage 4 Task 1**

> **Update, Stage 4 Task 1:** done — this section's own closing recommendation
> ("delete this block rather than repair it") is exactly what happened.
> `.spotify-section` and all three of its blocks (base + 768px + 480px,
> ~230 lines total) are deleted entirely, replaced by `.my-taste-section` and
> a new semantic skeleton. None of the dead declarations below were carried
> forward or "activated" — the new layout was built fresh, not patched.
> `.spotify-icon` (footer.jsx's Spotify link icon, a different element
> entirely) was confirmed still in use and left untouched. The history below
> is kept for the record.

Found while fixing B8, and it is the *reason* B8 existed.

The base `#my-taste` rules are nested under `.spotify-section`, so they compile to
`.spotify-section .spotify-artist-img` (specificity 0,2,0). Every override in the 768px
and 480px blocks is written **bare** — `.spotify-artist-img` (0,1,0). **Media queries
add no specificity**, so the base wins and the override does nothing.

Measured, before this task: `.spotify-artist-img` computed to **100px at 480px**, where
the override says 60px. An audit of the rendered CSSOM found **11 dead declarations**,
all inside `.spotify-section`:

| Breakpoint | Selector | Dead properties |
|---|---|---|
| 768 | `.spotify-track-list` | width, margin-right, display, flex-direction, gap, align-items |
| 768 | `.spotify-track-item` | gap, width |
| 768 | `.track-image` | width, height |
| 768 | `.artist-item` | width |
| 768 | `.spotify-artist-img` | width, height |
| 480 | `.spotify-track-list` | width, align-items |
| 480 | `.spotify-track-item` | gap |
| 480 | `.track-image` | width, height |
| 480 | `.top-artists-list` | width |
| 480 | `.artist-item` | width |
| 480 | `.spotify-artist-img` | width, height |

**The one property that always got through was `flex-direction`** — because the base
rule declares only `display: flex` and never a direction, so there was nothing to lose
to. That is precisely why B8's first defect was the *only* one of these overrides with
any visible effect.

**Partially fixed:** the one override B8 needed (`.top-artists-list`'s column count) is
now written as `.spotify-section .top-artists-list` so it wins, and artist image sizing
was made fluid (`width: 100%` + `aspect-ratio`, capped at the original 100px) so it
responds without depending on the dead rules at all.

**Deliberately NOT fixed:** the remaining ~9 declarations. Correcting their specificity
would suddenly activate sizing that has *never once rendered* — track images at 60px,
list widths at 90%/80% — changing the layout in ways nobody has seen or approved. That
is a design decision, so it is logged here instead. Whoever does the Stage 4 redesign
should delete this block rather than repair it.

### D8 — theme toggle desyncs from the page it themes — **FIXED (Stage 1, Task 5)**

The original note said `body` at 0.1s versus `.navbar` at 0.3s. The audit found that
understated it, and misidentified the worst part: **the deck, the record, the strobe dots
and all body text had no theme transition at all** and changed in a single frame
(9–12ms) while the background behind them took 126ms and the navbar 324ms. A **36×
spread**. Text snapping against a still-moving background is what actually reads as
broken; the navbar lag is the least of it.

Fixed with `--theme-transition-duration: 180ms` +
`--theme-transition-ease: cubic-bezier(0.4, 0, 0.2, 1)`, split so Stage 3 can reuse the
easing. Verified at **2021 of 2021 element-property pairs declaring 0.18s**, at 1440 and
480. Full reasoning and the two structural fixes it needed are in `STATUS.md`.

Three things worth carrying forward:

- **`background-image` never interpolates from a custom property.** Verified in
  isolation: even a plain two-stop `linear-gradient` snaps. A gradient whose stops are
  `color-mix`'d with a themed token cannot crossfade — split it into a themed
  `background-color` plus a fixed-alpha overlay. That form is mathematically identical
  (compositing `rgba(0,0,0,0.22)` over a base **is** `color-mix(#000 22%, base)`).
- **`color-mix(… var(--text-color) N% …)` inverts between themes.** It bit twice now —
  the button's disabled fill in Task 4, and its dome highlight here, which lit from above
  in dark and read *concave* in light. Mix toward `black`/`white` for anything that must
  darken or lighten in both.
- **Computed colours come back in three notations** — `rgb()` 0–255, `color(srgb …)` 0–1
  for `color-mix` at rest, and **`oklab(…)` mid-transition**. Any measurement that parses
  channels will silently compare across spaces. Compare value *strings* instead, and
  filter to rendered elements: a display-hidden element reports its declared transition
  but does not run it.

### D9 — the navbar has no entrance or scroll-linked motion

It is simply present at full opacity from the first frame, and its only state change is
an abrupt background swap past 8px of scroll. Nothing about its appearance responds to
the page.

Belongs to **Stage 2**, once Lenis and `ScrollTrigger` exist. Hand-rolling scroll-linked
navbar motion now would mean rewriting it against `ScrollTrigger` immediately after.

### D11 — replaying a finished preview swallows presses for 0.6s

`handleTransport`'s `STOPPED_LOADED` / `ERROR` branch swings the arm back to the outer
groove over 0.6s before starting audio, and holds `isBusyRef` for that window so a second
press can't start a second swing from a half-travelled arm. The deck has no state that
distinguishes "swinging back" from "stopped", which is why the guard is a ref rather than
a state.

It converges correctly and only applies after a preview has finished, so it was left as
is. The real fix is a `DECK.CUEING` state, which belongs with **Phase 8** (scratch) since
that phase needs to know whether the arm is mid-travel anyway.

### D12 — the mat is nearly invisible once a record is on the platter

`.turntable-mat` is `inset: 6.5%` of the platter (radius 0.935) and `.vinyl-record` is
92% of the same box (radius 0.920), so with a record loaded the slipmat shows as a **~1.5%
ring** — about 3px at a 400px platter. All the material work on the mat is only visible on
an empty deck.

Not a bug, but it means "the mat" is effectively a loading-state surface. Worth deciding
in **Stage 4** whether the record should shrink (say 86%) so the mat reads as a real
layer, or whether the mat should be simplified because it is almost never seen.

### B10 — "Work Experience" heading is invisible below 768px — **FIXED, Stage 3 Task 2**

Found while auditing font-sizes for Stage 3 Task 1's type scale. `.work-experience h2 {
display: none; }` inside the 768px media query — confirmed rendered: at a 600px
viewport, `.work-title` computes to `display: none`, zero `offsetWidth`/`offsetHeight`.
The section has exactly one heading, so this doesn't hide a duplicate — the section's
name is **completely absent** below 768px, which is most of this site's traffic. Not
B1's bug (that was a contrast failure; this is a display failure) and not caught by B1's
fix since the rule sits in a different block.

**Fixed, Stage 3 Task 2 (2026-08-13).** The heading moved into normal document flow with
`@include section-title`, which carries no `display: none` at any breakpoint — the
768px rule that hid it is dropped, not carried forward. Verified rendered at 480px
(`screenshots/about-timeline-after-480-dark-depth0.png`): "Work Experience" is visible,
centred, above the first panel.

### B11 — a dead slideshow-era rule still sizes the project list's title

`.project-title` (main.scss ~1433, `font-size: 2.5rem; font-weight: 800;`) was written
for the slideshow Q3 deleted (`4ebaaaf`). `portfolio.jsx` reuses the same class name for
an unrelated element — the `<span className="project-title">` inside each collapsed
project row's clickable header — and the newer, scoped
`.portfolio-header .project-title { font-weight: 400; }` only overrides *weight*, not
size, so the old rule's `font-size: 2.5rem` still cascades through by specificity.
Confirmed rendered: the collapsed list's project titles compute to **40px**, next to
`.portfolio-header`'s own 1.3rem/21px context — a visibly oversized line in a list of
short row headers.

Not fixed here. Task 2 should either delete the dead `.project-title` rule outright or
fold its role into `@mixin section-title`/the type scale — the point of Stage 3 is that
neither the class name nor the rule should exist independently once the scale is applied.

### B12 — a shared classname made `.work-experience` silently inherit a fixed height — **FIXED, Stage 3 Task 2**

`about.jsx` sets `className="about-section work-experience"` on the Work Experience
`<section>` — both classes apply. `.about-section` sets `height: 100vh` (correct for
`.bio-section`, the other element that carries it). The **old** `.work-experience` rule
happened to redeclare its own matching `height: 100vh`, so the collision was invisible
and the section behaved correctly by coincidence, not by design.

Stage 3 Task 2's rebuild removed that redeclaration — nothing about a full-bleed
scroll timeline wants a fixed viewport height — and `.about-section`'s `height: 100vh`
immediately took over unopposed, silently capping eight stacked panels' worth of
content (5552px) into a 1092px box. Not visible by eye: `.about-section` is also
`display: flex; align-items: center`, so the overflow doesn't clip, it just renders
outside its own box and corrupts the document flow around it — the kind of bug a
screenshot alone can look fine in and a layout measurement catches immediately.

Found by comparing `.work-experience`'s own `offsetHeight` (1092px) against
`.timeline`'s (5552px) during verification, not by reading the CSS back. Fixed with an
explicit `height: auto; display: block;` override on `.work-experience`, commented in
place with the mechanism so a future edit doesn't reintroduce it by removing the
override the same way the original redeclaration was removed.

### B13 — a fast scroll skipped About's entrance mid-sequence — **FIXED, Stage 3 Task 5**

Task 4's entrance (`ScrollTrigger` with `once: true`, `start: "top 80%"`, no scrub)
started the ~2.9s wipe→name→bio→chips sequence on entering view, but nothing stopped
scroll from continuing past the section while it played — a fast scroll (a real
trackpad flick, not just a synthetic worst case) dragged the page into Timeline
before the sequence finished, cutting it off mid-cascade.

Fixed by holding scroll input itself for the duration of the entrance:
`lenis.stop()`/`start()` for wheel input, a non-passive `touchmove` block for touch
(this project's Lenis runs `syncTouch: false`, so touch scroll is native and
unaffected by `lenis.stop()` alone — checked Lenis's source before relying on
either), and a `keydown` block for `PageDown`/arrow/`Home`/`End`/space. The entrance
timeline itself was changed from a `scrollTrigger`-attached timeline to a plain,
paused one — decoupled from scroll position entirely, not just un-scrubbed — started
by a separate `ScrollTrigger`'s `onEnter` and released by the timeline's own
`onComplete`.

The first implementation used GSAP's native `pin` with a fixed release distance
instead — the brief's literal suggestion — and was abandoned after testing showed it
couldn't be both short and reliable (Lenis's easing is front-loaded enough that a
distance short enough to feel brief was also short enough for one hard flick to
clear), and a clamp-based patch for that fought Lenis's own scroll target closely
enough to leave the section permanently stuck `position: fixed` under specific
frame-timing conditions, reproduced more than once. See `STATUS.md`'s Stage 3 Task 5
entry for the full reasoning and the empirical results (six input speeds/devices)
that shipped this version instead.

### B14 — the same fix nearly made nav clicks captive too — **FOUND AND FIXED, Stage 3 Task 5**

Not live at any point — found during Task 5's own testing before it could ship.
Clicking "Timeline" in the nav from the top of the page scrolls straight *through*
`#about` on the way there (Lenis animates the intermediate scroll positions, it
doesn't teleport), which crosses About's hold trigger the same as organic scrolling
would — without a check, a visitor asking to go to Timeline would have been held
captive for the whole ~2.9s entrance on the way to a section they explicitly asked
to jump to.

Fixed with a small pub/sub in `lib/scroll.js` (`isProgrammaticScrollActive()` /
`onProgrammaticScrollChange()`) that `scrollToSection()` sets around its own
`lenis.scrollTo()` call. About's hold checks it on entry — skipping the hold and
resolving the entrance to its finished state instantly, so nothing is left invisible
for a later visit — and subscribes to catch a nav click that starts mid-hold too
(e.g. clicking "Connect" partway through About's entrance), which needed
`scrollToSection()`'s own `scrollTo()` call to gain `force: true` (Lenis declines
`scrollTo()` entirely while `isStopped`, per its source).

### B15 — the scroll-hold's trigger point ignored the fixed navbar — **FIXED, Stage 3 Task 5 follow-up**

Found from live feedback the same day B13 shipped: "gets pinned to half the page,
can't see the top." Two causes, the second more fundamental than the first:

Overshoot (a real but secondary factor) — ScrollTrigger only notices a crossed
threshold on its next update tick, and Lenis's own easing keeps moving in the
meantime, so real scroll input can carry a measurable distance past `start` before
the hold actually engages. Fixed with a one-time, immediate
`lenis.scrollTo(self.start, { immediate: true, force: true })` right before
`lenis.stop()`.

The real root cause: `start: "top top"` compares the section's top edge against the
*viewport's* y=0 — it does not know about the fixed navbar at all, unlike every
other anchor on the site, which lands at `var(--scroll-offset)` via the blanket
`.content > section { scroll-margin-top }` rule (B3). With Task 4's small 240px
portrait this was invisible, since nothing important lived in that top ~168px band.
Once the portrait grew (this same follow-up, "make the photo bigger"), its top edge
was genuinely landing behind the navbar — confirmed with
`document.elementFromPoint()`, which resolved points in the photo's top ~50px to
the navbar element, not the photo.

Fixed by reading the same resolved `scroll-margin-top` Lenis's own `scrollTo()`
already reads (`lib/scroll.js`), off the outer `#about` wrapper (the element that
actually carries the blanket rule — a direct child of `.content`, unlike
`about.jsx`'s inner `.about-me-section`), and building `start` as a function so it
re-resolves through `ScrollTrigger.refresh()` if the navbar's height steps at a
breakpoint. Verified holding at exactly 168px (1440px width) and 132px (480px
width) — matching `--scroll-offset` at both.

**Amended same day, one more round of live feedback:** landing flush against the
navbar-cleared line was still wrong for a card this tall — top-anchoring it there
could push the card's *bottom* past the viewport's bottom edge, cutting the photo
off there instead ("cutting up the bottom part of the picture... slightly higher
than it should be"). Changed from top-anchoring to centering the card in the space
below the navbar: `navbarHeight + max(0, (availableHeight − cardHeight) / 2)`,
computed directly rather than via ScrollTrigger's `"center center"` (which centers
against the whole viewport, navbar-covered strip included, and would still land the
card too high). Verified landing with 9px clear above and below at 1440px width —
centered, not just cleared.

**Amended again, same day:** even measured-genuine 50/50 centering ("9px above, 9px
below") still read as "a bit higher than it should be" live — a fixed top bar
visually anchors the eye upward, so mathematical center under one reliably looks
high. Added a `TOP_BIAS = 0.65` — 65% of the available slack goes above the card,
35% below — bounded by construction (bottomGap is still a non-negative fraction of
a non-negative slack), so it cannot reintroduce the overflow this same fix was
built to prevent; it just has a smaller visible effect on shorter viewports, where
there's less slack to redistribute. Verified the effect scales with slack across
four viewport heights (900/1000/1100px) before picking 0.65.

**Found in the same testing pass, then fixed on live confirmation:** at 800px
viewport height (a realistic browser-window height, not an edge case), the card was
already 82px taller than the space available below the navbar — independent of
centering, the `Math.max(0, …)` guard stopped the offset from going negative but
couldn't stop the card's own bottom from overflowing when it was simply too tall to
fit. Left flagged-not-fixed initially since the real fix trades against "make the
photo bigger," an explicit request from earlier the same day.

Confirmed hit live on a real 13" MacBook: "the whole section still looks a bit lower
than it should" — measured on the actual machine sizes in play (1280×800, 1440×900,
1470×956, 1512×982, all re-tested at their *real* usable height once browser chrome
is accounted for, ~700-830px rather than the full screen height) and found overflow
of 35-135px at every one of them, not just the 800px case originally flagged.

Fixed with two layers:
1. **CSS** — `.about-me-portrait-wrap`'s width now has a height-derived ceiling
   alongside the existing `30vw`: `min(30vw, calc((100vh - navbarHeight - 2×padding
   - 40px) / 1.3))`, so the portrait's size responds to how much *vertical* room is
   actually available, not just horizontal. `.about-me-section`'s own padding also
   steps down at `max-height: 760px` (a new `--about-vpad` custom property shared by
   both rules, so they can't drift out of sync the way the original bug happened).
   Re-verified at all 7 MacBook-size/height combinations above: every one now clears
   the viewport bottom with 14-35px to spare, where 5 of 7 previously overflowed.
2. **JS safety net** — `onEnter` now checks the section's *actual rendered height*
   against actual available space before engaging the hold; if it's still taller
   (unpredictable text length, a future content change, an untested viewport), the
   hold is skipped entirely and the entrance just plays on its own clock while
   scroll continues normally, rather than trapping the visitor staring at a cropped
   view for ~2.9s with no way to scroll past it. This is what actually resolves the
   mobile case below — even a smaller portrait doesn't leave enough room for the
   full text block on a phone-sized screen, so mobile now relies on this net rather
   than fitting outright.

### B16 — About's text sat flush against the phone's screen edges, no gutter — **FIXED, Stage 3 Task 5 follow-up**

Found in the same live-feedback pass as B15's MacBook re-check: "on mobile I can see
that the text is almost touching the phone borders." Confirmed by measurement, not
just eyeballed — `.about-me-name`'s left edge sat at `x=0`, flush with the viewport.
Root cause: `.about-me-container` uses the `content-column` mixin, which is only a
`max-width` + auto margins with no padding of its own, and `.about-me-section` never
declared any horizontal padding either (only vertical) — nothing anywhere was
reserving a mobile-width gutter. Fixed by giving `.about-me-section` explicit
`padding-left`/`padding-right: var(--space-5)` (24px) at the existing 768px
breakpoint, matching how `.contact-section` already reserves its own horizontal
padding at the section level rather than the inner container. Verified at 24px on
both sides across iPhone SE and iPhone 14 widths.

Mobile's portrait was also shrunk outright in the same pass (`clamp(150px, 38vw,
210px)`, was `clamp(220px, 60vw, 320px)`) per direct feedback ("make the picture
smaller as it doesn't fit properly on screen... crops a lot of the text") — this
alone wasn't enough to make the full card fit a phone-sized viewport (the text block
is the larger, less compressible part of the height budget), which is what B15's JS
safety net above now covers: on a phone, the hold is skipped and the section simply
scrolls past normally instead of holding on a cut-off view.

**Amended, later the same day — mobile actually made to fit, not just gracefully
fail to.** Direct feedback: drop "Test Automation" and "Plays Guitar" from the chip
row on mobile only ("otherwise it doesn't look too neat"), and — explicitly — "pin
it", i.e. make the hold actually engage on mobile again rather than lean on the
safety net every time. Two chips is `display: none` below 768px
(`.about-me-chip--desktop-only`, all 6 still render on desktop) — dropping them out
of layout entirely is what lets `onEnter`'s height check measure the card as short
enough to hold.

Two chips alone didn't close the gap (measured: 686px card against 559-736px
available across the phones tested). Closed it by tightening the rest of the mobile
column, not by touching the two chips further: portrait `clamp(150px, 38vw, 210px)`
→ `clamp(95px, 26vw, 120px)`; the stacked layout's portrait-to-text gap
`--space-6`→`--space-4`; bio and name bottom margins each cut a step; chip padding
and row gap each cut a step; `--about-vpad` gets a third, tighter value specifically
when a viewport is BOTH narrow and short (most phones, since a phone's chrome eats a
bigger fraction of a shorter screen than a laptop's does).

Verified holding (not just fitting) on the phones that matter — matching `scrollY`
before and after the ~3s wait confirms held, a later jump on further input confirms
released:

| Viewport | Card height | Available | Fits | Holds |
|---|---|---|---|---|
| iPhone SE, full (375×667) | 522px | 559px | ✅ | ✅ |
| iPhone SE, chrome-adjusted (375×540) | 522px | 432px | ❌ | skips hold (safety net) |
| iPhone 14, full (390×844) | 538px | 736px | ✅ | ✅ |
| iPhone 14, chrome-adjusted (390×700) | 490px | 592px | ✅ | ✅ |

The one remaining miss is a genuinely extreme case — a small, older phone with
nearly all its screen eaten by browser chrome — where the safety net's fallback
(let it scroll through normally) is the correct behavior anyway, not a gap to keep
chasing.

Same pass: bio paragraph given `text-align: justify` (direct feedback: ragged wrap
edges "doesn't look that clean"), with `text-align-last: center` scoped to mobile
only so the un-stretched final line still matches the section's centered mobile
layout instead of falling back to plain left/start under it. Desktop's last line
stays left-aligned, consistent with the rest of that layout. Confirmed visually that
justify still spaces correctly through `SplitText`'s per-word span markup (the split
persists for the component's whole mounted lifetime, not just during the entrance)
— the inter-word gaps it stretches are ordinary text nodes between the spans, not
absorbed into them.

**Amended again, minutes later — narrowed to three chips.** Direct feedback: "just
keep my education and my location for mobile devices. but keep the PIN" — down from
the four above (location ×2 + education + Loves Music) to three (location ×2 +
education only; "Loves Music" also gained `desktopOnly`). No CSS changed for this
pass, only which chips carry the modifier — the existing tightened spacing already
had more than enough headroom for one fewer chip. Re-verified holding still engages,
now with wider margins on the phones that already fit:

| Viewport | Card height | Available | Fits | Holds |
|---|---|---|---|---|
| iPhone SE, full (375×667) | 485px | 559px | ✅ | ✅ |
| iPhone SE, chrome-adjusted (375×540) | 485px | 432px | ❌ | skips hold (safety net) |
| iPhone 14, full (390×844) | 501px | 736px | ✅ | ✅ |
| iPhone 14, chrome-adjusted (390×700) | 453px | 592px | ✅ | ✅ |

Screenshotted both phones at rest to confirm three chips doesn't read as sparse next
to the extra headroom — it doesn't; the gap to the next section below is a normal
section gap, not a conspicuously empty band.

### B17 — Timeline's "Experience" heading was visible while About was still held — **FIXED, Stage 3 Task 5 follow-up**

Found live, tested on an iPhone 17 Pro: once B16's fixes made the mobile card
genuinely fit its viewport (and re-engaged the hold, per direct feedback), a NEW
problem appeared as a direct consequence — the card no longer filled the screen, and
nothing was reserving the leftover space for it. Timeline's `.work-title`
("Experience") heading, the very next element in the document, became visible in
that leftover space while the visitor was still scroll-held on About, which reads as
broken (two sections' content on screen while supposedly "on" one of them, unable to
scroll away from either).

Root cause: `.about-me-section` (`rootRef` in `about.jsx`, the element the
scroll-hold's height/fit/bias math all measure) was never wrapped in anything that
reserved a fixed amount of screen space — its box was always exactly as tall as its
own content, nothing more. That's fine background behavior for a normal document
scroll, but during a scroll-HOLD it means the viewport can show past the section's
own bottom edge into whatever comes next.

Fixed on the OUTER wrapper, deliberately not on `.about-me-section` itself: `#about`
(`App.jsx`'s bare `<section id="about"><About /></section>`, a different DOM node
one level up from `rootRef`) now carries `min-height: calc(100vh - var
(--navbar-height))` (with a `100dvh` override for mobile browsers' dynamic toolbar).
Putting it there matters — `rootRef`'s own measured height has to stay the TRUE
content height for the fit-check and `TOP_BIAS` centering math (B15) to keep
working; inflating `rootRef` itself would have silently zeroed `TOP_BIAS`'s bias on
*every* viewport, not just short ones, since slack (`available − sectionHeight`)
would never be positive again.

Provably sufficient, not just measured-and-hoped: the hold always lands the card's
top at `navbarHeight + a non-negative bias offset` (`about.jsx`'s own `Math.max(0,
…)` guarantees the offset is never negative). `#about`'s bottom edge sits at its top
+ this min-height, i.e. at `cardTop + (100vh − navbarHeight)`. The viewport's own
bottom edge at the landed scroll position sits at `cardTop − bias + innerHeight`.
Since `bias ≥ 0` always, the viewport's bottom edge is always at or above `#about`'s
bottom edge — Timeline (which starts exactly where `#about` ends) cannot be visible
while held, for any viewport size, any bias value, any content height.

Verified across a proper device matrix, not just the two phones tested earlier
(Playwright's device profiles report realistic already-chrome-adjusted viewport
heights, not full screen):

| Device | Card height | Available | Fits | Holds | Timeline heading visible while held |
|---|---|---|---|---|---|
| iPhone 14 Pro (393×660) | 454px | 552px | ✅ | ✅ | ❌ (no) |
| iPhone 14 Pro Max (430×740) | 466px | 632px | ✅ | ✅ | ❌ |
| iPhone 17 Pro (402×681) | 457px | 573px | ✅ | ✅ | ❌ |
| iPhone 17 Pro Max (440×763) | 518px | 655px | ✅ | ✅ | ❌ |
| iPhone SE 2016 (320×568) | 512px | 460px | ❌ | skips (safety net) | ❌ (scrolled past, not held) |
| Pixel 7 (412×839) | 508px | 731px | ✅ | ✅ | ❌ |
| Pixel 9 (360×732) | 481px | 624px | ✅ | ✅ | ❌ |
| Pixel 9 Pro (427×876) | 513px | 768px | ✅ | ✅ | ❌ |
| Galaxy S24 (360×780) | 529px | 672px | ✅ | ✅ | ❌ |
| Galaxy A55 (480×1040) | 494px | 932px | ✅ | ✅ | ❌ |

9 of 10 hold cleanly with Timeline fully hidden; the one miss (a 2016-era iPhone SE,
320×568) already fell back to the safety net before this fix and still does —
correct behavior, not a regression. Confirmed with screenshots on iPhone 17 Pro and
Galaxy S24 that the reserved space reads as plain background, not a conspicuous
empty gap.

Deliberately applied unconditionally (not gated to "only when holding") — desktop
was already close to filling the viewport so it's invisible there, reduced-motion
visitors never trigger a hold at all so for them it's just a section with generous
breathing room (which is how `.about-section` behaved before Stage 3 Task 4's
redesign anyway), and the mobile-doesn't-fit safety-net case already exceeds one
viewport's height on its own. No case needed the min-height to be conditional.

### B18 — Experience's spine connector never reached the card — **SUPERSEDED, Stage 3 Task 9**

The vertical alternating-spine layout this bug was found in no longer exists —
Task 9 rebuilt Experience as a pinned, horizontally-scrubbed filmstrip (STATUS.md).
Kept below as history; `.experience-connector`/`.experience-item`/the vertical
`--experience-gap` custom property are all gone, not fixed further.

Found in testing, before ship. The connector (the short horizontal line from the
spine to each card) used `width: var(--space-6)` (32px); the card's own inner edge
was positioned via `width: calc(100% - var(--space-7))` (48px). Two different
tokens, picked independently for what was meant to be the same gap — the connector
fell 16px short of the card every time, entirely invisible (a 2px line that doesn't
reach either of the two things it's supposed to visually join doesn't read as
anything, not just as "a bit short"). Confirmed via `getBoundingClientRect()` on
both elements, not just eyeballed — measured a 16px dead gap between the
connector's right edge and the card's left edge on every entry.

**Fixed by removing the second token entirely, not by matching the number.** A
`--experience-gap` custom property, declared once per `.experience-item` (`var(
--space-7)` desktop, `var(--space-5)` mobile), is now the only thing either the
card's width formula or the connector's width formula reads — they cannot drift
apart again the way two independently-chosen tokens already did once. Re-verified
post-fix: connector's right edge and card's left edge measured at the exact same
pixel (768px) on both alternating sides.

### B19 — Capgemini's client badge overflowed and clipped on mobile — **SUPERSEDED, Stage 3 Task 9**

Also specific to the vertical layout's mobile thumbnail width — doesn't reproduce
in Task 9's filmstrip (cards are large enough, and the collision Task 8 separately
found between this badge and an always-visible caption doesn't apply either, since
Task 9's caption only shows on the active card or on hover/focus). Kept below as
history.

Found in the same testing pass, on the mobile screenshot specifically. The
"Capgemini × [McDonald's mark]" lockup, at `--text-xs`, is wider than the mobile
thumbnail it overlays (as narrow as 76px) — it overflowed `.experience-media`'s
`overflow: hidden` and rendered visibly clipped: "apgemini ×", missing its own
first letter and the icon entirely.

Fixed by dropping the "Capgemini" text specifically at the 768px breakpoint,
leaving just "× [icon]" — this isn't a compromise unique to the bug, either: the
role heading right beside/below the thumbnail in the mobile linear layout already
says "Capgemini — Test Engineer", closer to this badge than desktop's alternating
columns ever put it, so the text was already the more redundant of the two even
before it started overflowing. Desktop badge is unchanged. Re-verified: no overflow
at 76px (the narrowest mobile thumbnail width), confirmed by screenshot.

### B20 — Experience's scrub jumped straight to the end instead of scrubbing — **FOUND AND FIXED, Stage 3 Task 9**

Found in testing, before ship — a plain gentle-scroll check (small ticks, generous
pauses, nothing aggressive) still read the track's `x` transform as fully scrubbed
(`-2280px`, the whole distance) on the very first frame the pin engaged, no matter
how carefully the scroll was paced.

Root cause: the pin was built as a standalone `ScrollTrigger.create({ pin: true,
scrub: 0.3, ... })`, with a SEPARATELY created `gsap.timeline({ scrollTrigger: st
})` pointed at that already-built instance. The pin half worked on its own (a bare
`ScrollTrigger.create()` with `pin: true` genuinely pins), which is exactly what
made this hard to isolate from the pin succeeding — but nothing actually wires an
*existing* ScrollTrigger to drive a timeline's scrub that way. The timeline had no
`paused: true` and no real scrub link, so it simply autoplayed to its end the
instant it was constructed.

Fixed per GSAP's own documented pattern: pass the `scrollTrigger` CONFIG OBJECT
directly into `gsap.timeline({ scrollTrigger: {...} })`, which constructs one
correctly-linked trigger internally, rather than building a trigger separately and
attaching it after the fact. Re-verified: gentle scrolling now shows `x` advancing
proportionally tick by tick, matching real scroll input 1:1.

### B21 — tabbing to an off-screen Experience card fought the pin — **FOUND AND FIXED, Stage 3 Task 9**

Found via a real keyboard Tab walk, not assumed. Every card was `tabIndex={0}`
regardless of its current scrub position, so Tab could land on one sitting well
off-screen — transform-hidden by `.experience-viewport`'s `overflow: hidden`, not
actually visible. The browser's native "scroll the newly-focused element into
view" heuristic doesn't know a horizontal CSS transform put it there, so it tried
correcting with a VERTICAL document scroll instead — measured a ~289px unwanted
`scrollY` jump from a single Tab press, visibly fighting the pin.

Fixed by toggling each card's `tabIndex` (`0` or `-1`) from the same per-frame
distance-from-center calculation that already drives the center-focus
scale/opacity emphasis — cards below a visibility threshold (`falloff <= 0.15`)
leave the tab order entirely, so Tab simply never lands on one and the browser
never has a reason to try correcting anything. Re-verified with a real Tab walk
starting from the active card: only small, expected scrollY nudges (a few px,
matching legitimate scrub progress) while tabbing among Experience's own visible
cards; Tab correctly hands off to normal page navigation once nothing else in the
section remains tabbable.

### B22 — Experience's active card sat 150-175px off-center on arrival, and the first fix attempt froze scroll entirely — **FOUND AND FIXED, Stage 3 Task 9**

Reported live, not caught in idle testing — "the pin... doesn't look centered on
my MacBook 13-inch M2." Confirmed at three real MacBook-class viewports
(1280×800, 1440×900, 1512×982): the active card's center sat 150-175px left of
the true window center every time, worse at wider viewports, reproducible with
entirely ordinary scrolling. Root cause: real scroll momentum (Lenis's easing, or
just a normal fast trackpad swipe) routinely carries `scrollY` past the pin's
`start` before it visually engages — the browser doesn't stop the instant a
threshold is crossed. Because `scrub` reads real scroll position directly, that
overshoot became real scrub progress on the very first frame anyone saw the
section pinned, before any deliberate scrub input.

**First fix attempt caused a worse bug.** Copied the technique About's Task 5
hold (and this same task's own initial entrance-pin draft) already use for this
exact class of problem: `lenis.scrollTo(self.start, { immediate: true, force:
true })` inside the pin's `onEnter`. This completely froze scrolling — Playwright
confirmed `scrollY` stuck at an identical value across 15 consecutive wheel ticks,
zero movement. Root cause of THAT: About's hold calls `lenis.stop()` immediately
after its own snap, so nothing can re-enter afterward; this filmstrip's pin never
stops scroll at all (scrub needs to stay live), so an `immediate: true, force:
true` Lenis `scrollTo` fired from INSIDE a scrollTrigger callback that's itself
mid-way through processing a live scrub synchronously re-enters Lenis's own scroll
handling — confirmed by isolating the single line: removing it alone restored
normal scrolling immediately, re-adding it reproduced the freeze on demand.

**Shipped fix never touches real scroll position.** An `ENTRY_BUFFER` (220px) of
scroll is silently absorbed by the timeline itself: every real tween (track `x`,
rail draw, dot motion path) starts at time `ENTRY_BUFFER` rather than 0, so
nothing is scheduled during that window and the track simply holds its pre-scrub
state through it — however much momentum carried the user across `start`, the
first 220px of it produces zero visual movement. Re-verified centered (0.02px off
true center) at all three MacBook viewports after the fix, using the same
aggressive continuous-scroll conditions that originally exposed the bug.

A second, related complaint arrived in the same message — "the images are way too
small... you can barely see anything there" — and turned out to share a root
cause with a genuine sizing bug: `.experience-media` was absolutely positioned and
stretched to fill whatever height `.experience-card` happened to have (itself
stretched to fill an independently vh-clamped viewport height), while card WIDTH
was a separate, independent vw-clamp. Nothing tied the two together, so at some
real viewport widths the rendered photo box came out taller than it was wide — a
portrait crop. Fixed by deriving height from width through one fixed
`--experience-media-aspect` custom property (3:2 desktop, 1.2 mobile) instead of
two independently-guessed clamps, making the mismatch structurally impossible
rather than something that has to be independently re-verified at every
breakpoint (the same discipline `--experience-gap`/`--experience-card-w` already
established elsewhere in this file's history).

### B23 — Experience's pin-engage flash, off-center cards (round 2), and a snap that read as a hard lock — **FOUND AND FIXED, Stage 3 Task 9 follow-up**

Three more live reports arrived together after B22 shipped, on the same section.

**The flash.** "Once you scroll down to experience the interaction is kinda
abrupt... kinda glitchy." The pin's `onEnter` ran `gsap.fromTo(viewport,
{opacity:0, scale:0.96}, {opacity:1, scale:1})`, written under the assumption
that this WAS the section's reveal. It wasn't: `gsap.set()` already puts the
viewport at `opacity:1` once, on mount — measured, `opacity` reads `1`
continuously from ~450px away in normal scroll approach, well before the pin
engages. `onEnter` was re-hiding and re-revealing already-visible content at the
exact moment the section became `position:fixed`, measured dipping to
**opacity 0.844** mid-fade right at that instant — the flash. Fixed by dropping
opacity from the callback; a scale-only settle (`0.985 → 1`) keeps the "it
caught" cue without touching opacity.

**Off-center again, worse.** B22's fix (the `ENTRY_BUFFER`) solved momentum
overshoot, but a separate cause remained: `.experience-section` (the pinned
element) had no `min-height`, so it was only as tall as its own content, leaving
~90px of dead space below it for the whole pin duration on a 900px window. First
attempt — `min-height: 100(d)vh - navbar-height` plus centering title+viewport as
one flex block (the `#about` precedent) — actually made the viewport's own
offset from true center WORSE (582 vs. a true 522), because the title only ever
sits above the viewport, never below it, so centering the combined block still
leaves the viewport itself below the block's center by roughly half the title's
footprint. Landed on centering `.experience-viewport` independently via
`position: absolute; top: calc(50% - height/2)`, title left in normal flow at
the top, entirely decoupled from where the viewport centers. Deliberately not
`transform: translateY(-50%)` — `experience.jsx` runs `gsap.set/to` with `scale`
on this same element, and GSAP's own inline `transform` write silently
overwrites a stylesheet transform the instant either runs (confirmed: tried
`translateY(-50%)` first, watched it snap back to the top the moment
`gsap.set()` fired on mount). `top: calc(...)` never touches `transform`, so
nothing conflicts. Also caught in the same pass: the `min-height` needed
`box-sizing: border-box` — without it the section rendered 820px against a
756px `min-height` (the 64px gap exactly matching top+bottom padding), the same
gotcha `.navbar` already carries a comment about. Re-verified at three real
viewports post-fix, card-center-vs-true-center: 1440×900 → 0.01px, 1280×800
(MacBook 13" M2, the viewport named in both rounds of feedback) → 0.02px,
390×844 → 0.0px.

**The snap.** "I get in between years and then it locks... doesn't feel that
natural." The snap used `SIGNATURE_EASE`, which by design (see its own comment
in `lib/gsap.js`) front-loads almost all its motion into the first third of the
duration — the right character for instant UI feedback, but for a scrub settling
to rest it reads as a lunge-then-hold. Added a second `CustomEase`,
`filmstripSettle` (`cubic-bezier(0.215, 0.61, 0.355, 1)`, standard
"easeOutCubic"), spread evenly across the duration instead of front-loaded, and
raised snap duration `0.3s → 0.45s`. Verified by sampling the track's live
transform every 20ms through a stop-and-settle: the new curve still moves
visibly in its final ~100ms rather than reading as an instant stop. Flagged as
the hardest of the three to fully close with a number — it's a feel complaint —
so this is the direct, verifiable half of the fix; worth a real live re-check.

Full forward/backward scrub re-verified after all three fixes (all six entries,
both directions, matching role names in order), pin-release into `#my-taste`
re-confirmed reachable, lint and build both clean.

### B24 — site-wide scroll had an ~824ms input-to-settle lag — **FOUND AND FIXED**

Live feedback, page-wide rather than tied to one section: "the render when we
scroll down is not that smooth." Measured both plausible causes before
touching anything, since jank and lag need opposite fixes and "not smooth"
doesn't distinguish them:

Frame timing ruled out first — a CPU-throttled (4x) rAF-delta trace across a
full top-to-bottom scroll (871 frames) showed zero frames over the 16.7ms
budget, worst case 17.7ms. Not a rendering-performance problem.

Input lag confirmed instead: `smooth-scroll.jsx` constructs its `Lenis`
instance without an explicit `lerp`, so it ran at Lenis's own default (0.1).
A decisive 5-tick wheel gesture (finished by ~64ms) took **824ms** to settle
within 1px of its final scroll position — measured by polling `scrollY`.
That's the complaint: not choppy, syrupy — the page keeps visibly coasting
for the better part of a second after the user stops interacting.

Fixed by setting `lerp: 0.2` explicitly. Same measurement, same gesture:
**463ms** to settle, a 44% cut, while still keeping visible momentum (not
tuned close to 1:1 native scroll, which would remove the reason Lenis exists
here at all). Bracketed with 0.18 (519ms) and 0.25 (368ms) before landing on
0.2 as the middle point — this is a feel tuning, not a bug with one correct
answer, so it's worth a live gut-check.

Re-verified nothing keyed off the old implicit default: About's scroll-hold
(a hard `lenis.stop()`, unrelated to lerp) still plateaus correctly ~2.9s;
Experience's pin/scrub (Stage 3 Task 9) still scrubs and snaps correctly both
directions, all six entries; frame timing re-checked post-change, unchanged.

### B25 — `#my-taste`'s new layout overflowed the viewport at phone widths — **FOUND AND FIXED, Stage 4 Task 1**

Caught by the mobile screenshot the task's own verification step asked for, not
by the desktop one — support-act names and setlist rows bled off both edges of
a 390px viewport. Two compounding causes, both already-documented gotchas in
this file recurring in new selectors:

1. **`.my-taste-setlist-item`'s flex row had no `min-width: 0`.** Flex items
   default to `min-width: auto`, which means "never shrink below my own
   content's intrinsic width" unless overridden. A long track/artist
   combination ("I Ran (So Far Away) - Single Edit" × "A Flock Of Seagulls")
   doesn't fit one line at phone widths, and without the override the row
   refused to shrink or wrap — it just overflowed instead. Fixed with
   `flex-wrap: wrap` on the row plus `min-width: 0` on the two text children,
   so the artist drops to its own line when it doesn't fit.
2. **That overflow cascaded.** Nothing on this page clips `overflow-x`, so the
   oversized setlist row silently widened what every OTHER child in the
   section measured "100%" against — the support-act list overflowed too, even
   though its own `flex-wrap` was correctly configured and not itself at
   fault. One root cause, two visibly broken lists.
3. **Fixing it exposed a second, unrelated bug**: adding horizontal padding to
   `.my-taste-section` (itself needed regardless, content shouldn't touch the
   true edge) revealed the section had no `box-sizing: border-box` — the exact
   gotcha `.navbar` and `.experience-section` (`B23`) already carry comments
   about, a third time now in a third file. `width: 100%` (from the
   `content-column` mixin) plus content-box padding rendered the section
   48px wider than its own container (measured: 438px on a 390px viewport,
   exactly 100% + 2 × 24px). Fixed the same way as the other two.

Re-verified with zero overflow at 320/375/390/480/768/1024/1440px, and via a
full DOM sweep for any element crossing the viewport's left/right edge (none,
post-fix — 17 elements flagged before). Worth carrying forward as a pattern:
any new section using `width: 100%` (directly or via `content-column`) needs
`box-sizing: border-box` the moment padding is added to it, and any flex row
holding two pieces of unpredictable-length text (not a fixed label) needs
`min-width: 0` on its shrinkable children from the start, not discovered via a
mobile screenshot after the fact.

### B26 — `#my-taste`'s headliner photo placeholder was visually invisible in dark theme — **FOUND AND FIXED, Stage 4 Task 2**

Found by looking at the first screenshot, not by measurement — the headliner
card's placeholder photo slot rendered as a near-black rectangle
indistinguishable from the card behind it. Root cause: the placeholder reuses
`colorwayFor(id)` + `var(--vinyl-N)` exactly as `vinyl-record.jsx` does (per
the task's own brief — don't invent a second tinting mechanism), and this
particular headliner's id hashes to colorway 1, `--vinyl-1`, main.scss's own
"classic black." That's deliberately near-invisible against a dark turntable
deck — correct there — but the same token reused as a large flat rectangle
next to `#my-taste`'s own card background (also dark in dark theme) reads as
a missing/broken box instead of "black vinyl." A small record label never has
to solve this; a large placeholder rectangle does.

Fixed without touching the tinting mechanism at all (the brief's own
constraint): added a theme-derived, low-opacity inset border to every photo
slot — `box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--text-color)
38%, transparent)` — so a slot's own boundary reads clearly regardless of how
close a given colorway lands to the card behind it. `colorwayFor` and
`var(--vinyl-N)` are unchanged; only the slot's own edge got a border.

A second pass, same screenshot: the headliner name (Anton, the card's most
important text after the photo) read visually small relative to how much
card it was competing with. Traced to the photo slot's own `aspect-ratio`:
started at 4/5 (poster-portrait), which ate almost the entire card's height
and crowded the name into a thin strip at the bottom. Changed to 4/3 and
raised the name's font-size clamp
(`clamp(1.75rem,3.4vw,2.75rem)` → `clamp(2rem,4.2vw,3.5rem)`) so the name
carries some of "headliner reads as dominant" too, not just the photo.

Not a contrast-ratio bug in the WCAG sense — re-measured directly (not
eyeballed) after fixing a separate bug in the *measurement itself*: computed
colors from a `color-mix()` value at rest return as `color(srgb 0.91 0.91
0.93)` (0–1 scale), not `rgb(232, 233, 238)` (0–255) — the exact notation
gotcha `D8` already documents. A first pass parsed those digits as if they
were already 0–255 and reported 1.12:1 (i.e., "invisible") for text that was
clearly legible in the screenshot sitting right next to that number.
Corrected the parser to detect and scale `color(srgb ...)` values; real
contrast is 15.10–15.43:1 for primary text, 6.79–6.82:1 for secondary, both
themes — comfortably passing, nowhere near the failure the unfixed script
reported. Recorded here so the next contrast measurement in this codebase
checks for this notation before trusting a low number.

> **Update, Task 3 (2026-08-15) — border fix explicitly re-evaluated, kept.**
> Task 3's brief asked directly: now that real duotoned photos sit in these
> slots instead of a flat fill, is the border still earning its keep, or was
> it only ever a placeholder-era patch? **Kept, not silently carried over.**
> Reasoning: the border is no longer needed for the *happy path* — a real
> photo has its own luminance variation that reads as a visible edge against
> the card regardless of colorway — but Task 3 introduces a live failure mode
> that didn't exist before (a present image URL that fails to load, `onError`)
> which lands on the exact same flat-`--vinyl-N` fallback this bug was
> originally about. Confirmed directly, not assumed: forced the headliner
> (id hashes to colorway 1, same "classic black" case as the original bug)
> into that fallback via a mocked API response and screenshotted both themes
> — the border is what keeps that fallback card's edge legible, dark theme
> especially. Applied unconditionally (not just when the fallback renders) on
> purpose, so a slot never visibly changes shape between its image and
> fallback states.

### B27 — `#my-taste` photos: ~2 in 5 landed on a plain gray duotone wash — **FOUND AND FIXED, Stage 4 Task 3.6**

Direct user feedback: some album/artist photos in `#my-taste` rendered visibly gray
instead of colored. Root cause: every photo gets `grayscale(1)` then a color wash
blended back on top via `mix-blend-mode`, using whichever `--vinyl-N` token
`colorwayFor(id)` assigns. Two of `colorwayFor`'s five tokens — `--vinyl-1` ("classic
black") and `--vinyl-5` ("marbled smoke") — are *deliberately* near-neutral, correct for
an actual vinyl pressing on the turntable elsewhere on the site, but there's barely any
color in them to blend back onto a photo. With five roughly even buckets, ~2 in 5 photos
hit this by construction, not chance — confirmed live: Oasis's own real artist id (the
headliner in this session's data) hashes to `colorwayFor` 1.

Fixed scoped narrowly, per the brief: `colorwayFor` itself is untouched (still correct
for the turntable's own `VinylRecord`, byte-for-byte unchanged). Added
`photoColorwayFor(id)` (`vinyl-record.jsx`) — the *same* `hash32(id)` mixing, remapped
into 3 buckets instead of 5, restricted to the tokens that read as genuinely colored on
a photo: amber (`--vinyl-2`), oxblood (`--vinyl-3`), midnight blue (`--vinyl-4`). Not a
second hash implementation, just a narrower output range on the existing one.
`my-taste.jsx`'s `PhotoSlot` is the only call site that changed, from `colorwayFor` to
`photoColorwayFor`.

Verified two ways: a standalone reimplementation of both functions run against ~20 real
and synthetic ids confirmed `photoColorwayFor` never returns 1 or 5 (bucket distribution
6/6/8 across the sample — no lopsided skew toward one of the three), and that
`colorwayFor`'s own output space is completely unaffected by the change (the same ids
that hash to 1 or 5 under `colorwayFor` still do). Live screenshots, both themes, confirm
no gray photos across the wall or the setlist's thumbnails.

### B28 — `#my-taste` setlist card overflowed 8-11px at 1024/768px — **FOUND AND FIXED, Stage 4 Task 3.6**

Introduced and fixed within the same task. Task 3.6's own rebuild of the crate's setlist
card added `.my-taste-card--setlist { width: 100%; }`, reasoning it was a harmless,
explicit statement of what the layout already did implicitly. Measured live instead of
assuming: it caused 8px of horizontal overflow at 1024px, 11px at 768px.

Root cause — the fourth occurrence in this codebase of the "`width: 100%` + margin or
padding" overflow class `.navbar`'s and `.experience-section`'s own comments already
document (previously also `#my-taste`'s own section wrapper, Task 1, `FINDINGS.md` B25):
`.my-taste-crate`'s flex `align-items: stretch` default already sizes the card to fill
the container's width *minus* the card's own margin (`--space-3`, `.my-taste-card`'s own
rule); an explicit `width: 100%` on top of that claims the *full* container width in
addition to that same margin, so the card's true footprint (width + margin) exceeds its
container by ~24px. Only visible at 1024/768px — at 1440/1280px there's enough slack
around the section's own `max-width`-capped content column to absorb it invisibly, which
is exactly why a visual check alone didn't catch it.

Fixed by deleting the `width: 100%` declaration — flex `stretch` was already correct
without it. Re-verified 0px overflow at all 8 widths this project checks, 320–1440px.

### B29 — Experience's title overlapped the cards on real windowed-browser heights — **FOUND AND FIXED**

Live report: "the experience title is overlapping the display cards." Reproduced and
measured, not just eyeballed — at a set of ordinary windowed-browser heights (not
exotic ones — a laptop's *visible* content height after browser chrome routinely lands
well under its full screen height), `.experience-title`'s bottom edge sat BELOW
`.experience-viewport`'s top edge:

| Viewport | Overlap |
|---|---|
| 1440×800 | 31px |
| 1440×700/660/600 | 55px |
| 1280×800 (MacBook 13" M2 — the reference size `STATUS.md`'s own B15/B22 history
  already uses) | 13px |
| 1280×700/600 | 55px |
| 1024×768 | 0.25px |
| 1024×660 | 54px |
| 768×700 | 5.5px |
| 390×600 | 21px |
| 320×568 | 14.5px |

Root cause: Stage 3 Task 9's own centering fix ("id like to center the cards more to
the middle") absolutely-positioned `.experience-viewport` and centered it via
`top: calc(50% - height / 2)` against `.experience-section`'s TOTAL height —
deliberately blind to the title, which sits above it in normal flow. That's safe only
as long as the section is tall enough that a section-center offset always lands below
the title's real flow height. It isn't, reliably: `--experience-vp-height` is a fixed
formula independent of viewport height, while the section's own height
(`100vh - navbar`) shrinks with the window — so on a short-enough window the
mathematically-centered box rises above the title.

Fixed structurally, not by clamping `top` against a second guessed pixel floor (which
would repeat the exact "two guessed numbers drifted apart" mistake
`--experience-vp-height`'s own comment already warns about): `.experience-section` is
now a flex column (title, `flex-shrink: 0`, always first; a new
`.experience-viewport-shell`, `flex: 1 1 auto; min-height: 0`, absorbing whatever
vertical space is actually left). The shell centers the untouched, still-exactly-
`--experience-vp-height`-tall `.experience-viewport` within that real, browser-computed
remainder — real layout arithmetic instead of a number that has to be re-verified by
hand at every breakpoint. `.experience-viewport` itself, and everything inside it
(track/rail/cards, the tuned `--space-7` headroom math the rail's alignment depends
on), is unchanged — only where the box sits moved, not its own size or the mechanism
GSAP scales for the pin-engage flourish.

Re-verified: 0px overlap at all 17 width/height combinations above (including the
worst ones), 0px overlap sampled continuously through an actual scroll-driven pin
engagement (not just a hash-jump snapshot), 0px new horizontal overflow at the
project's usual 320–1440px sweep, the reduced-motion `ExperienceStatic` fallback
unaffected (plain document flow, no absolute positioning to begin with), and the
pre-existing ~13px rail/date-badge vertical offset confirmed unchanged (present
identically before this fix — not something this touched). Screenshots:
`b29-experience-title-overlap-fixed-macbook13-{dark,light}.png`.

### B30 — `#my-taste`'s pin never engaged on a fresh page load — **FOUND AND FIXED**

Live report: "when we reload the page and we scroll down the section is not pinned."
Reproduced with Playwright (fresh navigation, then realistic wheel-driven scroll down to
the section, sampling `getBoundingClientRect().top` continuously — the same
implementation-agnostic method Task 4's own B-history already established, since this
site's transform-based pinning never flips `getComputedStyle().position` to `"fixed"`):
confirmed live — no plateau at all, `top` just kept decreasing in lockstep with
`scrollY` the entire way through, exactly as reported.

Root cause, isolated with a live `ResizeObserver`/poll instrumentation pass (not
guessed): `#my-taste`'s own `ScrollTrigger.create({ pin: true, ... })` runs inside an
effect gated on its Spotify fetch resolving — a variable-timing async event, not a fixed
point in the mount sequence. `pin: true` measures the trigger's start/end position and
builds a pin-spacer sized to the section's height ONCE, at that exact moment. A body-
height poll showed the page's total height was still growing for roughly 80ms *after*
`#my-taste`'s own pin-spacer had already been created — traced to this section's
self-hosted, section-scoped webfonts (Anton/Oswald/Space Mono, first used starting here)
finishing their swap-in a beat after first paint and reflowing the card/track text taller
than the pre-swap fallback-font layout. The cached pin measurement (`self.start`) ended
up ~144px short of the section's real, settled position — enough that the whole
`end: "+=200"` engagement window was consumed by the time the visitor's continued scroll
actually reached the section, which reads exactly as "the pin never engages." (A second,
related risk confirmed in the same pass but not the actual trigger here this time:
`experience.jsx`'s own pin-spacer, built unconditionally on mount, can also insert and
shift later content after a downstream section's trigger was created — the fix below
covers that class of bug too, not just this one instance of it.)

Fixed in `smooth-scroll.jsx` (the one place that already owns `ScrollTrigger`'s lifecycle
for the whole app), not `my-taste.jsx` alone — a page-wide `ScrollTrigger.refresh()`
re-measures *every* currently-registered trigger, so this self-heals any section's stale
pin, not just this one. Two triggers, debounced together (200ms — comfortably past the
~80ms of post-creation growth measured live): `document.fonts.ready`, targeting the
confirmed mechanism directly, and a `ResizeObserver` on `document.body` as the general
safety net for anything else (a future section, a slow image without a reserved
`aspect-ratio`, another sibling's pin-spacer) that shifts total page height after a
trigger already exists.

Re-verified: fresh-navigation + realistic wheel-scroll repro now shows a genuine
plateau — `top` frozen while `scrollY` also stays frozen (the entrance's own
`lenis.stop()` hold), then both resume together once the cascade completes and the pin
releases. Re-ran a 5-second `document.documentElement.scrollHeight` poll to confirm the
new `ResizeObserver` doesn't loop against its own `ScrollTrigger.refresh()` calls —
settles once and stays flat. Full-page console/pageerror sweep across a complete
top-to-bottom scroll: clean. `npm run lint`/`npm run build` unaffected (baseline 7
errors/2 warnings held).

### B31 — `#my-taste`'s setlist rows could orphan the track index onto its own line — **FOUND AND FIXED**

Found investigating a live screenshot report (mobile, 390px) of the setlist rows'
wrapping looking cramped. Measuring the actual rendered boxes (not re-trusting the
"expected, deliberate" read `FINDINGS.md` B25's own wrap fix already established) showed
something worse than tight spacing for a long track title ("I Ran (So Far Away) - Single
Edit"): the row's three children (index, track, artist) were three *independent* flex
items on `.my-taste-setlist-link`'s own `flex-wrap`. The browser measures each item's
max-content width to decide what fits per line; the index+track pair didn't fit
together, so they landed on separate lines — the index number ("4") rendered alone,
orphaned above its own track name, not merely "the artist wrapped down."

Fixed by grouping index+track into one nested flex unit
(`.my-taste-setlist-main`, `my-taste.jsx`/`main.scss`) so they're a single atomic item on
the outer row's flex-wrap — they can no longer split from each other; only the artist
(still independent) drops to its own line when the row doesn't fit, and the track's own
text still wraps internally via its existing `min-width: 0`. Also bumped the row's
`gap`'s row-gap term (`--space-2` → `--space-3`) — before this, a wrapped line sat the
same 8px from the line above it as from the row's own bottom padding to the divider
below, so a two-line row didn't visually read as "this is still one row." Only the
row-gap changed; column-gap (single-line spacing, the common case) is untouched.

Re-verified live at 390px with real box measurements: every row's index+track now share
one line (or index+track's first line, if the track itself wraps internally) — no
orphaned index at any of the five real tracks tested. `npm run lint`/`npm run build`
unaffected.

### B32 — `#my-taste`'s pin-hold silently skipped itself on ordinary desktop window heights — **FOUND AND FIXED**

Live report, after B30 had already shipped: "I asked you to pin the section when I
scroll down so I can see the animation" — on a normal desktop window, not mobile. Ruled
out a B30 recurrence first (an automated check against both local dev AND the live
production site showed a clean pin-and-hold at 1440×900, including under an aggressive
fast-flick scroll), which meant something else was going on. Found live, testing across a
range of ordinary (not maximized-fullscreen) window heights at 1440px wide: `onEnter`'s
own "don't trap the visitor" safety net (`sectionHeight > available`) compares this
section's height — fixed at ~631px, it doesn't shrink with the window — against
`window.innerHeight - navbarHeight`. That comparison passes fine at 900px tall (available
756px), but FAILS at 700px (available 556px), 660px (available 516px), and 600px
(available 456px) — all three genuinely ordinary browser-window heights (the same
reference range `FINDINGS.md` B29 already used for Experience's own overlap bug), not
edge cases. On any of them, the safety net's strict check silently took the "don't hold"
branch: the entrance cascade still played, but scroll was never actually captured, which
reads exactly as "the pin isn't working" to a visitor on a completely normal laptop
window.

Fixed by widening the safety net's own tolerance rather than removing it — the underlying
concern (a section dramatically taller than the viewport trapping a visitor against
content mostly cut off) is still real at the extreme end, just not at the 22-38% overflow
these three ordinary heights actually produce. `SAFETY_NET_OVERFLOW_ALLOWANCE = 1.6`
(`my-taste.jsx`): the hold now engages as long as the section is under 60% taller than
the available space, comfortably covering the whole 600-900px range measured live while
still bailing out on a genuinely pathological short window (e.g. ~480px tall, ~88% over,
still skips the hold).

Re-verified live at all four heights (900/700/660/600px, 1440px wide): every one now
shows a genuine hold (`getBoundingClientRect().top` frozen at 144px — navbar height — for
dozens of consecutive samples) followed by a clean release once the cascade completes.
`npm run lint`/`npm run build` unaffected. Note: `about.jsx`'s own hold carries the
identical strict-threshold pattern this bug came from — not touched here (out of scope,
this report was specifically about `#my-taste`), but worth the same live height sweep
before assuming it's fine.

### B33 — `#projects` overflowed the mobile viewport by exactly 2×`--space-6` — **FOUND AND FIXED, Stage 3 Task 10**

Introduced and caught within the same task, not a pre-existing bug. Reconciling
`.portfolio-section`'s content column to the shared `--content-width` token (per the
brief) meant adopting `@mixin content-column`, which sets `width: 100%` — the OLD rule
had no explicit `width` at all, so its own `max-width: 800px; margin: 0 auto;` relied on
`width: auto`'s built-in behaviour of subtracting padding automatically. Combined with
this same rule's own `padding: var(--space-6)` (32px) under the default `content-box`,
`width: 100%` plus that padding adds up to MORE than 100% of the available width — the
exact `box-sizing` gotcha `FINDINGS.md`/`STATUS.md` already document for `.navbar`
(Stage 0 Task 5): no global reset exists in this file, so it's opt-in per rule that
combines `width: 100%` with its own padding. Measured live: 454px `scrollWidth` against a
390px `clientWidth` — 64px of horizontal overflow, exactly 2×`--space-6`'s 32px. Fixed
with an explicit `box-sizing: border-box` on `.portfolio-section`. Re-verified: 390 = 390,
zero overflow, both the section's collapsed default state and with a row open.

### B34 — `.portfolio-header`'s hover `scale` had always been slightly broken, and a Flip requirement made it visible — **FOUND AND FIXED, Stage 3 Task 10**

`.portfolio-header:hover` has carried `scale: (1.1)` since before this task — confirmed
live it actually parses and applies (computed `scale: 1.1`, the parens are stripped, not
a syntax error) — scaling the whole `justify-content: space-between` header row 10%
larger on hover. Harmless before this task because nothing constrained the row's
overflow, so the extra 10% simply spilled silently past the row's own box. This task's
own Flip-based accordion swap needed `.portfolio-item` (the row) to be `overflow: hidden`
so the height tween reads as a clean reveal instead of content spilling past the row
mid-animation — and that same `overflow: hidden` now also clips the *header's* own
pre-existing hover scale, visibly cutting off the start and end of the title/role text
(confirmed live: "Harmoni - Music Dating App" rendered as "armoni - Music Dating App",
missing its first character, "FrontEnd Developer" missing its last three). Fixed by
removing the scale from the hover rule rather than working around the clipping — a whole
text row growing 10% on hover was an odd effect in its own right, independent of this
interaction, and the rule's remaining `opacity`/`color` change plus this same task's new
left-edge accent bar (`::before`, `scaleY` 0→1) is a complete hover treatment without it.
Re-verified: hover no longer clips either row, both project titles and role labels
render in full.

### B35 — `#projects`' Flip swap animated toward a target that was already stale by the time it started — **FOUND AND FIXED, Stage 3 Task 10.1**

Follow-up brief reported the Flip swap "doesn't feel smooth," naming two suspected
causes (missing/default duration+ease, `Flip.getState()` scoped to only the clicked
row). Neither matched the tree: duration/ease were already explicit (just the wrong
values — `0.5`/`SIGNATURE_EASE` vs. the intended `0.4`/`power2.inOut`), and
`getState()` was already scoped to the whole list, not just the toggled row. Live,
per-frame tracing (`getBoundingClientRect()` + inline-style snapshots on an uninvolved
sibling row, sampled every frame across the swap) found two real, different causes
instead:

1. **Not a bug — a Playwright test artifact.** The first trace showed a sibling row
   jump 677px instantly, before any tweening began. Cause: the clicked row's header sat
   below the 900px test viewport, and Playwright's own `.click()` auto-scrolls
   off-screen targets into view before dispatching — a real page scroll, unrelated to
   Flip. Confirmed by dispatching the click directly in-page (bypassing Playwright's
   actionability scroll): `scrollY` never moved. Never visible to a real visitor.
2. **The real bug.** `Flip.from()` re-measures its "after" target synchronously, inside
   the same click handler as the `flushSync()` commit — before the browser has settled
   the newly-mounted `<video>` element's real rendered size on that first layout pass.
   `.portfolio-video` was `width: 100%; height: auto` with no reserved size, so the box
   Flip measures at that exact synchronous instant is smaller than the row's true
   eventual height. Flip tweens correctly toward that (wrong, too-small) target, then the
   row's real natural height applies the instant the tween's own inline overrides
   release — landing as an abrupt, un-eased ~210px snap independent of any duration/ease
   tuning. Confirmed via frame trace: the video's own `readyState` was already `4`
   (fully loaded) by the first sampled frame, ruling out "the video loads mid-tween" as
   the mechanism — the race is in Flip's own synchronous measurement timing, not in how
   long the video takes to load.

Fixed: `duration: 0.4`/`ease: "power2.inOut"` (matching the brief's own cited mockup
values) and `absolute: true` (GSAP's documented fix for list/accordion Flips —
decouples animating rows from native document flow so siblings move off Flip's own
computed delta instead of fighting native reflow) on the `Flip.from()` call; verified
`absolute: true` alone fixed the tween's own shape (confirmed monotonic power2.inOut via
frame-to-frame deltas) but did NOT fix the terminal snap, which is what proved it was a
second, independent cause. The snap itself closed by giving each project's real,
`ffprobe`-measured video dimensions (`videoWidth`/`videoHeight`, ranging 1.78:1–2.06:1
across the four videos — not a guessed uniform 16:9) as HTML `width`/`height`
attributes on the `<video>` element (`projectsData.js`, `portfolio.jsx`) — these
establish intrinsic aspect-ratio synchronously at layout time regardless of load state,
so Flip's synchronous read is already correct on its first measurement. Re-verified:
same per-frame trace with the scroll artifact isolated out shows one continuous,
monotonic curve open and close, ending exactly on the true final value, no residual
jump, in both directions.

### D15 — `RESEND_API_KEY` has been live on Railway, contradicting this project's own outstanding-tasks checklist — **DOCS CORRECTED, Stage 3 Task 11**

Found while rebuilding `#connect`'s form logic (Stage 3 Task 11), whose own brief
warned the contact form "has been returning 503s" and asked for the fail-closed path
to be implemented if the key turned out to be unset. Read `server.js`'s `/api/contact`
route directly rather than trusting that framing: it already fails closed correctly —
`if (!RESEND_API_KEY) return res.status(503)...` runs before anything else in the
handler, with a specific, honest visitor-facing message, no fake success path. Whether
that branch is *currently* live is a runtime fact, not something readable from the
source, so it was checked empirically: an empty JSON payload POSTed directly to
`https://api.diegodamian.com/api/contact` is safe to test with either way (the key
check runs before validation, so this never reaches Resend regardless), and it
returned **`400`** — *"Name, email, and message are all required"* — not `503`. That
response is only reachable once the key check has already passed. Confirmed further
by a real end-to-end test submission through the local dev server, which returned
`{ ok: true }` and landed in the real configured inbox.

This directly contradicts **two** things at once, both of which pointed the same
(wrong) direction: this file's own `STATUS.md` §4 "Outstanding manual tasks" table,
which listed `RESEND_API_KEY` as unset with "Contact form returns 503 until this
lands," and the task brief itself, which was written assuming the same. Neither was
lying — someone set the key on Railway (a dashboard action, outside this repo, with no
commit to catch it) and nothing in this project's own docs got updated to reflect it,
so the next brief was written against stale state. Corrected in `STATUS.md`'s own
outstanding-tasks table (checked off, with this entry's own explanation) rather than
silently deleted — the mismatch itself is the useful part of the record, the same
reasoning already applied to every brief/tree mismatch logged elsewhere in this file.

The fail-closed path itself was still verified independently, not left as "presumably
correct since the code reads right": a second, isolated `server.js` instance was
started on a separate port with `RESEND_API_KEY` explicitly cleared, and it returned
exactly the documented `503` and message. So both states — key live (today's reality)
and key absent (whatever briefs and stale docs assumed) — are now confirmed correct,
not just one of them.

### B36 — `.portfolio-list` collapsed to 0px height for the whole Flip tween, shifting `#connect` and the footer with it — **FOUND AND FIXED, Stage 3 Task 10.2**

Found while building the scroll-into-view feature (Task 10.2), which needed
document-level geometry to stay stable during the ~400ms Flip tween — it wasn't.
`.portfolio-list` has no explicit `position` (defaults to `static`) and no height of
its own; it's sized purely by its children's normal-flow contribution. Task 10.1's
`absolute: true` takes every `.portfolio-item` out of flow **simultaneously** for the
tween, so with nothing pinning the container, it lost all of that contribution at
once. Confirmed live with a frame-by-frame poll: total document height dropped by
~895px the instant the tween started and didn't recover until it finished, with
`#connect` and the footer shifting upward the entire time to fill the gap — a real,
page-wide reflow running underneath the whole interaction, independent of anything
scroll-related. It had no way to surface before this task, since nothing previously
depended on document-level geometry staying stable mid-tween — Task 10.1's own
verification measured a single row's position relative to its immediate siblings, not
the page as a whole. Fixed with GSAP's own documented pattern for this exact Flip +
`absolute` + accordion combination: lock the container to a fixed pixel height for the
tween's duration (whichever of the before/after states is taller, so a taller
incoming row isn't briefly clipped right as Flip's own cleanup returns children to
flow), release it in `onComplete`. Re-verified: total document height stays constant
throughout the tween, confirmed via the same frame-by-frame poll.

### D16 — opening or closing an accordion row moves `window.scrollY` on its own, by a mechanism this session could not identify — worked around, not fixed, Stage 3 Task 10.2

Found while building the scroll-into-view feature. First version computed a scroll
target once, synchronously, right after the DOM commit, and fired it alongside
`Flip.from()`. Live testing found the result unreliable — not by a little, sometimes
by several hundred pixels — and root-causing it turned into its own investigation,
because the actual cause sits outside anything this codebase controls.

**What's confirmed:** opening *or* closing a `.portfolio-item` row measurably and
consistently moves `window.scrollY`, on its own, the instant the row's real content
height changes — reproduced with Flip entirely disabled (`prefers-reduced-motion:
reduce`, a plain `flushSync` state change, zero GSAP involvement), so this isn't a Flip
artifact. **What's ruled out, each checked live, not assumed:**

- **Not any JS call this app makes.** Monkeypatched both `window.scrollTo` and the
  `scrollTop` property setter on `Element.prototype` — zero calls logged during the
  drift, for `window.scrollTo`, Lenis's own internal writes, and everything else.
- **Not CSS scroll anchoring.** Disabled `overflow-anchor` two ways — a real `html {
  overflow-anchor: none; }` rule present from first paint (not injected after the
  fact), and inline `style.overflowAnchor = "none"` forced onto every element in the
  document via `querySelectorAll("*")`. Identical drift either way, pixel for pixel.
- **Not a focus-follow effect.** Reproduced with focus established on the clicked
  button via `.focus()` well before the toggle (no *new* focus event at the moment of
  the layout change), and reproduced again with the button explicitly blurred before
  the layout change fires. Neither changed the outcome.
- **Not this app's own `useHashScroll`** (`hooks/use-hash-scroll.js`) — its own
  `ResizeObserver`-driven correction disarms itself 2 seconds after a hash change; the
  drift persisted even with 5–8 second waits inserted well past that window.
- **Not a Playwright/headless artifact.** Reproduced in headed Chromium with real
  Playwright-dispatched mouse clicks, not just headless with raw `element.click()`.

**Not solved — worked around.** Task 10.2's own scroll-into-view logic no longer
computes a target upfront and races this; it measures the row's real position *after*
Flip's tween (or the reduced-motion state commit) has fully settled, and corrects only
if still needed — full mechanism in `STATUS.md`'s own Task 10.2 entry. That sidesteps
the problem for this feature specifically but doesn't explain what's actually causing
`window.scrollY` to move. Worth knowing for `#my-taste`'s own still-open Task 5 (time-
range switching + `Flip` re-rank, `ROADMAP.md`) — the next place in this codebase a
Flip-driven layout change is likely to reorder/resize content near the viewport edge,
where the same drift would plausibly reproduce.

### B37 — `.contact-section` used a plain `min-height: 100vh`, silently defeating any navbar-aware height check built against it — **FOUND AND FIXED, Stage 3 Task 11.2**

Found building `#connect`'s entry-pin safety net (About's own pattern: skip the hold,
just play the reveal on its own clock, if real content is taller than the space actually
available below the fixed navbar). `#about`/`.about-me-section` both use
`min-height: calc(100vh - var(--navbar-height))` specifically because About's own
onEnter math needs the section's rendered height to reflect the *true* content
floor — its own comment says as much. `.contact-section` had never needed that: nothing
measured its height against anything before this task. Left at plain `100vh`, the
section's rendered height comes out ~`navbarHeight` taller than
`window.innerHeight - navbarHeight` on *every* normal viewport (100vh doesn't know the
navbar exists) — so a safety check comparing the two would read this section as
overflowing on every viewport, always taking the bypass branch, and the hold would never
engage at all, on any screen. Fixed by matching the existing `#about` convention
(`calc(100vh - var(--navbar-height))`, dual vh/dvh declaration, `main.scss`) rather than
inventing a parallel workaround — the check itself was also pointed at
`.contact-container`'s real content height rather than the outer shell either way, since
the shell is deliberately taller than its content via flex-centering regardless of this
bug. Verified live: the safety net correctly reads `bypass: true` on a genuinely short
viewport (1440×480, content 697px vs. 336px available) and correctly reads `false` (hold
engages) at every standard breakpoint tested.

### B38 — copying About/My Taste's overshoot-correction verbatim broke `#connect`'s pin instead of protecting it — **FOUND AND FIXED, Stage 3 Task 11.2**

Both existing timed-hold pins (`about.jsx`, `my-taste.jsx`) call
`lenis.scrollTo(self.start, { immediate: true, force: true })` immediately before
`lenis.stop()`, to correct scroll overshoot before freezing. Copied verbatim for
`#connect` on the reasonable assumption that a shared pattern's own safety mechanism
transfers with it. Live instrumentation (a temporary `onEnter` probe logging
`self.start`, real `scrollY`, and the section's measured `top` at fire time) showed
this doesn't hold here: by the time `onEnter` fires, GSAP's own pin had *already*
snapped the section to its correct pinned position (`top === navbarHeight`) —
confirmed directly, not inferred — because nothing on this trigger scrubs or reads
`self.progress`, so there's no overshoot-dependent visual state for the correction to
protect. Forcing scroll backward to exactly `self.start` landed precisely on the pin's
own start boundary, and per-frame tracing showed that boundary snap made ScrollTrigger
unpin the section on the spot — dropping it into unpinned document flow roughly 200px
away from the correct pinned position for the *entire* reveal, a real, visible jump the
instant the hold engaged, reproduced on every run until the correction was removed.

Fixed by dropping the correction entirely for this pin — `lenis.stop()` alone leaves
the section exactly where GSAP had already, correctly, put it. Re-verified across
repeated runs (fresh nav, and fresh-reload-then-immediate-scroll): pin engages cleanly
at `top === navbarHeight`, zero jump, in every run. Worth remembering for any future
timed-hold pin built by copying this family of code: the overshoot correction is only
meaningful for a trigger whose visual/engage state depends on `self.progress` — not
a blanket requirement of the pattern itself.

### B39 — `.walkman`'s own CSS default fought its settle animation's `clearProps` — **FOUND AND FIXED, Stage 3 Task 12 (the send-success walkman)**

Found live, first real test of the settle phase: after the takeover finished and
`clearProps: "transform"` ran (main.scss's own comment on `.walkman` documents the
full reasoning — same discipline My Taste's own cascade uses so a future transform
on these elements doesn't inherit a stale inline value), the walkman visibly stuck
at HALF size instead of returning to normal. Root cause: `.walkman`'s own default
CSS rule carried a permanent `transform: scale(0.5)` — set there to match the
pop-in's own start state, so nothing would flash at full size for a frame before
JS ran. `clearProps` doesn't remove a rule's OWN styling, only GSAP's inline
override — with no inline transform left, the element fell back to exactly that
stylesheet rule, i.e. `scale(0.5)` forever, not `scale(1)`.

Fixed by dropping the CSS-level `transform` entirely, keeping only
`opacity: 0` as the pre-JS default — `opacity: 0` alone already fully hides the
walkman before `gsap.set()` establishes the real pop-in start values (scale
included), so no CSS-level scale was ever actually needed. Re-verified: settled
`walkmanTransform` reads `"none"` (not a stuck `matrix(0.5, ...)`) across repeated
runs, both a first-ever send and a second send in the same session.

### D17 — a pre-existing, timing-sensitive React crash in `#my-taste`'s `AvatarSlot`, found while regression-testing a different section, not fixed here

Found running an aggressive, bot-paced full-page scroll sweep (every ~30ms, far
faster than a real visitor) while verifying Stage 3 Task 11.2's walkman didn't
disturb anything else on the page. Intermittently — roughly 1 run in 3-4, not
every time — the page throws `Failed to execute 'insertBefore' on 'Node': The
node before which the new node is to be inserted is not a child of this node`,
inside `AvatarSlot` (`my-taste.jsx`), uncaught (no error boundary anywhere in the
tree — `App.jsx` — so React unmounts the whole app on it, per the console's own
"Consider adding an error boundary" note).

Confirmed this is genuinely PRE-EXISTING and unrelated to Task 11.2's own work,
not a regression it introduced, before writing it down as a finding rather than
just fixing it inline: `git stash`'d every uncommitted change from this task and
re-ran the identical sweep against the prior commit (`e5d2f9e`, Task 11.2 alone,
no walkman) — same intermittent failure, same component, same error, at a similar
rate (1 failure in 4 runs). `my-taste.jsx`/`vinyl-record.jsx` were never touched by
this task (only imported `colorwayFor` — a read, not an edit). Likely mechanism,
not yet root-caused: `AvatarSlot` holds `useState(false)` for a failed-image
fallback and a plain `<img onError={...}>` — a classic shape for a lost-race
between an async image event and an unrelated re-render, but this session didn't
chase it further; that's a separate investigation, not this task's own scope.

Not fixed — flagged for whoever next touches `#my-taste`, since a real (if
statistically rare) visitor scrolling normally could plausibly still trigger it,
just far less often than the aggressive test pace that found it. A prerequisite
first step, unrelated to `AvatarSlot` itself: this app has no error boundary
anywhere (`App.jsx`), so ANY uncaught render error currently blanks the whole
page rather than degrading just the one broken section — worth fixing on its own
merits before chasing this specific race further.

### B40 — walkman LCD copy sized/chosen for one 12-character word broke on a longer sentence and on DSEG7's own hard letters — **FOUND AND FIXED, Stage 3 Task 12.1**

A follow-up brief asked for the LCD readout to read "thank you for reaching
out!" (or a final chosen equivalent) instead of Task 12's `"MESSAGE SENT"`.
Two independent, both-real constraints made the literal sentence
unworkable, neither assumed — both confirmed with real screenshots before
picking a replacement:

1. **Length.** The LCD's box and font-size (`.walkman-screen-*`,
   `main.scss`) were tuned in Task 12 specifically against `"MESSAGE
   SENT"`'s 12 characters. The requested sentence is 27 — more than
   double — and clips hard against `.walkman-screen`'s own `overflow:
   hidden` at the same scale; shrinking the font small enough to fit it
   would make it illegible, not just small.
2. **Glyph shapes.** DSEG7 Classic renders T, N and K as distorted,
   non-obvious forms at this size — confirmed by rendering `"THANK YOU!"`
   and bare `"THANKS"` and screenshotting both: neither reads as English at
   a glance, they read as a jumble of unrelated segments. This wasn't
   visible from the source or the font's own name; it only showed up once
   actually rendered at the walkman's real on-page size.

Tried and screenshotted several shorter alternatives before settling on one
— `SUCCESS!`, `ALL DONE`, `RECEIVED`, `CHEERS!` — comparing how cleanly each
rendered. `"CHEERS!"` (`WALKMAN_LCD_TEXT`, `walkman.jsx`) won: it still
functions as a genuine thank-you, and none of its letters (C H E E R S)
touch the three problem glyphs. Re-verified live: `litScrollWidth` 53px
against a 103px-wide screen box (comfortable margin, not a near-miss), and
the ghost layer (derived automatically from the same string) lines up
character-for-character as designed.

### B41 — `#connect`'s entry pin had no explicit `end`, leaving ~940px of dead scroll after the reveal released — **FOUND AND FIXED, Stage 3 Task 12.2**

Reported as "all the space in between projects and Let's Connect." Measured
directly rather than guessed: scrolled to `#connect`, let the entry-pin
reveal finish, then sampled `.contact-section`'s own `getBoundingClientRect().top`
against `window.scrollY` on every following scroll tick. `top` stayed
pinned at a constant value (`navbarHeight`, ~144px) while `scrollY` climbed
from 6534 to 7472 — **938px of scroll where the section visually never
moved at all**, well after the reveal timeline itself had already
completed and `lenis.start()` had already resumed real scroll input.

Root cause: this pin's `ScrollTrigger.create({ ... pin: true, once: true,
... })` (`connect.jsx`) never set an explicit `end`. With none given, GSAP
defaults the pin's own scroll-span to the trigger element's full height —
here, `.contact-section`'s own ~916px — so ScrollTrigger kept the section
visually pinned for that entire span regardless of the fact that nothing
in this pin scrubs against it; the hold's real duration is governed
entirely by `lenis.stop()`/`lenis.start()`, independent of `end`. My
Taste's own pin (`my-taste.jsx`), which this section's comments already
credit as the pattern being followed, sets `end: "+=200"` for exactly this
reason (its own comment: wide enough that a fast scroll can't jump the
`start`-to-`end` span in one tick and skip `onEnter` entirely — not a
hold-duration control). This section copied `pin: true` from that pattern
but never copied the `end` that comes with it.

Fixed by adding the same `end: '+=200'`. Re-measured with the identical
method: the dead zone dropped from ~938px to ~340px (the remaining
distance is real, expected scroll — clearing the now-revealed section
before the next one comes into view — not a leftover bug). Re-verified the
pin still engages correctly under normal scroll and still resolves
instantly under a programmatic nav-click (`isProgrammaticScrollActive()`),
neither of which reads `end` for anything.

### B42 — `.message-cassette textarea` overflowed its own cassette by exactly its own padding — **FOUND AND FIXED, Stage 3 Task 12.2**

Reported as "the border of the text box is bigger than the box itself"
when focused. Measured directly: `.message-cassette` (the visible tape
label) rendered 700px wide; `#message` (the textarea inside it) rendered
**704px** wide — 14px past the cassette's own right edge before any
outline was even drawn, then a further few px once the focus outline
(`outline: 2px solid ...; outline-offset: 2px;`) drew outside that.

Root cause: this file has no global `box-sizing: border-box` reset — it's
opt-in per rule (`.portfolio-section`'s own comment documents the same
gotcha independently). `.message-cassette textarea` sets `width: 100%`
without opting in, so under the default `content-box` model, the
textarea's own horizontal padding is added ON TOP of that 100% instead of
being carved out of it — the overflow (24px, after Task 12.1's own padding
increase from 8px to 12px a side) is exactly 2× the textarea's own
horizontal padding. This was already a smaller version of the same bug
since Task 12 shipped (2×8px = 16px overflow at the original padding);
Task 12.1's padding increase made it worse, it didn't introduce it.

Fixed with one line, `box-sizing: border-box;` on `.message-cassette
textarea`. Re-measured: textarea width now matches the cassette's own
680px content-box exactly, `overflowsRight`/`overflowsLeft` both `false`,
and the focus outline now sits fully inside the cassette's own border on
all sides (screenshotted at 2x device scale to confirm).

### D18 — two of three brief-reported walkman bugs did not reproduce; investigated rather than assumed, Stage 3 Task 12.1

The same follow-up brief that led to B40 also reported two other bugs in
`#connect`'s walkman: stale compose-box text left in the DOM after a send,
and the settled walkman auto-reverting to hidden/idle after roughly two
seconds. Both were investigated empirically before writing any fix — per
this project's own working agreement, a brief's description of "the
current code" is a claim to verify against the tree, not a given — and
neither reproduced:

- **"Stale text left behind."** The brief describes the compose box as
  hidden via opacity/display while old field values persist underneath.
  The actual code (`connect.jsx`) already renders `status === 'sent' ? <
  success> : <form>` — a real conditional, not a CSS hide — so the form,
  and the textarea inside it, are genuinely removed from the DOM the
  instant a send succeeds, not just visually covered. Verified directly:
  submitted a message containing a unique marker string, then dumped
  `.contact-container`'s full rendered text and queried `#message`
  immediately after Phase 1 and again after full settle — the marker
  never appeared anywhere on the page, and the textarea query returned
  `null`. Repeated across a full two-cycle run (first send, click "send
  another message," second send with a *different* marker) specifically
  to rule out a second-cycle-only variant — neither marker ever leaked
  into the DOM at any point.
- **"Auto-reset after ~2 seconds."** Grepped this project's entire
  `client/src/` for `setTimeout`/`setInterval` — five real call sites
  exist elsewhere (navbar theme-switch flag, hash-scroll settle, smooth-
  scroll's `ScrollTrigger.refresh` debounce, record-crate's search
  debounce, turntable-audio) and none of them touch `connect.jsx`,
  `walkman.jsx`, or `lib/gsap.js`. Held the settled walkman under live
  observation for 30+ seconds after a first send, and again after a "send
  another" + second send — both times `.walkman`'s computed `opacity`
  stayed `1`, `.contact-form` never re-appeared unprompted, and the EQ
  bars' own transform kept changing between samples (the idle loop
  provably still running, not stalled and misread as "settled").

No code was changed for either — there is nothing in the current
implementation that produces either symptom. The likeliest explanation on
hand, not confirmed as the actual cause: this project's own documented trap
of testing against `npm run preview` (port 4173) instead of the dev server
(5173) — CLAUDE.md already flags that port for producing failures in
`#my-taste` and the record crate that "read exactly like a real bug and
isn't one." `#connect` wasn't previously known to be sensitive to that same
distinction, but nothing ruled it out either, and it fits: a build served
from the wrong origin could plausibly manifest as a send that never really
completes (read as "reverts") or as stale UI from a failed fetch. Left as
an open note for whoever next touches this section, rather than chased
further, since it isn't reproducible against the environment this project
treats as ground truth (5173/5050, per CLAUDE.md).

### D14 — a scroll captured by a section's own hold can only be released by that section's own escape hatch, and only programmatic scrolls trigger it

Found while re-capturing `#projects`' screenshots (Stage 3 Task 10), not a live-visitor
bug — but a real gap in how `about.jsx`'s (and `my-taste.jsx`'s) scroll-hold decides
whether to hold at all. Both check `isProgrammaticScrollActive()` (`lib/scroll.js`) and
skip holding if true, specifically so a nav click carrying a visitor straight through a
hold-gated section toward another one doesn't trap them for its full ~2.9s entrance. That
flag is only ever set by this app's OWN `scrollToSection()` — a scroll reaching the same
position through any OTHER means (a raw `element.scrollIntoView()` call, a browser
extension, assistive tech jumping to a landmark) looks identical to an organic visitor
scroll to this check, so the hold engages for real. If that hold-triggering scroll can't
be followed by real, sustained wheel/touch/keydown input (the hold's own release
mechanism, alongside its own timeline finishing) — which a one-shot programmatic jump
generally can't — the section stays captured with no way out. Reproduced concretely: this
project's own `design-review/capture-screenshots.mjs` used `el.scrollIntoViewIfNeeded()`
to reach `#projects`, whose real DOM position sits below `#about`; that jump crossed
About's hold trigger, engaged it (Lenis stopped, scroll pinned at `scrollY: 910`), and the
page never moved again — confirmed live, stuck at the identical position even 3.6s later,
well past the hold's own ~2.9s bound. Worked around in the capture script itself by
navigating through the real nav link instead (`element.click()` on `a[href="#id"]`, which
IS tracked as programmatic) rather than a raw scroll — full writeup in `STATUS.md`'s own
dated entry. Not fixed at the application level: no real visitor scrolls 5000+px in a
single instantaneous native jump the way only test automation does, so this isn't scored
as a live bug. Worth revisiting if this site ever grows a skip-link, in-page search, or
any other jump-to-section feature that doesn't route through `scrollToSection()`.

### D13 — the two spacing systems this project has been carrying

`about.jsx`/`my-taste.jsx` use raw px throughout (5/10/15/20/40/50/60/70), while
`connect.jsx`/`portfolio.jsx` use rem (0.5/0.75/1/1.5/2/3/6/10rem) — two grids built
independently that barely overlap. Not a bug on its own (nothing visibly breaks), but it
is the reason `--space-1..9` exists (`STATUS.md`, Stage 3 Task 1) rather than a smaller
patch — there was no single existing system to extend.

---

## 5. Design problems — these need a direction decision

### D1 — The hero is roughly half empty

Desktop: the name sits mid-left, then a large vertical gap, then the crate input near
the bottom. Nothing occupies the lower third. Mobile: ~600px of dead space above the
name and ~500px below the input.

The composition floats rather than being anchored.

### D2 — The primary interaction doesn't look interactive

"put a record on…" is low-contrast grey text over a thin underline. It is *the*
entry point to the entire hero concept, and it reads as a caption. Most visitors will
never realise the turntable is usable.

### D3 — The turntable is very low contrast

Dark grey on near-black. Beautiful on a calibrated monitor; nearly invisible on a
phone at reduced brightness, which is where most traffic arrives from. The strobe
ring dots are currently the only element with real separation from the background.

> **Still open for DARK theme.** The light-theme counterpart (D3b below) was fixed in
> Stage 1 Task 4; dark theme was explicitly left alone. Measured dark-theme record-vs-mat
> contrast is **1.15–2.07:1** across the five pressings — i.e. the record barely separates
> from the surface it sits on. The `--deck-ground` token added in Task 4 is the lever:
> setting it *lighter* than `--bg-color` in `:root` would move the whole dark deck's
> material stack together, exactly as light theme now does, without touching any
> individual surface.

### D3b — light-theme deck dissolved into the page — **FIXED (Stage 1, Task 4)**

The inverse of D3. The plinth was `color-mix(--text-color 14%, --bg-color)` ≈ `#d4d6db`
against a `#f6f7fb` page — **11.7 L\*, 1.36:1**, below the ~15 L\* needed to read as an
edge — so the deck lost its silhouette and stopped reading as an object on a surface.

Fixed by giving the deck its own ground (`--deck-ground`) that every deck surface mixes
against, so the whole stack moves together: **28.5 L\*, 2.23:1**. Plus a contact shadow
the old single wide blur never had. See `STATUS.md` for the full boundary table and the
`t4-deck-light-BEFORE/AFTER.png` pair.

Two things worth carrying forward:

- **Fixed-alpha black shadows do less absolute work on a darker base.** Deepening the
  ground flattened `rim → mat` from 8.8 to 5.6 L\* with no change to the mat at all.
  Anything that re-tones a surface must re-measure the boundaries *around* it.
- **`color-mix(… var(--text-color) N% …)` flips direction between themes.** The button's
  disabled fill at `text 9%` was darker than the plinth in dark theme and *lighter* in
  light theme, so the inert control read as a raised pale disc rather than a recessed
  well. Mixing toward `black` instead is a darkening in both.

### D4 — The inverted bands read as accidental — **FIXED (Q4 applied), Stage 3 Task 2**

> Originally: "Two full-viewport light bands (the slideshow, and work experience)
> interrupt the dark site." **Stale even at the time Stage 3 read it** — Q3 deleted the
> slideshow back in Stage 0 (`4ebaaaf`); `.work-experience` had already been the *only*
> inverted section on the site since 2026-08-08. Corrected here rather than left to
> mislead the next read.

Decided 2026-08-12: **un-invert `.work-experience`.** A lone, unpartnered inversion reads
as a rendering accident, not a choice — which is what this finding was pointing at — and
no content-driven reason was found to single it out over any other section. Reasoning in
full, and why "reinstate a partner band instead" was rejected, in `STATUS.md` and
`ROADMAP.md` §1 Q4. **Applied, Stage 3 Task 2 (2026-08-13)** — `.work-experience` no
longer sets `background-color: var(--bg-inverted)`; `.work-title` and `.date` are off the
inverted trio. Measured: `.work-title` now 17.03:1 dark / 17.44:1 light against the page,
the same `--text-color`-on-`--bg-color` pairing every other section's heading uses.

### D5 — The work-experience row mixes two visual languages — **FIXED, Stage 3 Task 2**

Capgemini and GlobalLogic are **logos on tall white cards**. CodeWiz and Trump
National are **photographs**. Different aspect ratios, uneven card heights, ragged
bottom edge. The content itself is strong — real accomplishments with metrics — but
the presentation undercuts it.

Resolved structurally rather than by picking one visual language, 2026-08-13: every
entry is now the same cover-panel treatment (photo or generative motif, both full-bleed
with a dark scrim), so logo-on-white-card vs. photograph stops being a visible
distinction — there is no card, and no white background, for either kind of entry.

### D6 — No scroll affordance

Nothing invites the visitor past the hero. Given the hero is a full viewport with a
large empty lower third, some readers will not realise there is more.

### D7 — Missing content

- **No resume/CV link anywhere.** For a portfolio whose job is converting recruiter
  attention, this is a larger gap than any unfinished animation.
- No project thumbnails in the list — entries are text-only until expanded.

---

## 6. Accessibility

- Theme toggle has no `aria-label`; it exposes two `role="img"` spans labelled "Sun
  Icon" and "Moon Icon", so a screen reader announces both and says nothing about
  what the control does. *(Still open — Stage 8. Note the toggle now renders twice,
  once in the desktop bar and once in the mobile panel, so a fix applies to both.)*
- ~~The hamburger is a `<div>` with `onClick` — not focusable, not keyboard-operable.~~
  **FIXED 2026-08-10** — real `<button>` with `aria-expanded` / `aria-controls` /
  `aria-label`, full keyboard operation and focus containment. See **B4a**.
- Two `<h1>` elements on the page (the "D." logo and the hero name). *(Still open.)*
- No skip-to-content link. *(Still open — and now more valuable: keyboard users reach
  the hamburger on the first Tab, but there is still no way past the nav to content.)*
- ~~Contrast failures B1 and B2 above.~~ **FIXED 2026-08-08.**

---

## 7. What is genuinely working — preserve this

- **The turntable itself.** Plinth proportions, strobe ring, tonearm geometry, the
  pitch fader. It is the best thing on the site by a wide margin and it scales down
  to mobile gracefully.
- **The record-crate panel** — roasted-maple material, ARIA combobox semantics,
  keyboard navigation, portaled to `<body>` to escape the hero's `overflow: hidden`.
- **The project list typography** — clean, confident, well-spaced.
- **Work experience *content*** — specific and quantified. Only the presentation is weak.
- **The palette.** Ink navy and cool white with a single blue accent is coherent and
  distinctive. Nothing here suggests changing it.

---

## 8. Open questions — **ANSWERED**

All four were resolved on 2026-08-08. Full reasoning in [`ROADMAP.md`](./ROADMAP.md) §1.

| | Question | Answer |
|---|---|---|
| **Q1** | Which design direction? | **Neither option offered.** The body doesn't need *material* — it needs a **shared design system** (one type scale, spacing rhythm, alignment logic, section-header pattern). The hero stays a bespoke object. `#connect` already works with no material at all; `#my-taste` fails because it was never designed, not for lack of texture. **Exception:** `#my-taste` alone gets the material language, since records and crates are content-appropriate there |
| **Q2** | Decorative or functional turntable? | **Functional** — and not genuinely open. "put a record on…" is a promise; not keeping it violates goal #1. Discharged by Phases 6 + 7 only |
| **Q3** | Does the slideshow survive? | **No — delete it.** Removes a duplicate, a missing project, 80vh of one rotating image, and a second source of truth |
| **Q4** | Inverted bands? | **Deferred** into the design-system pass, where section rhythm gets decided |

### What this changed about the diagnosis

§3 above says the hero and body are "two different websites." That still holds. But
§3 implied the fix was to spread the hero's *material* downward — and that's wrong.
The body's problem is the absence of a system, not the absence of texture. §3 should
be read with that correction.

---

## 9. Sequencing — **SUPERSEDED**

The staging that was here has been replaced by [`ROADMAP.md`](./ROADMAP.md) §3.

The substantive change: the turntable moved from last to **Stage 1**, on two
arguments — it leaves the site's central premise unfulfilled longest if deferred, and
a working hero is itself *design information* that the sections beneath it need
before they can be designed properly.

Stage 0 (bugs B1–B7, plus a newly found **B8** in `#my-taste` mobile, plus a resume
link) is unchanged and still blocks nothing.
