# Scratch test suites — Stage 6, Phase 8

Six Playwright suites behind the numbers quoted in `STATUS.md`'s
*"Stage 6, Phase 8 — scratch"* entry. **Not deployed** — Railway builds only
`client/` and `server/`.

```bash
cd client && npm run dev          # must be on 5173 (see CLAUDE.md)
node design-review/scratch-tests/run-all.mjs
```

| Suite | What it establishes |
|---|---|
| `engine.mjs` | The audio engine in isolation: reverse renders, commanded rate == delivered rate, a held record is silent, hand-back is continuous |
| `gesture.mjs` | The real page end to end — crate click through to a pointer scratch, and the skyline staying live throughout |
| `mobile.mjs` | iPhone 13 + real touch. Asserts the geometry (`NOMINAL_DEG_PER_SEC` degrees of platter == one second of audio) and that the residual error is a fixed filter transient, not proportional loss |
| `states.mjs` | Cueing a PAUSED deck: it sounds, moves the groove, lights the skyline, and returns to PAUSED and silence |
| `multitouch.mjs` | Interrupting a live gesture — a second finger on the transport, Space on the focused button, and the tab-blur abort |
| `reduced.mjs` | `prefers-reduced-motion`: the platter never moves, the gesture still engages |

## Three things that will mislead you

**They must run HEADED.** Headless Chromium reports `ctx.state === "running"` but
never advances `currentTime` — there is no audio device, so the graph does not
render and every measurement comes back frozen at its starting value with no
error. `engine.mjs` honours `HEADED=0` to demonstrate the failure; the rest
always launch headed.

**Never read audio state through a bare `import()`.** Vite serves HMR-updated
modules under a `?t=` URL, so `import("/src/lib/turntable-audio.js")` from a
probe hands back a second, *uninitialised* copy of the module — every reading is
the module's cold defaults, which looks exactly like "the feature does nothing."
Read through `window.__skylineDebug` (DEV only), which closes over the app's own
instance. `skyline-background.jsx` carries the same warning at the definition.
Note it is **not installed on the reduced-motion path**, which is why
`reduced.mjs` is DOM-only.

**CDP's synthetic touch ignores `touch-action` and scrolls the page.** Verified
against an isolated control page: `touch-action: none` scrolled byte-identically
to `auto`. Two consequences — scroll suppression cannot be tested here at all
(only that the declaration reaches the hit chain), and any suite doing more than
one touch gesture must re-measure the platter's box between them, because the
harness's own scrolling has moved it. `multitouch.mjs` has a `reacquire()` for
exactly this.

## What is still unverified, and wants a real device

- **`touch-action: none` actually suppressing page scroll**, per above.
- **A track swap landing mid-gesture.** Chrome does not synthesise a click for a
  touch inside a multi-touch sequence, so the second-finger tap on a crate record
  could not be driven. The abort it would take is the same one the tab-blur case
  in `multitouch.mjs` exercises, which passes.

Both are recorded in `STATUS.md` under the same heading rather than being quietly
counted as covered.
