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

### External APIs
- **Spotify Web API** — OAuth (authorization-code + refresh-token flow), top tracks/artists for the "My Taste" section.
- **iTunes Search API** — fetched directly client-side (no backend proxy needed). Confirmed via a live browser CORS probe that both `itunes.apple.com/search` and the `mzstatic.com` preview-audio CDN send permissive CORS headers. A host-locked `/api/itunes/preview-proxy` route exists server-side as a documented, currently-unused fallback.

### Deployment
- Frontend: Vercel (SPA rewrite config in `vercel.json`).
- Backend: Render, via a `Procfile` (`web: node server/server.js`).

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

**Standing action item:** rotate the Spotify client secret on the Spotify developer dashboard
(flagged due to prior public-repo exposure).

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

*This log reflects the state of the working tree as of the last update. Commit the current
session's changes (turntable + record crate) to fold this work into `git log` proper.*
