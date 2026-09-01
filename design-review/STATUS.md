# Project Status — diegodamian.com

**Updated:** 2026-08-30 (**site-wide vertical scroll-snap** — every section
settles to `--scroll-offset` when a wheel/trackpad gesture comes to rest near
it, both directions; `proximity` via `lenis/snap`, no CSS scroll-snap; the
three entrance holds pause it while they play). Prior: 2026-08-29 `#connect`
send-state polish — sent layout centred, heading glides in, takeover scrim
removed, "send another message" fades in. ·
**Live:** https://diegodamian.com

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
| 6 | **Converts recruiter attention** | 🟡 Stale row, corrected: the hero DOES deliver now (goal 4, above — Stage 1 shipped); the resume link is gone by direct privacy request (2026-08-17, three places removed, `.gitignore`'d against re-tracking), not "linked from three places" as this cell previously claimed. Contact form works (Stage 3 Task 11) and the message-in-a-walkman send confirmation is genuinely inviting (Task 12 and its follow-ups). Remaining gap: no resume/CV anywhere on the site at all now — worth a deliberate call on whether that's the intended final state or a placeholder gap, since it's the single largest lever left for this goal specifically | Stage 1 ✅, Stage 3 (contact) ✅ |

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

### Stage 3 Task 12.1 — `#connect`: field layout, cassette rebalance, walkman bug pass *(2026-08-23)*

A follow-up brief on Task 12's own feature (numbered as a decimal, like
10.1/10.2/11.2 — a fix/refinement pass on the SAME walkman/cassette work,
not new separate functionality). Re-read `connect.jsx`/`walkman.jsx` fresh
per the brief's own instruction rather than assuming its description of
"current" behaviour was accurate — two of its three named bugs did not
match what the code actually does; see **Discrepancies** below.

**Name/email — one row, not two:** `.contact-form-row` (new, `main.scss`)
wraps the two `form-group`s in a 2-column grid instead of the previous
full-width stack. Each input's own padding also shrank
(`.form-group input, .form-group textarea`, `0.75rem` → `var(--space-2)
var(--space-3)`) — `font-size` stays `1rem`; dropping below 16px on an
input triggers iOS Safari's zoom-on-focus, a worse regression than the
height this saves. Measured live, before vs. after (`git stash` to get a
real "before" number rather than estimating): input height **44px → 36px**,
and the two fields moved from stacked (88px + row gap) to one 63px-tall
row — real, compounding vertical space back. Confirmed side-by-side with no
horizontal overflow at both 1440px and 390px (this project's narrowest
currently-supported width); no breakpoint override added — two short text
inputs fit that row at 390px as-is (pre-mobile-pass, Stage 3).

**Cassette rebalance:** the reel row is now genuinely quiet resting-state
chrome instead of competing with the text — shrunk 30px → 18px diameter,
border 3px → 2px, hub 8px → 5px, and dimmed via `opacity: 0.55` on
`.message-cassette-reels` (not touched: `--cassette-reel-window`/
`--cassette-label-line`, the shared "physical object" tokens other rules
also use — this rule alone gets to decide how loud its own decoration is).
Its `margin-bottom` grew `var(--space-1)` → `var(--space-3)` so it reads as
a strip above the writing area, not crowded into it. The textarea itself
got more breathing room the other way: `rows` `5` → `3`, padding
`var(--space-2)` → `var(--space-3)`, and a new `line-height: 1.6` — not
invented for this field, the same value `.about-me-bio` already uses for
its own readable body copy. Net effect, measured: cassette height **198px →
160.78px** (~19% shorter) while the text itself sits in a roomier, more
legible box — the reduction reads mostly as "less decorative chrome," not
"less room to type."

**Walkman bugs — one real, two did not reproduce:**
- **Wrong LCD copy — real, fixed.** Was `"MESSAGE SENT"`; brief asked for
  `"thank you for reaching out!"` or a final chosen equivalent. Neither
  that exact sentence nor the literal `"THANK YOU!"` shortening survived
  contact with the real screen: the LCD's box/font-size (Task 12) were
  tuned against a 12-character string, the requested sentence is 27 and
  clips badly at the same scale; and DSEG7 Classic's own glyph shapes for
  T, N and K render distorted enough at this size that `"THANK YOU!"` and
  even bare `"THANKS"` do not read as English at a glance (screenshotted
  both before rejecting them). Tried and screenshotted several
  alternatives (`SUCCESS!`, `ALL DONE`, `RECEIVED`, `CHEERS!`) before
  settling on **`"CHEERS!"`** — still a genuine thank-you, and its letters
  (C H E E R S) avoid all three problem glyphs entirely. `WALKMAN_LCD_TEXT`
  (`walkman.jsx`) is the one place this lives; the ghost layer derives from
  it automatically.
- **"Stale text left behind" — investigated, did not reproduce.** The
  brief described the compose box as hidden via opacity/display while old
  field values persist in the DOM. The actual code already fully unmounts
  the form (`status === 'sent' ? <success> : <form>`, a real conditional,
  not a CSS hide) the instant a send succeeds. Verified directly: submitted
  a message containing a unique marker string, dumped
  `.contact-container`'s full text and the mounted textarea's `.value`
  immediately after Phase 1 and again after full settle — the marker never
  appeared anywhere, and `document.querySelector('#message')` returned
  `null` (genuinely gone, not hidden). Repeated across a full two-cycle run
  (first send → "send another message" → second send with a *different*
  marker) to rule out a second-cycle-only version of the bug — neither
  marker ever leaked. No code changed for this one; see **Discrepancies**.
- **"Auto-reset after ~2 seconds" — investigated, did not reproduce.**
  Grepped this project's entire `client/src/` for `setTimeout`/
  `setInterval` — five exist, none in `connect.jsx`, `walkman.jsx`, or
  `lib/gsap.js`. Held the settled walkman under live observation for 30+
  seconds after a first send, and again after a "send another" + second
  send, both times confirming `opacity: 1`, no `.contact-form` re-appearing
  unprompted, and the EQ-bar transform still changing between samples (the
  loop still running, not stalled). No code changed for this one either.

**Discrepancies flagged (brief vs. actual code, confirmed by re-reading and
by live testing before changing anything):** the LCD text was `"MESSAGE
SENT"`, not `"Message sent"` as described — same underlying ask either way,
addressed above. The textarea's `font-family` was already `inherit` (the
site's body font, Avenir Next) — Task 12 reserved DSEG7/Space Mono for the
walkman's own LCD screen only; there was no font-mono bug on the compose
field to begin with. No timeout or auto-revert exists anywhere in this
feature's code. A plausible source for both "bugs that didn't reproduce":
this project's own documented trap of testing on `npm run preview`'s
port 4173 instead of the dev server's 5173 (CLAUDE.md) — that port fails in
ways that read exactly like real bugs and aren't; not confirmed as the
actual cause here, just the likeliest local-environment explanation on
hand, since the code itself has no mechanism that would produce either
symptom.

**Verification:** live on `localhost:5173`/5050 (the dev pair). Hit the
contact endpoint's own rate limit partway through re-testing (several rapid
sends in one session) — real limiter, not a bug — worked around for the
remaining LCD-copy trials by mocking `POST /api/contact` at the network
layer (Playwright `page.route`) so repeated client-side-only runs didn't
need a real send. Re-hit D17's known pre-existing scroll-triggered crash
(`#my-taste`'s `AvatarSlot`) once under an aggressive scroll-sweep pace
during this pass; unrelated to this work (same finding as Task 12's own
write-up) — avoided by scrolling at the already-established human-like
pace (150ms/250px steps) for every other run. `npm run lint`: **7 errors, 2
warnings**, unchanged from Task 12's own baseline (this pass touched no
file lint was already flagging). Note: CLAUDE.md's own "16 errors" baseline
note is stale — actual has been 7 errors/2 warnings since at least Task 12;
flagged here rather than silently trusted. `npm run build`: JS 525.44 ->
**525.49 kB** (187.21 -> **187.22 kB** gz), CSS 50.09 -> **50.17 kB** (10.54
-> **10.56 kB** gz) — negligible, as expected for a layout/copy pass with no
new dependencies.

### Stage 3 Task 12.2 — `#connect`: heading copy, dead-scroll fix, textarea overflow fix *(2026-08-23)*

A second decimal follow-up on Task 12's own feature (sibling to 12.1, same
convention as 10.1/10.2 both being decimals off Task 10 rather than 12.1
growing a sub-decimal of its own). Re-read `connect.jsx`/`main.scss` fresh
rather than assuming Task 12.1 was the last word on this section.

**Copy:** `.contact-title` — "Let's have a coffee talk" -> "Let's Connect."
`.contact-description` (the paragraph under it, including the inline
`mailto:` link) removed entirely, per direct instruction — no replacement
copy added. Its own `SplitText` step in the entry-pin's reveal timeline
(`descriptionSplit`) is gone too, not just hidden — `titleSplit` now hands
off straight to the form. `.contact-title`'s own `margin-bottom` grew
`1rem` -> `--space-6` (32px) since the heading now sits directly above the
form with nothing bridging the gap — `1rem` read as cramped alone. While
in that rule: fixed `font-weight: 60` -> `600`, a typo already flagged in
ROADMAP.md/STATUS.md (Q1/Q4 notes) as "almost certainly a dropped digit"
but never actually corrected until this pass touched the same line.

**B41 — the real "space between projects and Connect" (`FINDINGS.md` B41):**
this section's entry-pin `ScrollTrigger.create` never set an explicit
`end`; with none given, GSAP defaults the pin span to the trigger's own
full height (~916px), so the section stayed visually pinned for that whole
span even after the reveal timeline finished and `lenis.start()` already
resumed real scroll input. Measured directly (scrollY vs. the section's
own `getBoundingClientRect().top` on every scroll tick): **938px of dead
scroll** before the page would budge at all. My Taste's own pin — the
pattern this section's comments already credit — sets `end: "+=200"` for
an unrelated reason (protecting `onEnter` from a fast-scroll momentum jump
skipping past a too-thin span, not controlling hold duration); this
section copied `pin: true` from that pattern but not the `end` that comes
with it. Fixed by adding the same `end: '+=200'`. Re-measured: dead scroll
dropped to ~340px (the real, expected distance to scroll the now-revealed
section out of view — not a leftover bug).

**B42 — the message box's own border rendering bigger than the box
(`FINDINGS.md` B42):** `.message-cassette textarea` sets `width: 100%`
without opting into `box-sizing: border-box` (no global reset exists in
this file — `.portfolio-section`'s own comment documents the identical
gotcha independently). Under the default `content-box` model the
textarea's own padding is added ON TOP of that 100%, not carved from it —
measured 704px rendered against a 700px-wide cassette, a 14px overflow
before the focus outline even drew its own few px on top. This was already
a smaller version of the same bug since Task 12 shipped (16px overflow at
the original 8px padding) — Task 12.1's own padding increase (8px -> 12px)
made it worse, not new. Fixed with one line (`box-sizing: border-box`);
re-measured textarea width now matches the cassette's own 680px
content-box exactly, confirmed via a 2x-scale screenshot that the focus
outline sits fully inside the cassette on every side.

**Verification:** same dev pair (5173/5050), same human-paced scroll (D17
re-confirmed still pre-existing, hit once more under this task's own
testing, unrelated). Full send sequence re-run end to end (walkman still
pops, "CHEERS!" still resolves), reduced-motion path re-run (still
resolves instantly, no scramble). `npm run lint`: **7 errors, 2 warnings**,
unchanged. `npm run build`: JS 525.49 -> **525.08 kB** (187.22 ->
**187.07 kB** gz), CSS 50.17 -> **50.08 kB** (10.56 -> **10.54 kB** gz) — a
net decrease, expected: this pass removed more markup/CSS (the description
paragraph and its two rules, the SplitText step) than the fixes added.

### Stage 3 Task 12.3 — `#connect`: heading takeover, LCD root cause, walkman prominence, real reset button *(2026-08-23)*

A third decimal follow-up on Task 12's own feature (sibling to 12.1/12.2,
same convention as 10.1/10.2 both being decimals off Task 10). The brief
described the pre-send heading as "Let's have a coffee talk" and implied
`.contact-description` still exists, hidden only post-send — neither is
true: Task 12.2 already renamed the heading to "Let's Connect" and removed
the description paragraph ENTIRELY (not conditionally), both flagged here
rather than assumed away. The rest of the brief's own description of the
current code held up.

**Headline swap, not stacking:** the heading (`.contact-title`) is now the
confirmation message itself. On send, `ScrambleTextPlugin` transforms it
from "Let's Connect" into "Thank you for reaching out!" in place — the
same element, not a second block added below it. `.contact-success` (the
old separate "Thanks for reaching out.../I'll get back to you soon."
two-paragraph block) is removed entirely, JSX and CSS both. One real
plumbing fix this required: the entry-pin's own `SplitText` instance
(`titleSplit`) was never reverted except on component unmount — it left
per-word wrapper spans in the heading's DOM indefinitely after the one-time
entry reveal finished, which would have fought `ScrambleTextPlugin` reading
plain text later. Now reverts unconditionally the moment the entry
timeline completes (including the instant-resolve nav-click path, where
the existing `releaseHold()` itself no-ops), so any later send always finds
plain text to scramble.

**LCD text — root cause, not another guess (`FINDINGS.md` B43):** the
brief reported the screen rendering "ehEEr98" and asked whether it was a
charset or premature-assignment bug. Neither: `.walkman-screen-lit`'s raw
`textContent`/`innerHTML` was sampled every 100ms through a full send and
resolved to exactly `"CHEERS!"` at t=1400ms and never changed again — the
underlying data was correct and stable the whole time. The garbling is a
genuine DSEG7 Classic font characteristic: a 7-segment display can't form
a full-height capital B, C, D, H, N, R (and others) without colliding with
a digit shape, so the font substitutes smaller "lowercase-style" glyphs
for those letters specifically — confirmed by rendering the entire
alphabet at this exact size and screenshotting it in chunks. Only a
handful of letters (A, E, F, G, L, O among them) get true full-height
capital forms. "CHEERS!" opened with two of the worst offenders back to
back (C, H); the LCD now reads **"ALL DONE"**, which mostly uses the clean
set and stayed legible in a real screenshot before being picked.

**Walkman prominence:** `.walkman`'s own rest width grew from `min(260px,
78%)` to `min(460px, 92%)` — connect.jsx's settle step already animates
back to `scale: 1`, which now means "this bigger natural size" rather than
the old small one, so no JS constant needed to change for this alone.
Measured: settled walkman renders at 460×292.7px on desktop (aspect ratio
held), horizontally centered exactly on `.contact-container`'s own center
(both measured to the same pixel), and at 329×209px on a 390px viewport
with zero overflow past `.contact-section`'s own bounds.

**Left window visualizer (`FINDINGS.md` — see the walkman.jsx/main.scss
comments, no separate finding needed, this was a straightforward addition
not a bug):** the cassette bay/lid area is functionally necessary during
Phase 1 (the cassette has to visibly land there and the lid has to close
over it) — a permanent visualizer in that same space would fight that
animation. Solved by layering a new `.walkman-visualizer` (6 bars,
`colorwayFor()`-salted, its own set independent of the EQ bars) in the
SAME box, DOM-ordered after `.walkman-lid` so it paints on top, hidden
(`opacity: 0`) until connect.jsx fades it in right after the lid snaps
shut. Joins `startIdleLoop()`'s existing `repeat:-1`/`yoyo:true` shape with
its own independent random range/stagger so the two windows don't visibly
mirror each other — confirmed animating continuously via repeated
`getComputedStyle` transform sampling (5 of 6 bars changed value between
every consecutive 1s sample).

**Real "send another message" button:** this site has no filled/bordered
CTA anywhere to copy verbatim — checked every clickable control
(`.submit-button`'s own ghost/text style, the portfolio accordion toggle,
the turntable's transport buttons, the theme toggle) and none are
bordered. Reused `.experience-date`'s own recipe instead (2px solid
`var(--accent)`, pill radius, background matching the page) as a genuine
button rather than a static badge, adding a hover fill (`background:
var(--accent)`, text flips to `var(--bg-color)` — the one token confirmed
to hold real contrast against the accent in both themes) for the visible
affordance `.experience-date` itself never needed. Lives in a new
`.walkman-stage` wrapper alongside `<Walkman/>` so the two read as one
unit, not an orphaned link below unrelated content.

**Reset — a deliberate reversal, flagged not silently made:** Task 12's
own original design kept the walkman mounted permanently once shown, so a
second send would replay only Phase 1 onto an already-settled device. This
brief explicitly asks for the opposite — "walkman returns to hidden state"
— so `handleSendAnother` now kills both tweens (`idleLoopRef`,
`sequenceTlRef`), resets `hasPoppedInRef` to `false`, and sets
`walkmanVisible` back to `false`, unmounting `<Walkman/>` entirely. The
next send pops it in fresh, identical to the very first one. The heading
scrambles back to "Let's Connect" the same way it scrambled forward.

**A real bug found during verification, not asked for but fixed
(`FINDINGS.md` B44):** with the compose form scrolled to a completely
ordinary position (the submit button centered in the viewport — not a
contrived edge case), sending landed the confirmation heading **entirely
behind the fixed navbar** (measured: heading box 73–128px from viewport
top, navbar's own bottom edge at 144px). Since the heading is now the only
confirmation message on screen, invisible defeats the point of it existing
in the realistic case, not just an edge one. Fixed with a new
`ensureHeadlineVisible()`, called at the top of `runSendSequence`: checks
the heading's real position against `--navbar-height` and only nudges
scroll (via the active Lenis instance, or `window.scrollTo` under reduced
motion / no Lenis) when it's actually needed — a visitor already scrolled
with room to spare is left alone. Re-verified with the same realistic
scroll position: heading top moved from 73px (fully hidden) to 160px
(clear by the intended 16px margin).

**Verification:** dev pair (5173/5050). Full sequence traced end to end at
1440px and 390px, both themes; reduced motion confirmed instant heading
swap + static visualizer + no scroll-fix regression; "send another
message" clicked and confirmed a FULL reset (heading, form, walkman all
back to idle) followed by a clean second send (fresh pop-in replay,
correct LCD, correct heading). `npm run lint`: **7 errors, 2 warnings**,
unchanged. `npm run build`: JS 525.08 -> **526.32 kB** (187.07 ->
**187.40 kB** gz), CSS 50.08 -> **50.72 kB** (10.54 -> **10.60 kB** gz).

### Stage 3 Task 12.4 — `#connect`: the cassette actually goes in *(2026-08-23)*

A fourth decimal follow-up on Task 12. The ask was short and its priority
explicit — *"remember the animation is inserting the message box (cassette)
into the walkman... Make sure the animation is smooth. That's what we care
about the most now"* — plus neon visualizer colours, the section shifted
higher, and a slightly taller message box.

Rather than tune by eye, the send sequence was instrumented first: a
`requestAnimationFrame` sampler recording `getBoundingClientRect()` for the
flight clone, the walkman, the bay, the heading and the scrim on every frame
of a real send, alongside a 26-frame screenshot burst. That trace found
**two independent defects, both of which had been invisible in every
screenshot taken of this feature so far** (`FINDINGS.md` B45, B46).

**B45 — the cassette was never landing in the bay.** `bayEl.getBoundingClientRect()`
was being read ~20 lines *after* Phase 0's own
`gsap.set(walkmanEl, { scale: 0.5 })`, so Flip was handed a destination box
at **half** the bay's real size and offset from it: measured
**108.6 x 73** against a real bay of **209.1 x 138**. The cassette flew to a
too-small rectangle floating over the front of the device instead of seating
into the slot — which is the one thing this entire animation exists to show.
Fixed by hoisting every rect this sequence needs into a single measurement
block above any transforming `gsap.set`. Re-measured after: the cassette
lands at **527.6, 354.0, 213.0 x 142.0** against a bay at
**527.3, 354.1, 209.4 x 138.2** — flush, the 2px lip on each side being
`.cassette-flight`'s own border.

**B46 — 1050ms of dead air before anything moved.** The heading scramble is
added at timeline position `0` with a 0.6s duration; the walkman's pop-in was
appended with **no position argument**, so it silently inherited `'>'` — the
end of the timeline *as it then stood*, i.e. 0.6s — and the cassette flight
chained off `'>'` after that. Measured: the form unmounted on click and a
large empty cream rectangle then sat motionless on an otherwise blank section
for **1050ms**. Every step in the sequence now sits at an **explicit absolute
position** computed from named duration constants (`POP_DUR`, `FLIGHT_DUR`,
`landed`, `lidShut`, `settleStart`) — no bare `'>'`/`'<'`/`'+='` anywhere in
this function. First motion now at **117ms**.

**The lid actually closes over the cassette.** `.cassette-flight` is a sibling
of `.walkman` at z-index 7 vs 6 — it has to be, it's positioned against
`.contact-section`, and `.walkman`'s own z-index makes the device a single
stacking unit nothing external can be interleaved into. So a clone still at
full opacity paints *on top of* the lid closing over it. The clone now
cross-fades out across the first two thirds of the lid's travel, and the
scrim/scale-up wait until it is gone — previously the scale-up began 150ms
before the clone was removed, pulling the bay out from under a cassette that
stayed exactly where it was.

**Takeover scale 2.3 -> 1.35.** That 2.3 was tuned against a walkman whose
rest width was `min(260px, 78%)`; Task 12.3 nearly doubled that to
`min(460px, 92%)` and the multiplier came along unchanged, so the takeover was
inflating a 460px device to **1058px** and shrinking it all the way back —
the largest single chunk of motion in the sequence and the least purposeful.
Now 460 -> **621px**. Whole sequence: **~4.15s -> 2.45s** from click to
settled.

**The heading was behind the scrim.** `.connect-scrim` (absolute, z-index 5,
covering the section) was painting straight over `.contact-title` for the
~1.4s hold — and since Task 12.3 that heading is the send's *only*
confirmation message. `.contact-title` now takes `position: relative;
z-index: 8`, above both the scrim and the flight clone. With it now legible
on top of the scrim, the scrim's own weight was measured rather than assumed:
at `black 55%` the heading read **17.89:1** in dark theme but only **3.73:1**
in light, because darkening a light page pushes the ground *toward* dark text
instead of away from it. At `black 40%` light measures **6.18:1**, dark
**17.66:1** — both computed by compositing the scrim's alpha x element opacity
over the section's real rendered background, not read off a screenshot.

**Neon bars, on their own screens.** The two bar rows were on `colorwayFor()`
-> `--vinyl-N`, and two of those five pressings (`#0d1016`, `#131f42`) are
*darker than the walkman's own case*, so half the bars read as holes punched
in the device rather than as light. New fixed `--viz-neon-1..5` token family
(cyan / spring / amber / hot pink / violet), declared once and deliberately
**not** redeclared per theme — same reasoning as `--lcd-*`: an LED emits its
own colour and doesn't dim because the site switched theme. Assigned by a
left-to-right ramp, **not** a hash: `colorwayFor()` scatters colour at random,
which is right for record pressings and wrong for a spectrum analyser, where
reading as an ordered sweep is the whole idiom. The left window also gained
its own `--lcd-bg` panel, which makes it read as a second *screen* and gives
the neons a guaranteed dark ground in **both** themes — the light theme's own
lid (`#d7d9e0`) would have washed every one of them out. The EQ row was
recoloured with it (slightly wider than the literal ask, flagged): the two
rows sit 20px apart on one device and leaving one on the old palette would
read as an oversight.

**A third box-sizing overflow (B42's family).** `.walkman-visualizer` had
`width: 45.45%` plus its own `10px` padding and no `box-sizing: border-box` —
there is still no global reset in this file — so the row rendered 20px wider
than the bay it sits inside and the last bar hung past the bay's right edge
over the EQ row. Now `0.00px` overflow, measured at 390px. `.walkman-eq` had
the same latent bug with 3px padding; fixed alongside. Bars went 6 -> 8 and
shorter at rest (30% -> 26%, idle range 0.4-1.8 -> 0.35-2.4): at 6 they
measured ~30px wide against a ~41px resting height, near-square blocks rather
than a waveform.

**The two layout asks.** `.contact-container` padding-top `6rem -> 2rem`,
moving the whole block up 64px (heading now 145.2px below the section's top
edge, was 209.2). Message textarea `rows` 3 -> 4, height 100 -> **126.4px** —
at 3 it had gone slightly too far the other way from Task 12.1's trim, short
enough against the cassette shell's reel strip that the label looked taller
than the writing area it wrapped.

**Verification:** dev pair (5173/5050). Full-frame rAF trace before and after
at 1440px; compose + takeover + settled captured in both themes; 390px
confirmed no section overflow, no horizontal body overflow and 0.00px
visualizer overflow; reduced motion confirmed heading swap + visualizer
visible + LCD correct + reset button present; idle loop confirmed still
animating after **30s** and still moving at 30.5s; full reset cycle confirmed
(heading back to "Let's Connect", form back, walkman unmounted, message
field cleared) followed by a clean second send with no stray flight clone.
`npm run lint`: **7 errors, 2 warnings**, unchanged. `npm run build`: JS
526.32 -> **526.48 kB** (187.40 -> **187.50 kB** gz), CSS 50.72 ->
**51.09 kB** (10.60 -> **10.68 kB** gz).

**Found but not fixed — `FINDINGS.md` B47:** `loading-screen.jsx` throws an
uncaught `TypeError` on **every window resize** once the loader has finished.
Unrelated to `#connect`; surfaced because element-clipped screenshots trigger
a resize. Left for its own change rather than folded into a `#connect` commit
— it is the first thing every visitor sees.

### Stage 3 Task 12.5 — `#connect`: heading punctuation + description restored *(2026-08-23)*

A fifth decimal follow-up on Task 12, direct-request copy only — no bug
report this time, and the brief opened by confirming Task 12.4's animation
landed well before asking for this.

**Heading:** "Let's Connect" -> **"Let's Connect!"**.

**Description restored.** Task 12.2 (this same day, earlier) removed
`.contact-description` entirely on direct feedback ("its very
straightforward... i dont need any description box"). This is a
**different paragraph** doing a **different job**, not a reversal of that
call: the pre-12.2 paragraph doubled as an email fallback and carried a
real `mailto:` link (`.contact-description a`, deleted alongside it); this
one is a plain thank-you note with no link — the form is still the only
contact path. Copy, exact: *"Thank you for taking the time to view my
portfolio, I hope you had fun playing your favorite tunes! Feel free to
leave a message."*

Wired into the entry-pin's existing `SplitText` cascade as its own
word-split target between the heading and the form tweens — the same
three-step stagger shape (title -> description -> form) this project used
before Task 12.2, reused rather than re-invented, with its own
`descriptionSplit.revert()` in the effect's unmount cleanup (not the
heading's unconditional onComplete revert — nothing later needs to
scramble this paragraph's plain text the way `ScrambleTextPlugin` needs
the heading's). Rendered conditionally on `status !== 'sent'`, the exact
same condition already gating the form, so Task 12.3's own "exactly one
message on screen after a send" guarantee still holds without any new
logic — description and form disappear together, heading alone remains.

`.contact-title`'s `margin-bottom` moved back `--space-6` -> `--space-4`
(1rem): that larger value (Task 12.3) was sized for a heading with only
the form directly beneath it; with the description back between them,
`--space-6` read as too much air before the sentence introducing the form.
`--space-4` is the exact value/reasoning the original pre-12.2 heading
used. New `.contact-description` rule: `font-size: 1rem`, `line-height:
1.6`, `color: var(--secondary-text)`, `margin-bottom: var(--space-7)` (3rem)
— the same three values the pre-12.2 rule used (`text-align` intentionally
left unset, i.e. left-aligned, also matching that rule's only prior
precedent: this reads as a short paragraph of prose under a centered
heading, and centering a two-line sentence would leave ragged line starts).

**Verification:** dev pair (5173/5050). Both themes: heading text, description
text/color, and description-hides-with-form-on-send all confirmed via live
DOM read, not screenshot alone. 390px: no horizontal overflow, description
renders full-width without clipping. Entry-reveal cascade confirmed
completing with no console errors once scrolled cleanly past the entry
pin's actual `ScrollTrigger` start line (an early pass measured the
reveal as "stuck," traced to the test's own scroll loop stopping ~24px
short of that line — not a real regression; the identical loop had worked
at this section's shorter, pre-description content height). `npm run
lint`: **7 errors, 2 warnings**, unchanged.

**Investigated, not confirmed — no `FINDINGS.md` entry yet.** A synthetic-scroll
test at 390px landed the entry pin's hold well past its intended engage line
(`.contact-section` top measured **-32px** against an intended **0px**,
i.e. scrolled roughly 140px too far) — but the identical overshoot reproduces
**on the pre-Task-12.5 commit too** (checked via `git stash`), so this is not
something this task introduced. Plausible mechanism: a burst of synthetic
wheel events can hand Lenis more accumulated scroll velocity than a real
trackpad flick would produce in the same wall-clock window, and `lenis.stop()`
only halts *future* interpolation — it doesn't rewind whatever position the
interpolation had already reached. Whether this is a real risk for an actual
fast-scrolling visitor, or purely a Playwright wheel-emulation artifact, is
genuinely unresolved — flagged here rather than logged as a bug on unconfirmed
evidence, and rather than silently dropped. Worth a real device/trackpad check
before Stage 3's own "apply the design system to `#connect`" task, since that
task will already have the section open.

**Flagged, not touched:** `client/src/styles/main.scss`, `client/src/sections/my-taste.jsx`,
and this doc plus `FINDINGS.md`/`ROADMAP.md`/`stage4-my-taste-concept.md` currently carry
a separate, uncommitted `#my-taste` mobile layout pass (Stage 5, below) from outside this
task. This entry and Task 12.4's `main.scss` edit were both staged and committed as
isolated hunks against a clean `HEAD` base, leaving that other work exactly as it stood in
the working tree — not reviewed, not altered, not committed here.

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

### Stage 5 — `#my-taste` mobile layout: two horizontal scroll-snap rows *(2026-08-23)*

Mobile's own art direction, deliberately deferred since Task 3.7 (`stage4-my-taste-concept.md`
§16, `ROADMAP.md`'s own Stage 5 line) — the un-rotated single-column stack every mobile
override since Task 3.7 has fallen back to, replaced with two horizontal scroll-snap rows
(artists, tracks) inside a section that deliberately fills one screen. Checked against the
tree first, not against this file's own prose, per the brief's own instruction and this
project's working agreement — two brief assumptions didn't match: `setlist` (my-taste.jsx)
already carries `imageUrl` per track (`pickImageUrl(track.album?.images)`, already used for
the crate's own top-3 thumbnails), so the mobile track row uses it directly — no new API
call, and no text-only fallback chip was needed. And the crate's setlist rows never actually
truncated with ellipsis (no `text-overflow` rule existed under any `.my-taste-*` selector);
the real site-wide truncation idiom, reused here, is `.record-crate-title`/`-artist` (the
hero's own crate, `main.scss:1410-1425`).

**Sequencing, noted per the working agreement rather than silently done:** `ROADMAP.md`'s own
"not started yet" table lists Stage 5 as depending on Stage 4 Task 5 (`#my-taste` time-range
switching) and Stage 3's `#connect` design-system pass landing first. This task jumps
`#my-taste`'s own mobile pass ahead of both — the same kind of deliberate reorder `#my-taste`
itself already got once before (ahead of Stage 3's remainder, back in Stage 4's own opening).

**Kicker.** Condensed to one row: the avatar shrinks (`--space-6` → `--space-5`), and a new
`.my-taste-heading-tail-short` ("Spotify ↗") replaces the desktop "· listen on spotify" +
icon tail — both render into the DOM at every width, CSS shows exactly one per breakpoint,
same pattern every other mobile override in this section already uses. No longer relies on
Task 3.9's own `flex-wrap` safety net actually triggering (stage4-my-taste-concept.md §16's
own open item) — confirmed live, fits one line comfortably down to 320px.

**Artists.** Same 5 `TasteCard`s, no new DOM — `.my-taste-wall` switches from a single-column
grid stack to `display: flex; overflow-x: auto; scroll-snap-type: x mandatory` at this
breakpoint. Featured/secondary's desktop size difference (16:9 vs 3:2 photos, two font
sizes) converges to one shared treatment (1:1 photos, one font size) so all 5 read as one
swipeable tier, the brief's own explicit ask. Torn edge + tape + rotation/jitter — dropped
for mobile back in Task 3.7, before this section had any real mobile art direction — are
**re-enabled** for wall cards specifically. A new `.my-taste-scroll-dots` row (`aria-hidden`,
a scrollbar substitute, not content) sits below, one dot per card, active-state driven by an
`IntersectionObserver` per row (see Mechanism below).

**Tracks.** A new, separate mobile-only row (`.my-taste-track-scroll`/`.my-taste-track-card`)
— thumbnail + title + artist chips — not a CSS reshape of the existing numbered list: the
brief's own "small track cards" shape doesn't map onto `<li>` rows, and new class names
throughout keep this row from ever being matched by Task 4's own crate-scoped GSAP
selectors (`.my-taste-setlist-item`, `.my-taste-photo-slot--thumb`). `.my-taste-crate`
(the desktop numbered list) gets `display: none` at this breakpoint — replaced, not
stacked alongside. Same scroll-snap/dots/truncation pattern as the artist row.

**Fit target — measured before/after, not assumed:**

| Width × height | Before (single-column stack) | After |
|---|---|---|
| 320×568 | did not fit `100dvh` at all (never measured against it — pre-existing stack) | fits, 0px extra scroll after a direct `#my-taste` link/nav landing |
| 375×667 | — | fits, 0px extra scroll |
| 390×844 | fit ratio 2.80× one screen (Task 4.1's own number) | fits, 0px extra scroll |
| 430×932 | — | fits, 0px extra scroll |
| 600×960 | — | fits, 0px extra scroll |

`min-height: calc(100dvh - var(--scroll-offset))`, not the brief's own literal `100dvh` —
found live, not assumed: a direct nav/hash landing uses this project's own B3 fix
(`scroll-margin-top: var(--scroll-offset)`) to land the section's top `--scroll-offset`
below the viewport top on purpose. A literal `100dvh` section landed that way pushed its
own bottom (the track row's dots) the same distance below the fold — reproduced with a
real hamburger-menu nav click at every width before landing on the corrected formula.
`--navbar-height` alone (tried first) closed most of it but left a flat 24px gap at every
width — `--scroll-offset`'s own extra buffer past the bar. `.my-taste-layout` goes
`display: contents` at this breakpoint so its two children become direct flex items of
`.my-taste-section` alongside the kicker — a real 3-way `justify-content: space-between`
(kicker / top-artists / top-tracks, the brief's own wording) instead of a fixed-top
heading plus one internal 2-way split absorbing 100% of the leftover space into a single
gap. Vertical density (card/photo sizing, section padding, zone-title margins) was loosened
back up from a mockup-scale starting point and then re-tightened specifically at 320/375px
once measured against the real target — not shrunk blindly to "fit at all costs."

**Mechanism note — a real bug found and fixed during the build, not shipped and found
later:** the flex min-content trap this project has hit before (`FINDINGS.md` B25/B31),
one level up from where it bit last time. `flex: 0 0 <width>` alone doesn't stop a card
from growing past its own basis when it contains `white-space: nowrap` text — without an
explicit `min-width: 0` on the CARD itself (not just the row container), "I Ran (So Far
Away) - Single Edit" (the same long title `FINDINGS.md` B31 already used as its own
reference case) forced that one track card 71px taller than its siblings, and every other
card in the row stretched to match via `align-items: stretch`. Same trap, same fix, applied
to the wall's own cards too (a long artist name like "Red Hot Chili Peppers" is exactly the
same shape of bug). Full writeup: `FINDINGS.md` B48.

**Dots — active-state tracking, not just a static count.** One `IntersectionObserver` per
row (`ratios` map + a "most-visible-wins" recompute each callback, not a naive per-entry
toggle) — found live that at this row's own card width, close to two cards clear a single
0.6 threshold simultaneously at rest, lighting up two dots for one scroll position; fixed
by ranking all currently-tracked ratios and marking exactly one active. Wired in a plain
`useEffect` gated on its own `matchMedia`, independent of the `fullMotion` GSAP cascade —
a scroll-position readout isn't motion in the reduced-motion sense, so it isn't gated on
that preference.

**Touch/trackpad scroll — verified, not assumed (the brief's own explicit ask).** Read
`node_modules/lenis/dist/lenis.mjs` directly rather than guessing: with `syncTouch: false`
(this project's unmodified default, `smooth-scroll.jsx`), Lenis never calls
`preventDefault()` on a touch event at all — native touch-scroll proceeds untouched. For
wheel input, a pure horizontal gesture (`deltaY === 0`) hits Lenis's own `isUnknownGesture`
early-return before any `preventDefault()` call, since this project never sets
`gestureOrientation`. Confirmed live two ways: a real deltaX-only wheel event at both rows
advanced `scrollLeft` correctly with zero effect on page `scrollY`; a genuine touch drag,
dispatched via `Input.dispatchTouchEvent` at the CDP level (a JS-dispatched synthetic
`TouchEvent` does **not** trigger a browser's real touch-scroll gesture recognizer —
confirmed live, then routed around) advanced both rows' `scrollLeft` and correctly moved
the active dot, again with zero vertical scroll movement.

**Motion skip-to-settled-state.** Unchanged code path (`gsap.matchMedia()`'s own
`fullMotion` query, `(min-width: 601px) and (prefers-reduced-motion: no-preference)`) —
this task never touched it. Confirmed rather than assumed: every wall/track card measures
`opacity: 1` immediately on a fresh mobile-width load, before any scroll at all, and the new
mobile-only elements (new class names throughout) are never selected by the cascade's own
`.my-taste-wall > .my-taste-card`/`.my-taste-setlist-item` selectors by construction.

**B30 regression check.** B30 (pin never engaging on a fresh reload) is a `fullMotion`/desktop
phenomenon — the pin is never constructed at all below 601px, so it doesn't apply here by
construction. All of this task's CSS is scoped inside `@media (max-width: 600px)` except two
new base rules (both `display: none` outside it) — desktop's own layout, screenshotted
before/after, is pixel-identical.

Verified: `npm run lint` (7 errors/2 warnings, unchanged) and `npm run build` clean — CSS
+2.95 kB / +0.38 kB gz, JS +1.93 kB / +0.50 kB gz (measured against a clean build of this
same commit *before* this task's own diff, via `git stash`, not against a stale baseline).
Zero horizontal page overflow at 320/375/390/430/600px. Sequential `Tab` walk confirmed
kicker → 5 artist cards (in feature-then-secondary order) → 5 track cards, every stop with a
visible `outline: solid 2px`. Screenshots: `stage5-my-taste-mobile-{320,375,390}-{dark,light}.png`,
plus the standard `my-taste-mobile.png`/`my-taste-desktop.png` re-capture (both unaffected
outside the new mobile shape).

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

### Stage 6 Phase 9 — pitch fader, self-centering *(2026-08-24)*

`.turntable-fader` was decorative markup only (`aria-hidden`, no interaction) since
Stage 1. Now a real, spring-loaded control: drag it and pitch bends live, ±8%; let go
and it always animates back to centre — it is never left off-centre outside of active
touch, which is what makes this the SELF-CENTERING version of the brief (an earlier
draft that could sit off-centre indefinitely, needing state to persist/reset it across
pause/resume/track-swap, was explicitly not built).

**How it works.** GSAP `Draggable` (`type:"y"`, bounded to `.turntable-fader-track`) on
the visual handle owns pointer/touch dragging — first real use of `Draggable`
(registered since Stage 0, unused since; `InertiaPlugin` stays unused — the release is
a deliberate spring tween back to a fixed point, not momentum, so there's nothing for
it to do here). A native `<input type="range" min="-8" max="8" step="0.1">`, layered
over the track with `pointer-events:none` and `writing-mode:vertical-lr; direction:rtl`
(the standard vertical-range trick), supplies keyboard/SR semantics without competing
with `Draggable` for the same pointerdown — confirmed via the same
ancestor/descendant `aria-hidden` fix already applied to the transport button (Stage 1
Task 4): `aria-hidden` moved off the `.turntable-fader` wrapper onto the decorative
ticks/handle individually, since it was blocking the input from ever reaching the
accessibility tree.

Reuses the existing `beginSpinLink()`/`followSpin()` machinery (built for the
transport's power ramps) rather than a second one: press links spin, each drag tick
calls `setSpin(1 + pitch/100, …)` (a near-instant per-tick ramp), and release is ONE
`setSpin(1, …)` call whose own tween IS the spring — `followSpin`'s `onUpdate` keeps
audio locked to the platter for the whole return, not just snapped at the end. Verified
by instrumentation, not inspection: sampling the live `AudioBufferSourceNode`'s
`playbackRate` alongside the platter's own `timeScale` (inferred from rAF-paced
rotation-angle deltas, since neither is exposed on `window`) at multiple points during
both the drag and the return — they track each other throughout, not just at rest
(held at top: rate `1.08`, inferred `timeScale` `1.07`–`1.09`; held at bottom: rate
`0.92`, inferred `timeScale` `0.92`; mid-return: both converge 1.08→1.0 smoothly across
the same ~400ms window).

**State-gated, confirmed for all five deck states.** `PLAYING` (not reduced): full
spin-link behaviour above. `PLAYING`, reduced motion: `setSpin` already no-ops in this
mode, so the drag bypasses it entirely and calls `audio.setRate()` directly; release
tweens a plain proxy value back to 0 over the same timing, calling `setRate` from its
`onUpdate` — confirmed live: platter rotation genuinely static (0° drift over 300ms)
while the rate glides smoothly 1.08→1.0 across ~392ms on release, matching the brief's
explicit ask ("audio rate changes smoothly… platter visually static throughout").
`PAUSED`/`STOPPED_LOADED`/`EMPTY`: visual-only, confirmed by holding a drag through this
state and reading the live rate on every sample — it stayed bit-for-bit flat
(`0.22916264832019806`, the frozen tail-end value a prior brake had already left
behind) across the whole gesture and after release, while `input.value` moved normally.

**The mid-drag/transport-conflict case the brief specifically asked to check, not
assume:** every per-tick handler reads `deckStateRef.current` live rather than a value
captured at gesture-start. Confirmed both directions — pausing transport while
mid-drag: the very next tick sees `PAUSED` and silently drops to visual-only (dragged
the rest of the way to the opposite end of the track, `input.value` tracked correctly
the whole time, no audio touched); resuming transport mid-drag (a drag that started
while `PAUSED`): the next tick sees `PLAYING` and starts driving audio again, picking
up wherever the handle already was, with a defensive `if (!audio.isSpinLinked())
audio.beginSpinLink()` covering the one path (drag-started-while-paused) that
`handlePitchPress` itself doesn't link.

**Keyboard**, the brief's own explicitly-raised open question (self-center on
keyboard too, or pointer-only?) — resolved as **uniform**: arrow keys move the input
and drive audio live exactly like a drag tick; "release" has no native key event, so
it's inferred two ways — a `PITCH_KEY_IDLE_MS` (500ms) debounce after the last change,
and immediately on blur (so tabbing away mid-adjustment doesn't leave it hanging).
Verified: 10× `ArrowUp` → `1.0`/rate `1.0017`; 700ms idle afterward → still mid-glide
(`0.1`, converging — the 500ms debounce plus the ~400ms spring compose to ~900ms total,
which the test undershot, not a bug); a second run confirms blur is immediate — right
after blur, already fully centred, no debounce wait.

**Two real bugs found and fixed while building this, both non-obvious misreadings of
existing GSAP APIs — full root-cause writeups in `FINDINGS.md` B49/B50:**
- **B49** — `setSpin`'s `seconds` argument is "seconds per unit of `timeScale` span,"
  not a flat duration (correct for `spinUp`/`spinDown`, whose span covers the full
  `[0,1]`). Passed straight through for the fader's own ≤0.08 span, the intended 400ms
  return actually applied as ~32ms — caught only by sampling the live rate over time,
  not by reading the code. Fixed by dividing `PITCH_RETURN_SECONDS` by the actual span
  at the call site so `setSpin`'s own multiplication cancels back out to exactly 400ms.
- **B50** — `Draggable.update(true, true)`, called in the release tween's
  `onComplete` to resync `Draggable`'s bookkeeping to the tween's new position, instead
  re-applied `Draggable`'s own STALE pre-release coordinates — its `sticky` resync only
  runs while a press is still active, which it never is by `onComplete`. The handle
  visibly glided back to centre, then snapped back to the dragged-from position the
  instant the tween completed. Fixed with `update(false, false)`, which takes the
  `syncXY(true)` branch instead and actually reads the current position.

**Direction assumption confirmed correct, no flip needed:** top of track measured as
`+8`/rate `1.08`, bottom as `-8`/rate `0.92`, matching the brief's stated default.

**Verification:** lint holds at the known baseline (7 errors / 2 warnings, none new);
build clean. Bundle: JS 526.48 kB → **531.49 kB** (+5.01 kB) / 187.50 kB → **188.80 kB**
gz (+1.30 kB gz); CSS 51.09 kB → **54.68 kB** (+3.59 kB) / 10.68 kB → **11.18 kB** gz
(+0.50 kB gz) — `Draggable`'s own code was already in the bundle (registered since
Stage 0), so this delta is the fader's own logic/markup/styles, not the plugin.
Screenshots: `stage6-phase9-fader-{rest,mid-drag,mid-return}.png`.

**Brief accuracy:** every file/symbol the brief named (`turntable.jsx`'s
`.turntable-fader` markup/`setSpin`/`spinUp`/`spinDown`, `turntable-audio.js`'s
`setRate`/`followSpin`/`settleSpin`/`beginSpinLink`/`endSpinLink`/`RATE_FLOOR`,
`main.scss`'s fader rules) matched the actual tree exactly — nothing stale to report.
`turntable-audio.js`'s own `setRate` doc comment already said "Also used by the spin
linkage above, and by Phase 9 (pitch fader)," written well before this task started.

**Decisions made rather than left to fall out silently, per the brief's own asks:**
ease is `power2.out` (the brief's stated default, not `elastic.out` — no overshoot,
consistent with this site's restraint-over-decoration register elsewhere); spin-link is
never explicitly ended after a release (`endSpinLink()` is NOT called) — it stays
linked afterward on purpose, matching `spinUp()`/`spinDown()`'s own convention, where
only a needle-drop-shaped event (track swap, preview end, replay) unlinks; keyboard
self-centering is uniform with pointer, not pointer-only (reasoning above).

> ### ⚠ Stages 7a–7d are SUPERSEDED *(2026-08-25)*
>
> The four entries that follow describe a **WebGL2 fluid background that no
> longer exists**. `client/src/lib/fluid-sim.js` and
> `client/src/components/fluid-background.jsx` were deleted, and the
> `simplex-noise` dependency with them, when the hero background was rebuilt as
> a Canvas2D skyline spectrum. See **"Stage 7 (rebuild)"** below for what is
> actually there.
>
> They are kept because what they measured is still true and still cost real
> time to learn — B54's colour/luminance trap, B55's runaway reference, the
> 551 ms cost of an effect at the needle-contact call site, the dev-diagnostics
> tree-shaking trap. Read them as findings, not as documentation.

### Stage 7a — fluid background behind the hero, structural *(2026-08-24)* — **SUPERSEDED**

A hand-rolled WebGL2 fluid simulation, full-bleed behind the entire hero —
text, crate and turntable. **Replaces the `.hero-vu-slot` waveform concept
outright**: that element reserved a 40–50px strip inside `.hero-content` and
is now deleted (markup, its rule, and its mobile `display:none` override),
since nothing will ever render inside it. Structural task only — no
`AnalyserNode`, no `colorwayFor()`, no deck-state gating; that is 7b.

**Two things in the brief were stale against the tree, flagged rather than
built against:**
- *"navbar.jsx's existing IntersectionObserver (used for the nav-link fade-in
  past the hero) — reuse this mechanism."* There is no IntersectionObserver in
  `navbar.jsx`. It drives its `scrolled` state from a plain `scroll` listener,
  and the hide-during-hero gating it once had was removed with the orb-nav
  hero — its own comment says so ("the hide-during-hero gating belonged to the
  superseded orb-nav hero"). The only IntersectionObserver in the codebase is
  `my-taste.jsx`'s mobile scroll-position dots, and that is the shape this
  follows instead (construct → observe → `disconnect()` in cleanup).
- *"turntable-audio.js's visibilitychange handling."* `turntable-audio.js`
  contains no `visibilitychange` handler; it lives in `turntable.jsx`. Mirrored
  from there, with one deliberate divergence: that handler pauses on hide and
  does **not** auto-resume (silently restarting audio in a background tab is
  hostile). A background visual has the opposite expectation, so this one
  resumes on return.

**Architecture.** `lib/fluid-sim.js` is framework-agnostic — no React — and
owns the GL objects and a `step()`; `components/fluid-background.jsx` owns the
RAF loop, the gating and the theme. That split is what let the gating be
verified independently of the shader.

**Resolution split (the numbers 7b should start from, not re-derive):** sim
grid **128** on the short edge, dye grid **512**. Velocity/pressure/divergence/
curl live on the 128 grid because the 20 Jacobi pressure iterations per frame
are what actually costs; dye is advected once per frame and only needs to be
sharp, so it gets 4× the linear resolution for 16× the texels at 1/20th the
passes. Measured allocations at several viewports: 1440×900 → sim 171×128, dye
683×512; 390×844 → sim 128×330, dye 512×1318; 320×640 → sim 128×320, dye
512×1280. Backing store tracks the CSS box × DPR (capped at 2) at all five
tested sizes.

**Decisions the brief left open, made explicitly:**
- **Idle behaviour: a seed burst of 4 splats at startup, then one top-up every
  1.6–2.8s** — not nothing, and not top-ups alone. Sparse top-ups alone were
  measured and rejected: peak alpha swung 16–97/255 across samples of the same
  config, so the hero looked lit or empty purely depending on when you looked.
  The seed means it is never blank on first paint. **7b should remove this
  loop, not stack audio splats on top of it.**
- **Reduced motion: exactly ONE static frame, no RAF loop** — verified, frame
  count is 1 and stays 1. Not a blank canvas: that would make the hero visibly
  poorer for people who set the preference, and it matches how the rest of the
  site treats it (the record still drops and plays, it just doesn't animate
  getting there).
- **Colour: `--accent`, theme-aware, re-read on the `themeChange` event.** Not
  a `--vinyl-N` — those are deliberately near-black record colours (`#0d1016`,
  `#131f42`) that would be invisible as dye in dark theme and a smudge in
  light. `--accent` is the one token already required to read against both
  backgrounds.

**Dye intensity is derived per theme, not fixed** — the one genuinely
non-obvious result here. A fixed multiplier tuned in dark theme (0.45) turned
the light theme into a grey haze over the whole hero, washing out the deck.
Same alpha, same token, opposite outcome: `--accent` is `#6f9bff` on near-black
in dark (luminance 0.0045 → 0.3404, Δ 0.336) but `#1f3fae` on near-white in
light (0.9308 → 0.069, Δ 0.862), so per unit of alpha the light theme moves the
background **2.5× further**. Intensity is now solved from a target luminance
impact (0.155) divided by that measured contrast, which reproduces the tuned
dark value (0.461) and brings light to 0.18 automatically — and stays correct
if either token is ever retuned, as the light-theme deck colour already was.

**Verification** (all measured, `data-fluid-state` on the canvas is the shipped
queryable state — `data-deck-state`'s precedent — plus a dev-only frame counter
that Vite strips from the production bundle, confirmed absent from `dist`):
- *Renders:* `readPixels` on the live canvas — peak alpha 75, coverage 14.7%,
  and the field's pixel signature changes between samples 0.9s apart. Screenshot
  means were tried first and rejected as a check: they reported a drift of
  0.5/255 for an effect `readPixels` shows peaking near 100, because averaging a
  deliberately-subtle effect over a large region rounds it into the background.
- *Tab hide/show:* frames advanced 26 → froze at exactly 0 while hidden → 26
  again after show. State `running`/`paused`/`running`.
- *Hero out of view:* frames froze at exactly 0 while three sections away, 65
  after returning. Reaching that required navigating via a real nav link — a raw
  `window.scrollTo` cannot get past About's scroll-hold, which pins at
  `scrollY` 910 with 170px of hero still on screen (the observer correctly
  reported `isIntersecting` there, and the first version of this test misread
  that as a gating failure). That is this project's own **D14**, and this is its
  documented workaround.
- *Pointer-events:* `elementFromPoint` at the centre of the crate input, the
  transport button and the fader handle returns the intended control in all
  three cases, never the canvas — and end to end, a crate search returned 5
  rows, a track loaded to PLAYING, and the pitch fader dragged to +8 through
  the canvas.
- *Frame timing:* median 16.7ms (60fps), mean 18.9ms, p95 33.3ms under headless
  **SwiftShader** — a software rasteriser, so this is a pessimistic floor rather
  than real-GPU performance, and the p95 is the software path missing frames.
  Worth a re-measure on real hardware before 7b adds per-frame analyser work.

**Three real bugs found and fixed while building this** — full writeups in
`FINDINGS.md` B51/B52/B53: a `loseContext()` on dispose that permanently
bricked the canvas element on any remount (StrictMode surfaced it immediately,
but it was never only a dev problem); a splat radius squared twice, making
every splat ~0.5% of the screen so the canvas rendered correctly and was
invisible; and dissipation carried over from a pointer-driven reference that
decayed the dye to alpha 6/255 between this task's much sparser idle splats.

**Pre-existing bug re-confirmed, not caused here:** B47 still throws
`TypeError: Cannot read properties of null (reading 'getBoundingClientRect')`
at `loading-screen.jsx:53` from `onResize` at `:80` — once per resize, five
resizes, five errors, byte-identical to B47's recorded stack. Still unfixed,
still its own one-line change.

### Stage 7b — fluid: presence-gated burst + audio routing *(2026-08-24)* — **SUPERSEDED**

The hero fluid is now **silent and invisible unless something is playing.** The
moment playback starts it bursts in — in the same tick the needle is drawn
touching the record — rides the track's own audio while it plays, and drains
away when it stops. 7a's idle-splat placeholder is **deleted**, as 7a's own
entry said it should be rather than left running underneath.

**Presence model.** The RAF loop now has FOUR independent gates, not two:
7a's tab-hidden and hero-out-of-view, plus `deckState === PLAYING` and a
bounded settle window. Any one alone holds the loop down. Verified by frame
count rather than by state flag: **0 frames** before the first play, 0 during
`LOADING` while the record is still dropping, running only in `PLAYING`, and
fully stopped after the settle — frame counter flat across a further 1.2s of
parked time.

**The burst is synchronous, and this is the whole point of the task.** It
hangs off `applyDeckState` in turntable.jsx, which the needle-contact GSAP
callback already calls immediately after `audio.playCached()` — the function
that exists solely because Stage 1 measured the async path starting audio
551ms late. An effect watching deckState would have reintroduced exactly that
gap on the visual side. Measured the way Stage 1 measured its own sync bug
(patching `AudioBufferSourceNode.prototype.start` to timestamp against the
burst): **0.2ms apart, same animation frame (both at frame 150).**

To carry that synchronously, `deck-state.js` gained a live store and a
listener Set — the same shape as `turntable-audio.js`'s existing `onEnded()`,
not a new event-bus abstraction. `emitDeckState` is called only from
`applyDeckState`, which was already the single writer.

**Reduced motion — revised, and this is a real accessibility call rather than
a detail.** 7a rendered one static frame unconditionally at mount, which was
right when the fluid was ambient. Now that PRESENCE is the signal, an
always-on frame would actively lie — it would say "something is playing" when
nothing is. So: **one static frame appears the moment PLAYING begins and the
canvas is cleared the moment it ends.** Reduced-motion visitors get the same
information the animation carries — the hero responds to playback — with no
animated injection, no per-frame audio reactivity, and no RAF loop in either
state. Verified: 0 frames idle, exactly 1 while playing (still 1 after 1.5s,
so no loop), cleared on stop.

**Decisions the brief left open, made explicitly:**
- **Palette cycling: free-running wall clock**, `floor(Date.now() / 21000) %
  5`. The brief offered this or a reset-to-first on every play. Chosen because
  implementing it as a derivation rather than a timer means there is no
  interval to start, stop, leak or drift and no state to reset — consecutive
  plays land on different colours for free, and a long track drifts through
  the palette as it plays, with new splats arriving in the next colour while
  existing dye is still the previous one and the solver blending the two.
- **Splat origin: anchored on the turntable**, not random across the canvas.
  The hero's entire premise is that the deck is the source of the sound (goal
  4); dye welling out of the platter says that, scattered dye says "animated
  wallpaper". It also keeps the field off the headline on the left, which 7a's
  contrast work showed is the part worth protecting — measured, alpha behind
  the headline stays at 0–6/255 for most of a track, peaking at 59 only when a
  filament drifts across. Measured from the live element rect, so the stacked
  mobile layout anchors correctly instead of pointing at empty space.
- **Rapid pause → resume does NOT force-clear.** Checked live rather than
  reasoned about: residual dye is still drifting on a velocity field the new
  burst adds to, and the two compose into one continuous swell (peak 0.157
  mid-settle → 0.247 after the burst). A clear would instead blink the hero to
  black at the exact moment the visitor asked for sound back. Screenshotted:
  `stage7b-rapid-resume-{1-mid-settle,2-after-burst}.png`.
- **Burst fires on every PLAYING transition**, needle-drop and resume-from-pause
  alike — both are "silence to sound" and nothing about either looks different
  from the visitor's side, so they are not distinguished.
- **Mint is a fluid colour only** — not routed into `colorwayFor()` or the
  vinyl pressings, per the brief. Those are record colours; mint would be a
  bizarre record.

**Audio routing.** `getByteFrequencyData` each frame, PLAYING only. Bass
(bins 1–8, ~190–1500Hz) drives splat force and radius; treble (bins 32–96,
~6–18kHz) shortens the gap between splats and widens their scatter from the
deck. Both are multiplied by the pitch fader's live rate, read through a new
`audio.getRate()` rather than by reaching into turntable.jsx's spin tween —
Phase 9 already verified that value and the platter's timeScale track each
other through a whole drag and its spring-back, so it is the authoritative
number for what the visitor is hearing. Correlation confirmed against live
analyser data during real playback, with bass genuinely varying (0.48–0.87):
`corr(bass, force) = 1.00`, `corr(bass, radius) = 1.00`, `corr(treble,
interval) = −1.00`. Fader coupling measured while held: **+8% → mean force
552, 226ms gap; −8% → mean force 472, 276ms gap.**

**Settle.** Injection stops immediately on leaving PLAYING; the existing dye
then decays through the solver's OWN dissipation rather than a second fade
layered on top. "Genuinely settled" is measured, not assumed — `peakDyeLevel()`
renders the dye through a 64×64 readback target (a full-resolution readPixels
every frame would stall the pipeline) and the loop stops when it drops below
threshold, with a 4s ceiling as a safety bound. The threshold was retuned from
0.02 to 0.035 after measuring that at 0.02 the decay was still at 0.024 when
the ceiling fired — the safety net was doing the work on every single pause.
Now it exits on the threshold at ~3.3s, and reading the real canvas back at
that instant shows **max alpha 0, zero pixels above 10/255**: the canvas is
already completely blank before the loop stops.

**Amplitude, retuned twice against measurements rather than by eye.** 7a's
dissipation of 0.10 was correct for its sparse idle drops and is wrong here
for the reason `FINDINGS.md` **B53** recorded — 7b puts the field back into
the continuous-injection regime the published constants were tuned for. At
0.10 peak dye pinned at a saturated 1.0 for entire tracks; at 1.2 the field
drained faster than the beat could refill it (true peak alpha fell from the
burst's 107/255 to 10–20 with ~0% coverage within 5s, while the track still
played). Landed at **0.85**, with the burst and the sustain given separate dye
multipliers because they needed opposite corrections. Final measured behaviour,
palette pinned so runs are comparable: burst ~111/255, sustained 41–107 at
6–27% coverage.

**Two measurement traps worth recording**, both of which produced confidently
wrong readings first:
- The 64×64 probe LINEAR-downsamples a 683×512 field, so it **averages** and
  under-reports isolated peaks. It is sound for "has this decayed" and useless
  for "how bright is this" — amplitude tuning had to move to full-resolution
  readPixels.
- Palette colour is wall-clock derived, so **consecutive tuning runs measured
  different colours**, whose intensities legitimately differ by up to 4× by
  design. An amplitude change appeared to make things dimmer when it had in
  fact made them brighter. Fixed with a dev-only palette pin (`setPalette`),
  after a first attempt at freezing `Date.now()` globally hung the page by
  also freezing the intro loading screen's own animation.

**All ten colour × theme combinations verified**, not spot-checked — and four
of them failed, which is `FINDINGS.md` **B54**: wine, slate and terracotta
against dark theme and mint against light all pinned the intensity solve at
its 0.9 clamp, because a colour sitting on the background cannot be rescued by
alpha. Fixed with a derived per-theme contrast adaptation that is a no-op for
the six that were already fine. `FINDINGS.md` **B55** covers the beat detector
whose baseline tracked the signal too closely to ever fire.

**Real-device frame timing — resolves the caveat 7a flagged for this task.**
Run headed on this machine's actual GPU (`ANGLE Metal Renderer: Apple M2`,
confirmed via `WEBGL_debug_renderer_info`, not SwiftShader): with the fluid
running during playback, **mean 16.68ms, median 16.7ms, p95 18.7ms, worst
18.8ms — 60fps, zero frames over 20ms and zero over 33ms.** 7a's headless
SwiftShader figure (p95 33.3ms) was the software rasteriser, as suspected.

**Brief accuracy:** everything the brief named matched the tree, with one
exception worth noting — it pointed at `turntable-audio.js` for "deck-state
reads", and that module has none; deck state lives entirely in turntable.jsx
and `deck-state.js`. The pitch fader's live timeScale was also taken from
`audio.getRate()` (added here) rather than `setSpin`'s tween, for the reason
given above.

**Pre-existing bug re-confirmed, not caused here:** B47 still throws at
`loading-screen.jsx:53` from `onResize` at `:80`, once per resize. Unchanged
and still its own one-line fix.

---

### Stage 7c — fluid: vibrancy, energy, roaming, one colour per track *(2026-08-24)* — **SUPERSEDED**

Not a brief this time — direct feedback on 7b as it actually looked live:

> *"when i play the records and some songs are punchy there are very subtle
> waves of color coming out behind the deck. This is meh, the colors has to be
> vibrant and catch the person who is playing a song. Also make sure to match
> the energy of the song… the liquid waves should take the entire hero
> background to roam around and follow the flow of the song too! We switch
> color per different track too!… in the dark background some colors are barely
> visable and in the light background too. Stay away from darker colors, keep
> emphazis on fading neon, bright mint, glowing effects in the waves so it
> looks etheral."*

Every one of those is a fair reading of what 7b shipped. 7b was verified on
the things it set out to do — synchrony, gating, correlation with the analyser
— and all of those numbers were real. None of them were about whether it
looked like anything. It did not.

**On the offer to use a library.** Declined, and worth saying why rather than
leaving it implied: what was missing was a bloom pass and a colour model, not
a solver. Bringing in three.js or ogl would have meant rewriting the working
7a solver against someone else's abstractions to obtain about eighty lines of
shader this file could just contain. The bundle cost is the smaller argument;
the larger one is that 7a's whole rationale — own primitives, the same call as
raw SVG for the strobe ring — would have been reversed for no capability.

---

#### 1. Bloom — why the field read as fog

A fluid solver produces soft-edged density. Composited straight onto the page,
soft-edged density is *fog*: it has no bright core, so nothing about it reads
as light. Every version through 7b did exactly that.

`fluid-sim.js` now runs a standard threshold → downsample → additive-upsample
bloom chain between advection and display: prefilter at a 0.32 soft-knee
threshold into a 256-short-edge RGBA16F target, six halvings down, additive
blur back up. RGBA16F throughout and not RGBA8 for a specific reason — the
prefilter's entire job is to isolate values *above* 1.0, which an 8-bit target
cannot represent and would clamp away.

**A hypothesis that measured wrong, and got deleted rather than kept.** The
display pass had divided hue by the *clamped* peak since 7a, so an over-full
channel clipped toward white — the standard "hot core inside a coloured halo"
every reference fluid demo uses. I extended that into a per-theme `uBlowout`
uniform on the theory that dark theme wanted the hot core and light theme
never could. Rendered side by side at identical dye levels:

| Display path | peak | coverage ≥25% | looks like |
|---|---|---|---|
| divide by clamped peak (7a/7b behaviour, `uBlowout: 1`) | 0.37 | 2.6% | grey haze |
| divide by true peak (`uBlowout: 0`) | 0.70 | 20% | light |

Dividing by a clamp desaturates the core *and* leaves the halo's alpha low —
the bright part goes white while the coloured part stays transparent. Both
themes wanted the same answer, so the uniform is gone rather than shipped as a
knob pinned to one value in both callers.

`stage7c-display-clamped-haze.png` and `stage7c-display-normalised.png` show
the difference. Note these two are an illustration, not the controlled A/B —
bloom intensity differs between them as well; the controlled comparison is the
table above, where only the denominator changed.

Normalising by the true peak has a second consequence worth stating: the
rendered hue is now *exactly* the solved palette colour at every texel, never
a lighter version of it. Dye density shows up purely as alpha.

#### 2. The palette — seven neon hues, solved into a band per theme

7b's five (wine, slate, terracotta, amber, mint) are gone. Three of the five
were dark, which is the worst possible property here: dark dye on a near-black
page has nowhere to go, and B54's contrast pass had to lighten wine, slate and
terracotta so far to rescue them that they arrived as pastels anyway.

Seven now, spread around the wheel so consecutive tracks are obviously rather
than subtly different: **mint `#7CF9DE`, aqua `#48D6FF`, violet `#A98CFF`,
magenta `#FF6ED4`, coral `#FF8A6B`, gold `#FFC94D`, lime `#B4FF6B`.** Still
fluid-only — deliberately not routed through `colorwayFor()` or the vinyl
pressings, which are record colours.

`adaptForContrast()` (7b) is replaced by `adaptNeon()`. The old one mixed
toward white on a dark page and toward black on a light one, which is correct
contrast arithmetic and wrong colour: mixing toward white desaturates, and
mixing toward black produces exactly the dark dye this stage was asked to
eliminate. The new one pins saturation at a 0.92 floor **first** — so the
solve cannot satisfy a luminance bound by draining the colour, which every hue
will do if allowed — then binary-searches HSL *lightness* only.

**The band, not a target — the first attempt was wrong in an instructive way.**
Solving each colour to a single luminance equalises by dragging the luminous
hues *down* as hard as it lifts the dim ones up. At a 0.45 target, `#7CF9DE`
came out `#08CAA0`: the authored bright mint destroyed by the arithmetic meant
to protect it. A band only acts on colours outside it, so most of the palette
passes through untouched:

Solved against the live `--bg-color` in the running page, not against a
literal — measured values, with the per-colour alpha the intensity solve
derives for each:

| | dark, band [0.42, 1.0] | intensity | light, band [0.20, 0.48] | intensity |
|---|---|---|---|---|
| mint | `#7bfade` *(untouched)* | 0.493 | `#09d0a5` | 0.843 |
| aqua | `#48d6ff` *(untouched)* | 0.676 | `#04c7ff` | 0.843 |
| violet | `#b79fff` *(lifted)* | 0.915 | `#a98cff` *(untouched)* | 0.648 |
| magenta | `#ff81da` *(lifted)* | 0.915 | `#ff6ed4` *(untouched)* | 0.680 |
| coral | `#ff8f71` *(lifted)* | 0.915 | `#ff8a6b` *(untouched)* | 0.723 |
| gold | `#ffc94d` *(untouched)* | 0.602 | `#f4aa00` | 0.843 |
| lime | `#b4ff6b` *(untouched)* | 0.464 | `#67d000` | 0.843 |

Four of seven pass through untouched in dark theme and three in light — the
band doing only the work it has to.

The bands are asymmetric because the backgrounds are: from near-black there is
a whole scale above, so dark theme needs a floor and no ceiling; from
near-white the only direction is down. Where the light ceiling sits is a real
trade — lower is more legible and less neon — and 0.48 is where violet,
magenta and coral still pass through untouched.

`dyeIntensityFor()` survives and now does the job it was always for: the
remaining luminance spread is equalised in **alpha**, which costs no colour.
In dark theme its output ranges 0.46 (lime) to 0.92 (violet/magenta/coral) —
a 2× spread that a single multiplier would have got wrong for five of seven.

All **fourteen** colour × theme combinations were rendered and measured, not
spot-checked — `stage7c-palette-{theme}-{name}.png`.

**The "hue is exactly the palette colour" claim, checked rather than asserted.**
The dark-coral capture looked *pink* rather than salmon, which would have meant
the display pass was shifting hue. Sampling the brightest 1% of a
pure-background region of the live canvas:

| | solved | rendered |
|---|---|---|
| coral | `#ff8f71` | `#fe8e71` |
| magenta | `#ff81da` | `#fe80d9` |
| mint | `#7bfade` | `#7efee2` |

Within a bit or two — the claim holds. The pink impression was the *low-alpha*
regions: coral at ~30% over a blue-black page composites to mauve, which is
correct alpha blending rather than a hue error. (A first attempt at this
measurement sampled a region that included the opaque turntable and reported
`#e2a098`, which is the deck, not the fluid.)

#### 3. One colour per track

7b derived the palette index from a free-running wall clock
(`floor(now / 21s) % n`). That was a deliberate choice at the time and it is
simply the wrong one for what the palette now says: it made colour a property
of *when* you pressed play. A long track drank through the whole palette while
the same song played, and two different records started in the same colour
whenever they were started inside the same 21 seconds.

The index now advances on the first play of a track whose id differs from the
last one's, read from `audio.getState().trackId` inside the same synchronous
`onDeckState` handler the burst fires from. Advancing sequentially rather than
hashing the id is deliberate: it *guarantees* consecutive tracks differ, which
a hash cannot promise. The initial index is seeded from the clock once, so a
first visit is not always mint.

Precisely — and this is stated because the first version of this note got it
wrong — **the colour is a property of the change, not of the track.** Only the
previous id is remembered, so pausing and resuming the same record keeps its
colour, but returning to a record after playing others gives it a new one.
Verified: `violet -> magenta -> coral -> gold`, then `gold` again on going back
to the first record. Keying a `Map` on track id would make colour stick to the
record permanently and was rejected deliberately — once more than seven records
have been played the stored indices wrap, and two consecutive plays could then
land on the same colour, which is the one guarantee this exists to provide.

#### 4. Energy — measured on real tracks, not guessed

7b drove everything from the bass band, which is a statement about arrangement
rather than about energy: a sparse track with a big kick read as more
energetic than a dense one without one. 7c reads broadband RMS off
`getByteTimeDomainData` and splits it into two envelopes:

- **energy** — the slow envelope (~3.3s), normalised. Sets the *character*:
  cadence, wave size, current strength, how fast the emitters travel.
- **punch** — fast (~50ms) over slow. A ratio, so it is independent of the
  master's level and a quiet track's transients still count as transients.

`ENERGY_REFERENCE_RMS` was measured rather than picked. The finished
behaviour, one browser per track, reading the track title off the transport
rather than trusting the query typed:

| Preview clip | slow env | energy | splat radius | force | cadence | field ≥25% |
|---|---|---|---|---|---|---|
| *Enter Sandman* (clean intro) | 0.021 | **0.30** (floor) | 3.17 | 453 | 310ms | 0.34 |
| *Don't Know Why* | 0.078 | **0.71** | 3.09 | 983 | 181ms | 0.47 |
| *One More Time* | 0.094 | **0.86** | 2.47 | 717 | 129ms | 0.50 |

(Single 5-second samples of a field that breathes — the *directions* are the
result, not the third decimal.) Radius falls as energy rises (3.17 → 2.47),
cadence tightens (310ms → 129ms),
and force follows punch rather than loudness — which is why *Don't Know Why*,
a quiet master with real transients, throws the hardest splats of the three.
That is the model doing what it was built to do.

7b's bass band is gone from this path entirely. It survived the first 7c
rewrite still being computed every frame while feeding nothing but the debug
object, which was deleted before shipping — a signal with no consumer reads,
on the next pass through the file, as something load-bearing. Treble still
earns its place: it tightens cadence and widens scatter.

The first value tried was 0.17, off the top of my head, and it collapsed the
whole range into "quiet".

**A measurement of my own that was simply wrong, and how it was caught.** An
earlier pass reported *Enter Sandman* as the loudest of the set at 0.134 and
*Don't Know Why* as the quietest at 0.021 — the exact inverse of the table
above. That harness looped several queries through one page, pressed the
transport after each selection, and labelled each result with **the query it
had typed** rather than the track actually loaded. Selecting a record in the
crate already drops the needle (Stage 1's own choreography), so pressing the
transport *paused* it, and the retry logic sometimes left the previous track
playing. The numbers were real; the labels were not. `ENERGY_REFERENCE_RMS`
happens to be well-calibrated at 0.11 either way, which is luck, not method.

It also surfaces something worth knowing about this feature generally: **the
model responds to the 30-second preview clip, not to the song's reputation.**
*Enter Sandman*'s preview is its clean guitar intro, and it correctly reads as
low-energy. That is right, not a bug — the fluid should match what is
audible.

Soft tracks get **bigger, slower, gentler** waves and punchy ones get tighter,
harder, more frequent ones. The inverse radius relationship is the point: a
gentle track rendered as small weak blobs looks broken, and rendered as slow
wide swells looks calm.

**Three fixes the measurement forced:**

- **Envelope priming.** Starting the slow envelope at 0 meant it needed ~5s to
  reach the track's real level, so `energy` sat at its floor and `punch` read
  **3.7** on ordinary material for the whole opening — every track began
  looking like a quiet track having a seizure. Both envelopes are now primed
  from the first real sample. Same class as B55 one level up: not the wrong
  time constant, the wrong starting point.
- **`PUNCH_TRIGGER` 1.16 → 1.45.** At 1.16 the "transient detector" fired on
  **57–85%** of frames across the four tracks — a detector that says yes most
  of the time is a metronome, and the cadence gate behind it was doing all the
  work. RMS over a 5ms window is heavily skewed, so the fast envelope rides
  the peaks and sits well above the mean even on steady material.
- **The forced-gap fallback is now a multiple of the cadence** rather than a
  fixed 620ms. A fixed floor is wrong at both ends: on a driving track (110ms
  cadence) it drops five sixths of the beats; on a ballad (420ms) it fires
  between beats that were already sparse.

`turntable-audio.js`'s `analyser.smoothingTimeConstant` also dropped **0.8 →
0.55**. 0.8 is tuned for a spectrum *display*, where the goal is a steady
readable bar graph; it averages each bin over roughly a quarter of a second,
which is longer than a kick drum. The fluid reads that data to decide what
counts as a transient, so the smoothing was erasing exactly the events it was
being asked to detect. Nothing else reads the analyser. (Time-domain data,
which the RMS uses, is unaffected by this constant.)

#### 5. Roaming — the field crosses the whole hero

Three emitters wander the full canvas on a sum of two sine pairs per axis at
incommensurate frequencies, so the path never resolves into the obvious
figure-eight a single Lissajous traces. Splats fire wherever the chosen
emitter is, thrown along its **direction of travel** — which is what turns
discrete injections into something that reads as a moving wave rather than a
sequence of blots. The emitters travel on *energy-scaled* time, so the flow
follows the song rather than running at a fixed speed underneath it, and the
pitch fader drags it along too.

7b anchored every splat at the deck on the grounds that the deck is the source
of the sound. That is right, and the whole hero being in play is also right,
so `DECK_SPLAT_SHARE = 0.34` splits the difference. **The burst stays entirely
deck-anchored** — it is the needle-contact moment and has to come from the
needle.

New in the solver: **velocity-only splats** (`{ velocityOnly: true }`). Wide,
dye-free pushes fired every ~1.5s that drag whatever colour is already in the
field across the hero. Injecting dye as well would defeat the point — the
current's job is to *move* colour, and a wide low-dye splat on top of that
just fogs the canvas evenly.

`DENSITY_DISSIPATION` 0.85 → **0.7** and `VELOCITY_DISSIPATION` 0.2 → **0.09**.
Not a re-litigation of B53 — a change in what the field is asked to do. A
parcel of colour now has to survive long enough to cross a 1200px hero, and a
current that dies in half a second cannot carry it.

**A measurement trap worth recording.** 0.42 was the first landing, and the
sweeps that produced it were meaningless: they sampled at ten seconds, and at
that dissipation the field was still *filling* thirty seconds in. Every combo
was measured mid-transient and the results looked random — one row showing
peak 0.30 and the next, at 1.4× the amplitude, showing 0.97. **Equilibrium
level, not decay rate, is what a sweep of a continuously-injected field has to
measure**, and reaching it takes several time constants. Re-run at 22s of
settled playback, the ordering was monotonic and obvious.

#### 6. The legibility trade — and where it was resolved

This is the one place two things the feedback asked for could not both be had,
so it is worth being explicit rather than quietly picking one.

At the amplitude that makes the hero look alive, measured over 16 seconds of a
track at its worst moment:

| | worst contrast, unmasked |
|---|---|
| nav links | **1.1 : 1** |
| headline | **2.4 : 1** |
| tagline | 6.7 : 1 |

That is a recruiter landing on an unreadable page — the one failure this site
cannot have. The obvious fix, dimming the whole field until the worst case is
safe, is what makes a background like this look timid: text occupies maybe a
fifth of the hero and would have set the ceiling for all of it.

So the fluid runs bright everywhere and is held back only over the two boxes
that carry text, in the display shader (`uCalmA`/`uCalmB`, separable
smoothsteps, 0.075 feather). Both boxes are **measured from the live DOM**,
not hardcoded — the navbar strip, and the union of `.hero-content` and
`.record-crate` — so the stacked mobile layout masks its own boxes rather than
a desktop guess.

The retained fractions come from compositing arithmetic, not taste: near-white
text over dye at alpha *a* sits at 5.2:1 for a = 0.4 and 3.9:1 at 0.5, so 0.4
is the last value clearing 4.5:1 for small text. Navbar keeps 0.34; the text
column keeps 0.44, since the headline is 4.5rem and only needs 3:1.

Measured after, same track, same 16-second window:

| | unmasked | masked |
|---|---|---|
| nav links | 1.1 : 1 | **16.9 : 1** |
| headline | 2.4 : 1 | **16.8 : 1** |
| tagline | 6.7 : 1 | **6.5 : 1** |
| crate input | — | **16.2 : 1** |

What a visitor sees is waves thinning as they cross behind the headline, which
is how you would compose it by hand anyway.

#### 7. Amplitude, and the two themes landing in opposite directions

`FIELD_SCALE` is the single scalar setting the field's absolute amplitude,
separate from the per-colour solve that sets *ratios* between colours. The
first 7c build omitted it entirely and the field filled the whole viewport
with white-cored dye. Tuned by sweep against measured coverage at steady
state: **0.34**, landing at peak 0.92 with 36% of the hero above quarter alpha
and 16% above half — marbled light rather than either haze or wallpaper.

The per-theme response landed opposite to the guess. Light theme was expected
to need *more* alpha gain to be seen at all; at 1.9 it covered **93%** of the
hero above quarter alpha (dark's 36%) and stopped being a background. On a
white page the dye is *lighter* than the ground, so it composites toward the
page rather than away from it and reads as present at far lower alpha — the
intuition carried over from dark theme is exactly inverted. Final:

| | bloom | alpha gain | coverage ≥25% / ≥50% |
|---|---|---|---|
| dark | 1.6 | 1.4 | 36% / 16% |
| light | 0.6 | 0.85 | 58% / 29% |

#### 8. What did not change

The 7a/7b machinery underneath is untouched and re-verified rather than
assumed: four independent gates, the synchronous burst off `applyDeckState`,
the settle window's measured exit, `visibilitychange`, the IntersectionObserver
on the hero section, context-loss handling, and reduced motion's
one-static-frame-per-PLAYING behaviour. `SETTLE_MAX_MS` rose 4s → 7s only
because 7c's dye deliberately persists longer, and the old ceiling would have
become the routine exit rather than the safety net — cutting the tail off
visibly mid-fade.

#### 9. Mobile — a bug that only exists in portrait

Splat radii are expressed in units of canvas *height*, and the splat shader
corrects for aspect so a splat is circular on screen. On a landscape hero that
is exactly right. In portrait it is a trap: a splat sized as a sensible
fraction of a 900px-tall desktop hero, kept circular on a 390×844 phone, spans
about two thirds of the width. Measured at 390px, **coverage 1.00** — the
entire hero washed out, no background left anywhere, in both themes.

Fixed by scaling every splat radius by `min(1, width / height)`, which holds a
splat's share of the canvas *area* constant instead of its shape. Landscape is
a no-op. After: 0.30 (dark) / 0.48 (light) at 390×844, against desktop's
0.44 / 0.43 — `stage7c-mobile-{theme}.png`.

Worth noting how it was found: only because the mobile check measured the
field rather than looking at a screenshot. A washed-out phone hero photographs
as "a colourful background", which is what was asked for.

#### 10. Performance — and why the obvious measurement said nothing

Real GPU, headed, `ANGLE (Apple, ANGLE Metal Renderer: Apple M2)`.

The rAF-interval method that 7a and 7b used reported **33.33ms, p95 35.3ms**
with the bloom running. That looks like a 2× regression against 7b's 16.68ms
and is not a measurement of this code at all: the same page with the fluid
loop **completely stopped** reported 33.33ms as well. It is the display's
refresh interval. rAF timing can only ever say "did you miss a frame", and the
answer here is no — but it cannot say by how much.

`gl.finish()` was the next attempt and is worse: it reported **0.02ms per
step**, i.e. fifty thousand steps a second, because on this stack finish()
does not actually drain the queue.

The measurement that works is a `readPixels` — it has to round-trip to return
bytes, so it cannot be deferred. Against a full field:

| | GPU ms per step |
|---|---|
| full field, bloom chain running | **1.94ms** (median of 5×200 steps; 1.92–2.00) |

**1.94ms against a 16.67ms budget at 60Hz** — about 12% of a frame, on a
canvas covering the entire viewport. `benchmark()` is dev-only and stripped
from the production bundle.

(The run with `bloomIntensity: 0` measures identically at 1.94ms, which is
expected and is *not* evidence that bloom is free: the uniform scales the
chain's contribution, it does not skip the chain.)

#### 11. Everything re-verified, with numbers

| Check | Result |
|---|---|
| Burst vs. audio start | **0.10ms apart, same frame** (7b measured 0.2ms; the async path Stage 1 measured was 551ms) |
| Frames rendered before any play | **0** |
| Frames rendered after settle completes | **0**, field peak exactly 0 |
| Settle exit | **6108ms**, on the dye threshold, under the 7000ms ceiling — peak trace 0.961 → 0.678 → 0.251 → 0.122 → 0.071 → 0.039 |
| Reduced motion, idle | **0 frames**, `static-idle` |
| Reduced motion, playing | **exactly 1 frame**, unchanged over the next 3s, `static-playing` |
| Reduced motion, stopped | cleared, `static-idle`, no further frames |
| One colour per track | `violet → magenta → coral → gold`, and `gold` on returning to the first record |
| Text contrast, dark, worst frame of 16s | nav **17.0:1**, headline 16.9:1, tagline 7.6:1, crate 15.8:1 |
| Text contrast, light, worst frame of 16s | nav **15.4:1**, headline 16.0:1, tagline 5.9:1, crate 14.7:1 |
| Field at steady state, dark | peak 1.00, 44% ≥ quarter alpha, 20% ≥ half |
| Field at steady state, light | peak 0.96, 43% / 23% |
| Colour × theme combinations rendered | **14 of 14** |
| Lint | 7 errors / 2 warnings — unchanged baseline |

#### 12. Found on the way, not fixed here — `FINDINGS.md` B56

Running the light-theme sweeps kept killing the whole React tree, and it is
not the fluid: `my-taste.jsx` hands `kickerRef` to GSAP `SplitText`, which
rewrites that element's contents, while React still renders `<AvatarSlot>` into
the same element. When the Spotify profile fetch resolves, React inserts into a
DOM it no longer has an accurate record of and throws `insertBefore`. There is
no error boundary, so **the page goes blank**.

It is a race, so it looks intermittent and theme-specific. It reproduces in the
**production build**, not only in dev — load dark and toggle to light, or load
light and scroll to `#my-taste`. Live `diegodamian.com` does not currently
reproduce, which is not evidence of safety: those two rows are the bundle that
deploys next.

Left unfixed on purpose — different section, and the fix is a real call about
who owns that subtree — but it is a total-page failure on a job-search site,
so it should not wait. The full repro table and the one-line fix shape are in
`FINDINGS.md` B56. Stage 7c's own test harness blocks `/api/spotify/profile` to
work around it; that block should be removed once B56 is fixed.

---

### Stage 7d — fluid: ribbons instead of clouds, and the spectrum drives them *(2026-08-25)* — **SUPERSEDED**

Feedback on 7c, in two parts:

> *"the flow can be a bit too agressive. Remember that the liquid has to to
> flow, also make the liquid a bit more like lines instead of gas. Is that
> possible? I don't want it to be too dense, instead a little slimmer and
> smoother when we play a track."*

> *"Think about a spectrum display when we are trying to move the liquid or the
> animation. Second, please do some research and use any library available to
> make this possible It has to be smooth and fluid."*

Both are answered by the same structural change, so this is one stage rather
than two.

---

#### 1. Why 7c could not have produced lines

7c injected discrete splats on the beat at radius 2.4 — a Gaussian about a
tenth of the hero across. **That is a cloud generator by construction.** A big
soft Gaussian is gas, and no amount of tuning force, cadence or dissipation
turns a sequence of them into a filament. The request was not a parameter
change.

7d **draws** instead. Each emitter lays a thin deposit every frame, and
because it is moving, consecutive deposits overlap along its path into a
continuous ribbon. The fluid then does what a fluid is good at — shearing,
curling and stretching that line — rather than being asked to mix clouds into
something that looks structured.

Radius is a variance in the splat shader, so the visible half-width is
`sqrt(r / 200)` of the canvas height: 7d's 0.16 is ~2.8%, roughly a 25px
ribbon on a 900px hero, against 7c's ~100px blobs.

#### 2. The spectrum IS the layout

There are five ribbons and they are not generic. Each is bound to a frequency
band, and they are **stacked by pitch** — bass low in the frame, air high:

| ribbon | bins | ≈ Hz | home row | width | speed |
|---|---|---|---|---|---|
| low | 1–4 | 190–750 | 0.16 | 1.35× | 0.72× |
| low-mid | 4–10 | 750–1.9k | 0.34 | 1.10× | 0.88× |
| mid | 10–26 | 1.9k–4.9k | 0.52 | 0.90× | 1.06× |
| high | 26–60 | 4.9k–11k | 0.70 | 0.72× | 1.26× |
| air | 60–118 | 11k–22k | 0.86 | 0.58× | 1.48× |

Edges are log-spaced because pitch is. A linear split puts six sevenths of the
bins above 3kHz, where almost no musical energy lives, and the low ribbon
would carry the whole track by itself.

Each band gets **its own auto-gain**, which is how a spectrum analyser's own
scaling works: a fast-attack, slow-release peak follower (~25s memory), so the
air ribbon is visible on a track that has any air without the bass ribbon
swamping it. A symmetric smoothing would have been B55's mistake a third time
— a reference that chases its own signal is not a reference. Below a silence
floor a band draws **nothing**, deliberately: a track with no top end should
leave the air ribbon dark rather than auto-gaining noise up into looking like
content.

The result is that the hero reads as the *shape* of the track rather than its
volume — you can watch the kick in the bottom ribbon and the hats in the top
one.

Traced over 45 seconds, mean heights come out **0.23 / 0.29 / 0.48 / 0.61 /
0.70** — monotonic — while every ribbon still ranges the full width 0.02–0.98.
Stacked, and still roaming.

#### 3. The library — what I looked at and what I used

Asked to research and use one, so: **`simplex-noise` (4.0.3)**, and it is the
only one added.

The ribbons no longer travel on Lissajous figures. Two sine pairs per axis is
cheap and it looks it — the path is periodic, and once you have seen the
figure-eight you keep seeing it. They are now advected through a **curl-noise
field**: the 2D curl of a simplex noise potential. Two properties make it the
right tool rather than a fancier one:

- It is **divergence-free by construction** (the curl of any field is), so
  ribbons never pile into a sink or stream out of a source. They circulate.
  That is what reads as *liquid* rather than as wind.
- It is smooth and never repeats, so the motion has no visible period.

Cost: 18.7kB of ESM, and it is the one piece here that would have been
genuinely tedious to hand-roll well — a good gradient-noise implementation is
a permutation table and a great deal of care about directional artefacts.

**Considered and not used: `meyda`** (real-time audio feature extraction), for
the spectrum half. Its tarball is 115kB against simplex-noise's 15.9kB, and
what it would have contributed here is band splitting — fifteen lines against
an `AnalyserNode` this component already owns. Its genuinely hard features
(spectral flux, centroid, chroma) are not things this visual needs. Flagging
it as the obvious candidate if the `#my-taste` visualizer later wants real
timbral analysis, where it would earn the weight.

`three.js` and `ogl` were rejected on the same grounds 7c rejected them: they
would replace the working solver's boilerplate, not add a capability.

#### 4. "Slimmer" turned out to be about lifetime, not deposit

This is the part that inverted twice and is worth stating plainly, because the
intuitive lever is the wrong one.

A ribbon's visible **length** is travel speed × dye lifetime. Its
**brightness** is deposit rate. Three combinations give the same length, and
they do not look remotely alike:

| | mean alpha | ≥25% | ≥80% | reads as |
|---|---|---|---|---|
| slow travel + long life (dye 0.22, dissipation 0.34) | 0.34 | 60% | 0% | dark olive murk, no bright anything |
| fast travel + short life (dye 2.6, dissipation 1.7) | 0.27 | 35% | 11% | bright cores, thin, dark between |

The first is what "make it less dense" suggests — put in less dye. It produces
a *murk*: old dye never leaves, so strokes smear into each other and fill the
gaps that are exactly what make a line read as a line.

So 7d's deposit rate is nearly **12× higher** than the first attempt's and its
dye lifetime about **5× shorter**, and the result measures as *less* coverage
and looks dramatically slimmer. **What matters for "slim" is not how much dye
goes in but how fast the old dye leaves.**

Final: `DENSITY_DISSIPATION` 0.7 → **1.7**, `TRAIL_DYE_PER_SECOND` **3.8**,
`RIBBON_SPEED` **0.42**.

#### 5. "Less aggressive" — where the churn actually was

The aggression was the *velocity* field, not the dye. 7c pushed 520-unit
splat forces into a field with `VELOCITY_DISSIPATION` 0.09, so the motion
accumulated and the whole hero churned.

7d reverses that direction deliberately. In 7c the flow had to carry dye
across the hero, so velocity had to persist. In 7d the ribbon's path is drawn
by its emitter and the fluid only has to bend it — a long-lived velocity field
is no longer doing useful work, it is just churning:

| | 7c | 7d |
|---|---|---|
| `VELOCITY_DISSIPATION` | 0.09 | **0.42** |
| trail/splat force | 520 | **60** |
| current force | 340 | **130** |
| current interval | 1500ms | **1900ms** |
| emitter travel (energy-scaled) | 0.45–1.5 | flow field evolves at 0.055 |

`CURL_STRENGTH` went the other way, 30 → **42**. Vorticity confinement
re-injects the small-scale swirl advection dissipates, and that swirl is what
shears a filament into the wisps and hooks that read as liquid rather than as
a drawn stroke. 7c measured 55 as making its clouds thinner and patchier and
rejected it on that basis — 7d *wants* thinner, so the same knob now reads as
structure instead of loss.

#### 6. Solver changes for filaments

`DYE_RESOLUTION` 512 → **1024**. Through 7c the dye was clouds, and a cloud
does not care about resolution. A filament is destroyed by exactly one thing:
the bilinear interpolation inside semi-Lagrangian advection, which smears any
feature approaching a texel's width a little more every frame. Doubling the
grid halves how fast that happens.

Bloom tightened: `BLOOM_RESOLUTION` 256 → **512** (a finer grid is a tighter
glow at the same iteration count) and `BLOOM_ITERATIONS` 6 → **4**. A wide
bloom is what a cloud wants; on filaments it merges neighbouring lines back
into the gas this stage removed.

#### 7. Where the deck went

7c kept the platter reading as the source by giving a third of its discrete
splats a deck origin (`DECK_SPLAT_SHARE`). A ribbon model has no discrete
splats to apportion, so the origin is expressed as a **starting position**
instead of a quota: every ribbon is released from the platter on the first
frame of playback and drifts out to its own band's row from there. The first
seconds after the needle lands read as colour streaming off the record. The
burst is unchanged and still entirely deck-anchored.

#### 8. Measurements

| Check | Result |
|---|---|
| Coverage, desktop dark (40s window) | median **0.19**, 2 of 38 samples below 0.10, peak alpha 1.00 at every sample |
| Coverage, 390×844 (40s window) | median **0.22** — matched to desktop |
| Field at a steady instant, dark | peak 1.00, 29% ≥ quarter alpha, 16% ≥ half |
| Field at a steady instant, light | peak 1.00, 28% / 13% |
| Band stratification (45s means) | 0.23 → 0.29 → 0.48 → 0.61 → 0.70, monotonic |
| Horizontal range, every ribbon | 0.02–0.98 |
| Text contrast, dark, worst frame of 16s | nav **16.9:1**, headline 16.7:1, tagline 7.7:1, crate 11.9:1 |
| Text contrast, light, worst frame of 16s | nav **17.3:1**, headline 17.3:1, tagline 7.6:1, crate 16.7:1 |
| GPU cost per step, full field, M2 | **1.89ms** against a 16.67ms 60Hz budget (7c: 1.94ms — the doubled dye grid is paid for by bloom dropping two levels) |
| Reduced motion | 0 frames idle, exactly 1 while playing, cleared on stop |
| Bundle | 556.47 → **558.96 kB** (+2.49 kB), gz 197.33 → **198.65 kB** (+1.32 kB) — including `simplex-noise` |
| Lint | 7 errors / 2 warnings — unchanged baseline |

**A measurement caveat that matters for reading any screenshot here.** The
field's instantaneous coverage spans roughly 0.07 to 0.50 around a 0.19–0.22
median, so a single frame is one sample of a wide distribution — two runs of
the *same build* measured 0.58 and 0.12 on mobile. Every number above that
says "median" is a 40-second window; every screenshot is one draw from that
distribution and should be read as such.

---

### Stage 7 (rebuild) — the fluid is deleted; a synthwave skyline spectrum replaces it *(2026-08-25)*

> **This supersedes Stages 7a–7d entirely.** `client/src/lib/fluid-sim.js` and
> `client/src/components/fluid-background.jsx` are **deleted**, not deprecated,
> and the `simplex-noise` dependency is removed with them. The four entries
> above are kept as a record of what was learned, not as a description of code
> that exists. Anything they say about the hero background's *implementation* is
> historical from this date.

The brief: a full-bleed neon skyline behind the whole hero — a horizon of
vertical columns, one per frequency bucket, rising and falling with the music,
gradient-filled and glowing. Same presence model the fluid was built around:
silent and gone when nothing is playing, appearing in sync with the needle.

**Three new files, and the split mirrors the one the fluid used:**

| File | Role |
|---|---|
| `client/src/lib/skyline-spectrum.js` | Canvas2D renderer. Bucketing, ballistics, drawing, glow, text masks. No React. |
| `client/src/lib/palette-cycle.js` | The palette, its per-theme solve, and the crossfade clock. Knows nothing about canvases. |
| `client/src/components/skyline-background.jsx` | RAF loop, deck gating, reduced motion, DOM measurement. |

---

#### 0. What the task brief said that was not true of the tree

The brief asked to check itself against reality first, so:

- **It describes the tree as being at Stage 7a/7b.** It was at **7d**. Two more
  stages had shipped (`544637f`, `3e1a31e`) — a vibrancy/energy/palette pass and
  a ribbon rewrite bound to the spectrum.
- **It assumed a palette-cycling module already existed**, "built deliberately
  decoupled from the fluid renderer for exactly this situation", and said to
  reuse it. **It did not exist.** Through 7a–7d the palette lived inline in
  `fluid-background.jsx`, wired straight to a WebGL dye colour. It is a real
  module now, for the first time.
- **The five colours it names — wine `#A6335D`, slate `#404D73`, mint
  `#BBF2ED`, amber `#c97a1a`, terracotta `#b3552a` — are the 7b palette, which
  was deleted in 7c on direct instruction** ("stay away from darker colors...
  bright mint, glowing... 7 colors in rotation"). `FINDINGS.md` **B54** has the
  measurement behind that: four of those ten colour × theme combinations pinned
  the contrast solve at its clamp, because a colour sitting at the page's own
  luminance cannot be rescued by alpha.

  Resolved by following the brief's **primary** instruction ("reuse it") rather
  than its stale recollection of the contents: the seven-hue neon list carries
  forward, and the brief's five are kept in the module as an exported
  `BRIEF_PALETTE` so the comparison stays re-runnable rather than asserted.
- **The sync mechanism it asks for already exists.** `deck-state.js`'s
  `emitDeckState`/`onDeckState` is synchronous and is called from
  `applyDeckState` in the same statement run as `audio.playCached()`. Reused,
  not rebuilt.
- **`analyser.fftSize` was 256**, which cannot feed a log-spaced skyline at all.
  Raised to 2048 — see §2.

---

#### 1. Why Canvas2D, and what was deliberately not used

**`audioMotion-analyzer` was researched and rejected on licence.** It is
AGPL-3.0. Bundling it into a deployed site carries real copyleft obligations
rather than an attribution line, and this site is deployed. Its *techniques* —
log frequency scale, attack/release ballistics, gradient fills — are textbook
spectrum-analyser practice and are reimplemented here from first principles.
Same posture Stage 7a took with Navier-Stokes versus Pavel Dobryakov's actual
source.

Nothing else was added. Net dependency change for this stage is **−1**:
`simplex-noise` leaves with the fluid.

---

#### 2. Log bucketing, and the `fftSize` that made it possible

Columns are log-spaced from 32 Hz to 16 kHz — 44 of them at desktop width,
derived from the canvas width (`clamp(round(width / 30), 20, 44)`) so a 390px
phone gets 20 readable columns rather than 44 slivers.

**Log spacing is the whole point, and it is worth one number.** Of 44 columns,
how many are dedicated to the region below 500 Hz, where the musical energy
actually is?

| bucketing | columns below 500 Hz | share of hero width |
|---|---|---|
| **log** | **20 of 44** | **45%** |
| linear | 2 of 44 | 5% |

**`analyser.fftSize` 256 → 2048.** At 256 there are 128 bins, each 187 Hz wide
at this 48 kHz context, so the first twenty columns all live inside the first
two or three bins. A/B'd on **rendered column heights** over 240 frames of the
same playing track — not on the bin arithmetic, which is only a prediction of
them:

| fftSize | adjacent bass pairs indistinguishable >80% of frames | mean neighbour height difference (bass) |
|---|---|---|
| 256 | **7 of 19** — a run of eight columns moving as one | 0.0066 |
| **2048** | **0 of 19** | **0.0402** |

Six times the detail in exactly the region log spacing exists to make room for.
Cost is a 43 ms analysis window and a 1024-byte copy per frame; the FFT is
computed by the graph whether or not anyone reads it. Recorded as **B62**.

Sub-bin columns interpolate between adjacent bins rather than indexing an
integer bin — that is what keeps the lowest six distinct. Multi-bin columns take
the **max**, not the mean: a treble column spans ninety bins and averaging
buries a cymbal in the silence either side of it.

---

#### 3. Ballistics — the fix for "abrupt"

Each column's **displayed** height is its own state, never a direct readout of
the frame's data. Rises are adopted outright; falls are exponential toward the
incoming value, applied as `exp(-dt / 0.34)` rather than a per-frame multiplier
so a 120 Hz display and a 60 Hz one decay at the same rate in *seconds*. A bare
`h *= 0.92` per frame is the common form and is frame-rate dependent by
construction.

Measured over 420 consecutive frames of real playback:

| | |
|---|---|
| mean rise per frame | **0.0748** |
| mean fall per frame | **0.0246** — 3.0× slower |
| largest single-frame rise | 0.576 |
| largest single-frame fall | 0.208 |
| median half-life of a fall from a local peak | **9 frames / 767 ms** |

The node's own `smoothingTimeConstant` stays at 0.55 and is deliberately *not*
raised toward the 0.8 default. That default is tuned for a display driven only
by the node's smoothing, and it is **symmetric** — buying a smooth release from
it also buys a slow attack. The renderer's own asymmetric ballistics are
strictly the better instrument.

---

#### 4. Peak normalisation does not give a display dynamic range

The first build measured column heights spanning **0.54 to 0.92**. That draws as
a solid block with a texture, not as a skyline.

`getByteFrequencyData` maps decibels linearly onto 0–255, and real music does not
go near the bottom of that window. Measured per-octave peaks across three
previews: 234 → 104 (Daft Punk), 189 → 43 (Norah Jones), 135 → 28 (Metallica).
Dividing any of those by its own maximum leaves everything bunched in the top
half.

So the **span** is normalised, not the peak: a low reference as well as a high
one, mapping `[quiet, loud]` onto `[0, 1]`. Both are global, so the map is affine
and identical for every column and the spectrum's **shape** survives exactly —
which is the reason per-column auto-gain (Stage 7d's ribbons used it) is wrong
here: it normalises every column to its own history, so all of them eventually
reach full height and the shape is destroyed. Both references move fast toward
the signal and slowly away from it; a reference that chases its own signal as
fast as it rises is not a reference (**B55**). Recorded as **D24**.

---

#### 5. Tilt and gamma, swept offline

Music has systematically less energy the higher you look, and with columns
spaced by pitch that shows as a permanently stubby right-hand third. Adding a
tilt is standard analyser-display practice; the question is how much.

Rather than one browser run per candidate, **167–189 frames of raw analyser data
were captured from five previews and replayed through this exact pipeline
offline** at 60 combinations. Scored on: mean height near 0.45, per-frame spread
as large as possible, treble not stubbed — and, the term that stops this
collapsing into a compressor, **the loud track and the quiet track still
differing from each other**.

| tilt | gamma | score | mean-height error | spread | treble short | between-track difference |
|---|---|---|---|---|---|---|
| **0.14** | **2.10** | **0.781** | 0.093 | 0.779 | 0.030 | 0.331 |
| 0.08 | 1.90 | 0.779 | 0.088 | 0.786 | 0.033 | 0.294 |
| 0.14 | 1.90 | 0.775 | 0.101 | 0.762 | 0.022 | 0.328 |
| 0.20 | 2.10 | 0.766 | 0.107 | 0.758 | 0.020 | 0.364 |

**0.30 measured as a clear overcorrection**: on a dense, heavily-compressed
master it lifted the whole spectrum into the top of the range — mean height 0.81
with only 0.46 of per-frame spread. `MIN_SPAN` never bound on any of the five
captures, so 0.26 and 0.34 scored identically; it is a guard for the case the
captures do not contain, not a tuning knob.

Final, over 14-second windows on the shipped build:

| track | mean height | per-frame spread | histogram (0–.2 / .2–.4 / .4–.6 / .6–.8 / .8–1) |
|---|---|---|---|
| Daft Punk — Get Lucky | 0.63 | 0.74 | 2% 22% 22% 24% 31% |
| Norah Jones — Don't Know Why | 0.49 | 0.86 | 13% 25% 27% 22% 12% |
| Metallica — Enter Sandman | 0.36 | 0.84 | 30% 37% 12% 14% 7% |

A **0.27 spread in mean height between tracks** is the "match the energy of the
song" requirement, measured. (As Stage 7c found, the model responds to the
30-second *preview clip*, not the song's reputation — Enter Sandman's preview is
its clean intro and correctly reads as the quietest of the three.)

---

#### 6. The palette module

Seven neon hues, and each is solved **twice** per theme — once deep for a
column's base, once bright for its tip — because a skyline column is a gradient.
That second stop is the only genuinely new thing in the module; the hue list and
the saturation-pinned lightness search carry forward from 7c.

**The base is a target and the peak is a band, and the asymmetry is the point.**
The base is meant to be a uniform deep footing, so pinning it to one luminance is
exactly right — that is what makes seven different colours sit at the same visual
weight. The peak is meant to be *the authored colour*.

A first pass used a target for both and put the dark-theme tip at 0.82, reasoning
that a dark page means a bright tip. **Rendered, every hue arrived as a pastel**:
magenta `#ffe0f6`, mint `#9efbe7`, aqua `#c3f2ff` — near-whites with a tint.
Saturation is pinned at 0.92, so a high luminance target can only be met by
driving HSL lightness past 0.9, and every hue converges on white up there no
matter how saturated it nominally is. **That is B54's lesson in a new costume.**

With a band, five of the seven dark-theme peaks pass through **at exactly the hex
they were authored as**:

| entry | base (dark) | vs bg | peak (dark) | vs bg | peak (light) | vs bg |
|---|---|---|---|---|---|---|
| mint | `#057e64` | 3.83:1 | `#7bfade` | 15.19:1 | `#07b28d` | 2.53:1 |
| aqua | `#00799c` | 3.86:1 | `#48d6ff` *(authored)* | 11.31:1 | `#00aadb` | 2.52:1 |
| violet | `#774aff` | 3.86:1 | `#a98cff` *(authored)* | 7.23:1 | `#a88bff` | 2.51:1 |
| magenta | `#d30094` | 3.85:1 | `#ff6ed4` *(authored)* | 7.73:1 | `#ff5fd0` | 2.51:1 |
| coral | `#d52d00` | 3.86:1 | `#ff8a6b` *(authored)* | 8.34:1 | `#ff734e` | 2.51:1 |
| gold | `#946700` | 3.85:1 | `#ffc94d` *(authored)* | 12.57:1 | `#c68a00` | 2.79:1 |
| lime | `#3e7e00` | 3.84:1 | `#94ff2c` | 15.22:1 | `#58b200` | 2.52:1 |

The white-hot core comes from where it should — the additive glow pass blooms
overlapping columns past the palette, so the palette does not have to be
near-white to begin with.

**On light theme the peak lands at ~2.5:1 against the page and that is
deliberate, not a miss.** It is the top of the column, where the gradient's alpha
is already ramping to zero; the *visible* body of a light-theme column is its
base, at 6.1:1. On a near-white page the only legible direction is down, so a
light-theme column is deep ink at the base and saturated colour at the tip — the
same gradient read the other way up.

**Crossfade.** The cycle advances **one step per track** (7c's decision, kept
deliberately: a wall clock walked the whole palette while one song played, so the
colour stopped meaning anything) and crossfades on its own wall clock over
**1.4 s** — measured settling at 1421–1462 ms across three transitions. Because
the gradient uses two *adjacent* entries at once, one step forward changes both
stops, the old tip becoming the new base. Four consecutive tracks gave four
distinct positions: `coral→gold`, `gold→lime`, `lime→mint`, `mint→aqua`.

---

#### 7. Presence and sync

Unchanged in intent from 7b, re-implemented on the new renderer.

| Check | Result |
|---|---|
| Before any record is chosen | state `idle`, RAF **not running**, **0 frames drawn**, **0 lit pixels** |
| At the `PLAYING` emit | canvas already `playing` **and** `audio.getState().isPlaying` true — same synchronous statement run as `playCached()` |
| First painted frame | **1 rAF later (+20.1 ms)** — the minimum possible; 0 frames had been drawn before the emit |
| Pause mid-track | columns fall by their own release ballistics; peak 0.313 → 0.031 → RAF stopped after **1176 ms**, then **0 lit pixels**, state `idle` |
| Hero scrolled out of view while playing | **0 frames advanced**, **0 lit pixels** |
| Tab hidden while playing | **0 frames advanced**, **0 lit pixels** |
| Reduced motion, both themes | exactly **1 frame** on play, **0 advanced** over 2.5 s, **0 lit pixels** on pause |

The reveal fires on `deck-state.js`'s synchronous emitter, not an effect. Stage 1
measured what an effect costs at this call site: **551 ms**.

**One real bug found here (B63).** Cancelling the RAF left whatever was last
drawn sitting on the canvas — the two gates that can close *mid-playback*
(scrolling the hero away, hiding the tab) froze a full-height skyline there,
waiting to be seen for one tick on return. Measured at **2,364,869 lit pixels**
left behind. The canvas is now cleared on every stop, not only when a settle
completes.

---

#### 8. Text legibility — the mask that was supposed to be unnecessary

The first version of this file claimed geometry made a mask unnecessary: columns
rise from the bottom to a hard ceiling and the gradient is most transparent at
its top, so they should stay clear of the type by construction.

**Measured, that was wrong twice over.** The tagline sits at 46% of the hero
height and the crate at 65% — both *inside* the columns, not above them. And the
glow is composited with `lighter`, which adds **alpha** as well as light, so it
lifts the canvas's opacity above the gradient's own wherever it spreads.

| element | dark, before | dark, after | light, after |
|---|---|---|---|
| nav link | never reached | never reached | never reached |
| headline | 6.68:1 | **12.62:1** | **14.75:1** |
| tagline | **1.55:1** | **5.29:1** | **6.08:1** |
| crate input | **2.00:1** | **10.71:1** | **9.94:1** |

Measured from **composited pixels**, not from a screenshot and not from the token
values: the canvas paints straight-alpha RGBA over the page, so the effective
background behind a glyph is `canvasRGB·a + pageRGB·(1−a)` per pixel. Reported at
the worst pixel of 90 frames, because the field moves and an average hides the
moment that actually fails. All four elements are transparent — verified, not
assumed — so nothing paints its own background underneath.

**The zone shape took three attempts, and the first two are visible failures:**

1. **One rectangle per zone.** Plainly visible in the render as a rectangular
   panel of dimmed columns. A downscaled buffer feathers by about one source
   texel, and the eye finds a straight edge in a field of vertical bars instantly.
2. **An ellipse with a radial falloff.** Does not fit the shape of the problem:
   for a wide, short text line, an ellipse whose *core* still covers the text has
   to be roughly 2.4× the line's width, which swallows the hero.
3. **Shipped: a stack of seven concentric rounded rects**, each inset further,
   each at the per-layer alpha that composes exactly to the target strength
   (`n` layers of alpha `a` compose to `1−(1−a)ⁿ`). The ramp follows the box's own
   shape, reaches zero 64 px outside it, and has no edge anywhere.

Three strengths rather than one, because the three elements sit at three depths
in the gradient: headline **0.34**, tagline **0.50**, crate **0.55**. The tagline
gets its own zone rather than inheriting the headline's — it is
`--secondary-text` at weight 300, so it starts with far less contrast in hand,
and at the headline's strength it measured 3.35:1. That is a pass for 24 px text
under WCAG's large-text rule and still too thin for a light weight, so it is
treated as normal text and held above 4.5:1.

**The change that did most for legibility was not a mask.** Backing the whole
alpha ramp off — peak stop 0.96 → **0.72** — is what stopped the columns reading
as a solid wall, and it let every zone strength drop. Zones are measured from
live DOM boxes, so the mobile restack (deck above crate, everything centred) is
handled without a second set of constants.

---

#### 9. The horizon was below the fold

Anchoring the columns to the canvas's bottom edge is the obvious default and it
is wrong here. The hero is **1080 px tall against a 900 px window** on desktop
(1004 against 844 on a phone), and everything below the crate is padding — so the
horizon sat **180 px below the fold** and the skyline read as bars running off
the bottom of the screen rather than standing on anything.

The horizon is now placed at `min(1, window.innerHeight / heroHeight)` of the
canvas height, measured per layout. Derived from the window height rather than
the canvas's current `getBoundingClientRect().top`, or the horizon would depend
on where the visitor happened to be scrolled when the last resize fired — the
hero is the first section, so its document position is the top of the page.
Recorded as **D23**.

---

#### 10. Glow — and a benchmark that inverts between renderers

The brief expected a downscaled second pass to be cheaper than per-bar
`shadowBlur`. **On a real GPU it is. In headless it is not**, and the difference
is large enough that measuring this in the wrong browser would have led straight
to the wrong choice.

| technique | headless (SwiftShader) | **headed (ANGLE Metal, Apple M2)** |
|---|---|---|
| per-bar `shadowBlur(16px)` | **0.164 ms** | 0.15–0.34 ms |
| full-res `filter: blur(16px)` | 11.076 ms | 0.542 ms |
| **1/6 offscreen + `blur(3.5px)` — shipped** | 1.145 ms | **0.097 ms** |
| 1/6 offscreen, upscale only (no `filter`) | 0.959 ms | 0.080 ms |
| bars only, no glow (floor) | 0.061 ms | 0.057 ms |

Two things worth keeping. First, `shadowBlur` is far cheaper than the brief
assumed because **all 44 columns are batched into one path and one `fill()`** —
it is one shadow operation, not 44. Second, headless Chromium falls back to
software rasterisation, which reverses the ranking outright; the brief's demand
for a real-device number was the right call.

`ctx.filter` is feature-detected. Without it (Safari before 17) the glow degrades
to the upscale's own bilinear smoothing rather than throwing — 0.080 ms and
slightly softer.

**Shipped renderer, live page, real GPU: 0.228 ms/frame** at 2880×2160 backing
store, 44 columns — **1.4% of a 16.67 ms 60 Hz budget**. Reading the analyser is
0.0037 ms.

---

#### 11. A bug in the fix for the last stage's bug

Stage 7d found that dev-only diagnostics ship, because a *property of an object
literal* is not tree-shakeable, and fixed it by spreading them behind
`import.meta.env.DEV`. That fix is itself a trap, and this stage walked into it.

**Object spread invokes getters.** `...(DEV ? { get columnCount() {…} } : {})`
copies the getter's *value at spread time* and the property stops being live. It
reads as working and reports a constant: `columnCount` sat at its
construction-time `20` while the renderer was really drawing `44`, and five other
diagnostics silently froze with it.

Both files now use `Object.defineProperties` inside an `if (import.meta.env.DEV)`
**statement** — genuinely removed by the minifier, and the getters inside stay
getters. Verified both ways: live values change with a resize (44 → 30 → 44
across viewport changes), and `dist` contains none of `__skylineDebug`,
`solvedFor`, `setPalette`, `binRanges`, `columnEdgesHz`, `rawLevels`,
`gainReference`, `usesRoundRect` or `BRIEF_PALETTE`. Recorded as **B61**.

*(Two apparent hits when grepping `dist` are false positives worth naming so the
next check does not re-investigate them: `setIndex` is GSAP's ScrambleText
plugin, and `columnCount` is React's list of unitless CSS properties.)*

---

#### 12. Removal, verified by grep

`fluid-sim.js` (1,158 lines) and `fluid-background.jsx` (1,404 lines) deleted;
`simplex-noise` uninstalled; `.hero-fluid-canvas` renamed to
`.hero-skyline-canvas`; stale comments in `deck-state.js`, `turntable.jsx`,
`turntable-audio.js` and `home.jsx` updated to describe what actually exists.

`dist` contains no `createFluidSim`, no `simplex`, no `createNoise3D`. The only
surviving matches for "fluid" in `client/src` are two unrelated *fluid
typography* comments in `main.scss` and deliberate historical references in the
three new files' headers.

---

#### 13. Measurements

| Check | Result |
|---|---|
| Columns | **44** at 1440px, **30** at 900px, **20** at 390px — width-derived, verified live across resizes |
| Log vs linear bucketing | **20 of 44** columns below 500Hz vs **2 of 44** |
| fftSize 2048 vs 256 | **0 of 19** flat bass pairs vs **7 of 19**; neighbour detail 0.0402 vs 0.0066 |
| Attack vs release | rise **0.0748**/frame vs fall **0.0246**/frame; half-life **9 frames / 767 ms** |
| Height distribution (3 tracks, 14s) | means **0.63 / 0.49 / 0.36**, per-frame spread **0.74–0.86** |
| Text contrast, dark | nav untouched, headline **12.62:1**, tagline **5.29:1**, crate **10.71:1** |
| Text contrast, light | nav untouched, headline **14.75:1**, tagline **6.08:1**, crate **9.94:1** |
| Palette | 5 of 7 dark peaks at the authored hex; crossfade settles **1421–1462 ms**; 4 tracks → 4 distinct positions |
| Idle / out of view / tab hidden | **0 frames, 0 lit pixels** in every case |
| Reveal | canvas `playing` in the same tick as `playCached()`; first paint **+20.1 ms** (one rAF) |
| Settle after pause | RAF stopped after **1176 ms**, canvas **0 lit pixels** |
| Reduced motion | exactly **1 frame**, 0 advanced over 2.5s, cleared on pause, both themes |
| GPU cost per frame, M2 | **0.228 ms** against a 16.67 ms 60Hz budget (**1.4%**) |
| Bundle | 558.96 → **542.63 kB** (**−16.33 kB**), gz 198.65 → **193.53 kB** (**−5.12 kB**) |
| Lint | 7 errors / 2 warnings — unchanged baseline |

The bundle **shrank**: the WebGL2 solver with its eleven GLSL sources plus
`simplex-noise` cost more than a Canvas2D renderer, a palette module and a
component together.

---

#### 14. Named follow-up, not built

**A true perspective horizon grid with a vanishing point** — the receding
floor-grid half of the synthwave idiom. It is a decorative layer over a structure
that has to be correct first, which is the same structural-before-motion split
every prior stage has taken. The columns are flat and full-width in this pass by
deliberate choice, not omission.

---

### Stage 7.2 — light theme reads as colour, the banding was the mask, smooth tips *(2026-08-25)*

Three pieces of live feedback, and all three turned out to be about something
other than what they looked like:

1. *"fix the lighter mode too because it looks kinda white on that background"*
2. *"when the bars are displaying it looks like they are pixeled instead of a
   high quality soundbar"*
3. mid-build: *"make sure the tip of the bars are smooth not that hard line"*

---

#### 1. "Looks kinda white" — alpha does not do the same thing on the two themes

The light theme was not badly tuned. It was tuned as though it were the dark
theme at a different exposure, and that is not what a light background is.

Compositing at alpha `a` moves a pixel a fraction `a` of the way from the page to
the colour. On a **near-black** page that makes a translucent column a *dim*
version of its hue — still the hue. On a **near-white** page it makes it a
*desaturated* one. Measured chroma of the composited pixel on the shipped 7.1
build, bucketed by alpha so the number does not depend on which bars happened to
be tall:

| alpha band | dark | light |
|---|---|---|
| 0.15–0.25 | 0.500 | **0.106** |
| 0.35–0.45 | 0.608 | **0.182** |
| 0.55–0.65 | 0.735 | 0.311 |
| 0.70+ | 0.785 | 0.586 |

Light theme needed alpha **0.70 to reach the chroma dark theme has at 0.20**, and
the ramp only got there in the bottom fifth of the hero. Everywhere above that
the columns were a pale wash — and the top of the ramp was alpha **0**, because
it was the dark theme's ethereal fade scaled by 1.5. Zero times anything is zero:
on paper a bar that fades out does not go ethereal, it goes *absent*.

So the ramp is no longer one ramp and a multiplier. There are two:

| gradient offset | dark | light (was, effective) | light (now) |
|---|---|---|---|
| 0.00 | 0.00 | 0.00 | **0.42** |
| 0.20 | 0.22 | 0.33 | **0.66** |
| 0.52 | 0.34 | 0.51 | **0.79** |
| 0.82 | 0.44 | 0.66 | **0.88** |
| 1.00 | 0.50 | 0.75 | **0.92** |

**The halo had to move the opposite way at the same time, and the first attempt
at this failed because it did not.** On a near-white page the halo is not glow,
it is a soft coloured shadow, and at 0.72 it filled the gaps with the same wash
as the columns: the lower hero was one continuous pink field with white stripes
cut into it — the *gap* had become the figure. Cutting it to **0.34** puts the
paper back between the bars.

But the halo is drawn *under* the columns and its alpha compounds with theirs, so
cutting it took out roughly as much as a first pass at the ramp put in. Measured
after that pass: the alpha histogram had **not moved at all** and light theme
looked exactly as washed as before. The two have to be sized together, against a
target for the composite — ~0.85 inside a bar, under 0.15 in the gap — which is
what the numbers above are solved for.

Result, same instrument: chroma at the 0.70+ band **0.586 → 0.607**, and the
number of pixels in that band **71,598 → 135,742**. The colour did not get more
saturated; nearly twice as much of the hero now carries it.

---

#### 2. "Pixeled" — it was the mask, not the colour depth

This looked exactly like 8-bit gradient banding, and the arithmetic supported it:
a column's ramp crosses the whole hero and changes very little doing it, so
quantised to 8 bits it holds one integer value for 20–40 device pixels at a
stretch, and because every column samples the same gradient those runs line up
across all 44 at once.

That is real, and it was fixed (below). **It was not the reported artefact.**

The reported one was the safe-zone mask. Since 7.1 each zone's falloff was built
by accumulating **seven** concentric rounded rects at the per-layer alpha that
composes to `strength` — arithmetic that is exactly right and produces a
*staircase*, not a ramp. Seven layers over a 96px feather put a boundary every
13.7px with a flat plateau between, and at strength 0.80 each boundary removes a
fifth of whatever is left. The mask was drawing **8%-alpha steps, 27 device
pixels apart, straight across every column at once**.

Counting the bands in an 8× blow-up: ~4.4 over 60 CSS px. 60 / 13.7 = 4.4.

D26 had already removed the reason for the stack — once every zone became a
full-width band there were no corners to follow and no horizontal edge to hide,
so the falloff is purely **vertical**, which is what a linear gradient is for.
Sampled along a smoothstep rather than left linear (a straight ramp meeting a
flat top is a first-derivative corner, and a corner in a luminance ramp is a Mach
band — the same visible line, moved rather than removed), on a 1/4 buffer rather
than 1/8, and **three fills a frame instead of twenty-one**.

**The dither**, for the genuine 8-bit banding underneath: a second fill of each
column's own path with a fixed noise tile, one third white, one third black, one
third transparent, at one 255th alpha. The mix is the whole trick rather than a
hedge — a single ink loses its amplitude wherever the pixel is already near it,
and measured with black ink on light theme the deep end of a column sits at
~50/255, so the difference term collapsed from ~200 to ~50 and the worst flat run
went **up**, 21px → 58px. Carrying both, the peak-to-peak perturbation is
`a·(255−c) + a·c = a·255` — independent of the pixel, one quantisation step
everywhere, on either theme, with nothing to rebuild on a theme flip.

Worst flat run down a single pixel column, three windows per theme:

| | dark | light |
|---|---|---|
| before | 13 / 28 / 40 px | 11 / 24 / 21 px |
| after | 10 / 12 / 15 px | 5 / 14 / 8 px |

*(The dark third window reads 46px on the blue channel and is a false positive —
blue is near zero at the base of a warm column, so it is a flat **channel**, not a
contour. Measured across all four: red 15px, green 14px, luminance 15px, blue
55px. Luminance is what the eye contours on, so 15px is the honest number.)*

---

#### 3. The tips

The lit cap at each column's own tip exists for a real reason — every column
samples one shared gradient, so only a full-height column ever reaches its bright
end, and short columns were all base colour. 7.1 drew it as a **3px slab at a
flat 0.92**, which put a hard horizontal line across every column where the
slab's bottom met the body.

It is now a **14px falloff** — full alpha at the very top, out to nothing by the
bottom — so the only edge left is the bar's own outline, which is meant to be
there. Positioned by translating the context to the column's tip and filling a
gradient defined in that local space, rather than building one per column per
frame; the same reason the body ramps are tiled into buckets.

---

#### 4. The white fog band, which was nobody's number

Raising the light ramp exposed something that had been latent since D26: a
**400px-tall near-total hole** in the skyline across the middle of the hero.

Zones compose the way overlapping alpha does, `1-(1-a)(1-b)`. Once every zone
became a full-width band, any two whose vertical extents meet overlap along their
whole length — and the headline's band ended 25px above where the tagline's
began. With a 96px feather on each they overlapped almost entirely, composing
0.80 and 0.78 into an effective **0.956**. Neither number was ever meant to be
that, and nothing in either one said so.

The headline and the tagline are one block of copy sitting 25px apart. **One zone
over both**, at one strength, is what they are, and it is the only shape that
cannot compound with itself.

The strengths are now **per theme**, which is not a fudge: the mask exists to hold
a contrast *ratio*, and how much alpha it must remove depends on how close the
columns land to the text in luminance — which flips with the theme, and not in
step. `.hero-tagline` is `--secondary-text`, luminance **0.367 on dark** and
**0.077 on light**; on dark it is a mid tone with the columns as the brightest
thing in the frame, closing on it fast, and on light the columns are deep ink
closing from the other side, more slowly. Measured at a single 0.70 across both:
**dark 3.63:1 against light 5.15:1, from the same mask.**

Final: copy zone **0.85 dark / 0.70 light**, crate **0.55** both.

---

#### 5. Verification

Contrast, worst case over all seven palette entries (the ring's start position is
clock-seeded, and left uncontrolled it moves the tagline by a whole ratio point —
enough to make a strength sweep read *backwards*, which it did once here):

| | dark | light |
|---|---|---|
| `.hero-name` | 12.28:1 | 11.75:1 |
| `.hero-tagline` | **5.87:1** | **5.15:1** |
| `.record-crate-input` | 12.11:1 | 8.02:1 |
| `.navbar-links a` | 17.03:1 | 17.44:1 |

The tagline is the binding element in both themes — 24px at weight 300, which
WCAG would let through at 3:1 as large text and which this site holds to 4.5:1
anyway, because a thin weight is not what that rule had in mind.

Everything else held: reveal **+21.4 ms** (one rAF, canvas `playing` in the same
tick as `playCached()`); settle stops at **1455 ms** with **0 lit pixels**;
**0 lit pixels and the RAF stopped** when idle, scrolled out of view *(via the
app's own navbar links — `window.scrollTo` stalls around 910px under Lenis and
leaves the hero still intersecting, which makes a working gate look broken)*, and
tab-hidden; reduced motion draws **exactly 1 frame** in both themes and clears to
0 on pause; mobile 390px gives 20 columns and both zones at the right per-theme
strength.

GPU **0.363 ms/frame** on ANGLE Metal / Apple M2 — **2.2%** of a 16.67 ms budget,
up from 0.307 for 44 dither fills plus 44 translated cap gradients, against the
mask dropping from 21 fills to 3. Bundle 543.80 → **545.23 kB** (+1.43), gz
194.00 → **194.56** (+0.56). CSS **unchanged**. Lint 7 errors / 2 warnings —
the known baseline. No dev diagnostics in `dist`.

Screenshots: `stage7-2-hero-{dark,light}`, `stage7-2-tips-{dark,light}`,
`stage7-2-copy-mask-{dark,light}`, `stage7-2-zoom8x-{dark,light}` (8× nearest
neighbour, where the banding was), `stage7-2-mobile-390-{dark,light}`.

---

### Stage 7.1 — electric palette, taller columns, and a travelling colour wave *(2026-08-25)*

Three asks on top of the rebuild: more glow and more attention, fill more of the
page, and a colour band that travels across the skyline instead of one hue
changing everywhere at once. Plus one piece of live feedback mid-build — *"make
the quality of the bars and the colors more neat, they look a bit opaque"* —
which turned out to be the most useful thing said about this stage.

---

#### 0. What the brief said that was not true of the tree

The brief opened by predicting it would be stale and asking to be checked. It
was, in four places — though notably **not** about the stage number this time,
which it got roughly right.

| Brief said | Tree says |
|---|---|
| "muted/earthy tones (wine, terracotta) will always glow LESS" | **There were no muted or earthy hues in rotation.** Wine and terracotta were deleted in 7c and their last trace, the `BRIEF_PALETTE` export, was deleted in this stage on the brief's own instruction. All seven entries were already at **HSL saturation 91–100%**. |
| The palette reads from "the shared **time-based** palette clock" | It is **not** time-based. It advances **per track** — 7c's deliberate decision, because a wall clock walked the whole palette while one song played. Only the 1.4 s crossfade runs on a clock. |
| "`lighter` blending pushes saturated colors toward white **faster** than muted ones" | **Backwards.** Additive blending clips the *highest* channels first, so a saturated hue — which by definition has one or two low channels — stays chromatic far longer than a pastel, whose three near-equal channels all converge on 255 together. Measured after going *more* saturated: **zero** white-clipped pixels in either theme. |
| The max-height ceiling caps "well short of the hero's full height" | True, but not the number anyone would guess. `MAX_HEIGHT_FRACTION` was 0.62 **of the horizon distance**, and the horizon is itself 0.833 of the canvas. The real figure was "the tallest *possible* column tops out at y=342 in a 900px window" — and since a column only reaches the ceiling on a peak, the *typical* tallest bar sat nearer 450px. Hence "almost at the middle". |

Two things the brief described accurately and which were reused as-is: the
tagline at 46% / crate at 65% of hero height, and the seven-rect mask stack.

**What actually needed fixing about the palette** was not saturation but
**lightness**: aqua `#48D6FF`, violet `#A98CFF`, magenta `#FF6ED4` and coral
`#FF8A6B` all sat at L 71–81%, which is where a fully saturated hue starts
reading as a pastel.

---

#### 1. The palette

| | old | new | why |
|---|---|---|---|
| mint | `#7CF9DE` | `#7CF9DE` | kept — explicitly requested and liked |
| aqua → cyan | `#48D6FF` (L 64%) | `#00E5FF` (L 50%) | electric turquoise |
| — → azure | — | `#4C7DFF` | the ring had **no true blue**; cyan→violet was a 75° gap, the widest on the wheel |
| violet | `#A98CFF` (L 77%) | `#9B4DFF` (L 65%) | lavender → electric violet |
| magenta | `#FF6ED4` (L 72%) | `#FF2BC0` (L 58%) | pink → hot magenta |
| coral → orange | `#FF8A6B` (L 71%) | `#FF6B15` (L 54%) | salmon → vivid orange |
| lime → chartreuse | `#B4FF6B` (L 71%) | `#C6FF29` (L 58%) | pastel → chartreuse |
| gold | `#FFC94D` | *removed* | warm coverage carried by orange alone |

Hue gaps around the new ring: 19° / 37° / 43° / 52° / 64° / 54° / 91°.

**The luminance targets had to move with it, and this is the part that would
have quietly undone the whole change.** A saturated hue is *darker* than its
pastel version — that is most of what "electric" means. The new entries land at
luminance 0.195 (violet), 0.234 (azure), 0.268 (magenta) and 0.318 (orange),
**all below the old peak-band floor of 0.34**. Left alone, the band would have
lifted five of seven straight back into pastels.

So the dark band went from `{0.34, 0.78}` to **`{0.18, 0.85}`** — wide enough
that **all seven authored hexes now pass through untouched**. And the base
target had to come down with it, from 0.16 to **0.085**: at 0.16 the base would
have been *brighter* than violet's own peak (0.195), inverting the gradient for
two of the seven. A darker footing also makes the lit tip pop harder, which is
the actual ask.

`BRIEF_PALETTE` — the wine/slate/mint-pale/amber/terracotta list kept as an
exported constant in the rebuild so its rejection stayed checkable — is
**deleted**, as instructed.

---

#### 2. "More glow" was the wrong lever, and the live feedback caught it

The first pass at more glow did the obvious thing: a second additive halo pass
at a wide radius, and a higher alpha ramp. Rendered, it read as **opaque** — the
lower half of the hero filled in as one solid pane of violet with the gaps
between columns closed.

The cause is worth stating because it inverts the intuition. `globalAlpha` caps
at 1, so once a single glow pass was already at 0.9 there was no headroom left;
the only way to add more glow was to add more *alpha*, and alpha is coverage,
not brightness. **A neon tube is not a bright rectangle — it is a thin hot line
with a close halo, and what makes it read as light rather than paint is the dark
gap beside it.** More glow and more opacity are opposite moves.

Four changes, all pulling the other way:

| | before | after |
|---|---|---|
| glow buffer scale | 1/6 | **1/4** — the upscale's own smoothing is part of the blur, and at 1/6 it spread ~6 CSS px before `filter` added anything |
| tight halo blur | 3.5 px | **2 px** |
| wide halo blur / share | 9 px @ 0.62 | **6 px @ 0.34** — atmosphere, not brightness |
| body alpha ramp (peak → base) | 0.34 → 0.72 | **0.22 → 0.50** |
| gap between columns | 0.16 of slot | **0.22** |

And one addition: a **tip cap** — a 3px bar of the peak colour at alpha 0.92 at
each column's *own* top.

That cap exists because of a real limitation in the shared-gradient design,
worth recording. Every column samples one gradient spanning the full height
range, which is what makes height map to colour — but it also means a column's
tip lands wherever its height puts it, and **only a full-height column ever
reaches the bright end**. Short columns were all base colour, all the time. A
cap at each column's actual top gives every one of them the same crisp lit edge
regardless of height. It is the one part of an analyser's look that cannot come
out of a shared vertical ramp.

Light theme needed one more thing: an `alphaScale` of **1.5**. On a near-black
page a translucent column still reads as light, because anything above the
background is visible; on a near-white page the column has to be *darker* than
the background to exist at all, and the ramp that looks like neon on black
measured as a watermark on white — light-theme columns faded out entirely above
their lower third.

**White clipping, measured at a loud moment, both themes:** `fullWhiteFraction`
**0**, `nearWhiteFraction` **0**, `desaturatedFraction` **0**, over ~2.1M lit
pixels. Tip-cap saturation stays at 70–84%. The brief's premise for this check
was inverted (see §0) and the check confirms it: going *more* saturated removed
whatever white-clipping risk there was.

---

#### 3. Filling the page — a ceiling derived from the navbar

**Stated target: the tallest possible column tops out 28px below the navbar's
bottom edge.**

Not a fraction, because the thing the ceiling actually has to clear is the nav
links, and their position is a measured constant on this site. Every other
element in the hero is protected by a safe zone; the nav links are protected by
geometry alone — they sit above the gradient's transparent end, and have
measured "never reached" through the whole rebuild. That property is worth
keeping by construction rather than by luck.

| | rebuild | 7.1 |
|---|---|---|
| `maxHeightFraction` (desktop) | 0.62 | **0.809**, derived |
| tallest column's top, in a 900px window | y=342 | **y=172** |
| share of visible height | 62% | **81%** |
| clearance below the navbar | 174px | **28px**, by construction |
| mobile (390×844) | — | **0.839** derived, baseline 0.841 |

---

#### 4. The travelling wave

Every column now samples the palette ring at **its own position** — the shared
position plus a spatial offset from its horizontal index — so a band of colour
travels across the skyline instead of one hue changing everywhere at once.

It lives in `palette-cycle.js`, not the renderer, which is what that module
exists for. Two constants, both expressed in **palette entries** rather than
pixels or hues so they stay meaningful if the palette changes size:

- **`WAVE_SPAN_ENTRIES = 1.15`** — how much of the ring is visible across the
  full hero width. A little over one palette step end to end, which reads as one
  travelling band; above ~2 it stops looking like a wave and starts looking like
  a test pattern.
- **`WAVE_SPEED_ENTRIES_PER_SECOND = 0.14`** — one step every ~7.1 s, so a given
  hue takes about 8.2 s to cross the hero. A lava-lamp drift, deliberately far
  slower than the columns' own audio-driven motion so the two never compete.
- **Direction: continuous, one-directional, left to right.** Not a ping-pong —
  a bounce has two turning points where the motion visibly stops and reverses,
  and on a ring, where the last hue is adjacent to the first, there is no seam
  that would justify one.

**Implementation note that matters for cost.** A per-column gradient means a
shared one no longer works, and building 44 gradients per frame in two contexts
is ~264 `addColorStop` calls every frame. Instead the ring is **tiled once**
into a fixed set of gradients at positions that never move (24 buckets per
palette entry, 168 total), and the wave travels by each column picking a
different bucket — an add, a multiply and a floor. Rebuilt only on a theme flip
or a resize.

The palette's internal position also became **continuous** to support this: an
unbounded step counter rather than an index modulo 7, because a counter that
wraps 6 → 0 makes the crossfade run *backwards* through the whole ring on that
one transition. Wrapping now happens at sample time, where it is a lookup rather
than a direction.

**Measured travel** (heights frozen so colour is the only variable):

| frame | ring position | col 0 | col 22 | col 43 |
|---|---|---|---|---|
| 0 | 2.012 | 49 | 63 | 76 |
| 1 (+2s) | 1.497 | 36 | 51 | 64 |
| 2 (+4s) | 0.983 | 24 | 38 | 52 |
| 3 (+6s) | 0.503 | 13 | 27 | 40 |
| 4 (+8s) | 0.009 | 1 | 15 | 28 |

Column 0 drifted **−0.137 entries/s** against the **0.14** constant. The spatial
spread held at **27–28 buckets = 1.15 entries**, exactly the span constant. The
screenshots `stage7-1-wave-travel-0..4.png` are these five frames.

**Both axes compose**, measured from rendered pixels rather than asserted:

| axis | measurement |
|---|---|
| horizontal (tip caps across the hero) | hue travels **57°** dark / **56°** light — 266° → 326° |
| vertical (inside one column, tip → foot) | hue **270° → 226°**, alpha **11 → 195** |

Neither overrides the other: a column has a dark-to-bright vertical ramp, and
its neighbours have the same ramp in an adjacent hue.

**Reduced motion shows a fixed reference state, not a frozen instant.** The wave
is sampled at `t = 0`. A frozen instant would show whatever phase the wave
happened to be in when the visitor pressed play, so the one frame a
reduced-motion visitor ever sees would depend on timing they cannot perceive or
repeat. The **spatial** half is fully present — columns still sample different
ring positions by index — so the static frame carries the same colour band the
animated one does; only the travel is removed. Verified: per-column bucket
**deltas** are byte-identical across two cold loads (`1 0 1 1 0 1 0`). The
palette's *starting* position still varies per visit, which is the clock seed
that has been there since 7c and is unrelated to motion.

---

#### 5. The masks had to grow, and then change shape

The brief flagged this and was right. The rebuild's zone strengths were tuned
against a 0.62 ceiling, where the headline sat near the **transparent top** of
the gradient and needed almost nothing. At 0.809 the same band of the hero
carries full-height column bodies, their tip caps at alpha 0.92, and both glow
passes.

| dark theme | rebuild | at the new ceiling, old zones | shipped |
|---|---|---|---|
| headline | 12.62:1 | **2.68:1** | **12.50:1** |
| tagline | 5.29:1 | **2.62:1** | **6.74:1** |
| crate input | 10.71:1 | 12.21:1 | **12.68:1** |

Strengths went headline 0.34 → **0.80**, tagline 0.50 → **0.78**, crate 0.55 →
**0.60**. But at that strength **the zones became visible** — a soft oval of
dimmed columns behind the headline with brighter columns either side, which is
exactly the smudge the rebuild's three-attempt falloff work existed to avoid.

**The fix was shape, not strength: every zone is now a full-width band.** A box
has left and right edges, and at 0.8 they are plainly visible. Extending each
zone across the whole canvas leaves only the *vertical* falloff, which has no
shape to notice — it reads as atmospheric haze at that height rather than as a
hole around the type. The feather widened 64 → **96px** to match. It costs a
little brightness on the right-hand side, where the deck sits on top of the
columns anyway.

**Final contrast, worst pixel of 90 frames:**

| | headline | tagline | crate input | nav link |
|---|---|---|---|---|
| dark | **12.50:1** | **6.74:1** | **12.68:1** | never reached |
| light | **14.92:1** | **7.05:1** | **10.06:1** | never reached |

---

#### 6. Measurements

| Check | Result |
|---|---|
| Palette, dark theme | **all 7** authored hexes pass through the band untouched |
| Ceiling | **0.809** desktop / **0.839** mobile, derived from the navbar; tallest column at **y=172** of a 900px window (**81%** of visible height, from 62%) |
| Navbar clearance | **28px**, by construction |
| Wave travel | **−0.137 entries/s** measured against a 0.14 constant |
| Wave span | **27–28 buckets = 1.15 entries** across the hero, matching the constant |
| Horizontal hue travel | **57°** dark / **56°** light across the hero width |
| Vertical hue + alpha, one column | **270° → 226°**, alpha **11 → 195** |
| White clipping, loud moment | **0** full-white, **0** near-white, **0** desaturated, of ~2.1M lit pixels, both themes |
| Text contrast, dark | headline **12.50:1**, tagline **6.74:1**, crate **12.68:1** |
| Text contrast, light | headline **14.92:1**, tagline **7.05:1**, crate **10.06:1** |
| Reveal | canvas `playing` in the same tick as `playCached()`; first paint **+21.4 ms** (one rAF) |
| Settle after pause | RAF stopped after **985 ms**, canvas **0 lit pixels** |
| Idle / out of view / tab hidden | **0 frames, 0 lit pixels** |
| Reduced motion | exactly **1 frame**, 0 advanced over 2.5 s, wave frozen, bucket deltas identical across cold loads |
| GPU cost per frame, M2 | **0.307 ms** against a 16.67 ms budget (**1.8%**) — up from 0.228 ms for 44 per-column fills, 44 tip caps and a second halo pass |
| Bundle | 542.63 → **543.80 kB** (+1.17 kB), gz 193.53 → **194.00 kB** (+0.47 kB) |
| CSS | **unchanged** — nothing in this stage touches SCSS |
| Lint | 7 errors / 2 warnings — unchanged baseline |

---

#### 7. Still not built

**The perspective vanishing-point grid** remains the named follow-up from the
rebuild, unchanged and deliberately not started.

---

### Stage 9 — minimal Postgres logging: plays, search clicks, contact messages *(2026-08-25)*

Requested off live feedback that recommended tracking who's using the turntable
and the crate. Scoped down in the same conversation to exactly three things,
each confirmed rather than assumed: **plays** (record selected from the crate,
not pause/resume), **search clicks** (the term that led to a pick, not every
debounced keystroke), and **contact messages** (durable copy, independent of
whether Resend delivers). Owner-only — no public panel, no UI. A public "what's
been played" panel was raised and deliberately deferred, not built; see §8
below for what it would need if picked up later.

**Infrastructure.** A Postgres service already existed in the Railway project
(`Postgres`, alongside `client` and `server`). Wired with the Railway CLI:

```
railway variable set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' --service server --skip-deploys
```

This is a *reference* variable, not a copied value — it resolves to
`postgres.railway.internal`, Railway's private network address, so the
connection never leaves their infrastructure and carries no egress cost. `pg`
8.23 is the one new dependency (`server/package.json`).

**The guarantee everything else depends on.** `server/db.js` exports three
functions (`recordPlay`, `recordSearchClick`, `recordMessage`), and every one
of them is a no-op if `DATABASE_URL` is unset — checked once, at the top of
`safeWrite()`. `npm run dev` has never required Postgres and still doesn't;
verified by hitting `/api/events/play` and `/api/events/search-click` locally
with no `DATABASE_URL` set at all: both returned `204` with nothing in the
server log. Schema creation is lazy (first write, not server start) and
memoized, so a server that gets zero visitor actions never opens a connection.

**No raw IP is ever stored.** `server/visitor.js` hashes
`sha256(ip + User-Agent + day)`, truncated to 16 hex chars — the cookieless
model Plausible/Fathom use. It groups one visitor's actions together and lets
you count distinct visitors without keeping anything reversible to an address,
and the daily rotation means rows from different days can't be joined into a
longer history. Country comes from Cloudflare's `CF-IPCountry` header, already
sent on every request for free. Device (`mobile`/`tablet`/`desktop`) and
browser (`Chrome`/`Safari`/`Firefox`/`Edge`/`Opera`/`Other`) are both a
handful of regexes against the User-Agent — no new dependency, no
`ua-parser-js`. iPad is checked before the mobile regex, since recent iPadOS
UAs contain "Mobile" and would otherwise misclassify.

**The play/resume distinction reuses machinery that already exists.** The
naive hook point is `record-crate.jsx`'s selection handler — but that fires
the instant a result is clicked, before the audio has even started decoding,
so a dead preview URL would log a play that never played. The accurate signal
is the `deck-state.js` edge to `PLAYING`, and specifically the
`previous !== DECK.PAUSED` condition `skyline-background.jsx` already uses (to
decide whether to reset ballistics for a genuinely new track vs. a resume).
`home.jsx` now subscribes to that same edge for the play beacon — a resume
from pause is excluded by construction, not by a special case:

```js
useEffect(() => onDeckState((next, previous) => {
    if (next === DECK.PLAYING && previous !== DECK.PAUSED) {
        reportPlay(nowPlayingRef.current);
    }
}), []);
```

A ref rather than reading `nowPlaying` directly: the listener is registered
once, so a closure over the state variable would freeze on whatever was
current at mount, not the track actually loaded when the edge later fires.

**Search clicks** log from the one place that already has both the term and
the picked result in scope — `record-crate.jsx`'s `selectTrack`, one line
added right where it already calls `onSelect?.(track)`. Every keystroke of the
400ms-debounced search is deliberately NOT logged; only the click/Enter that
picks a result is.

**Contact messages** are recorded in both branches of `/api/contact` — a
successful Resend send and a rejected one — because the point is "who tried to
reach the owner," not only "who reached them successfully." Fire-and-forget in
both cases, after the response-determining logic has already run, so a slow or
failing insert can never delay or fail the response the visitor is waiting on.

**Schema:**

```sql
plays         (id, at, track_id, title, artist, visitor, country, device, browser)
search_clicks (id, at, term, track_id, title, artist, visitor, country, device, browser)
messages      (id, at, name, email, message, resend_id, delivered, visitor, country, device, browser)
```

**Verification.** Lint 7 errors / 2 warnings — unchanged baseline (the one
`record-crate.jsx` error, `onSelect` missing prop-types, predates this change —
confirmed by linting the pre-change file directly). Build clean; bundle
545.23 → **545.85 kB** (+0.62 kB) for `telemetry.js` and its two call sites.
Both new endpoints return `204` locally with `DATABASE_URL` unset, no server
log output. Live-endpoint and row-level verification against the deployed
Railway Postgres instance is in the commit that follows this entry.

**Read access:** Railway's own dashboard query console against the `Postgres`
service — no code, no route, no UI. `railway connect Postgres` works too, from
a machine with an SSH key already registered.

---

#### 8. If a public "what's been played" panel is ever built

Raised in the same conversation and deliberately not built now. Two things
would need deciding first, not just a new route:

- **Plays are safe to show** — track/artist come from Apple's own catalog data,
  already public. **Raw search terms are not** — an unmoderated text field
  rendered back to every visitor of a live job-search site is a different risk
  than an owner-only table, and someone will eventually type something not
  meant for a recruiter to read. Keep `search_clicks` private-side only; a
  public panel would read from `plays` alone.
- A public read needs its own endpoint (`GET /api/plays/recent` or similar)
  with its own response shape — the `plays` table's own columns are not
  something to expose as-is (`visitor` is a hash, not for public display, and
  serving it teaches nothing but wastes a column).

---

### Stage 3 Task 9 follow-up — horizontal scroll/swipe on the Experience filmstrip *(2026-08-26)*

Live feedback: the pinned filmstrip only responded to vertical scroll input,
and a visitor's natural instinct — swipe/scroll SIDEWAYS through content
presented sideways — did nothing at all. That silent no-op is what actually
made the section feel like it "constrains the user from scrolling down to the
other sections": the only way through a pin whose full traversal is
`scrollDistance + ENTRY_BUFFER` px was persistent vertical scrolling, because
the shorter, more direct gesture wasn't wired to anything.

**Root cause, confirmed by reading `lenis.mjs` rather than guessed at.**
Lenis's default `gestureOrientation` is `"vertical"`, which reads only
`deltaY` in its scroll-delta calculation — a horizontal trackpad swipe
produces a large `deltaX` and a near-zero `deltaY`, so it contributed nothing.

**Desktop/trackpad fix — one Lenis option, zero code in `experience.jsx`.**
`gestureOrientation: "both"` (`smooth-scroll.jsx`) makes Lenis pick whichever
axis dominates a given wheel event and feed it into the same real scroll
position every `ScrollTrigger` already reads. Experience's pin/scrub needed no
changes at all — it's driven by the existing
`lenis.on("scroll", ScrollTrigger.update)` wiring. Verified: a
horizontal-only wheel gesture moved the filmstrip track **1754px**, comparable
to (in this case further than) an equivalent vertical gesture's **1254px**.

**This is a WHEEL-only fix, and that was a deliberate boundary, not an
oversight.** `syncTouch` stays at its default `false`, so touch events never
reach the `gestureOrientation` branch at all (gated behind
`syncTouch && isTouch || smoothWheel && isWheel` in the same file) — meaning
Lenis's own touch handling is completely unaffected by this change. That
matters because Lenis leaves touch scrolling **native** by default
specifically because OS touch-scroll physics already feel better than
anything rebuilt on top of them; turning that off globally (`syncTouch: true`)
to get the wheel fix's benefit on touch too would have changed scroll FEEL on
every mobile section, not just this one — confirmed by reading what
`syncTouch: true` actually changes (1:1 tracked touch-driven `scrollTo()`
instead of the browser's own momentum/rubber-banding) before ruling it out,
not assumed.

**Mobile fix — a few lines scoped to exactly one viewport.** `experience.jsx`
now talks to the live Lenis instance directly (`lib/scroll.js`'s
`getActiveLenis()`, already exported for exactly this kind of cross-module
access) via a `touchstart`/`touchmove` listener on `.experience-viewport`.
The gesture's axis is decided once, on the first move of each touch (not
re-decided mid-drag, matching how native gesture recognizers behave): if
horizontally dominant, it computes a per-step delta with the same sign
convention Lenis's own touch code uses internally
(`deltaX = -(clientX - start)`, so dragging left is "forward", matching what
scrolling down already means everywhere else on the page) and calls
`lenis.scrollTo(lenis.scroll + stepDx, { immediate: true })`. A
vertical-dominant drag over the same element does nothing extra and falls
through to the untouched native path. Verified: a horizontal touch swipe moved
the track **1280px**; a vertical touch drag over the same viewport still moved
`window.scrollY` normally (**1608 → 2482**), confirming the native path is
unaffected.

**The "constrains from scrolling down" complaint, directly verified.** 40
horizontal swipes over the mobile filmstrip released the pin and continued
scrolling into `#my-taste` (measured: `window.scrollY` reached 3671, with
`#my-taste`'s own top edge already inside the viewport) — a fast, intuitive
way past the section now exists, not just the one path that made it feel like
a trap.

**No-regression check on `#my-taste`'s two native horizontal
scroll-snap rows** (`.my-taste-wall`, `.my-taste-track-scroll`, mobile-only —
the site's ONLY other horizontal-scroll UI, confirmed by grepping for every
`scroll-snap-type: x` in `main.scss`). `gestureOrientation: "both"` applies to
wheel input everywhere, not just Experience, so without an opt-out a trackpad
hover-swipe over either row would also register as a horizontal-dominant wheel
gesture and try to move the whole page. Both now carry
`data-lenis-prevent-horizontal`, Lenis's own documented mechanism for exactly
this — checked per-event, so it only excludes horizontally-dominant gestures
over that element and leaves the row's own vertical-scroll-passthrough (if
any) untouched. Verified: 4 horizontal touch swipes over `.my-taste-wall`
moved its own `scrollLeft` (20 → 371) while `window.scrollY` did not move at
all (4165 → 4165, exactly).

**Verification method, worth recording because it caught two false starts.**
Testing this required real gesture simulation, not `element.scrollIntoView()`
— that call bypasses Lenis's virtual scroll entirely, so `ScrollTrigger` never
sees the position change and the pin never engages (same class of pitfall
`harness.mjs`'s own comments already document for `window.scrollTo` under
Lenis). Navigating via the app's own nav links, exactly like a real visitor,
fixed it. Touch simulation had its own trap: a hand-rolled
`new TouchEvent(..., { touches: [new Touch({...})] })` dispatched via
`element.dispatchEvent()` threw inside the app's own code (destructuring
`clientX` off what the browser treated as an empty touch list) — Chromium's
gesture layer doesn't treat a bare `dispatchEvent` as a genuine touch stream.
Switching to CDP's `Input.dispatchTouchEvent` (what Playwright's own touch
support is built on) fixed it.

Lint 7 errors / 2 warnings — unchanged baseline. Build clean, +0.62 kB.

---

#### Same-day addendum — the actual "constrains scrolling down" cause was pin LENGTH, not gesture axis

Live feedback right after the fix above shipped: *"when I scroll down it still
displays to the right, whenever I scroll down I want to go down to the other
section."* The horizontal-gesture fix was working correctly — this was the
same complaint from a different, bigger cause underneath it that the gesture
fix never touched.

**Measured, not assumed, and the number explains the whole complaint.** The
pin's `end` was `"+=" + (scrollDistance + ENTRY_BUFFER)`, where `scrollDistance`
is `trackW - viewportW` — the exact pixel width six photo cards happen to
occupy. That variable was doing two unrelated jobs at once: how FAR the track
travels visually, and (via `duration: () => scrollDistance` on all three
scrubbed tweens) how much REAL scroll it costs to get there — a literal 1:1
pixel mapping. Measured on a 1440×900 window: `scrollDistance` was 2568px, the
pin-spacer this section inserts was 3544px tall, against an 8105px document —
**this one six-card section was consuming 43.7% of the site's entire
scrollable height.** One generous natural scroll gesture (~720px of wheel
input) advanced the filmstrip only 18.5%; clearing the section took roughly
**six** such gestures. That is "when I scroll down it still displays to the
right" exactly: ordinary scrolling wasn't broken, it was just being asked to
do six times more work than any other section on the page ever asks for.

**Fix: decouple real-scroll-cost from visual-travel-distance.** The track
still travels the full `scrollDistance` — every card is still reachable,
nothing about the visual layout or the snap-to-nearest-card behavior changes.
A new `pinScrollLength`, tied to **viewport height** rather than to how wide
six photos happen to be, now drives `end` and all three tweens' `duration`
instead. `scrollDistance` is a fact about the *content* (a seventh entry
grows it); `pinScrollLength` is a fact about how much scrolling feels
reasonable to ask for, which is a property of the viewport, not the
filmstrip.

The snap function needed rewriting alongside it, not just repointing at a new
variable — its old pixel-space math (`px = value * total; cardIndex =
Math.round(cardPx / (scrollDistance / (entries.length - 1)))`) relied on the
1:1 mapping that no longer holds once `pinScrollLength` and `scrollDistance`
diverge. Rewritten in **progress-fraction space** instead, which needs no
pixel measurement at all: cards are evenly spaced (fixed width/gap), so
they're evenly spaced across the scrub's progress fraction too, and "which
card is nearest this progress" is answered directly.

**The multiplier, tried at two values before landing:**

| `PIN_LENGTH_VH_MULTIPLIER` | pin-spacer height | % of page scroll | natural swipes to clear |
|---|---|---|---|
| 1.4 (tried first) | 2236px | 32.9% | ~3 |
| **1.0 (shipped)** | **1876px** | **29.1%** | **~2** |

1.0 was picked over the more conservative 1.4 because it's independently
checkable on its own terms — "scrolling past this section costs about as much
as scrolling past one screen of content" is a real claim, not just a ratio
that happened to score better than the original. Down from 43.7% to 29.1% of
the entire site's scroll length, and from ~6 gestures to ~2.

**Verified against everything the previous fix already established, not just
the new number in isolation:**

| Check | Result |
|---|---|
| Snap still lands correctly, progressing through cards | index 0 → 3 → 5 (last) across three wheel bursts, held at 5 (fully scrolled) on further input — no misalignment |
| Horizontal wheel still works against the shorter pin | reaches full traversal (`track.x` = `-scrollDistance` exactly) |
| Horizontal touch still works against the shorter pin | moved the track 1601px (mobile) |
| `#my-taste`'s snap rows, still unaffected | `scrollLeft` 20 → 371 natively; `window.scrollY` **unchanged**, exactly |

Lint 7/2 unchanged baseline. Build clean, +2.0 kB JS / +2.0 kB CSS — larger
than the previous entry's own delta because this local dev build also
included in-progress, uncommitted work on `connect.jsx`/`main.scss` from a
concurrent editing session; that work is untouched by and unrelated to this
fix, and was deliberately left out of the commit that ships this change.

---

#### Second same-day addendum — "scroll on mobile devices looks extremely choppy and slow"

Live feedback right after the pin-length fix above shipped. This one wasn't
the pin or Lenis — it was the horizontal-touch listener itself, from the very
first addendum in this entry.

**Root cause: a registration-time property, not a per-event one.** The
touch-drag code registered `touchmove` as `{ passive: false }` up front, for
the entire gesture, so it could call `preventDefault()` once a drag turned
out to be horizontal. But `passive` is decided once, when the listener is
attached — not re-decided per event. A non-passive `touchmove` listener
forces the browser to run it synchronously and wait for the result **before
committing every touchmove frame to the compositor**, for the gesture's whole
duration, even on the calls that end up doing nothing (`return`, vertical).
Every visitor's finger crosses `.experience-viewport` on the way past
Experience — now a full viewport-height of scroll thanks to the pin-length
fix above — so every ordinary vertical scroll through the section was paying
a synchronous main-thread round-trip per touch sample it never needed. That
reads exactly as "choppy," and only near/through Experience, which lines up
with the complaint landing right after the horizontal-swipe feature shipped.

**Fix: don't decide passive-vs-not until the gesture is classified.** Now
`touchstart` arms a **passive** listener whose only job is reading the first
`touchmove` sample to classify the gesture's axis. A vertical gesture removes
it and attaches nothing further — zero blocking listener for the rest of that
drag, identical to how the section behaved before this feature existed. Only
a gesture that's actually horizontal escalates to a real, non-passive
listener, scoped to that one gesture and torn down on `touchend`/
`touchcancel`. Trade-off: a horizontal drag's very first move sample can't be
prevented (classification hasn't happened yet), so it passes through
unprevented — a one-sample passthrough on the gesture this feature is
actually for, not on the vertical scrolling everyone else does.

**Verified, via CDP `Input.dispatchTouchEvent` (same method as the first
addendum):**

| Check | Result |
|---|---|
| Horizontal touch drag still drives the filmstrip | `track.x` moved 0 → −313.7px |
| Vertical touch drag over the same viewport still scrolls the page | `window.scrollY` moved 1608 → 1957 (349px) |
| Wheel-driven scrub (desktop path, untouched by this fix) | still scrubs correctly through the timeline |
| Page errors during any of the above | none |

A synthetic full-page touch-scroll trace (CPU-throttled 4×, longtask +
`requestAnimationFrame`-delta instrumented) did **not** reproduce a measurable
frame-time gap between Experience and any other section — expected, and
recorded rather than hidden: CDP-injected touch events don't exercise the
same compositor-thread passive-listener scheduling real hardware touch input
does, so this class of jank doesn't show up in a headless harness regardless
of which side of the fix is running. The mechanism itself (non-passive
`touchmove` blocking compositor scroll commits for a gesture's full duration)
is well-documented browser behavior, and matches the reported symptom and its
timing exactly; the fix removes the hazard without changing the
horizontal-swipe feature's behavior at all.

Lint 7/2 unchanged baseline. Build clean (this local build also reflects the
same unrelated, concurrent `connect.jsx`/`main.scss` WIP noted above).

---

### Stage 3 Task 1 revision — `#connect`: cassette J-card guestbook note, optimistic send *(2026-08-26)*

A revision of the original Task 1 brief (form structure + Resend wiring),
not a fresh build — re-read `connect.jsx`/`walkman.jsx`/`server.js` fresh
per the revision's own explicit instruction before touching anything, since
Stage 3's actual Tasks 11/11.2/12/12.1–12.5 (all landed since the original
Task 1) meant the live code and the brief's own framing had drifted apart.

**Discrepancies flagged before implementing, per the working agreement:**
the brief described the compose box as if it didn't exist yet ("styled as a
cassette J-card... not the cassette body") — it already existed as
`.message-cassette`, just shaped as three separate stacked elements (a
boxed name/email row, a squarer message box, a plain `.submit-button`)
rather than one unified card. Email was a real, required field both sides
(`formData.email`, `server.js`'s `validateContact`, used as the Resend
`replyTo`) — dropping it to make this a one-way guestbook note is a coupled
frontend+backend change, not the frontend-only field tweak the brief's own
"only changes the front-end form design and field set" line implied. And
the send was not optimistic — `handleSubmit` awaited the Resend round trip
before the walkman takeover ever started.

**What shipped:**
- **The J-card** (`connect.jsx`/`main.scss`) — one tall/narrow card (name
  strip on top, a dominant auto-growing message body, a record-tab submit
  at the bottom) replacing the three old pieces. Reuses this section's own
  fixed `--cassette-*` tokens (unchanged by theme, same reasoning as
  `--lcd-*`/`--vinyl-N`) and one of `#my-taste`'s own torn-edge clip-path
  point sets (`.my-taste-card--tear-1`) rather than a new shape language.
  The whole card is now the Flip flight source (`cassetteRef`/
  `data-flip-id` moved from the old message-only box to the card root, per
  a direct decision during planning) — Flip morphs the tall/narrow card
  rect straight into the walkman bay's landscape rect with no new code;
  it's a plain rect morph regardless of source aspect ratio.
- **Interaction polish, all GSAP, reusing established eases** — DrawSVGPlugin
  draws the name field's hand-drawn underline in on focus (first use of
  that plugin in this file); `CustomWiggle`'s existing `pinSnap` ease (My
  Taste's own tape-snap) drives the invalid-field shake; the submit tab
  gets a real press/release (`onPointerDown`/`Up`/`Leave`), releasing back
  out via the walkman's own `WALKMAN_POP_EASE` — a deliberate continuity
  choice tying the compose card's motion to the device it feeds into; the
  message field auto-grows with content (measure-then-tween, `overwrite:
  "auto"` so fast typing can't stack tweens) instead of snap-resizing.
- **Optimistic submit** — `runSendSequence` now fires synchronously right
  after client-side validation passes, not after `await axios.post(...)`
  resolves. The network call runs separately; its `.catch()` sets a new
  `sendFailed`/`sendFailedMessage` pair that renders a small dismissible
  banner above `.walkman-stage` (reusing `.contact-error`'s own visual
  language) — never touching the animation, which has already played by
  the time a failure could arrive. This collapses the send-level state
  machine from `idle | sending | sent | error` to effectively `idle |
  sent` — flagged as a real behavior change, not silently dropped: nothing
  on screen waits for the network anymore, so there's no "sending" state
  left to show, and the button's old `disabled`/"Sending…" branch is gone.
- **Both fields validate client-side now** (previously only the message
  did; name/email were server-only). Empty submit shakes/highlights
  whichever field(s) are invalid and moves focus to the first one.
- **`server.js`** — `validateContact` drops `email` entirely (no `EMAIL_RE`,
  no length cap); the Resend call drops `replyTo` (nothing to reply to);
  `recordMessage` passes `email: null` explicitly at both call sites (the
  `pg` driver rejects a bare `undefined` param; `messages.email` stays in
  the schema, nullable, no migration needed).

**Real bugs found live during verification, not assumed away:**
1. **`.jcard` rendered ~190px wide, ignoring its own `max-width: min(320px,
   90%)` entirely.** Root cause: `margin: 0 auto` on a flex item cancels
   `align-items: stretch` outright (an `auto` cross-axis margin absorbs the
   stretch space instead of the box growing) — the card fell back to
   shrink-to-fit sizing. Fixed with `width: 100%` (gives it a definite size
   to clamp) + `align-self: center` (positions the clamped result) instead
   of the auto margins.
2. **The message field was completely unstyled** — the `<textarea>` was
   missing `className="jcard-textarea"` outright, so none of `.jcard-
   textarea`'s rules (including the `box-sizing: border-box` fix carried
   forward from `FINDINGS.md`'s B42) ever applied. Caught by a `taRect:
   null` in a direct DOM query, not by eyeballing a screenshot.
3. **First-pass proportions read wider than tall** (436×352, h/w 0.81) once
   bug 1 was actually fixed — `max-width: 400px` paired with the textarea's
   original 200px `min-height` came out landscape, the opposite of "reads
   as a vertical object." Retuned together (max-width 320px, textarea
   min-height 280px) to 356×529, h/w 1.49 — verified at all five
   breakpoints down to 390px, all identical (the 320px cap wins over `90%`
   at every currently-supported width).
4. **Both fields were a blank void at rest** — the underline (undrawn by
   design pre-focus, `drawSVG: "0%"`) and the borderless textarea gave no
   visual signal a field existed there until it happened to be focused.
   Fixed with `placeholder` text on both fields and a static CSS dashed
   `border-bottom` under the name input as the always-visible rest-state
   line — DrawSVGPlugin's solid draw-in now arrives ON TOP of that dashed
   line on focus, rather than being the field's only affordance.

**Verified — 40 Playwright checks, all passing:**
fit-ratio + pin-not-stuck at 1440/1024/768/480/390px (real wheel-scroll,
not nav-click, so the entry pin's actual engage/release is exercised, not
bypassed); empty-submit validation independently and together, with focus
landing on the first invalid field; a delayed-route interception proving
the walkman takeover starts and the compose form unmounts within 300ms of
the click, while the network response is still deliberately held open;
sequence settles correctly once the (late) response arrives; a forced
502 on a second send shows the takeover still plays in full and the
failure banner appears afterward without touching it, dismisses cleanly,
and doesn't linger after a subsequent successful send; full keyboard-only
pass (name → message → submit, Enter submits); `prefers-reduced-motion`
still short-circuits straight to the settled end state with no shake/
press/draw-in motion.

Lint unchanged, 7/2. Measured bundle (this build also includes the
concurrent, now-committed Experience filmstrip fixes above, which are
JS-only/no-CSS — the CSS delta below is attributable to this task alone):

| | Stage 7.2 baseline | Now |
|---|---|---|
| CSS bundle | 54.82 kB / 11.19 kB gz | **56.99 kB / 11.50 kB gz** |
| JS bundle | 545.23 kB / 194.56 kB gz | **548.88 kB / 195.66 kB gz** |

---

### Stage 3 Task 1 revision, follow-up — `#connect`: J-card actually reads as a cassette, email back (optional), button press fix *(2026-08-27)*

Direct feedback on the task above, same day: the J-card's torn-edge/pinned-
tape treatment read as a corkboard flyer, not a cassette insert; email
should come back but optional, styled to fit; the submit button's
background visibly (and abruptly) changed on click; and the submit
control should read more like a physical tape control than a plain dot.

**J-card restyle.** Removed `.jcard`'s hand-torn `clip-path` (borrowed from
`.my-taste-card--tear-1`) and `.jcard-tape` (the pinned-tape accent) —
both are `#my-taste`'s own corkboard material language, not a cassette
case's. Replaced with what an actual J-card has: clean 6px corners (a
case's own precise cut, not a soft "paper" radius), a `.jcard-spine`
band — a flat, slightly darker strip pulled to the card's true edges via
negative margins, with one crease shadow — standing in for the real fold
where a J-card wraps the cassette's spine before flattening onto the front
panel, and a static diagonal sheen (`.jcard::after`, a `linear-gradient`
at low opacity) suggesting the insert viewed through the case's own clear
plastic window. `.jcard` gained `overflow: hidden` to clip both the
spine's square corners and the sheen to the card's own rounded silhouette
— free, no extra radius needed on either.

**Email, back and optional.** `EMPTY`/`formData` regained `email`; a new
`.jcard-email-strip` (identical treatment to name — dashed rest-state
underline, DrawSVGPlugin draw-in on focus, own `emailError`/shake) sits
directly under name, both grouped in a new `.jcard-header` wrapper with a
tighter internal gap so they read as one "from" line rather than two of
the card's three sections. Labelled "Email *(optional)*" — the tag styled
quieter (normal case/weight) than the shouty uppercase label beside it, so
it reads as permission, not a second requirement, per the explicit "don't
make people hesitate to send" ask. Validated client-side only when
non-empty (`EMAIL_RE`, new); a blank field is never an error. `server.js`'s
`validateContact` mirrors this exactly — email optional, format-checked
only if present — and the Resend call's `replyTo`/message body go
conditional on `value.email` instead of being unconditionally absent.
`recordMessage` now logs the real address when one was given (`value.email
|| null`, still explicit for `pg`'s sake) instead of always `null`.

**Submit — icon + the click flash.** Replaced the plain accent dot with a
small flat SVG cassette glyph (body + two reels + a tape window,
`.jcard-submit-icon*`) — same "no icon library, flat hand-drawn shapes"
convention `walkman.jsx` already uses, and a more direct "you're sending a
tape" cue than a generic record-button dot. Separately, reported live:
clicking the button visibly changed its background color, abruptly, with
no transition. Confirmed via `getComputedStyle` sampled at pointerdown that
the declared `background-color` was never actually changing — the flash
was native OS/browser button chrome (`appearance: auto`, the `<button>`
default) painting its own pressed-state affordance independent of any CSS
property GSAP or this stylesheet controls. Fixed with `appearance: none` +
`-webkit-tap-highlight-color: transparent`; no background rule needed
changing, since none was ever the actual cause.

Lint unchanged, 7/2. Bundle, measured fresh (small, mostly cancels out —
the removed `clip-path` polygon was substantial CSS text, the new spine/
sheen/email/icon rules replace it roughly 1-for-1):

| | Previous (this task's own first commit) | Now |
|---|---|---|
| CSS bundle | 56.99 kB / 11.50 kB gz | **57.60 kB / 11.69 kB gz** |
| JS bundle | 548.88 kB / 195.66 kB gz | **550.77 kB / 196.07 kB gz** |

Verified live: malformed email blocks send with a shake + error and clears
once corrected or emptied; a blank email sends normally; fit-ratio holds
at 390px after the redesign (356×604, h/w 1.70 — taller than the first
version's 1.49, from the added email strip, still comfortably "tall and
narrow"); light theme, rest and focus states, all checked by direct
screenshot rather than assumed from the dark-theme pass alone.

---

### Stage 3 Task 1 revision, second follow-up — `#connect`: text-left/card-right two-column layout *(2026-08-27)*

Direct feedback on the stacked single-column shape the two entries above
this one left in place: "put the text on the left side and the J cassette
on the right side... our goal is to fit the entire design into one page."
Stacked, this section's total content height was the SUM of the text
block's height and the card's — the card alone runs ~604px tall by
construction (`.jcard`'s own comment), which was most of why the entry
pin's own "does this fit one viewport" safety check (`connect.jsx`
`onEnter`) was skipping the hold on so many ordinary window heights. A
flex ROW's height is the TALLER of its two children, not their sum — the
actual mechanism, not just a different-looking rearrangement.

**Markup.** `connect.jsx`'s JSX split into two new wrapper columns inside
the existing `.contact-container`: `.contact-copy` (heading, intro, the
out-of-band failure banner) and `.contact-visual` (the J-card while
composing, the walkman takeover once a send succeeds — both in the SAME
column, never both mounted at once, so the takeover doesn't shift the
text column beside it). `.cassette-flight` (the flying clone) stays a
direct child of `.contact-container`, sibling to both columns, not
nested in either — it's positioned in absolute px against
`.contact-section` regardless of where it sits in the DOM, so which
column it happened to fly out of makes no visual difference to where it
renders.

**Layout.** `.contact-container` is now `@include content-column($width:
var(--content-width-wide))` (1100px, was a hand-set 700px) as a flex row
— reusing the same token/mixin `.about-me-container`/`.timeline-container`
already use for their own side-by-side rows, not a third hand-set width
invented for this section alone. This is a real, if partial, step toward
the still-open "apply the design system to `#connect`" roadmap item
(column WIDTH only — `.contact-title` still doesn't use `--text-xl`/
`@include section-title`, so that item stays open). `.contact-copy` is
`flex: 1; min-width: 0` (`.about-me-text`'s own recipe, verbatim).
`.contact-visual` is `width: min(500px, 42vw)` — clamp-shrinks
continuously through the medium-viewport range the same way
`.about-me-portrait-wrap`'s own `clamp()` does, rather than holding a flat
500px until an abrupt breakpoint; 500px specifically because `.walkman`'s
own `min(460px, 92%)` resolves against this column, and 92% of 500 is
exactly 460 — the walkman still reaches its intended rest size at desktop
widths without needing to know that number itself. `.contact-title` lost
its hardcoded `text-align: center` (reads oddly centered above a LEFT
column now); `.contact-container`'s existing 768px breakpoint (stacked,
centered) cascades the centering back down when it collapses to one
column, same as `.about-me-container`'s own pattern. `align-items: center`
was tried first (matching `.about-me-container`) and found live to
misalign the two columns' top edges — logged as FINDINGS.md B68 — fixed
to `align-items: flex-start`.

Lint unchanged, 7/2 (the concurrent Experience work in progress elsewhere
in the tree at time of writing is untouched by this task — measured with
that work stashed out so the build below reflects only this change).
Bundle:

| | Previous (this task's own prior commit) | Now |
|---|---|---|
| CSS bundle | 57.60 kB / 11.69 kB gz | **58.25 kB / 11.80 kB gz** |
| JS bundle | 550.77 kB / 196.07 kB gz | **550.87 kB / 196.08 kB gz** |

Verified live at 1440/1024/768/390px, both themes: desktop/tablet widths
(≥768px) render text and card side by side with shared top edges; ≤768px
stacks back to the original centered single column; no horizontal
overflow at any width (`document.documentElement.scrollWidth ===
window.innerWidth`, both 1440 and 390 checked directly, not eyeballed).
Submitted a real (route-intercepted, no live network/email) send at
1440px: the confirmation state — heading left, walkman + reset button
right — holds the same two-column shape and top alignment as the compose
state, so the takeover doesn't visibly restructure the page. Also
verified with the send intercepted to fail: the out-of-band failure
banner renders left-aligned under the confirmation heading, in
`.contact-copy`, reading naturally in the new column rather than
centered under content that's no longer there. Zero console/page errors
across the full submit → takeover sequence.

---

### Stage 3 Task 9 — Experience: the pin is gone, the filmstrip is a native horizontal scroller *(2026-08-27)*

Direct feedback, third time on the same complaint: *"i want to be able to
skip the section if i scroll down, and only being able to display it if i
scroll horizontally."* The two prior follow-ups (2026-08-26, the entry two
above) treated symptoms — horizontal-gesture routing, then shrinking the pin
from 43.7% of the page's scroll length to ~29%. Neither could satisfy the
ask, because a `pin: true` + `scrub` ScrollTrigger **is** the mechanism that
converts vertical scroll into filmstrip travel. As long as the pin exists,
scrolling down spends its input scrubbing cards. The fix was to remove it.

**What changed.**

- **No pin, no scrub, no ScrollTrigger driving the track.**
  `.experience-viewport` is `overflow-x: auto; overflow-y: hidden` — the
  browser scrolls it. A vertical gesture has nothing to scroll there and
  passes straight through to the page; a horizontal one (trackpad swipe,
  shift-wheel, touch pan) moves the filmstrip. The section is ordinary
  in-flow content ~1 screen tall — the pin-spacer that made it **1876px**
  against an ~8100px document is gone entirely.
- **`data-lenis-prevent-horizontal`** on the viewport (the same opt-out
  `#my-taste`'s mobile snap rows carry). Lenis checks it per-event against
  the gesture's own dominant axis (`lenis.mjs` line 608, `Math.abs(deltaX)
  >= Math.abs(deltaY)`), so a horizontal-dominant wheel over the viewport is
  left to native `overflow-x` scroll while a vertical one still drives the
  page. Works regardless of Lenis's `gestureOrientation` option.
- **`gestureOrientation` reverted to Lenis's default (`"vertical"`).** It
  was `"both"` solely so a sideways swipe could drive the *pinned* filmstrip
  through the one window scroll position — with the pin gone, that
  justification is gone, and `"both"` had a real global cost: **any**
  horizontal trackpad swipe anywhere on the site moved the page vertically.
  `#my-taste`'s two snap rows keep their `data-lenis-prevent-horizontal` —
  under `"vertical"` a horizontal-dominant gesture is already ignored (or,
  if pure, treated as an unknown gesture and passed through), so the
  attribute is now belt-and-suspenders rather than load-bearing. Verified
  live: the wall row still scrolls its own `scrollLeft` on a horizontal
  swipe with `window.scrollY` unchanged.
- **Emphasis, active card, year scramble, rail draw + progress dot** all now
  read `viewportEl.scrollLeft` instead of ScrollTrigger progress, off a
  plain `scroll` listener on the viewport. The rail is a `paused` GSAP
  timeline (drawSVG + motionPath, unchanged) scrubbed by hand with
  `.progress(scrollLeft / maxScroll)`. `measure()` re-runs from a
  `ResizeObserver` on the track + viewport for the section-scoped webfont
  swap-in and window resizes (was `onRefreshInit`).
- **Entrance** is now a lightweight `ScrollTrigger.create` reveal (opacity +
  scale, `once: true`, `start: "top 80%"`), matching `#projects` — replaces
  the pin-engage flourish, which fired the instant the section snapped to
  `position: fixed`, a moment that no longer exists. A deep-link straight to
  `#experience` shows it outright (the trigger's start is already above the
  viewport, so `onEnter` never fires).
- **Removed:** `PIN_LENGTH_VH_MULTIPLIER`, `ENTRY_BUFFER`, the custom GSAP
  snap function, the bespoke non-passive `touchmove` handler (native
  overflow scroll gives touch drag + momentum for free — this also retires
  the mobile-jank hazard `d9663bb` was chasing), and the now-dead
  `filmstripSettle` ease in `lib/gsap.js`.

**No CSS scroll-snap.** Tried `mandatory` and `proximity` both: Chromium
re-snaps to the nearest card after *every* discrete scroll operation, so a
small horizontal wheel notch that doesn't clear the halfway point to the
next card springs straight back — the exact "fighting my scroll" feeling
this rebuild exists to remove. Measured directly: `wheel(200,0)` × 20 with
`proximity` stalled at `scrollLeft` 162; with snap off it went 0 → 800 →
1600 → 2400 → 2568 cleanly. The center-focus emphasis still marks whichever
card is nearest center as active, so a rest between two cards resolves to
one clear focus without snap.

**Verification** (Playwright, real `mouse.wheel` + CDP `Input.dispatchTouchEvent`,
1440×900 and 390×844):

| Check | Result |
|---|---|
| nav "Experience" still lands correctly | section top 168px below viewport top (= `--scroll-offset`) |
| vertical wheel scrolls straight through | 1668 → 2448 in 2×400px gestures, into `#my-taste`'s own entry-hold (unrelated) — filmstrip `scrollLeft` stayed 0 |
| horizontal wheel drives the filmstrip | `scrollLeft` 0 → 2568/2568, active card 0 → 5, `window.scrollY` unchanged |
| small horizontal wheel deltas (160px) scroll freely | 0 → 960 → 1920 → 2568, no snap-back |
| overscrolling the filmstrip end | page not dragged (`overscroll-behavior-x: contain`) |
| touch horizontal drag | `scrollLeft` 0 → 860, page still |
| touch vertical drag over the viewport | page scrolls past the section (1608 → 2463) |
| `#my-taste` wall row (no-regression) | own `scrollLeft` moves, `window.scrollY` exactly unchanged |
| reduced motion | `ExperienceStatic` list (6 items), filmstrip never mounted |
| resize to 1000×700 | filmstrip still scrollable, rail viewBox re-measured |
| title / viewport overlap (B29) | clear gap at 1440/1280×720/390 (no regression) |

Lint 7 errors / 2 warnings — unchanged baseline. Build clean, JS
**−453 / +154 lines** (net −299; the pin/scrub/snap/touch machinery was
most of the file).

> **Process note — the SCSS half of this change shipped in the wrong
> commit.** `main.scss`'s `.experience-viewport` edits were sitting
> uncommitted when a concurrent editing session ran `git commit -a` and
> swept them into `9087bec` ("feat: #connect two-column layout…"), which was
> then pushed. The `.jsx`/`.js` half is its own commit (`7c53298`) with the
> full writeup. Nothing is lost or broken — the two halves are both on
> `origin/main` — but `9087bec`'s message doesn't mention Experience. Worth
> knowing if you `git blame` `.experience-viewport` later.

---

### Desktop one-screen fit pass — every section fits the viewport after a nav click *(2026-08-28)*

Direct request: *"click on each of the sections and see where the page is
landing... re-arrange so everything fits within one page."* Measured every
section via its real nav link across six desktop sizes (1280×800 →
1920×1080). Three sections overflowed one screen; two more had a landing
bug where the content sat ~200px below the fold on a revisit.

**Root pattern — no global `box-sizing: border-box`.** Every section that
pairs a viewport-unit height with padding on the default `content-box`
rendered that much too tall. Same class as B33/B34/B42 (`FINDINGS.md`).
Fixed per-section, not with a global reset — a 5,400-line hand-tuned sheet
has too many `content-box` assumptions (turntable percentage geometry,
`.university-logo` padding) to flip safely; that stays a Stage 8 candidate.

| Section | Before (1440×900) | After | Fix |
|---|---|---|---|
| `#home` | +180px over | exact 1 screen | `.home`: `box-sizing: border-box` (`height:100vh` + 180px padding was 100vh+180 on content-box); + `@media (max-height:760px)` padding trim (`FINDINGS.md` **B69**) |
| `#connect` | +160px + card cut off | fits, Send button clear | `.contact-section`: `box-sizing: border-box`, `5em→3em` vertical padding, `min-height` retargeted `navbar → scroll-offset`; `.jcard` compacted — textarea `min-height 280→220`, header gap/padding trimmed, card ~604→~500px (`FINDINGS.md` **B70**) |
| `#my-taste` | fits (fresh) / +75px (1366×768) | fits 1440+; ~27px at 1366×768 | `.my-taste-section` vertical padding `space-6→space-4`, `.my-taste-heading` bottom margin `space-6→space-4` — outer levers only, **not** the wall card / photo / gap sizes `my-taste.jsx`'s `cardTransform()` math depends on |
| `#experience` | fits, +24px trailing box | exact | `.experience-section` `min-height` retargeted `navbar → scroll-offset` (no pin since 2026-08-27, nothing reads it in JS); `--experience-vp-height` headroom `2×space-7 → 2×space-6` |
| `#about`, `#projects` | already fit | unchanged | out of scope per the request |

**The entrance triggers — `FINDINGS.md` B71 + B72, both fixed.** `#my-taste`
and `#connect` each hung their one-shot entrance entirely off a `pin: true,
end: "+=200", once: true` ScrollTrigger. That produced two bugs:

- **B71** — after the pin was scrolled through once, its pin-spacer kept
  padding the layout by `+=200` *above* the inner section, so a nav click
  back to the section landed the real content ~200px too low (`#my-taste`'s
  bottom card row cut off; `#connect`'s Send button below the fold).
- **B72** — `onEnter` only fires on a downward crossing of `start`, and a
  nav click stops at `--scroll-offset`, *above* a `start` line pinned to
  `navbarHeight`. So clicking "My Taste" (or "Let's Connect") never fired
  the entrance at all — the wall cards / form sat at their `gsap.set` /
  `tl.from` opacity 0. First shipped a `retirePin()` (`st.kill()` on
  completion) for B71 alone; live testing then showed it *made B72 worse* —
  killing the spacer mid-scroll made a fresh nav click to `#connect`
  overshoot the whole section into the footer.

**Fix — drop both pins** (Experience already dropped its own 2026-08-27;
About never used one — a `lenis.stop()` hold needs no pin). The entrance is
now one guarded starter (`beginEntrance` / `resolveEntrance`) fed by: a
plain trigger whose `start` sits just below the nav-landing point so
`onEnter` fires on *both* an organic scroll and a nav/deep-link landing; a
setup-time catch-up for a nav that resolved before the effect mounted; and
an `onSectionNavigated(id)` signal from `scroll.js` (new). Both
`#my-taste` and `#connect` **animate** their cascade on a nav click (the
direct request — for connect, twice: *"as soon as you click on #connect
the animation should pop up without the need of any scrolling"*).

**B56 — the `SplitText` / `insertBefore` blank-page crash — closed for both
`#my-taste` and `#connect`.** `#my-taste`: `new SplitText(kickerRef.current)`
was pointed at the `<a>` that also renders `<AvatarSlot>` (null → `<img>` on
the profile fetch). Playing that cascade on a nav click widened the race
enough to reproduce — 1-in-15 in a light-theme stress run blanked the page.
`kickerRef` moved onto an inner `<span class="my-taste-heading-text">`
(`display: contents`) that wraps the text but **not** `AvatarSlot`.
`#connect`: making its title/description animate on a nav click (rather
than snap) put its `SplitText` tween back in the 1.5s play window the snap
used to close. Same fix — `.contact-title` / `.contact-description` text
wrapped in inner `<span class="contact-title-text">` /
`<span class="contact-description-text">`; SplitText and ScrambleTextPlugin
both target the inner span, which React only ever renders a constant string
into. Stress with both animating: **0 / 30**, then **0 / 50**.

**`#connect` dead space (2026-08-27 two-column layout left a ~250px empty
band).** `.contact-section` gets `align-items: center` — the two-column
block now centers vertically in the room below the navbar instead of
`stretch` pinning it to the top. `min-height` (not `height`) still lets the
section grow when content needs it (stacked mobile), so nothing clips.

**Verification** (Playwright, real nav-link clicks + organic scroll,
1280×680 → 1920×1080). Every section lands at exactly `--scroll-offset`
(168px) on a fresh nav click, a revisit, and an organic scroll; 0
horizontal overflow; 0 page errors across 50 stress trials.
Both entrance cascades animate in on a nav click (opacity 0 → 1,
staggered); the organic hold still snaps to 168 and plays. The
J-card fits entirely — Send button and all — down to a 1280×680 window
(`.jcard-textarea` `min-height` 280 → 140 across the fit passes; section
padding 5em → 2em; `.contact-container` `padding-top` 6rem → 0.25rem).
Content overflow past the fold: ≤0 at 1440×900 and up; ≤27px at 1366×768.

Lint unchanged (7 errors / 2 warnings). Files: `main.scss` (six section
rules + `.contact-section` centering), `scroll.js` (`getLastNavTarget` /
`onSectionNavigated`), `my-taste.jsx` + `connect.jsx` (pins removed,
entrance rework, B56 inner-span wrappers).

---

### `#connect` send-state polish *(2026-08-29 — merged to `main` + deployed, `8c40909`)*

Four direct-feedback tweaks to the send-success takeover, in order:

1. **Sent layout is centred.** `.contact-container[data-state="sent"]`
   becomes a single centred column — title on top, cassette player in the
   middle, "send another message" below — instead of the player marooned in
   the compose layout's right column with the heading alone in an empty left
   one. `runSendSequence`'s step-forward now *scales the player in place*
   (it's already centred) rather than translating to the section's geometric
   centre; `deltaX`/`deltaY` gone. Compose layout untouched; mobile already
   stacked centred.
2. **Heading glides in.** The layout switch used to teleport the heading
   left→centre in the frame the form unmounts. `handleSubmit` now captures
   the heading's rendered-text box (inner span, tight to the glyphs)
   pre-reflow; `runSendSequence` offsets the `<h2>` back by the delta and
   rides it to zero over 0.55s on `SIGNATURE_EASE`, alongside the scramble
   and the cassette flight.
3. **Dim scrim removed.** The step-forward faded a 40%-black section-scoped
   overlay in and out around the player's scale-up. `.connect-scrim` element,
   SCSS rule, and both opacity tweens deleted — the 1.35× grow reads as
   emphasis on its own. `.contact-title` keeps `z-index: 8` (for
   `.cassette-flight`, z 7).
4. **"Send another message" fades in.** It mounted abruptly on
   `settled`; now a `useEffect` fades + rises it (`opacity 0→1`, `y 8→0`,
   0.45s `SIGNATURE_EASE`) on a plain wrapper div so the button's own
   `:hover` scale transition is untouched. Reduced motion skips it.

Verified (Playwright, 1366×768 / 1440×900): title + player centred to the
exact viewport centre-x; "send another" bottom clears the fold (790px @
1440, 724px @ 1366); cassette flight still lands in the bay; heading glide
samples 8px→0 over ~0.4s; 6× and 12× send/reset runs settle at ~2.7s with
0 errors and the `<h2>` transform clearing to `none` each time; reduced
motion lands the same centred layout with no transitions. Build clean,
lint 7/2. Files: `connect.jsx`, `main.scss`.

---

### Site-wide vertical scroll-snap *(2026-08-29/30)*

Direct request: pin/hold every section briefly as you scroll for "a nice flow …
something that wouldn't be annoying." After discussion the chosen mechanism is
**scroll-snap to section tops** (not a timed hold), on all six sections — a
deliberate trajectory choice by the owner. **No new entrance holds:** the three
sections that already freeze scroll for their entrance cascade (`#about`,
`#my-taste`, `#connect`) keep those unchanged; `#home` / `#experience` /
`#projects` get snap only.

**Mechanism — `lenis/snap`.** The `Snap` class ships *inside* the
already-installed `lenis@1.3.26` (`lenis/snap` export) — **no new dependency**.
It listens to Lenis's `virtual-scroll` event (raw wheel/trackpad only), debounces
500ms, and once input settles glides (`lenis.scrollTo`, 0.8s) to the nearest
registered snap value **iff** within `distanceThreshold: '40%'` of viewport
height. `type: 'proximity'` — never interrupts an in-progress gesture, and a
section taller than the viewport stays freely scrollable through its middle.
**No CSS `scroll-snap`** anywhere — it's already documented as fighting
Lenis/Chromium here (`main.scss`, the `.experience-viewport` note).

**Navbar offset.** `lenis/snap`'s `addElement()` snaps an element's raw document
top to scroll 0 — every section would land *under* the 144px fixed navbar, and
the module has no offset hook. So snap points are registered as computed pixel
values instead — each section's absolute top minus its own resolved
`scroll-margin-top` (= `--scroll-offset`, 168px), the same
`getComputedStyle(el).scrollMarginTop` read Lenis itself does for
`scrollTo(element)`. Rebuilt on every layout shift, hung off the **existing**
`scheduleRefresh()` debounce in `smooth-scroll.jsx` that already re-measures
ScrollTrigger for the identical stale-measurement reason (fonts, async content,
sibling reflow).

**Interaction with the three entrance holds.** Each section's existing
`beginEntrance()` hold branch now calls `getActiveSnap()?.stop()` next to its
`lenis.stop()`, and `releaseHold()` calls `getActiveSnap()?.start()` next to
`lenis.start()` — so the section snap can't fire on top of a cascade. Snap
instance exposed via a new `getActiveSnap()` / `setActiveSnap()` singleton in
`scroll.js`, mirroring `getActiveLenis()`.

**Nav clicks & deep links are immune by construction** — they go through
`lenis.scrollTo()`, which emits no `virtual-scroll`.

**Deliberate limitations (not oversights):**
- **Touch devices never snap** — `Snap.onSnap` hard-returns on `touchmove`.
  Acceptable v1; mobile gets its own tuned pass (Stage 5).
- **Keyboard scroll (arrows / PageDn) never snaps** — Lenis doesn't route
  keyboard through `virtual-scroll`. Nav/deep-link keyboard landings are
  unchanged (`scroll-margin-top`).
- **Reduced motion: no snap at all** — no Lenis instance, so no `Snap`
  constructed. Consistent with "smooth scroll disabled entirely."

**`#experience` reversal, flagged per the working agreement.** Its pin was
removed 2026-08-27 after three rounds of "skip the section" feedback. Vertical
scroll-snap is *not* that pin — it does not remap vertical scroll to horizontal
travel, does not hold, and does not scrub. The horizontal filmstrip
(`overflow-x` + `data-lenis-prevent-horizontal`) is untouched: verified below
that a horizontal wheel still drives `scrollLeft` with the page `scrollY`
unmoved.

**Verification (Playwright, 1440×850, real wheel events):**
- Wheel down the whole page in bursts, pausing after each: `#about` (hold),
  `#experience`, `#my-taste`, `#projects`, `#connect` each settle at
  `top = 168 ± 2px`. Wheel back up: snaps at `#about`, lands `#home` at 0.
- Continuous 14-tick fast scroll: `scrollY` strictly monotonic — no
  mid-gesture yank-back. Snap only after the gesture ends.
- Nav-click all six sections: land at 168 ± 0.3px, snap does not re-fire.
- Deep link `/#projects`: lands at 168.
- Organic scroll into `#about`: hammering wheel input during the ~2.9s hold
  moves 0px; after the cascade, chip opacity 1 and scroll resumes freely.
- `#experience` filmstrip: horizontal wheel → `scrollLeft` 0→1400, page
  `scrollY` Δ0.
- `prefers-reduced-motion: reduce`: `lenis/snap` not loaded, native scroll
  holds where left.
- **0 page errors** across every scenario. `npm run lint` 7 errors / 2 warnings
  (baseline). `npm run build` clean; JS bundle **551.09 → 558.03 kB**
  (**+6.94 kB raw / +1.89 kB gz**, all `lenis/snap`), no `package.json` change.

**Tuning knobs:** `THRESHOLD_RATIO`, `DEBOUNCE_MS`, `DURATION_S` — all named
constants at the top of `lib/section-snap.js`. (Superseded below: the
`lenis/snap` options this paragraph originally listed no longer exist.)

**Post-ship note — "the snap isn't happening" was a deployment gap, not a
bug.** Reported live right after the local verification above: *"so far we
don't have any of that behavior, just the hold for about, my taste and lets
connect."* That is an exact description of production at `8c40909`, which
never had this change. Confirmed by probing both origins side by side rather
than assuming: `window.lenis.snap` (the flag `lenis/snap` stamps on
construction) read `true` on `localhost:5173` and `false` on
`https://diegodamian.com`. Behaviourally, parked ±180px off `#projects`'
line — **the one section with no entrance hold**, so nothing else can move the
page — local snapped to the line from both directions, production stayed put
(2877→2697 / 2517→2697 local; 2877→2881 / 2517→2513 prod).

Two things worth carrying forward: **(1)** measure the hold-free section when
testing snap. Two earlier probes parked near `#about` and both "passed" on
production too, because About's `lenis.scrollTo(snapTo)` hold lands on the same
line a snap would — the hold masks a missing snap perfectly. **(2)** this is
the third time a "still broken" report has traced to unpushed/undeployed work
(see the working agreement's own "Push after every commit" note); the
side-by-side origin probe above is the cheap way to settle it in one run.

---

### Scroll-snap, second pass — `lenis/snap` replaced by `lib/section-snap.js` *(2026-08-30)*

Live feedback on the deployed build above, and both halves were real:
*"there is not snap, i can still scroll in between section… experience doesn't
snap at any point"* and *"the scrolling quality has worse."*

**Measured first.** Latency from the last input event to the page coming to
rest was **1116ms** (median, six trackpad flicks with a realistic momentum
tail). That single number explains both complaints: during ordinary scrolling
the visitor has already moved on before it fires, so it reads as absent — and
when it does fire, the page sits still and then lurches 110–134px on its own,
which reads as the scroll fighting them. Separately, `distanceThreshold: 40%`
was almost exactly half a section gap, leaving a **26px dead band** in the
middle of `about→experience` (1/25 sampled rest positions never snapped).

**Both `lenis/snap` modes were tried and both failed, in opposite ways:**

| mode | lands on a line | slow mouse wheel |
|---|---|---|
| `proximity` (debounce 250) | **6/6** | **trapped** — 8 notches × 100px = net **0px**, permanently |
| `lock` (debounce 500) | **4/6** — stranded at 782 and 2170 on hard flicks | progressed |

`proximity` always snaps to the *nearest* line, so it drags the visitor back
onto the one they just left; with a wheel turned slower than the debounce every
notch was undone and a section could not be left at all. **That trap is in the
first shipped version too** (debounce 500 → trapped at ≥500ms between notches),
which is why this was fixed rather than retuned. `lock` always advances one
section, fixing that, but a hard flick overshoots and its internal guard blocks
the correction, coming to rest *between* sections — the exact reported symptom.

**Replaced with a ~90-line hand-rolled snap** (`client/src/lib/section-snap.js`),
because the missing behaviour is one rule neither mode can express: snap to the
nearest line, **except when it is the line the visitor is docked at and we have
already pulled them back once** — then carry them to the next line in their
direction instead. Two refinements were needed, both found by measurement, not
reasoning:

- Keying the rule on *where the gesture started* only worked for a single
  notch; the second notch begins off-line, so the rule stopped applying and the
  page snapped back again. It has to track the line the visitor is **docked
  at**, persisting across the whole departure.
- Allowing the *first* pull-back is what keeps "stopped mid-gap" settling onto
  a line. Refusing every backward snap re-opened the dead bands (2/25 stuck).
- Reaching the next line means travelling nearly a whole gap, further than the
  threshold — so the forward hop is gated on whether the gap **fits one
  screen** instead. A gap larger than ~1.05× viewport means the section is
  genuinely taller than the screen (`#projects` with a row expanded is 1133px,
  1.33×) and its middle stays freely scrollable.

Constants: `DEBOUNCE_MS 120`, `DURATION_S 0.30`, `THRESHOLD_RATIO 0.55`,
`AT_LINE_PX 8`. The `stop()`/`start()` shape is unchanged, so the three
entrance holds (`about.jsx`, `my-taste.jsx`, `connect.jsx`) needed no edits.

**Speed pass, same day** (direct ask: "is there a way to make the snap
faster"). Latency is `DEBOUNCE_MS + DURATION_S` and the two carry very
different risk, so they were swept separately and measured:

| debounce / duration | settles after input | landing | mid-gesture interruption |
|---|---|---|---|
| 250 / 0.45 (first version of this file) | 600ms | 5/5 | none |
| **120 / 0.30 (shipped)** | **350ms** | **5/5** | **none** |
| 60 / 0.22 | 217ms | 5/5 | none *in emulation* |

60ms was rejected despite testing clean: the emulated momentum tail uses
uniform 16ms gaps, while a real trackpad tail — and a finger repositioned
mid-drag — produces irregular 30–80ms gaps, which a 60ms debounce would fire
inside. That is the "page is fighting me" failure this mechanism exists to
prevent, and a test that cannot reproduce it is not evidence it is absent.
120ms keeps real margin. The remaining latency is not a floor to be tuned away
— `DEBOUNCE_MS` is what distinguishes "paused mid-scroll" from "done".

New hazard checked for this pass and clean at 120ms: **hesitant scrolling** —
bursts with 150 / 250 / 400ms pauses between them, watching for any backward
movement mid-sequence (worst backward jump 0px at every interval). Re-verified
after the change: 60/60 landings across 1920×1080 → 1280×680, 0/25 dead bands,
mouse wheel escapes at every notch interval, `#projects` expanded readable,
holds/nav/deep-links/filmstrip/reduced-motion unchanged, 0 page errors, lint
7/2.

**Verified** at 1920×1080 / 1440×850 / 1366×768 / 1280×680: **60/60** rest
positions land on a line; **0/25** dead bands (was 1/25); slow mouse wheel
progresses at 200/350/500/700/1000ms between notches (was net 0px at ≥500ms);
settle latency **1116ms → 600ms**; `#projects` expanded still fully readable;
`#about` hold still blocks input for its whole cascade then releases; nav
clicks and `/#hash` land at 168 ± 0.3px; filmstrip still horizontal-only;
reduced motion still has no snap; 0 page errors throughout. Lint 7/2
(baseline). Bundle **558.03 → 552.68 kB** (−5.35 kB raw, −1.27 kB gz) —
dropping `lenis/snap` costs more than the replacement adds.

**Files:** `smooth-scroll.jsx` (construct `Snap`, `rebuildSnapPoints()` on the
existing refresh debounce, destroy in cleanup), `scroll.js`
(`get/setActiveSnap`), `about.jsx` / `my-taste.jsx` / `connect.jsx` (2-line
snap `stop()`/`start()` in the hold pair each). **No SCSS.**

---

### Scroll-snap, third pass — section NAVIGATION, and the footer moves into `#connect` *(2026-09-01)*

Two direct asks: *"is there a way that we can snap into sections… the user
doesn't have any of these weird delays or kinda laggy scrolls"* and *"in
Connect we need to include the footer because right now when we snap into that
section the footer gets cut off, but the footer has to be on the last
section."*

**The model changed, not the tuning.** Both previous versions were
*correction* models: let the gesture run, then fix where it stopped. That wait
is irreducible — it is what separates "paused mid-scroll" from "done
scrolling" — so shortening it (1116ms → 600ms → 350ms) could only ever reduce
the delay, never remove it. This is a *navigation* model: the first wheel event
of a gesture is consumed immediately as "go to the next section", Lenis is
locked for the trip, and the rest of the flick is swallowed. **Motion begins
0–7ms after the gesture starts**, measured, at every viewport — there is no
debounce before moving at all.

**A test artifact was corrected first, and it invalidated part of the earlier
tuning.** Playwright's `page.mouse.wheel()` costs ~80ms per round trip, so the
"trackpad emulation" used throughout the previous two passes fired events
**~80ms apart** — a real trackpad fires at ~16ms through both the drag and the
momentum tail. Traced directly: 53 wheel events spread over 4397ms for what was
meant to be an 830ms gesture. Every gesture is now dispatched **inside the
page** (`window.dispatchEvent(new WheelEvent(...))` on a real 16ms clock), which
is what exposed the two defects below. Sparse input made section navigation
chain 5 stops off one flick; it is not a real-world failure, but nothing could
have been trusted while the emulator was wrong.

Two real defects, both found and fixed with the corrected emulator:

- **Landing 23px past every stop.** Lenis clears its own lock the instant a
  `scrollTo` finishes, but the flick's momentum is still arriving for a few
  hundred ms after. Those leftover events dragged the page straight off the
  stop. The lock is now held through the cooldown too and released only once
  input genuinely stops.
- **A second flick during a trip was swallowed**, so rapid navigation felt
  dead. A gesture arriving mid-trip is now queued and run on arrival. A
  momentum tail *decays*, so a genuine second push is told apart from it by
  magnitude rising clearly above the previous event, not by timing.

**Sections taller than the screen keep extra stops.** This matters more than it
sounds: with free scrolling gone, anything below the fold would be
**unreachable**. Measured, sections are *not* all one screen — at 1440×900 and
up they fit, but at 1280×680 the usable height is 512px against sections of
536–626px, and `#projects` with a row expanded is 1133px at any size. So a
section that overflows by more than 60px gets extra stops a screenful apart,
ending flush with its bottom edge. The 60px floor exists so a section missing
by a hair does not earn a stop that moves 24px and reads as broken.

**The footer moved inside `#connect`** (`App.jsx`) instead of sitting after the
section list, where snapping guaranteed it was below the fold. `#connect` now
owns the one-screen box and `.contact-section` takes what the footer leaves
(`min-height: 0` + `flex: 1`; without that the two stack, since
`.contact-section`'s own `min-height` is a full screen, and the footer is
pushed straight back out of view). The pair needs 666px under the navbar, free
above an 834px-tall viewport; a `@media (max-height: 833px)` trim (40px off the
section padding, 40px off the footer) brings it inside a 768px window. Below
that it cannot fit by trimming, so it is one scroll away via the extra stop
rather than unreachable.

**Verified** at 1920×1080 / 1440×850 / 1366×768 / 1280×680: every flick
advances **exactly one stop** in both directions (5/5, 5/5, 5/5, 9/9), one
motion segment per gesture, motion begins 0–7ms in; a single deliberate mouse
notch advances exactly one section; footer fully visible on arrival at
1920/1440/1366 and one stop away at 1280×680; `#about`'s hold still blocks its
cascade then releases; `#projects` expanded (1133px) reaches its bottom;
filmstrip still horizontal-only; nav clicks and `/#projects` land at 168 ±
0.3px; reduced motion untouched; 0 page errors throughout.

Constants: `TRAVEL_S 0.6`, `QUIET_MS 80`, `MIN_DELTA 2`, `AT_STOP_PX 8`
(`lib/section-snap.js`), `MIN_OVERFLOW_PX 60` (`smooth-scroll.jsx`).

**Follow-up the next day — four live bugs, three of them from the pass above.**

1. **One flick sometimes moved TWO sections.** Two independent causes, both
   invisible because the emulator ran a gesture's active phase at a *constant*
   magnitude. A real gesture **ramps up** (2 → 5 → 9 → 14), and the rising-edge
   test read that ramp as a second push, queueing an extra advance. Separately,
   a real momentum tail ends in 1–4px events whose gaps *stretch* as it dies,
   and one landing just after the cooldown expired began a whole extra trip.
   Fixed with hysteresis (magnitude must decay to 30% of the gesture's own peak
   before a rise above 50% counts as a new push, which a ramp can never
   satisfy), a `START_DELTA` of 6 to begin a trip while smaller events still
   keep the cooldown alive, and `QUIET_MS` 80 → 160.
2. **Touch was treated as a snap gesture.** Lenis emits `virtual-scroll` for
   touch as well as wheel, and this module never checked the event type despite
   documenting touch as untouched. On a phone every touch drag jumped a section
   — and **scratching the record scrolled the page instead of scratching**,
   because `.turntable-platter`'s `touch-action: none` stops the *browser*
   scrolling but not this. Touch now returns early.
3. **The hero's spectrum bars showed above `#about`.** The navbar covers 144px
   but sections rest at `--scroll-offset` (168px), so a 24px band always shows
   the *bottom of the previous section*; every other section is flat there, the
   hero is animated. Measured: navbar bottom 144, `#about` top 168, canvas
   bottom 168. The canvas bottom is now inset by exactly that difference,
   derived from both tokens. Its height stays explicit — `<canvas>` is a
   **replaced element**, so leaving the height to the inset made it fall back to
   its intrinsic aspect ratio and collapse to 720px in an 826px slot.
4. **Mobile crate moved from below the deck to directly under the name**, so its
   results panel opens into the hero instead of into the next section. Verified
   contained at 390×844 and 375×667.

**The "laggy when a song is playing" report did NOT reproduce, and the number
that suggested it was a test artifact.** Headless Chromium software-renders
canvas: it measured 33.3ms/frame (30fps, 91% of frames over budget) with the
hero visible, and isolation pointed at the skyline's RAF loop — removing the
canvas element changed nothing, removing `#home` restored 60fps, because only
the latter trips the IntersectionObserver that stops the loop. **In a real
GPU-backed window on the same M2 the same scenario is 16.7ms median with 0%
of frames over 20ms**, idle *and* during a section trip, identical to silent.
Stage 7 was therefore left alone; "optimising" it against the headless figure
would have degraded tuned visuals for nothing. Gating is confirmed correct:
33.3ms only while the hero is on screen, 16.7ms at `#projects`.

The likeliest real mechanism is bug 1 rather than rendering: the snap's
cooldown and edge detection were timing-sensitive, audio work adds main-thread
jitter that makes wheel delivery irregular, and stray triggers then read as
lag. Worth re-checking on the live site now that 1 is fixed — if it persists,
the next suspects are browser-specific (Safari) and the Stage 6 scratch
AudioWorklet, neither of which this machine reproduced.

> **Concurrent work, not measured here:** another session was editing
> `turntable.jsx` (+357 lines), `turntable-audio.js` and a new untracked
> `client/public/scratch-processor.js` (Stage 6's scratch phase) while this
> landed. Those files are deliberately NOT in this commit. It also means the
> repo-wide lint count and the bundle size were confounded during this pass and
> are not quoted — `eslint` on only the files changed here is clean.

---

## 3. Current measurements *(refreshed 2026-08-25, Stage 7.2)*

| Metric | Before | Now |
|---|---|---|
| Deploy size | 152 MB | **9.6 MB** |
| Images | 11 MB | **1.7 MB** |
| JS bundle | 407 KB / 147 KB gz | **545.23 kB / 194.56 kB gz** *(+21 kB / +7.5 kB gz vs. pre-Stage-3-Task-10 baseline — GSAP `Flip`, first use; Tasks 10.1/11/10.2/11.2/12/12.1/12.2/12.3/12.4 added +7.71 kB / +2.37 kB gz combined on top, almost all of it Task 12's own walkman sequence — 12.4 alone added just +0.16 kB / +0.10 kB gz, since resequencing the timeline mostly replaced relative position strings with named constants rather than adding code; Stage 6 Phase 9's pitch fader added +5.01 kB / +1.30 kB gz on top of that — `Draggable`'s own code was already in the bundle, registered-but-unused since Stage 0, so this is purely the fader's own logic/markup; Stage 7a's fluid background added +14.11 kB / +4.41 kB gz on top — the whole WebGL2 solver plus nine GLSL shader sources, which are shipped as strings and so barely compress; Stage 7b added +3.19 kB / +1.37 kB gz for the presence gating, palette, contrast adaptation and analyser routing — the dev-only debug hooks are stripped from the production bundle, confirmed by grepping `dist`; Stage 7c added **+7.68 kB / +2.75 kB gz** for the bloom chain's two extra GLSL sources, the HSL colour solve, the energy model and the DOM-measured calm zones — the three dev diagnostics (`fieldStats`, `benchmark`, `setSolver`) are spread into the returned object behind `import.meta.env.DEV` so they collapse away at build time, which was worth doing explicitly: returned unconditionally they shipped, since a property of an object literal is not something a bundler can tree-shake); Stage 7d added **+2.49 kB / +1.32 kB gz**, which includes the one dependency this project has added since GSAP — `simplex-noise` 4.0.3, for the curl-noise flow field. Meyda was the other candidate and was declined: 115kB of tarball against 15.9kB, for band splitting that is fifteen lines against an `AnalyserNode` the component already owns. **The Stage 7 rebuild then gave all of that back and more: −16.33 kB / −5.12 kB gz.** Deleting the WebGL2 solver with its eleven GLSL sources — shipped as strings, so they barely compress — plus `simplex-noise`, costs more than the Canvas2D renderer, the palette module and the component together. `audioMotion-analyzer` was researched for this stage and rejected on **licence, not size**: it is AGPL-3.0, and bundling it into a deployed site carries real copyleft obligations. Net dependency change for the rebuild is **−1**; Stage 7.1 then added **+1.17 kB / +0.47 kB gz** for the electric palette solve, the per-column bucket gradients, the tip caps and the travelling wave, with no new dependency; Stage 7.2 added **+1.43 kB / +0.56 kB gz** for the second alpha ramp, the dither tile, the gradient tip caps and the gradient mask — the mask rewrite gave code back, since a linear gradient replaced the seven-rect accumulation loop)* |
| CSS bundle | 26.96 kB / 5.99 kB gz | **54.82 kB / 11.19 kB gz** *(Task 12 added +4.05 kB / +0.90 kB gz for the cassette/walkman rules; 12.1 added +0.08 kB / +0.02 kB gz; 12.2 removed the two now-dead `.contact-description` rules, a net -0.09 kB; 12.3 added +0.64 kB / +0.06 kB gz for `.walkman-visualizer`/`.walkman-visualizer-bar`/`.walkman-stage`/`.walkman-reset-button`; 12.4 added +0.37 kB / +0.08 kB gz for the `--viz-neon-1..5` token family, the two bar rows' glow/panel treatment and three `box-sizing` fixes; Stage 6 Phase 9 added +3.59 kB / +0.50 kB gz for the fader input overlay and its `:has()` focus ring; Stage 7a is net +0.14 kB — the fluid canvas's own rule minus the two deleted `.hero-vu-slot` rules; Stage 7c added **nothing** — every 7c change lives in the shader or the component, and the canvas rule was already correct. The Stage 7 rebuild also added **nothing**: `.hero-fluid-canvas` was renamed to `.hero-skyline-canvas` and its declarations are unchanged, since a full-bleed `pointer-events: none` canvas at `z-index: 0` is the same requirement whichever API draws into it. Stage 7.1 added nothing either — the palette, the ceiling, the glow and the travelling wave all live in the two lib files and the component. Nor did Stage 7.2, for the same reason. The two self-hosted DSEG7 font files, ~9.6 kB combined woff2+woff, are separate font assets, not counted in this CSS number)* |
| ESLint errors | 21 | **7** *(+2 warnings, both `vinyl-record.jsx` — expected, see Stage 4 Tasks 1 and 3.6; unchanged by Stage 6 Phase 9)* |
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

### Stage 6, Phase 8 — scratch *(2026-08-31)*

The last item on the Stage 6 list, and the one the roadmap called "hardest, pure
delight, last." The record on the platter is now draggable: pull it backwards and
the preview plays backwards, hold it still and it goes silent, let go and the
motor pulls it back to 33⅓. It works on touch, which was the explicit ask — a
phone is where this gets used.

**The reason this needed a new audio node at all.** `AudioBufferSourceNode` is
the deck's player everywhere else and is correct for everything else it does,
but it **cannot play backwards**. `playbackRate` is documented as accepting
negative values; no shipping engine honours it — Chrome and Safari both clamp
to 0 and emit silence. Reverse is the defining half of a scratch, so a scratch
built on that node is a pitch bend with extra steps.

So a scratch runs on an **`AudioWorkletProcessor`** (`client/public/scratch-processor.js`)
that resamples the decoded preview by hand at an arbitrary signed rate, and
turntable-audio.js hands playback **back** to the ordinary source once the
platter is at speed. The split is deliberate: the worklet is better at going
backwards and stopping dead, the buffer source is better at 30 seconds of
ordinary listening, and handing back means the moment `endScratch()` returns,
the deck is in exactly the state it would have been in had the gesture never
happened — every existing path (pause/resume, spin linkage, elapsed
bookkeeping, `onEnded`) is untouched rather than made scratch-aware.

**Why it lives in `public/`.** `audioWorklet.addModule()` takes a URL and
fetches it; it is not an import Vite can see through. Both `?url` and
`new URL(..., import.meta.url)` route the file back through the JS transform
pipeline, which is a no-op today and one dependency away from emitting an ESM
wrapper into a scope with no module loader. `public/` is copied byte-for-byte
(verified in `dist/`).

**The graph grew two gain nodes**, so the two players can be crossfaded against
each other without touching `masterGain` — which both pass through and which the
spin linkage owns:

```
AudioBufferSourceNode → sourceGain  ─┐
                                     ├─→ masterGain → destination
ScratchWorkletNode    → scratchGain ─┘        └─────→ analyser  (tap)
```

The analyser sits downstream of the sum, so **the hero skyline follows a scratch
for free** — including falling silent when the record is held — with no coupling
added between the two features. That was the one integration worth getting right
by construction rather than by wiring.

**Not `Draggable(type:"rotation")` + `InertiaPlugin`,** which is what the roadmap
sketched. Three reasons, all only visible with the rest of the deck built:

1. Draggable would bind to `.turntable-platter-spin` — the element the spin tween
   writes `rotation` to every frame. `STATUS.md` already flagged that collision
   from the other side (the fader's `update(false, false)` bug) and said to check
   for it here. Two owners of one property is the fault that produced three
   separate freeze bugs in Stage 1 Task 4.
2. Inertia is the **wrong physics**. A record let go of on a direct-drive deck
   does not coast to a stop; the motor pulls it back to 33⅓. That is a spring
   toward a target, not momentum decaying to zero — four lines, not a plugin.
3. Latency. The audio rate has to be written from the pointer sample itself,
   including the **coalesced** ones Draggable never exposes.

The spin tween is **suspended** for the gesture and restored after. That is not a
second writer of `timeScale`: `setSpin` remains the only thing that *ramps* it,
and the scratch only ever puts back the value it took. Rotation is handed back via
`tween.time()`, not `.progress()` — on a `repeat:-1` tween, progress is ambiguous
about which iteration it names.

#### The bug worth recording: a heuristic that silently ate 44% of every gesture

The velocity follower needed to know when a finger had come to rest on the record
(a held record must go silent, and no `pointermove` fires while it rests). The
first version used a staleness threshold: if no sample had arrived in N ms, decay
the velocity toward zero.

That is a heuristic about frame pacing, and it was wrong at **both** values tried.
24ms is above one frame at 60Hz — which is how it was justified — but *below two*,
so any dropped frame read as "the finger stopped" and decayed the velocity between
two genuinely consecutive samples, with nothing to compensate. 48ms moved the
threshold without fixing the shape.

Measured against a ~25ms synthetic pointer, a 200° sweep delivered **0.561s of
audio where the geometry says 1.000s** — the deck quietly discarding 44% of the
gesture, in a way that would have read as "the scratch feels weak" rather than as
a bug.

The fix was to stop guessing. Both the pointer path and the frame path now advance
**one accounted clock** and integrate whatever angle has accumulated since it last
moved. A frame that finds no new pointer data integrates zero degrees over that
gap — and the sample that arrives afterwards is divided by the *shorter remaining
interval*, so its instantaneous velocity comes out proportionally higher and the
two cancel exactly. Total angle is conserved at any sample rate, so
`NOMINAL_DEG_PER_SEC` degrees of platter equals one second of audio whether the
browser delivers 120 samples a second or 20. "Held still" then needs no special
case at all: it is just a run of zero-degree gaps.

| | before | after |
|---|---|---|
| +200° sweep (expects 1.000s) | 0.561s — **44% lost** | 0.963s |
| +720° sweep (expects 3.600s) | — | 3.497s |
| worst absolute error, any sweep | — | **0.103s** |

The residue is the velocity filter's own convergence cost (τ = 28ms, ~2τ at each
end where a sweep also reverses). Confirmed to be a **fixed transient rather than
proportional loss** by sweeping two lengths: the absolute error stays flat while
the percentage falls 9.2% → 2.9% as the sweep gets 3.6× longer. 100ms of position
error is inaudible mid-scratch, and the smoothing is what makes the gesture feel
continuous rather than stepped.

#### Measured

Verified against a **synthetic linear-ramp preview**, where the rendered sample
value *is* the read position (`level = TARGET_VOLUME × position / duration`) —
which turns "does it play backwards" from something you listen for into a number.

| Claim | Measurement |
|---|---|
| Reverse actually renders | head 2.226s → 1.725s; level 0.368 → 0.287, falling |
| Commanded rate is the delivered rate | −2.0 commanded → −2.05 measured; +2.5 → +2.50 |
| A held record is silent | level **exactly 0.0000** |
| Hand-back is continuous | 2.552s → 2.851s across the handover, no gap |
| Gesture → audio, end to end | dragging back rewound 0.955s → 0.298s, audible level 0.072 → 0.027 |
| Skyline follows the scratch | `data-skyline-state="playing"` throughout, no extra wiring |
| Cue on a **paused** deck | sounds (level 0.076), moves the groove, skyline lights, returns to PAUSED and silence on release |
| Touch target | 204px disc at iPhone 13 width |
| Reduced motion | platter stays at 0.000° throughout; gesture still engages |

**Test coverage note.** Two things could *not* be verified in the harness and want
a real device before they are called done:

- **`touch-action: none` actually suppressing page scroll.** CDP's synthetic touch
  does not consult `touch-action` at all — verified against an isolated control
  page, where `touch-action: none` scrolled byte-identically to `auto`. The
  declaration is confirmed present on the hit chain; its *effect* is untested.
- **A track swap landing mid-gesture.** Chrome does not synthesise a click for a
  touch that is part of a multi-touch sequence, so the second-finger tap could not
  be driven. The abort it would take is the same one the tab-blur case exercises,
  which passes.

Also found while checking that path, and left alone: `record-crate.jsx`'s
outside-click handler is named `handlePointerDown` but bound to **`mousedown`**
(`record-crate.jsx:158`), so on touch the crate panel stays open underneath a live
scratch. Pre-existing, unrelated to this phase, filed in `FINDINGS.md` as D32.

#### Interaction rules

- Scratch is allowed from **PLAYING and PAUSED only**. In both the arm is down on
  the record, which is what makes moving it produce sound. `STOPPED_LOADED` parks
  the arm at rest, and a stylus that is not touching the groove cannot be
  scratched — "play again" puts it back first.
- Cueing a paused deck publishes `DECK.PLAYING` for the length of the gesture,
  because sound genuinely is coming out and the skyline reads that edge. It
  returns to `PAUSED` on release. **No new deck state was added** — `DECK.CUEING`
  is still the right fix for D11, and D11 is still open.
- Transport is ignored while a gesture is live (verified via a second finger and
  via Space on the focused button).
- Grabs within 16% of the spindle are ignored: angle around a centre is
  meaningless within a few pixels of it, and sub-pixel jitter there would read as
  the deck screaming.
- Rate is clamped to ±3.2. Not a safety limit — the worklet clamps far wider — but
  past ~3× the resampler aliases more than it plays.

Files: `client/public/scratch-processor.js` (new, 200 lines),
`client/src/lib/turntable-audio.js` (+~250), `client/src/components/turntable.jsx`
(+~300), `client/src/styles/main.scss` (touch-action, grab cursor). ESLint
unchanged at its existing 7 errors / 2 warnings.

> **Note on this file's own baseline claim:** `CLAUDE.md` says `npm run lint`
> reports **16 errors**. It reports **7** (plus 2 warnings) as of this pass, and
> did before it too — the number drifted at some earlier point and was never
> re-measured. Not changed here, but don't trust 16 as the tripwire.

---

### Stage 10 — sitewide typography: Poppins replaces the Avenir Next stack *(2026-09-01)*

Full decision writeup and rationale: `ROADMAP.md` §3's own Stage 10 entry. This
entry is the measurements.

**What changed.** `client/package.json` gained `@fontsource/poppins`.
`client/src/main.jsx` imports `latin-400`/`latin-ext-400`/`latin-600`/
`latin-ext-600` only — the same subsetting fix already applied to My Taste's
fonts (Stage 4 Task 1, below), not the package-default full-unicode imports.
`main.scss` gained two root tokens, `--font-display`/`--font-body` (both
`"Poppins", sans-serif` today, kept as two names for the ROLE rather than one
because a future pass might want them to diverge again, same reasoning as
`--taste-font-display`/`--taste-font-support` staying separate tokens).
`body` and `@mixin section-title`/`section-subtitle` now reference them, along
with `.hero-name`, `.loading-screen-text`, `.about-me-name`, `.contact-title`
and `.portfolio-header` — the last of which also had the "Avenir Next" stack
hardcoded a second time, independent of `body`.

**Font-weight audit.** Only 400/600 are imported — matches the weights the
design mockups actually used, and nothing else in the rendered site needed a
third once audited. Three selectors declared a weight the CSS font-matching
algorithm was always going to substitute anyway (an unavailable weight
resolves to the nearest available one, browser-side, silently) — updated to
say what actually renders instead of leaving a source/render mismatch for a
future reader to trip on:

| Selector | Was | Now | Why |
|---|---|---|---|
| `.loading-screen-text` | 700 | 600 | Converges onto the one display weight rather than a one-off third import for a single screen |
| `.hero-tagline` | 300 | 400 | `--secondary-text` already carries the de-emphasis this weight was doing |
| `.portfolio-header` | 200 | 400 | Also converges `.project-role` (no weight override of its own, so it inherited this value) with `.project-title`'s existing 400 override just below it |

**Checked against the tree, not assumed:** the brief suggested auditing
`.timeline-content h3` for a heading treatment. It has no actual CSS rule
anywhere in `main.scss` — only a mention inside a Stage 3 audit comment
flagging it as an already-known "undeclared size" bug, not this stage's job
to fix. It inherits `body`'s new `var(--font-body)` for free.

**Explicitly untouched** (re-read from source, not assumed): `#my-taste`'s
`--taste-font-display`/`--taste-font-support`/`--taste-font-mono` and every
selector consuming them — now with an inline comment marking the exception
deliberate, same status as DSEG7's own comment block; the walkman's
self-hosted `"DSEG7 Classic"` `@font-face` and its two consumers
(`.walkman-screen-ghost`/`-lit`).

**Bundle size**, subsetted the same way, for direct comparison against My
Taste's own number two rows below:

| | Files | Size (`dist/assets`, built) |
|---|---|---|
| Poppins (400/600 × latin/latin-ext × woff2/woff) | **8** | **~63.1 KB** |
| My Taste (Anton/Oswald/Space Mono, Stage 4 Task 1, for comparison) | 24 | 408 KB |

Proportionally smaller because this stage self-hosts one family at two
weights, against three families at up to three weights each.

**Verified live**, Vite dev server on port 5173 (per this file's own working
agreement — `4173`'s CORS block would otherwise read as a font bug that
isn't one): computed `font-family`/`font-weight` read back from the rendered
DOM at 1440px and 390px confirms Poppins actually renders — not a silent
fallback — on `body`, `.hero-name`, `.hero-tagline`, `.about-me-name`,
`.contact-title`, `.experience-title`, `.portfolio-title`, and
`.portfolio-header .project-title`. `.my-taste-heading` still computes
`"Space Mono", "Courier New", monospace` live; `npm run build` confirms no
italic or unused-weight files leaked into `dist`. `npm run lint`: 7 errors /
2 warnings, unchanged.

---

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
| **Poppins, single family at 400/600, sitewide** (Stage 10) | Free self-hosted stand-in for "Avenir Next" (commercial, never actually self-hosted, silently fell back to system sans on non-Apple machines). One family over a pairing (Space Grotesk/Space Mono, Chakra Petch — both compared and dropped) because title/body size contrast already does the differentiation work |
| **`#my-taste` and the walkman LCD kept out of the Stage 10 swap** | Anton/Oswald/Space Mono and DSEG7 Classic are deliberate, named exceptions to the sitewide font system, not drift — same status, not two different justifications |
