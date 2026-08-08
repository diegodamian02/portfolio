# design-review/

Working folder for design iteration on diegodamian.com.

## Why this exists

Design research happens in a separate chat that has **no access to this repository**.
That chat needs to see the site and understand its constraints, so everything here is
written to travel: plain files on disk, self-contained prose, images as separate
attachments rather than embedded.

```
design-review/
  FINDINGS.md              current state, bugs, design problems, open questions
  screenshots/             what the site actually looks like
  capture-screenshots.mjs  regenerates screenshots/
```

## Workflow

1. **Capture** — regenerate `screenshots/` after any visual change (see below).
2. **Share** — paste `FINDINGS.md` into the research chat and attach the relevant
   screenshots. It is self-contained; it does not assume repo access.
3. **Decide** — bring conclusions back here as a direction, not as loose suggestions.
4. **Build** — implement in `client/`, then re-capture and diff against the previous
   screenshots.

Keep `FINDINGS.md` current. It is the durable memory of this work — assume any chat
reading it starts from zero.

## Regenerating screenshots

```bash
cd client
npx vite build
npx vite preview --port 5173 &

node ../design-review/capture-screenshots.mjs

# downscale desktop shots to native 1440px so they stay repo-sized
cd ../design-review/screenshots
for f in *-desktop.png *-light.png; do sips --resampleWidth 1440 "$f" --out "$f"; done
```

Requires `playwright` (`npm i -D playwright`).

**Port 5173 is not arbitrary.** The backend's CORS allowlist permits `localhost:5173`
and not `4173`. On the wrong port, `#my-taste` renders its "taking a nap" error state
and the screenshots will look like a broken Spotify integration when nothing is wrong.

To shoot production instead:

```bash
BASE=https://diegodamian.com/ node design-review/capture-screenshots.mjs
```

## Notes

- Desktop captures are native 1440px wide; mobile stays at 2× (780px) because 390px
  native is too small to read and those files are only tens of KB.
- This folder is **not deployed**. Railway builds from `client/` and `server/` root
  directories, so nothing here reaches production or affects bundle size.
