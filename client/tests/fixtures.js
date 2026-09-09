// Extends Playwright's `test` with:
//   - a fully mocked backend (no Spotify / iTunes / Resend / Railway, ever)
//   - the intro screen pre-dismissed (sessionStorage, same key loading-screen.jsx uses)
//   - `pageErrors` / `consoleErrors` arrays the smoke spec asserts on
//   - an `overrides` object a spec mutates to flip one endpoint to a failure
import { test as base, expect } from '@playwright/test';
import {
  ITUNES_RESULTS,
  SPOTIFY_TOP_ARTISTS,
  SPOTIFY_TOP_TRACKS,
  SPOTIFY_PROFILE,
  PREVIEW_URL,
  silentWav,
} from './mock-data.js';

// 1x1 transparent PNG — every off-origin <img> (album art, sleeves, avatar)
// resolves to this so layout is realistic and nothing 404s to the network.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// The client calls the API cross-origin (:5173 page -> :5050 API) and fetches
// preview audio / art cross-origin too, so a fulfilled response needs the CORS
// header the real server / CDN would send or the browser drops it before
// axios/fetch sees it.
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };

const jsonBody = (status, body) => ({
  status,
  contentType: 'application/json',
  headers: CORS,
  body: JSON.stringify(body),
});
const ok = (body) => jsonBody(200, body);

export const test = base.extend({
  // Mutable per-test endpoint overrides — a plain object the route handlers
  // read lazily. A spec flips one endpoint to a failure by mutating it BEFORE
  // the request fires, e.g. `overrides.contact = 'error'` then submit.
  // Recognised: itunes 'error'|'empty', spotify 'error'|'empty', contact 'error'.
  overrides: async ({}, use) => {
    await use({});
  },

  // Force prefers-reduced-motion (default). A spec that needs the real animated
  // layout — e.g. #experience's filmstrip, which has a deliberately different
  // tall static document under reduced motion — opts out with
  // `test.use({ forceReducedMotion: false })`.
  forceReducedMotion: [true, { option: true }],

  context: async ({ context, overrides }, use) => {
    // Playwright matches routes MOST-RECENTLY-REGISTERED FIRST, so the broad
    // backstop is registered up here and every specific route below overrides
    // it. (Register it last and it wins over everything — which crashed
    // #my-taste with `{}` where an array was expected.)
    await context.route('**/api/**', (r) => r.fulfill(ok({})));

    // --- off-origin images + preview audio -------------------------------
    await context.route(/art\.test\//, (r) =>
      r.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: PNG_1x1 }));
    await context.route(PREVIEW_URL, (r) =>
      r.fulfill({ status: 200, contentType: 'audio/wav', headers: CORS, body: silentWav(1) }));

    // --- record crate: iTunes proxy ------------------------------------
    await context.route('**/api/itunes/search**', (r) => {
      if (overrides.itunes === 'error') return r.fulfill(jsonBody(502, { error: 'Search is unavailable right now' }));
      if (overrides.itunes === 'empty') return r.fulfill(ok({ resultCount: 0, results: [] }));
      return r.fulfill(ok(ITUNES_RESULTS));
    });

    // --- #my-taste: Spotify ------------------------------------------
    await context.route('**/api/spotify/top-artists**', (r) => {
      if (overrides.spotify === 'error') return r.fulfill(jsonBody(503, { error: 'Spotify data is temporarily unavailable' }));
      return r.fulfill(ok(overrides.spotify === 'empty' ? [] : SPOTIFY_TOP_ARTISTS));
    });
    await context.route('**/api/spotify/top-tracks**', (r) => {
      if (overrides.spotify === 'error') return r.fulfill(jsonBody(503, { error: 'Spotify data is temporarily unavailable' }));
      return r.fulfill(ok(overrides.spotify === 'empty' ? [] : SPOTIFY_TOP_TRACKS));
    });
    await context.route('**/api/spotify/profile**', (r) => r.fulfill(ok(SPOTIFY_PROFILE)));
    await context.route('**/api/spotify/check-auth**', (r) => r.fulfill(ok({ authenticated: true })));

    // --- #connect: contact form -----------------------------------------
    await context.route('**/api/contact', (r) => {
      if (overrides.contact === 'error') return r.fulfill(jsonBody(500, { error: 'Something went wrong sending your message.' }));
      return r.fulfill(ok({ ok: true }));
    });

    // --- telemetry beacons (fire-and-forget) --------------------------
    await context.route('**/api/events/**', (r) => r.fulfill({ status: 204, headers: CORS, body: '' }));

    await use(context);
  },

  page: async ({ page, forceReducedMotion }, use) => {
    await page.addInitScript((reduce) => {
      try {
        window.sessionStorage.setItem('introPlayed', '1');
      } catch {
        /* private mode — the intro just plays; specs still pass */
      }

      if (!reduce) return;
      // Force prefers-reduced-motion at the source. Playwright's
      // `reducedMotion: 'reduce'` emulation is unreliable in headless Chromium
      // on some setups (the page still reports `no-preference`), and the app
      // reads the media query directly — `useReducedMotion()` and
      // `gsap.matchMedia()` both go through `window.matchMedia`. Stubbing it
      // here makes every reduced-motion branch (GSAP entrances snap, the
      // My-Taste pin resolves instantly, the connect send skips its scramble)
      // deterministic regardless of the emulation.
      const realMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (typeof query === 'string' && query.includes('prefers-reduced-motion')) {
          const wantsReduce = query.includes('reduce');
          return {
            matches: wantsReduce,
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
          };
        }
        return realMatchMedia(query);
      };
    }, forceReducedMotion);
    await use(page);
  },

  pageErrors: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));
    await use(errors);
  },

  consoleErrors: async ({ page }, use) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await use(errors);
  },
});

export { expect };
