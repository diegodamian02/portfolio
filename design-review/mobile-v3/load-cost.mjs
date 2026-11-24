// Stage 12.1 — what the lab page costs to OPEN, as opposed to what it costs
// to ship.
//
//   cd client && npm run dev
//   node design-review/mobile-v3/load-cost.mjs
//
// This exists because the first version of the lab passed every other check
// in this directory and was still unusable. It was a DEV-gated route inside
// App.jsx, which gates RENDERING, not LOADING: by the time the early return
// ran, every static import at the top of App.jsx had been evaluated — all six
// sections, the audio engine, the crate, the walkman, and every image asset
// in the site. 4,193 KB over 99 requests to draw one turntable. On loopback
// that is 338ms and invisible, which is exactly how it survived a full
// measurement pass; on a phone over Wi-Fi it is the difference between
// instant and unusable, and that is where it was caught. FINDINGS D38.
//
// So: bytes and request count, not just time-to-interactive. Time on the
// machine serving the page is the one number that cannot see this problem.
//
// The 4,193 KB figure is historical — that version of the page no longer
// exists to be measured. What this reproduces is the current cost, and the
// site's own for scale.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';

// A phone-shaped viewport, because the site serves different images at
// different widths and the point of the comparison is the mobile case.
const VIEWPORT = { width: 393, height: 852 };

const TARGETS = [
    {
        label: 'lab  /lab/deck/',
        path: '/lab/deck/',
        ready: () => !!window.__deckLab,
    },
    {
        label: 'site /',
        path: '/',
        ready: () => !!document.querySelector('.hero-name'),
    },
];

const browser = await chromium.launch();
const rows = [];

for (const target of TARGETS) {
    // A fresh context per target: a warm HTTP cache would hide most of what
    // this script is for.
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();

    const requests = [];
    const srcModules = new Set();
    const sizes = [];
    // EVERY body promise is kept and awaited before anything is reported.
    //
    // The first version of this accumulated into a running total from inside
    // an `async` response handler and then printed the total after a fixed
    // wait. `response.body()` is itself async, so the handlers were still
    // resolving when the total was read, and the result undercounted by
    // roughly 15x — it reported the lab at 133 KB against a true 2 MB, and
    // the SITE at 2.77 MB against a true 5.75 MB. Both sides were wrong,
    // which is what made it look self-consistent. A wrong number that moves
    // in the right direction is the hardest kind to catch.
    const pending = [];

    page.on('request', (r) => requests.push(r.url()));
    page.on('response', (r) => {
        const url = r.url();
        if (url.includes('/src/')) srcModules.add(url.split('/src/')[1].split('?')[0]);
        pending.push(
            // A body can be unavailable (redirects, aborted requests); that
            // must not take the measurement down, but it must not silently
            // count as zero either, so it is recorded as such.
            r.body().then(
                (b) => sizes.push([url, b.length]),
                () => sizes.push([url, 0]),
            ),
        );
    });

    const t0 = Date.now();
    await page.goto(BASE + target.path, { waitUntil: 'load' });
    await page.waitForFunction(target.ready, null, { timeout: 45_000 });
    const interactive = Date.now() - t0;
    // Late-arriving assets (fonts, images below the fold) are part of the
    // cost even though nothing waits on them.
    await page.waitForTimeout(1500);
    await Promise.all(pending);

    const bytes = sizes.reduce((a, [, n]) => a + n, 0);
    const heaviest = sizes
        .filter(([, n]) => n > 50_000)
        .map(([u, n]) => [u.split('/').pop().split('?')[0], n]);

    rows.push({
        label: target.label,
        interactive,
        requests: requests.length,
        kb: Math.round(bytes / 1024),
        srcModules: srcModules.size,
        heaviest: heaviest.sort((a, b) => b[1] - a[1]).slice(0, 5),
    });
    await ctx.close();
}

await browser.close();

console.log('\ndev-server cost to open, cold cache, 393x852\n');
console.log('page                interactive  requests    KB   src modules');
for (const r of rows) {
    console.log(
        `${r.label.padEnd(20)}${String(r.interactive + 'ms').padStart(10)}` +
        `${String(r.requests).padStart(11)}${String(r.kb).padStart(7)}` +
        `${String(r.srcModules).padStart(14)}`,
    );
}

const lab = rows[0];
console.log(`\nheaviest responses on ${lab.label.trim()}:`);
if (!lab.heaviest.length) console.log('  (nothing over 50 KB)');
lab.heaviest.forEach(([name, size]) => console.log(`  ${Math.round(size / 1024)} KB  ${name}`));

// The guard this script exists to be. The lab renders one turntable; if it is
// ever within shouting distance of the whole site again, something has
// reconnected it to the app's module graph — most likely an innocent-looking
// import of something in src/ that transitively pulls App.jsx or a section.
// Set from measured data, not from a target. In dev, Vite serves React and
// every GSAP plugin lib/gsap.js registers as unminified prebundled chunks —
// ~1.1 MB of the lab's ~2 MB is that, and the site pays for the same chunks.
// So the lab can never be a small fraction of the site in BYTES on a dev
// server, and the byte ratio is not the signal. The module count is: 4
// against 47. The ceiling below is deliberately loose and exists only to
// catch the lab being reconnected to the app's graph wholesale.
const RATIO_CEILING = 0.55;
const ratio = lab.kb / rows[1].kb;
const moduleRatio = lab.srcModules / rows[1].srcModules;
console.log(`\nlab is ${(ratio * 100).toFixed(0)}% of the site's bytes (ceiling ${RATIO_CEILING * 100}%)`);
console.log(`lab loads ${lab.srcModules} of the site's ${rows[1].srcModules} src modules (${(moduleRatio * 100).toFixed(0)}%)`);
// The module count is the real guard — see the ceiling note above. If the lab
// ever loads more than a handful of src modules, something has reconnected it
// to App.jsx or a section.
const MODULE_CEILING = 8;
if (lab.srcModules > MODULE_CEILING) {
    console.log(`FAIL: the lab loads ${lab.srcModules} src modules (ceiling ${MODULE_CEILING}) — it is pulling in the app again.`);
    process.exitCode = 1;
} else if (ratio > RATIO_CEILING) {
    console.log('FAIL: the lab is close to the whole site in bytes — check what it imports from src/.');
    process.exitCode = 1;
} else {
    console.log('PASS');
}
