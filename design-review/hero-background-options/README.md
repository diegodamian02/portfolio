# Hero background — Dot-Matrix direction

Design exploration for **replacing the hero skyline-spectrum background**
(`client/src/components/skyline-background.jsx`, `client/src/lib/skyline-spectrum.js`).

**Canvas (Claude Design):** https://claude.ai/code/artifact/50f0cf77-31bb-4c11-a4fe-76260a37f2b7
*(Claude Design canvas — not readable by the no-repo design-research chat.)*

## Where it landed

- **Not** a full-bleed, always-on dot field. **Presence-gated** like the skyline
  today: nothing until a track plays, then a dot spectrum fades up from the
  bottom edge and settles back to nothing on stop.
- **One colour scheme per song** — no rainbow. Each record plays inside a single
  analogous colour family (~60° span): tone varies across the columns and up
  each dot (deep foot → bright tip), with a ±20° in-family shimmer. The next
  record advances to the next scheme — this rides on `client/src/lib/palette-cycle.js`,
  which already cycles an accent hue per `trackId`.

### Scheme set (6)

| scheme | range |
|---|---|
| Cobalt | teal-blue → indigo → blue-violet |
| Amethyst | blue-violet → purple → magenta |
| Ember | orange → red → rose |
| Rose | coral → pink → orchid |
| Citrine | amber → gold → lime |
| Fern | teal → green → lime |

## Try it — audio demo

`audio-demo.html` is a **standalone, no-server** test: the dot-matrix renderer
(canvas, real log-frequency bucketing + attack/release ballistics + auto-gain,
same math as `skyline-spectrum.js`) wired to the Web Audio `AnalyserNode`.

- **Open the file in a browser.** Hit **Synth demo** for an instant pattern, or
  **Audio file…** to pick a local track. Watch it fade up on play and settle
  out on Stop. Each new source advances the colour scheme; the dropdown / *next
  scheme* pick one directly.
- **Microphone** needs a secure context — from this folder run
  `python3 -m http.server` and open `http://localhost:8000/audio-demo.html`.

It is a *mockup renderer*, not the site's component — it's for judging look,
motion, and the per-song scheme behaviour before wiring the real thing into
`skyline-background.jsx`.

## Files

| file | what |
|---|---|
| `Idle.dc.html` | hero before play — no matrix (static) |
| `Main.dc.html` | playing state, desktop — `scheme` + `state` tweaks |
| `Mobile.dc.html` | playing state, phone |
| `Schemes.dc.html` | the 6-scheme reference board |
| `Current.dc.html` · `GrooveRings.dc.html` · `Oscilloscope.dc.html` · `Aurora.dc.html` · `Contour.dc.html` | the original six explored directions (canvas page "explored") |
| `canvas.json` | canvas layout / pages / notes |
| `hero-background-options.html` | the seeded Claude Design canvas (generated — republish from the `.dc.html` sources, never hand-edit) |

Re-seed: `node <design-skill>/seed-canvas.mjs --template <…>/payload.template.html --out hero-background-options.html --title "Dot-Matrix Hero Background" --artboard Idle.dc.html --artboard Main.dc.html … --canvas canvas.json`

## Still open

- **Studio Paper (light theme).** Everything here is dark-theme only. The light
  treatment is the next design pass — historically the hard half for these
  effects (`CLAUDE.md` → Theming; see `skyline-spectrum.js` light-ramp notes).
- **Hero fills the full viewport on mobile.** `client/src/styles/main.scss`
  `.home` uses bare `height: 100vh`; every other section uses the dual
  `100vh` / `100svh` declaration (`svh` chosen over `dvh`, 2026-09-02, B74).
  On phones `100vh` is the tall viewport, so the hero overflows the visible
  screen and the next section peeks when swiping. Fix = bring `.home` in line +
  verify the snap step in `client/src/components/smooth-scroll.jsx` (~L163,
  `window.innerHeight`). Not yet done.
