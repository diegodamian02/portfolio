# Project Status — diegodamian.com

**Updated:** 2026-08-21 (Stage 3 Task 12) · **HEAD:** `f88a5ea`+ · **Live:** https://diegodamian.com

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

Note this shrank the *deploy*, not the `.git` history — the `.mov` blobs remain in
it. Reclaiming that needs a history rewrite, deliberately deferred. (91MB at the
time of this commit; §3's own current-measurements table has the up-to-date size.)

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

### Stage 3 Task 10 — `#projects`: refined list, single-open accordion, GSAP entrance *(2026-08-18)*

Closes out most of Stage 3's own remaining scope (`#about` → `#projects` → `#connect`,
`#connect` still open). Direction from Q1 still applies: shared design system, not
bespoke material — this task is layout/interaction, no new visual language.

**Two mismatches between the brief and the tree, checked and flagged rather than
implemented against, per the working agreement:**

- The brief's own header called this "Stage 5 Task 1." `ROADMAP.md` §0/§3 — the
  authoritative sequencing source — has `#projects` filed under **Stage 3's own
  remainder** (`#about` → `#projects` → `#connect`) and reserves "Stage 5" specifically
  for the mobile pass, deferred until Stage 3/4 land. Logged here under the roadmap's
  own numbering (Stage 3 Task 10, the next free slot after Task 9's follow-up) rather
  than either silently complying with the brief's label or silently overwriting it
  without a note — same handling this project already gave the Task 3.7/3.8 build-order
  mismatch.
- The brief said the entrance should reuse "the same lightweight pattern already used
  for About and Experience's simple reveals." Checked against the tree: neither section
  has one — About's own entrance is a ~2.9s scroll-hold (`lenis.stop()`/`start()`),
  Experience's is a `pin: true` scrub. No plain "scroll into view, fade in, no pin/hold"
  precedent exists anywhere in this codebase; `#connect` has no GSAP at all yet. Built
  the lightweight reveal the brief clearly wanted regardless (there's no ambiguity about
  intent, just about its claimed precedent) — `start: "top 80%"` has no existing value to
  match, so it's a conventional default, not copied from anywhere. The brief's own
  explicit question — "check whether `toggleActions` should mirror the surrounding
  sections' convention" — does have a real answer, though: every entrance anywhere in
  this tree (About, My Taste) uses `once: true`, never `toggleActions`/reverse. That
  settles it cleanly rather than inventing a third pattern.

**1. Known bugs, fixed as listed:**

- **B11** (`FINDINGS.md`) — the dead slideshow-era `.project-title` rule (`font-size:
  2.5rem; font-weight: 800`) that cascaded onto the collapsed list's title span at 40px —
  deleted outright, not folded into the type scale (the real, still-used rule is the
  scoped `.portfolio-header .project-title`, untouched).
- `.portfolio-title`'s dead `margin-top: 10rem` (160px) — gone, along with the rest of
  the rule, replaced by `@include section-title` (below).
- `.portfolio-section`'s content column — `max-width: 800px; margin: 0 auto` replaced
  with `@include content-column` (720px, the shared `--content-width` token).
- `@mixin section-title` applied to `.portfolio-title` — `--text-xl` (a fluid
  `clamp(2rem, 5vw, 2.5rem)`, down from a fixed 4rem) and centered (was left-aligned).
  Both visible, both deliberate, named as such rather than incidental mixin fallout —
  the now-redundant fixed-2.5rem mobile override came out too, since the mixin's own
  clamp already covers mobile (matching `.experience-title`/`.contact-title`'s own
  precedent: neither needs a breakpoint step once it's on the shared scale).
- Three fully-orphaned rules found while auditing this file, removed alongside B11 per
  the brief's own instruction: `.projects` / `.projects .projects-container` (a
  pre-slideshow parallax container with no matching element anywhere in `portfolio.jsx`)
  and `.project-description` (same fate as B11's `.project-title`, no scoped override
  saving it). A fourth latent issue, `.portfolio-subtitle`'s own left-alignment under
  the now-centered title, was checked against `#connect`'s own precedent
  (`.contact-description` isn't centered under the centered `.contact-title` either) and
  left alone — consistent with an existing pattern on this site, not a new inconsistency.

**2. Single-open accordion, coordinated via real GSAP `Flip`** — first real use of the
plugin in this codebase (registered in `lib/gsap.js`, alongside the other nine). The old
implementation was already structurally single-open (one `expandedProject` id, not an
array), but the swap between rows was two unrelated instant state changes, not one
coordinated motion. `Flip.getState()` reads every row's real `offsetHeight`/position
immediately before the click's `setState`; `flushSync` (`react-dom`) forces that update
to commit synchronously instead of on React's own batched schedule, so `Flip.from()` on
the very next line measures the real "after" layout rather than racing a pending render
— the standard GSAP-Flip-with-React pattern. `onEnter`/`onLeave` fade the
`.portfolio-details` div that mounts/unmounts (Flip can't "flip" something that didn't
exist a moment ago); the row itself (`.portfolio-item`) just grows or shrinks — a real
`height` tween by Flip's own default, not a `scale` transform, so the description/video
inside reflows naturally instead of visibly squishing. `.portfolio-item` gained
`overflow: hidden` so that growth/shrink reads as a clean reveal instead of content
spilling past the row mid-tween.

**3. Entrance** — `ScrollTrigger` embedded directly on the tween (`start: "top 80%",
once: true`), no pin, no scrub, no separate `ScrollTrigger.create()`/`onEnter` pair —
this section has no extra hold logic to coordinate the way About/My Taste's own
entrances do, so the simpler form is the honest one. `~0.09s` stagger, `0.45s` duration
per row (total ≈0.72s for all four), `SIGNATURE_EASE`. Gated through `gsap.matchMedia()`
(Stage 2's own established pattern): reduced-motion visitors get the settled end-state
set directly, no animation.

**4. Hover** — plain CSS, no GSAP: a 3px accent-colored left edge, `scaleY` 0→1 from a
centered `transform-origin`. `.portfolio-header` gained a small left padding to reserve
room for it (so the edge's appearance doesn't shift the row's text sideways) and its own
explicit `:focus-visible` outline — the one interactive element on the site that didn't
already have one (navbar links, the theme toggle, My Taste's cards, and every form field
all do).

**Two more bugs found and fixed in the same pass, both introduced by this task's own
changes and caught before landing — full writeups `FINDINGS.md` B33/B34:**

- **B33** — adopting `@include content-column` (`width: 100%`) on a rule that also
  carries its own padding, under the default `content-box`, overflowed the mobile
  viewport by exactly 2×`--space-6` (64px measured at 390px wide) — the identical
  `box-sizing` gotcha `.navbar` hit at Stage 0 Task 5. Fixed with an explicit
  `box-sizing: border-box` on `.portfolio-section`.
- **B34** — `.portfolio-header:hover`'s pre-existing `scale: (1.1)` (confirmed live: it
  actually parses and applies, computed `scale: 1.1`) had always been slightly broken,
  just invisibly — nothing constrained its overflow before. This task's own
  `overflow: hidden` (needed for Flip's clean height tween) started clipping it for
  real, visibly cutting the title/role text on hover. Removed the scale rather than
  worked around the clipping, since scaling a whole `space-between` text row 10% on
  hover was an odd effect in its own right.

**A third bug, found in shared test infrastructure, not the site — `FINDINGS.md` D14:**
re-capturing screenshots surfaced a real gap in `design-review/capture-screenshots.mjs`.
Its own `SECTIONS` traversal order visits `'projects'` right after `'home'`, but
`#projects`' real DOM position sits below `#about`, so reaching it via
`scrollIntoViewIfNeeded()` scrolls straight through About's own ~2.9s scroll-hold. That
hold's own escape hatch (`isProgrammaticScrollActive()`) only recognizes scrolls started
through this app's own `scrollToSection()` — a raw `scrollIntoViewIfNeeded()` looks like
an organic visitor scroll to it, so the hold engaged for real and never released:
confirmed live, `scrollY` frozen at 910 even 3.6s later, well past the hold's own ~2.9s
bound. The capture landed permanently trapped inside About, not just early — only the
first project row visible, the rest still at their pre-entrance `opacity: 0`. Fixed in
the capture script itself: navigate via `element.click()` on the real `a[href="#id"]`
nav link (works for both the desktop and hidden-mobile-menu copy, since a plain JS
`.click()` skips Playwright's own visibility check) instead of a raw scroll — the exact
escape hatch About's/My Taste's holds already carry for this precise case, the tool just
wasn't using it. Re-verified against every section, both viewports, both themes — no
regressions; `about`/`connect`/`my-taste`'s own screenshots are pixel-equivalent to
before.

**A fourth, self-inflicted near-miss in the same file, caught before committing.** The
script's own printed follow-up command downscales desktop/light shots with a glob —
`${OUT}/*-desktop.png ${OUT}/*-light.png` — which matches every OTHER dated,
ad-hoc screenshot already sitting in `design-review/screenshots/` from past bug
investigations too (`t3-*-light.png`, `b8-*-light.png`, a dozen more), several
deliberately captured at 480/768/1024px, not 1440. Running that exact printed command,
copied verbatim, silently upscaled and overwrote ~30 of them — confirmed live, a 480px/
132KB reference shot became a 1440px/915KB one. Caught via `git status` before
committing (nothing evidential was actually lost — `git checkout` restored all ~30
from the last commit), but the tool itself would do this again on the next run by
anyone who trusted its own printed suggestion. Fixed at the source: the script now
tracks exactly which files it wrote this run (`writtenForDownscale`) and prints an
explicit file list instead of a glob — re-verified the new printed command lists only
this run's own 8 files, and running it leaves every other screenshot in the directory
untouched.

**Fit ratio, measured at true default rest (all four rows collapsed) — same three
breakpoints as Experience/My Taste, one-row-open included since that's the tallest state
a real visitor now encounters (only one row can ever be open at once):**

| Width×height | Collapsed | One row open |
|---|---|---|
| 1440×900 | 614px → **0.68×** | 1133px → 1.26× |
| 1280×800 | 614px → **0.77×** | 1133px → 1.42× |
| 390×844 (mobile spot-check) | 757px → **0.90×** | 1144px → 1.36× |

Comfortably fits one screen collapsed at every desktop/laptop width, confirming the
brief's own prediction rather than assuming it — the mobile figure is informational only
(Stage 5's own territory, per the brief's explicit scope).

Verified: single-open swap clicked through all four rows including opening one while
another is already open (stays at exactly one open, every time); reduced-motion visitor
gets instant open/close (height jumps directly, no ramp — 2 distinct samples across 5,
versus 8 distinct ramping samples with motion enabled) and starts with every row already
visible (no stuck `opacity: 0`); entrance stagger confirmed via intermediate opacity
samples during a real scroll, not just before/after; keyboard — Tab lands
`:focus-visible`, Enter opens, Space closes, `aria-expanded`/`aria-controls` track state
correctly; full-page console/pageerror sweep clean across every test. `npm run lint`
holds at **7 errors, 2 warnings** (unchanged baseline). `npm run build` clean: JS
496.50 kB → **517.52 kB** (177.43 → **184.96 kB** gz, +7.5 kB gz — the Flip plugin, this
codebase's first use of it), CSS 45.90 kB → **45.83 kB** (net negligible — the deleted
orphaned rules roughly offset the new hover/focus/Flip CSS). Screenshots re-captured:
`projects-desktop.png`, `projects-mobile.png`, `projects-light.png` (manual capture —
the standard tool's own light-theme pass is scoped to `home`/`about` only, a pre-existing
decision this task didn't expand), `projects-desktop-expanded.png` (one row open, showing
the fixed hover state and the video/links still rendering correctly).

### Stage 3 Task 10.1 — `#projects`: fix the Flip swap feel *(2026-08-19)*

Follow-up to Task 10 above: the brief reported the Flip swap "doesn't feel smooth and
doesn't match the demo mockup," and named two suspected causes. The mockup file itself
(`projects-redesign-mockups.html`) isn't on this machine or in the repo/git history —
confirmed via a repo-wide + full-filesystem search, matching the brief's own caveat
("get it from Diego directly if it's not already accessible"). Matched the motion via
the exact parameters the brief gave in text (`duration: 0.4`, `ease: "power2.inOut"`)
rather than a visual side-by-side against the file.

**Both of the brief's own suspected causes checked against the tree — neither matched,
per the same working agreement as Task 10's own two mismatches:**

- "Missing/default duration and ease" — not accurate. `duration`/`ease` were already
  passed explicitly (`0.5`, `SIGNATURE_EASE`), just the wrong values relative to the
  mockup's `0.4`/`power2.inOut`. A value correction, not a missing-parameter bug.
- "`Flip.getState()` might only be scoped to the clicked row, not the whole list" — also
  not accurate. It was already reading `container.querySelectorAll(".portfolio-item,
  .portfolio-details")` — all four rows, every time, confirmed by reading the code before
  touching it.

**What the live trace actually found — two distinct causes, neither of the brief's
guesses, isolated with a per-frame `getBoundingClientRect()`/inline-style trace on an
uninvolved sibling row during the swap:**

- **A Playwright test artifact, not a production bug.** The first version of the trace
  showed row 3 (below the swapped rows) jump 677px instantly, before any tweening even
  started. Root cause: `headers[2]` sat below the 900px viewport (`top: 1097px`) before
  the click, and Playwright's own `.click()` auto-scrolls off-screen targets into view
  before dispatching — a real page scroll, unrelated to Flip. Confirmed by dispatching
  the click directly (`element.click()` in-page, bypassing Playwright's actionability
  scroll): `scrollY` never moved. Re-traced with the target already in view — this jump
  is gone entirely, and it was never visible to a real visitor to begin with.
- **A real bug: `Flip.from()`'s "after" measurement races the newly-mounted `<video>`'s
  unresolved intrinsic size.** With the scroll artifact isolated out, one genuine snap
  remained — the opening row's own height (and everything below it) landed short of its
  true final size, then jumped an un-eased ~210px the instant the tween's own inline
  overrides cleared. Traced frame-by-frame: `Flip.from()` re-measures the "after" DOM
  state synchronously, inside the same click handler as `flushSync()`'s commit — before
  the browser has committed to the `<video>` element's real dimensions on that first
  layout pass (`.portfolio-video` was `width:100%; height:auto` with no reserved size, so
  the box the newly-mounted element occupies at that exact synchronous instant is smaller
  than its true rendered size once the video's own layout resolves a few frames later).
  Flip locks in that too-small target and tweens toward it correctly — the snap is what
  happens when the tween's own overrides release and the row's true, larger natural
  height finally applies, unanimated.

**Fixes applied:**

- `duration: 0.4`, `ease: "power2.inOut"` on the `Flip.from()` call, matching the
  mockup's own stated values (`portfolio.jsx`).
- `absolute: true` added to the same call — GSAP's own documented fix for list/accordion
  Flips, decoupling animating rows from native document flow for the tween's duration so
  siblings move purely off Flip's own computed delta. Verified via trace: this alone
  turned the middle segment from a slightly uneven curve into a clean, monotonic
  power2.inOut (confirmed by inspecting the frame-to-frame deltas: small → large → small,
  the textbook ease-in-out shape) — real, but not sufficient on its own; the video-race
  snap survived this change untouched, which is what proved it was a second, independent
  cause rather than the same one.
- Each project's real encoded video dimensions (`ffprobe`-measured, not a guessed 16:9 —
  they range from 1.78:1 to 2.06:1 across the four) added to `projectsData.js` as
  `videoWidth`/`videoHeight`, rendered as real HTML `width`/`height` attributes on the
  `<video>` element (`portfolio.jsx`), not just CSS. This is what actually closes the
  race: HTML width/height attributes establish an element's intrinsic aspect ratio
  synchronously at layout time, independent of whether the resource has loaded — so
  Flip's synchronous "after" read is correct on the very first measurement, no async
  dependency left to lose the race against.

**Re-verified clean after the fix** — same per-frame trace, target already in view (no
Playwright scroll confound): row height and sibling position both move in one continuous,
monotonic curve from open to close and back, ending exactly on the true final value with
no residual jump. Confirmed both directions (opening row 2 while row 0 is open, and
closing row 2 again). Re-ran Task 10's own regression suite (single-open behavior,
`aria-expanded` tracking, hover state, console/pageerror sweep) — unchanged, all clean.
`npm run lint` holds at **7 errors, 2 warnings** (unchanged baseline). `npm run build`:
JS 517.52 → **517.71 kB** (184.96 → **185.03 kB** gz, +0.07 kB gz — negligible, the
`videoWidth`/`videoHeight` data fields), CSS unchanged at 45.85 kB / 9.61 kB gz. Resting
(all-collapsed) screenshots are pixel-equivalent to Task 10's own — this task changed
interaction-time behavior and video markup only, nothing visible in the default state, so
the fit-ratio table above still holds unchanged. New evidence screenshots:
`projects-desktop-expanded.png`, `projects-light.png`, `projects-light-expanded.png`
(confirms the video renders undistorted at its real aspect ratio in both themes, and the
B34 hover fix still holds).

### Stage 3 Task 11 — `#connect`: contact form send/error states (Task 1 of 2) *(2026-08-19)*

Brief framed this as a **rebuild** ("send/error states... no animation polish yet —
that's Task 2") and warned the real implementation might not match what's documented,
since the form "has been returning 503s." Re-read `connect.jsx` and `server.js`'s
`/api/contact` route directly before writing anything, per the working agreement — and
neither claim held up:

- **Not a rebuild.** `connect.jsx` already had a real `idle | sending | sent | error`
  state machine (not the alert()-before-sending version the code's own comment
  describes as "previous"), a honeypot, rate limiting, distinct success/error UI, a
  disabled+relabelled submit button while sending, and error text that surfaces the
  server's own visitor-safe message rather than an axios dump. `server.js`'s route
  already had honeypot handling, per-IP rate limiting, header-injection stripping,
  length caps, a explicit `{ data, error }` check on the Resend SDK response (it
  resolves rather than throws on a rejected send), and — the exact requirement this
  brief asked for — a fail-closed `503` with a specific, honest message when
  `RESEND_API_KEY` is unset, checked before anything else in the handler. None of this
  needed building; it already existed and reads as already well-considered.
- **Not currently 503ing.** Probed `https://api.diegodamian.com/api/contact` directly
  with an empty JSON payload — safe, since the `RESEND_API_KEY` check runs *before*
  validation either way, so this never reaches Resend regardless of the key's state.
  Got back **`400` — "Name, email, and message are all required"**, not `503`. That
  response is only reachable if the key check passed, meaning **`RESEND_API_KEY` is
  live on Railway right now** — confirmed further by a real end-to-end test submission
  through the local dev server (same code path, same `CONTACT_TO_EMAIL`), which
  returned `{ ok: true }` and landed in the real inbox.

**This directly contradicts this file's own "Outstanding manual tasks" table** (§4
below), which still lists `RESEND_API_KEY` as unset with "Contact form returns 503
until this lands" — stale, corrected below. It's also what the brief itself assumed
going in. Since the checklist and the brief agree and reality disagrees with both, this
is logged as a real, load-bearing discrepancy rather than a quiet fix — whoever set the
key on Railway didn't update the doc that told the next reader to expect a 503.

**What was actually missing, and built:**

- **Client-side validation on the message field**, scoped exactly to what the brief
  asked (not name/email — those stay enforced by the existing server round-trip,
  surfaced through the same generic `.contact-error` banner as any other send failure,
  deliberately not duplicated client-side). The form carries `noValidate`, so nothing
  caught an empty message before this — submit went straight to the network. Now:
  trimmed-empty blocks submit, sets a `field-error` paragraph under the textarea
  (`aria-describedby` + `aria-invalid` wired to it, a plain red border, no animation),
  never calls the API. Clears on the next edit to that field, mirroring how the
  existing top-level `error` status already resets on any edit.
- **`data-state={status}`** on `.contact-container` — the full `idle/sending/sent/error`
  machine, not just a hardcoded `"sent"` flag, matching `turntable.jsx`'s own
  `data-deck-state` precedent (the only other place in this codebase doing exactly this)
  rather than inventing a narrower pattern. No animation reads it yet — this is the
  hook Task 2 attaches to, not the motion itself, per the brief's own scope line.

**Verified live, not just read** — three states, real network calls, no mocking:

- **Client-side block:** submitted with name+email filled, message empty. Inline
  error rendered ("Please write a message before sending."), `aria-invalid="true"`,
  confirmed via a request listener that **no** `/api/contact` request fired at all.
- **Server failure path:** submitted with a malformed email (`not-an-email`) and a
  real message. Got the server's own `400` — *"That email address doesn't look
  right."* — rendered in `.contact-error`; the message field's contents were **not**
  cleared, the form stayed fully editable, matching the brief's explicit requirement.
- **Real success path:** submitted a genuine test message end-to-end through the local
  dev server's live `RESEND_API_KEY`. Button read "Sending…" and was disabled while
  pending; on completion `.contact-container[data-state="sent"]`, the success view
  rendered, and clicking "Send another" reset both the form fields and `data-state`
  back to `idle`. **This sent one real test email to Diego's own inbox** — the
  configured `CONTACT_TO_EMAIL` — as the honest way to verify the path per the brief's
  own instruction, not a synthetic/mocked assertion.
- **Fail-closed path, confirmed independently:** since the live key meant the 503 path
  couldn't be exercised through the running dev server, spun up a second, isolated
  `server.js` instance on a separate port with `RESEND_API_KEY` explicitly cleared.
  Got exactly the documented `503` — *"The form isn't available right now — please
  email me directly."* — confirming the existing fail-closed logic is correct (not
  just assumed correct from reading it), for whenever the key situation changes again.

Full-page console/pageerror sweep clean (the one console line logged is the browser's
own note about the deliberately-triggered `400` response, not an unhandled error).
`npm run lint` holds at **7 errors, 2 warnings** (unchanged baseline). `npm run build`:
JS 517.71 → **518.00 kB** (185.03 → **185.13 kB** gz, negligible), CSS 45.85 → **45.96
kB** (9.61 → **9.64 kB** gz, negligible — two small rules, `.field-error` and the
`aria-invalid` border cue). New evidence screenshots: `connect-field-error-desktop.png`,
`connect-field-error-light.png`.

**Explicitly not done here, per the brief's own scope:** no GSAP/`CustomBounce`/
`ScrambleTextPlugin`, no animation on the `data-state` transitions, no visual/token
pass (the separate, still-open "apply `--content-width`/`@mixin section-title` to
`#connect`" item `ROADMAP.md` already tracks under Stage 3's remainder — a different
piece of work from this one, not touched). `#connect`'s own Task 2 (animation) is now
unblocked; the design-system token pass remains a separate, still-unstarted item.

### Stage 3 Task 10.2 — `#projects`: scroll expanded content into view *(2026-08-20)*

Real gap: even though the collapsed section fits one screen (0.68×/0.77×, Task 10),
an *expanded* row could push its own video/description/links below the fold, and
nothing brought that content into view — the visitor had to scroll manually. Built a
`scrollExpandedRowIntoView()` helper: skips entirely if the row already fits, lands
the bottom flush at the viewport edge if only that's cut off, lands the top just below
the nav if only that's cut off, and falls back to a top landing if the row is taller
than the space available between the two (can't show all of it at once — the header
and the start of the content win over chasing an unreachable bottom). Swap case (row A
closes, row B opens) scrolls toward B, the row the visitor is actually trying to see;
closing a row with nothing new opening never triggers a scroll.

**The nav-offset constant needed two real fixes to actually reuse, both found live, not
assumed from the code reading right:**

- Read as `getComputedStyle(root).getPropertyValue("--scroll-offset")` first, per the
  brief's own instruction to reuse the constant rather than a second number. Silently
  returned `0` every time. `--scroll-offset` is a `calc(var(--navbar-height) + 24px)`
  expression — a plain custom-property read returns that unresolved calc() **string**,
  not a used-value number, so `parseFloat("calc(144px + 24px)")` is `NaN`, swallowed
  silently by a `|| 0` fallback. Fixed by reading `scrollMarginTop` instead — a real
  used-value CSS property that resolves to an actual px number even from a calc()'d
  custom property, the same read Lenis's own `scrollTo(element)` does internally
  (confirmed in `node_modules/lenis/dist/lenis.mjs`) for this exact reason.
- Reading it off `rowEl.closest("section")` also silently returned `0`: `App.jsx` wraps
  `Portfolio`'s own returned `<section className="portfolio-section">` inside a
  **second, outer** `<section id="projects">` — the one `.content > section` actually
  matches — so `closest()` from a row finds the *inner* one instead. Fixed by reading
  it off `document.getElementById("projects")` directly, the same lookup
  `scrollToSection()` itself already uses.

**A real, page-wide bug found and fixed along the way, unrelated to scrolling itself —
full writeup `FINDINGS.md` B36:** `.portfolio-list` has no explicit `position` and no
height of its own; Task 10.1's `absolute: true` takes every row out of flow at once for
the tween, so with nothing pinning it, the container collapsed to 0px height for the
whole ~400ms — confirmed live, total document height dropped ~895px the instant the
tween started, with `#connect` and the footer shifting upward to fill the gap the
entire time. Fixed with GSAP's own documented pattern for this exact case: lock the
container to a fixed pixel height (whichever of the before/after states is taller) for
the tween's duration, release it in `onComplete`.

**The harder problem, and the actual reason this took real diagnostic work: a
browser-native scroll adjustment this app doesn't cause and can't intercept.** First
version computed the target once, synchronously, and fired the scroll alongside
`Flip.from()` — the direct reading of "coordinate timing... read as one motion." Live
testing found that unreliable for reasons entirely outside this component: opening *or*
closing a row — even with Flip fully disabled (reduced motion) and every scroll call
and `scrollTop` write this app makes traced and ruled out (a `window.scrollTo`/
`Element.prototype.scrollTop` monkeypatch caught zero calls) — measurably and
consistently moves `window.scrollY` on its own, the instant the row's real content
height changes. Ruled out, each confirmed live rather than assumed: scroll anchoring
(disabled `overflow-anchor` via a real first-paint stylesheet rule *and* inline styles
on every element — no change either way), a focus-follow effect (drift persisted with
focus established well before the toggle, and with the button blurred before the
layout change), this app's own `useHashScroll` correction (persisted well past its own
2s settle window), and a Playwright/headless artifact (reproduced headed, with real
mouse-dispatched clicks). Whatever the underlying mechanism actually is, a delta
computed against a "before" snapshot can't reliably predict where things land once it's
also had a say. Redesigned around measuring **after** everything settles instead of
racing it: the scroll check now fires from `Flip.from()`'s own `onComplete` (one extra
frame deferred — the other mechanism doesn't necessarily finish reacting in the exact
frame `onComplete` fires; measured live, skipping that frame consistently undershot by
single-digit-to-teens pixels, a late measurement rather than a wrong one), and for
reduced motion, one `requestAnimationFrame` after the state commit. In practice this is
usually a small top-up, not a large jump, since the other mechanism is already doing
part of the work — and empirically it still reads as one continuous interaction, not a
visible two-step jump.

**Verified, not just read:** all four rows opened individually, all 12 ordered swap
pairs, at 1440×900 / 1280×800 / 390×844 — **0 failures**, every row's full content
(through the links row) lands within the true visible area (below the nav, above the
viewport bottom) with no manual scrolling. Confirmed a row that's already fully visible
after expanding does **not** trigger a scroll (opening the same row twice in a row
lands at the identical `scrollY` both times). Confirmed reduced motion still
repositions — exactly 2 distinct `scrollY` values across a 400ms sampled window around
the click (one discrete jump, no ramp) — both for an individual open and a swap.
Re-ran Task 10.1's own frame-trace check: the row's height across the Flip tween is
still one smooth, monotonic power2.inOut curve, 94px→704px, no snap — this task's
changes didn't disturb it. Re-ran Task 10's own regression suite (single-open behavior,
`aria-expanded`, hover, keyboard open via Tab+Enter, console/pageerror sweep) — all
clean. `npm run lint` holds at **7 errors, 2 warnings** (unchanged baseline). `npm run
build`: JS 518.00 → **518.77 kB** (185.13 → **185.37 kB** gz, +0.24 kB gz — the scroll
helper), CSS unchanged at **45.96 kB / 9.64 kB** gz (no visual/CSS changes this task).
New evidence screenshots: `projects-scroll-into-view-desktop.png`,
`projects-scroll-into-view-light.png` (full viewport, not element-clipped — shows the
opened row's links landing inside the frame with no manual scroll).

### Stage 3 Task 11.2 — `#connect`: scroll-triggered entry pin + reveal *(2026-08-21)*

Brief asked to reuse "the same scroll-hold pin pattern already established elsewhere
(`#my-taste`, `#experience`)." Re-read both live rather than assumed, per the brief's
own instruction — they aren't the same pattern. `#experience`'s pin
(`gsap.timeline({ scrollTrigger: { pin: true, scrub: 0.3 } })`) stays pinned for its
*entire* scroll-through distance, continuously driven by live scroll position — there's
no "reveal completes, then release" moment there at all. `#my-taste`'s pin
(`ScrollTrigger.create({ pin: true, once: true, onEnter })`, holding real scroll via
`lenis.stop()`/`lenis.start()` while a paused timeline plays once and releases from its
own `onComplete`) is the one that actually matches "pin briefly, reveal, release" — and
its own comments trace that primitive back one step further, to About's Task 5 entrance
hold, the original source. Built `#connect`'s entry pin against About/My Taste's real
pattern, flagged the mismatch rather than building against the brief's framing.

Reveal is SplitText only, no DrawSVGPlugin — the brief said "and/or," and this section
has no SVG in it to draw (checked before assuming one should exist). Cascade: title
words → description words (its inline `mailto:` link survives untouched — SplitText's
`type: "words"` only touches text nodes, same reasoning My Taste's own kicker comment
already established for a mixed text+element node) → the compose box as one staggered
group (`.form-group` × 3 + submit button; the honeypot is skipped, it's already
invisible). Asset-load gating ("fonts, images... per the existing pin-not-engaging-
after-reload fix from `#my-taste`") wasn't re-implemented per-section — re-read
`smooth-scroll.jsx` before assuming it needed a copy: B30's fix (`document.fonts.ready`
+ a debounced `ResizeObserver` on `document.body`, both calling one page-wide
`ScrollTrigger.refresh()`) already covers every registered trigger, this one included.

**Two real bugs found live, both would have shipped broken if copied on faith:**

- `.contact-section` used a plain `min-height: 100vh`, not the navbar-aware
  `calc(100vh - var(--navbar-height))` `#about`/`.about-me-section` both use — and
  About's own comment says that's load-bearing for its onEnter safety check. Left as
  100vh, the check (`sectionHeight > available`) would read this section as taller than
  available on *every* normal viewport (100vh is always ~navbarHeight more than
  innerHeight-minus-navbar) and skip the hold every single time — the pin would simply
  never engage. Fixed the CSS to match precedent, and measured the check against
  `.contact-container`'s real content height rather than the outer shell either way
  (the shell is deliberately taller than its content via flex-centering, a second,
  independent reason to not measure it directly).
- Copied About/My Taste's overshoot correction verbatim at first
  (`lenis.scrollTo(self.start, {immediate:true, force:true})` before `lenis.stop()`) —
  live instrumentation showed it actively breaking things here: by the time `onEnter`
  fires, GSAP had *already* snapped the section to its pinned position (top ===
  navbarHeight, confirmed via a temporary onEnter probe) — there's no scrub reading
  `self.progress` for an overshoot to corrupt. Forcing scroll back to exactly
  `self.start` landed precisely on the pin's own boundary, and — traced frame by
  frame — that snap made ScrollTrigger unpin the section on the spot, dropping it back
  into unpinned document flow ~200px away from the pinned spot for the *entire* reveal:
  a real, visible jump right as the hold engaged, present on every single run until
  removed. Dropping the correction (just `lenis.stop()`, nothing else) leaves the pin
  exactly where GSAP had already put it — confirmed no jump across repeated runs.

**Verified live, not read as correct:** fresh nav, scroll from `#projects` through
`#connect` — pin engages at exactly `top === navbarHeight`, cascade plays start to
finish (title → description → form, each stage's opacity traced 0→1 in sequence) while
`scrollY` sits completely frozen (continuous wheel input during the freeze produces zero
movement), pin releases and scroll resumes freely. Reload mid-scroll (B30 regression
check, same repro method as the original finding — fresh navigation, then immediate
realistic wheel scroll, no settle wait): pin engages correctly and identically, both
times run. Scroll back up past `#connect` into `#projects`: `position` reads `static`
throughout, no stuck fixed state. A second pass back down through `#connect`: does not
re-hold (`once: true` honored — longest frozen run on the second pass is just normal
Lenis momentum settling at the page's own scroll ceiling, not a real hold). Reduced
motion: content renders at full opacity immediately, `position` never reads `fixed`
across a full scroll-through — no code needed for this beyond gating the whole
mechanism behind `(prefers-reduced-motion: no-preference)`, since nothing is hidden by
CSS by default here (unlike About's mask, nothing needed correcting in the reduced
branch). Short-viewport safety net (1440×480, content 697px vs. 336px available):
content-height check correctly reads `bypass: true`; GSAP's own unconditional `pin:
true` still engages *momentarily* regardless of the bypass branch (expected — the
branch only skips this component's own `lenis.stop()` hold, it can't stop GSAP's native
pin from engaging at all) but self-releases as normal, unblocked scrolling carries past
it — confirmed the reveal still completes (`formOpacity: 1`) and `position` settles back
to `static`, never stuck. Mobile width (390×844): clean engage/reveal/release, no stuck
state scrolling back up. Zero console/page errors across every run. `npm run lint`
holds at **7 errors, 2 warnings** (unchanged baseline). `npm run build`: JS
518.77 → **520.34 kB** (185.37 → **185.66 kB** gz), CSS 45.96 → **46.04 kB**
(9.64 kB gz, unchanged). New screenshots: `connect-entry-pin-mid-reveal-dark.png`,
`connect-entry-pin-mid-reveal-light.png` (full viewport, mid-cascade — title settled,
description fading in, form not yet visible, pin actively engaged).

### Stage 3 Task 12 — `#connect`: the send-success walkman *(2026-08-21)*

A new, separate brief (no task number given in it — numbered here as the next
fresh top-level item, not a further decimal off Task 11: this is new,
distinct functionality layered on an already-complete Task 11.2, not a fix or
extension of that same feature the way each of 10.1/10.2/11.2 was to its own
parent task). Re-read `connect.jsx` fresh per the brief's own explicit
instruction before touching anything — confirmed Task 11.2's entry pin was
exactly as documented, built on top of it rather than around it.

**What it is:** on a successful send, the compose box's own cassette-shaped
message field (below) visually shrinks and flies into a cassette
walkman's bay, the walkman pops up, scales up and centers over a dimmed
section-scoped scrim while its lid snaps shut, a small EQ + a cord wiggle
start looping, and "MESSAGE SENT" resolves onto an LCD screen through a
ghost/lit segment pair — then the scrim fades, the walkman settles back into
normal in-flow content, and a "send another message" affordance appears. A
second send in the same session reuses the same walkman (no pop-in replay) —
the cassette flies in again, lid, scrim, scramble and all, onto an
already-visible device. Reduced motion skips straight to the settled end
state with no scrim, no scale, no scramble, no loop. A failed send never
shows any of this — hidden on a first-ever failure, untouched (still settled,
still idle-looping) on a failure after an earlier successful send.

**Cassette-shaped compose box** (`main.scss`): the message textarea sits
inside a paper "tape label" card with two decorative reel windows
(`pointer-events: none`, never between the pointer and the real control).
Task 11's own invalid-state cue used to live on the textarea's own border;
moved up to the label itself via `:has(textarea[aria-invalid="true"])` once
the textarea's border was removed in favour of the label's.

**The walkman** (`walkman.jsx`, new): flat HTML+SVG layers, not one
monolithic SVG with embedded `<foreignObject>` text — the LCD screen and EQ
bars are real DOM text/divs positioned over a plain SVG body, so the
self-hosted font and ScrambleTextPlugin (both DOM-text mechanisms) apply
normally without foreignObject's own cross-browser text-rendering quirks. EQ
bar colours come from `colorwayFor()` (the same deterministic id -> `--vinyl-N`
mapping the turntable/My Taste already use), salted per bar index, per the
brief's own instruction not to hardcode them.

**Self-hosted 7-segment font:** DSEG7 Classic (Bold), same self-hosting
pattern `#my-taste`'s own Anton/Oswald/Space Mono use (Stage 4 Task 1) — a
real font file checked into the repo, not a CDN link. No `@fontsource`
package exists for it (checked npm before assuming one did): the `dseg` npm
package ships FontForge *source* (`.sfd`) files only, no compiled woff/woff2.
The two files actually in use (`client/src/assets/fonts/dseg7-classic/`) were
built from keshikan/DSEG's own GitHub release archive (`v0.46`, SIL OFL 1.1 —
`DSEG-LICENSE.txt` sits alongside them) instead, and checked in directly. The
LCD readout itself reads "MESSAGE SENT," not the fuller two-sentence copy
`.contact-success` already shows as plain, fully accessible text — a real
LCD this size can't hold two sentences legibly, and a short, plain word reads
far more cleanly in a 7-segment font than mixed-case prose with punctuation
would. The ghost ("unlit segment") layer is computed from that same string
(`text.replace(/\S/g, "8")`) so it lines up character-for-character with the
lit layer above it.

**GSAP mechanics, and what each one is actually for:**
- **Flip** (`Flip.getState`/`Flip.from`) — the cassette's own flight. State is
  captured on the *real* textarea-cassette while it's still mounted, in
  `handleSubmit`, before the DOM change that unmounts the form entirely (the
  brief's own 1a). The element that actually flies (`.cassette-flight`) is a
  *different*, purely decorative node — matched to the captured state purely
  by a shared `data-flip-id`, confirmed against `node_modules/gsap/Flip.js`
  directly before relying on it (Flip matches state entries by that id, not
  literal node identity — the documented technique for "this element became
  that one," not "this element moved"). Built this way on purpose, not raw
  `document.createElement`/`appendChild`: a node React doesn't know about,
  inserted directly into a parent React *does* reconcile, risks a real
  conflict the next time React touches that parent's children. The flight
  element is React-rendered (a `flightSlot` state value) instead, so GSAP only
  ever touches style/transform on nodes React already placed.
- **CustomBounce** (`WALKMAN_POP_EASE`, `lib/gsap.js`) — the walkman's own
  pop-in and the lid snapping shut. One shared bounce shape for both (strength
  0.3, same "one clear beat, not a rally" tuning My Taste's own `CARD_LAND_EASE`
  settled on, Task 4.1) rather than a separate ease per beat.
- **ScrambleTextPlugin** — the LCD readout resolving through the ghost layer.
- **Plain `sine.inOut` + `repeat:-1`/`yoyo:true`, not CustomWiggle** — the idle
  EQ/cord loop. CustomWiggle's own shape is built to decay back to exactly 0
  once (My Taste's tape-snap); reusing it as a manual repeat/yoyo pair would
  fight that decay every cycle instead of reading as one continuous sway.

**Two real bugs found live, both fixed (full writeup `FINDINGS.md` B39):**
`.walkman`'s own CSS carried a permanent `transform: scale(0.5)` (meant only
as a pre-JS "hidden" default, matching the pop-in's own start state) — once
the settle animation's `clearProps: "transform"` ran, it fell back to that
CSS rule instead of no transform at all, sticking the settled walkman at half
size. Fixed by dropping the CSS-level transform entirely (`opacity: 0` alone
already fully hides it pre-JS). Caught by checking the actual settled
`transform` value live, not by eyeballing a screenshot.

**A pre-existing, unrelated bug found while regression-testing, NOT fixed
here — full writeup `FINDINGS.md` D17:** an aggressive bot-paced full-page
scroll sweep intermittently (~1 run in 3-4) threw an uncaught React crash
inside `#my-taste`'s `AvatarSlot` (`insertBefore` on a node that's no longer
a child) — no error boundary anywhere in the tree, so it blanks the whole
page. Confirmed genuinely pre-existing before writing it down: `git stash`'d
every uncommitted change from this task and reran the identical sweep against
the prior commit — same intermittent failure, same component, similar rate.
`my-taste.jsx` was never touched by this task. Flagged, not chased further —
out of this task's own scope.

**Verified, not just read as correct:** real submit success — full pop-in ->
flight -> lid-snap -> scrim -> scale-up -> EQ/cord-loop-start -> scramble ->
scrim-out -> settle, traced live via computed style sampling (opacity/scrim
opacity/scramble text/flight-element existence), not eyeballed. A second send
in the same session — walkman opacity confirmed to never drop to 0 (no pop-in
replay), flight/lid/scrim/scramble all still fire correctly onto the
already-visible device, EQ bar transform confirmed changed (idle loop still
genuinely looping, not stuck) both before and after. Reduced motion — settled
instantly (opacity 1, transform none, lit text set directly with no scramble,
EQ bar transform unchanged 1s later confirming no loop ever started). A
failed send — walkman never renders at all, form stays visible, real error
text shown. Scroll away from the settled walkman then back — still exists,
`.contact-section` stays `position: relative` (never fixed), EQ bar transform
confirmed still changing (loop survived the round trip, not duplicated or
killed). The takeover's own scale cap — measured live at 1440px and at 390px
(the narrowest currently-supported width): zero overflow past
`.contact-section`'s own bounds at either, confirmed via real
`getBoundingClientRect()` comparison, not assumed from the clamp math alone.
Cassette invalid-state border (`:has()`) — confirmed live (`aria-invalid`
true, cassette border red, error text shown). A realistic-paced full top-to-
bottom scroll sweep and a Portfolio Flip-accordion sanity check — both clean,
confirming this task didn't disturb Task 10's own Flip mechanics despite
touching the shared `lib/gsap.js`. `npm run lint` holds at **7 errors, 2
warnings** (unchanged baseline — one new `react/prop-types` suppression for
`walkman.jsx`'s `rootRef`, same precedent as `turntable.jsx`'s `track`).
`npm run build`: JS 520.34 -> **525.44 kB** (185.66 -> **187.21 kB** gz), CSS
46.04 -> **50.09 kB** (9.64 -> **10.54 kB** gz — the cassette/walkman rules +
the two self-hosted DSEG7 font files, ~9.6 kB combined woff2+woff). New
screenshots: `connect-cassette-form-{dark,light}.png`,
`connect-walkman-takeover-{dark,light}.png` (the light one caught the flying
cassette mid-transit and the ghost segment layer fully visible — genuinely
more illustrative than a posed shot), `connect-walkman-settled-{dark,light}.png`.

### Stage 4 (`#my-taste`) — task numbering, consolidated

The dated entries below run 1 → 2 → 2.5 → 3 → 3.5 → 3.6 → 3.8 → 3.7 → 3.7 follow-up →
3.9 → 4 → 4.1, then two rounds of unnumbered live-feedback fixes — real build order, not
a typo (3.8 landed before 3.7 because 3.7's own brief arrived later — noted in its own
entry below). Full task-by-task index with dates and one-line summaries lives in
`stage4-my-taste-concept.md` §2 — kept there, not duplicated here, since that file is
this rebuild's durable record and this one is the work log.

**Net of the churn, what's live today:** a festival-poster-styled section — a wall of
rotated, taped artist cards (2 featured + 3 secondary) on the left, a straight setlist
crate on the right, both driven by real Spotify data with real outbound links — entering
via a timed pin-and-cascade, with no color filter or grain on the photos. Both of those
last two shipped with Task 3 and were reversed two days later on direct live feedback —
the right call each time, not a wrong one being corrected.

Most of the decimal branching (3.5, 3.6, 3.7) is two real structural rebuilds, not scope
creep: 3.5 split one stacked wall into two side-by-side columns, and 3.7 replaced one
dominant headliner with a featured *pair*. Each redid the task before it rather than
extending it, which is why the count went sideways instead of forward.

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

### Stage 4 Task 2 — `#my-taste` layout: the wall geometry *(2026-08-15)*

Second of five tasks. **The concept doc this task's brief pointed to
(`design-review/stage4-my-taste-concept.md`) didn't exist** — flagged rather
than guessed around, and written this task (from Task 1 + Task 2's own
briefs, plus what actually got built) so Tasks 3–5 have it. Read that file
for the full concept and mechanism writeup; this entry is the work-log
version.

**Grid, not freehand position** — `grid-template-areas`, 4 columns × 3 rows,
headliner spanning 2×2 (dominant by grid footprint, not by careful
placement), 4 support acts as independent 1×1 areas, setlist spanning the
full width along the bottom with its own `auto`-sized row (5 track rows need
more height than the top two rows carry). Collapses to one un-rotated column
below 600px per the brief, confirmed zero overflow 320–1440px (9 widths
checked).

**Rotation/jitter deterministic per card id**, via a new `lib/hash.js`
extracted from `colorwayFor`'s own mixing (Stage 1) — both now share one
implementation instead of two that could drift. Verified: three fresh page
loads produced byte-identical `--card-rotate`/`-jitter-x`/`-jitter-y`/
`--tape-rotate` values per card. Overlap is structurally impossible by grid
construction; the rotation/jitter margin budget (real math, in
`cardTransform()`'s own comment and the concept doc) was additionally
verified live — a Playwright pass measured every card's real post-transform
bounding box against every other card's at 1440/1024/768px. **Zero
overlapping pairs at all three.**

**Two real bugs found and fixed, both from the first screenshot**
(`FINDINGS.md` B26): the headliner's placeholder photo slot was
near-invisible in dark theme (colorway 1 — "classic black" — correctly
near-invisible against a dark turntable deck, wrong reused as a large flat
rectangle next to this section's own card background); fixed with a
theme-derived inset border on every photo slot, tinting mechanism itself
untouched. And the headliner name read too small for how much card it had —
traced to the photo slot's `aspect-ratio` (started 4/5, crowded the name into
a thin strip; corrected to 4/3) plus a font-size bump.

**A third bug, in the verification tooling itself**: a first contrast pass
reported 1.12:1 for headliner text clearly legible in its own screenshot.
Root cause was the measurement script, not the product — `D8`'s own
documented `color(srgb ...)` 0-1-scale notation for a `color-mix()` value at
rest, parsed as if it were already 0-255. Fixed the parser; real contrast is
**15.10-15.43:1** primary text, **6.79-6.82:1** secondary, both themes.

**Verified**: `colorwayFor` reused exactly as instructed (no second tinting
mechanism); every photo slot (headliner + 4 support + 3 setlist thumbnails,
8 total) has `isolation: isolate` set, forward-compat for Task 3's blend
layer; setlist artist text confirmed NOT exceeding its card's own padding
box (1220.8px vs. a 1221.9px inner edge — close by design, not overflowing);
lint unchanged (7 errors, 1 expected warning); build JS 486.41 kB / 174.63 kB
gz (+1.69 kB / +0.56 kB gz — `lib/hash.js`'s extraction plus the wall's own
markup/logic), CSS 43.94 kB / 9.46 kB gz (+3.28 kB / +0.85 kB gz — the grid,
card, tear-preset and photo-slot rules).

Screenshots re-captured (both themes, desktop + mobile), same narrowed
`sips` downscale discipline as Task 1 (only files this run actually changed,
not the full historical set).

Not done in this task, by design: no real photos, no duotone blend, no
grain, no motion, no time-range switching UI.

### Stage 4 Task 2.5 — `#my-taste`: fit within one screen *(2026-08-15)*

Retrofits a requirement that should've been a checkable spec item as early as
Task 2 — "one panel, one page only" was the section's very first requirement
and never got a concrete target. Inserted between Task 2 and Task 3 while the
wall is still flat placeholders and cheap to resize, before Task 3 locks in
real photo crops.

**Method** — same one Experience's own Stage 3 Task 9 fit pass established:
section height as a multiple of one available screen (viewport height minus
`--navbar-height`), measured from real rendered output (Playwright), not
estimated. Same three breakpoints, for a direct comparison:

| Breakpoint | Section height | One screen | Ratio |
|---|---|---|---|
| Desktop (1440×900) | 868px | 756px | **1.15×** |
| Laptop (1280×800) | 868px | 656px | **1.32×** |
| Mobile (390×844) | 1954px | 736px | **2.65×** |

Baseline before this pass was **1.53× / 1.76× / 3.59×**. Desktop now lands
*inside* Experience's own achieved band (1.13–1.25×); laptop is close behind
it. Mobile stayed the worst by far, on purpose and by the brief's own
scoping — full mobile art direction is Stage 5's job, this task's only mobile
obligation was "no egregious overflow," re-confirmed (0px overflow, 320–1440px,
9 widths — see below). A single-column stack of six cards was never going to
approach Experience's 1.04× without the un-rotated-stack layout itself
changing, which is exactly the redesign Stage 5 owns.

**Levers used, in the brief's own preferred order — 1 and 2 only, never
reached 3 or the setlist-truncation option:**

1. Headliner photo `aspect-ratio` 4/3 → 16/9 (Task 2's own 4/3 already
   replaced an even taller 4/5 for the same crowding reason). Support photo
   `aspect-ratio` 1/1 → 3/2, cut in the same step so the support-pair stack
   (the OTHER thing holding up the top block's height — verified live, not
   assumed: at every step of this pass the taller of "headliner" vs.
   "support stack" set the top block's real height) didn't just become the
   new bottleneck the moment the headliner shrank.
2. Card padding `--space-4` → `--space-2`; wall `gap` `--space-4` →
   `--space-3`; section vertical padding `--space-8` → `--space-6` (now
   matching `.experience-section`'s own vertical padding exactly, not a
   smaller number invented just for this section); setlist per-item padding
   `--space-2` → `--space-1` (the one real per-track cut — compounds ×5 rows,
   the single largest line item after the photo crops, and keeps all 5
   fetched tracks rather than truncating).

**Not touched:** any font-size, the headliner/support name text, the number
of tracks shown (all 5 stayed), the tinting mechanism, the grid architecture
(`grid-template-areas` unchanged), the torn-edge/tape decoration.

**Re-verified after resizing, not assumed still true:**
- **Overlap rule** — the rotation/jitter margin budget in `cardTransform()`'s
  own comment was recomputed for the new (smaller) card sizes and updated in
  both that comment and this file: ~18px/side of real dead space now (margin
  `--space-3`, unchanged, + half the new `--space-3` gap), against a ~12px/
  side need at the brief's 4° ceiling — tighter than Task 2's ~20px but not a
  photo-finish, and confirmed live: a fresh Playwright pass at 1440/1024/768px
  found **zero overlapping card pairs**, same as Task 2.
- **Horizontal overflow** — re-checked at all 8 of Task 2's widths
  (320–1440px) plus 1440 again: `document.documentElement.scrollWidth` equals
  `window.innerWidth` at every one, **0px overflow** everywhere. (A visual
  read of an early screenshot made the setlist's right-aligned artist text
  *look* like it was running off the card — it wasn't; real numbers said
  worst case was 1228px against a 1440px viewport with the card's own edge at
  ~1270px. Screenshot pixel-eyeballing at a scaled-down display size isn't a
  substitute for measuring, the same lesson Task 2's own contrast-script bug
  already taught.)

**One tooling quirk found, not a product bug**: `getBoundingClientRect()` on
an element *inside* a rotated ancestor (any `.my-taste-card` descendant)
returns that descendant's own rotated, axis-aligned bounding box in screen
space — which can read taller or shorter than its true document-flow
contribution, especially for wide elements (a 1000px-wide row rotated 4° gains
~70px of apparent height from the width term alone). Real per-element layout
height came from `offsetHeight` instead (transform-independent), which is
what all the sizing decisions above were actually based on. `#my-taste` and
`.my-taste-wall` themselves aren't rotated, so the top-level ratio numbers in
the table above were never affected — confirmed directly (`offsetHeight ===
getBoundingClientRect().height` for the section itself at every breakpoint).

**Verified unchanged, not re-litigated:** determinism (`cardTransform()`
itself wasn't touched — only the CSS consuming its output — so same-id-same-
transform across reloads still holds by construction); lint (7 errors, 1
expected warning, same baseline); build — **JS 486.41 kB / 174.63 kB gz, CSS
43.94 kB / 9.46 kB gz, both byte-identical to Task 2's own numbers** (this
task only changed spacing-token values and `aspect-ratio` numbers, no new
selectors, rules, or JS logic).

Screenshots re-captured: `my-taste-desktop.png` / `my-taste-mobile.png`
(standard tool — still carries the pre-existing navbar-overlap crop at the
very top/bottom Task 2 also noted, not something this task introduced or
fixed) plus clean supplementary `t4-my-taste-wall-{desktop-dark,desktop-
light,mobile-dark}.png` via the proven clip-rect method, both themes.

`stage4-my-taste-concept.md`'s status table and overlap-rule note updated.

### Stage 4 Task 3 — `#my-taste` photography: real images, duotone, grain *(2026-08-15)*

Sanity-checked `stage4-my-taste-concept.md` against the tree before relying on it (this
task's own brief asked for that explicitly) — accurate, matches what Tasks 1/2/2.5
actually shipped. Confirmed `colorwayFor` still lives in and exports from
`vinyl-record.jsx` (unchanged since Task 1); the existing import in `my-taste.jsx` needed
no change.

**Real images**, additive to Task 2's structure, not a rebuild of it: `artist.images[]`
for the headliner + 4 support cards, `track.album.images[]` for the setlist's 3 thumbnail
slots. Verified live against real API responses (not assumed from docs) that Spotify's
own arrays are sorted largest → smallest — `640/320/160` for artist photos, `640/300/64`
for album art, every single one square. Headliner's bigger slot takes the largest; every
other slot takes the first entry at or under 400px (lands on the 320px middle size, not
the 640px original) — this project's own load-speed goal, not a guess at what "small
enough" means. `loading="lazy"` on every `<img>` — the section sits below the fold.

**Duotone** — `grayscale(1) contrast(1.1)` on the `<img>`, plus a second absolutely-
positioned layer reusing the *exact* `--card-tint` value Task 2's flat placeholder used,
`mix-blend-mode: color`. No second tinting mechanism. Both layers are `position: absolute;
inset: 0` inside the slot (now `position: relative` — wasn't needed before), which also
means the slot's own size is still driven entirely by its `aspect-ratio`, unaffected by
what photo (if any) sits inside it — confirmed structurally: `getBoundingClientRect()` on
the `<img>` was pixel-identical to its slot's own, tested against two deliberately
non-square (1200×300 and 300×1200) synthetic sources swapped into a real slot, since real
Spotify data never exercises a non-square crop (every image returned during this task was
square — verified across all 5 artists + 3 album covers, not assumed). Both cropped
correctly via `object-fit: cover`, no stretching, confirmed in a live screenshot.

**Grain** — reused `.record-crate-panel`'s own `feTurbulence`-in-a-data-URI recipe
(`main.scss`) rather than inventing a second grain mechanism: a `::after` pseudo-element
on `.my-taste-section`, `opacity: 0.05` (that panel's own grain sits at 0.03, tuned to be
"almost imperceptible" — this one is allowed to read as texture, the concept doc's own
"photocopied flyer" framing, so tuned higher), `mix-blend-mode: overlay`. One overlay for
the whole section, not per-card.

**Two fallback paths, both landing on the identical flat `--card-tint` treatment**: an
empty `images[]` (existing since Task 1/2) and, new this task, a present URL that fails
to load (`<img onError>` → `failed` state → un-renders the image/tint pair, letting the
slot's own base fill show through). Both verified against real API traffic, not just live-
network luck: mocked `/api/spotify/top-artists` via Playwright's own route interception to
force one artist's `images` to `[]` and point another's at a URL guaranteed to 404. Neither
produced a broken-image icon; the only console entry was one benign browser-level "failed
to load resource" network log for the deliberately-broken test URL, not a JS exception.

**Colorway-1 border — explicitly re-evaluated, kept, not silently carried over** (per the
brief's own instruction). Real photos remove the *original* problem (a flat placeholder
reading as broken) from the happy path, but Task 3's new failure mode lands on the exact
same flat fill in production, so the border still earns its keep there. Verified directly,
not assumed: forced the headliner (confirmed via computed `--card-tint` to be colorway 1,
the same "classic black" case the original bug was about) into the empty-array fallback
and screenshotted both themes — border reads clearly in both. Full reasoning in
`FINDINGS.md` B26's own Task 3 update.

**Contrast re-measured with a freshly-written, correctly-parsing script** (handling the
`color(srgb ...)` 0–1-scale notation from the start this time, the gotcha Task 2's own
script had to be fixed for mid-task): headliner/support/setlist-track text **15.05–15.40:1**,
setlist-artist/heading **6.76–6.81:1**, both themes — consistent with Task 2's own numbers,
confirming the new duotone/grain layers don't touch text's own computed colors (they don't
overlap the text elements). Grain's *visual* effect on legibility was additionally checked
by eye against rendered screenshots in both themes (a 5%-opacity blended noise texture
isn't something a computed-style contrast check can capture) — text reads cleanly in both.

**Fit ratio re-run, unchanged**: 1.15× / 1.32× / 2.65× (desktop/laptop/mobile) — identical
to Task 2.5's own numbers, exactly as predicted (the img/tint layers are taken out of flow,
so they can't affect the slot's own `aspect-ratio`-driven size). No retuning needed.

**No new product bugs found this task** — worth stating plainly rather than padding the
report: Tasks 1/2/2.5 each found and fixed 2–3 real bugs from the first look at real
output; this task's mechanisms (image sizing, duotone, grain, both fallback paths, cover-
crop) all worked as designed against real data and synthetic edge cases on the first pass.

Build: JS 487.04 kB / 174.80 kB gz (+0.63 kB / +0.17 kB gz), CSS 44.71 kB / 9.53 kB gz
(+0.77 kB / +0.07 kB gz) — code only; Spotify's own CDN serves the images, nothing image-
related is bundled. Lint unchanged (7 errors, 1 expected warning). Full-page smoke check
(all six sections, both the real-data load and the two mocked-fallback loads) — zero
console/page errors beyond the one expected 404 above.

`stage4-my-taste-concept.md` restructured: Task 3's status marked done, a new §5 documents
the mechanism above, resolved open items from §4/§6 removed, one new open item added for
Task 4 (a lazy-loaded `<img>` mid-fetch when the entrance animation fires).

### Stage 4 Task 3.5 — `#my-taste`: restructure into two columns (wall / crate) *(2026-08-15)*

Direct feedback on Task 3's shipped result: the setlist sat below the artist grid as a
second row, so total height was `wall + gap + setlist` — still "2 pages" even after Task
2.5's own sizing pass. Named plainly in the brief and worth repeating here: Experience hit
this exact wall once already (Stage 3 Tasks 7→8 tuned sizes and still didn't fit; Task 9
replaced the paradigm — a pinned filmstrip — and that's what actually solved it). This
task is the same move: restructure, not another round of shrinking numbers.

**Two columns via a new outer grid, `.my-taste-layout`** (`3fr 2fr`, ~60/40): the wall
(headliner + 4 support, unchanged mechanism, now 2 grid rows instead of 3) sits left, a
new `.my-taste-crate` sits right. Total height becomes `max(wall, crate)` by construction.
**Measured, not assumed:** desktop **1.15× → 1.02×** one screen — essentially exact.
Laptop **1.32× → 1.18×**.

**The crate is 5 small torn "singles," not a list** — each track is its own `TasteCard`
(reusing the exact rotation/jitter/tear/tape mechanism Task 2 built, and `PhotoSlot`'s
duotone/fallback/lazy-load/alt-text behavior from Task 3, applied to a new horizontal card
shape rather than rebuilt for it, per the brief). All 5 tracks now carry album art (Task 3
gave only the top 3 + 2 text-only rows; reconsidered per this task's own brief now that the
container shape changed — a crate where 2 of 5 records have no sleeve art doesn't read as
a crate). Track/artist text truncates with a single-line ellipsis, not Task 1/2's
flex-wrap — deliberate, so 5 stacked singles keep a predictable height for the overlap
math below.

**Overlap margin recomputed for the new card shape, not copied from the wall.** A single's
own aspect ratio (wide, short — ~389×89px at 1440px) makes rotation growth asymmetric in a
way the wall's roughly-square cards don't show: the width term dominates the vertical-
growth formula, working out to ~17-18px of growth-plus-jitter per side — more than the
wall's own support cards need despite being a much smaller card. `.my-taste-card`'s default
margin (12px, untouched) plus half the crate's own gap (12px → 6px) gives ~18px of dead
space per side, matching that need. Verified live: zero overlapping pairs among the 5
singles at 1440/1024/768px, same Playwright discipline as the wall's own check (also
re-confirmed: zero overlap among the wall's own 5 cards, unaffected by this task).

**A real bug found and fixed** (not assumed away): nesting `.my-taste-wall` inside a grid
*track* (the new `.my-taste-layout` column) instead of it being a direct block-level child
of `.my-taste-section` changed its overflow behavior at narrow widths — even though
nothing about `.my-taste-wall`'s own CSS changed. An `fr` track's implicit minimum is
`auto` (content-based), the grid-track version of the flex `min-width: auto` trap this
project has hit before (`FINDINGS.md` B25). Measured: 37px of horizontal overflow at
390px, 107px at 320px — **did not exist before this task**. Fixed with
`minmax(0, 3fr) minmax(0, 2fr)` (and `minmax(0, 1fr)` in the mobile collapse) instead of
bare `fr` values. Re-verified 0px overflow at all 8 widths, 320–1440px.

**Duotone/fallback/alt-text re-verified in the new positions**, not assumed to still work
because Task 3 already built them: mocked one track to an empty `images[]` and another to
a broken URL, both landed on the correct flat-tint fallback with no broken-image icon and
no JS exception (one benign 404 network log, expected). Real alt text confirmed present on
the crate's own images.

**Mobile got taller, not shorter — expected, called out rather than hidden:** 2.65× → 3.01×
one screen. The crate now stacks its own 6 elements (label + 5 singles) below the wall's
own stack at narrow widths, where before there was a single setlist card. Out of scope per
the brief (deliberate mobile stacking is Stage 5's job); this task's only mobile obligation
— no horizontal overflow — is met, and is exactly what the bug above threatened before
being fixed.

Build: JS 487.05 kB / 174.82 kB gz (+0.01 kB / +0.02 kB gz — code only), CSS 44.87 kB /
9.50 kB gz (net -0.03 kB gz vs. Task 3, despite new rules — the deleted setlist-list CSS
roughly offset the new crate/single rules). Lint unchanged (7 errors, 1 expected warning).
Full-page smoke check clean.

`stage4-my-taste-concept.md` updated: §1's concept description now describes two columns
(the single-stacked-wall description is explicitly marked superseded, not silently
replaced); §3's original 3-row grid code block gets an update blockquote rather than being
rewritten in place; new §6 documents this task's mechanism; §7 (open items) gets three
entries — Task 4 now also needs to animate the crate's singles, Task 5's `Flip` note is
unchanged, and a new note flagging the crate specifically for Stage 5's mobile pass.

### Stage 4 Task 3.6 — `#my-taste`: tone down headliner, simplify setlist, fix gray duotone *(2026-08-15)*

Refinement pass on Task 3.5's shipped two-column layout — three direct pieces of
feedback, not a structural change (the wall/crate fit fix itself is untouched).

**Headliner size.** Only the name's own `font-size` clamp actually mattered:
`clamp(2rem,4.2vw,3.5rem)` → `clamp(1.75rem,3.4vw,2.75rem)`, reverting to Task 2's own
original value (Task 2.5 had bumped it to compensate for a *shrinking photo* — the
opposite problem). The old max (56px) exceeded this site's own section-title scale
(`--text-xl`, 40px max) by 40%. **Tried cutting the photo `aspect-ratio` too (16:9 →
2:1) first — measured zero effect** on the headliner's own rendered height: the wall's
row-spanning headliner stretches to whatever its two grid rows actually need, and a
real finding surfaced doing this check — **the support cards' own wrapped names**
("Red Hot Chili Peppers," "Stone Temple Pilots" → 3 lines at the wall's narrower,
post-3.5 column width), not the headliner, set that height, both before and after this
task. Confirmed this predates Task 3.6 (present in Task 3.5's own screenshots already).
Reverted the aspect-ratio cut (no benefit), kept the font cut, left support-card sizing
alone — outside this task's brief.

**Setlist simplified back to one plain list.** Checked Task 3's original implementation
before rebuilding, per the brief — reused almost exactly: one `TasteCard` wrapping a
fanned row of the top 3 tracks' album art, then a plain numbered mono-font list of all 5
below it. Task 3.5's five individually torn/taped "singles" (all carrying art) are
deleted — `.my-taste-single*`, `.my-taste-crate-label` — not left as dead CSS.

**Gray-duotone bug, fixed.** `colorwayFor`'s 5 tokens include two deliberately
near-neutral ones (`--vinyl-1` "classic black," `--vinyl-5` "marbled smoke") — correct
for an actual vinyl pressing, wrong once `grayscale(1)` + a blend wash hits a *photo*
instead: ~2 in 5 photos landed on a plain gray wash, by construction, not chance. Fixed
with a new `photoColorwayFor(id)` (`vinyl-record.jsx`) — the *same* `hash32(id)`
`colorwayFor` already uses, remapped into 3 buckets (amber/oxblood/midnight-blue) instead
of 5, not a second hash implementation. `colorwayFor` itself is byte-for-byte unchanged
(still used, unmodified, by the turntable's own `VinylRecord`); only `my-taste.jsx`'s
`PhotoSlot` switched which function it calls. **Verified two ways, not just read from the
diff:** a standalone reimplementation of both functions against ~20 real and synthetic
ids confirmed `photoColorwayFor` never returns 1 or 5 (bucket distribution 6/6/8 — no
lopsided skew) and that `colorwayFor`'s own output space is completely unaffected (e.g.
Oasis's real artist id still maps to `colorwayFor` 1, same as before — just
`photoColorwayFor` 4 for the photo wash specifically). Live screenshots confirm no gray
photos across the wall or setlist thumbnails, both themes.

**A real bug found and fixed, own to this task:** the first pass added
`.my-taste-card--setlist { width: 100%; }`, reasoning it was a harmless explicit
statement. Measured live instead of assuming: it caused 8–11px of horizontal overflow at
1024/768px specifically. Root cause — `.my-taste-crate`'s flex `align-items: stretch`
default already sizes the card correctly (container width minus the card's own margin);
an explicit `width: 100%` claims the *full* container width on top of that same margin,
so the card's true footprint (width + margin) exceeds its container by ~24px — the same
"`width: 100%` + margin/padding" overflow class `.navbar`'s and `.experience-section`'s
own comments already document, a fourth occurrence in this codebase, margin instead of
padding this time. Only visible at 1024/768px — at 1440/1280px there was enough slack
around the (already `max-width`-capped) content column to hide it, which is exactly why
it wasn't caught by eye. Fixed by deleting the `width: 100%` declaration entirely (flex
stretch was already correct); re-verified 0px overflow at all 8 widths, 320–1440px.

**Fit ratio re-run — undershoots now, on purpose, not a regression:**

| Breakpoint | Task 3.5 | Task 3.6 |
|---|---|---|
| Desktop (1440×900) | 1.02× | **0.72×** |
| Laptop (1280×800) | 1.18× | **0.82×** |
| Mobile (390×844) | 3.01× | **2.73×** |

Two separate, both-expected causes for the desktop/laptop drop: (1) the crate's own
height fell sharply (~654px-equivalent territory down to ~360px) simply because
collapsing 5 separate torn cards into 1 list card removes 4 cards' worth of margin/
padding/tape/torn-edge overhead — the direct, correct consequence of "read too busy,
simplify," not a bug; (2) the wall's own height (424px) is **unchanged** by this task
(see the support-name-wrap finding above), so it was never the thing keeping desktop
near 1.0× in the first place — that was mostly the OLD crate's own height. A ratio under
1.0× is not a failure of "fits in one screen": the section fits *more* comfortably, with
room to spare, not less. Grew the crate back modestly with an in-scope lever
(`.my-taste-setlist-item`'s own padding, `--space-1` → `--space-2`) to narrow the
wall/crate height gap (104px → 64px) without fighting the simplification itself;
deliberately declined to chase an exact match by inflating the list further or by
touching support-card sizing (outside this task's brief). Re-verified after every
change: zero overlap in either column at 1440/1024/768px, zero horizontal overflow at
all 8 widths 320–1440px.

Build: JS 487.18 kB / 174.85 kB gz (+0.13 kB / +0.03 kB gz), CSS 44.95 kB / 9.57 kB gz
(+0.08 kB / +0.07 kB gz). Lint: **7 errors, 2 expected warnings** (was 1) —
`photoColorwayFor` is a second non-component export from `vinyl-record.jsx`, same
`react-refresh/only-export-components` tradeoff `colorwayFor`'s own export already
carries, not a new class of issue. Full-page smoke check clean (real data, and the two
synthetic fallback tests below) — zero console/page errors beyond one expected 404.

`design-review/stage4-my-taste-concept.md` updated: §1's setlist description reverted,
status table's Task 3.6 row added, an update blockquote on §6 flags the "singles" shape
as superseded, new §8 documents this task's mechanism in full, §9 (open items) gets the
support-name-wrap finding as a new entry and the Task 4/Stage 5 items adjusted for the
simpler (1 card, not 5) crate shape.

### Experience — title/cards overlap on real windowed-browser heights, fixed *(2026-08-15)*

Live report: "the experience title is overlapping the display cards." Reproduced and
measured before touching anything — at ordinary windowed-browser heights (1440×800,
1280×800 "MacBook 13" M2," 1024×768, 768×700, 390×600, 320×568, and shorter), the
title's bottom edge sat 0.25-55px below `.experience-viewport`'s top edge. Full table
and root-cause writeup: `FINDINGS.md` B29.

Root cause: Task 9's own centering fix ("id like to center the cards more to the
middle") absolutely-positioned `.experience-viewport` and centered it against
`.experience-section`'s TOTAL height via `top: calc(50% - height / 2)` — deliberately
blind to the title sitting above it in flow. `--experience-vp-height` is a fixed
formula independent of window height, while the section's own height shrinks with the
window (`100vh - navbar`), so short enough windows put the mathematically-centered box
above the title.

Fixed structurally rather than by clamping `top` against a second guessed pixel
number: `.experience-section` is now a flex column (title first, `flex-shrink: 0`,
then a new `.experience-viewport-shell`, `flex: 1 1 auto; min-height: 0`) so the shell
centers the untouched, still-exactly-`--experience-vp-height`-tall
`.experience-viewport` within whatever space is actually left below the title —
real, browser-computed layout instead of a number to re-verify by hand at every
breakpoint. Nothing inside `.experience-viewport` changed (track/rail/cards, the
`--space-7` headroom math the rail's alignment depends on) — only where the box sits.

**Verified, not assumed:** 0px overlap at all 17 width/height combinations checked
(the worst was 1440×600 at 55px before the fix); 0px overlap sampled continuously
through an actual scroll-driven pin engagement, not just a hash-jump snapshot; 0px new
horizontal overflow across the usual 320–1440px sweep; the reduced-motion
`ExperienceStatic` fallback re-checked and unaffected (plain flow, never used absolute
positioning); confirmed the pre-existing ~13px rail/date-badge vertical offset is
identical before and after this fix (not something this change touched, and not a new
issue — out of scope here). Screenshots:
`b29-experience-title-overlap-fixed-macbook13-{dark,light}.png`.

Build: JS 487.24 kB / 174.86 kB gz (+0.06 kB / +0.01 kB gz), CSS 45.05 kB / 9.58 kB gz
(+0.10 kB / +0.01 kB gz) — a new selector (`.experience-viewport-shell`) and a
one-element JSX wrapper, nothing structural. Lint unchanged: 7 errors, 2 expected
warnings (same baseline as Task 3.6).

### Stage 4 Task 3.8 — `#my-taste`: Spotify link, clickable cards, straighten the setlist *(2026-08-15)*

Brief referred to this as a follow-up to "Task 3.7's three-zone structure" — no such
task exists in this repo's history (latest `#my-taste` commit going in was Task 3.6) and
no "Zone A/B/C" terminology exists anywhere in the code or `design-review/`. Checked
against the tree before writing anything, per this project's own working agreement —
the three concrete asks mapped cleanly onto the real, current two-column wall/crate
structure regardless ("Zones A/B" = the wall's headliner+support cards, "Zone C" = the
crate), so nothing was blocked on it, just flagged (`stage4-my-taste-concept.md` §2).

**Kicker linked to Spotify.** "now spinning · my taste" → "MY TASTE · LISTEN ON SPOTIFY"
plus the Spotify glyph, the whole line one real `<a>` inside the existing `<h2>` (not the
reverse — keeps exactly one real heading for the section, Task 1's own requirement).
Found the real profile URL already in the codebase rather than inventing one:
`footer.jsx`'s own working Spotify link, reused verbatim. Icon is the *same* theme-swapped
white/black PNG pair `footer.jsx` already uses — no new asset, no icon library. Rendered
`alt=""` (decorative — the link's own text already says "listen on spotify"), and
deliberately **not** run through this section's `PhotoSlot` duotone treatment, per the
brief's own instruction to respect Spotify's brand mark as-is.

**Every artist/track card is a real link.** `TasteCard` takes an optional `href`
(`my-taste.jsx`) — wraps `children` in a real `<a>` when present (headliner + 4 support
cards, each passing `artist.external_urls.spotify`), falls back to plain `children`
when absent (the crate's own container card, unchanged). Each setlist row became its own
`<a>` (index+track+artist together, not just the track name) using
`track.external_urls.spotify`. Verified live against the real API, not assumed from the
brief: confirmed `external_urls.spotify` is present, unmodified, on both
`/api/spotify/top-artists` and `/api/spotify/top-tracks` responses (`server.js` forwards
Spotify's `items` array verbatim) — spot-checked all 5 artist hrefs and all 5 track hrefs
against the raw payload, all correct, not just non-empty. Real `<a>`, not `div`+`onClick`,
matching this section's own alt-text accessibility discipline; `target="_blank"
rel="noopener noreferrer"` throughout. Focus is a plain `outline` (this site's usual
convention) — checked live specifically because these cards have a `clip-path` torn edge,
which does clip an inner outline wherever a tear cuts inward; confirmed by screenshot that
the ring still reads clearly and continuously across the vast majority of each card's
perimeter, comfortably clearing "a visible focus indicator" without a second, bespoke
focus mechanism.

**Crate straightened, wall untouched.** `.my-taste-card--setlist { transform: none; }`
overrides the base card's rotate+jitter — scoped to rotation/jitter only, per the brief's
own wording; torn edge and tape stay. Confirmed live: all 5 wall cards still carry real
rotation (-2.2° to 3.84°, within the original 2-4° band), the setlist card's computed
transform is exactly `none`.

**No new product bugs found this task** — stated plainly rather than padded. The CSS
refactor moving `.my-taste-setlist-item`'s flex layout down onto the new
`.my-taste-setlist-link` (the actual flex parent of the track/artist spans now) was
re-verified against the exact overflow trap it originally fixed (FINDINGS.md B25) — 0px
overflow at all 9 widths checked, 320–1440px, unchanged from before this task.

**Verification:** every card/track href spot-checked against raw API data; a real
sequential Tab walk (not just programmatic `.focus()`) reaches the kicker then all 5 wall
cards then all 5 setlist rows, each with a visible outline; zero console errors across a
full-page scroll-through; zero horizontal overflow 320–1440px; Task 3.6's own fit-ratio
numbers (0.72×/0.82×/2.73×) unchanged, confirmed rather than assumed, since nothing this
task did resizes any element. Screenshots re-captured both themes via
`design-review/capture-screenshots.mjs` (`my-taste-desktop.png`/`my-taste-mobile.png`) —
that script's own hardcoded light-theme list is `['home', 'about']` only, so it doesn't
cover `#my-taste`; supplemented with the same scoped light-theme capture prior tasks in
this section already use (`t4-my-taste-wall-desktop-{dark,light}.png`,
`t4-my-taste-wall-mobile-dark.png`).

Build: JS 488.23 kB / 175.06 kB gz (+0.99 kB / +0.20 kB gz), CSS 46.07 kB / 9.71 kB gz
(+1.02 kB / +0.13 kB gz) — two new imported PNGs (already bundled for `footer.jsx`, no
new asset weight), new link/focus/hover CSS. Lint unchanged: 7 errors, 2 expected
warnings.

### Stage 4 Task 3.7 — `#my-taste`: three-zone restructure *(2026-08-15)*

Lands **after** Task 3.8 despite the lower number — this brief called itself a follow-up
to Task 3.6 specifically and made no reference to 3.8, so building it on top of 3.8's
already-shipped links/straightened-crate is a superset of what it asked for, not a
conflict. Noted here rather than silently reordering the historical record; the task list
above and `stage4-my-taste-concept.md`'s own status table both record 3.7 as landing after
3.8, in real build order.

**The actual problem, restated.** Task 3.6 already cut the headliner's own font-size, and
it still read as taking too much space. This brief's own diagnosis: the issue was never
"how big is one card," it was that *all* the wall's hierarchy lived in a single
comparison — one big card against four uniform small ones. Splitting into two tiers lets
hierarchy come from group membership instead, so no single card carries it alone.

**Regrouped, not rebuilt.** `artists.data[0..1]` ("featured", Zone A in the brief's
terms — was the old singular "headliner") now render with one shared `className`/photo-
slot/name treatment each, deliberately identical to each other; `artists.data[2..4]`
("secondary", Zone B — was the old 4-card "support" tier, now 3) get a second, clearly
smaller shared treatment. Same `TasteCard`/`PhotoSlot`/duotone/tear/tape/`href`
mechanisms throughout — Task 3.8's links, straightened crate, and every other section
already built are completely untouched; this only regroups the wall's own 5 artist cards.

**Grid:** `.my-taste-wall` moved from a 4-column grid (headliner spanning 2×2, four
1×1 support cells) to 6 columns (featured-1/featured-2 each spanning 3 cols × 2 rows,
secondary-1/2/3 each spanning 2 cols × 1 row, in a shorter row). 6 columns specifically
because it divides evenly by both 2 (the featured pair) and 3 (the secondary trio) — a
4-column grid can't express a 3-way split without uneven, independently-tuned spans.
Found and removed 5 now-dead CSS rules in the process (`.my-taste-card--headliner`/
`--support-1..4`, one `grid-area` declaration each) — checked before deleting, not
assumed: `TasteCard` already sets `gridArea` as an inline style from its own `area` prop
on the same element, which always wins the cascade over an external stylesheet rule for
the same property, so these were inert leftovers from whenever that inline mechanism was
added (Task 3.5), not something removing them changes.

**Measured, not assumed, that the size gap actually shrank.** Real rendered card areas,
1440px: old headliner ≈121,437px² vs. old support ≈25,480px² — a **4.77:1** ratio. New
featured ≈105,387–111,078px² vs. new secondary ≈35,518–37,273px² — a **~2.9:1** ratio.
Checked the thing the brief specifically called out as the failure case: the two featured
cards' own areas are within ~5% of each other (natural variance from different name
lengths and per-id rotation/jitter, not a size difference — both share the exact same
grid footprint, aspect-ratio, and font-size), confirmed via screenshot as reading clearly
comparable, not "headliner, slightly smaller."

**Used the headroom, checked whether it left dead space.** Fit ratio (`STATUS.md`'s own
established method) went **0.72× → 0.94×** desktop, **0.82× → 1.09×** laptop, **2.73× →
2.68×** mobile (mobile improved slightly — un-rotated at this width regardless, taller
featured cards this task added get flattened into one column same as before). Laptop's
1.09× is a real, if modest, overshoot past one screen — checked against this project's
own precedent rather than chasing an arbitrary ≤1.0×: Experience's own Task 9 achieved
1.13–1.25× and Task 2.5 explicitly measured this section against that exact band as
success. 1.09× sits comfortably inside it. Desktop's dead space is gone — 596px wall
against 756px available, not the ~245px of empty section-bottom this task's brief flagged
as worth checking for.

**Verification:** zero overlap among all 5 wall cards at 1440/1280/1024/768px; zero
horizontal overflow at the usual 320–1440px sweep; zero console errors on a full scroll-
through; every one of Task 3.8's own checks re-run and unchanged — all 5 artist hrefs and
5 track hrefs still correct, real Tab-order keyboard walk still reaches every card with a
visible outline, wall cards still carry their original rotation (-2.2° to 3.84°), the
crate's own card is still exactly `transform: none`. Screenshots re-captured both themes
via `design-review/capture-screenshots.mjs`, supplemented with the same scoped light-
theme capture Task 3.8 used (that script's own light-theme list doesn't cover
`#my-taste`).

Build: JS 488.29 kB / 175.02 kB gz, CSS 46.00 kB / 9.68 kB gz — CSS went *down* slightly
despite the new grid (5 dead rules removed roughly offset the new ones added). Lint
unchanged: 7 errors, 2 expected warnings.

`design-review/stage4-my-taste-concept.md` updated: §1's layout description, status
table (3.7 row, noted as landing after 3.8), and a new §10 documenting this task's
mechanism in full.

### Stage 4 Task 3.7 follow-up — dead space inside each featured card, fixed *(2026-08-17)*

Live report re-sent Task 3.7's own brief verbatim, with one addition: "a large unused
vertical gap between the headliner and the first support card (Oasis → Mac Miller)."
Checked against the tree first (CLAUDE.md) — Task 3.7 had already shipped (commit
`8612655`); the report's own terminology ("headliner," "first support card") describes
the pre-restructure state, not what's actually in the tree, so it's very likely the
separate design-research chat that writes these briefs doesn't have visibility into what
already landed (it has no repo access, per this project's own memory of that workflow).
Didn't dismiss it on that basis, though — the underlying observation turned out to be
real, just mis-described.

Measured a real per-card content-vs-box breakdown instead of guessing: each "featured"
card's own box was 358px tall, but its actual content — photo (159px) + name (54px) +
padding — only needed about 220px. **139px of dead space**, every time, below the artist
name. Root cause, found by reading Task 3.7's own CSS comment against itself: the wall's
`grid-template-rows` kept the OLD headliner block's per-row minimum (`180px`, ×2 rows =
360px floor) with the stated reasoning "same card width proportion as before, no reason
to re-tune that number" — a real card-WIDTH observation used to justify not re-checking
a completely different quantity, real card HEIGHT. The old headliner's own content had
already grown past that 360px floor on its own merit; the new featured card's content
never got close to it, so the unchanged 360px floor was pure padding no one asked for.

Fixed by dropping the per-row minimum to `90px` (letting `auto` size off real content
instead of a copied number) — dead space below the name dropped from 139px to 8px (the
card's own intentional `padding-bottom`, not leftover waste). Zone B's row minimum
(120px) was independently re-checked against ITS OWN real content at the same time
(~197px, already well clear of that floor) — confirmed not a source of any dead space,
left unchanged.

**This does drop the fit-ratio numbers Task 3.7 originally reported** (0.94×/1.09×/2.68×
→ **0.77×/0.89×/2.68×** desktop/laptop/mobile) — worth stating plainly rather than
treating quietly as a wash: those higher numbers were partly inflated by the same bug
this follow-up removes. The genuine, intentional part of Task 3.7's own "use the
headroom" instruction survives fully intact — the featured pair is still exactly as wide
as the old single headliner (both at 50% of the wall), just now applied to two cards
instead of one; real area ratio featured:secondary is still **~1.8:1**, still a
noticeably smaller gap than the pre-3.7 headliner:support ratio of 4.77:1. Laptop no
longer overshoots one screen at all now, which is a strictly better result, not a
regression to defend.

Re-verified everything Task 3.7 and 3.8 already established, unchanged: zero overlap
among all 5 wall cards at 1440/1280/1024/768px, zero horizontal overflow 320–1440px, zero
console errors, all 10 hrefs still correct, wall rotation and the crate's straightened
transform untouched. Confirmed visually too, not just numerically — screenshot shows the
featured pair still clearly reads as the larger, more prominent tier over the secondary
three, now without the awkward empty space under each name. Screenshots re-captured both
themes.

Build: JS 488.29 kB / 175.02 kB gz (unchanged — CSS-only value change), CSS 46.00 kB /
9.68 kB gz (unchanged). Lint unchanged: 7 errors, 2 expected warnings.

`design-review/stage4-my-taste-concept.md` §10 and the ratio table within it updated
with the corrected numbers and this fix's own reasoning.

### Stage 4 Task 4 — `#my-taste`: entrance motion (pin + pinboard cascade) *(2026-08-17)*

Motion only — no grid/positioning/sizing change, confirmed unchanged from Task 3.7's
follow-up. A `ScrollTrigger` pin (`pin: true`, the same primitive Experience's own
filmstrip uses) holds the section on entry while a single paused, non-scrubbed GSAP
timeline cascades: kicker (`SplitText`, whole-word pop, no per-character stagger) →
headliner card (`MotionPathPlugin` arc handing off into `CustomBounce` for the landing,
tape snapping via `CustomWiggle` immediately after) → remaining 4 wall cards (same
land/snap pairing, staggered ~0.1s apart) → crate (plain fade/slide, no bounce — this
section's one already-straightened object, Task 3.8). Real scroll input is held via
`lenis.stop()`/`start()` for the hold's duration — About's own Task 5 entrance-hold
mechanism, not Experience's scrub (this timeline runs on its own clock, not tied to
scroll distance). `CustomBounce`/`CustomWiggle` newly registered in `lib/gsap.js`
(confirmed present in the installed `gsap` package before writing any code against
them, same discipline as every other plugin here) alongside two new named eases,
`cardLand`/`cardLand-squash`/`pinSnap`, deliberately NOT built from `SIGNATURE_EASE` —
this section's own motion identity, per the brief.

**Two things the brief described that don't exist in this file, checked against the
tree rather than built blind:** a profile avatar next to "MY TASTE" (Task 3.9 — no
commit, no ROADMAP/STATUS/concept-doc mention anywhere; it never shipped, flagged as
its own separate open item, not built as part of this task) and a "MY TOP 5 TRACKS"
label inside the crate (no such element has ever existed in this file at any point in
its history — the crate's entrance animates its real content instead, the 3 thumbnails
and 5 track rows, with no separate label beat).

**Mobile scoped out deliberately**, via its own `gsap.matchMedia()` branch (`(max-width:
601px)` renders the settled end-state immediately, same as reduced-motion) — not named
in this task's own "out of scope" list, but the reasoning still applies and is sharper
here than it was for Tasks 3.7/3.8: mobile's own measured fit ratio is 2.68× viewport
height, so pinning (`position: fixed`, or GSAP's transform-based pin equivalent — see
below) a section that tall would hold a visitor captive against content mostly cut off
above/below the viewport for the whole hold. Real regression, not an untuned one.
Deliberate mobile art direction for this section is Stage 5's job, same as the layout.

**One real bug found and fixed during this task's own build**, not shipped and found
later: first tried `end: "+=1"` on the pin's `ScrollTrigger` (reasoning: the timeline
isn't scroll-scrubbed, so the exact pixel span shouldn't matter). Found live
(Playwright, realistic small-tick scrolling) that a single momentum jump can cross a
1px-wide start-to-end span within one `ScrollTrigger` update tick — the pin never
visually engaged at all under fast scroll, the same overshoot class Experience's own
`ENTRY_BUFFER` and About's own hold-correction already exist to absorb, just fatal here
instead of merely off-center. Fixed with `end: "+=200"` (same order of magnitude as
Experience's own 220px buffer) — the hold's real duration is still governed entirely by
`lenis.stop()`/`start()`, not by this number, which only has to be wide enough for
`onEnter` to reliably fire.

**Verification note on the pin mechanism itself:** checking `getComputedStyle(el).position
=== "fixed"` is the WRONG signal for whether this pin is engaged — GSAP's Lenis-aware
pin setup here uses transform-based pinning (`position` stays `relative` throughout),
confirmed live. Verified engagement/release instead via the section's own
`getBoundingClientRect().top` staying constant under continued scroll input, then moving
again once released — the implementation-agnostic check. By that measure: pin holds for
the cascade's real ~2.1s duration (confirmed against the timeline's own measured
`totalDuration()`), then releases cleanly, with normal scroll resuming immediately after
— no stuck pin under sustained scroll input across a full page scroll-through.

Verified: `CustomBounce`/`CustomWiggle`/`cardLand`/`cardLand-squash`/`pinSnap` all
genuinely registered (checked via a live `gsap.parseEase()` call, not assumed). Pin
engages and releases cleanly under continued realistic scroll input, confirmed via
real `getBoundingClientRect()` tracking. Reduced-motion and mobile (<601px) both render
the fully settled end-state immediately — verified opacity:1/no-pin/(mobile only)
`transform: none` on every wall card, matching the pre-existing CSS un-rotate rule
exactly. Zero console errors/failed requests across a full organic scroll-through of the
whole page. Keyboard focus still reaches wall-card and setlist links with a visible
outline (unchanged from Task 3.8). `clearProps: "transform"` added as the timeline's own
final step — without it, GSAP's inline `transform` (written the instant it first touches
x/y/rotation/scale) would permanently shadow `.my-taste-card`'s mobile `transform: none`
override the next time the viewport crossed back under 600px after having played this
entrance above it; confirmed live that every wall card's `style.transform` reads empty
after the cascade completes, handing authority back to the stylesheet (rotation/jitter
still visibly present in both themes, screenshot-verified).

Timeline tuned to ~2.1s total (brief's own "roughly 1.5-2s, not a strict target") by
real measurement (`tl.duration()`), not by feel alone — first build measured 3.265s,
tightened durations/overlaps and re-measured until it landed close to the stated range.

`design-review/capture-screenshots.mjs` given a `#my-taste`-specific wait bump (700ms →
3200ms) — found live that the default wait captured this section mid-cascade (Stone
Temple Pilots' card and the whole crate missing from the shot, reading as broken rather
than "captured too early"). Every other section's own 700ms is untouched.

No layout/CSS changes at all beyond the capture-script wait — this task is JS-only.
Build: JS 495.33 kB / 177.16 kB gz (+7.04 kB / +2.14 kB gz — `CustomBounce`/
`CustomWiggle` plugin code plus the new effect), CSS 46.00 kB / 9.68 kB gz (unchanged).
Lint unchanged: 7 errors, 2 expected warnings.

`design-review/stage4-my-taste-concept.md` gets a new §11 for this task's mechanism;
`ROADMAP.md` §3's Stage 4 task list gets a "4." row and update blockquote.

### Stage 4 Task 3.9 — `#my-taste`: Spotify profile avatar *(2026-08-17)*

A small circular photo of Diego's own Spotify profile, left of "MY TASTE" in the kicker
row. New server route, `GET /api/spotify/profile`, reusing the exact same
auth/token-refresh/cache mechanism the two top-items endpoints already use (one new
`fetchProfile()` function in `server.js`, same shape as `fetchTopItems`) — points at
Spotify's `GET /me` instead of `/me/top/*`.

**Scope check, done live, not assumed:** this project's Spotify authorization scope is
`user-top-read` only. Spotify's own docs say `/me`'s `email` field needs
`user-read-email` and `country`/`product` need `user-read-private`, silent on whether
`images` needs anything — read as "it doesn't," then actually confirmed by calling the
route against the real refresh token before wiring up any frontend code: `200`, a
populated `images[]`, on the existing scope. No scope change needed, nothing to report
as a blocked finding.

Frontend: `AvatarSlot` (my-taste.jsx), a small bespoke duotone circle — same
grayscale+contrast photo / `mix-blend-mode: color` tint layer PhotoSlot uses, not
PhotoSlot itself (its aspect-ratio-slot/torn-edge/tape scaffolding is built for a wall
card, none of which applies to an inline avatar). Duotone tried first per the brief's
own instruction ("consistency has been the right call everywhere else in this stage")
and kept — a real face reads fine through it in both themes, not muddy. Renders nothing
at all (not a placeholder, not a broken-image icon) when there's no image to show — a
failed request, or a real Spotify response with an empty `images[]` (an account with no
photo set, a real shape, not hypothetical) — same "hide rather than show broken"
discipline as PhotoSlot's own `onError` fallback. Both paths verified live against a
deliberately-broken route (Playwright request interception: a `500`, and separately a
`200` with `images: []`) — avatar absent, kicker text and the rest of the wall
completely unaffected either way, zero console errors.

**One real regression found and fixed in the same pass, not shipped and found later:**
the avatar's own width pushed the kicker row past what fits on a 390px mobile
viewport — found live via a real mobile screenshot, not assumed safe because the change
"is small." Before this task, "MY TASTE · LISTEN ON SPOTIFY" fit on one line at 390px;
adding the avatar made a bare text node inside the flex row shrink and wrap
**mid-phrase** ("MY" / "TASTE" split across lines) — a real rendering bug, not just a
tighter fit. Root cause: an anonymous flex item (unwrapped text between flex children)
can still wrap internally at word boundaries even while the row itself has
`flex-wrap: nowrap`, if the flex container is width-constrained. Fixed with
`white-space: nowrap` (stops any single text run from breaking internally) +
`flex-wrap: wrap` (the release valve — if the whole row still doesn't fit, a WHOLE
chunk drops to its own line, never mid-word) on `.my-taste-heading-link`. Mobile now
wraps as "[avatar] MY TASTE · LISTEN ON SPOTIFY" / "[icon]" — two clean lines, not a
pixel-tuned mobile composition (that's still Stage 5's job, per this file's own
repeated precedent), but no longer broken.

Fit-ratio re-run per the brief's own instruction to confirm rather than assume "small
element, harmless": desktop 0.77× → **0.83×**, laptop 0.89× → **0.95×** (both still
comfortably under one screen), mobile 2.68× → **2.80×** (mobile is Stage 5's own
territory regardless). The growth is real — an avatar row plus, in the same push, Task
4.1's two zone titles below — not free, but not a regression against the "fits" bar
either.

Zero horizontal overflow at the usual 320–1440px sweep, zero console errors across a
full scroll-through. Screenshots re-captured both themes.

Build: JS 496.88 kB / 177.53 kB gz (+1.55 kB / +0.37 kB gz over Task 4), CSS 46.88 kB /
9.79 kB gz (+0.88 kB / +0.11 kB gz). Lint unchanged: 7 errors, 2 expected warnings.

### Stage 4 Task 4.1 — `#my-taste`: sell "pinning," not "bouncing" + zone titles *(2026-08-17)*

Refinement pass on Task 4's own cascade — no change to the pin mechanism, its timing, or
its release (`end: "+=200"`, the <601px fallback, and the reduced-motion skip are all
untouched, per the brief's own explicit instruction). Landed alongside Task 3.9 in the
same session; both briefs arrived together, and this one repeated the avatar request
with a claim worth flagging: "Task 3.9's file was already written earlier and simply
never run... don't rebuild this." Checked against the tree first (CLAUDE.md) — no such
file existed anywhere (no commit, no trace in this file or `ROADMAP.md` beyond Task 4's
own "flagged, not built" note). Most likely explanation: the design-research chat that
writes these briefs has no repository access, so "already written" most likely meant
"I already drafted the brief text," not "this exists in the codebase." Built Task 3.9
for real (above) rather than searching for a file that was never going to exist.

**Why the landing read as "bounce," and the fix.** Sampled `CustomBounce`'s own eased
output (`gsap.parseEase("cardLand")`) rather than guessing why live feedback called it
generic: at the original `strength: 0.6` it touches its target three separate times
with two visible dips between — a genuine multi-bounce ball. Pulled back to
`strength: 0.3, squash: 1` (`lib/gsap.js`): one clear touch, one shallow dip, settled —
a single decisive beat instead of a rally. Also confirmed live, useful for calibrating
expectations: this ease never exceeds 1 at any strength (it approaches the target from
below and dips back, it doesn't overshoot past it like a spring) — so "arrives, slight
overshoot once, stops" reads here as "arrives, one shallow dip, stops," which is what
`CustomBounce`'s own shape actually produces, not a literal past-target overshoot.

**Two beats, not one.** The tape's `CustomWiggle` snap used to fire the INSTANT each
card's own land tween finished (`>`). Live feedback: this buried the pinning action
inside the card's own bounce instead of it reading as its own event. Added a deliberate
`+=0.15s` pause before every tape/pin animation starts (`>+=0.15` for the headliner,
`<+=0.55` — the land tween's 0.4s duration plus the same 0.15s gap — for the remaining
four, same per-card self-consistency the pre-4.1 version already had: tape[i] still
starts exactly `PIN_BEAT_GAP` after card[i]'s own land finishes, for every i). Verified
visually via a frame-by-frame capture at 150–200ms intervals through the cascade: each
card visibly settles, sits still for a beat with no tape, THEN the tape pops in and
snaps — confirmed the sequencing actually reads as two separate events, not just
theoretically separated by a number.

**Pivoted at the pin, not the card's center.** Each wall card's settle now animates
`rotation` from level (0deg) to its own real `--card-rotate` tilt, with
`transform-origin: 50% 0%` (the tape's own anchor point — `top: -10px; left: 50%`,
main.scss) instead of the card's geometric center. `clearProps` at the end includes
`transformOrigin` alongside `transform` (my-taste.jsx) so this doesn't outlive the
entrance for any future transform the card gets.

**Zone titles.** "MY TOP ARTISTS" above the wall, "MY TOP 5 TRACKS" above the crate —
same font/case/tracking as the kicker (`.my-taste-heading`) but visibly quieter
(`opacity: 0.7`, not a second heading-weight element), and deliberately a `<p>`, not an
`h3`/`h4` — this section still keeps exactly one real heading (Task 1's own decision).
Each has the kicker's own `SplitText` whole-word pop, timed just before its own zone's
cascade starts. Required wrapping `.my-taste-wall`/`.my-taste-crate` in new
`.my-taste-wall-column`/`.my-taste-crate-column` flex wrappers (title + content) since
`.my-taste-layout`'s own two-column grid needed a place to put a title ABOVE each
column's content — the grid's own `minmax(0, ...)` column-track fix (Task 3.5) needed no
changes, since it governs the whole track regardless of how many wrapper layers sit
inside it, confirmed by re-running the same overflow sweep after adding them (still 0px
at 320–1440px). `.my-taste-crate`'s own mobile `margin-top` moved to
`.my-taste-crate-column` in the same pass — left on the inner element, it would now sit
between the crate's own new title and its content instead of between the two stacked
zones.

Timeline duration grew from ~2.1s (Task 4) to **~2.76s** — two new pop beats plus two
deliberate 0.15s pauses are real additions, not free; tightened several tween overlaps
after the first build measured 3.19s, landing at a number that's honest about the
brief's own asks rather than forced back to the original figure by cutting the very
pacing this task requested.

Verified: pin engage/release unaffected (re-confirmed via `getBoundingClientRect().top`
stability, same method Task 4's own report established — not
`getComputedStyle().position`, which still reads `"relative"` on this page's
transform-based pin); zero overflow at the usual sweep; zero console errors across a
full scroll-through; fit ratio re-run with both titles in place (see Task 3.9's entry
above — the two numbers move together since both tasks landed in the same pass).
Screenshots re-captured both themes, plus a frame-sequence capture used specifically to
verify the "reads as pinned, not bounced" feel — not just a passing automated check.

Build: JS 496.88 kB / 177.53 kB gz, CSS 46.88 kB / 9.79 kB gz — same final numbers as
Task 3.9's entry above (both tasks landed in one build/commit). Lint unchanged: 7
errors, 2 expected warnings.

`design-review/stage4-my-taste-concept.md` gets a new §12 (Task 3.9's own mechanism) and
§13 (this task's), plus a short forward-pointer added to §11; `ROADMAP.md` §3's Stage 4
task list gets "3.9" and "4.1" rows and update blockquotes.

### `#my-taste` live-feedback pass — pin bug, grain texture, setlist wrap *(2026-08-17)*

Three items from live feedback on the just-shipped Task 3.9/4.1 build, not a numbered
roadmap task — reported directly rather than through a design-research brief.

**The pin bug — B30 (`FINDINGS.md`).** "when we reload the page and we scroll down the
section is not pinned." Reproduced with Playwright, root-caused with a live
`ResizeObserver`/height-poll pass, and traced to `#my-taste`'s own `ScrollTrigger` being
created before this section's scoped webfonts finish their swap-in — a stale pin
measurement, not a missing one. Fixed page-wide in `smooth-scroll.jsx`
(`document.fonts.ready` + a debounced `ResizeObserver` on `document.body`, both calling
`ScrollTrigger.refresh()`) rather than patched locally in `my-taste.jsx` — full
root-cause writeup and verification in `FINDINGS.md` B30.

**Grain texture removed.** `.my-taste-section::after`'s feTurbulence noise overlay (Task
3's "photocopied flyer" texture) read as grainy/granite-like static on top of the real
photos rather than the intended paper texture — cut, not re-tuned; the photo duotones
(`PhotoSlot`/`AvatarSlot`'s own grayscale+contrast+tint layers) already carry this
section's tactile treatment on their own. `position: relative` came off `.my-taste-section`
with it — confirmed nothing else in the section needed it as a containing block (cards/
photos/tape all position against their own nearer ancestor).

**Setlist row wrap — B31 (`FINDINGS.md`).** Live screenshot flagged the mobile setlist
rows as cramped; measuring the actual boxes found something worse than tight spacing —
long track titles could split the index number onto its own orphaned line, separate from
its own track name. Fixed by grouping index+track into one nested flex unit
(`.my-taste-setlist-main`) so they can no longer split from each other; bumped the row's
row-gap (`--space-2` → `--space-3`) so a wrapped artist line reads as still-part-of-this-
row rather than blurring into the divider below. Full writeup in `FINDINGS.md` B31.

Also investigated and ruled out during this pass: a screenshot appeared to show the
navbar "floating" mid-section on mobile. Confirmed live (`getBoundingClientRect()` during
a real scroll: `top: 0`, `position: fixed`, exactly where it belongs) that this is a
capture artifact of this project's own element-clipped screenshot tool rendering a
`position: fixed` element once into a shot far taller than any real viewport — not a
live bug. No code change.

Verified: fresh-reload pin repro now shows a genuine hold-then-release plateau; 5-second
`scrollHeight` poll confirms the new `ResizeObserver` doesn't loop against its own
refresh calls; full-page console/pageerror sweep across a complete scroll clean; setlist
box measurements re-run live at 390px (no orphaned index at any of the 5 real tracks
tested); `npm run lint` (7 errors/2 warnings, baseline unchanged) and `npm run build`
(CSS 46.88 kB → 46.54 kB gz-equivalent shrink from the removed grain rule) both clean.
Screenshots re-captured both themes (`my-taste-desktop.png`, `my-taste-mobile.png`).

### `#my-taste` follow-up — duotone filter removed, pin-hold fixed for real desktop windows *(2026-08-17)*

Two more items of direct live feedback on the same build, checked and fixed the same day.

**Duotone filter removed.** "the images still look a different color from what spotify
displays... dont do that." Removed the grayscale+contrast filter and the `--card-tint`
mix-blend-mode overlay from every real photo in the section (`PhotoSlot`, `AvatarSlot`) —
photos now render exactly as Spotify serves them, verified via computed styles
(`filter: none`, `mix-blend-mode: normal` on every rendered `<img>`, zero tint-overlay
elements left in the DOM — not just eyeballed from a screenshot). `--card-tint` itself
stays on `PhotoSlot`: it's still the fallback fill for a missing/broken image, unaffected.
`AvatarSlot` had no fallback use for it, so its own `--card-tint`/`photoColorwayFor`
call came out entirely, not just the filter.

**B32 — the pin-hold silently skipped itself on ordinary desktop window heights.** Full
root-cause writeup in `FINDINGS.md` B32. Short version: ruled out a B30 recurrence first
(automated check against local dev AND live production both showed a clean pin-and-hold
at 1440×900, even under an aggressive fast-flick scroll) — the actual cause was the
`onEnter` safety net's own strict `sectionHeight > available` check silently skipping the
hold on completely normal, non-maximized window heights (516-556px available at
660-700px tall, section needs ~631px), not just genuinely squeezed ones. Widened to
`SAFETY_NET_OVERFLOW_ALLOWANCE = 1.6` (tolerate up to 60% overflow before giving up on
the hold) rather than removed outright — still bails out on genuinely pathological short
windows. Re-verified live across 600/660/700/900px window heights at 1440px wide: every
one now holds cleanly (`getBoundingClientRect().top` frozen at the navbar-height offset
for dozens of consecutive samples) and releases on schedule.

Verified: full-page console/pageerror sweep clean; `npm run lint` (7/2, unchanged) and
`npm run build` clean (CSS 46.54 kB → 46.19 kB, the duotone rules' own removal).
Screenshots re-captured both themes.

### Resume removed — navbar link, `#connect` link, and the PDF itself *(2026-08-17)*

Direct request, privacy: "get rid of the resume tab and my resume... i don't want
people seeing my data." Removed from three places, not just the visible one — the
navbar's own "Resume ↗" link (`navbar.jsx`), the "Resume (PDF)" link in `#connect`
(`connect.jsx`, would otherwise have pointed at a now-deleted file), and the underlying
file itself, `client/public/Diego-Damian-Resume.pdf` (`git rm`'d, not just deleted from
disk, since it was tracked). `RESUME_URL`/`RESUME_ARIA_LABEL` (`lib/sections.js`) and the
`.navbar-resume`/`.contact-resume` CSS rules came out too, rather than left as dead code
with nothing pointing at them. Added `*[Rr]esume*.pdf` to `client/.gitignore` so a future
resume file can't be accidentally re-tracked.

**Important caveat, told to the user directly, not left implicit:** `.gitignore` only
stops FUTURE commits. The file is still fully recoverable from git history — it was
added in exactly one commit (`8030639`, "feat: add the resume link, closing Stage 0") and
untouched since, so it's a single, identifiable commit, not scattered across history. It
remains on GitHub (this is a public repo) and in every existing local clone until that
history is separately rewritten (force-push, rewrites every commit SHA after it) — a
much more invasive step this task did not take without asking first.

**A secondary consequence, checked rather than assumed harmless:** the navbar's own
900px hamburger breakpoint was tuned (Task 5, `main.scss`) around SIX items (five
sections + the resume link — the `SECTIONS` list itself has grown to six since, so it
was six even before this). Removing the resume brings it back to six section links only.
Re-measured live rather than assumed still-correct: fits at 900px with real slack now
(32px, not the old zero-slack fit) — left the breakpoint unchanged since there's no
defect to fix and a lower re-tune wasn't asked for; also found (not fixed, out of scope)
that individual nav labels have no `white-space: nowrap`, so a naive lower breakpoint
risks a single label wrapping onto two lines rather than the whole row wrapping cleanly.

Verified: full build output (`client/dist/`) contains no resume file; the PDF's own URL
now falls through to the SPA shell (no file, no data) instead of ever serving the PDF;
navbar (desktop + mobile menu) and `#connect` screenshots re-captured, no resume link,
no dangling gap where it used to sit; `npm run lint` (7/2, unchanged) and `npm run build`
clean; full-page console/pageerror sweep clean.

### `#experience` repositioned higher — title and slideshow *(2026-08-17)*

Live feedback: "move it a bit higher, title and slideshow." `.experience-section`'s pin
fills the whole navbar-cleared viewport (`min-height: 100vh - navbar`, unchanged, still
load-bearing for the pin itself), and pure 50/50 centering of the viewport within the
leftover space below the title — combined with the title's own gap from the navbar —
put the whole title+slideshow block visibly in the lower half of that space, not just
off-center by a little.

Two changes, both requested ("title and slideshow" — moving only one wouldn't cover it):

1. **The title.** `.experience-section`'s own top/bottom padding was symmetric
   (`var(--space-6)` both sides); trimmed to asymmetric (`var(--space-5)` top,
   `var(--space-6)` bottom unchanged) — an existing token, not an invented value. Shifts
   the whole `[title, shell]` column up as a unit; the section's own total height (and
   the pin's occupied viewport space) is unaffected since only the bottom-padding side
   still anchors it.
2. **The slideshow.** `.experience-viewport-shell`'s `justify-content: center` replaced
   with two flex-grow spacer pseudo-elements (`::before`/`::after`) split 0.35/0.65
   (top/bottom) instead of 1:1 — same underlying diagnosis `about.jsx`'s own `TOP_BIAS`
   comment already made for a different section (mathematical centering under a fixed
   navbar reads as lower than intended, because the navbar itself anchors the eye
   toward the top), same 65/35 magnitude reused from that precedent, just applied to the
   opposite side (About needed more slack ABOVE to read as centered; this needed more
   slack BELOW to read as higher). flex-grow, not a fixed padding/margin, is what keeps
   this safe at short window heights: when the shell has zero leftover space (a tight
   window — `--experience-vp-height` already fills the whole shell), both spacers
   compute to 0px regardless of ratio, so this can't reintroduce a B29-style
   overlap/cutoff the way a fixed pixel offset could have — confirmed live, not assumed,
   across 900/800/700/660/600px window heights (measured before AND after: the
   short-window bottom-cutoff this section already had — `--experience-vp-height` is a
   fixed value, not viewport-height-responsive — is pre-existing, unrelated to this
   change, and actually shrank slightly, 775px→767px viewport-bottom at 700px tall, from
   the title's own trimmed padding).

Net measured shift at 1440×900: title 8px higher, slideshow viewport 19px higher (title
offset unaffected by window height; the shell's own bias contributes proportionally more
at taller windows, nothing at zero-slack ones — by design).

Verified: `npm run lint` (7/2, unchanged) and `npm run build` clean; full-page
console/pageerror sweep clean; height sweep (900/800/700/660/600px) confirms no
title/viewport overlap at any height, and no new bottom-cutoff regression vs the
pre-change baseline (checked via `git stash`, not assumed); mobile (390px) re-checked,
no horizontal overflow, layout intact. Screenshots:
`experience-repositioned-1440-{dark,light}.png`.

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

## 3. Current measurements *(refreshed 2026-08-21)*

| Metric | Before | Now |
|---|---|---|
| Deploy size | 152 MB | **9.6 MB** |
| Images | 11 MB | **1.7 MB** |
| JS bundle | 407 KB / 147 KB gz | **525.44 kB / 187.21 kB gz** *(+21 kB / +7.5 kB gz vs. pre-Stage-3-Task-10 baseline — GSAP `Flip`, first use; Tasks 10.1/11/10.2/11.2/12 added +6.67 kB / +2.08 kB gz combined on top, mostly Task 12's own walkman sequence)* |
| CSS bundle | 26.96 kB / 5.99 kB gz | **50.09 kB / 10.54 kB gz** *(Task 12 alone added +4.05 kB / +0.90 kB gz — the cassette/walkman rules; the two self-hosted DSEG7 font files, ~9.6 kB combined woff2+woff, are separate font assets, not counted in this CSS number)* |
| ESLint errors | 21 | **7** *(+2 warnings, both `vinyl-record.jsx` — expected, see Stage 4 Tasks 1 and 3.6)* |
| `.git` size | 91 MB | **177 MB** *(grew, not unchanged — re-measured, not assumed stale. This session alone added many commits with binary screenshot diffs, each one a new object in history regardless of the PNG file's own current size. Strengthens, not just restates, the case for the Stage 8 history rewrite — see ROADMAP.md §0/§3, now also motivated by the resume PDF's privacy removal, not size alone)* |

---

## 4. Outstanding manual tasks

Not code — these need a human with dashboard access.

| | Task | Why it matters |
|---|---|---|
| ✅ | ~~Set `RESEND_API_KEY` on the Railway *server* service~~ | **Stale as of 2026-08-19 — the key is live.** Confirmed by probing `https://api.diegodamian.com/api/contact` directly (an empty payload returns `400` from validation, not `503` from the missing-key check, which runs first) and by a real successful test send through the same code path. This line sat unchecked for at least one full task cycle after someone had already set the key, with nothing else in this file catching the mismatch — see Stage 3 Task 11's own dated entry above for the full writeup |
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
