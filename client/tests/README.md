# e2e / device-matrix tests

Playwright tests that drive the **real app** — Vite + the Express server, via
`npm run dev` on `:5173` — across 15 browser/device projects. Every `/api/*`
call is mocked in [`fixtures.js`](./fixtures.js), so a run never touches
Spotify, iTunes, Resend or Railway and is fully deterministic.

Not deployed. Railway builds only `client/` (the app) and `server/`.

## Run

```bash
npm run test:install     # once — downloads chromium + firefox + webkit
npm test                 # full matrix, headless
npm run test:ui          # interactive: pick tests / projects, watch, time-travel
npm run test:headed      # watch it happen in a real window
npm run test:report      # open the HTML report from the last run

npm test -- --project=desktop-chrome          # one project
npm test -- responsive.spec.js                 # one spec
npm test -- -g "hamburger"                     # by title
npm run test:chromium                          # every non-WebKit project (see caveat)
```

`npm test` reuses a dev server you already have on `:5173`; otherwise it starts
one and tears it down after.

## The matrix (`playwright.config.js`)

| Class | Projects | Engine |
|---|---|---|
| Desktop | `desktop-chrome` (1440), `desktop-firefox` (1440), `desktop-safari` (1440), `desktop-small` (1366), `desktop-wide` (1920) | Chromium / Firefox / WebKit |
| iPad / tablet | `ipad-portrait` (810), `ipad-landscape` (1080), `ipad-pro-portrait` (834), `galaxy-tab` (800) | WebKit / Chromium |
| Phone | `iphone-se` (320), `iphone-14` (390), `iphone-15-pro-max` (430), `iphone-chromium` (390), `pixel-7` (412), `galaxy-s24` (360) | WebKit / Chromium |

WebKit ≈ Safari / iOS; Chromium ≈ Chrome / Android. Firefox has no mobile
emulation, so it's desktop-only.

**Phone/tablet viewport heights are the device's full screen (browser chrome
hidden), not Playwright's default mobile `viewport`.** That's the rectangle the
Stage 5 "one screen per section" work was measured against, and what `svh`-based
section sizing targets (FINDINGS **B74** — `svh` deliberately doesn't track the
URL bar). Headless renders no chrome anyway, so there's no "bar shown" state to
test here.

## What's covered

| Spec | Runs on | Checks |
|---|---|---|
| `smoke.spec.js` | all 15 | page loads, all 6 sections present, `<title>`, **no `pageerror`** (B56 — "the whole page goes blank"), no console errors, no horizontal overflow, `/#projects` deep link lands |
| `navigation.spec.js` | all 15 | hash updates + section lands near the offset (B3c); inline links vs hamburger for the viewport; hamburger opens / navigates / closes; Escape closes it; theme toggle flips `data-theme` + persists across reload |
| `responsive.spec.js` | all 15 | **no horizontal overflow** at every width (B33/B34/B42/B69/B70/B48 class); one-screen-per-section fit ratios per ROADMAP — phone ≥360w fills ≥0.5 without bleeding past the fold; tablet fills ≥0.6; desktop fits after a nav click. `#projects` on iPad is marked **expected-fail** (D34, unresolved) |
| `record-crate.spec.js` | flow subset¹ | search → results → pick → deck leaves `EMPTY` (→ `PLAYING` on Chromium); mobile "dig" takeover opens full-screen + dismisses via chevron / Escape (D32); error + empty states |
| `my-taste.spec.js` | flow subset¹ | wall + setlist render from mocked Spotify, links are real Spotify URLs; **theme toggle in-section doesn't blank the page (B56)**; "taking a nap" on failure; "nothing here yet" on empty |
| `connect.spec.js` | flow subset¹ | valid note → optimistic confirmation → "send another" resets; empty name / bad email blocked + `aria-invalid`; server failure → error toast, page intact |

¹ Flow specs are behaviour tests — one device per class is enough (see
`flow-projects.js`): `desktop-chrome/firefox/safari`, `iphone-14`,
`iphone-chromium`, `ipad-portrait`, `pixel-7`, `galaxy-s24`.

## Known limits — stated plainly

- **No audio.** Headless has no audio device, so the turntable's *audio* — rate
  accuracy, scratch, ducking — is NOT tested here. Those are
  `design-review/scratch-tests/` (headed, Chromium). What IS here: the deck
  *state machine*, which reaches `PLAYING` without a working audio clock.
- **No browser chrome.** The `svh`/`dvh` URL-bar-resize jump (B74) cannot be
  reproduced in any headless engine. Needs a real phone.
- **Emulation ≠ real device.** WebKit/Chromium device projects are UA +
  viewport + touch + scale factor + engine — not a real iOS/Android OS. Real
  Safari/Chrome-for-Android quirks (and the iPhone-UA iTunes redirect, B9) need
  a physical device or a BrowserStack-style service. That's a separate
  follow-up, not covered here.
- **WebKit on macOS 13/14.** Playwright's bundled WebKit is frozen on older
  macOS and fails at context creation (`Page.overrideSetting: PushAPIEnabled`).
  Local WebKit runs are degraded on those machines — use `npm run test:chromium`
  locally and let CI (Ubuntu, current WebKit) cover Safari/iOS.
- **Deck `PLAYING` on WebKit/Firefox headless** is flaky without an audio
  device, so those engines only assert the deck *leaves* `EMPTY`; Chromium
  asserts full `PLAYING`.

## CI

`.github/workflows/e2e.yml` runs the whole matrix on push to `main`, on every
PR, and on demand. Browsers are cached; the HTML report uploads always, failure
traces on failure. Open a failed run's `playwright-report` artifact, or
`npx playwright show-trace` a `test-results/**/trace.zip`.

## Adding a test

- Import `{ test, expect }` from `./fixtures.js` (not `@playwright/test`) so the
  mocks and error collectors are wired in.
- Navigate sections with `gotoSection(page, id)` from `helpers.js` — a raw
  `scrollIntoView` gets trapped by About's scroll-hold (FINDINGS D14).
- To exercise a failure path, mutate `overrides` (a fixture) before the request
  fires: `overrides.contact = 'error'`, `overrides.spotify = 'empty'`, etc.
- Adjust the mocked payloads in `mock-data.js`.
