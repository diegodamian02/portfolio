# Design Review — diegodamian.com

**Captured:** 2026-08-08 · **Build:** commit `ba70f10` · **Screenshots:** `design-review/screenshots/`

This document is written to be **self-contained**. It can be pasted into a chat that
has no access to this repository. Screenshots are separate image files in
`screenshots/` — attach the relevant ones alongside it.

> **Scope:** this file covers *design* — what's wrong and what should change. For
> project state, the changelog of recent work, outstanding manual tasks, and the
> remaining roadmap, see [`STATUS.md`](./STATUS.md).

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

### B1 — "Work Experience" heading is invisible in *both* themes

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

### B2 — Timeline card text has the same root cause

`.timeline-content` uses `--secondary-text` on the inverted background. Readable in
dark theme, poor in light. Same class of bug as B1: **the background inverts but the
text tokens don't follow.**

Worth auditing every rule that sets `--bg-inverted` and confirming its text colors
invert with it.

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

### B5 — `client/.env` breaks local development

```
VITE_API_BASE_URL=server-production-4a86.up.railway.app
```

No `https://` scheme, and pointing at an old Railway subdomain rather than
`api.diegodamian.com`. Without a scheme, axios treats it as a *relative* path, so
`#my-taste` fails locally. Production is unaffected (Railway supplies its own value).

### B6 — Slideshow duplicates the project list, and drifts from it

`projects.jsx` hardcodes its own array of three projects instead of reading
`data/projectsData.js`, which has four. The Rutgers project is silently missing from
the slideshow. Two sources of truth for the same content, already out of sync.

### B7 — Rutgers logo is clipped in the bio section.

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

## 8. Open questions — decide before building

**Q1. Which direction?**

- **(a) Extend the hero's material language downward.** Project entries as record
  sleeves, the timeline as something physical, the contact form as a piece of
  equipment. Highest ceiling, most work, and Diego has already proven he can execute
  at this level.
- **(b) Pull the hero back toward a cleaner conventional site.** Optimises for a
  recruiter skimming in 30 seconds. Lower ceiling, much less work, and it discards
  the site's only genuinely memorable element.

Everything downstream depends on this.

**Q2. Does the turntable stay decorative, or does it become functional?**
Phases 6–12 of the roadmap (audio playback, drop animation, scratch, pitch) are
unbuilt. If the answer is "decorative", the hero should stop implying otherwise —
"put a record on…" is currently a promise the page does not keep.

**Q3. Does the slideshow survive?**
It duplicates the project list beneath it, is missing a project, and occupies 80vh
for a single rotating image. Options: delete it, merge it into the list as
thumbnails, or give it a real reason to exist.

**Q4. What happens to the inverted bands?**
Commit to inversion as a deliberate rhythm, or drop it and keep one continuous
surface.

---

## 9. Suggested sequencing

**Stage 0 — bug fixes (no design input needed).** B1–B7. Roughly half a day.
Independent of every design decision, and B1/B4 are actively embarrassing.

**Stage 1 — answer Q1.** Written direction. This is a taste call, not a research task.

**Stage 2 — section-by-section redesign** in the chosen direction, in this order:
`#about` work experience (weakest), `#projects` (redundancy), `#connect`, `#my-taste`.

**Stage 3 — mobile.** Deliberately deferred: the mobile treatment falls out of the
layout, so building it before Stage 2 means building it twice. Includes B4.

**Stage 4 — turntable Phases 6–12,** if Q2 says functional.

**Stage 5 — cleanup.** Delete `nav-orb.jsx` / `orb-field.jsx`, drop
`@react-spring/web` and `@use-gesture/react`, clear the 18 remaining ESLint errors.
