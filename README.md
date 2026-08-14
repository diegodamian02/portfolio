# Diego Damian — Portfolio

Personal portfolio site: a single-page React app with an Express backend, built around a
"welcome to my playground" hero built as a working turntable — search for a song, drop it on
the platter, and its 30-second preview plays through a custom Web Audio graph.

## How the site is laid out

It's one long page — the nav bar at the top doesn't take you to different pages, it just
scrolls you to a spot further down the same one. In order, top to bottom:

1. **Home — a working record player.** The first thing anyone sees. Search for a song,
   drop the needle, and 30 seconds of the real track plays out loud. Not a video or a
   fake animation — it's actually playing audio.
2. **About Me — a quick, calm intro.** A photo, a short bio, a few quick facts (where
   Diego's from, what he studied, what he's into). Deliberately simple and quiet right
   after the record player, so it reads as a breather, not a competing spectacle.
3. **Experience — a sideways slideshow.** Instead of one long list you scroll down
   forever, this section briefly "locks" the page in place, and scrolling down slides
   a timeline sideways instead — like flipping through photos. Whichever one lands in
   the middle grows a little bigger and brighter; the ones next to it shrink out of the
   way. Six stops: high school, college, a golf-club job, a coding-coach job, and two
   software jobs.
4. **My Taste — Diego's own Spotify stats.** His real top songs and top artists, pulled
   from his own Spotify account — visitors never log into anything. Plain ranked lists
   today; a more visual redesign (styled like a crate of records) is planned but not
   built yet.
5. **Projects — things Diego has built.** A list of past work. Click one open to see a
   short video demo and links to the live site/code.
6. **Let's Connect — a real contact form.** Fill it out and it actually emails Diego. No
   dead link, no fake "message sent!" that quietly goes nowhere.

## Tech Stack

**In plain terms, before the detailed version below:**

- **React** — the toolkit the interactive parts (record player, search box, contact
  form) are built with, so they update instantly instead of reloading the page.
- **Vite** — runs the site while it's being worked on, and packages it up for the real,
  live version.
- **GSAP** — the animation engine. Anything that moves smoothly here — the record
  spinning, Experience sliding sideways, text fading in — is GSAP doing the math.
- **SCSS** (a flavor of CSS) — how the site is styled. One shared file controls fonts,
  spacing and colors so every section matches instead of looking hand-picked.
- **Express** — a small, separate behind-the-scenes server that does things a website
  shouldn't do directly in a visitor's browser: sending the contact-form email, and
  fetching Diego's own Spotify stats using his login, never the visitor's.
- **Resend** — the service that actually delivers the contact-form email.
- **iTunes's search API** — powers "search for a song" in the record player. (Not
  Spotify — Spotify stopped offering that kind of song-preview to new apps, so iTunes
  covers that one specific job instead.)
- **Spotify's API** — powers "My Taste" only: Diego's own top songs/artists, nothing
  visitor-facing.
- **Railway** — where the site actually runs online. **Cloudflare** sits in front of it,
  mostly so the address (diegodamian.com) works and for a bit of extra security.

**The full technical version, with exact library versions and reasoning:**

### Frontend (`client/`)
| Layer | Choice |
|---|---|
| Framework | React 18.3.1 |
| Build tool / dev server | Vite 6.0.5 |
| Routing | React Router DOM 7.1.5 |
| Styling | SCSS (Sass 1.83.4), CSS custom properties for theming (`:root` / `[data-theme="light"]`) |
| Animation | GSAP 3.15.0 + `@gsap/react` 2.1.2 — `ScrollTrigger`, `SplitText`, `Draggable`, `InertiaPlugin`, `DrawSVGPlugin`, `CustomEase`, `MotionPathPlugin`, `ScrambleTextPlugin` (all registered in `lib/gsap.js`; the last four power Experience's filmstrip and shipped free with GSAP after its 2025 Webflow acquisition, no separate paid tier needed) |
| Legacy (marked for removal) | `@react-spring/web` 10.1.2, `@use-gesture/react` 10.3.1 — powered the original orb-nav hero, superseded by the turntable |
| HTTP | Axios 1.7.9 |
| Linting | ESLint 9 (`eslint-plugin-react`, `-react-hooks`, `-react-refresh`) |

### Backend (`server/`)
| Layer | Choice |
|---|---|
| Runtime | Node.js 20.x (bumped from 18.x — EOL — during the 2026-08-05 Railway migration prep) |
| Framework | Express 4.21.2 |
| CORS | `cors` 2.8.5, locked to an explicit origin allowlist (`diegodamian.com`, `www.diegodamian.com`, `localhost:5173`) |
| HTTP | Axios 1.8.4 |
| Transactional email | `resend` 6.18.1 — HTTPS API, powers the contact form. **Not** SMTP/nodemailer; see below |
| Env config | dotenv 16.4.7 |
| Dev reload | nodemon |

**Why Resend's HTTPS API and not nodemailer/SMTP:** Railway blocks outbound SMTP
(ports 25/465/587/2525) on every plan below Pro, to protect its IP reputation. An SMTP
transport there doesn't fail cleanly — it *hangs* until the request times out and
Cloudflare returns its own 502. Any future mail work on this host has to go over
HTTPS. See <https://docs.railway.com/networking/outbound-networking>.

### External APIs — iTunes vs Spotify

These two APIs are never interchangeable and never conflated in this codebase: iTunes is the
visitor's music, Spotify is mine. If you're extending either integration, know which one you're
touching first.

**iTunes Search API — the visitor's music.**
- Public, no auth. **Search is proxied through our backend; preview audio is fetched
  directly from the browser.** The two are deliberately different — see below.
- **Search → `GET /api/itunes/search` (server-side).** Apple's Search API inspects the
  User-Agent: for an `iPhone` UA it answers with a `301` to
  `musics://mzstoreservices-st.itunes.apple.com/search?…`, a custom-scheme deep link into
  the Music app. A browser `fetch` cannot follow a redirect to a non-HTTP scheme, so it dies
  with `ERR_FAILED` and **every iPhone visitor saw an empty record crate**. Measured: Android
  (Pixel 5, Galaxy S9+, Galaxy Tab S4) and iPad are all fine; only iPhone is affected, and
  viewport is irrelevant — a desktop browser sending an iPhone UA fails identically. Node
  sends its own User-Agent, so proxying returns ordinary JSON. The route caches for 10
  minutes (bounded at 200 entries) and rate-limits to 30/min per IP.
- **Preview audio → still direct from the browser.** The `mzstatic.com` CDN sends
  `access-control-allow-origin: *` and does not do the UA redirect. A host-locked
  `/api/itunes/preview-proxy` route exists server-side as a documented, currently-unused
  fallback if Apple ever tightens that too.
- **Rate limiting — two different risks, only one of them mitigated.** These are easy to
  confuse, so be explicit about which is which:
  - *Inbound, per-visitor — mitigated.* The route's **30/min per-IP** limit stops one
    abusive visitor from turning our backend into a free general-purpose iTunes proxy.
    This is the limit the code implements, and it does its job.
  - *Outbound, shared — **not** mitigated.* This is the one that actually changed when we
    started proxying. Previously each visitor's browser called Apple **from their own IP**,
    so Apple's ~20 req/min applied per visitor and was effectively unhittable. Now all
    search traffic leaves from **one Railway egress IP**, so the entire site shares a
    single Apple budget. Apple is also documented to return **spurious `403`s even below
    the stated limit**.

  The 10-minute cache reduces *repeat* queries, and search is 400ms-debounced, but
  **distinct queries from concurrent visitors still stack against the shared budget** — a
  cache cannot help with queries it has never seen. At current traffic this is low risk
  and needs no action. Record it as a **known limitation, not a solved problem**: if the
  crate ever returns empty results for everyone at once, suspect this before suspecting
  the code. Mitigations if it ever bites: a short negative-result cache, a global (not
  per-IP) outbound throttle, or falling back to the client's own IP for non-iPhone UAs.
- **Lesson from the Phase 0 probe:** it tested from a desktop User-Agent only and concluded
  "no backend proxy needed." That held for preview audio and was wrong for search. A
  single-UA probe does not establish how a third-party API behaves for all clients.
- Powers the hero: record-crate search + the 30-second preview audio that plays on the turntable.
- Per-visitor, interactive, real-time — every visitor searches and plays whatever they want.

**Spotify Web API — my music.**
- Server-side only (`server/server.js`). Powers the `#my-taste` section: **my** top tracks and top
  artists, nothing else.
- Exactly **one** authenticated identity — mine. There is no per-visitor Spotify auth anywhere in
  this app, and visitors never see a Spotify login/consent prompt. `GET /api/spotify/top-tracks`
  and `GET /api/spotify/top-artists` just return my already-fetched, server-cached data as
  read-only display content.
- Auth model: one-time manual authorization-code flow. I visit `/login?key=<SPOTIFY_LOGIN_SECRET>`
  myself, approve Spotify's consent screen once, and `/callback` mints an access token + a
  long-lived **refresh token** (persisted as the `SPOTIFY_REFRESH_TOKEN` env var). From then on the
  server refreshes access tokens on its own — no human, no visitor, ever needs to hit `/login`
  again unless the refresh token itself gets revoked. `/login` is gated behind
  `SPOTIFY_LOGIN_SECRET` specifically so a random visitor can't stumble onto it and clobber the
  cached token by completing their own Spotify consent flow.
- Caching, deliberately layered: the access token is cached in memory and only refreshed ~60s
  before its ~1hr expiry (not on every request); the top-tracks/top-artists *responses* are cached
  server-side for a further 20 minutes on top of that, since this data changes slowly and it
  protects the shared Development Mode rate limit from a burst of visitors.
- **Why iTunes handles hero audio instead of Spotify**: Spotify deprecated 30-second `preview_url`
  responses for any app registered after November 27, 2024 — this app has no working path to
  track-preview audio via Spotify at all. iTunes was never a compromise; it's the only API here
  that actually serves that data.
- Endpoints used — confirmed still supported as of the Nov 2024 and Feb 2026 Spotify Web API
  changes: `GET /me/top/tracks` and `GET /me/top/artists` ("Get User's Top Items," scope
  `user-top-read`, `time_range` = `short_term`/`medium_term`/`long_term`). Nothing else is called.
- Endpoints **not** used here and deprecated for Development Mode apps — don't reach for these:
  Recommendations, Related Artists, Audio Features, Audio Analysis, Get Featured/Category
  Playlists (Nov 2024); Get Several Tracks/Artists/Albums, Get an Artist's Top Tracks, Get New
  Releases, Get Available Markets, another user's Profile/Playlists (Feb 2026, along with fields
  `available_markets`, `popularity`, `followers`, `country`, `email`, `explicit_content`,
  `product` being dropped from responses generally). Re-check Spotify's changelog before adding
  any endpoint beyond Top Items — this API's Development Mode surface has shrunk twice in the last
  18 months.
- Quota mode: **Development Mode**, capped at 5 allowlisted users as of Feb 2026 (down from 25) —
  irrelevant here since only my own account is ever allowlisted. As of the same Feb 2026 change,
  **Spotify requires the app owner's account to have an active Premium subscription for a
  Development Mode app to function at all** — keep that subscription active, or the integration
  stops working regardless of what the code does.
- Failure handling: any Spotify error (401/403/429, or a network failure) logs the real status
  server-side and returns a generic `503` to the client. The frontend never surfaces auth mechanics
  — each of the two lists independently renders its own non-alarming inline message ("my listening
  data is taking a nap") while the section's heading and layout stay put.

### Deployment
Both services deploy to **Railway** as two services from this one repo, each with its Root
Directory set to `client/` or `server/` respectively:
- **Backend** (`server/`): plain Nixpacks Node build, `node server.js` (see `server/railway.json`).
- **Frontend** (`client/`): `vite build`, then served by Caddy for SPA-fallback routing
  (`client/nixpacks.toml`, `client/Caddyfile`) — Railway's static-file provider can't be configured
  for client-side-routing fallback, so a hard refresh on `/about` etc. would 404 without it.
- **DNS/TLS**: Cloudflare in front of both (proxied), since Railway doesn't publish a static IP —
  apex/root domains need CNAME flattening, which Cloudflare provides for free. Cloudflare SSL/TLS
  mode must be **Full**, not **Full (Strict)** — Railway serves its shared default cert to
  Cloudflare's edge on proxied domains rather than the domain-specific Let's Encrypt cert, which
  fails hostname validation under Strict mode.
- Previously: frontend on Vercel, backend on Render (`Procfile`) — both retired 2026-08-05.

## Project Structure

```
client/src/
  sections/        one <section> per anchor, in on-page order:
                    home, about, experience, my-taste, projects, connect
  components/       navbar, loading-screen, turntable, vinyl-record, strobe-ring,
                    record-crate, work-motif (Experience's generative backgrounds), ...
  hooks/            use-reduced-motion, use-hash-scroll
  lib/              gsap.js (central plugin registration + the shared CustomEase),
                    scroll.js (Lenis singleton), sections.js (nav order),
                    deck-state.js, tonearm-geometry.js, turntable-audio.js
  styles/main.scss  design tokens + all component styles

server/
  server.js         Express app — Spotify OAuth routes, contact form (Resend),
                    iTunes search proxy, iTunes preview-proxy fallback, CORS lockdown

design-review/     design/build planning, readable by a chat with no repo access
  ROADMAP.md        order of work (Stages 0–8) — authoritative for sequencing
  FINDINGS.md       design analysis: numbered bugs (currently B1–B22),
                    design problems (currently D1–D13)
  STATUS.md         goal scorecard, commit changelog, decisions already made
  screenshots/      current state at desktop/mobile/light — regenerate with
                    capture-screenshots.mjs
```

`design-review/` is not deployed — Railway builds from the `client/` and `server/`
root directories, so nothing there reaches production or affects bundle size.

## Getting Started

```bash
cd client
npm install
npm start        # runs the Express backend (server/) and the Vite dev server together
```

`npm start` runs `dev:server` (`node ../server/server.js`) and `dev:client` (`vite`) concurrently,
so the backend correctly resolves its `.env` relative to `server/` while the frontend serves from
`client/` on `localhost:5173`.

## Roadmap

> **The current plan lives in [`design-review/ROADMAP.md`](design-review/ROADMAP.md)**
> (Stages 0–8), which supersedes the phase sequencing below as of 2026-08-08. The
> Part 3 table is kept as the record of what the turntable work involved and which
> phases are done — but read the roadmap for *order of work*.
>
> Two changes worth knowing without opening it: the turntable moved from last to
> **Stage 1**, on the argument that a working hero is design information the sections
> beneath it depend on; and **Phases 11–12 are folded into Stage 0**, since navbar
> reversion and deleting the orphaned orb components touch nothing the turntable
> needs.

### Part 1 — Shipped
- **Experience timeline correction** (`about.jsx`): added Capgemini/GlobalLogic roles, corrected CodeWiz dates.
- **Loading screen + orb-nav hero** (superseded, see Part 3): ink-navy/cool-white palette tokens, single-page shell (`App.jsx`, `pages/` → `sections/`), GSAP+SplitText loading screen gated to once per session, 5 draggable glowing orbs as the hero's nav.
- **Slim persistent navbar**: link list hidden during the hero, fades in past it via `IntersectionObserver`.

### Part 2 — Disco-ball hero (explored, abandoned)
Fully planned (3D rotating disco balls via React Three Fiber, confetti/club-light celebration) but
abandoned before any implementation — no `three`/`@react-three/*` packages were ever installed.
Superseded entirely by Part 3.

### Part 3 — Turntable hero (current)
The intent: empty platter on load, search the crate for a song, drop it on the platter, and the
30-second preview plays — a literal "welcome to my playground."

**As of 2026-08-08 the hero does not yet do this.** Search works and places artwork on the disc,
but `previewUrl` is captured from the iTunes response and discarded, there is no `AudioContext`
anywhere in the codebase, the platter never spins, and the tonearm is `aria-hidden` decoration.
The copy "put a record on…" is currently a promise the page doesn't keep — which is why
`design-review/ROADMAP.md` promotes Phases 6 + 7 to **Stage 1**.

| Phase | Status | Description |
|---|---|---|
| 0 | ⚠️ Partly wrong | CORS/iTunes probe — concluded direct client-side search + preview-audio fetch needed no backend proxy. **The search half was incorrect** (see below); preview audio still fetches directly |
| 1 | ✅ Done | Hero layout proposal — two-column split-stage/studio-desk hybrid, deck bleeds off the right edge |
| 2 | ✅ Done | Backend CORS lockdown (host-locked preview-proxy kept as documented fallback) |
| 3 | ✅ Done | GSAP `Draggable` + `InertiaPlugin` registered in `lib/gsap.js` |
| 4 | ✅ Done | Turntable visual shell — plinth, platter, tonearm, strobe ring, pitch fader, control cluster (5 review passes: material contrast, tonearm geometry via law-of-cosines, plinth layout balance, strobe-ring moiré fix, control-cluster alignment) |
| 5 | ✅ Done | Record crate search UI — roasted-maple expanding panel, iTunes search, keyboard nav, ARIA combobox/listbox, ships portaled to `<body>` to escape the hero's `overflow:hidden` |
| 6 | ⏳ Not started → **Stage 1** | Drop-record & tonearm animations (needle swings from rest onto the outer groove / label) |
| 7 | ⏳ Not started → **Stage 1** | Audio playback engine — `AudioContext` → `GainNode` → `AudioBufferSourceNode` |
| 8 | ⏳ Not started → Stage 6 | Scratch interaction — `Draggable(type:"rotation")` + `InertiaPlugin` on the platter |
| 9 | ⏳ Not started → Stage 6 | Pitch fader — ±8% `playbackRate`, `preservesPitch = false` |
| 10 | ⏳ Not started → Stage 6 | Scroll-linked ducking + persistent mute button |
| 11 | ⏳ Not started → **Stage 0** | Navbar reversion — remove the hide-during-hero link gating (the turntable doesn't double as nav) |
| 12 | ⏳ Not started → **Stage 0** | Cleanup — delete `nav-orb.jsx`/`orb-field.jsx` + CSS, remove `@react-spring/web`/`@use-gesture/react` |

Stage numbers refer to [`design-review/ROADMAP.md`](design-review/ROADMAP.md) §3. Phases 6 + 7
alone discharge the hero's promise; 8–10 are delight and were deliberately pushed back.

**Shipped since this table was written:**
- ~~contact form (dead Heroku endpoint)~~ — **rebuilt on Resend's HTTPS API** (`ba70f10`,
  2026-08-08). The old form `alert()`ed a thank-you *before* firing the request, at an endpoint
  dead since Heroku's free tier ended; every message sent through it was lost while the sender
  was told it worked.

**Deferred / backlog:** animated SVG+GSAP theme-toggle morph, About-page timeline migration to
`ScrollTrigger` (now Stage 3), mobile hamburger menu — still non-functional, and now tracked as
**B4** in `design-review/FINDINGS.md`: `isMenuActive` is set but never applied to a className,
and `.hamburger` is `display:none` with no media query re-enabling it, so phones get the wrapped
desktop link row.

**Standing action items:**
- **Set `RESEND_API_KEY`** on the Railway **server** service. The contact form returns a clean
  503 ("please email me directly") until it's set — it never accepts a message it can't deliver.
  This is the only required var; `CONTACT_FROM_EMAIL` and `CONTACT_TO_EMAIL` have working
  defaults in `server.js`.
- **Revoke the Gmail app password** at <https://myaccount.google.com/apppasswords> and delete
  `SMTP_USER`/`SMTP_PASS` from `server/.env` and Railway. Dead since the Resend migration, and it
  grants send-as access to a personal Gmail.
- **Update the GitHub repo's "About" website link** — it still points at the retired Vercel URL
  instead of `https://diegodamian.com`. Repo Settings → About → Website. Not a code change; has
  to be done in GitHub's UI.
- ~~Rotate the Spotify client secret on the Spotify developer dashboard~~ — done, secret rotated
  and migrated to the new env vars (2026-08-05); re-confirmed still done 2026-08-08.
- ~~Finish the Railway DNS cutover~~ — done (2026-08-07): `diegodamian.com`/`www` and
  `api.diegodamian.com` are live through Cloudflare (`Full` SSL mode) at the two Railway services.
- ~~Set `SPOTIFY_LOGIN_SECRET` in Railway's env vars~~ — done.
- **Recurring, every ~6 months**: Spotify refresh tokens have a fixed 6-month lifetime no matter
  how active the site is — confirmed in Spotify's own docs, not something this code can work
  around. When `SPOTIFY_REFRESH_TOKEN` expires (or is otherwise invalidated — e.g. rotating the
  client secret may do this too, unconfirmed), the server logs will show
  `invalid_grant: Invalid refresh token` on every refresh attempt and `#my-taste` will degrade to
  its "taking a nap" state. Fix: visit `https://api.diegodamian.com/login?key=<SPOTIFY_LOGIN_SECRET>`
  while logged into the site owner's Spotify account, approve the consent screen, then copy the
  new token from Railway's **server** deploy logs (`✅ New Refresh Token...`) into the
  `SPOTIFY_REFRESH_TOKEN` env var on Railway. Last minted: 2026-08-07.
- Confirm the Spotify account this app authenticates as has an active **Premium** subscription —
  Spotify made this a hard requirement for Development Mode apps in Feb 2026 (see External APIs
  section); without it the `#my-taste` section has no working data path regardless of the code.

## Development Log

Dates below are commit timestamps from `git log`, plus the current working session (not yet
committed).

| Date | What happened |
|---|---|
| 2025-03-29 | Initial buildout: frontend scaffold, Spotify backend integration with token refresh, contact form functionality, `Procfile` for deployment. |
| 2025-03-30 | Iterative styling and bug-fix passes on the contact flow and layout (multiple same-day commits). |
| 2026-01-26 | Spotify API backend rework, frontend + backend deployed live, `vercel.json` added, fluid hero-layout pass. |
| 2026-08-02 14:14–14:43 | Repo hygiene: stopped tracking secrets/`node_modules`, added `.env` to `.gitignore`. |
| 2026-08-02 21:53 | Refactored `client/src/pages` → `client/src/sections`. |
| 2026-08-02 21:54–21:56 | **Turntable Phase 0**: validated iTunes Search + preview-audio CORS (Tier 1 direct-fetch confirmed), added a host-locked preview-proxy fallback, locked down `server.js` CORS to an explicit origin allowlist. |
| 2026-08-02 23:30–23:50 | Registered GSAP `Draggable`/`InertiaPlugin` (`lib/gsap.js`); built `vinyl-record.jsx`; recolored the theme-toggle icons via CSS `mask-image`. |
| 2026-08-03 00:20 | Rebuilt the loading screen as a cursor-leads typewriter effect (GSAP timeline, session-gated, scroll-locked while active). |
| 2026-08-03 01:11–23:00 | Built the turntable deck shell (`turntable.jsx`, `strobe-ring.jsx`) across five review passes: material/contrast pass, tonearm anatomy correction, plinth-ratio and platter-proportion rebalance, strobe-ring moiré diagnosis and fix, tonearm reseat + control-cluster alignment. Every geometry change (tonearm reach, rest angle, strobe radii) was computed via law-of-cosines trigonometry and verified empirically with Playwright + `getBoundingClientRect()`, not eyeballed. |
| 2026-08-03 23:35–23:48 | Built the record crate search UI (`record-crate.jsx`): roasted-maple expanding panel, direct iTunes Search API integration, 400ms-debounced search, keyboard nav, ARIA combobox/listbox, reduced-motion support. Restructured `.home` from flex to CSS Grid so the crate can reorder below the deck on mobile without changing DOM/tab order. Fixed three bugs found during verification: a grain pattern that read as barcode stripes, a mobile panel that opened directly on top of the turntable, and a clipping risk from the hero section's own `overflow:hidden` (solved by portaling the panel to `document.body`). |
| 2026-08-03 23:59 | Committed the full turntable hero + record crate (all of the above, plus the previously-uncommitted orb-nav hero it replaces) in `582f5a0`. |
| 2026-08-05 | **Railway migration prep**: removed dead Vercel/Render deploy artifacts (root `package.json` — a leftover Render install shim with unused `nodemailer`/`body-parser` deps, `Procfile`, both `vercel.json` files); added Railway config-as-code (`server/railway.json`, `client/railway.json`), a Caddy-based SPA static server for the frontend service (`client/nixpacks.toml`, `client/Caddyfile`); made backend CORS origins overridable via an `ALLOWED_ORIGINS` env var and removed the dead hardcoded Render URL fallback; bumped `server/` Node engine target from 18.x (EOL) to 20.x. |
| 2026-08-05 | **Client routing fix**: added a hash-scroll effect (`hooks/use-hash-scroll.js`) so landing on `/about`-style redirect routes (used by the Spotify OAuth callback) actually scrolls to the target section — `<Navigate>` was updating the URL but never the scroll position. |
| 2026-08-05 | **Spotify integration hardening + iTunes/Spotify architecture split documented**: audited the repo for hardcoded credentials (none found; `.env` was never committed); added `server/.env.example` and `client/.env.example`; fixed the OAuth `state` param (was a hardcoded literal — no real CSRF protection — now a random value checked once); gated `/login` behind a new `SPOTIFY_LOGIN_SECRET` so a visitor can no longer clobber the cached token by completing their own Spotify consent flow; removed the frontend's auto-redirect-to-`/login` on a failed fetch (visitors must never be routed into Spotify auth); added a 20-minute server-side cache plus a 60s pre-expiry refresh buffer on top of the existing access-token cache; unified Spotify error handling so 401/403/429/network failures all log the real status server-side and return one generic, visitor-safe `503`; `my-taste.jsx` now fetches tracks/artists independently, each with its own loading/error/empty state, so a Spotify outage degrades gracefully instead of breaking the section. |
| 2026-08-07 | **Live on Railway + Cloudflare**: `fetchTopItems` now serves stale cached data instead of erroring when a live Spotify refresh fails (`ensureAccessToken` no longer gates the route as middleware, so a dead token doesn't block a still-valid cache hit). Fixed a real multi-day Railway deploy saga: the client service's Root Directory wasn't set, so it was building/running the *server's* start command (`Cannot find module '/app/server.js'`); `caddy` installed via `nixPkgs` collided with Nixpacks' own auto-injected Caddy phase from detecting the `Caddyfile` (`nix-env` conflict on `/bin/caddy` from two different nixpkgs snapshots) — fixed by downloading the Caddy binary directly instead of going through Nix packages at all, and disabling Caddy's unauthenticated admin API (`:2019`) since it was showing up as a spurious second port; `client/railway.json`'s manually-set start command (`caddy run` — no `./`) was overriding `nixpacks.toml`'s corrected one, so it was stripped down to just builder+restart-policy; a `nixpacks.toml [variables]` block's value wasn't reaching the shell running its phase's `cmds` in this Nixpacks version, so the Caddy version is hardcoded directly instead. Separately, `VITE_API_BASE_URL` with a trailing slash produced a `//api/...` request path that Express treated as an unregistered route (plain 404, not our JSON handler) — fixed defensively in code (strip trailing slashes) in addition to the env var itself. Cloudflare is now live in front of both services (`Full` SSL mode); `api.diegodamian.com`'s Railway env vars needed the same `SPOTIFY_*` values as local `.env` (they don't carry over automatically), and the first refresh token minted there came back `invalid_grant` — re-ran `/login` against the production domain to mint a fresh one. |
| 2026-08-07 | **Production bug sweep**: three visitor-facing bugs that had been live. `projectsData.js` used the key `live:` while `portfolio.jsx` read `project.liveDemo`, so the Rutgers and **diegospomodoro.com** links silently never rendered — only Harmoni's did. Project videos were `.mov` files declared as `type="video/mp4"`; Chrome and Firefox won't decode QuickTime, so **3 of 4 demos were dead** — repointed to the existing `.webm` encodes, corrected the MIME type, added `preload="metadata"` so expanding a card no longer pulls the whole file before the visitor presses play. Footer copyright was hardcoded `2025`, now derived from the clock. |
| 2026-08-07 | **Deploy weight: 152MB → 9.6MB**. The built output was 152MB, of which **137MB was `.mov` files no browser can play** — Railway uploaded and served all of it on every deploy. Transcoded `rutgers-democracy.mov` (61MB, the only clip lacking a `.webm` twin) to VP9 1920×934 at 3.3MB, verified full duration and clean decode, then deleted all four `.mov` files. Images 11MB → 1.7MB by resizing to what the CSS actually renders: `codewiz.jpeg` was a **7952×5304 (42-megapixel) camera original** displayed as a 400px-tall timeline thumbnail (7.9MB → 181KB), and `usa.png` was 1600px wide for a flag rendered at 20×15px. One trap worth remembering: `sips -Z` sets the *max* dimension, so it silently **upscaled** the 827px-wide `trump.jpeg` to 1200px and made the file *larger* — caught in the before/after size table, redone as recompress-only. Shrinks the deploy, not the 91MB `.git`; the `.mov` blobs are still in history and reclaiming that needs a rewrite. |
| 2026-08-07 | **SEO, favicon, and link previews**: `index.html` was 12 lines with no description, no social tags, and no favicon — pasting the URL anywhere produced a blank grey box. Added Open Graph + Twitter card tags with an **absolute** `og:image` URL (crawlers don't resolve relative paths — the usual cause of a silently blank preview), a 1200×630 `og-image.png` generated from the site's own tokens and Avenir Next with a vinyl motif, `favicon.svg` drawn as a **path** rather than a `<text>` element so it doesn't depend on a font being available, `apple-touch-icon.png` for iOS, `robots.txt`, `sitemap.xml`, dual light/dark `theme-color`, canonical URL, and JSON-LD `Person` schema. Two bugs caught only by validating rather than assuming: `--accent` inside an XML comment in the favicon is an illegal double hyphen (browsers would have shown no icon at all), and the sitemap `xmlns` was wrong — both now pass `xmllint`. |
| 2026-08-08 | **Contact form rebuilt on Resend**. The form had been posting to a Heroku endpoint dead since the free tier ended, and `alert()`ed "Thank you for reaching out!" *before* firing the request — every message was lost while the sender was told it worked. First attempt used nodemailer over Gmail SMTP: worked locally, then failed in production. Two distinct bugs, one masking the other. **(a)** Locally, sends failed ~half the time with `ENETUNREACH` — nodemailer picks one resolved address *at random* (`formatDNSValue`, `lib/shared/index.js`) and decides IPv6 is usable if *any* non-internal interface has an IPv6 address, which the link-local `fe80::` entries every Mac has satisfy even with no IPv6 route. **(b)** The real blocker: **Railway blocks outbound SMTP on every plan below Pro**, so the transport didn't fail, it *hung* until Cloudflare returned its own 502 — a submission that spun for two minutes and died, while the validation path on the same route answered in 118ms. Rewrote on Resend's HTTPS API. Uses the sandbox sender, which needs no verified domain; its only restriction (delivery solely to the Resend account owner's address) is exactly this form's model, so no domain slot is consumed. Note the SDK resolves with `{ data, error }` rather than throwing — an unchecked call reports success on a rejected send, so the error is checked explicitly. Server side also gained the `express.json()` middleware that **had never existed** (any POST would have had `req.body === undefined`), a honeypot, a per-IP rate limit read from `CF-Connecting-IP`, and CR/LF stripping on the fields that reach mail headers. Rate-limit budget is consumed only by sends that actually reach delivery, so a visitor mistyping their email five times isn't locked out for an hour. |
| 2026-08-08 | **Design review + roadmap**: added `design-review/` — 13 Playwright screenshots across desktop/mobile/light theme, plus `FINDINGS.md` (numbered bugs B1–B8, design problems D1–D7), `STATUS.md` (goal scorecard, changelog, decisions already made), and `ROADMAP.md` (Stages 0–8, now authoritative for sequencing). Written self-contained because design research happens in a separate chat with no repo access. Headline finding: the "Work Experience" heading sits at **~1.04:1 contrast in *both* themes** — `.work-experience` inverts its background via `--bg-inverted` while `.work-title` keeps `--text-color`, and both tokens flip together, so the text is invisible either way. Also found: nav links scroll their target *under* the fixed navbar (`scrollIntoView` with no offset), and `#my-taste` mobile detaches track numbers from their titles. The roadmap rejected both design directions originally proposed — the body doesn't need the hero's skeuomorphic material, it needs a shared design system — and promoted the turntable from last to Stage 1, since a working hero is design information the sections beneath it depend on. |
| 2026-08-08 | **iPhone search fix — the record crate was dead on iPhone.** Every query returned "couldn't reach the crate". Apple's iTunes Search API inspects the User-Agent: for an `iPhone` UA it answers a search with a `301` to `musics://mzstoreservices-st.itunes.apple.com/search?…`, a custom-scheme deep link into the Music app. A browser `fetch` cannot follow a redirect to a non-HTTP scheme, so it fails with `ERR_FAILED`. Isolated with a Playwright matrix: **iPhone is the only affected client** — Pixel 5, Galaxy S9+, Galaxy Tab S4 and iPad all returned 200 from a direct fetch — and **viewport is irrelevant**, since a 1440px desktop sending an iPhone UA fails identically while a 390px viewport sending a desktop UA succeeds. Fixed by routing search through a new `GET /api/itunes/search`, where Node's own User-Agent gets ordinary JSON back; Apple's response is passed through untouched so client parsing is unchanged. Added a 10-minute bounded cache (repeat query 234ms → 2ms) and a 30/min per-IP limit so the route can't be used as a free general-purpose iTunes proxy. Verified end-to-end at 5 rows on all five device profiles, down to a 320px-wide Galaxy S9+. This also invalidates half of Phase 0's conclusion: that probe ran from a desktop UA only, which held for preview audio and was never true for search. Fixed `client/.env` in the same pass — it had no URL scheme (`server-production-4a86.up.railway.app`), which axios treats as a relative path; harmless before, but load-bearing now that search depends on the backend. |
