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
> `ROADMAP.md` is authoritative for both. Sections 1–7 remain current.

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

One scrolling page, five anchored sections:

| Anchor | Contents |
|---|---|
| `#home` | Turntable hero + record-crate search input |
| `#projects` | Auto-rotating image slideshow, then an expandable project list |
| `#my-taste` | Diego's top Spotify tracks and artists (read-only, server-cached) |
| `#about` | Bio + education, then work-experience cards |
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
library needs to justify its weight. The JS bundle is currently 411 kB (150 kB
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

### B3 — Nav links scroll their own target under the navbar

`scrollToSection()` calls `element.scrollIntoView()` with no offset, while the navbar
is `position: fixed` and roughly 100px tall. Clicking any nav link lands the section
heading *behind* the navbar. Affects `client/src/lib/scroll.js` and
`client/src/hooks/use-hash-scroll.js`.

**Fix:** scroll to `element.offsetTop - navbarHeight`, or add `scroll-margin-top` to
the section elements.

### B4 — Mobile navigation does not exist

`navbar.jsx` tracks `isMenuActive` and the hamburger toggles it, but that state is
**never applied to any className**. Separately, `.hamburger` and `.navbar-mobile` are
both `display: none` with no media query re-enabling them.

Confirmed in `home-mobile.png`: only the "D." logo and a theme toggle. No links, no
hamburger. Phone visitors have no navigation at all.

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

### B7 — Rutgers logo is clipped in the bio section.

### B8 — `#my-taste` mobile layout is visibly broken

Verified in `my-taste-mobile.png`:

- **Track numbers detach from their tracks.** Each number is centered on its own line
  *above* the title rather than sitting beside it, so "1" reads as a heading rather
  than a label for "Just Like Heaven".
- **Divider rules don't align to their content.** They start and end at arbitrary
  offsets rather than matching the text column.
- **The artist grid misaligns on wrap.** Two-line names ("Red Hot Chili Peppers",
  "Stone Temple Pilots") push their row out of alignment with the single-line ones,
  and the fifth artist is orphaned alone on the final row.

Reads as a rendering fault to any visitor. Note this is separate from the `#my-taste`
*redesign* (`ROADMAP.md` Stage 4) — this is making the current layout not-broken,
which is worth doing independently because the redesign is several stages away.

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

### D4 — The inverted bands read as accidental

Two full-viewport light bands (the slideshow, and work experience) interrupt the dark
site. Inversion *can* be a deliberate rhythm device, but each band currently holds one
small element in a large empty field, so it reads as a rendering bug rather than a
choice.

### D5 — The work-experience row mixes two visual languages

Capgemini and GlobalLogic are **logos on tall white cards**. CodeWiz and Trump
National are **photographs**. Different aspect ratios, uneven card heights, ragged
bottom edge. The content itself is strong — real accomplishments with metrics — but
the presentation undercuts it.

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
  what the control does.
- The hamburger is a `<div>` with `onClick` — not focusable, not keyboard-operable.
- Two `<h1>` elements on the page (the "D." logo and the hero name).
- No skip-to-content link.
- Contrast failures B1 and B2 above.

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
