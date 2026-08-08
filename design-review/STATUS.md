# Project Status — diegodamian.com

**Updated:** 2026-08-08 · **HEAD:** `5d72292` · **Live:** https://diegodamian.com

Companion to [`FINDINGS.md`](./FINDINGS.md), which covers design analysis. This file
covers **where the project stands, what recently changed, and what is still missing.**

---

## 1. The goal

A portfolio that does six things. Current standing on each:

| # | Goal | Status |
|---|---|---|
| 1 | **Works correctly** — nothing broken or lying to visitors | 🟡 Mostly. Contact form fixed; mobile nav still absent, contrast bugs live |
| 2 | **Loads fast** | 🟢 Done. 152MB → 9.6MB deploy |
| 3 | **Is findable and shareable** | 🟢 Done. Meta, OG card, favicon, sitemap, JSON-LD |
| 4 | **Delivers the "playground" premise** — the turntable actually plays | 🔴 Not started. Hero is inert |
| 5 | **Reads as one coherent design** | 🔴 Hero and body are two different visual languages |
| 6 | **Converts recruiter attention** | 🟡 Contact works; no resume link anywhere |

Goals 1–3 were the focus of this session's work. **Goals 4–6 are the remaining
project**, and goal 5 is blocked on a direction decision (`FINDINGS.md` §8, Q1).

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

### `5d72292` — design-review folder
Screenshots, `FINDINGS.md`, `capture-screenshots.mjs`, and the workflow README.

---

## 3. Current measurements

| Metric | Before | Now |
|---|---|---|
| Deploy size | 152 MB | **9.6 MB** |
| Images | 11 MB | **1.7 MB** |
| JS bundle | 407 KB / 147 KB gz | 411 KB / 150 KB gz |
| ESLint errors | 21 | **18** |
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

## 5. What's missing to reach the goal

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
- Clear the 18 ESLint errors.
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
