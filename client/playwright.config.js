// End-to-end / device-matrix tests for diegodamian.com.
//
// Runs the real app (client + Express server, via `npm run dev` on :5173 — the
// only local port the backend's CORS allowlist permits, see CLAUDE.md) against
// 15 browser/device projects. Every /api/* call is mocked in tests/fixtures.js
// so a run never touches Spotify, iTunes, Resend or Railway and is fully
// deterministic.
//
//   npm run test:install     # one-time: fetch chromium + firefox + webkit
//   npm test                 # full matrix, headless
//   npm run test:ui          # pick tests / projects interactively
//   npm test -- --project=desktop-chrome
//   npm test -- responsive.spec.js
//
// Known limits (documented at length in tests/README.md):
//   - headless has NO audio device, so turntable AUDIO assertions (rate,
//     scratch, ducking) are NOT here — they live in design-review/scratch-tests
//     (headed). What IS here: the deck STATE machine, which reaches PLAYING
//     without a working audio clock.
//   - headless renders NO browser chrome, so the svh/dvh URL-bar-resize bug
//     (FINDINGS B74) cannot be reproduced in any of these. Needs a real phone.
//   - WebKit/Chromium device emulation is UA + viewport + touch + engine, not
//     a real iOS/Android OS. Real-device coverage is a separate follow-up.
import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

// prefers-reduced-motion is forced for every test so GSAP entrances and the
// My-Taste pin snap to their finished state instead of playing a ~2s cascade —
// section positions are stable the moment a nav click settles. The actual
// mechanism is a `window.matchMedia` stub in fixtures.js (Playwright's own
// `reducedMotion` emulation is unreliable in headless Chromium here); this
// option stays set too, so Playwright still freezes CSS animations/transitions
// for screenshots.
const base = {
  baseURL: BASE_URL,
  reducedMotion: 'reduce',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: process.env.CI ? 'retain-on-failure' : 'off',
};

// Desktop projects pin an explicit viewport; the device descriptor only
// contributes the UA + engine.
const desktopChrome = { ...devices['Desktop Chrome'], ...base };
const desktopFirefox = { ...devices['Desktop Firefox'], ...base };
const desktopSafari = { ...devices['Desktop Safari'], ...base };

// Phone / tablet projects run at the device's full screen HEIGHT (browser
// chrome hidden), not Playwright's default mobile `viewport` (which models the
// URL bar SHOWN and is 120–180px shorter). Reasons:
//   - The Stage 5 "one screen per section" work was measured chrome-hidden
//     (ROADMAP: iPhone 17 Pro etc.), and `svh`-based section sizing targets
//     exactly that state (FINDINGS B74 — `svh` deliberately doesn't track the
//     bar; a section ends ~60px short when the bar is shown, by design).
//   - Headless renders NO browser chrome, so svh/lvh/dvh all equal the viewport
//     anyway — there is no "bar shown" state to test here.
// So `viewport` here = the design's target rectangle, with the descriptor's
// width, UA, touch and scale factor kept.
const device = (name, viewport) => ({ ...devices[name], ...base, viewport });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: base,

  // Local: `npm run dev` (HMR + both the Express API and Vite) — and
  // reuseExistingServer, so a dev server you already have on :5173 is used
  // as-is. CI: a production build served by `vite preview` — minified, no HMR
  // overhead, lighter on the main thread (steadier GSAP/Lenis timing under
  // parallel workers) and closer to what ships. Every /api/* call is mocked in
  // fixtures.js, so CI needs no Express server. BROWSER=none stops Vite's
  // `open: true` launching a browser on the runner.
  webServer: {
    command: process.env.CI
      ? 'npm run build && npx vite preview --port 5173 --strictPort'
      : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { BROWSER: 'none' },
  },

  projects: [
    // ---- Desktop / web ---------------------------------------------------
    {
      name: 'desktop-chrome',
      use: { ...desktopChrome, viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'desktop-firefox',
      use: { ...desktopFirefox, viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'desktop-safari',
      use: { ...desktopSafari, viewport: { width: 1440, height: 900 } },
    },
    {
      // The 1366x768 laptop — ROADMAP's "worst residual ~27px" one-screen case.
      name: 'desktop-small',
      use: { ...desktopChrome, viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'desktop-wide',
      use: { ...desktopChrome, viewport: { width: 1920, height: 1080 } },
    },

    // ---- iPads / tablets (portrait unless noted) ----------------------
    {
      // iPad (gen 7/8/9 class), 810x1080, WebKit. D34's still-open tier —
      // #projects floats small here; responsive.spec marks that expected-fail.
      name: 'ipad-portrait',
      use: device('iPad (gen 7)', { width: 810, height: 1080 }),
    },
    {
      name: 'ipad-landscape',
      use: device('iPad (gen 7)', { width: 1080, height: 810 }),
    },
    {
      // iPad Pro 11, 834x1194, WebKit.
      name: 'ipad-pro-portrait',
      use: device('iPad Pro 11', { width: 834, height: 1194 }),
    },
    {
      // Android tablet, 800x1280, Chromium.
      name: 'galaxy-tab',
      use: device('Galaxy Tab S4', { width: 800, height: 1280 }),
    },

    // ---- Phones -------------------------------------------------------
    {
      // 320px legacy tier — small/old iPhone, WebKit. The project targets
      // 360–440 for one-screen fit, so responsive.spec only holds this device
      // to "no overflow, nothing catastrophic", not the tight fit.
      name: 'iphone-se',
      use: device('iPhone SE', { width: 320, height: 640 }),
    },
    {
      // Common iOS, 390x844, WebKit ≈ mobile Safari.
      name: 'iphone-14',
      use: device('iPhone 14', { width: 390, height: 844 }),
    },
    {
      // Large iOS, 430x932, WebKit.
      name: 'iphone-15-pro-max',
      use: device('iPhone 15 Pro Max', { width: 430, height: 932 }),
    },
    {
      // iPhone-shaped viewport on Chromium — carries the touch-gesture / CDP
      // paths WebKit can't drive, and doubles as an Android-Chrome-ish phone.
      name: 'iphone-chromium',
      use: { ...device('iPhone 14', { width: 390, height: 844 }), defaultBrowserType: 'chromium' },
    },
    {
      // Common Android, 412x915, Chromium ≈ Chrome for Android.
      name: 'pixel-7',
      use: device('Pixel 7', { width: 412, height: 915 }),
    },
    {
      // Small modern Android, 360x800, Chromium — low end of the 360–440 target.
      name: 'galaxy-s24',
      use: device('Galaxy S24', { width: 360, height: 800 }),
    },
  ],
});
