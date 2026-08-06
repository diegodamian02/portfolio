# Diego Damian — Portfolio

Personal portfolio site: a single-page React app with an Express backend, built around a
"welcome to my playground" hero built as a working turntable — search for a song, drop it on
the platter, and its 30-second preview plays through a custom Web Audio graph.

## Tech Stack

### Frontend (`client/`)
| Layer | Choice |
|---|---|
| Framework | React 18.3.1 |
| Build tool / dev server | Vite 6.0.5 |
| Routing | React Router DOM 7.1.5 |
| Styling | SCSS (Sass 1.83.4), CSS custom properties for theming (`:root` / `[data-theme="light"]`) |
| Animation | GSAP 3.15.0 + `@gsap/react` 2.1.2 — `ScrollTrigger`, `SplitText`, `Draggable`, `InertiaPlugin` |
| Legacy (marked for removal) | `@react-spring/web` 10.1.2, `@use-gesture/react` 10.3.1 — powered the original orb-nav hero, superseded by the turntable |
| HTTP | Axios 1.7.9 |
| Linting | ESLint 9 (`eslint-plugin-react`, `-react-hooks`, `-react-refresh`) |

### Backend (`server/`)
| Layer | Choice |
|---|---|
| Runtime | Node.js 18.x |
| Framework | Express 4.21.2 |
| CORS | `cors` 2.8.5, locked to an explicit origin allowlist (`diegodamian.com`, `www.diegodamian.com`, `localhost:5173`) |
| HTTP | Axios 1.8.4 |
| Env config | dotenv 16.4.7 |
| Dev reload | nodemon |

### External APIs — iTunes vs Spotify

These two APIs are never interchangeable and never conflated in this codebase: iTunes is the
visitor's music, Spotify is mine. If you're extending either integration, know which one you're
touching first.

**iTunes Search API — the visitor's music.**
- Public, no auth, called **directly from the browser** — confirmed via a live CORS probe that
  both `itunes.apple.com/search` and the `mzstatic.com` preview-audio CDN send permissive CORS
  headers, so no backend proxy is needed. A host-locked `/api/itunes/preview-proxy` route exists
  server-side anyway, as a documented, currently-unused fallback in case Apple ever tightens that.
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
  sections/        one <section> per anchor: home, projects, my-taste, about, connect
  components/       navbar, loading-screen, turntable, vinyl-record, strobe-ring, record-crate, ...
  hooks/            use-reduced-motion
  lib/              gsap.js (central plugin registration), scroll.js, sections.js
  styles/main.scss  design tokens + all component styles

server/
  server.js         Express app — Spotify OAuth routes, iTunes preview-proxy fallback, CORS lockdown
```

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

### Part 1 — Shipped
- **Experience timeline correction** (`about.jsx`): added Capgemini/GlobalLogic roles, corrected CodeWiz dates.
- **Loading screen + orb-nav hero** (superseded, see Part 3): ink-navy/cool-white palette tokens, single-page shell (`App.jsx`, `pages/` → `sections/`), GSAP+SplitText loading screen gated to once per session, 5 draggable glowing orbs as the hero's nav.
- **Slim persistent navbar**: link list hidden during the hero, fades in past it via `IntersectionObserver`.

### Part 2 — Disco-ball hero (explored, abandoned)
Fully planned (3D rotating disco balls via React Three Fiber, confetti/club-light celebration) but
abandoned before any implementation — no `three`/`@react-three/*` packages were ever installed.
Superseded entirely by Part 3.

### Part 3 — Turntable hero (current)
The hero is a working turntable: empty platter on load, search the crate for a song, drop it on
the platter, and the 30-second preview plays — a literal "welcome to my playground."

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | CORS/iTunes probe — confirmed direct client-side search + preview-audio fetch, no backend proxy needed |
| 1 | ✅ Done | Hero layout proposal — two-column split-stage/studio-desk hybrid, deck bleeds off the right edge |
| 2 | ✅ Done | Backend CORS lockdown (host-locked preview-proxy kept as documented fallback) |
| 3 | ✅ Done | GSAP `Draggable` + `InertiaPlugin` registered in `lib/gsap.js` |
| 4 | ✅ Done | Turntable visual shell — plinth, platter, tonearm, strobe ring, pitch fader, control cluster (5 review passes: material contrast, tonearm geometry via law-of-cosines, plinth layout balance, strobe-ring moiré fix, control-cluster alignment) |
| 5 | ✅ Done | Record crate search UI — roasted-maple expanding panel, iTunes search, keyboard nav, ARIA combobox/listbox, ships portaled to `<body>` to escape the hero's `overflow:hidden` |
| 6 | ⏳ Not started | Drop-record & tonearm animations (needle swings from rest onto the outer groove / label) |
| 7 | ⏳ Not started | Audio playback engine — `AudioContext` → `GainNode` → `AudioBufferSourceNode` |
| 8 | ⏳ Not started | Scratch interaction — `Draggable(type:"rotation")` + `InertiaPlugin` on the platter |
| 9 | ⏳ Not started | Pitch fader — ±8% `playbackRate`, `preservesPitch = false` |
| 10 | ⏳ Not started | Scroll-linked ducking + persistent mute button |
| 11 | ⏳ Not started | Navbar reversion — remove the hide-during-hero link gating (the turntable doesn't double as nav) |
| 12 | ⏳ Not started | Cleanup — delete `nav-orb.jsx`/`orb-field.jsx` + CSS, remove `@react-spring/web`/`@use-gesture/react` |

**Deferred / backlog:** contact form (dead Heroku endpoint), animated SVG+GSAP theme-toggle morph,
About-page timeline migration to `ScrollTrigger`, mobile hamburger menu (currently non-functional).

**Standing action items:**
- ~~Rotate the Spotify client secret on the Spotify developer dashboard~~ — done, secret rotated
  and migrated to the new env vars (2026-08-05).
- Finish the Railway DNS cutover: point `diegodamian.com`/`www` and a `api.diegodamian.com`
  (or similar) subdomain through Cloudflare at the two Railway services, then update
  `SPOTIFY_REDIRECT_URI` in both the Spotify dashboard and Railway's env vars to the new backend
  domain once it's live.
- Set `SPOTIFY_LOGIN_SECRET` in Railway's env vars for the `server/` service before it goes live —
  without it, `/login` is unauthenticated (fine for local dev, not for production).
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
