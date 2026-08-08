# design-review/

Working folder for design iteration on diegodamian.com.

## Why this exists

Design research happens in a separate chat that has **no access to this repository**.
That chat needs to see the site and understand its constraints, so everything here is
written to travel: plain files on disk, self-contained prose, images as separate
attachments rather than embedded.

```
design-review/
  FINDINGS.md              design analysis: bugs, design problems, open questions
  STATUS.md                project state: goal scorecard, changelog, what's missing
  screenshots/             what the site actually looks like
  capture-screenshots.mjs  regenerates screenshots/
```

**Which doc to share.** They answer different questions and are deliberately separate:

- **`FINDINGS.md`** — *what is wrong with the design and what should change.* Send
  this for design/UX research. Self-contained: stack constraints, design tokens,
  numbered bugs (B1–B7) and design problems (D1–D7).
- **`STATUS.md`** — *where the project stands and what is left.* Send this when the
  question is scope, sequencing, or priorities. Includes a goal scorecard, a
  changelog of recent commits with the reasoning behind each, outstanding manual
  tasks, and a decisions-already-made list so settled questions don't get reopened.

Send both when the other chat needs to propose *what to build next* rather than
*how a section should look*.

## Workflow

1. **Capture** — regenerate `screenshots/` after any visual change (see below).
2. **Share** — paste the relevant doc into the research chat and attach the
   screenshots it references. Neither assumes repo access.
3. **Decide** — bring conclusions back here as a direction, not as loose suggestions.
4. **Build** — implement in `client/`, then re-capture and diff against the previous
   screenshots.
5. **Record** — update `STATUS.md` (what shipped) and `FINDINGS.md` (what that
   resolved or revealed).

Step 5 is the one that makes this work. Both files are the durable memory of this
project — assume any chat reading them starts from zero.

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
