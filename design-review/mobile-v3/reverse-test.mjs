// Stage 12.1 — is the drop actually reversible from any point?
//
//   cd client && npm run dev
//   node design-review/mobile-v3/reverse-test.mjs
//
// Reads the computed `transform` matrix of every animated layer at rest,
// drops, calls lift() at 400 / 900 / 1300ms, waits for the reverse to finish,
// and re-reads. "Clean" means the matrices come back IDENTICAL — compared as
// numbers out of the rendered DOM, not eyeballed from a screenshot.
//
// 400 / 900 / 1300 are not arbitrary: they straddle the three overlaps the
// timeline is built out of. At 400 the lid and the tilt are both mid-flight
// and nothing else has started; at 900 the record's fall has joined them; at
// 1300 the arm's swing has too, and the record is inside the CustomBounce
// settle — the one beat whose eased value is NOT monotonic, so it is the case
// most likely to land somewhere other than where it started.
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const CUT_POINTS_MS = [400, 900, 1300];
// The longest reverse is from 1300ms back to 0, at timeScale 1. Plus the
// 0.8s spin-down and the rings, neither of which is in the timeline.
const SETTLE_MS = 2600;

const LAYERS = ['.sw-deck', '.sw-deck-body', '.sw-record', '.sw-record-spin', '.sw-arm', '.sw-lid'];

// Matrices come back as "matrix3d(a, b, ...)" with float noise in the last
// places. 4 decimals is well inside a pixel at this scale and well outside
// the noise; an exact string compare fails on 1e-16 differences that no
// renderer can show.
function round(m) {
    return m.replace(/-?\d+\.?\d*(e-?\d+)?/g, (n) => {
        const v = Number(n);
        return (Math.abs(v) < 1e-6 ? 0 : +v.toFixed(4)).toString();
    });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${BASE}/lab/deck/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__deckLab, null, { timeout: 45_000 });
await page.waitForTimeout(600);

const read = () => page.evaluate(
    (sel) => Object.fromEntries(
        sel.map((s) => [s, getComputedStyle(document.querySelector(s)).transform]),
    ),
    LAYERS,
);

const initial = await read();
const rows = [];

for (const cut of CUT_POINTS_MS) {
    await page.evaluate(() => window.__deckLab.drop());
    // Wait on the TIMELINE position, not the wall clock. The first drop of a
    // visit runs at timeScale 1 and every later one at 1.4 (the spec's "~40%
    // faster"), so a plain waitForTimeout(900) lands at 900ms of timeline on
    // the first pass and 1260ms on the second — which is how the first run of
    // this test quietly reported a 1300ms cut that had actually reached 100%
    // and was no longer mid-flight at all.
    await page.waitForFunction(
        (ms) => window.__deckLab.progress() * window.__deckLab.duration() * 1000 >= ms,
        cut,
        { polling: 'raf', timeout: 10_000 },
    );
    const progressAtCut = await page.evaluate(() => window.__deckLab.progress());
    await page.evaluate(() => window.__deckLab.lift());
    await page.waitForTimeout(SETTLE_MS);
    const after = await read();

    for (const sel of LAYERS) {
        const a = round(initial[sel]);
        const b = round(after[sel]);
        rows.push({ cut, sel, ok: a === b, a, b, progressAtCut });
    }
}

await browser.close();

console.log('\nreverse() from mid-drop -> initial transforms\n');
for (const cut of CUT_POINTS_MS) {
    const group = rows.filter((r) => r.cut === cut);
    const prog = (group[0].progressAtCut * 100).toFixed(1);
    console.log(`lift() at ${cut}ms  (timeline progress ${prog}%)`);
    for (const r of group) {
        console.log(`  ${r.ok ? 'OK  ' : 'DIFF'} ${r.sel}`);
        if (!r.ok) {
            console.log(`        expected ${r.a}`);
            console.log(`        got      ${r.b}`);
        }
    }
}
const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - bad.length}/${rows.length} layers returned exactly.`);
if (errors.length) console.log('page errors:', errors);
process.exitCode = bad.length ? 1 : 0;
