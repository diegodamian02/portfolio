# Mobile v3 — "Pocket Player" + the Snow White deck

**Stage 12** of `../ROADMAP.md`. This file is the spec; `../STATUS.md` §2 carries
the measurements from each sub-task as it lands.

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

`/lab/deck` is gated on `import.meta.env.DEV` in `client/src/App.jsx`, as a
**ternary around a dynamic `import()`**:

```js
const DeckLab = import.meta.env.DEV ? lazy(() => import("./lab/deck-lab.jsx")) : null;
```

Vite substitutes the literal `false` in a production build, Rollup folds
`false ? import(...) : null` to `null`, and the dynamic import disappears with
it. A static import would have bundled the lab *and* the deck component no
matter how the render was gated.

Verified against the built `dist`, not assumed:

| | production build |
|---|---|
| JS chunks emitted | 1 (unchanged — no lazy chunk) |
| occurrences of `deck-lab` / `__deckLab` / `snow-white` / `swDeckTilt` in JS | **0** |
| occurrences of the string `lab/deck` in JS | **0** |
| **JS delta** | **0 bytes** |
| CSS, raw | 74,157 → 79,597 (**+5,440**) |
| CSS, gzipped | 14,653 → 15,747 (**+1,094**) |

**The CSS does ship.** Styling in this project is one file (`main.scss`) and it
is always built, so the `.sw-*` and `.deck-lab-*` rules cost ~1.1 KB gzipped on
every page load while the markup that uses them cannot be reached. That is the
price of the brief's "styles go in main.scss" instruction, and it is the right
trade for a spike; if Stage 12 were ever abandoned, deleting the block is a
single contiguous edit.

The lab also sits **outside the site shell** — it is checked ahead of
`<Router>`, so it gets no `LoadingScreen` covering the first 900ms of every
measurement, no `Navbar` taking 120px off a phone screen, and no Lenis owning
the scroll. The real route table is byte-identical.

---

## 6. Measurements

Scripts live beside this file. All of them need the dev server **on :5173**
(`cd client && npm run dev` — see `CLAUDE.md`; 4173 is the wrong port).

```bash
node design-review/mobile-v3/lab-shots.mjs     # spec frames + overflow/pageerror
node design-review/mobile-v3/perf-trace.mjs    # frame times, 4x CPU throttle
node design-review/mobile-v3/reverse-test.mjs  # reverse() exactness
node design-review/mobile-v3/contrast.mjs      # accent ratios, both themes
```

They are **standalone scripts, not `client/playwright.config.js` projects**, on
purpose: that config sets `reducedMotion: 'reduce'` globally for every project,
deliberately, so the e2e suite gets GSAP entrances snapped to their finished
state. Running the drop under it would measure the reduced-motion branch, which
by design has no tilt, no fall, no rings and no spin. Same reason
`design-review/scratch-tests/` is standalone.

### Frame times — Pixel 7, Chromium, 4× CPU throttle

Drop (1.7s) + 5s of spinning. Throttle verified in-run by timing a fixed
arithmetic burn with and without it (115ms → 378ms, i.e. 3.28× for a requested
4×; CDP throttling is approximate).

| case | frames | avg | median | p95 | worst | >16.7ms | dropped (>33.3ms) |
|---|---|---|---|---|---|---|---|
| Graphite, rings on | 402 | 16.67 | 16.6 | 18.1 | 18.7 | 170 (42.3%) | **0** |
| Graphite, rings off | 402 | 16.66 | 16.6 | 18.1 | 18.7 | 180 (44.8%) | **0** |
| Studio Paper, rings on | 402 | 16.66 | 16.6 | 18.2 | 18.7 | 190 (47.3%) | **0** |
| Studio Paper, rings off | 402 | 16.66 | 16.7 | 18.3 | 18.7 | 190 (47.3%) | **0** |

**~402 frames is exactly a clean 60Hz over a 6.7s window.** All four cases hit
it. The worst single frame in this run is 18.7ms.

**These are one run.** Across the runs taken for this entry the average never
moved off 16.66–16.67ms and the frame count never moved off 401–402, but the
worst single frame wandered between **17.7 and 18.7ms** and the >16.7 count
between 40% and 54% — both of which are the same vsync-rounding noise, not a
signal. **Dropped frames were zero in every run.** Quote the dropped column.

**Read the ">16.7ms" column with care — it is close to meaningless here**, and
the first run of this script is what proved it. At a 60Hz mean of 16.67ms,
roughly half of all frames land a rounding error above 16.7 and get counted as
"over budget" while nothing has been dropped. The honest number is the dropped
column: a gap of two vsync intervals or more. It is **zero everywhere**. The
script reports both.

**The rings cost nothing measurable.** Average frame time differs by 0.01ms
between rings-on and rings-off, which is noise. Re-ran at **8× throttle**
(measured 6.43×): still 402 frames, still zero dropped, worst frame still
17.7ms. The deck is not close to its budget.

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
# then, on the phone:  http://<your-mac-lan-ip>:5173/lab/deck
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
