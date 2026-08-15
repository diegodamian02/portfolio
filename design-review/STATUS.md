# Project Status — diegodamian.com

**Updated:** 2026-08-13 · **HEAD:** `f88a5ea`+ · **Live:** https://diegodamian.com

Companion to [`FINDINGS.md`](./FINDINGS.md) (design analysis) and
[`ROADMAP.md`](./ROADMAP.md) (order of work). This file covers **where the project
stands and what recently changed.**

> **§5 below is superseded by [`ROADMAP.md`](./ROADMAP.md) §3.** Read the roadmap for
> sequencing. §1–4 remain current.

---

## 1. The goal

A portfolio that does six things. Current standing on each:

| # | Goal | Status | Addressed by |
|---|---|---|---|
| 1 | **Works correctly** — nothing broken or lying to visitors | 🟢 **Stage 0 complete.** Contact form, iPhone search, contrast, scroll offset, mobile nav, `#my-taste` layout all fixed; B7 did not reproduce | — |
| 2 | **Loads fast** | 🟢 Done. 152MB → 9.6MB deploy | — |
| 3 | **Is findable and shareable** | 🟢 Done. Meta, OG card, favicon, sitemap, JSON-LD | — |
| 4 | **Delivers the "playground" premise** — the turntable actually plays | 🟢 **It plays.** Record drops, platter spins up, arm swings, audio starts at needle contact (0.3–0.9ms from the arm landing). Transport is labelled, survives 253 rapid presses, and the deck reads as an object in both themes | Stage 1 ✅ Phases 6+7 |
| 5 | **Reads as one coherent design** | 🟡 System defined (Task 1), applied to Timeline (Task 2, trimmed Task 3) and the new About Me intro (Task 4, scroll-hold + photo path + location chips fixed Task 5) — `#about`/`#timeline` split, Q4's un-invert applied, B10 fixed. `#my-taste`, `#projects` and `#connect` still pending | Stage 3 (Tasks 1–5 ✅, rest next) |
| 6 | **Converts recruiter attention** | 🟡 Contact form works and the resume is linked from three places; the hero still does not deliver its premise | Stage 1 |

Goals 1–3 were the focus of the 2026-08-07/08 session. **Goals 4–6 are the remaining
project.**

Goal 5 is **no longer blocked** — the direction question was answered on 2026-08-08
(`ROADMAP.md` §1, Q1): the body needs a shared *design system*, not the hero's
material language. And goal 4 moved from last to **Stage 1**, on the argument that a
working hero is design information the sections beneath it need.

---

## 2. What changed recently

Seven commits, `b32c561..5d72292`. 42 files, +949 / −78.

### `c41265a` — restore broken project links, video playback, footer year
Three bugs that were live in production:
- `projectsData.js` used the key `live:` while `portfolio.jsx` read `project.liveDemo`,
  so the Rutgers and **diegospomodoro.com** links silently never rendered.
- Videos were `.mov` declared as `type="video/mp4"`. Chrome and Firefox won't decode
  QuickTime, so **3 of 4 project demos were dead.** Repointed to `.webm`, corrected
  the MIME type, added `preload="metadata"`.
- Footer copyright was hardcoded `2025`; now derived from the clock.

### `6a20d00` — cut deploy from 152MB to 9.6MB
The built output was 152MB, of which **137MB was `.mov` files no browser can play.**
Railway uploaded and served all of it on every deploy.
- Transcoded `rutgers-democracy.mov` (61MB, the only clip lacking a `.webm` twin) to
  VP9 at 3.3MB. Deleted all four `.mov` files.
- Images 11MB → 1.7MB. `codewiz.jpeg` was a **7952×5304 (42-megapixel)** camera
  original rendered as a 400px-tall thumbnail: 7.9MB → 181KB. `usa.png` was 1600px
  wide for a flag displayed at 20×15px.

Note this shrank the *deploy*, not the 91MB `.git` — the `.mov` blobs remain in
history. Reclaiming that needs a history rewrite, deliberately deferred.

### `9e51650` — favicon, link-preview card, SEO metadata
`index.html` was 12 lines with no description, no social tags, and no favicon.
Pasting the URL anywhere produced a blank grey box.
- OG + Twitter card tags with an **absolute** `og:image` URL (crawlers don't resolve
  relative paths — the usual cause of a silently blank preview).
- `og-image.png`: 1200×630 card generated from the site's own tokens and Avenir Next.
- `favicon.svg` drawn as a **path**, not a `<text>` element, so it doesn't depend on
  a font being available. Plus `apple-touch-icon.png`, `robots.txt`, `sitemap.xml`,
  dual light/dark `theme-color`, canonical URL, JSON-LD `Person` schema.

### `58adbf9` — "email port added" *(committed manually)*
Captured the Nodemailer/SMTP contact form before the IPv6 fix below.

### `b224161` — pin SMTP to IPv4
Sends failed ~half the time with `ENETUNREACH`, non-deterministically. Cause:
nodemailer picks one resolved address **at random**, and decides IPv6 is usable if
*any* non-internal interface has an IPv6 address — link-local `fe80::` entries, which
every Mac has, satisfy that test with no IPv6 route present.

**Superseded by `ba70f10`.** Recorded because the diagnosis is real and the same trap
applies to any future SMTP work.

### `ba70f10` — send via Resend's HTTPS API instead of SMTP
The contact form could not work on Railway at all: **Railway blocks outbound SMTP
(ports 25/465/587/2525) on every plan below Pro.** The transport didn't fail, it hung
until the request timed out and Cloudflare returned a 502 — a submission that spun for
two minutes and died, while the validation path on the same route answered in 118ms.

Replaced with Resend's HTTPS API. Sends from the sandbox sender, which needs no
verified domain; its only restriction — delivery solely to the Resend account owner's
address — is exactly this form's delivery model, so no domain slot is consumed.

Also replaced the old form's `alert("Thank you for reaching out!")` that fired
**before** the request, aimed at a Heroku endpoint dead since the free tier ended.
Every message sent through it was lost while the sender was told it worked.

### `5d72292` / `8f7fca0` / `4cdfa3a` / `5a01a59` / `89354bb` — docs and hygiene
The `design-review/` folder (screenshots, `FINDINGS.md`, `STATUS.md`, `ROADMAP.md`,
`capture-screenshots.mjs`), a README brought current with this session, and untracking
`.idea/` — IDE session state that had been committed since 2025-03-30.

### Stage 0 Task 3 — contrast and token inversion (B1, B2)

Several rules set `background-color: var(--bg-inverted)` while leaving their text on
`--text-color` or `--secondary-text`. Both token sets flip together with the theme, so
that text landed on a background of near-identical lightness in **both** themes.

| Element | Before (dark / light) | After (dark / light) | Need |
|---|---|---|---|
| `.work-title` | 1.06 / 1.03 ❌ | **17.44 / 17.03** ✅ | 3:1 |
| `.date` | 2.35 / 2.33 ❌ | **7.71 / 7.65** ✅ | 4.5:1 |

Added `--secondary-text-inverted` (both themes) rather than using `--text-inverted` at
reduced opacity: alpha composites differently against light vs dark backdrops, so one
value gives asymmetric results across themes (0.65 → 5.68 dark but 7.52 light).

The audit found the surface is now a **single** region — `.project-slideshow-section`
was the only other `--bg-inverted` rule and Task 2 deleted it. Everything else under
`.work-experience` correctly inherits `--text-inverted`; no borders, links, or hover
states exist inside it. Ratios measured from the rendered DOM in both themes, not
eyeballed from screenshots.

Corrected a mistake in FINDINGS.md while here: B2 named `.timeline-content` as the
culprit, but that rule sets only `text-align` and inherits correctly. The offender was
`.date`.

### `4ebaaaf` / `f7911ac` — Stage 0 Task 2: deletions
Two removal-only commits, no bug fixes or restyling.

**Slideshow deleted (B6, `ROADMAP.md` Q3).** It duplicated the project list directly
beneath it while hardcoding its own three-project array, so Rutgers was silently
missing and the two lists had already drifted. `projectsData.js` is now the single
source of truth; the section lists all four. Leading/trailing gaps where it sat both
measure 0px.

**Orb-nav remnants removed (Phases 11 + 12).** `nav-orb.jsx` / `orb-field.jsx`, their
CSS, `--orb-1..5` in both themes, and the `@react-spring/web` +
`@use-gesture/react` dependencies. `navbar.jsx`'s IntersectionObserver became a plain
scroll listener driving only the navbar background — the link list is no longer gated
during the hero, so nav is usable from the top of the page.

| | Before | After |
|---|---|---|
| `main.scss` | 1,980 lines | **1,834** (−146) |
| CSS bundle | 26.96 kB / 5.99 gz | **24.60 kB / 5.50 gz** |
| JS bundle | 411.33 kB | 410.59 kB |

**The JS number is the interesting one.** Dropping two animation libraries moved it
almost nothing, because they were never in the bundle: `nav-orb.jsx` was unreachable
from the entry point, so Vite had already tree-shaken the subtree. Deleting the
slideshow — actual live code — accounted for 0.71 kB of the 0.74 kB total. The gain
from the dependency removal is install time and supply-chain surface, not bytes
shipped. Worth remembering before assuming an unused dependency costs users anything.

Two items in the task brief didn't match the tree: `.slideshow-title` used
`var(--secondary-text)` (defined), not a `var(--seconday-color)` typo; and
`.theme-transition { transition: ba; }` does not exist anywhere in `src/`.

### Stage 0 Task 4 — nav scroll offset (B3, B3b)
Two commits. Nav links landed every section's top edge flush at the viewport top,
behind the fixed navbar. `#my-taste` was the visible failure: its heading and photo
were scrolled clean out of view, dropping the visitor mid-section onto a subheading
above a row of half-cut artist photos (`screenshots/b3-nav-offset-before.png`).

Fixed in CSS rather than JS — `scroll-margin-top: var(--scroll-offset)` on the
sections, with a single `--navbar-height` token redefined at the two breakpoints where
`.logo`'s font-size drops. CSS was chosen because it covers every route into a
section, not just the one function that remembers to subtract.

| Width | navbar (measured) | section lands at | clears bar by |
|---|---|---|---|
| 1440 / 1024 | 143.44px | 168px | 24.6px |
| 768 | 118.56px | 144px | 25.4px |
| 480 | 105.16px | 132px | 26.8px |

**The second bug was the more serious one.** Verifying the `use-hash-scroll.js` path
showed direct hash landings missing by **811px** — `/#about`, and therefore the
Spotify OAuth callback's own return route. `useHashScroll` scrolled one frame after
mount, but `#my-taste` grows 875px → 1686px when its Spotify data resolves ~300ms
later, moving everything below it. Confirmed pre-existing by re-running the probe
against the code before the B3 fix: the same 811px shortfall, unchanged.

Fixed with a bounded 2s `ResizeObserver` settle window that re-issues the scroll as
layout changes, cancelled the moment the visitor scrolls. That guard needed a second
piece: a wheel gesture does **not** reliably abort an in-flight smooth scroll — the
first version measured the visitor scrolling up 400px and the page gliding straight
back down — so it also pins the page with `scrollTo({ behavior: "instant" })`.

Left open deliberately: **B3c**, nav clicks never update the URL (`preventDefault` and
scroll, no history entry), so sections aren't linkable and Back exits the site. It's
navbar behaviour, so it pairs with B4 rather than a scroll-offset task.

### Stage 0 Task 5 — mobile navigation (B4, B4a, B3c, `--navbar-height`)
Below 768px the inline link row is replaced by a hamburger and a slide-down panel on
`--bg-color`, so it reads as an extension of the bar and themes for free.

**The finding's premise was stale.** B4 said phone visitors had "no navigation at all",
but Task 2 had already removed the hide-during-hero gating, so the desktop links *were*
rendering — wrapping onto two lines with **"About Me" split across the break** and
colliding with the logo. Broken navigation that looks intentional, rather than absent
navigation. Same fix, worse starting point than recorded.

Breakpoint chosen on measurement: the links fit on one line down to 480px, but at
≤768px they render at 1rem/0.8rem with ~19px tap targets — far under the 44px minimum.
Fitting is not the same as usable.

`--navbar-height` is now **authoritative** rather than observational:
`.navbar { height: var(--navbar-height) }`. This needed `box-sizing: border-box`, which
the brief didn't anticipate — nothing in the file sets a global reset, so content-box
would have added the 40px of vertical padding on top and rendered a 184px bar while the
token claimed 144, breaking the very contract being established. It also fixed the bar
overflowing the viewport by its own 80px of horizontal padding at every width.
`.navbar-right`'s `margin-right` dropped 100px → 20px to keep desktop pixel-identical.

| Width | navbar width (was) | now | height | token | clearance on nav |
|---|---|---|---|---|---|
| 1440 | 1520 | **1440** | 144 | 144 ✅ | 24px |
| 1024 | 1104 | **1024** | 144 | 144 ✅ | 24px |
| 768 | 848 | **768** | 120 | 120 ✅ | 24px |
| 480 | 560 | **480** | 108 | 108 ✅ | 24px |

Clearance is now exactly 24px everywhere, where Task 4 measured 24.6/25.4/26.8 — the
enforced height removed the rounding slack.

**B3c fixed with `replaceState`, not `pushState`.** Pushing would trap a visitor who
clicked through all five sections behind five Back presses. Verified: four nav clicks
add 0 history entries, and because raw history never notifies react-router,
`useHashScroll` can't re-fire — measured 0 scroll-direction reversals.

50 automated checks across four widths, both themes, keyboard-only, and cold-loaded
shared URLs. One real bug caught mid-task: `aria-current` was seeded at mount but never
synced, so back/forward left the highlight stale — fixed with a `hashchange` listener.

### Stage 0 Task 6 — layout bugs (B7 does not reproduce, B8 fixed, D10 found)

**B7 was not a bug.** The Rutgers logo renders complete and undistorted at every width
— measured natural aspect 1.13, rendered image aspect 1.13. The "slicing" in
`about-desktop.png` / `about-mobile.png` is the **fixed navbar overlaying the element
capture**, the artifact `FINDINGS.md` §2 already warns about: the opaque bar sits across
the middle of `.bio-left`, hiding the centre of the "R" and leaving its legs showing as
two red bars. Scroll it clear, or delete `.navbar` before capturing, and it is fine.

`.university-logo` *does* use content-box `width: 150px; padding: 50px`, so it occupies
250×233 for a 150px logo — the same pattern Task 5 found on `.navbar`. But here it makes
**dead space, not clipping**: no ancestor constrains or hides overflow. Resizing it "to
balance the 200px photo" is a judgement about visual weight with no defect behind it, so
per the task's own instruction it was reported rather than decided. Of the other bio
elements, `.profile-photo` and `.flag` are correct and `.timeline-logo` already sets
`box-sizing: border-box`.

**B8 reproduced exactly and is fixed** — alignment only:

| Defect | Cause | Fix | Verified |
|---|---|---|---|
| Numbers on their own line (mobile) | `flex-direction: column` at 768 | removed | beside title, all widths |
| Number centred on the block, not the title | `align-items: center` | `baseline` | **0.0px** delta, incl. wrapped titles |
| Dividers offset from content | `.track-number` `padding: 5px 10px` | `padding: 0` + `min-width` | **0.0px** |
| Artist grid stepping + orphans | flex `space-between` + `align-items: center` | grid, `align-items: start` | 5 cols desktop, 3+2 mobile |

Column counts are arithmetic, not taste: the server hardcodes `limit=5`, so with 5 items
only 5 or 3 columns avoid stranding one. `auto-fit` resolved to 4 at 768px and 2 at
480px — **4+1** and **2+2+1**, the orphan being removed — so explicit counts replaced it.

**D10, found while fixing B8, is the reason B8 existed.** Every `#my-taste` responsive
override is dead code: the base rules are nested under `.spotify-section` (0,2,0) while
every media-query override is written bare (0,1,0), and media queries add no
specificity. A CSSOM audit found **11 dead declarations** — `.spotify-artist-img`
computed to **100px at 480px** where the override says 60px. The single property that
always got through was `flex-direction`, because the base never declares one. That is
exactly why B8's first defect was the only one of these rules with a visible effect.

Only the override B8 needed was corrected; the remaining ~9 were left dead deliberately,
since fixing their specificity would activate sizing that has never once rendered.

Also logged, not fixed: **D8** (navbar's 0.3s background transition lags body's 0.1s by
~200ms on theme switch — Stage 3, when motion becomes tokens) and **D9** (navbar has no
entrance or scroll-linked motion — Stage 2, once Lenis and ScrollTrigger exist).

### Stage 0 Task 7 — resume link *(closes Stage 0)*

`client/public/Diego-Damian-Resume.pdf`, 36 KB, copied to `dist/` verbatim by Vite.
Linked from the desktop navbar, the mobile menu and `#connect`, opening in a new tab
with `rel="noopener noreferrer"` rather than forcing a download.

Kept out of `SECTIONS` deliberately: that array drives `scrollToSection()`,
`aria-current` and the `hashchange` sync, so a document link inside it would try to
scroll to a section that doesn't exist. Verified across all three locations —
`aria-current` null, no scroll fired, URL hash untouched.

**The Caddy question, answered by testing rather than assumption.** Ran the real
`Caddyfile` under the exact production Caddy (v2.11.4) against a real build:

| Request | Result |
|---|---|
| `/Diego-Damian-Resume.pdf` (present) | 200 `application/pdf`, body `%PDF-` ✅ |
| `/about` (SPA route) | 200 `text/html` ✅ |
| a `.pdf` that does **not** exist | **200 `text/html`** ⚠️ |

`try_files {path} /index.html` matches the real file first, so the link works. But the
third row is a standing trap: **a missing PDF returns 200 with the site's HTML, not a
404.** If the file ever fails to deploy the link breaks silently. Any post-deploy check
must assert `Content-Type: application/pdf`, not just a 200.

**A regression this caused, and its fix.** The sixth nav item pushed the inline link row
past its fit — measured, it wraps below ~840px and fits 840–860px with *zero* slack, so
comfortable fit starts ~880. The hamburger breakpoint moved **768 → 900px**, in its own
media block: the shared 768px block also carries `#my-taste` and bio rules, and widening
its condition would have dragged those to 900px too. `--navbar-height` still steps at
768/480 because that tracks `.logo`'s font-size — the two thresholds answer different
questions.

**Two source-file catches worth recording.** The first file selected was
`diegos_resume (3).pdf` (newest on disk, 2026-07-05) — rendering it showed it **predates
the Capgemini role entirely**, so publishing it would have put a resume missing the
current employer on a live job-search site. Dates on disk did not identify the current
version; only rendering the page did. The replacement was then dropped in as
`diegos_resume.pdf` with mode `600`, and was renamed and normalised to 644.

Not added to `sitemap.xml`: listing PDFs is conventional and valid, but the file carries
a phone number and the nav link already makes it discoverable, so a sitemap entry mostly
just accelerates indexing. `robots.txt` is unchanged.

### Stage 1 Task 1 — verification only, no code *(2026-08-11)*

Run before any animation work, because Phase 0's *other* conclusion (direct iTunes
search) was desktop-UA-only and wrong, and Stage 7 depends entirely on this one.

**Decode path: Tier 1 confirmed.** Two engines, four profiles — Blink ×3 (desktop,
Pixel 5, Galaxy S9+) and WebKit ×1 (Desktop Safari 17.6, real, not emulated). All fetch
the `audio-ssl.itunes.apple.com` preview directly with `access-control-allow-origin: *`;
`decodeAudioData` returns 29.93s / 2ch @48kHz on Blink and **30.02s / 2ch** on WebKit.
Analyser peaks of 17,701–18,114 confirm the stream is **not tainted**. Preview audio
stays a **direct browser fetch, no proxy**; `/api/itunes/preview-proxy` remains dormant.

**Still open: iOS autoplay/gesture policy** — that is browser *policy*, not the decode
engine, so desktop WebKit does not settle it. Build to the constraint (`resume()` and
`play()` inside a real gesture, volume only via `GainNode`, one shared `AudioContext`)
and gate **Stage 7** behind a real-device iPhone test.

**Two roadmap claims corrected by reading the tree:**

1. **`previewUrl` is not "thrown away."** It reaches `Turntable`'s props already
   (`record-crate.jsx:27/59/162` → `home.jsx:7/19`), and results are pre-filtered to
   tracks that have one. It is simply never consumed. Stage 1 needs no plumbing.
2. **The deck is inert markup.** `turntable.jsx` has no GSAP, refs or hooks. The spin
   tween does not exist. The tonearm's `transition: transform 0.4s ease` will fight GSAP
   once it animates that property. No gesture surface exists — every deck control is an
   `aria-hidden` div.

**GSAP:** only `SplitText` (+ `useGSAP`) is used, in `loading-screen.jsx`.
`ScrollTrigger`, `Draggable` and `InertiaPlugin` are registered but unused — the one
`ScrollTrigger` hit in `navbar.jsx` is a comment. Registration breaks nothing.

> **Method note worth keeping.** The Playwright device matrix that caught the iPhone
> search bug does **not** transfer to audio. That bug was a server-side UA sniff, so
> Chromium with an iPhone UA reproduced it exactly. Audio behaviour is engine-level
> policy, so Chromium-with-an-iPhone-UA would have produced confident green rows that
> meant nothing. Apple coverage requires a real WebKit build — or a real device.

### Stage 1 Task 2 — audio engine + needle-drop choreography *(2026-08-11)*

The hero now keeps its promise. `lib/turntable-audio.js` is a module-level singleton
(one `AudioContext`, verified created exactly once), graph
`AudioBufferSourceNode → masterGain → destination` with an `AnalyserNode` tapped off
master — built now, unread until Stage 7. Volume only ever moves via
`gain.setTargetAtTime`. `lib/deck-state.js` holds the explicit deck states
(EMPTY / LOADING / PLAYING / PAUSED / STOPPED_LOADED / ERROR) that Phases 8–10 will key off.

**Gesture surface: the crate row.** `init()` is called synchronously inside
`selectTrack`, never from an effect — an effect runs post-commit, the gesture is gone,
and iOS refuses to unlock. That would work on desktop and fail silently on every
iPhone. A 1-sample silent buffer is pushed through during the gesture, because
`resume()` alone doesn't always satisfy iOS and our real `play()` lands ~1.6s later.

**The tonearm is deliberately NOT a control.** It is 5px wide, its expanded 44px hit
area would sweep across the platter and collide with Phase 8's `Draggable` scratch, and
it would duplicate the transport button. Transport lives on the plinth's start/stop
button, now a real `<button>` with a 44px pseudo-element hit area (the 22px dial itself
is unchanged). `aria-hidden` moved off `.turntable-controls` onto the decorative
children individually — an ancestor's `aria-hidden` cannot be overridden by a descendant.

**A real bug, caught by measuring instead of asserting.** The needle-contact `.call()`
was at the correct timeline position, but `startAudio` ran `fetch` + `decodeAudioData`
*inside* the callback, so audio started **551ms** after the needle landed. Two fixes:
decode is now kicked off in parallel when the track is picked (the animation gives ~1.6s
of cover, decode takes ~0.5s), and `playCached()` starts the source **synchronously** in
the same tick GSAP writes the arm's final position — `await`, even on a resolved
promise, defers to a microtask that lands after that frame. Now **24ms / 1.4 frames**,
measured from the app's own state transition, which makes it an upper bound.

> **Measurement caveat worth remembering.** A Playwright probe that dynamically
> `import()`s a module can get a *different instance* than the app under Vite HMR —
> `getState().contextState` returned `"none"` while the deck was genuinely PLAYING. Two
> assertions failed for that reason alone. Guard probes with an instance check, or
> restart the dev server, before believing a failure.

Also: `visibilitychange` stops audio and does not auto-resume; reduced motion drops all
choreography while keeping audio and transport fully functional; the CSS
`transition: transform 0.4s ease` on the tonearm is gone, since it would re-ease every
frame GSAP wrote and desync the needle-contact callback.

**Still unverified: iOS autoplay/gesture policy.** Built to the constraint regardless.
Needs a real-device iPhone test before Stage 7.

### Stage 1 Task 3 — needle contact geometry + vinyl colourways *(2026-08-11)*

**The stylus was swinging the wrong way.** `ARM_OUTER_GROOVE = 6.5°` moved the arm
*away* from the record. Sweeping the rotation and measuring settled it: this pivot sits
outboard of the platter, so **increasing** the CSS rotation moves the stylus **inward** —
30° → 81.9% of the record radius, 25° → 94.4%, 20.5° (rest) → ~107% (just off the edge,
correct for a parked arm), 6.5° → **~145%**.

The angle is now solved at runtime by law of cosines from the rendered geometry,
`cos θ = (L² + d² − r²) / (2·L·d)`, evaluated at tween start. It lands at 94.2–94.3% of
the record radius at 1440 / 1024 / 768 / 480, with the arm self-adjusting to
25.04° / 25.49° / 24.83° / 24.83° — different at every size, which is the proof no fixed
constant could have worked. `ARM_LIFT` moved 1.6° → 18.5° for the same reason.

> **A measurement trap that made the bug look milder than it was.** The first diagnosis
> reported 104–111% of the record radius. That was wrong: `.vinyl-record` is a square
> element inside the *spinning* group, so `getBoundingClientRect()` inflates by up to √2
> as it rotates. Radius must come from `offsetWidth` (layout box, transform-independent).
> The true error was ~145%, and the same artifact made the record's measured radius drift
> 249.8 → 257px between identical runs.

**The arm cannot reach 35% of the radius.** Measured, the stylus radius bottoms out at
**~39.3%** and then travels back *outward* as the angle keeps increasing. The curve is
**not monotonic**, so a naive solve for 35% returns a nonsense angle on the far side of
the minimum instead of failing. `RADIUS_INNER_GROOVE` is now 0.42 with
`RADIUS_MIN_REACHABLE = 0.393` recorded beside it — Phase 8's scratch would otherwise
have trusted an unreachable target.

**Five vinyl colourways**, tokens `--vinyl-1..5` under both themes; `vinyl-record.jsx`
names no colour, only picks a token. Selection is a hash of the track id — deterministic
across re-renders, reloads and theme switches (verified). Two bugs found while verifying:
a plain `% 5` clustered real iTunes ids (5, 5, 5, 3, 4, since ids are allocated in runs),
and the avalanche step's bare `^=` returned a **signed** int, so `n % 5` went negative and
produced `var(--vinyl--1)` — an undefined token that silently fell back to black. Both
fixed; every step now re-coerces with `>>> 0`.

`.vinyl-record-grooves` was an empty unstyled div and there was **no sheen at all**; it
now carries the highlight so the record reads as a lit object.

Task 2's needle-contact timing re-measured at **19–20ms**, unchanged.

### Stage 1 Task 4 — transport reliability, button, light-theme deck *(2026-08-11)*

**Rapid transport presses left the platter frozen while the deck reported `PLAYING`.**
Measured before touching anything: of five adversarial press sequences, **four ended at
exactly 0.0°/s with `data-deck-state="PLAYING"`**. Instrumenting the spin tween gave the
mechanism outright — settled state `timeScale: 1, paused: true`. The wind-up had
completed correctly and something paused it afterwards.

Three faults, all now fixed by routing every speed change through a single writer
(`setSpin` in `turntable.jsx`):

1. The brake scheduled `tl.call(() => tween.pause())` 800ms out as its own timeline
   callback. Pressing play during a brake started a wind-up and the **orphaned callback
   then landed on top of it**. The pause now lives in the brake tween's `onComplete`, so
   `gsap.killTweensOf` cancels it together with the tween that scheduled it.
2. Spin-up snapped `timeScale(0)` before ramping, so resuming a platter still turning at
   0.95 yanked it to a dead stop first. It now ramps from wherever it is.
3. Nothing killed the previous `timeScale` tween, so a brake and a wind-up both wrote the
   property every frame and whichever finished last won.

Ramp durations are now **proportional to the distance travelled** (a standing start takes
the full 1.2s, resuming from 0.6 takes 0.48s). With a fixed duration each press restarts
a full-length ramp and fast alternation never converges inside the window the invariant
allows.

`handleTransport` also reads deck state from a **ref** rather than the state variable —
two presses inside one frame both saw the stale value and took the same branch.

**Result: 253 presses across 30 randomised sequences, 30/30 converged** within a 1250ms
settle window (just past the 1.2s spin-up, so this tests the stated invariant rather than
a generous one). Both terminal states exercised — 17 ended `PLAYING` at 200.8–204.9°/s,
13 ended stopped at exactly 0.0°/s. The play/pause glyph agreed with the deck state on
all 30.

**Transport button: 22px → 44px, with a play/pause glyph.** It is the only transport on
the deck and nothing said so. 44px makes it the largest control in the cluster — correct
for a start/stop button, and exactly the touch minimum, so visual and hit target
coincide. Steps to 36px at ≤768px where the deck is ~40% narrower; the `::before` uses
`max(44px, 100%)` so the target never drops below 44px. Verified 44/44/36-with-44 across
1440 / 1024 / 768 / 480. Glyphs are SVG, crossfaded by GSAP with `overwrite: "auto"`
(0s under reduced motion). `aria-label` tracks state — "Pause …" / "Resume …" /
"Play again …" / "Play — choose a record first" — and the deck-EMPTY state renders as a
recessed inert well.

**Light-theme deck separation (the D3 counterpart).** The plinth sat 11.7 L\* from the
page and dissolved into it. Rather than recolour the plinth alone — which would have
pushed it past the platter and inverted the stack — the deck's whole material stack now
mixes against a new **`--deck-ground`** token instead of `--bg-color`. In dark theme the
two are the same value, so it is a pass-through.

| Boundary | Before | After |
|---|---|---|
| **plinth vs page** | 11.7 L\* · 1.36:1 | **28.5 L\* · 2.23:1** |
| plinth → platter rim | 25.0 L\* | 24.0 L\* |
| platter rim → mat | 8.8 L\* | 6.4 L\* |
| mat → record | 45.8 L\* | 33.0 L\* |
| shadow at +2px below the plinth | 33.7 L\* darkening | **48.0 L\*** |

Shadow is stronger at **every** distance sampled (+2/6/12/24/40/60px), and gained a
contact layer it never had — a single `0 40px 80px -24px` has no near-edge density, and
the near edge is what sells "resting on a surface".

> **The brief's warning landed.** Darkening the ground flattened `rim → mat` from 8.8 to
> 5.6 L\* even though nothing about the mat changed: the inset shadows use **fixed black
> alphas**, which do less absolute work the darker the surface beneath them. A
> `--deck-well-shadow` token (light theme only) recovered it to 6.4 L\*. Pushing it
> further muddied the platter's top edge, so it was left there — legible, and the weakest
> boundary on the deck.

**Dark theme verified untouched**, not asserted: computed styles for 21 deck selectors
were dumped, the changes stashed, dumped again, and diffed. Exactly two differences, both
intended — `.turntable-controls` grew 26×50 → 44×72 from the button resize, and the
plinth gained a **fully transparent** `rgba(0,0,0,0) 0 0 0 1px inset` layer (the
`--deck-edge` no-op). Every other surface byte-identical.

**The amber pressing read brown.** Fixed by treating translucency as a property of the
pressing rather than a colour: `--vinyl-2` is richer, and `[data-colorway="2"]` gets a
`mix-blend-mode: screen` glow under `isolation: isolate`. Measured, dark theme:

| | Before | After |
|---|---|---|
| field | `#6c441b` L\*=32.7 | `#a76c22` L\*=50.8 |
| chroma (max−min channel) | 81 | **133** |
| light-through lift (lit − field) | **−0.7 L\*** (flat) | **+13.2 L\*** |

Found while verifying: **the glow was painting over the album artwork.** The `::before`
is positioned and `.vinyl-record-label` is in normal flow, so the pseudo-element won on
paint order and tinted the art warm — the same artwork sampled `#867054` on this pressing
against `#383f43` on every other one. `z-index: -1` inside the isolated stacking context
puts the glow after the record's background but before in-flow descendants, which is also
the physically correct order: light through the vinyl, then the label on it, then the
surface sheen across both. Amber's label separation went from the worst of the five to
the best (2.45:1 dark / 2.24:1 light).

All five pressings re-checked against the new plinth in both themes. Weakest is amber in
light theme at **1.17:1 against the mat** — amber and the new mat sit at nearly the same
lightness (L\* 48.2 vs 51.1). It separates by hue rather than luminance; confirmed
legible in `t4-colorway-2-light.png`. Darkening it to fix the ratio would return it to
brown, which is the thing that was being fixed.

**Reduced motion**: platter measured at 0.0°/s in all three states, audio plays, transport
toggles, glyph and label track state, no page errors. `setSpin` returns early under
reduced motion, matching the load path which already declined to spin.

> **Timing note.** The first re-measurement of Task 2's needle-contact delta read
> **67–83ms** and looked like a regression. It was the probe: `data-deck-state` is a DOM
> attribute that lags by a React commit, and a busy rAF loop calling `getComputedStyle`
> every frame starved the scheduler. Measured from GSAP's own tick, arm-down → audio
> source start is **0.3–0.9ms**, with the synchronous path taken on every run. On Task 3's
> own metric with a light loop it is **15.7–16.6ms** (Task 3 read 19–20ms). No regression.

### Stage 1 Task 5 — power-down audio, and D8 *(2026-08-12)*

**Transport now bends the pitch instead of cutting.** The audio is pinned to the
platter: `setSpin`'s tween drives `audio.followSpin(tween.timeScale())` from its own
`onUpdate`, so the rate and level ride the *actual* spin curve rather than a parallel
approximation — and Task 4's proportional durations are inherited for free, which is what
makes pausing from a half-speed platter produce a correspondingly shorter power-down.

Measured off the live `AudioBufferSourceNode` and `GainNode`, not the deck's own
bookkeeping:

| | rate | gain | platter |
|---|---|---|---|
| power-down | 1 → 0.25 (monotonic) | 0.65 → 0 | 3.4 → 0 °/frame |
| spin-up | 0.2 → 1 | 0 → 0.65 | 0 → 3.4 °/frame |

Playback cuts at `RATE_FLOOR = 0.2` — below that the resampler produces aliasing rather
than a slower record. `spinGain()` is a smoothstep reaching 0 exactly *at* the floor, so
the cut lands on silence.

**Adversarial test extended to the audio.** Task 4's invariant was "PLAYING ⇒ the platter
turns at 200°/s". The new one adds "⇒ rate is back at 1 and gain back at target".
**291 presses across 30 randomised sequences: 30/30 on both.** PLAYING rate 1.000–1.000,
PLAYING gain 0.650–0.650, stopped gain 0.000. No console errors.

Three things found while building it:

- **`stop()`'s gain ramp was never audible.** It called `setTargetAtTime(0, …)` and then
  `teardownSource()` in the same tick, so the source was killed before the fade could
  sound. That is *why* the deck cut abruptly. Reduced motion now uses a real
  `fadeOutAndStop()` that schedules `source.stop(now + seconds)` and retires the node.
- **`setTargetAtTime` never arrives.** The exponential approach stalled the reduced-motion
  fade around 0.03 (≈ −26 dB) and left it there. Replaced with
  `linearRampToValueAtTime(0, now + seconds)`, which lands on exactly 0 at exactly the
  moment the source is scheduled to stop. Verified: **gain → 0 at 150ms.**
- **`getElapsed()` was wrong the moment the rate stopped being constant.** It multiplies
  the whole span since the last start by one rate. Every rate change now banks the
  previous segment first (`commitElapsed`, piecewise integration). Verified with a
  discriminating test: after playing 2.0s at pitch and powering down, the groove advanced
  **0.603s during a brake that occupied 0.716s of wall clock** — slower than realtime, as
  it must be. The two failure modes would have given 0.54s total (unintegrated) or 0.716s
  (rate ignored).

The needle drop is deliberately **not** spin-linked: the deck is treated as already at
speed, so a drop and a replay start at pitch with Task 2's slow fade-in rather than
bending up from the floor. Verified — `playbackRate` is 1 across every traced frame.
End-of-track brakes as before but has nothing to bend; the source has already ended.
Needle-contact timing re-measured at **0.4–1.2ms** (Task 4: 0.3–0.9ms).

### D8 — one theme duration for the whole page

The audit found it was worse than logged. It was not a navbar-lags-body problem:

| | before | after |
|---|---|---|
| the entire deck, record, strobe dots, **all body text** | **9–12ms (one frame — no transition at all)** | 180ms |
| `body`, `.home`, sections, footer | 126ms | 180ms |
| `.navbar` | 324ms | 180ms |
| **spread** | **9 → 324ms (36×)** | **one declared value** |

The deck had *no* theme transition whatsoever, and text snapping against a
still-moving background is the most visible part of the ripple.

`--theme-transition-duration: 180ms` / `--theme-transition-ease: cubic-bezier(0.4, 0, 0.2, 1)`,
split so Stage 3 can reuse the easing. **180ms is chosen, not inherited:** a light↔dark
change animates background and text together, so mid-transition both sit near the same
mid-grey and text contrast dips toward 1:1 — the duration *is* the length of that
unreadable window. It also happens to match the transport button's existing 0.18s hover
feel, so that control is unchanged.

Two structural fixes were needed to get there:

- **`background-image` does not interpolate from a custom property.** Verified in
  isolation — even a plain two-stop `linear-gradient` snaps. Both the vinyl grooves and
  the button dome were gradients whose stops were `color-mix`'d with a themed token, so
  they could only ever jump. Both were split into a themed `background-color` plus a
  **fixed** black/white alpha overlay. Mathematically identical (compositing
  `rgba(0,0,0,0.22)` over a base *is* `color-mix(#000 22%, base)`), and now transitionable.
  This also fixed a latent inversion: the button's highlight was mixed from
  `--text-color`, so it lit the dome from above in dark theme and read **concave** in
  light. Now measured lighter at the top in both (40.3 vs 33.3 L\*, 65.0 vs 61.2 L\*).
- **Every element that re-declares its own `color` still snapped**, because `body`'s
  transition animates body's colour and a descendant with its own declaration never
  inherits the animated value. Enumerating them is the fragile thing the token exists to
  avoid, so `navbar.jsx` adds `.is-theme-switching` for the token's own duration (read
  *from* the token, not repeated) and a last-in-file catch-all covers everything. Not
  permanent: that would make every hover and focus state on the site 180ms.

**Verified: 2021 of 2021 element-property pairs declare 0.18s**, at both 1440 and 480 —
one duration, no exceptions — with the class present mid-toggle and removed after. Across
12 toggles in both directions at both widths, all 13 sampled surfaces interpolate through
6–12 intermediate frames and **none snap**.

> **Three measurement attempts were wrong before this one, and the pattern is worth
> keeping.** Computed colours come back in *three* notations: `rgb()` in 0–255 for plain
> colours, `color(srgb …)` in 0–1 for `color-mix` at rest, and **`oklab(…)` mid-transition**
> because that is where the interpolation happens. Metrics built on parsed channels
> compared numbers across all three and reported, confidently, that surfaces which ramp
> smoothly "snapped in 24ms". The metric that survives parses nothing — it compares value
> strings for inequality. A separate trap: `.navbar-links a` declares 0.18s correctly but
> is display-hidden behind the mobile menu at 480, and transitions do not run on
> non-rendered elements, so it "settled" in 24ms invisibly. Filter to rendered elements.

### Stage 2 — scroll foundation: Lenis + GSAP ticker *(2026-08-12)*

**Verified first, per the standing note.** No `lenis` dependency existed. Of the four
plugins `lib/gsap.js` registers, only `SplitText` (loading-screen.jsx) had a real
caller — `ScrollTrigger`, `Draggable` and `InertiaPlugin` were registered but **unused**;
`navbar.jsx` only *mentions* ScrollTrigger in a comment, it never imports it. The two
prerequisite line numbers had drifted again: `html { scroll-behavior: smooth }` was at
192 (not 78), `.section`'s `background-attachment: fixed` at 1322 (not 887) — over 400
lines of drift since the 2026-08-10 count, from Tasks 3–5. Re-verified a third time
immediately before editing and both held.

`npm install lenis` (1.3.26 — confirmed current; `@studio-freight/lenis` is deprecated
and its own install warns you to switch).

**Wired manually, not via `lenis/react`.** `<ReactLenis root>` requires children to
construct anything at all (`if (!children) return null`, confirmed in the package's
compiled source), which means the reduced-motion gate would have to be expressed twice —
once in JSX (mount/don't) and once for the ticker wiring. `gsap.matchMedia()` does both in
one place: `.add("(prefers-reduced-motion: no-preference)", () => {…construct Lenis, wire
the ticker…; return () => {…destroy…}})`. It isn't tween-specific — `.add()` runs arbitrary
setup with automatic revert-on-unmatch, which is exactly "construct this subsystem under
one condition, tear it down under the other." **This is the reduced-motion pattern
Stage 3/6/7 should reuse** — one mechanism per media-query-gated subsystem, not a React
hook for the mount decision and a second matchMedia call for anything GSAP-side.

Wired exactly to spec: `lenis.on('scroll', ScrollTrigger.update)`,
`gsap.ticker.add((t) => lenis.raf(t * 1000))` (ticker gives seconds, Lenis wants ms),
`gsap.ticker.lagSmoothing(0)`. `autoRaf: false` on the Lenis instance — two RAF loops
on one scroll would drift.

**`lib/scroll.js` now holds a module-level Lenis reference** (`setActiveLenis` /
`getActiveLenis`), the same shape as `turntable-audio.js`'s `AudioContext` singleton —
`scrollToSection()` is called from two plain functions outside any component that owns
Lenis (navbar's click handler, `use-hash-scroll.js`'s ResizeObserver callback), so a
shared reference is more honest than threading it through context for two call sites.

> **The brief asked for the offset to be read via `getComputedStyle(documentElement)`.
> Built something better instead, and verified why the literal ask would have failed.**
> Custom properties do not resolve their own `calc()`: querying `--scroll-offset` directly
> returned the **literal string** `"calc(144px + 24px)"`, not a number — confirmed by
> injecting Lenis into the live page and reading it both ways. `parseFloat()` on that is
> `NaN`. The value only resolves when applied to a real typed property (a hidden probe
> element's `top`, `168px`).
>
> Better fix: **Lenis's own `scrollTo(target)` already reads `getComputedStyle(target).
> scrollMarginTop`** when given an element — verified empirically (168.0px measured,
> matching `--scroll-offset` at 1440 exactly, -0.03px float noise) — the *identical* CSS
> property Stage 0's B3 fix set. So `scrollToSection()` passes **no offset argument at
> all**. Not a workaround for the calc() gotcha; a route that never needed the gotcha's
> value in the first place. One CSS declaration is now the only place the navbar height
> exists, with nothing in JS re-deriving it — closer to Stage 0's actual goal than the
> literal instruction would have landed.

**The cancellation risk the brief flagged was real and reproduced.** Native
`window.scrollTo({top: window.scrollY, behavior:'instant'})` does not stop Lenis: Lenis
writes the scroll position itself every RAF tick toward its own remembered target, so
pinning the native scrollTop is undone on the very next frame. Fixed by making
`use-hash-scroll.js`'s `takeOver()` Lenis-aware — `lenis.scrollTo(lenis.animatedScroll,
{ immediate: true })` collapses `animatedScroll`/`targetScroll` onto the current position
and stops Lenis's animate loop (traced through `node_modules/lenis/dist/lenis.mjs`:
the `immediate` branch calls `reset()`, which calls `animate.stop()`). Confirmed Lenis
doesn't swallow the wheel/touchstart/keydown events the existing guard listens for
first — it calls `preventDefault()`, not `stopPropagation()`, on wheel/touch, and never
touches keydown at all.

**Touch: left at Lenis's default (`syncTouch: false`).** Touch drags scroll natively;
Lenis never intercepts them, only wheel input gets its smoothing. Deliberately
conservative — it sidesteps the touch-specific gotchas Lenis's own docs warn about
(added latency, momentum mismatches vs. native) by not engaging Lenis for touch at all.
Programmatic `scrollTo()` (nav clicks, hash landings) animates on touch devices
regardless of this setting; confirmed on an emulated iPhone 13 context. Genuine
finger-drag "feel" cannot be exercised through Playwright — synthetic `TouchEvent`
dispatch never reaches a browser's native scroll physics, on any site — so that specific
claim rides on the existing real-device iPhone check already queued before Stage 7.

**Verified:**

| Check | Result |
|---|---|
| Nav-link clearance, 4 breakpoints × 4 sections | **23–25px**, matching Stage 0's ~24px exactly |
| Cold `/#about` load, settle-window correction (B3b) | Visibly corrects 65→30→25→**24px** (1440), 92→…→**24px** (480), holds flat 2.4s |
| Wheel / touchstart / keydown mid-scroll cancellation | All 3 hold near the interrupt point; none glide to the original target |
| B3c: history entries added by 2 nav clicks | **0** (replaceState, confirmed via `history.length`) |
| Reduced motion | No Lenis DOM markers; nav clicks jump in **one frame** (no glide); cold hash landing flat at 24px from the first sample; scroll-margin path is the only mechanism running |
| Console/page errors, 4 breakpoints × 2 themes, scroll+toggle | **0** across all 8 runs |
| Stage 1 Task 4 adversarial transport | See below — one divergence found, confirmed **pre-existing**, not caused by this stage |

> **A stress-test artifact worth recording, not a Stage 2 bug.** Re-running Task 4's
> 30-sequence adversarial press test (253 presses) surfaced one divergence at run 23 —
> platter measured at 18.6°/s while `data-deck-state="STOPPED_LOADED"`. Reproduced
> identically on the **unmodified pre-Stage-2 code** (24.8°/s at the same run), so it
> predates this stage. Isolating run 23's exact 14-press sequence on a fresh page
> converges cleanly at 200.9°/s with no divergence at all — the failure only appears
> after ~22 prior runs' worth of real wall-clock time lets the 30-second iTunes preview
> reach its **natural end** mid-sequence, triggering `onEnded`'s `SPIN_END_SECONDS = 1.0`
> brake (longer than a press-triggered one), which the 1250ms settle window doesn't quite
> cover if a press lands close to when it starts. Given 750ms more, it's back at
> 200–203°/s. Self-resolving, not a freeze — the bug Task 4 actually fixed stayed fixed.
> A real visitor would need to press transport 250+ times against one unchanged 30-second
> preview to hit this. Left as a loose end for whenever `DECK.CUEING` (D11) is built,
> not fixed here — Stage 2 is scroll only.

Bundle: JS 423.23 → **443.82 kB** (154.51 → **160.18 kB gz**, +5.67 kB gz — Lenis).
CSS 32.02 → **31.97 kB** (net negligible; comments are stripped, and the only ruleset
change was two removed lines). Lint holds at **16 errors, 0 warnings**.

### Stage 3 Task 1 — the design system, defined *(2026-08-12)*

**Spec only, per the brief.** Everything below is new tokens and `@mixin`s appended to
`main.scss`; no existing selector's declared properties changed, and nothing renders
using them yet. Verified: before/after full-page pixel diff (canvas comparison, not
byte comparison) across `#about`'s two sections, `#projects`, `#connect`, `#my-taste`, at
1440/480 × dark/light. 5 of 20 crops initially came back "different" — re-ran the
**identical, unmodified** code against itself and got the same 5 crops diffing by
similar counts (12,102px in both runs, exactly), which settles it: they're the
navbar-overlay screenshot artifact `FINDINGS.md` §2 already documents, colliding with
About's scroll-linked timeline height (`scrollProgress` state), not a rendering change.
**Zero pixels attributable to this task's CSS.**

**Audited before defining, from the actual tree** — every `font-size`/`padding`/`margin`
in `about.jsx`, `portfolio.jsx`, `connect.jsx`, `my-taste.jsx`'s rendered output:

- **Type:** 15 font-size declarations, ~6 actually-different intended sizes once
  duplicates merge. Two are bugs the old audit hadn't caught: `.timeline-content h3`
  (About's job titles) has **no declared size anywhere** — silent UA default — and
  `.portfolio-header .project-title` (the collapsed project-list title) **renders at
  40px**, because the bare `.project-title` rule at line ~1433 — sized for the slideshow
  Q3 deleted — still cascades onto it; the scoped override only touches `font-weight`.
  Confirmed rendered, not just read from source.
- **Spacing:** two spacing systems that never reconciled — `about.jsx`/`my-taste.jsx` in
  raw px, `connect.jsx`/`portfolio.jsx` in rem, barely overlapping. `.portfolio-title`'s
  `margin-top: 10rem` measured as a genuine **160px empty gap** above "Projects" with no
  content to justify it — almost certainly a leftover from the deleted slideshow that
  used to sit directly above this section.
- **Content column, measured live at 1440px:** bio-container 1000px, `.timeline-container`
  (Work Experience) **unconstrained** (`max-width: none`, full 1440px), portfolio-section
  800px, contact-container 700px, spotify-track-list 1152px (80% of viewport, also
  unconstrained). Five different rules, one of them not a rule at all. **This, not the
  row-internal number/title baseline, is Q1's actual "track numbers... don't align to
  their own rows" complaint** — that screenshot predates B8 (2026-08-10); the baseline
  fix re-verified still holds, 0.0px delta across three sampled rows.
- **Two more bugs found and flagged, not fixed here** (markup is Task 2's job): `.work-title`
  ("Work Experience") is `display: none` below 768px — confirmed rendered, the heading is
  **completely invisible on mobile**, i.e. to most of this site's traffic. And the
  `font-weight: 60` typo on `.contact-title` (browsers clamp to the nearest weight the
  font ships, so this silently renders thin, not the "600" it almost certainly meant).

**The system**, appended to `:root` plus one new mixin block (first `@mixin` usage in
this file — checked, nothing here used Sass mixins before):

| | Decision | Why |
|---|---|---|
| `--text-xs/sm/md` | 0.9 / 1 / 1.2rem, fixed | audited range was already narrow; no need to move with viewport |
| `--text-lg/xl` | `clamp(1.6rem,4vw,2rem)` / `clamp(2rem,5vw,2.5rem)` | the two sizes headings use, **neither had any responsive treatment before** (zero font-size media queries existed for any of the four sections) — clamp() shape matches `.hero-name`'s own established `clamp(min, Nvw, max)` pattern |
| `--space-1..9` | 4px → 96px, base-4 | covers every audited value within one step **except** `.portfolio-title`'s 10rem, deliberately *not* carried forward — one anomalous legacy value doesn't earn its own scale step |
| `--content-width` / `-wide` | 720 / 1100px, both centered | 720px is deliberately close to `.contact-container`'s *existing* 700px — Q1 names `connect-desktop.png` as the section that already "works", so its column is the one to standardise on, not a new number. `-wide` covers layouts that structurally aren't a reading column (Work Experience's timeline, My Taste's lists) |
| `@mixin section-title/subtitle` | `font-weight: 600`, `text-align: center` | 600 over the more common "bold"/700 (found twice) because `.contact-title` is the section **already** deliberately weighted that way (the "60" is almost certainly that value with a dropped digit) and Connect is the section Q1 holds up as working. Centering is a real, visible change for Portfolio (currently left-aligned) when Task 2 applies it. My Taste currently has no title/subtitle hierarchy at all (three equal `h2`s) — audited here for scale purposes, but applying it is Stage 4's job, not Task 2's |

**Q4 — the inverted-band decision: un-invert `.work-experience`.** Not a bug fix, a
direction call, made on this reasoning:

- No principled, content-driven reason was found to single out Work Experience for
  inversion specifically — the original two-band rhythm (this + the deleted slideshow)
  was never content-driven either; both sections just happened to be styled that way.
- **D4's own framing is the deciding fact:** a lone, unpartnered inversion reads as a
  rendering accident, not a choice — reinstating a *second* band purely for symmetry
  would manufacture that same "why is this here" question a second time, with no
  content backing either band.
- Un-inverting makes the entire scroll one consistent surface — Home, Projects, My Taste,
  Bio, Work Experience, Connect all on the same `--bg-color` — which is the literal
  content of Stage 3's goal (`STATUS.md` §1 goal 5, "reads as one coherent design").
- **Not applied here.** `.work-experience`'s `background-color: var(--bg-inverted)` /
  `color: var(--text-inverted)` (main.scss ~1697) and its children's inverted tokens
  (`.work-title` ~1692, `.date` ~1740) are untouched — Task 2 removes them when it
  reaches `#about`, per the stated sequencing.
- D5 (logos-on-white-cards vs. photographs inside the same row) is a separate, still-open
  finding — not decided here, Task 2's problem when it applies the content column to
  About's timeline items.

### Stage 3 Task 2 — `#about` Work Experience rebuilt as a full-bleed scroll timeline *(2026-08-13)*

Bigger in scope than "apply the type scale": Work Experience is **rebuilt**, not
restyled — eight cover panels (photo or generative motif, caption text on a dark
scrim), a scrubbed progress rail, free scroll throughout (no pin, no scroll-hijack).
`.bio-section` (About's other half) is untouched. Full mechanism and every decision
recorded in `ROADMAP.md`'s Stage 3 Task 2 note **before** any code was written, per the
brief.

**Q4 applied, not just decided.** `.work-experience` no longer sets
`background-color: var(--bg-inverted)` — it sits on the ordinary page background like
every other section. Measured: `.work-title` contrast **17.03:1 dark / 17.44:1 light**
against the page (was the B1 fix's inverted-token pairing; now it's just `--text-color`
on `--bg-color`, the same pairing every other heading uses).

**A real layout bug found and fixed during verification, not by inspection:**
`.work-experience` carries **both** `about-section` and `work-experience` in its
className, and `.about-section`'s own `height: 100vh` — harmless before, since the old
`.work-experience` rule redeclared its own matching `height: 100vh` — silently capped
all eight stacked panels into one viewport-height box once that redeclaration was
removed. Not visible by eye (flex-centred overflow doesn't clip, it just renders
outside its own box and corrupts the document flow around it) — caught by measuring
`.work-experience`'s `offsetHeight` (1092px) against `.timeline`'s (5552px) and finding
they disagreed. Fixed with an explicit `height: auto; display: block;` override,
commented in place so it isn't silently reintroduced.

**A second gap, also caught by screenshot, not by reading the CSS back:** the three
`work-motif.jsx` variants (nodes, scan, waveform) had positioning but no
fill/stroke/background at all — SVG's own default (`fill: black`, `stroke: none`) made
all three read as flat black-on-near-black, invisible against the panel's own dark
background. Fixed with a new fixed token, `--panel-accent` (`#6f9bff`, held constant
like `--panel-text` rather than following `--accent`, which is much darker in light
theme and would have gone invisible against a panel that never lightens).

**New fixed tokens — `--panel-text` / `--panel-text-secondary` / `--panel-accent`,**
declared once in `:root`, deliberately **not** redeclared under
`[data-theme="light"]`. Reasoning: the panels sit on their own photo-plus-dark-scrim
treatment, which is constant regardless of site theme (a photo doesn't get lighter in
light mode) — reusing the inverted trio (which *does* flip with `data-theme`) would
reproduce B1/B2's exact failure shape, just on a different variable.

**Mechanism, verified with real scroll input, not synthetic `scrollTo()` jumps** (a
single programmatic jump doesn't reliably exercise ScrollTrigger the way eased Lenis
scroll or real wheel events do — confirmed by cross-checking both): panels start at
`opacity: 0` on a normal top-of-page load, and transition smoothly through partial
states (0.93, 0.998, 0.916 sampled mid-tween) to `opacity: 1` as each crosses `start:
"top 85%"`, `toggleActions: "play none none reverse"`. The rail fill is the one
scrubbed element, sampled at 5 scroll depths through `.work-experience` and confirmed
monotonic: scaleY 0.073 → 0.368 → 0.664 → 0.959 → 1.0. Entry 1's parallax overscans its
panel by 15% top/bottom for a ±8% `yPercent` range — checked at the panel's exit
extreme, image edges sit 131px/58px past the panel's own edges, no gap either direction.
Reduced motion: all panels render at `opacity: 1` immediately (verified via Playwright's
`reducedMotion: "reduce"` emulation) and the rail fill still scrubs — it moves 1:1 with
the visitor's own scroll input, the same category as a native scrollbar thumb, not the
autoplaying/differential motion `prefers-reduced-motion` targets.

**B10 fixed as a side effect of the rebuild, verified rendered at 480px:** "Work
Experience" is kept (a deliberate call — panels are self-labeled and don't strictly
need it, but Stage 3's whole point is one section-header pattern, and dropping the one
heading that would otherwise match `@mixin section-title` undercuts that more than it
simplifies), moved into normal flow, and set with the mixin, which carries no
`display: none` at any breakpoint.

**Content, per entry — three placeholder/fallback categories, all flagged:**

| Entry | Image | Status |
|---|---|---|
| 1. Colegio Peruano Británico (2019) | `assets/about/costa-verde.jpg` | **Placeholder** — Unsplash, Miraflores coastline, downloaded and stored locally (not hotlinked). Pending Diego's own photo |
| 2. Rutgers University (Sep 2021–May 2025) | `assets/about/rutgers-campus.jpg` | **Placeholder** — Unsplash, genuinely Rutgers-specific (Old Queens gate, inscribed "1766" — Rutgers' actual founding year). Top fallback tier, so the generic-campus/motif tiers under it were never needed |
| 3. Trump National Golf Club | `assets/trump.jpeg` | **Not a placeholder** — Diego's own photo, already in the repo. Dates/caption changed: brief gives Jan–Aug 2024 + "Food runner at Clubhouse"; what was live read 2022–2024, no caption. Brief's data used, discrepancy flagged here rather than silently overwritten |
| 4. CodeWiz — Coding Coach | `assets/codewiz.jpeg` | **Not a placeholder** — Diego's own photo. Same discrepancy: brief gives Aug 2024–Jul 2025; what was live read Jan–Jul 2025 |
| 5. GlobalLogic | generative motif (`nodes`) | No photo anywhere in the repo — always a motif, per the brief |
| 6. Capgemini | generative motif (`scan`) | `capgemini.svg` exists but is a logo, not a photo — falls back to the motif in full, per the brief's own "may be sparse" fallback rule |
| ~~7. GitHub activity~~ | ~~`ghchart.rshah.org/6f9bff/diegodamian02`~~ | Live embed, verified before use — 369 real `<rect>` day-cells, 54KB, not an empty response. **Removed, Task 3 (2026-08-13)** — see below |
| 8. Closing beat (Music Technology) | generative motif (`waveform`) | No photo needed per the brief. **Caption edited, Task 3** — see below |

**Capgemini × McDonald's badge — both simpleicons URLs tested, not assumed.**
`cdn.simpleicons.org/capgemini` → **404** (tried `capgemini`, `Capgemini`,
`CAPGEMINI`, `capgemini-com` — no Capgemini mark exists in the simple-icons set at
all). `cdn.simpleicons.org/mcdonalds` → 200, brand yellow (`#FBC817`). Badge is a mixed
lockup per the brief's fallback rule: "Capgemini" as text, real mark for McDonald's.

**One content discrepancy, deliberately not resolved here:** the brief's closing-beat
copy says Diego was **VP** of the Music Technology Club; `.bio-section`'s existing,
untouched text says he **founded** it. Both are Diego's own words at different times —
not something this task can adjudicate, and `.bio-section` is out of scope for Task 2.
Brief's wording used for the new panel only. Flagged for Diego to reconcile.

**Verified:** `npm run build` clean (CSS 32.30→34.41 kB / 7.08→7.53 kB gz, JS
443.82→447.12 kB / 160.18→161.36 kB gz — the delta is `work-motif.jsx` + the rebuilt
`about.jsx`; the two placeholder photos are separate `dist/assets/*.jpg` files, not
inlined into the bundle). `npm run lint` at **13 errors**, three fewer than the 16
baseline — not a fix so much as an incidental byproduct of rebuilding `about.jsx`
data-driven: two unused `arrow`/`arrow_white` imports the old file carried are gone,
and one `react/no-unescaped-entities` (an apostrophe in "McDonald's") moved from a
literal JSX text node to a JS string rendered via `{expression}`, which the rule
doesn't check. Before/after screenshots (both themes, 480/768/1440, five scroll depths,
eight individual panel crops) in `screenshots/about-timeline-*.png`. B1/B2 contrast and
B3's nav-to-`#about` landing offset (144px navbar, lands at 170px — the same ~25px
clearance as the original fix) re-verified holding.

### Stage 3 Task 3 — trim two items from the Task 2 timeline *(2026-08-13)*

Two small, deliberate cuts to the timeline Task 2 shipped, made after reading the
actual shipped code rather than assuming Task 2's original brief still matched it.

- **The GitHub-activity panel is gone.** Entry, JSX branches (`entry.githubChart`,
  the `entry.id === "github"` link), the two URL constants, and the two CSS rules
  that only that entry used (`.timeline-github-chart`, `.timeline-link`) are all
  removed — not just the DOM node. Nothing else referenced any of them (checked with
  a repo-wide grep before deleting).
- **The closing beat's caption no longer claims "VP of the Music Technology Club."**
  It now reads "A minor in Music Technology — the same interest behind the turntable
  up top, and the thread running into what's below." — keeps the bridge into
  `#my-taste` intact, drops the specific club-title claim. The discrepancy this
  closes (`.bio-section`'s own text says Diego *founded* the club, not VP'd it) is
  now moot for this panel rather than resolved — the panel simply no longer makes a
  title claim either way.

**Timeline is now 7 panels**, in the same order minus GitHub:
Colegio → Rutgers → Trump National → CodeWiz → GlobalLogic → Capgemini → Music
Technology (closing).

**The rail-fill math needed no changes, and this was verified rather than assumed.**
It was never count-based — the driving `ScrollTrigger` is scoped to
`.work-experience`'s own scroll extent (`start: "top top"`, `end: "bottom bottom"`,
`scrub: true`), so removing a panel just shortens that extent and the trigger
recalculates its own start/end against the new layout automatically. Re-sampled at 5
depths through the now-shorter section (5170px, down from 5864px): scaleY
**0.085 → 0.388 → 0.691 → 0.993 → 1.0** — still a clean 0→1 sweep, not a truncated one.

**B1/B2/B3 re-verified, unchanged:** `.work-title` contrast 17.03:1 dark / 17.44:1
light (identical to Task 2 — nothing touching those tokens changed). `.date` vs. the
scrim's darkest region: 12.99:1. B3's nav-to-`#about` landing: 169px (was 170px in
Task 2 — the 1px difference is the section's own height changing by a few pixels
before the navbar settle, not a regression; clearance is still the same ~25px).

**Verified:** `npm run build` clean (CSS 34.41→34.21 kB / 7.53→7.49 kB gz, JS
447.12→446.64 kB / 161.36→161.21 kB gz — all down, as expected for a removal).
`npm run lint` unchanged at **13 errors** — the five `about.jsx`
`react/no-unescaped-entities` errors are all in `.bio-section`'s untouched text, just
renumbered to lower line numbers now that the file is shorter. Screenshots (both
themes, three depths, one panel close-up confirming the new caption) in
`screenshots/about-timeline-t3-*.png`; `about-timeline-panel-github.png` from Task 2
kept as the historical "before" record rather than deleted.

### Stage 3 Task 4 — new About Me intro, `#about`/`#timeline` split *(2026-08-13)*

A new, calm single-viewport intro card — portrait, name, one-line placeholder bio,
five fact chips — inserted between the hero and Timeline. **Replaces `.bio-section`
entirely**, not added alongside it: the old two-paragraph bio, Rutgers logo and flag
icons are gone, not adapted. Read the actual shipped `App.jsx`/`navbar.jsx` before
touching anything, per the brief — confirmed `id="about"` currently wrapped the whole
old `about.jsx` (bio **and** work-experience together), which is the id collision the
brief flagged.

**The split, resolved as recommended:** `id="about"` is now the new intro card;
Work Experience moved to its own file, `timeline.jsx`, with its own `id="timeline"`.
Verified no collision (`document.querySelectorAll` id set has 6 unique entries for 6
sections). `.timeline-*`/`.work-experience` CSS classnames are untouched — only the
wrapping `<section>`'s `id` and which file renders it changed.

**Nav order, updated in `lib/sections.js`** (the single source `SECTIONS` array
navbar.jsx, `scrollToSection`, and the hashchange sync all read from):
Home → About Me → Timeline → My Taste → Projects → Let's Connect.

**B3 re-verified for all six sections, not assumed.** The scroll-offset rule
(`.content > section { scroll-margin-top: var(--scroll-offset) }`) is a blanket
selector matching any direct child of `.content` — reordering/renaming sections needed
no per-section change, and this was checked empirically rather than taken on faith:
clicked every nav link fresh and measured landing position.

| Section | Lands at (viewport-top) |
|---|---|
| `#home` | 0.0px (document top, offset correctly clamps to 0) |
| `#about` | 169.0px |
| `#timeline` | 168.4px |
| `#my-taste` | 172.6px |
| `#projects` | 169.6px |
| `#connect` | 168.6px |

All five non-home sections clear the 144px navbar by ~25-29px — the same clearance
B3 established, unaffected by the reorder. B1/B2 (Timeline's `.work-title`/`.date`
contrast) also re-verified unchanged: 17.03:1 dark / 17.44:1 light, 12.99:1.

**Content:**

- **Portrait: `assets/diego.png`, reused, not a new placeholder.** Diego's own
  existing profile photo, already live on the site as `.profile-photo` in the old
  bio-section — the brief's "path Diego provides" is this file.
- **Name / bio / chips exactly as specified.** Bio is the literal placeholder text
  the brief asked for, marked with brackets, no effort spent polishing it.
- **Location chip says "Lima → Chicago," not "New Jersey."** The bio-section text
  this section replaces said "now living in New Jersey" — the brief's data is more
  recent and is what's used, per the same "trust the brief's data, flag the
  discrepancy" approach Task 2 used for the work-history dates. Flagged here for
  Diego to confirm.
- **No Tabler icon library exists anywhere in this project** — checked
  `package.json` and `node_modules`, neither has any icon dependency at all, not
  just a missing guitar glyph. Rather than adding a new dependency for five small
  glyphs, all five chip icons (location, education, focus, music, guitar) are
  hand-drawn inline SVGs, matching the one icon convention this codebase already
  has: `turntable.jsx`'s play/pause glyphs are hand-drawn paths, not a library.

**Animation — two effects, both through `gsap.matchMedia()`, exactly as the brief
asked (not the `useReducedMotion()` hook Timeline/Turntable use elsewhere):**

- **Entrance**, `ScrollTrigger` with `once: true` (not toggleActions — this is a
  single intro beat, not a re-triggerable scroll sequence like Timeline's panels).
  Portrait wipes via a sliding overlay (`xPercent` 0→100, not a scale/clip-path, to
  avoid transform-origin direction confusion), then name → bio → chips cascade
  in strict sequence using `SplitText` word-splitting and explicit `">+=0.25"` /
  `">+=0.3"` timeline positions for the pauses — not chained durations, so the gaps
  are exact regardless of how long the group before took. Verified by sampling the
  DOM every 100ms through the whole sequence: mask finishes ~700ms, name cascades
  700→1200ms, bio starts ~1450ms (≈250ms pause, matches) and finishes ~2200ms, chips
  start ~2500ms (≈300ms pause, matches). `once: true` re-verified by scrolling past,
  back above, and back down — mask stays revealed, does not replay.
- **Idle tilt**, `pointer:fine` and `prefers-reduced-motion:no-preference` combined
  in one query string. `gsap.quickTo()`, ±8° range on `rotateX`/`rotateY`, cursor
  position normalised to the portrait's own bounding box.
- **SplitText's own accessibility handling verified, not assumed:** it sets
  `aria-label` (the real, complete text) on the parent `h2`/`p` and `aria-hidden`
  on every generated word span, so a screen reader reads "Diego Damian" and the
  full bio sentence normally despite the DOM being word-split for the stagger.

**A real GSAP bug found and fixed, not a test artifact.** Two separate
`gsap.quickTo()` calls writing `rotateX`/`rotateY` directly onto the same DOM
element silently no-op'd — console warning `"rotateY not eligible for reset. Try
splitting into individual properties"` — because the browser's native independent
`rotate` CSS property combines both axes into one value, and GSAP's quick-setter
"reset" path can't cleanly split a second writer into an already-compound property.
Fixed by routing `quickTo` through a plain proxy object (`{rx, ry}`) instead of the
DOM node, then combining both axes into one `gsap.set()` call per update — the DOM
element only ever has ONE writer touching its transform. Caught by the same
methodology as B12 (Task 2): measuring/tracing actual state (`getComputedStyle()`
transform matrices, cursor-position math) rather than trusting that code without a
console error was working. Also added a small overscan `scale(1.12)` on the portrait
(same reasoning as Timeline's parallax overscan) — at max tilt, the circular clip was
uncovering a sliver of background at the corners without it.

**Reduced motion / touch, both re-verified with real emulation, not inspection:**
Playwright's `reducedMotion: "reduce"` context shows the mask already revealed and
name/bio at `opacity: 1` on load (no tween ever runs — nothing needed to be
explicitly un-hidden, since `.from()` tweens only establish a hidden starting state
when they're actually created), and mousemove produces zero transform change. A
Pixel 5 device emulation (`pointer: fine` confirmed `false`) still plays the full
entrance — correct, since only the tilt is pointer-gated, not the entrance.

**Verified:** `npm run build` clean (CSS 34.21→34.41 kB / 7.49→7.52 kB gz, JS
446.64→445.89 kB / 161.21→158.78 kB gz — net down despite new content, since the old
bio-section's now-unused `rutgers.png`/`peru.png`/`usa.png` imports are gone).
`npm run lint` dropped to **8 errors** (from 13) — incidental, not a deliberate
fix: the old bio-section's five `react/no-unescaped-entities` errors (its
apostrophe-heavy paragraph text) left with the section that had them. Screenshots —
both themes, three widths, entrance mid-sequence, and the settled tilt state — in
`screenshots/about-me-t4-*.png`.

### Stage 3 Task 5 — About's scroll hold, portrait photo path, location chip split *(2026-08-13)*

Three independent fixes to the new About Me intro from Task 4.

**SCROLL FIX — a fast scroll used to drag straight through About into Timeline
before the ~2.9s entrance finished.** First implementation used GSAP ScrollTrigger's
own `pin` with a short fixed pixel distance, releasing when scroll crossed it — the
brief's literal suggestion. Dropped after testing, for two compounding, *measured*
reasons, not assumptions:

1. **A fixed distance can't be both short and reliable.** Lenis's easing is heavily
   front-loaded (a single hard flick covered ~45% of its total target distance in the
   first ~100ms of testing), so any distance short enough to feel brief for a normal
   scroll was also short enough for one aggressive flick to clear in two or three
   frames. Verified by tracing `scrollY`/pin state at 100–150ms resolution across a
   slow deliberate scroll, a fast continuous scroll, and a single huge wheel jump.
2. **Patching that by re-clamping scroll position on every attempted exit fought
   Lenis's own in-flight target**, and under GSAP's ticker/Lenis rAF sharing one
   `requestAnimationFrame` (`smooth-scroll.jsx`), the release call was occasionally
   reached twice in the same frame — the second `kill()` interrupted the first pin
   revert mid-way and left a stale `position: fixed` on the section **permanently**,
   with the document scrolling freely underneath it. Reproduced repeatedly across
   several fix attempts (a `heldAtBoundary` flag, then a `requestAnimationFrame`
   defer, then a `released` re-entrancy guard) before abandoning the pin entirely
   rather than continuing to patch a fundamentally racy mechanism.

**Shipped mechanism holds scroll input itself, not scroll position after the fact —
nothing to clamp, nothing to race, nothing to revert:**
- `lenis.stop()` / `lenis.start()` for wheel/trackpad input — Lenis's own primitive
  for this, which also halts any in-flight momentum, not just future input.
- A direct, non-passive `touchmove` listener for touch. Checked Lenis's source
  before relying on `lenis.stop()` alone: this project's Lenis instance runs with
  the default `syncTouch: false` (`smooth-scroll.jsx`), meaning touch scrolling is
  **native**, not routed through Lenis at all — `lenis.stop()` has no effect on it.
- A `keydown` listener blocking `PageDown`/`PageUp`/arrow/`Home`/`End`/space while
  holding, so a keyboard user can't scroll past it either.
- The entrance timeline itself is a plain, paused `gsap.timeline()` with **no**
  `scrollTrigger` of its own — genuinely decoupled from scroll, not just
  un-scrubbed. A separate, `once: true` `ScrollTrigger` (`start: "top top"`, moved
  from Task 4's `"top 80%"` — holding on a half-scrolled frame reads as a stutter,
  not an intro) starts the hold and plays the timeline; the timeline's own
  `onComplete` releases it.

**Found and fixed one more thing by testing, not assuming: a nav click straight to
Timeline scrolled through #about on the way there and got held captive for the whole
~2.9s entrance** — a visitor who asked to go to Timeline stuck watching an intro they
didn't request. Fixed with a small pub/sub added to `lib/scroll.js`:
`isProgrammaticScrollActive()` / `onProgrammaticScrollChange()`, set around
`scrollToSection()`'s own `lenis.scrollTo()` call. About's hold checks it on entry
(skips the hold entirely, resolves the entrance to its finished state instantly so
nothing is left invisible for a later visit) **and** subscribes to catch a nav click
that starts mid-hold (e.g. clicking "Connect" partway through About's entrance) —
without the second path, `lenis.stop()` would strand Lenis stopped forever once the
nav click's own forced `scrollTo` (needs `force: true`, since Lenis declines
`scrollTo()` while stopped) moved past it. `scrollToSection()`'s `activeLenis.scrollTo()`
call now always passes `force: true` for this reason.

**Verified empirically, per scroll speed, via Playwright + a real CDP touch session
(synthetic JS-dispatched touch events don't trigger native scroll — Chromium ignores
them as untrusted):**

| Input | Result |
|---|---|
| Slow deliberate wheel (80px / 250ms steps) | Held flat throughout; entrance completes; releases cleanly on the next scroll, small natural increment (Δ8–39px), no jump |
| Fast continuous wheel (400px / 40ms steps) | Frozen for the whole ~2.9s hold; releases the instant the entrance finishes |
| Single huge wheel jump (3000px, one event) | Frozen; held indefinitely if no further input arrives (correct — nothing forces a release the visitor hasn't asked for) |
| Real touch swipes (CDP `Input.dispatchTouchEvent`, iPhone 13 emulation) | Frozen across 5 successive hard swipes; entrance completes; next swipe after release moves normally |
| Keyboard (`PageDown` × 10, mid-hold) | Fully blocked once the hold has engaged; resumes normally after release |
| Nav click → `#timeline`, from top of page | 0/32 sampled frames pinned (previously would have been captive for the whole entrance); lands at the correct offset (168px, matching `--scroll-offset`) |
| Scroll down, entrance completes, scroll to top, scroll down again | No re-trigger — entrance stays at its finished state, hold does not re-engage |
| `prefers-reduced-motion: reduce` | No hold, no Lenis stop, mask already at rest — unaffected, as before |

One honest platform limitation, not a bug: on a real touch gesture that's already
**in flight** at the exact moment it crosses into the hold, Chromium logs "Ignored
attempt to cancel a touchmove event with cancelable=false" for that gesture's
remaining `touchmove` events — the browser won't retroactively cancel a scroll it's
already committed to mid-gesture. This is a bounded, one-time leftover from the one
gesture that triggers the hold (measured: scroll settles and freezes correctly
within that same gesture, doesn't continue drifting), and every subsequent gesture is
blocked from its first `touchmove`. The same category of thing happens with the one
wheel/key event that crosses the threshold on desktop. Not fixable from this side —
the browser guarantees an in-progress native scroll gesture can't be cancelled after
it commits, by design.

**PHOTO PATH — where Diego's new portrait goes.** `assets/diego.png` already follows
the convention Timeline's own (non-placeholder) photos use: personal photos live
flat in `client/src/assets/`, lowercase, one word, matching the person or entry
(`trump.jpeg`, `codewiz.jpeg`, `diego.png`) — the `assets/about/` subfolder is
reserved for the two Unsplash *placeholders* pending replacement (`costa-verde.jpg`,
`rutgers-campus.jpg`), not for real photos.

**Drop the new portrait in at `client/src/assets/diego.png`, overwriting the current
file, keeping it a `.png`.** That's the exact path `about.jsx` already imports
(`import diego from "../assets/diego.png"`), so this needs **zero code changes** —
just replace the file and rebuild. If the new photo is a JPEG rather than PNG,
either convert it first (Preview → Export As, or `sips -s format png in.jpg
--out diego.png`) or say so and the import gets a one-line update to match — don't
silently rename the file to `.jpg`, since the import is a literal path.

> **Superseded same day, once the actual photo arrived** — see the "Task 5
> follow-up" entry below. It landed as `.jpg`, not `.png`: a real photograph
> compresses far better as JPEG (140.6 kB vs. 482.6 kB tested at the same
> dimensions), and it's what Timeline's other real photos already use. Path is now
> `client/src/assets/diego.jpg`, import updated to match, old `.png` deleted.

**LOCATION CHIPS — split into two.** The single "Lima → Chicago" chip (which implied
one direct move and silently dropped the Rutgers/New Jersey years between) is now
two independent, accurate facts in the same two slots: "From Lima, Peru" (new
hand-drawn outlined-flag icon) and "Based in Chicago" (new hand-drawn skyline
icon). Same SVG convention as the other five chip icons (`viewBox 0 0 20 20`,
`stroke currentColor`, no fill) — no icon library added, per Task 4's finding that
none exists in this project. The old single-arrow `LocationIcon` is gone; nothing
else referenced it.

**Verified:** `npm run build` clean (CSS unchanged at 34.41 kB / 7.52 kB gz — no new
rules, the two new icons reuse `.about-me-chip`/`.about-me-chip-icon`; JS
445.89→447.09 kB / 158.78→159.18 kB gz, the hold logic + two icons + the
`lib/scroll.js` pub/sub). `npm run lint` holds at **8 errors** (the baseline) — one
new `no-unused-vars` was introduced and fixed during this task (a leftover
`entranceDone` flag from the abandoned clamp-based design, written in three places
but never read once the design moved to blocking input instead of reacting to scroll
position — caught by lint itself, not missed). B1/B2/B3 re-verified across all six
sections post-fix (table below matches Task 4's, confirming the hold doesn't disturb
`scroll-margin-top` landing positions):

| Section | Landing offset |
|---|---|
| `#home` | 0.0px |
| `#about` | 169.0px |
| `#timeline` | 167.4px |
| `#my-taste` | 172.6px |
| `#projects` | 168.6px |
| `#connect` | 168.6px |

Screenshots — both themes at 1440, both breakpoints (768/480) dark, and a mid-hold
frame (name visible, chips not yet begun, scroll numerically confirmed frozen at
912px throughout) demonstrating the fix — in `screenshots/about-t5-*.png`.

### Stage 3 Task 5 follow-up — real photo, a second scroll-hold bug, bigger portrait, Timeline compressed *(2026-08-13)*

Four fixes from live feedback on the just-shipped Task 5 work, same day.

**Real portrait dropped in.** Diego provided the actual photo (`portrait.JPG`,
5184×3456, no EXIF orientation tag — genuinely sideways at the pixel level, not just
an untagged-but-auto-rotated file). Rotated 90° CCW to upright (verified visually,
not assumed from EXIF, since there wasn't any), then cropped to a 10:13 portrait
ratio centered on the face with headroom down to the collar/shoulders — "zoomed
out" enough to read as an environmental portrait rather than a passport-style
headshot, per direct feedback. Saved as `client/src/assets/diego.jpg` (**not**
`.png`, superseding this same task's own earlier guidance above) — a genuine
photograph compresses far better as JPEG (140.6 kB) than PNG (482.6 kB at the same
600×600, tested both), and this now matches Timeline's actual real-photo convention
(`trump.jpeg`, `codewiz.jpeg`) rather than the old file's PNG holdover. `about.jsx`'s
import updated to match; old `diego.png` deleted, nothing else referenced it
(checked).

**A second, more fundamental scroll-hold bug, found from live testing (not the
earlier task's automated suite):** "gets pinned to half the page, can't see the
top." Two compounding causes, both fixed:

1. **Overshoot** — verified this reproduces even under normal (not adversarial)
   scroll input: ScrollTrigger only notices a crossed threshold on its next update
   tick, and Lenis's own easing keeps moving in the meantime, so by the time
   `onEnter` actually calls `lenis.stop()`, real scroll input can already have
   carried well past the trigger point (measured: a realistic continuous trackpad
   swipe landed the hold 10px past `start` in one run). Fixed with a one-time,
   immediate `lenis.scrollTo(self.start, { immediate: true, force: true })` before
   `lenis.stop()` — not a repeated per-frame clamp, which is what caused the
   stale-pin bug earlier in this same task. Verified this drops overshoot to exactly
   0px across a realistic swipe, 40 rapid-fire notches, and a single huge flick.
2. **The real root cause — `"top top"` ignores the fixed navbar entirely.** It
   holds the section flush with the *viewport's* y=0, not the navbar-cleared line
   every other anchor on this site lands at
   (`.content > section { scroll-margin-top: var(--scroll-offset) }` — Stage 0's
   B3). Invisible with this task's original 240px portrait, since nothing important
   sat in that top ~168px band; real once the portrait got bigger (below) — its top
   edge was ending up genuinely behind the navbar, confirmed via
   `document.elementFromPoint()`: points in the photo's top ~50px resolved to the
   navbar element, not the photo. Fixed by reading the SAME resolved offset Lenis's
   own `scrollTo()` already uses (`lib/scroll.js`'s existing
   `getComputedStyle(target).scrollMarginTop` pattern) off the outer `#about`
   wrapper — the direct child of `.content` that actually carries the blanket rule,
   not `about.jsx`'s own inner `.about-me-section` — and using it as a function-based
   `start: () => "top top+=" + offset` so it re-resolves if the navbar's height
   steps at a breakpoint. Verified holding at 168px (1440px width, 144+24 navbar) and
   132px (480px width, 108+24) — matches `--scroll-offset` exactly at both.

**Portrait made significantly bigger and un-circled, per direct feedback ("make the
photo bigger... doesn't necessarily need to be circular... there's a lot of margin
left... zoomed out and centered properly").** `.about-me-container` moved from
`--content-width` (720px) to `--content-width-wide` (1100px) — the actual fix for
"a lot of margin left": at 1440px that column was leaving ~360px unused on each
side before. `.about-me-portrait-wrap` grew from `clamp(160px, 22vw, 240px)` circle
to `clamp(260px, 30vw, 420px)` at a fixed 10:13 aspect-ratio, `border-radius: 10px`
— reusing `.timeline-panel`'s exact radius (main.scss:1834) rather than inventing a
new one, since both are "photo in a card" treatments on the same page. The 10:13
crop ratio was chosen to exactly match the CSS aspect-ratio, so `object-fit: cover`
has nothing left to crop — the framing on screen is exactly what was composed in
the photo. Idle tilt re-verified against the new shape and size: no corner-reveal
artifact at max ±8° tilt (screenshot), mechanism itself unaffected by the shape
change (confirmed via a clean single in-bounds cursor move — a separate, unrelated
finding surfaced while testing this: a synthetic mouse path that enters the
portrait from far outside the viewport in one `steps`-interpolated move can clip
through the fixed navbar's hit area near the photo's top edge and never actually
reach the tilt handler — a Playwright test-path artifact specific to how CDP
interpolates multi-step moves, not a rendering bug; a real cursor arriving
continuously doesn't do this, and it doesn't reproduce with a real starting
position already on-page).

**Timeline compressed.** `.timeline-panel`'s `min-height` cut from
`clamp(400px, 70vh, 720px)` to `clamp(300px, 48vh, 520px)`, and the gap between
panels from `--space-8` (64px) to `--space-6` (32px) — measured total height
3592px at 1440×900, down from ~4790px (~25% shorter). Checked a full panel
(Capgemini, the badge + motif + longest caption) still reads clearly at the smaller
size — not cramped, screenshot in `screenshots/timeline-compressed-capgemini.png`.

**Checked, not changed:** the "VP of the Music Technology Club" line flagged for
removal — grepped the whole `client/src` tree for "vice president" / "VP of" /
"founder" / "founded" and found nothing. This was already removed in Stage 3 Task
3's closing-caption edit; nothing currently in the codebase references it. Flagging
here in case the mention was about something not yet pushed to production, or a
different piece of copy Diego has in mind.

Re-verified after all four changes: full regression suite (organic scroll at three
speeds, real CDP touch, keyboard, nav-click bypass, no re-trigger on scroll-back-up,
reduced motion) — all clean, zero console errors. `npm run build` clean (JS
447.09→447.23 kB / 159.18→159.25 kB gz — the new photo is an emitted asset, not
inlined, so this delta is just the offset-reading code; CSS 34.41→34.49 kB /
7.52→7.53 kB gz). `npm run lint` holds at the 8-error baseline.

### Stage 3 Task 5 follow-up #2 — scroll hold now centers the card, not top-anchors it *(2026-08-13)*

Live feedback on the navbar-clearance fix above, same day: "cutting up the bottom
part of the picture and the whole section is slightly higher than it should be."
Correct diagnosis — top-anchoring the card right at the navbar-cleared line (the
previous fix) works fine for a *short* card, but this one is tall enough that
anchoring its top can push its bottom past the viewport's own bottom edge, cutting
the photo off there instead. Landing below the navbar was right; landing flush
against it was not.

Fixed by computing the position that **centers** the card in the space the navbar
leaves available, rather than pinning it to either edge of that space:
`navbarHeight + max(0, (availableHeight − cardHeight) / 2)`, read directly off
`--navbar-height` (a plain value, not calc()-composed, so directly readable) and
the section's own measured `getBoundingClientRect().height` — not GSAP
ScrollTrigger's built-in `"center center"` keyword, which centers against the
*whole* viewport including the navbar-covered strip and would still land the card
too high. The `max(0, …)` is the fallback for a card taller than the available
space: clears the navbar and stops there rather than computing a negative offset
that would put it back under the navbar.

Verified at 1440×900: card lands with **9px clear above and 9px clear below** —
essentially perfectly centered, not measured-and-rounded. 768×1024: 58px above,
59px below. 480×900: the one case where the fallback engages (card taller than the
480px-width stacked layout's available space by ~26px) — correctly clears the
navbar and stops, rather than either overflowing further or going negative;
flagged here as a known minor residual (well under one text line) rather than
silently accepted, since it wasn't what was directly reported. Re-ran the full
regression suite after this change too — organic scroll, nav-click bypass, no
re-trigger, all still clean. Screenshot in
`screenshots/about-t5-center-1440.png`.

### Stage 3 Task 5 follow-up #3 — 50/50 centering still measured as "a bit higher" live *(2026-08-13)*

Live feedback on the centering fix above, minutes later: "super duper CLOSE but we
are still a bit higher on the pin... it has to be a bit lower." The 9px/9px split
was genuinely centered by measurement, so this is a case where mathematically
correct centering under a fixed top bar doesn't *read* as centered — the navbar
visually anchors the eye to the top of the viewport, so true center still lands
high. A known effect in visual design (the same reason logos/icons are routinely
nudged below their mathematical center to look centered), not a measurement bug in
the previous fix.

Added `TOP_BIAS = 0.65`: instead of splitting the available slack 50/50 above and
below the card, 65% of it goes above (pushing the card down) and 35% below.
Bounded by construction, not by a separate clamp — `bottomGap` is still `slack ×
0.35`, and slack itself is never negative (the existing `Math.max(0, …)` still
guards that), so this cannot reintroduce the cut-off-bottom bug at any viewport
size; it just has a smaller visible effect where there's less slack to
redistribute in the first place.

Verified at four heights (1440px width) before picking 0.65, specifically to see
how the effect scales with available slack:

| Viewport height | Slack | Above / below (50/50, previous) | Above / below (0.65/0.35, now) |
|---|---|---|---|
| 900px | 18px | 9px / 9px | 12px / 6px |
| 1000px | 118px | 59px / 59px | 77px / 41px |
| 1100px | 218px | 109px / 109px | 142px / 76px |

**Found in the same pass, not yet fixed — flagging rather than silently patching:**
at 800px viewport height, the card (738px tall at 1440px width) is already 82px
*taller* than the space available below the navbar (656px), independent of any
centering logic — the `Math.max(0, …)` fallback stops the top offset from going
negative, but can't stop the card's own bottom from overflowing the viewport when
it's simply too tall to fit. 800px is a realistic browser-window height (not an
edge case — a MacBook without a maximized window, or with any browser chrome
beyond the bare minimum, commonly reports viewport heights in this range). Not
fixed here because the fix is a size/layout tradeoff (shrinking the portrait's max
size on short-but-wide viewports) rather than a positioning one, and the portrait
was just made bigger on explicit request — didn't want to quietly shrink it back
without confirming that's wanted. Flagged for a follow-up if it's actually being
seen.

Re-verified after the bias change: full regression suite (organic scroll, nav-click
bypass, no re-trigger on scroll-back-up) — all clean. Build clean, lint at the
8-error baseline.

### Stage 3 Task 5 follow-up #4 — fixed the flagged short-viewport overflow, plus a real mobile margin bug *(2026-08-13)*

Live feedback, testing on an actual 13" MacBook: "the picture is finally not cropped
but the whole section still looks a bit lower than it should" — plus two mobile
asks: shrink the picture ("doesn't fit properly on screen... crops a lot of the
text") and add margins ("the text is almost touching the phone borders").

**The MacBook report was the follow-up #3 overflow bug, not a new centering
problem.** Re-measured at the real MacBook sizes in play — not full-screen, but
usable height *after* a real browser's tab strip/toolbar/bookmarks bar, which lands
around 700-830px rather than the 900px the section was tuned against:

| Viewport | Before this fix | After this fix |
|---|---|---|
| 1280×800 (full) | -35px (overflowing) | +14px clear |
| 1280×700 (chrome-adjusted) | -135px | +14px |
| 1440×900 (full) | +6px | +14px |
| 1440×780 (chrome-adjusted) | -102px | +14px |
| 1470×956 (full) | +26px | +26px |
| 1470×830 (chrome-adjusted) | -52px | +14px |
| 1512×982 (full) | +35px | +35px |

Fixed two ways, one CSS one JS (see FINDINGS.md B15 for the full mechanism):
`.about-me-portrait-wrap`'s width now has a height-derived ceiling (`min(30vw,
calc((100vh - navbarHeight - 2×padding - 40px) / 1.3))`) so the portrait's own size
responds to available vertical space, not just horizontal; and `onEnter` now checks
the section's *actual* rendered height against actual available space before
holding — if it still doesn't fit (any untested viewport, not just the ones
measured above), the hold is skipped and the entrance plays without blocking scroll,
rather than trapping the visitor on a cropped view.

**Mobile — two real, separate bugs, both confirmed by measurement:**

1. **No horizontal gutter at all.** `.about-me-name`'s left edge measured at
   `x=0` — flush with the phone's screen edge. `.about-me-container`'s
   `content-column` mixin is only `max-width` + auto margins, and
   `.about-me-section` had never declared horizontal padding either. Added
   `padding-left`/`padding-right: var(--space-5)` (24px) at the mobile breakpoint —
   verified 24px on both sides post-fix.
2. **Portrait shrunk** from `clamp(220px, 60vw, 320px)` to `clamp(150px, 38vw,
   210px)` per the direct ask.

Even with both fixes, the full card (portrait + name + bio + 6 chips, stacked)
genuinely doesn't fit a phone-sized viewport in one screen — measured: iPhone SE
needs 815px of height for content that has ~560px available (667px full height minus
the 108px mobile navbar), iPhone 14 needs 827px against ~736px available. Text
height isn't something CSS can budget for reliably, so rather than keep shrinking
type to force a fit, mobile now relies on the JS safety net above: the hold never
engages there, so the visitor scrolls through the section like anything else on the
page — the entrance still plays, just doesn't block them from continuing to scroll
if it doesn't finish in view.

Re-verified after both fixes: full regression suite (aggressive-flick hold still
catches at 1440×900, nav-click bypass lands in <400ms, no second hold on
scroll-back-up-then-down) — all clean. Build clean, lint at the 8-error baseline
(unchanged, no new errors). JS 447.56 kB / 159.36 kB gz, CSS 34.79 kB / 7.61 kB gz.

### Stage 3 Task 5 follow-up #5 — mobile chips trimmed to 3, hold actually re-engaged, bio justified *(2026-08-13)*

Direct feedback, immediately after the above: "just keep my education and my
location for mobile devices. but keep the PIN" — narrowing an initial "drop Test
Automation and Plays Guitar" ask down to three chips total on mobile (both location
chips + education), specifically so the hold ("pin") could re-engage rather than
lean on the safety net every time. Also in the same pass: "justify the text, it
doesn't look that clean."

Chips are hidden via a `desktopOnly` flag on the `CHIPS` array → `display: none`
below 768px (`.about-me-chip--desktop-only`) — all six still render on desktop,
confirmed by screenshot. `display: none`, not `visibility`/`opacity`, matters here:
it drops the chip out of layout entirely, which is what lets `onEnter`'s height
check (FINDINGS.md B15) measure the card as short enough to actually hold.

Three chips alone didn't close the gap on its own (first pass, 4 chips, measured
686px card against 559-736px available) — closed the rest by tightening spacing
that was carrying more padding/margin than a phone screen has room for: portrait
`clamp(150px, 38vw, 210px)` → `clamp(95px, 26vw, 120px)`, portrait-to-text gap and
bio/name margins each cut a step, chip padding and row gap each cut a step, and
`--about-vpad` gets a third, tighter value specifically when a viewport is both
narrow AND short (most real phones, since a phone's own browser chrome eats a bigger
share of a shorter screen than a laptop's chrome does).

Verified the hold actually *engages*, not just that the card's bounding box fits —
matched `scrollY` before/during/after the ~3s hold window, then confirmed a jump on
further input after release:

| Viewport | Card height | Available | Fits | Holds |
|---|---|---|---|---|
| iPhone SE, full (375×667) | 485px | 559px | yes | yes |
| iPhone SE, chrome-adjusted (375×540) | 485px | 432px | no | skips (safety net) |
| iPhone 14, full (390×844) | 501px | 736px | yes | yes |
| iPhone 14, chrome-adjusted (390×700) | 453px | 592px | yes | yes |

The one remaining miss — an older/small phone with nearly its entire screen eaten by
browser chrome — is a genuinely extreme case where the safety net's fallback (let
scroll continue rather than hold) is the right call, not a gap worth chasing.
Screenshotted both phones at rest to confirm three chips doesn't read as sparse
against the extra headroom — it doesn't.

Bio also given `text-align: justify`, with `text-align-last: center` scoped to
mobile only (the un-stretched final line otherwise falls back to plain left/start,
which would sit oddly under the section's centered mobile layout — desktop's last
line stays left, matching the rest of that layout). Confirmed visually the justify
still spaces correctly through `SplitText`'s per-word markup, which persists for the
component's whole mounted lifetime, not just during the entrance — the inter-word
gaps it stretches are ordinary text nodes between the spans, not absorbed into them.

Re-verified: full regression suite clean, all 6 chips confirmed still showing on
desktop, build clean, lint at the 8-error baseline. JS 447.66 kB / 159.39 kB gz,
CSS 35.20 kB / 7.67 kB gz.

### Stage 3 Task 5 follow-up #6 — Timeline's heading was showing through while About was still held *(2026-08-13)*

Direct feedback, tested on an iPhone 17 Pro: "now for the iphone 17 pro or 14 pro
experience line is also showing. Make sure you test for Android, Iphone pro and
pro max please." A direct side effect of the previous follow-up — once the mobile
card actually got small enough to fit and hold again, nothing was reserving the rest
of the screen for it, so Timeline's "Experience" heading (the next thing in the
document) was visible in the leftover space while still scroll-held.

Fixed with one rule on `#about` (the outer wrapper in `App.jsx`, not
`.about-me-section` itself): `min-height: calc(100vh - var(--navbar-height))`
(`100dvh` override for mobile). Deliberately on the outer element — `rootRef`'s own
measured height drives the fit-check and centering math and has to stay the true
content height for those to keep working. Provably sufficient rather than just
tested-and-hoped: the hold always lands the card at a non-negative offset below the
navbar, so `#about`'s reserved height always reaches at least the viewport's own
bottom edge at that position, for any viewport or bias (`FINDINGS.md` B17 has the
full proof).

Built a proper device matrix per the request — Playwright's device profiles (which
report realistic, already-chrome-adjusted heights, not full screen) rather than
guessed numbers:

| Device | Fits | Holds | Timeline visible while held |
|---|---|---|---|
| iPhone 14 Pro / Pro Max | yes | yes | no |
| iPhone 17 Pro / Pro Max | yes | yes | no |
| iPhone SE (2016, 320×568) | no | skips (safety net) | no (scrolled past) |
| Pixel 7 / 9 / 9 Pro | yes | yes | no |
| Galaxy S24 / A55 | yes | yes | no |

9 of 10 devices hold cleanly with Timeline fully hidden; the SE 2016 already used
the safety net before this fix and correctly still does. Confirmed by screenshot
(iPhone 17 Pro, Galaxy S24) that the reserved space reads as ordinary background,
not a conspicuous gap. Applied unconditionally rather than gated to "only while
holding" — desktop was already close to filling the viewport, reduced-motion
visitors never hold at all, and the safety-net mobile case already exceeds one
viewport on its own, so no case actually needed it conditional.

Re-verified: full regression suite clean (nav-click bypass now lands slightly faster
since Timeline sits a bit further down the document), build clean, lint at the
8-error baseline. JS unchanged at 447.66 kB / 159.39 kB gz, CSS 35.30 kB / 7.69 kB gz.

### Stage 3 Task 7 — Timeline rebuilt as Experience: alternating spine, one entrance beat *(2026-08-14)*

Full rebuild of the full-bleed scroll-revealed timeline (Stage 3 Task 2, trimmed
Task 3) as a compact, alternating two-column layout — entries either side of a
central vertical spine, meant to read as one ~1.1s entrance moment rather than
unfold over a long scroll. Renamed Timeline → Experience throughout: `timeline.jsx`
→ `experience.jsx`, `id="timeline"` → `id="experience"` (`App.jsx`), nav label
(`lib/sections.js`), every internal comment reference across `about.jsx`,
`scroll.js`, `work-motif.jsx`. Reasoning for the rename: the section covers
education (Colegio, Rutgers) and coaching (CodeWiz) as much as jobs — "Timeline"
undersold what it actually was.

**Plugins.** `DrawSVGPlugin`, `CustomEase`, `MotionPathPlugin`, `ScrambleTextPlugin`
registered in `lib/gsap.js`. The brief's premise ("confirm available per Task 4's
confirmed access") didn't match what's actually in `ROADMAP.md` — Task 4 was About
Me's intro, not a plugin-access decision, and no "Club GreenSock" confirmation
exists anywhere in this repo's history. Checked the underlying fact directly instead
of relitigating the premise: all four plugins are already present in
`node_modules/gsap/*.js` — GSAP went fully free in 2025 (the Webflow acquisition),
so every formerly-paywalled bonus plugin now ships in the plain `gsap` npm package
this project already depends on (`"gsap": "^3.15.0"`). No new dependency, no
separate install.

**One shared motion signature.** `CustomEase.create("signature", "M0,0 C0.16,1
0.3,1 1,1")` — cubic-bezier(0.16, 1, 0.3, 1), a fast, no-overshoot deceleration
("easeOutExpo" in most naming conventions). Exported as `SIGNATURE_EASE` and used
for Experience's card stagger AND retrofitted onto About's entire entrance
(`about.jsx` — the mask wipe, previously `power3.inOut`, and the name/bio/chip
reveals, previously `power2.out`, all now read this one curve). Verified About's
full scroll-hold regression suite (organic hold still catches an aggressive flick,
nav-click bypass, no second hold on re-entry) after the swap — all clean, the ease
change didn't touch the hold mechanism itself.

**Layout.** Six entries (closing "Music Technology" beat dropped — About's bio
already makes that bridge to `#my-taste`), alternating left/right of a central
spine via CSS grid (`grid-column` + `justify-self`, not flex, so each card packs
against its own OUTER edge while a shared gap stays free at the spine for the
connector to cross). Each entry: a compact thumbnail (`.experience-media`,
`clamp(80px, 8vw, 110px)` — a fraction of the old full-bleed panel's footprint) +
role/caption text, mirrored left↔right so the two columns read as reflections, not
a left layout re-packed. Year-only badges (dropped the old full month/date-range
text) sit centered on the spine at each entry's row, `background: var(--bg-color)`
so they visibly break the drawn line behind them like a real node.

**Rutgers: 2021, not 2025 — flagged per the brief's own request.** Two independent
reasons: (1) the brief already decided CodeWiz (also multi-year, Aug 2024 – Jul
2025) shows 2024, its START year — showing Rutgers' END year would be the one entry
breaking that pattern. (2) A vertical spine's whole job is reading chronologically
at a glance; start years keep every badge monotonically increasing (2019, 2021,
2024, 2024, 2025, 2026), while 2025 would put a bigger number two slots above two
smaller ones (Trump/CodeWiz), which reads as a mistake, not as "Rutgers ran long."

**Animation — one entrance, not a sustained scroll sequence.** `ScrollTrigger`
fires once (`start: "top 70%"`, `once: true`); everything downstream runs on GSAP's
own ticker. The spine (`<path>` in an SVG whose `d`/viewBox are set to the section's
REAL measured height inside `onEnter`, not guessed) self-draws via
`DrawSVGPlugin` over ~0.95s; a small dot travels the same path in sync via
`MotionPathPlugin` (same duration, same linear ease, started at the same timeline
position — two independently deterministic tweens stay visually locked without
extra onUpdate plumbing). As the dot's travel-time crosses each entry's own
measured badge position (a real fraction of total height, not an assumed even
1/6th split — Colegio has no caption and renders shorter than the rest), that
badge scrambles through digits via `ScrambleTextPlugin` before resolving to its
real year — scoped to ONLY the six badges, confirmed titles/captions never touch
it. Cards stagger in on `SIGNATURE_EASE` at the same cue points. Old build's
per-panel `toggleActions` reveal, scrubbed rail-fill, and scrubbed entry-1 parallax
are gone entirely, not adapted — the brief's "no per-row scroll-triggered reveal"
is why.

Timing measured, not assumed: first card starts firing to the last card reaching
full opacity spans **1.11–1.14s** across repeated runs, under the ~1.5s ceiling with
room to spare.

**Two implementation bugs found in testing, fixed before ship** (`FINDINGS.md` B18,
B19): the connector fell 16px short of ever reaching its card (two independently-
chosen spacing tokens for what was meant to be one gap — fixed with a single shared
`--experience-gap` custom property instead of matching the number by hand); and the
Capgemini client badge overflowed and visibly clipped on the narrowest mobile
thumbnail (fixed by dropping the redundant "Capgemini" text at 768px, keeping just
the icon — the adjacent role heading already says it, closer on mobile's linear
layout than it ever was on desktop).

**FIT — measured against a real viewport, not eyeballed.** Section height as a
multiple of one screen's available height (viewport minus fixed navbar):

| Breakpoint | Section height | One screen | Ratio |
|---|---|---|---|
| Desktop (1440×900) | 855px | 756px | **1.13×** |
| Laptop (1280×800) | 821px | 656px | **1.25×** |
| Mobile (390×844) | 766px | 736px | **1.04×** |

Tightened from an initial 1.35× / 1.46× / 1.04× pass — thumbnail size and per-item
padding cut specifically (not `.experience-content`, which had no comparable size
to give up without hurting legibility) until desktop landed close to one screen.
Mobile was already close on the first pass and untouched. None hit exactly 1.0× —
per the brief's own allowance, a small amount of scroll beats forcing a fit at the
cost of legibility, and the ratios above all round to "modest," not "long."

**Preserved and re-verified, not just carried over silently:**
- **B1/B2** (heading/date contrast) — no longer applicable in their original inverted-
  background form (Q4 already un-inverted this section in Task 2), but re-verified
  the new plain-background text: title/h3 **17.03:1**, caption **7.65:1**, year
  badge **17.03:1** — all far past the 4.5:1/3:1 requirements, measured from
  rendered computed styles.
- **B3** (nav-click scroll offset) — `#experience` still a direct child of `.content`
  (App.jsx), so the blanket `scroll-margin-top` rule applies with zero extra code.
  Verified: nav click lands the section ~25px below the navbar, matching
  `--scroll-offset`.
- **Capgemini × McDonald's badge** — same lockup, same tested fallback
  (`cdn.simpleicons.org/capgemini` still 404s, McDonald's still resolves), same
  logic. Re-verified rendering correctly in both themes at every breakpoint (B19
  above covers the mobile-specific fix it needed).
- GlobalLogic's `nodes` motif and Capgemini's `scan` motif — unchanged components
  (`work-motif.jsx`), just filling a smaller container. `waveform` (the closing
  beat's old motif) is now unused — left defined, not deleted, flagged in a code
  comment for a future entry that might want it.

Screenshotted desktop/laptop/mobile × dark/light (6 shots) — all clean, connector
visibly bridges spine to card on both alternating sides, motifs and the client
badge render correctly in both themes.

Full regression: About's hold/release/nav-bypass/once-only suite clean (ease swap
didn't touch the mechanism), reduced-motion path verified (all cards visible
immediately, badges show correct years with no scramble, spine pre-drawn, dot
hidden — no console errors), full-page scroll through all six sections with zero
console/page/network errors. Build clean. Lint at the 8-error baseline (unchanged —
nothing new from this task). JS 483.51 kB / 173.53 kB gz (four new plugins, +~14 kB
gz), CSS 37.08 kB / 7.96 kB gz.

**One orphaned token found, not removed:** `--panel-text-secondary` had exactly one
consumer (the old `.timeline-content`'s caption-over-scrim text), which no longer
exists — captions now sit on the plain section background. Left defined rather than
deleted (a future overlay-on-photo treatment would want it again), flagged with a
comment at its declaration.

### Stage 3 Task 7's layout — **SUPERSEDED, Stage 3 Task 9**

The alternating-spine section above is no longer what ships — see the Task 9
write-up below. Kept as history, not as a description of the current build.

### Stage 3 Task 8 — bigger images, hover captions, entrance-pin — **SUPERSEDED mid-task by Task 9**

Started as: grow Task 7's icon-sized thumbnails, move captions off the persistent
layout into a hover/focus reveal, and add a short entrance-pin copying About's
Task 5 technique. Implemented and partly verified (hover/focus reveal working,
touch fallback working, a real mobile clipping bug found and fixed — captions'
`<h3>` had no line-clamp, so a 3-4 word title could wrap past 2 lines and get
silently clipped by the image's own `overflow: hidden`), but never shipped as its
own commit: live user testing caught the same structural problem Task 9's brief
names directly — "the images are way too small... you can barely see anything
there" — and separately, the entrance-pin's own safety net (correctly, by design)
almost never engaged at standard viewport heights, because Task 7's vertical
layout already ran past one screen at desktop/laptop even before Task 8 grew
anything. Growing images on top of that only made the mismatch worse. Rather than
ship a pin that mostly doesn't pin, this became Task 9.

### Stage 3 Task 9 — rebuilt again as a pinned, horizontally-scrubbed filmstrip *(2026-08-14)*

Replaces Task 7/8's vertical alternating spine entirely, not on top of it —
`.experience-item`/`-connector`/`-badge`/`-caption` and the vertical
`.experience-spine` are all gone, not renamed. Root problem Task 8 exposed: in a
vertical list, row height is dominated by the image, and removing the text column
never traded against that — it just added height with nothing freed up in return
(measured directly: Task 8's first pass at "significantly bigger" images alone
pushed desktop from Task 7's 1.13× one screen up to 1.85×). Bigger photos and
"fits one screen" were structurally incompatible as long as six entries meant six
stacked rows. Pinning the section at a FIXED footprint and mapping vertical scroll
to horizontal motion removes that coupling outright — six entries cost the same
vertical space as one, regardless of image size or entry count.

**Mechanism.** One `gsap.timeline({ scrollTrigger: {...} })` per section (not a
separately-built `ScrollTrigger.create()` — see the bug below), pinned
(`pin: true`), scrubbed (`scrub: 0.3`) across a scroll distance equal to
`.experience-track`'s scrollWidth minus the viewport's width, plus an entry
buffer (below). `start: "top top+=navbarHeight"` — the same navbar-aware
convention Task 7/8 used, so a nav click (which lands via CSS `scroll-margin-top`,
`B3`) engages the pin at the same position rather than landing just short of it.
`snap` pulls release to the nearest whole card via a custom `snapTo` function (a
plain `1/(n-1)` fraction would land wrong once the entry buffer stretches
progress:0 into a whole dead-zone segment instead of one point). Scrolling past
the last card un-pins and continues normally into `#my-taste`; scrolling back up
from there re-crosses `start` and re-engages the pin, scrubbing backward — this
falls out of `scrub` natively, no custom direction-tracking code exists or was
needed.

**Spine and dot.** Same four plugins as Task 7 (`DrawSVGPlugin`, `CustomEase`,
`MotionPathPlugin`, `ScrambleTextPlugin`) — no new dependency, no new
registration. The spine (`.experience-rail`, an SVG child of `.experience-track`,
so it moves with the SAME `x` transform every card does — no separate scrub
wiring) now runs horizontally, its `d`/viewBox set from REAL measured pixels on
BOTH axes (`trackWidth` × the rail strip's own real `clientHeight`, not an
abstract width-only box) — the exact distortion-avoidance Task 7 used for the
vertical spine, ported directly: a viewBox whose two axes don't scale 1:1 against
the real rendered box stretches the accent dot into an ellipse. `drawSVG` and the
`MotionPath`-driven dot are tweens on the SAME scrubbed timeline as the track's
own `x`, both starting at the same timeline position — draw position IS scroll
position, not a separate time-based animation layered on top.

**Center-focus emphasis.** Each card's distance from the viewport's horizontal
center (computed from its static offset within the track plus the track's live
`x`, not a `getBoundingClientRect()` read every frame — cheaper, no layout
thrashing) maps through a linear falloff to `scale` (0.8 → 1.08) and `opacity`
(0.4 → 1), written via direct `gsap.set()` calls in the scrollTrigger's own
`onUpdate` — deliberately NOT tweened via CSS transition, since a transition
fighting a value already being rewritten every scrub frame only adds lag. The
same per-frame pass picks whichever card has the smallest distance as "active"
(`.is-active` class), which is what `.experience-info`'s automatic reveal and the
once-per-card `ScrambleTextPlugin` badge trigger both key off.

**Two-tier captions, not hover-only.** Date (`.experience-date`) sits in a
reserved strip above every card's photo, always visible regardless of active
state — the timeline stays scannable by year even for cards the scrub hasn't
reached. Role + caption together (`.experience-info`) show automatically on
whichever card is active — no hover required, which is what makes it work
identically on touch — and additionally on `:hover`/`:focus-within` for ANY card
as a secondary peek (plain CSS, no `pointer: fine` gate the way Task 8's
hover-only caption needed one — here hover is a bonus on top of an already-working
default, not the only way to see anything).

**ScrambleText fires once per card, ever** — tested the alternative (re-fire every
time the same card re-becomes active on scroll-back) empirically and reverted:
on a quick back-and-forth scrub the digits kept interrupting each other
mid-scramble, reading as noise instead of the "one deliberate detail" Task 7
established this effect as.

**Reduced-motion fallback is a genuinely different component**
(`ExperienceStatic`), not the filmstrip with the pin/scrub/scale stripped out —
plain document flow, no transform, everything always visible, picked via a
JS-level branch (`useReducedMotion()`) rather than a CSS-hidden duplicate, since
rendering both would mean every photo on the page loads twice.

**Three real bugs found in testing, fixed before ship:**

1. **The scrub didn't scrub — it jumped straight to the end.** An early version
   built the pin via a standalone `ScrollTrigger.create({ pin: true, scrub: 0.3,
   ... })`, then pointed a separately-created timeline at that instance via
   `gsap.timeline({ scrollTrigger: st })`. The PIN half worked (a bare
   `ScrollTrigger.create()` with `pin: true` genuinely pins on its own), which is
   exactly what made this hard to catch from the pin alone — but nothing wires an
   *existing* ScrollTrigger instance to drive a timeline's scrub that way, so the
   timeline had no `paused: true` and no real scrub link, and simply autoplayed to
   its end the instant it was created. Confirmed via Playwright: even gentle,
   small-tick scrolling read `x: -2280` (fully scrubbed) on the very first frame
   the pin engaged. Fixed per GSAP's own documented pattern — pass the
   `scrollTrigger` CONFIG OBJECT directly to `gsap.timeline()`, not a pre-built
   instance.
2. **Tab-focusing an off-screen card fought the pin.** Every card was
   `tabIndex={0}` regardless of scrub position in an early version; a real Tab-key
   walk reached ones sitting well off-screen (transform-hidden by
   `.experience-viewport`'s `overflow: hidden`), and the BROWSER's native
   "scroll the newly-focused element into view" heuristic doesn't know a
   horizontal CSS transform put it there — it tried correcting with a vertical
   document scroll instead, shoving real `scrollY` forward by ~289px in one Tab
   press. Fixed by toggling each card's `tabIndex` (0 or -1) from the SAME
   per-frame falloff calc driving scale/opacity — cards below a visibility
   threshold leave the tab order entirely, so Tab simply never lands on one.
3. **Live feedback, not idle testing: "images too small... doesn't look centered
   on my MacBook 13-inch M2."** Two compounding causes, both fixed:
   - Card *shape* was accidental — `.experience-media` was absolutely positioned
     and stretched to fill whatever height `.experience-card` had (itself
     stretched to fill the viewport's independently vh-clamped height), while
     card *width* was an independent vw-clamp. Nothing tied the two together, so
     at some real viewport widths the rendered box came out TALLER than it was
     wide — a portrait crop, the opposite of "photos should be loud, cleaner
     look." Fixed by making height DERIVE from width through one fixed
     `--experience-media-aspect` (3:2 desktop, 1.2 mobile) instead of two
     independently-guessed clamps — the mismatch is now structurally impossible,
     not just re-tuned.
   - The active card sat 150-175px left of true center on arrival (worse at wider
     viewports), reproducible with entirely normal scrolling, not just an
     aggressive test flick — real trackpad/Lenis momentum routinely carries
     `scrollY` past the pin's `start` before it visually engages, and since
     `scrub` reads real scroll position directly, that overshoot became real
     scrub progress on the very first frame anyone saw the section pinned.
     **First fix attempt** copied About's Task 5 / this task's own — before this
     rewrite — entrance-pin technique: `lenis.scrollTo(self.start, {immediate:
     true, force:true})` inside `onEnter`. **Broke scrolling entirely** — Playwright
     confirmed `scrollY` completely frozen across 15 consecutive wheel ticks.
     Root cause: unlike About's hold (which calls `lenis.stop()` immediately
     after the snap, so nothing can re-enter), this pin never stops scroll — an
     `immediate: true, force: true` Lenis `scrollTo` fired from INSIDE a
     scrollTrigger callback that's itself mid-way through processing a live scrub
     synchronously re-enters Lenis's own scroll handling. **Shipped fix** never
     touches real scroll position at all: an `ENTRY_BUFFER` (220px) of scroll
     absorbs the overshoot silently — the timeline's real tweens (track `x`,
     rail draw, dot) all start at time `ENTRY_BUFFER` rather than 0, so nothing
     is scheduled during that window and the track simply holds its pre-scrub
     state through it, regardless of how much momentum carried the user across
     `start`.

**Verified centered at three real MacBook-class viewports** (not just one
convenient size) after the fix — active card center vs. true window center,
measured via `getBoundingClientRect()`:

| Viewport | Active card center | Window center | Diff |
|---|---|---|---|
| 1280×800 (13" MBP, "More Space") | 639.98 | 640.00 | 0.02px |
| 1440×900 | 719.98 | 720.00 | 0.02px |
| 1512×982 (13" M2 MBP, default) | 755.98 | 756.00 | 0.02px |

**Touch verified with real dispatched touch events**, not a `scrollBy()` proxy —
CDP `Input.dispatchTouchEvent` swipe gestures on an iPhone 14 Pro emulation drove
the scrub smoothly and proportionally (`x: 0 → -106 → -643` across successive
swipes, active card advancing 0 → 1 → 2), confirming the same mechanism About's
research already established (touch scroll on this site is native, unrouted
through Lenis) also holds correctly for scrub reads, since `ScrollTrigger` listens
to real scroll position regardless of what drives it.

**Full forward/backward scrub confirmed end-to-end:** active-card sequence
`0→1→2→3→4→5` scrolling down, un-pins into `#my-taste`, and `5→4→3→2→1→0`
scrolling back up from there — re-engaging the pin natively, no special-cased
reverse logic anywhere in the code.

**Snap** settles exactly on both endpoints (card 0 and card 5, 0px diff) and
within ~3% of each interior card's exact center (measured, imperceptible at this
spacing) — verified by scrolling to just past each of the six target positions
and reading the settled `x` after a 700ms wait.

**Preserved and re-verified, not just carried over:**
- **Capgemini × McDonald's badge** — same lockup, same tested fallback
  (`cdn.simpleicons.org/capgemini` still 404s, McDonald's still resolves).
  Task 7/8's mobile-only collision with always-visible caption text (B19)
  doesn't reproduce here — `.experience-info` only shows on the active card or on
  hover/focus, never unconditionally the way Task 8's touch fallback did, and
  cards are large enough now that there's much more vertical room between the
  badge (rail strip) and the info panel (bottom of a much taller card) regardless.
  Measured directly rather than assumed: badge bottom sits ~345px above info's
  top on the active Capgemini card.
- **B1/B2/B3** — badge text/background **17.03:1** (dark) / **17.44:1** (light);
  info-panel `h3` on its scrim uses `--panel-text` (fixed, non-flipping — correct,
  same reasoning the badge already relied on). Nav click still lands `#experience`
  ~24px below the navbar, matching `--scroll-offset` (B3's mechanism,
  `scroll-margin-top` on `.content > section`, is untouched by any of this).
- Reduced motion: `ExperienceStatic` renders correctly, zero console errors,
  6 items, plain always-visible layout.

**Screenshots** (`design-review/screenshots/t9-experience-*.png`): three scrub
progress points (start/mid/end) in dark, mid in light, a reverse-direction shot
re-entering from `#my-taste`, mobile/touch dark + light, reduced-motion dark +
light.

**Lint clean** — 8 pre-existing errors only (`record-crate.jsx`, `turntable.jsx`,
`vinyl-record.jsx`, `my-taste.jsx`), nothing from `experience.jsx`. One
`/* eslint-disable react/prop-types */ ... /* eslint-enable */` block around the
three prop-consuming components (`EntryMedia`, `ExperienceStatic`,
`ExperienceFilmstrip`) — this codebase has no propTypes convention or dependency
(same precedent as `turntable.jsx`'s `track` prop), and `entry`/`entries` are each
read at many separate lines, not just their destructuring site, so a single
`eslint-disable-next-line` wouldn't have covered every usage the way it does for
`work-motif.jsx`'s single-usage `reduced` prop.

**Doc/tree mismatch flagged, not silently absorbed:** `CLAUDE.md` states the lint
baseline as "16 errors (mostly `react/no-unescaped-entities`)". The actual current
baseline — confirmed both before and after this task's own changes — is 8 errors,
mostly `react/prop-types`, only one `react/no-unescaped-entities`. Task 7's own
STATUS.md entry already recorded 8, so this isn't a regression introduced here;
`CLAUDE.md`'s number appears to predate whatever earlier stage brought it down and
was never updated. Worth a correction next time that file is touched.

**Build clean.** JS 484.98 kB / 174.07 kB gz (unchanged plugin set, no new
dependency — flat vs. Task 7's 483.51/173.53). CSS 38.47 kB / 8.19 kB gz (up from
Task 7's 37.08/7.96 — new selectors for the filmstrip/rail/two-tier captions).

### Stage 3 Task 9 follow-up — live feedback: pin-engage flash, off-center cards, snap feel *(2026-08-15)*
Three more live reports, all traced to real code, all fixed, none guessed at:

**1. "abrupt... kinda glitchy once you scroll down there."** The pin's `onEnter`
callback ran `gsap.fromTo(viewport, {opacity:0, scale:0.96}, {opacity:1, scale:1})`
on the theory that this was the section's reveal. It wasn't — `gsap.set()` already
sets the viewport to `opacity:1` once, on mount, long before the user has scrolled
anywhere near the section. Measured by sampling `opacity` across the scroll range
approaching the section: it read `1` continuously from ~450px away, well before
the pin engaged. So `onEnter` was re-hiding and re-revealing content that was
already fully visible, at the exact moment the section snapped to
`position: fixed` — measured opacity dipping to **0.844** mid-fade right at
engagement, the flash. Fixed by dropping opacity from the callback entirely;
kept a small scale-only settle (`0.985 → 1`, `SIGNATURE_EASE`, unchanged) for the
tactile "it caught" cue. Re-verified with 63 samples at 8px scroll resolution
through the engagement threshold — zero samples below `opacity: 1`.

**2. "id like to center the cards more to the middle."** Measured, not eyeballed:
`.experience-section` (the pinned element itself) had no `min-height` — it was
only as tall as its own content (title + the fixed-footprint viewport), which on
a 900px-tall window left ~90px of dead space below the section for the *entire*
pin duration. First attempt centered title+viewport as one flex block within a
`min-height: 100(d)vh - navbar-height` box (the `#about` precedent) — this
removed the dead space below but didn't actually fix the complaint: the title
only ever sits *above* the viewport, never below it, so centering the combined
block still left the viewport itself sitting below the section's true center by
roughly half the title's own footprint (measured: card center at window-y 582
against a true center of 522 — worse than the original 85px-ish offset this was
meant to fix). Landed instead on centering `.experience-viewport` independently:
`position: absolute; top: calc(50% - var(--experience-vp-height) / 2)`, with the
title left in normal flow at the top, unrelated to the viewport's own placement.
`--experience-vp-height` is the same height formula the viewport already used,
named once so `top` and `height` can't drift apart from each other the way two
independently-guessed clamps already caused a bug once this task (the media
aspect-ratio fix, above). Deliberately **not** `transform: translateY(-50%)` —
`experience.jsx` runs `gsap.set/to` with `scale` on this exact element (mount
reveal, pin-engage settle), and GSAP writes its own inline `transform`, which
silently overwrites a stylesheet transform the instant either of those runs
(effectively always, since mount happens immediately) — confirmed by trying
`translateY(-50%)` first and watching the viewport snap back to the section's
top the moment `gsap.set()` fired. The `top: calc(...)` approach never touches
`transform` at all, so there's nothing for GSAP to fight. Also caught, same pass:
`.experience-section`'s `min-height` needs `box-sizing: border-box` — without it,
the section rendered 64px *taller* than its own `min-height` (measured: 820px
against a 756px min-height, the 64px gap exactly matching top+bottom padding),
overflowing past the window's bottom edge and reintroducing the same class of
bug. Same gotcha `.navbar` already has a comment about.

Re-verified at three real viewports, including the MacBook 13" specifically
named in the live feedback: card center vs. true navbar-cleared center, once
settled —

| Viewport | Card center Y | True center Y | Diff |
|---|---|---|---|
| 1440×900 (desktop) | 521.99 | 522.0 | **0.01px** |
| 1280×800 (MacBook 13" M2) | 471.98 | 472.0 | **0.02px** |
| 390×844 (mobile) | 476.0 | 476.0 | **0.0px** |

**3. "the scrolling interaction to the years... I get in between years and then
it locks... doesn't feel that natural."** The snap used `SIGNATURE_EASE` — which,
by its own definition (`lib/gsap.js`), deliberately front-loads almost all its
motion into the first third of the duration. That's the right character for
instant UI feedback (a hover reveal, an entrance pop), but for a scrub *settling*
to rest after a drag, it reads as a lunge-then-hold: nearly all the positional
change happens in ~100ms, then the card sits dead-flat at 0.3s. Added a second,
gentler `CustomEase` — `filmstripSettle`, the standard "easeOutCubic" curve
(`cubic-bezier(0.215, 0.61, 0.355, 1)`), spread evenly across the whole duration
instead of front-loaded — and bumped snap duration `0.3s → 0.45s`. Verified by
sampling the track's live transform every 20ms through a stop-and-settle: the old
curve's signature (~90%+ of motion in the first 25% of the window, flat
afterward) is gone; the new curve still moves visibly in its final ~100ms rather
than reading as an instant stop. This one is inherently the hardest of the three
to reduce to a single number — it's a feel complaint — so the ease swap is
the direct, verifiable fix; final judgment on whether it reads as "natural"
enough is still worth a real live re-check.

No new dependency, no new plugin. Build clean: JS 485.05 kB / 174.11 kB gz, CSS
38.78 kB / 8.24 kB gz. Lint unchanged, 8-error baseline.

**Screenshots** (`design-review/screenshots/t9-experience-followup-*.png`):
centered desktop dark + light, the MacBook 13" viewport named in the feedback,
mobile — all captured settled (post-pin, post-snap), confirming the centering
fix and the absence of the opacity flash together in one set.

### Site-wide scroll feel — Lenis `lerp` tuned, `smooth-scroll.jsx` *(2026-08-15)*
Live feedback, page-wide rather than section-specific: "the render when we
scroll down is not that smooth." Measured before touching anything, since
"not smooth" is ambiguous between jank and lag and they need opposite fixes:

- **Frame timing** (CPU-throttled 4x, rAF deltas across a full top-to-bottom
  scroll, 871 frames sampled): average 16.65ms, worst frame 17.7ms, **zero**
  frames over the 16.7ms budget even once. Not a rendering-performance
  problem — ruled out before looking anywhere else.
- **Input-to-settle lag**: a decisive 5-tick wheel gesture (finished by
  ~64ms), then polling `scrollY` until it stopped moving. Default Lenis
  config (`lerp` was never set, so it ran at Lenis's own default, 0.1) took
  **824ms** to settle within 1px of its final position — the page visibly
  glides for the better part of a second after input stops. That's the "not
  smooth" — not choppy, syrupy.

Set `lerp: 0.2` explicitly. Same test, same gesture: settles in **463ms**
(-44%), while still retaining visible momentum — not tuned so tight it reads
as native 1:1 scroll (lerp near 1), which would remove the reason Lenis is
here. Tried 0.18 (519ms) and 0.25 (368ms) as brackets before landing on 0.2
as the middle point.

Re-verified nothing else depends on the old value: About's scroll-hold still
plateaus ~2.9s (it hard-stops via `lenis.stop()`, independent of lerp, not
lerp-based settling); Experience's pin/scrub still scrubs and snaps correctly
in both directions (`full-scrub.mjs` re-run, all six entries); frame timing
re-checked post-change, unchanged (still 0 dropped frames). Lint unchanged,
build clean (JS 485.06 kB / 174.11 kB gz, CSS unchanged).

### Stage 4 Task 1 — `#my-taste` foundations: data, typography, semantic skeleton *(2026-08-15)*

First of five tasks rebuilding `#my-taste` as a festival-lineup poster
(headliner/support/setlist, duotoned photos, torn-edge cards, grain — full
sequence now in `ROADMAP.md`'s Stage 4 entry, not just this session's chat).
Deliberately jumps ahead of `ROADMAP.md`'s prior "next step" recommendation
(`#projects`/`#connect`) — a direct call, noted here and in `ROADMAP.md` per
the working agreement on sequencing deviations.

**Split into five small tasks, not one large one, on purpose** — the same
lesson Experience's Stage 3 Tasks 7→8→9 already paid for: bundling structural
risk with visual polish meant each of those rebuilds only found its real
problem once it was fully built and living next to the other. This task
carries none of Task 2/3's layout or image risk; it only proves the data is
shaped right and the three new typefaces are legible.

**Data reshaped**, no endpoint changes: `headliner = artists.data[0]`,
`support = artists.data.slice(1, 5)` (4 acts), `setlist = tracks.data` (all
5). `limit=5` on both server endpoints confirmed untouched. `imageAlt` is
computed on each reshaped object now (`headliner.name` / `artist.name` /
`` `Album cover — ${track} by ${artist}` ``) even though nothing renders an
`<img>` yet — the convention lives with the data, ready for Task 3, same
discipline as `experience.jsx`'s `imageAlt` fields.

**`colorwayFor` exported** from `vinyl-record.jsx` (named export, per the
brief — not moved to its own module, which would've been the more
Fast-Refresh-friendly choice but isn't what was asked). Console-verified:
same id → same colorway across 20 calls; four different real artist ids
→ colorways `[1, 4, 3, 2]`, not collapsed to one value. Not called from
`my-taste.jsx` yet — Task 3's job.

**Typography** — self-hosted via `@fontsource` (Vite-bundled, not a runtime
Google Fonts `<link>`): Anton (headliner), Oswald 400/500/600 (support acts),
Space Mono 400/700 (setlist). First deliberate exception to "Avenir Next
everywhere" since Stage 3 Task 1, commented the same way
`--panel-text`/`--panel-accent` were. Scoped entirely to `.my-taste-section`
(`--taste-font-*` custom properties), not `:root`.

Caught before shipping, not after: the package-default imports
(`@fontsource/oswald/400.css` etc.) pull **every** unicode subset the family
ships — cyrillic, cyrillic-ext, vietnamese — which measured out to **46 font
files / 620KB** for three families this English-language site only ever
renders in Latin script. Switched to the `latin-*`/`latin-ext-*` subpaths
specifically (latin-ext kept deliberately, not trimmed further — Spotify
artist/track names are live, uncontrolled data, and an accented name like
Beyoncé or Björk is a real case for a "top artists" list, not a hypothetical
one). Down to **24 files / 408KB** — smaller than one of the site's own
photo assets (`rutgers-campus.jpg`, 425KB alone).

**Semantic skeleton**: one real `<h2>` ("now spinning · my taste", styled
small — a kicker label, not the section's own visual focus), replacing three
equal, unhierarchied h2s ("My Spotify Journey" / "My Favorite Tracks" /
"My Favorite Artists"). Verified via `ariaSnapshot()`: exactly one `heading
[level=2]` announced, everything else reads as plain lists/paragraphs.

**`.spotify-section` deleted entirely** (`FINDINGS.md` D10, now fixed rather
than partially fixed) — base rule + both dead responsive blocks, ~230 lines,
none of it carried forward or "activated." `.spotify-icon` (footer.jsx,
unrelated) confirmed still in use and left alone. New root class
`.my-taste-section`, per the brief, specifically to avoid reproducing D10's
own nesting-specificity trap under a new name.

**Two real bugs found and fixed before shipping** (`FINDINGS.md` B25) — both
caught by the mobile screenshot the task's own verification step asked for,
neither visible on desktop: a flex row missing `min-width: 0` (the classic
`min-width: auto` flex-shrink trap) let long track/artist combinations
overflow instead of wrapping, and that overflow cascaded into the
support-act list overflowing too since nothing on this page clips
`overflow-x`. Fixing it surfaced a *third* recurrence of the
`width: 100%` + padding + missing `box-sizing: border-box` bug `.navbar` and
Experience (`B23`) already have comments about. Re-verified zero overflow at
320/375/390/480/768/1024/1440px.

**Doc/reality mismatch flagged, not silently absorbed:** the brief states
`popularity`/`followers` were "removed entirely from artist/track objects,
February 2026 changelog." Checked directly against the live API response
(not assumed): both fields, plus `genres`, are present and populated right
now — `followers.total: 14169607`, `popularity: 84`, `genres: ["britpop",
"madchester"]` on the live headliner. Doesn't change this task (the brief's
actual instruction — don't reference any of the three — was followed
regardless of the reasoning given), but worth surfacing in case a later task
either relies on "these don't exist" or wants to revisit using them now that
they appear to be back.

**Verified**: real Spotify data end-to-end (headliner "Oasis", 4 real support
acts, 5 real setlist tracks — not fixtures); single-h2 screen-reader pass;
contrast measured, not eyeballed — every text role **7.65–17.44:1** in both
themes (heading/index/artist at `--secondary-text`, headliner/support/track
at `--text-color`, no inverted-band tokens involved so no B1/B2-class risk
here). Lint: 7 errors (down from 8 — the reshape's own copy fixed a
pre-existing unescaped-entity error) + 1 new warning (`react-refresh/only-
export-components` on `vinyl-record.jsx`, an expected, harmless consequence
of exporting `colorwayFor` from a component file, not suppressed). Build:
JS 484.72 kB / 174.07 kB gz (flat), CSS 40.66 kB / 8.61 kB gz (+1.88 kB /
+0.37 kB gz over the pre-Task-1 baseline — small, once the subset-import fix
landed; the naive default-import version would have added +13.48 kB / +5.76
kB gz instead).

Screenshots re-captured (`design-review/capture-screenshots.mjs`, both
themes): `my-taste-desktop.png`, `my-taste-mobile.png`, plus `home`/
`projects`/`about`/`connect`'s own routine re-capture from the same run
(byte-identical content, not a regression — the script always re-captures
its full section list). The blanket `sips` downscale command the script
prints touches every `*-desktop.png`/`*-light.png` in the directory
regardless of what was just captured — narrowed to only the files this run
actually changed before running it, to avoid re-encoding ~30 unrelated
historical screenshots from earlier tasks.

Not done in this task, by design: no wall, no cards, no rotation, no photos,
no duotone, no grain, no motion, no time-range switching. The section reads
plainer than before — correct for where this is at, not a regression.

### iTunes search proxy — **iPhone visitors had a dead record crate**
Every search on iPhone returned "couldn't reach the crate". Apple's Search API
inspects the User-Agent and, for `iPhone`, answers with a `301` to a `musics://`
custom-scheme deep link into the Music app — which a browser `fetch` cannot follow.

Isolated with a Playwright device matrix. **iPhone is the only affected client:**
Pixel 5, Galaxy S9+, Galaxy Tab S4, and iPad all returned 200 from a direct fetch. And
**viewport is irrelevant** — a 1440px desktop sending an iPhone UA fails identically,
while a 390px viewport sending a desktop UA succeeds.

Fixed with `GET /api/itunes/search`, where Node's own User-Agent gets ordinary JSON.
10-minute bounded cache (repeat query 234ms → 2ms), 30/min per-IP limit. Verified at
5 result rows across all five device profiles, down to a 320px Galaxy S9+.

Also invalidates half of Phase 0's conclusion — that probe ran from a desktop UA only,
which held for preview audio and was never true for search. **B5 fixed in the same
pass** and its severity re-rated: a malformed `VITE_API_BASE_URL` now breaks the record
crate too, not just `#my-taste`.

---

## 3. Current measurements

| Metric | Before | Now |
|---|---|---|
| Deploy size | 152 MB | **9.6 MB** |
| Images | 11 MB | **1.7 MB** |
| JS bundle | 407 KB / 147 KB gz | **484.72 kB / 174.07 kB gz** |
| CSS bundle | 26.96 kB / 5.99 kB gz | **40.66 kB / 8.61 kB gz** |
| ESLint errors | 21 | **7** *(+1 warning, `vinyl-record.jsx` — expected, see Stage 4 Task 1)* |
| `.git` size | 91 MB | 91 MB *(unchanged — history rewrite deferred)* |

---

## 4. Outstanding manual tasks

Not code — these need a human with dashboard access.

| | Task | Why it matters |
|---|---|---|
| ⬜ | **Set `RESEND_API_KEY`** on the Railway *server* service | Contact form returns 503 until this lands. The only required var — `CONTACT_FROM_EMAIL` and `CONTACT_TO_EMAIL` have working defaults |
| ⬜ | **Revoke the Gmail app password**, delete `SMTP_USER`/`SMTP_PASS` from `server/.env` and Railway | Unused credential granting send-as access to a personal Gmail |
| ⬜ | Add `send.diegodamian.com` DNS records in Cloudflare (grey cloud) | Optional. Lifts the sandbox restriction so mail can be sent to any address and from `contact@send.diegodamian.com` |
| ⬜ | Delete the Resend "Confirm email change" mail | Clicking it would move the account off `diegodamiango02@gmail.com` and **break delivery** |

Recurring, unchanged: the Spotify refresh token expires every ~6 months — see the
root `README.md`.

---

## 5. What's missing to reach the goal — **SUPERSEDED**

> **[`ROADMAP.md`](./ROADMAP.md) §3 is authoritative for sequencing.** The stage list
> below is kept only as the inventory of *what* remains; the *order* changed on
> 2026-08-08 — most notably the turntable moved from Stage 4 to Stage 1, and the
> design direction is no longer a blocking decision.

Ordered by dependency, not importance.

### Stage 0 — bugs, no design input needed *(~half a day)*
`FINDINGS.md` §4, B1–B7. Independent of every design decision:
- **B1** "Work Experience" heading invisible in both themes (~1.04:1 contrast)
- **B2** timeline card text, same token-inversion root cause
- **B3** nav links scroll their target under the fixed navbar
- **B4** **mobile has no navigation at all**
- **B5** `client/.env` missing a URL scheme — breaks local `#my-taste`
- **B6** slideshow duplicates the project list and is missing a project
- **B7** Rutgers logo clipped

### Stage 1 — the direction decision *(blocking)*
`FINDINGS.md` §8, Q1: extend the hero's material language downward, or pull the hero
back toward convention. **Every section-level design choice resolves differently
depending on this answer.** A taste call, not a research task.

### Stage 2 — section redesign, weakest first
`#about` work experience → `#projects` → `#connect` → `#my-taste`.

### Stage 3 — mobile
Deliberately deferred until Stage 2 lands, since the mobile treatment falls out of
the layout. Absorbs B4.

### Stage 4 — the turntable, Phases 6–12
The hero's entire premise. `previewUrl` is currently captured from the iTunes search
and **thrown away**; there is no `AudioContext` anywhere in the codebase; the platter
never spins; the tonearm is `aria-hidden` decoration.

| Phase | Work |
|---|---|
| 6 | Drop-record + tonearm animation |
| 7 | Audio engine — `AudioContext` → `GainNode` → `AudioBufferSourceNode` |
| 8 | Scratch — `Draggable(type:"rotation")` + `InertiaPlugin` |
| 9 | Pitch fader — ±8% `playbackRate`, `preservesPitch = false` |
| 10 | Scroll-linked ducking + persistent mute |
| 11 | Navbar reversion (drop hide-during-hero gating) |
| 12 | Delete `nav-orb.jsx`/`orb-field.jsx`, drop `@react-spring/web` + `@use-gesture/react` |

`Draggable`, `InertiaPlugin`, and `ScrollTrigger` are already registered in
`lib/gsap.js` and used by **nothing** — the bundle is already paying for them.

### Stage 5 — content and polish
- **Add a resume/CV link.** Currently absent entirely; the largest remaining gap for
  goal 6.
- Accessibility: theme-toggle `aria-label`, hamburger as a real `<button>`, single
  `<h1>`, skip-link (`FINDINGS.md` §6).
- Clear the 16 ESLint errors.
- Migrate the About timeline's unthrottled scroll handler to `ScrollTrigger`.
- Consider a `.git` history rewrite to reclaim 91MB → ~5MB.

---

## 6. Decisions already made — don't relitigate

| Decision | Why |
|---|---|
| **iTunes for hero audio, not Spotify** | Spotify deprecated 30s `preview_url` for apps registered after 2024-11-27. There is no working Spotify path to preview audio |
| **Resend HTTPS API, not SMTP** | Railway blocks outbound SMTP below the Pro plan |
| **Resend sandbox sender, not a verified domain** | Free tier allows one domain and it's already spent. The sandbox's own-address-only restriction is exactly this form's model |
| **`send.` subdomain if a domain is ever verified** | Keeps the apex MX free for real email later |
| **Caddy for the frontend** | Railway's static provider can't do SPA-fallback routing; a hard refresh on `/about` would 404 |
| **Cloudflare SSL mode `Full`, not `Full (Strict)`** | Railway serves its shared default cert to Cloudflare's edge on proxied domains |
| **React Three Fiber abandoned** | A disco-ball hero was fully planned, then superseded by the turntable. Never installed |
| **Mobile deferred until after redesign** | The mobile treatment falls out of the layout; building it first means building it twice |
