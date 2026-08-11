# Project Status — diegodamian.com

**Updated:** 2026-08-10 · **HEAD:** `407409a`+ · **Live:** https://diegodamian.com

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
| 4 | **Delivers the "playground" premise** — the turntable actually plays | 🔴 Hero is inert. `previewUrl` is captured and discarded | **Stage 1** |
| 5 | **Reads as one coherent design** | 🔴 Hero and body are two different visual languages | Stage 3 |
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
| JS bundle | 407 KB / 147 KB gz | 412.94 kB / 150.97 kB gz |
| CSS bundle | 26.96 kB / 5.99 kB gz | **27.50 kB / 6.16 kB gz** |
| ESLint errors | 21 | **16** |
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
