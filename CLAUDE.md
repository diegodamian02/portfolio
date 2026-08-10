# diegodamian.com

Personal portfolio, live and used for an active job search. Treat production
breakage as urgent — a broken page is a lost recruiter.

## Shape

| Path | What |
|---|---|
| `client/` | React 18 + Vite 6, plain SCSS, GSAP. Deployed as static. |
| `server/` | Express API on Railway, Cloudflare in front. |
| `design-review/` | Project memory. **Not deployed** — Railway builds only `client/` and `server/`. |

Styling is a **single file**: `client/src/styles/main.scss` (~1,890 lines). No CSS
modules, no Tailwind, no styled-components. Match the surrounding SCSS idiom.

## Running it

```bash
cd client && npm run dev     # starts BOTH the Express server and Vite
```

**The dev client must be on port 5173.** The backend's CORS allowlist
(`DEFAULT_ALLOWED_ORIGINS`, `server/server.js`) permits `localhost:5173` and
nothing else local. `npm run preview` serves on **4173**, where `#my-taste` and
the record crate fail with their generic error states — which reads exactly like
a real bug and isn't one. If you need the production build locally, either use
5173 or set `ALLOWED_ORIGINS`.

`npm run lint` currently reports **16 errors** (mostly `react/no-unescaped-entities`).
That's the known baseline, tracked as Stage 8 — don't treat it as a regression, but
don't add to it either.

## Things that will mislead you

- **`VITE_*` vars are baked at build time**, not read at runtime. Changing one on
  Railway does nothing until the client is rebuilt.
- **Railway blocks outbound SMTP** (25/465/587/2525) below the Pro plan, and it
  *hangs* rather than failing — 120s, then a Cloudflare 502. The contact form uses
  **Resend's HTTPS API**. Do not reintroduce nodemailer or any SMTP transport.
- The Resend SDK returns `{ data, error }`; it does **not** throw on a failed send.
  Check `error` explicitly.
- **iTunes search must go through `GET /api/itunes/search`.** Apple's Search API
  inspects the User-Agent and 301-redirects `iPhone` UAs to a `musics://` scheme
  that `fetch` cannot follow. Direct browser calls are dead on iPhone only —
  Android, iPad and desktop all work, so this does not reproduce unless you
  emulate an iPhone specifically.
- Cloudflare is on `Full`, not `Full (Strict)`.

## Theming

CSS custom properties on `:root` / `[data-theme="light"]`. There is an **inverted
token trio** — `--bg-inverted` / `--text-inverted` / `--secondary-text-inverted`.

Both token sets flip together, so a region that sets `--bg-inverted` **must** flip
every text token with it. Using `--text-color` inside such a region lands text at
~1.05:1 in *both* themes — invisible either way. Verify contrast by measuring
computed colors from the rendered DOM, not by looking at a screenshot.

`--navbar-height` / `--scroll-offset` drive the fixed-navbar scroll offset. The
navbar has no explicit height, so `--navbar-height` is a *measured* constant
re-declared at the two breakpoints where `.logo` shrinks. If you change `.logo`'s
font-size, re-measure and update it.

## design-review/ is the project's memory

Read it before planning work. Precedence when they disagree:

**`ROADMAP.md` > `STATUS.md` > `FINDINGS.md`**

- `ROADMAP.md` — authoritative for *sequencing* (Stages 0–8) and for decisions
  already made. Don't relitigate a resolved question.
- `STATUS.md` — what shipped, with measurements.
- `FINDINGS.md` — the bug (B*) and design-problem (D*) registers.

Update them when a stage lands. They are read by a **separate Claude chat doing
UI/UX research that has no repository access** — so anything meant for that chat
must be a **file on disk** (Markdown, or a PNG in `design-review/screenshots/`).
Never an Artifact; it can't read those.

`node design-review/capture-screenshots.mjs` regenerates the screenshot set. Shots
are element-clipped, so scroll position doesn't affect them.

## Working agreement

- **Push after every commit.** Commits have sat unpushed here before.
- Verify with measured numbers rather than screenshots where a number exists —
  contrast ratios, scroll offsets, bundle sizes, before/after.
- When a task brief describes the code, check it against the tree first. Several
  briefs have named selectors or files that didn't match reality; say so rather
  than implementing against the description.
