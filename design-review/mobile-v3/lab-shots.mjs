// Stage 12.1 — spec screenshots of the Snow White drop.
//
//   cd client && npm run dev          # must be :5173 (CLAUDE.md)
//   node design-review/mobile-v3/lab-shots.mjs
//
// Two devices x two themes x six frames -> design-review/screenshots/mobile-v3/.
// Also asserts, per device/theme: no `pageerror`, and no horizontal overflow.
//
// WHY THIS IS A STANDALONE SCRIPT AND NOT A client/playwright.config.js
// PROJECT: that config sets `reducedMotion: 'reduce'` globally, for every
// project, deliberately — the e2e suite wants GSAP entrances snapped to their
// finished state so section positions are stable. Running the drop timeline
// under it would measure the reduced-motion branch, which by design has no
// tilt, no fall, no rings and no spin. Same reason design-review/scratch-tests
// is standalone. These are measurements, not regression tests.
//
// iPhone 15 Pro is MEANT to run on real WebKit, not a Chromium viewport: CSS
// 3D is exactly the area where the two engines differ (preserve-3d flattening
// rules, conic-gradient rasterisation, compositing of a nested 3D subtree), so
// a Chromium-only pass proves nothing about iOS.
//
// On THIS Mac it cannot. Playwright 1.62.1 wants WebKit revision 2336;
// mac14-arm64 is frozen at 2251 and `npx playwright install webkit` says so in
// as many words ("You are using a frozen webkit browser which does not receive
// updates anymore on mac14-arm64"). It is an OS-version freeze, not a stale
// download — reinstalling cannot fix it. webkit.launch() SUCCEEDS, which is
// what makes this easy to miss; the failure lands at newPage(), as
// `Protocol error (Page.overrideSetting): Unknown setting: PushAPIEnabled`.
//
// So this script TRIES WebKit and falls back to Chromium with the same device
// descriptor, saying which engine each frame came from. On a machine where
// WebKit is not frozen it needs no change. The iPhone frames here are
// therefore Chromium-rendered and the real-device check is still open —
// README §7.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium, webkit, devices } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'screenshots', 'mobile-v3');
const BASE = process.env.BASE || 'http://localhost:5173';
const URL = `${BASE}/lab/deck/`;

fs.mkdirSync(OUT, { recursive: true });

// The six frames the spec calls for. 0-1500 are SEEKS: the timeline is paused
// and rendered at exactly that position, so the frame is the one the spec
// describes rather than whatever the wall clock plus screenshot latency
// happened to land on. 3000 has to be live — the timeline ends at 1700ms, so
// "3000" means "1.3s into the spin", which only exists while it is running.
const SEEK_FRAMES = [0, 300, 700, 1100, 1500];
const LIVE_FRAME = 3000;

// The rings are fired imperatively at 1450ms and run for ~1.05s OUTSIDE the
// timeline (an infinite/one-shot burst has no reversible progress), so a seek
// renders the deck exactly and the rings approximately. 60ms of settle after
// the 1500 seek puts them ~60ms into the burst, consistently.
const RING_SETTLE_MS = 60;

const TARGETS = [
    { name: 'iphone-15-pro', engine: webkit, fallback: chromium, device: 'iPhone 15 Pro' },
    { name: 'pixel-7', engine: chromium, device: 'Pixel 7' },
];

// Open a page on the preferred engine, or on the fallback if the preferred one
// cannot produce one. Deliberately catches at newPage(), not at launch():
// a frozen WebKit launches cleanly and only fails when a page is created.
const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
]);

async function open(target) {
    const order = [[target.engine, false], [target.fallback, true]].filter(([e]) => e);
    let lastError;
    for (const [engine, isFallback] of order) {
        let browser;
        try {
            browser = await withTimeout(engine.launch(), 30_000, `${engine.name()}.launch`);
            const ctx = await browser.newContext({ ...devices[target.device] });
            const page = await withTimeout(ctx.newPage(), 30_000, `${engine.name()}.newPage`);
            return { browser, page, engine: engine.name(), isFallback, why: lastError };
        } catch (e) {
            lastError = e;
            // NOT awaited. Closing a frozen WebKit whose newPage() just failed
            // hangs indefinitely — the first version of this fallback did
            // `await browser.close()` here and the whole script sat there
            // forever with no output, which looked exactly like a hang in the
            // page itself. Fire and forget; the process exits anyway.
            if (browser) browser.close().catch(() => {});
        }
    }
    throw lastError;
}

const results = [];

for (const target of TARGETS) {
    const { browser, page, engine, isFallback, why } = await open(target);
    if (isFallback) {
        console.log(`  ${target.name}: ${target.engine.name()} unavailable -> FELL BACK to ${engine}`);
        console.log(`    ${String(why?.message || why).split('\n')[0]}`);
    }

    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__deckLab, null, { timeout: 45_000 });
    await page.waitForTimeout(400);

    for (const theme of ['dark', 'light']) {
        await page.evaluate((t) => window.__deckLab.setTheme(t), theme);
        await page.waitForTimeout(350);

        const clip = page.locator('.deck-lab-deck');

        for (const ms of SEEK_FRAMES) {
            await page.evaluate((s) => window.__deckLab.seek(s), ms / 1000);
            await page.waitForTimeout(RING_SETTLE_MS);
            await clip.screenshot({
                path: path.join(OUT, `${target.name}-${theme}-t${String(ms).padStart(4, '0')}.png`),
            });
        }

        // Live: back to the top, play, let it reach the spin.
        await page.evaluate(() => window.__deckLab.seek(0));
        await page.waitForTimeout(120);
        await page.evaluate(() => window.__deckLab.drop());
        await page.waitForTimeout(LIVE_FRAME);
        await clip.screenshot({
            path: path.join(OUT, `${target.name}-${theme}-t${LIVE_FRAME}.png`),
        });
        await page.evaluate(() => window.__deckLab.lift());
        await page.waitForTimeout(500);

        // Horizontal overflow, measured on the document element — the one
        // failure mode a 3D subtree produces for free, since a rotated child
        // can paint (and scroll) well outside its own layout box.
        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        results.push({ device: target.name, engine, theme, overflow, errors: errors.length });
    }

    if (errors.length) {
        console.log(`  ${target.name}: ${errors.length} ERROR(S)`);
        errors.forEach((e) => console.log(`    ${e}`));
    }
    await browser.close();
}

console.log('\nframes -> design-review/screenshots/mobile-v3/');
console.log('device           engine     theme   overflowPx  errors');
for (const r of results) {
    console.log(
        `${r.device.padEnd(17)}${r.engine.padEnd(11)}${r.theme.padEnd(8)}` +
        `${String(r.overflow).padEnd(12)}${r.errors}`,
    );
}
// Downscale to 786px wide — 2x of a 393pt phone, which is the density the
// rest of design-review/screenshots/ already uses for mobile shots. The
// device descriptors render at 3x (iPhone) and 2.625x (Pixel), which triples
// the repo cost of each frame for detail nobody reads these at. Same `sips`
// the existing capture-screenshots.mjs tells you to run by hand; run here so
// a regenerated set does not quietly drift heavier. macOS-only, so skipped
// rather than fatal elsewhere.
try {
    for (const f of fs.readdirSync(OUT).filter((n) => n.endsWith('.png'))) {
        const abs = path.join(OUT, f);
        execFileSync('sips', ['--resampleWidth', '786', abs, '--out', abs], { stdio: 'ignore' });
    }
} catch {
    console.log('(sips unavailable — frames left at native device resolution)');
}

const bad = results.filter((r) => r.overflow !== 0 || r.errors !== 0);
console.log(bad.length ? `\nFAIL: ${bad.length} case(s)` : '\nPASS: no overflow, no page errors');
process.exitCode = bad.length ? 1 : 0;
