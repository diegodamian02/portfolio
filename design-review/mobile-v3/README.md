# Mobile v3 — "Pocket Player" + the Snow White deck

**Stage 12** of `../ROADMAP.md`. This file is the spec; `../STATUS.md` §2 carries
the measurements from each sub-task as it lands.

The lab page is **`/lab/deck/`** on the dev server (trailing slash; the
slashless form redirects). It is a separate Vite entry and is never built —
§5.

> **Stage number, read this first.** The task brief that commissioned this work
> called it "Stage 10." **Stage 10 is already taken** — `ROADMAP.md` §3 has
> *"Stage 10 — sitewide typography: Poppins replaces the Avenir Next stack
> (2026-09-01)"*, shipped, and Stage 11 ("Studio Paper", three phases) is taken
> too. So this is **Stage 12**, and the sub-tasks are **12.1 – 12.5** in the
> same order the brief gave them. A later brief that says "task 10.2" means
> **12.2**.

Design canvas: published Artifact *"diegodamian.com — mobile UI inspo +
directions"*, Turntable page, row **"Picked: Snow White"**.

---

## 1. The direction, in one paragraph

On phones the site stops being a scrolling page with a turntable in it and
becomes an **app shell**. A floating glass **mini-player dock** sits at the
bottom of every section. Tapping the dock opens a **now-playing bottom sheet**
that holds the turntable. The record crate ("IN THE CRATE · DIEGO'S FAVORITES")
stays in the hero, where it already is. The theme toggle stays.

Decided, not open. Nothing below relitigates it.

---

## 2. The deck — "Snow White"

After the Braun SK4 (1956, Rams/Gugelot), nicknamed *Snow White's coffin* for
its white body and clear acrylic lid. **One geometry, two themes.**

| Token | Studio Paper (light) | Graphite (dark) |
|---|---|---|
| Deck body | `#FFFFFF → #F1EEE8` gradient | `#3A3D44 → #24262B` |
| Deck edge (thickness layer) | `#D4CEC2` | `#141518` |
| Platter ribs | `#D8D3C9` / `#C3BDB1` | `#5A5E67` / `#3C3F46` |
| Lid | `rgba(170,200,225,0.20)`, border `rgba(80,100,130,0.35)` | `rgba(15,17,22,0.45)`, border `rgba(255,255,255,0.16)` |
| Tonearm | white, ink (`#1C2030`) headshell | silver, ember (`#FF8A5C`) headshell |
| Accent | `#B8441C` | `#FF8A5C` |
| Record label | the song's colour (per track) | same |

These are live as `--deck-sw-*` custom properties on `:root` /
`[data-theme="light"]` in `client/src/styles/main.scss`, following the existing
theming idiom. Prefix is `--deck-sw-` and not `--deck-`: the five existing
`--deck-*` tokens mix every production-deck surface against `--deck-ground` so
the whole hierarchy shifts with the page, which is right for a deck made of the
page's own material and wrong for an SK4, whose body is a specific white.

Two values the design table did not specify, added here: the wax (`#15171C`,
constant in both themes — a record is a record) and the arm's shaded side,
because a tube needs a lit edge and a dark one or it renders as a drawn line.

**Contrast, measured from computed styles** (`contrast.mjs`, resolved through
the rendered DOM — not read off the hexes above, and not sampled from a
screenshot):

| pair | Graphite | Studio Paper | floor |
|---|---|---|---|
| accent on page background | **8.29:1** | **4.76:1** | 4.5 |
| accent on body, light stop | **4.68:1** | **5.41:1** | 4.5 |
| accent on body, dark stop | **6.52:1** | **4.67:1** | 4.5 |
| headshell on body | 6.52:1 | 13.96:1 | 3 |

Every text use clears 4.5:1 in both themes, the worst case being Studio Paper's
accent on the body gradient's dark stop at 4.67:1. The remaining pairs are
material gradations, not contrast relationships — ribs against each other are
1.62:1 / 1.25:1 by design.

One of those non-text numbers did produce a change: **the white deck sits at
1.14:1 against Studio Paper's warm near-white page.** The silhouette was being
carried by a 1px inset rule, which at a 56° tilt is most of the outline. The
body now casts a shadow tinted off `--deck-sw-edge`. Logged as **D36** in
`FINDINGS.md`.

---

## 3. The 3D approach

**CSS 3D + GSAP only.** A `perspective` stage, `transform-style: preserve-3d`
containers, and stacked layers. No three.js, no R3F, no Spline, no Motion.
**Nothing was added to `package.json`** — GSAP is already installed with every
plugin this needs (`Draggable`, `InertiaPlugin`, `CustomEase`, `CustomBounce`,
`Flip` are all registered in `client/src/lib/gsap.js`).

```
.sw-stage                    perspective: 900px, never transformed
  .sw-deck                   rotateX            [animated]
    .sw-deck-body            rotateZ            [animated]  + body gradient
      .sw-deck-edge          translateZ(-16px)                thickness
      .sw-platter            translateZ(3px)                  ribs
        ::after              translateZ(14px)                 THE SHINE
        .sw-record           translateZ / settle [animated]
          .sw-record-spin    rotate             [animated]  + wax, label, hole
        .sw-ring ×2          scale / opacity    [animated]
      .sw-arm                translateZ + rotate [animated]
        .sw-arm-head                                          the stylus
      .sw-lid                translateZ + rotateX [animated]
```

**10 transformed elements, 7 of them animated**, counted from the rendered DOM
(`perf-trace.mjs` reports it). Everything else — the shine, the counterweight,
the label, the grooves, the spindle hole — is a pseudo-element or a background
layer, neither of which costs a compositor layer.

Three structural decisions worth knowing before Stage 12.4 touches any of it:

**The deck needs two elements, not one.** The spec is
`rotateX(56deg) rotateZ(-24deg)` — X first, then Z *in the already-tilted
frame*. GSAP writes its own fixed transform order
(`translate3d() rotate() rotateX() rotateY() scale()`), so putting `rotationX`
and `rotation` on one element yields `rotate(-24) rotateX(56)`, which is a
different matrix and a visibly different view. Splitting the two rotations
across `.sw-deck` and `.sw-deck-body` reproduces the spec exactly, for the cost
of one element.

**The shine is the platter's `::after`, not a child of the record.** It sits at
a *higher* `translateZ` than the record, so it paints over the disc, but it
hangs off the platter, which never rotates. A sheen that turns with the record
reads as a painted mark on the vinyl instead of a reflection off it.

**No `mask-image` anywhere in the deck.** `mask` is a grouping property: using
it forces `transform-style` back to `flat` and collapses the record and both
rings out of the 3D scene. Where an annulus was needed (the platter's machining
ribs) it is composed from stacked `background` layers instead — an opaque
radial disc painted over the inner 68% of a full-radius
`repeating-conic-gradient`. That also fixes the moiré starburst a full-radius
conic gradient draws at its own centre, which is exactly the frame the record
is still in the air for.

---

## 4. The drop sequence

Tap to sound, ~1.7s, every beat overlapping the next.

| t (ms) | Beat | Ease |
|---|---|---|
| 0 | tap — sleeve lifts (scale 1.04) | `power2.out` / `power2.inOut` |
| 0–620 | sheet rises | *(Stage 12.2, not in the spike)* |
| 150–850 | lid swings open to `rotateX(-105deg)` about its back edge | `power3.out` |
| 100–1100 | deck tilts flat → 3/4: `rotateX(56deg) rotateZ(-24deg)` | `swDeckTilt` (CustomEase) |
| 600–1360 | record falls from `translateZ(260px)` onto the platter and settles | `swRecordLand` (CustomBounce) |
| 1000–1550 | tonearm swings in (22° → 37°) | `power2.inOut` |
| 1450 | platter to 33⅓ (1.8s/rev) + two light rings burst in the label colour | — |
| 1550–1700 | needle down — a Z drop, 15px → 9px | `power2.in` |
| **1700** | **needle contact — where `playCached()` goes in production** | — |

The sleeve lift belongs to the **sleeve**, not the deck: in production the
sleeve is a record-crate card and the deck has no reference to it. The lab
reproduces it on its own crate buttons so the overlap can be judged.

Positions are absolute, never chained off durations. Chaining re-derives each
moment from whatever the previous tween's duration happens to be, which is how
the production deck's needle-contact call site once desynced from its audio
(`turntable.jsx`, `NEEDLE_CONTACT`).

**Eases.** `swDeckTilt` is `cubic-bezier(0.34, 0.02, 0.18, 1)` restated as a
`CustomEase` path — a touch of ease-*in* at the head (the deck has mass and has
to be got moving) and a long settle with no overshoot, deliberately not the
front-loaded `SIGNATURE_EASE` the sections share. `swRecordLand` is
`CustomBounce.create("swRecordLand", { strength: 0.22 })` — subtler than the
0.3 My Taste's cards settled on, and with **no `squash` key**, because
`CustomBounce` only creates the paired `-squash` ease when squash is truthy and
a rigid 12" disc does not squash on contact.

Both eases, and the direct `import { CustomEase } from "gsap/CustomEase"`
(`lib/gsap.js` registers CustomEase but does not export it), are deliberately
local to `snow-white-deck.jsx` so the spike changes no shared module. Stage
12.4 promotes all three into `lib/gsap.js`.

### Reversibility

`lift()` is `timeline.reverse()`, and it lands on the **exact** initial
transform matrices from any point — verified, not assumed (§6).

Two things make that true. First, every beat is a plain `to` tween built on top
of an explicit `gsap.set()` initial state, so the value GSAP records as the
tween's start *is* the rest state. Second, the two things that are **not** in
the timeline get unwound by hand: the infinite spin tween (an infinite repeat
has no progress-0 to return to) and the ring burst (fired imperatively).
`lift()` kills the rings up front and the timeline's `onReverseComplete`
re-zeroes the record's rotation, which is invisible by then because the disc
has already flown back up off the platter.

**The spin/ring beat cannot use `tl.reversed()`.** It is a `.call()` callback,
GSAP runs callbacks when the playhead crosses them in *either* direction, and
`reversed()` reports the reverse *flag*, which a `seek()` never sets. Seeking
from 1.7s back to 0 therefore crossed the beat with `reversed()` still false
and fired the forward branch — the t=0 spec screenshot came out with two rings
in it. Every entry point (`drop`, `lift`, `seek`) now declares its own
direction in a ref, and the callback reads that. **D37** in `FINDINGS.md`.

### Reduced motion

`prefers-reduced-motion: reduce` gets a crossfade: the record fades in over
180ms onto a deck that **stays flat**, with the lid already open and the arm
already on the groove. No tilt, no fall, no rings, no spin — the same bargain
the production deck's reduced-motion branch already strikes (`setSpin` returns
early). `will-change` is cleared on the six layers that exist only to be
animated, since a promoted layer that will never change is wasted.

### Repeat drops

The first drop of a visit runs at `timeScale(1)`. Every later one runs at
**1.4**, so all seven beats compress together and the overlaps hold their
shape. "Per visit" is per mount, which for the Pocket Player is per visit — the
sheet keeps the deck mounted.

---

## 5. What does and does not ship

The lab is **its own Vite entry**: `client/lab/deck/index.html` +
`main.jsx` + `deck-lab.jsx`. `vite build` only builds the root `index.html`
unless extra inputs are listed in `build.rollupOptions.input`, and this one is
deliberately not listed — so it is dev-only **by construction**, and
`client/src/App.jsx` is **byte-unchanged** by this stage.

### The first version of this was wrong, and the way it was wrong is worth keeping

It started as a DEV-gated route inside `App.jsx`:

```js
const DeckLab = import.meta.env.DEV ? lazy(() => import("./lab/deck-lab.jsx")) : null;
// ...then an early return from App() when location.pathname === "/lab/deck"
```

That is airtight for *shipping* — Vite substitutes `false`, Rollup folds the
branch, and the measured JS delta was 0 bytes. It is useless for *loading*. An
early return runs at render time, by which point every static `import` at the
top of `App.jsx` has already been evaluated: all six sections,
`turntable.jsx`, the audio engine, the record crate, the walkman, the skyline
canvas — **and every image asset in the site**.

Measured on the dev server, the two versions of the same page
(`load-cost.mjs`):

| | DEV gate inside `App.jsx` | own Vite entry | the whole site, for scale |
|---|---|---|---|
| `src/` modules | **49** | **4** | 47 |
| requests | 99 | 36 | 124 |
| transferred | *(not reliably measured — see below)* | 2,022 KB | 5,614 KB |
| interactive, localhost | 338ms | 226ms | 309ms |

**The module count is the number that matters, and it is the one that was
measured correctly.** The old version loaded 49 of the site's 47 `src`
modules — i.e. the entire application plus the lab itself — including
`turntable.jsx`, `turntable-audio.js`, all six sections, the crate, the
walkman, the skyline canvas, and the image assets `graduation.jpg`,
`colegio.jpg`, `codewiz.jpeg` and `diego.jpg`, none of which the lab renders.
The new entry loads **four**: `snow-white-deck.jsx`, `deck-lab.jsx`,
`lib/gsap.js` and `main.scss`.

> **The byte figures for the old version are withdrawn.** They were produced
> by a probe that accumulated into a running total from inside an `async`
> response handler and printed it before those `response.body()` promises had
> resolved — undercounting by roughly 15×, on *both* sides of the comparison,
> which is what made it look self-consistent. It reported 4,193 KB against
> 133 KB. The true current figure is 2,022 KB, and the old version was never
> measured accurately before it was deleted. The module and request counts
> above are unaffected: those are synchronous counts of response URLs, with
> no promise to lose. **FINDINGS D39.**

Note what the corrected bytes actually say: on a dev server **~1.1 MB of the
lab's 2 MB is Vite's unminified prebundled React and GSAP** (a single 910 KB
chunk, plus `gsap_ScrollTrigger.js` at 104 KB — `lib/gsap.js` registers every
plugin), and the site pays for the same chunks. So bytes are a poor
discriminator here and the lab can never be a small *fraction* of the site on
a dev server. `load-cost.mjs` therefore gates on the module count (ceiling 8)
and keeps the byte ratio only as a loose backstop.

On localhost the whole difference is 112ms, which is how the original version
survived a full measurement pass — **every number in §6 is taken over
loopback.** It surfaces the moment the lab is opened the way it is meant to
be opened: a phone, over Wi-Fi, against an unbundled dev server. Reported
from the device as "taking forever to load", and correctly so.

**The general point:** gating a dev-only page on `import.meta.env.DEV` inside
a component answers "does it ship?" and says nothing about "what does it
cost to open?". For a page whose entire purpose is to be loaded on a slow
device, the second question is the one that matters. A separate entry answers
both.

The URL keeps its trailing slash (`/lab/deck/`). A dev-only Vite middleware
(`labTrailingSlash` in `vite.config.js`, `apply: 'serve'`) 301s the slashless
form onto it — without that the SPA history fallback catches `/lab/deck`
first and serves the **root** `index.html`, i.e. typing the URL on a phone
silently loads the whole site. A silent wrong page is worse than a 404.

### Verified against the built `dist`

| | production build |
|---|---|
| HTML files emitted | **1** (`dist/index.html`) — no `lab/deck/index.html` |
| JS chunks emitted | 1 |
| occurrences of `deck-lab` / `__deckLab` / `swDeckTilt` in `dist/` | **0** |
| **JS delta** | **0 bytes** — the bundle hashes byte-identical to `main` |
| CSS, raw | 74,157 → 79,597 (**+5,440**) |
| CSS, gzipped | 14,653 → 15,747 (**+1,094**) |

**The CSS does ship.** Styling in this project is one file (`main.scss`) and it
is always built, so the `.sw-*` and `.deck-lab-*` rules cost ~1.1 KB gzipped on
every page load while the markup that uses them cannot be reached. That is the
price of the brief's "styles go in main.scss" instruction, and it is the right
trade for a spike; if Stage 12 were ever abandoned, deleting the block is a
single contiguous edit.

The lab also sits **outside the site shell** — no `LoadingScreen` covering the
first 900ms of every measurement, no `Navbar` taking 120px off a phone screen,
no Lenis owning the scroll. It does not mount `<React.StrictMode>` either:
StrictMode double-invokes effects, which would build the deck's GSAP timeline
twice and leave the first one's spin tween orphaned on the platter — a second
writer on the rotation for the whole session, quietly corrupting every
frame-time and reverse measurement taken off the page.

---

## 6. Measurements

Scripts live beside this file. All of them need the dev server **on :5173**
(`cd client && npm run dev` — see `CLAUDE.md`; 4173 is the wrong port).

```bash
node design-review/mobile-v3/run-all.mjs       # all four, in order
#   or individually:
node design-review/mobile-v3/contrast.mjs      # accent ratios, both themes
node design-review/mobile-v3/reverse-test.mjs  # reverse() exactness
node design-review/mobile-v3/perf-trace.mjs    # frame times, 4x CPU throttle
node design-review/mobile-v3/lab-shots.mjs     # spec frames + overflow/pageerror
node design-review/mobile-v3/load-cost.mjs    # what the page costs to OPEN (not in run-all)
```

**Run `run-all.mjs` rather than the suites by hand on a dev server that has
just started**, including after any edit to `vite.config.js`, which restarts
it. It fetches `/lab/deck/` twice before anything is measured. Vite transforms
modules on first request and caches them; on a cold server that work lands
inside whichever suite goes first, and it is not subtle — observed once as
`reverse-test.mjs` timing out waiting for the probe and `perf-trace.mjs`
reporting single **210–230ms** frames in three of four cases. Both came back
clean the moment the page had been loaded once. `perf-trace.mjs` additionally
throws away one unsampled drop per theme, for the same reason at a smaller
scale: GSAP's first transform parse, the first promotion of the ten 3D layers
and the first rasterisation of the platter's conic gradient all happen once
and would otherwise be charged to whichever case ran first.

They are **standalone scripts, not `client/playwright.config.js` projects**, on
purpose: that config sets `reducedMotion: 'reduce'` globally for every project,
deliberately, so the e2e suite gets GSAP entrances snapped to their finished
state. Running the drop under it would measure the reduced-motion branch, which
by design has no tilt, no fall, no rings and no spin. Same reason
`design-review/scratch-tests/` is standalone.

### Frame times — Pixel 7, Chromium, 4× CPU throttle

Drop (1.7s) + 5s of spinning, **three runs per case, all shown**. One run is
not a measurement on a shared laptop. Throttle verified in-run by timing a
fixed arithmetic burn with and without it (104ms → 392ms, i.e. 3.78× for a
requested 4×; CDP throttling is approximate).

| case | run | frames | avg | p95 | worst | dropped (>33.3ms) |
|---|---|---|---|---|---|---|
| Graphite, rings on | 1 / 2 / 3 | 402 / 400 / 402 | 16.67 / 16.70 / 16.67 | 18.2 / 18.4 / 18.3 | 18.6 / **34.3** / 18.6 | 0 / **1** / 0 |
| Graphite, rings off | 1 / 2 / 3 | 402 / 401 / 402 | 16.66 / 16.67 / 16.67 | 18.3 / 18.0 / 18.1 | 18.7 / 18.7 / 18.6 | 0 / 0 / 0 |
| Studio Paper, rings on | 1 / 2 / 3 | 402 / 401 / 399 | 16.67 / 16.66 / 16.79 | 18.1 / 18.1 / 18.4 | 18.8 / 18.7 / **50.0** | 0 / 0 / **1** |
| Studio Paper, rings off | 1 / 2 / 3 | 402 / 402 / 402 | 16.67 / 16.67 / 16.66 | 18.1 / 18.2 / 17.9 | 18.6 / 18.7 / 18.7 | 0 / 0 / 0 |

**10 of 12 runs are a clean 60Hz with zero dropped frames** — ~402 frames over
a 6.7s window is exactly the 60Hz ceiling, and the typical worst frame is
18.6–18.8ms. Two runs dropped exactly one frame each (34.3ms and 50.0ms), in
different cases on each repeat, at a host load average of **11.46**. A
regression does not move between cases run-to-run; host contention does.
**No frame exceeded 100ms in any of the twelve runs.**

**The rings cost nothing measurable** — rings-on and rings-off are the same
to two decimal places, and rings-*off* carried neither of the two dropped
frames only by coincidence of which run the host stalled on. Re-run at **8×
throttle**: still 402 frames, still zero dropped, worst still 17.7ms.

**Read the ">16.7ms" column with care** — the script reports it because the
brief asks for it, and it is close to meaningless. At a 60Hz mean of 16.67ms
roughly half of all frames land a rounding error above 16.7 while nothing has
been dropped. The dropped column (a gap of two vsync intervals) is the honest
one.

> **These numbers replace an earlier set, and the reason matters.** The first
> version of the rAF probe gated its loop on a single shared boolean, set
> false at the end of a run and true at the start of the next — so the
> previous run's loop found the flag true again on its next tick and
> **resurrected itself**. Two loops then wrote into the same array, and the
> zombie's first delta spanned the whole gap between runs. It produced 415
> frames in a window where 60Hz allows 402 (physically impossible, and what
> gave it away) and single "frames" of 210–317ms reported as dropped frames.
> The probe now uses a generation id that only increases, and the script
> fails loudly if any run reports more frames than 60Hz permits. **FINDINGS
> D39.**

### reverse() exactness

`lift()` at three cut points, comparing computed transform matrices before and
after, on `.sw-deck`, `.sw-deck-body`, `.sw-record`, `.sw-record-spin`,
`.sw-arm`, `.sw-lid`:

| lift() at | timeline progress | result |
|---|---|---|
| 400ms | 24.5% | 6/6 layers returned exactly |
| 900ms | 53.5% | 6/6 |
| 1300ms | 76.7% | 6/6 |

**18/18.** The cut points straddle the three overlaps the timeline is built
from — at 400 the lid and tilt are both mid-flight; at 900 the record's fall
has joined them; at 1300 the arm's swing has too and the record is inside the
`CustomBounce` settle, the one beat whose eased value is not monotonic.

The test waits on the **timeline position**, not the wall clock. Its first
version used `waitForTimeout`, which on the second and third drops (timeScale
1.4) landed at 1260ms and past the end — so it reported a "1300ms cut" that had
already reached 100% and was not mid-flight at all.

### Layout

`lab-shots.mjs` asserts, per device per theme: zero `pageerror`, zero console
errors, and `documentElement.scrollWidth - clientWidth === 0`. A 3D subtree
paints — and scrolls — well outside its own layout box, so horizontal overflow
is the free failure mode here.

Frames land in `../screenshots/mobile-v3/` as
`<device>-<theme>-t<ms>.png`, element-clipped to `.deck-lab-deck`. t=0…1500 are
**seeks** (the timeline is paused and rendered at exactly that position, so the
frame is the one this spec describes rather than whatever wall clock plus
screenshot latency produced); t=3000 is live, because the timeline ends at
1700ms and "3000" means "1.3s into the spin", which only exists while running.

---

## 7. What still needs a real phone

- **iOS / WebKit.** CSS 3D is exactly where engines diverge — `preserve-3d`
  flattening rules, conic-gradient rasterisation, and how a nested 3D subtree
  is composited. A Chromium-only pass proves nothing about iOS, and **the
  iPhone 15 Pro frames in `../screenshots/mobile-v3/` are Chromium-rendered**
  — see §8. This is the one genuinely open risk in the go/no-go.
- **Sustained thermals.** A 6.7s sample says nothing about a deck left spinning
  for three minutes on a warm phone.
- **120Hz.** Every number above is against a 60Hz budget. A ProMotion iPhone
  asks for 8.3ms.

Open the lab on a phone on the same Wi-Fi:

```bash
cd client && npx vite --host
# then, on the phone:  http://<your-mac-lan-ip>:5173/lab/deck/
```

`npx vite --host` prints the LAN URL itself under **Network:**. To get the IP
directly: `ipconfig getifaddr en0` (Wi-Fi) or `ipconfig getifaddr en1`.

Two things that will mislead you there. `npx vite --host` starts **only** the
client — not the Express API — but the lab needs no API at all, so that is
fine; the rest of the site on that URL will show its error states. And the port
must stay **5173**: `--host` does not change it, but if 5173 is already taken
Vite silently moves to 5174 and the CORS allowlist stops matching for every
other page.

---

## 8. Roadmap

| | | target |
|---|---|---|
| 12.1 | spec + deck spike *(this document)* | Sun Nov 23 |
| 12.2 | structure: player store, bottom sheet shell (Draggable + inertia, drag-to-dismiss only from scroll-top), dock (no animation) | Wed Nov 26 |
| 12.3 | integration: the real turntable into the sheet, keeping the single-writer rules and the `playCached()` same-call-site audio rule; crate tap → drop → play | Sat Nov 29 |
| 12.4 | polish: the drop timeline on the real deck, lid, theme swap via the existing `startViewTransition`, dock⇄sheet Flip, reduced motion | Tue Dec 2 |
| 12.5 | device pass + ship | Wed Dec 3 |

### A correction to carry into 12.3

The brief names the single-writer rules as "`setSpin`, `muteGain`,
`applyDeckState`". **`muteGain` does not exist** — there is no such identifier
anywhere in `client/`, `server/` or `design-review/`. The three real single
writers in `turntable.jsx` / `turntable-audio.js` are:

- **`setSpin`** (`turntable.jsx`) — the only thing that may touch the spin
  tween's `timeScale` or pause/play it.
- **`applyDeckState`** (`turntable.jsx`) — the only writer of deck state, and
  the one that publishes it synchronously via `emitDeckState`.
- **the master gain**, which is written by `setVolume`, `followSpin`,
  `settleSpin` and `fadeOutAndStop` in `turntable-audio.js` — *not* by a single
  function. If 12.3 wants a single-writer rule there, one has to be introduced,
  not assumed.

`snow-white-deck.jsx` already carries `setSpin`'s shape, including the three
faults its rewrite fixed (orphaned pause callbacks, snapping `timeScale(0)`
before a ramp, two un-killed `timeScale` tweens both writing every frame).

### The seam 12.3 plugs into

`SnowWhiteDeck` takes `labelColor`, an `apiRef` (the house ref-as-prop idiom
from `walkman.jsx` — *not* `forwardRef`/`useImperativeHandle`, which
`walkman.jsx`'s own note rules out for this codebase), and one callback,
`onNeedleDown`. The api is `{ drop, lift, setPlaying, setRings, seek, duration,
progress }`. `onNeedleDown` fires once per drop at 1700ms, forward only — that
is where `playCached()` goes, and the same-call-site rule applies there.

### WebKit on this Mac — already known, but not in this much detail

`STATUS.md`'s e2e entry (2026-09-09) already records "WebKit frozen on macOS
13/14 (local `npm run test:chromium`; CI covers it)", so this is **not a new
finding** and has no B-number. What is worth adding is the exact symptom,
because it costs time:

- Playwright 1.62.1 wants WebKit revision **2336**. mac14-arm64 is pinned at
  **2251**.
- `npx playwright install webkit` **exits 0 having installed nothing**,
  printing *"You are using a frozen webkit browser which does not receive
  updates anymore on mac14-arm64."* It is an OS-version freeze. Reinstalling
  cannot fix it; only a macOS upgrade can.
- **`webkit.launch()` succeeds.** The failure lands at `newPage()` — either
  `Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled` or
  an outright hang.
- `await browser.close()` on that browser **also hangs**, so a fallback that
  tidies up before switching engines sits there forever with no output, which
  looks exactly like a hang in the page under test. `lab-shots.mjs` caps both
  calls at 30s and does not await the close.

Locally this blocks every WebKit project in `client/playwright.config.js`
(`desktop-safari`, `ipad-portrait`, `ipad-landscape`, `ipad-pro-portrait`,
`iphone-se`, `iphone-14`, `iphone-15-pro-max`). `npx playwright test --list`
still works, because listing launches nothing. CI covers them.

---

## 9. The pitch fader on a phone — a question for the research chat

Added 2026-11-27, after the owner asked for "a pitch slider to go up and down
so we can use it on mobile devices". Checking the code first changed the shape
of the task, which is why this section exists rather than a build task.

**It already exists, and it already works with a finger.** `turntable.jsx` has
carried a vertical GSAP `Draggable` pitch fader since Stage 6 Phase 9:

- **±8%** (`PITCH_RANGE = 8`), matching a Technics 1210.
- Driving `AudioBufferSourceNode.playbackRate` via `audio.setRate(1 + pitch / 100)`
  — so **pitch and tempo move together**, as on a real deck. No time-stretch,
  which is the right call: a portfolio deck that holds pitch while changing
  tempo would sound like software, and the whole point of the object is that it
  does not.
- A **44×44** touch target, grown with a `::before` at `inset: -15px -8px`
  inside `@media (pointer: coarse)`, so the visible 28×14 handle stays small
  while the hit area clears the floor.
- A real `<input type="range" min="-8" max="8" step="0.1">` behind it,
  `pointer-events: none`, made vertical with the `writing-mode` + `direction: rtl`
  trick. Keyboard and screen-reader users get the control; Draggable is not
  competing with it for the same pointer.

Measured with real CDP touch on a Pixel 7 viewport
(`node design-review/mobile-v3/fader-touch.mjs`):

```
while held (dragged up 40px):  pitch=5.9
page scrollY: 0 -> 0
400ms after release:           pitch=0
```

### The two open questions

**1. Travel — and this is the actual weakness.** The track is **108px** of
usable travel on a phone for the full ±8% (a 122px track less the 14px handle),
about **6.8px per percent**. That is
why a casual 40px thumb drag lands on 5.9% rather than anywhere musical: the
control is accurate but far too sensitive for a thumb. The Pocket Player sheet
has vertical room the plinth never will, so this is a layout fix, scheduled
into 12.4.

**2. Bend or latch — a real design question, not a bug.** On release the fader
springs back to 0 over 400ms. That makes it a pitch **bend** (a CDJ nudge), not
a 1210's **latching** fader that stays where you put it.

- The bend is **self-correcting**: a visitor cannot leave the track detuned, and
  "the next recruiter loads the page and it plays a semitone sharp" is a real
  failure mode on a site whose job is getting someone hired.
- The latch is **honest to the object** and the only version where the fader is
  useful rather than expressive — but it needs a visible value readout (the
  `<input>` is invisible today), a reset affordance (double-tap, normally), and
  an audit of `endScratch()`, which calls `setRate(1)` unconditionally and would
  silently wipe a latched pitch.

**The recommendation on the roadmap is to keep the bend and spend 12.4 on
travel**, on the grounds that the sensitivity is what makes it hard to use and
the spring-back is what makes it safe. Full reasoning and costs in
**FINDINGS.md D41**.

**Where the research chat can help:** whether a bend reads as *broken* to
someone who has used a real turntable — i.e. whether the self-correcting
behaviour is experienced as a safety feature or as the control not working.
That is a question about expectation, not about implementation, and it is the
one thing the measurements cannot answer.

### One thing not to "fix"

`.turntable-fader-handle` declares `touch-action: none` in `main.scss`, with a
comment saying that is what stops the page scrolling under a drag. The
**computed** value is `pan-x` — Draggable writes `touch-action` inline for
`type: "y"` and inline wins. Both values are correct for a vertical control, so
nothing is broken and the measured gesture does not scroll the page. The
comment simply describes a declaration that is being overridden. Fighting
Draggable for that property would be churn.

---

## 10. Stage 12.3 — the deck is in the sheet, on the live site

Landed 2026-11-27 on `mobile-v3`. Screenshots (iPhone 15 Pro, both themes) in
`design-review/screenshots/`: `mobile-v3-hero-*.png`,
`mobile-v3-sheet-*.png`, `mobile-v3-dock-*.png`.

This is the first Stage 12 work that **changes what a visitor sees**. 12.1 was
an isolated spike and 12.2 was a set of components nothing mounted.

### What the phone does now

Hero: name, tagline, crate — the deck is gone from it. Search a record, tap a
result: the sheet rises and the record drops onto the real turntable inside
it, audio at needle contact exactly as in the hero. Dismiss the sheet and the
glass dock takes over at the foot of every section, still playing, with a
transport button that works without reopening anything.

Desktop is **byte-identical in behaviour** — same hero, same deck, no dock, no
sheet.

### Three questions this raises for the research chat

**1. The hero is sparse now.** `mobile-v3-hero-dark.png` is the honest
picture: a name, a tagline, a search field, and then most of a screen of
gradient. That is the direct consequence of the agreed direction (the deck
moved out), and 12.4 owns the answer, but the answer is not obvious. The
options are not symmetric — filling it with *something* is easy and most of
the easy options undo the calm that removing the deck bought.

**2. The sheet's body is empty below the deck.** The header carries the track
name and the deck fills the top half; under it is nothing. The lab had a
tracklist and notes there as scroll fodder; the real sheet has no equivalent
content yet. Worth deciding what genuinely belongs — a tracklist implies a
queue this player does not have.

**3. A modal with a navbar over it.** The sheet is `aria-modal="true"` at
z-index 80; the navbar is 1000 and stays tappable above it
(`mobile-v3-sheet-dark.png`). 12.3 stopped the harmful part — a nav tap now
closes the sheet instead of scrolling a page nobody can see (**D43**) — but
the layering is still wrong and 12.4 has to choose: raise the sheet above the
bar, or hide the bar while a sheet is up. The second is more honest to "this
is a modal"; the first keeps the site's one constant visible.

### Two things worth keeping from how this was built

**The lab could not have caught either defect it was supposed to de-risk.**
12.2's own note predicted one of them (`lenis.stop()`), and the prediction was
right for a reason worth generalising: **a lab that omits a global cannot test
anything that global changes.** `/lab/player/` has no Lenis, so the root
element is not its scroller, so the sheet's `body { overflow: hidden }` lock
appeared to work there while locking nothing on the real site (**D42**). The
lab remains useful for gesture work and useless for integration, and that is
not a flaw in it — it is what "isolated" means.

**Headless Chromium runs Web Audio fine.** It is *output* that does not exist.
Served a decodable preview, the deck reaches `PLAYING` and then
`STOPPED_LOADED`. `pocket-player.mjs` generates a 12-second WAV inline and
mocks the preview with it, and that is what makes the dock→deck check mean
anything: with the preview 404ing the deck sits in `DECK.ERROR`, where a
transport press is **correctly refused**, so the test could not distinguish a
broken registration from a deck behaving exactly as designed. This does not
overturn `CLAUDE.md`'s "no audio in headless" — nothing audible is asserted,
only the state the deck reports.

### Measurements

```
node design-review/mobile-v3/pocket-player.mjs     # 10/10
node design-review/mobile-v3/sheet-gesture.mjs     # 4/4  (12.2, unchanged)
cd client && npm run test:chromium                 # 139 passed, 0 failed
```

| | |
|---|---|
| production JS | 565.74 → **572.63 kB** raw · 201.01 → **203.10 kB** gzipped (**+2.09**) |
| production CSS | 85.24 → **85.59 kB** raw · 16.67 → **16.73** gzipped (+0.06) |
| `dist/` HTML entries | **1** — both labs still excluded by construction |
| lint | **7 errors / 2 warnings**, the known baseline |

**+2.15 kB gzipped in total.** 12.1 and 12.2 were 0 bytes; this one is not,
and that is simply the cost of mounting the components rather than a
regression to chase.
