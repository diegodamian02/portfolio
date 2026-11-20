// Stage 12.1 — what the CSS 3D deck actually costs, on a slow phone.
//
//   cd client && npm run dev
//   node design-review/mobile-v3/perf-trace.mjs
//
// Chromium with a 4x CPU throttle (CDP Emulation.setCPUThrottlingRate — a real
// slowdown of the main thread, not a viewport change). Records the 1.7s drop
// plus 5s of spinning, twice: rings ON, then rings OFF, so the two rings can
// be priced separately rather than guessed at.
//
// Frame times come from requestAnimationFrame timestamps collected IN the
// page, not from a trace file. Two reasons: rAF deltas are what the animation
// itself experiences (a dropped frame is a rAF gap, by definition), and a
// trace would have to be parsed for the same number with more machinery and
// more ways to be subtly wrong. The cost is that rAF cannot see a frame the
// compositor dropped without the main thread noticing — which, for an
// animation GSAP drives from the main thread every frame, it cannot.
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const THROTTLE = Number(process.env.THROTTLE || 4);
const SPIN_MS = 5000;
const FRAME_BUDGET = 16.7; // 60Hz
// A frame that misses one vsync. The >16.7 count alone is misleading here and
// the first run of this script proved it: at a 60Hz mean of 16.67ms, roughly
// half of all frames land a rounding error ABOVE 16.7 and get counted as
// "over budget" while nothing has actually been dropped. A dropped frame is a
// gap of two vsync intervals or more, which is what this threshold catches.
const DROP_BUDGET = 33.3;

// Pixel 7 on Chromium: the only one of the two spec devices CDP can throttle.
// WebKit has no equivalent knob, so the iPhone side of this is a real-device
// task (see README, "What still needs a phone").
const DEVICE = 'Pixel 7';

function stats(frames) {
    // The first delta is the gap from "probe installed" to "first frame" and
    // is not a frame time at all. Dropped, not averaged in.
    const d = frames.slice(1);
    if (!d.length) return null;
    const sorted = [...d].sort((a, b) => a - b);
    const sum = d.reduce((a, b) => a + b, 0);
    return {
        frames: d.length,
        avg: +(sum / d.length).toFixed(2),
        median: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
        p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
        worst: +sorted[sorted.length - 1].toFixed(2),
        over: d.filter((x) => x > FRAME_BUDGET).length,
        overPct: +((d.filter((x) => x > FRAME_BUDGET).length / d.length) * 100).toFixed(1),
        dropped: d.filter((x) => x > DROP_BUDGET).length,
        spanMs: +sum.toFixed(0),
    };
}

// Proof the throttle is doing something, rather than trusting the CDP call.
// A fixed amount of arithmetic is timed unthrottled and then throttled; the
// ratio should be close to the requested rate. Without this the headline
// result ("holds 60fps at 4x") is unfalsifiable — an ignored throttle looks
// exactly like a deck that is cheap enough not to care.
async function throttleRatio(page, cdp, rate) {
    // 1e8 iterations, ~300ms unthrottled. The first version used 6e6 (~19ms)
    // and reported 4x as 1.54x: CDP throttling works by interleaving stalls
    // on a sampling interval, so a burst that finishes inside one interval
    // barely gets touched and the verification undersells itself.
    const burn = () => page.evaluate(() => {
        const t0 = performance.now();
        let x = 0;
        for (let i = 0; i < 1e8; i++) x += Math.sqrt(i);
        return { ms: performance.now() - t0, x };
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const base = (await burn()).ms;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const slow = (await burn()).ms;
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    return { base: +base.toFixed(0), slow: +slow.toFixed(0), ratio: +(slow / base).toFixed(2) };
}

async function run(page, cdp, { rings }) {
    await page.evaluate((on) => window.__deckLab.setRings(on), rings);
    await page.evaluate(() => window.__deckLab.seek(0));
    await page.waitForTimeout(400);

    // Installed BEFORE the drop, torn down after, so the sample covers exactly
    // the window being priced and nothing either side of it.
    await page.evaluate(() => {
        window.__frames = [];
        let last = performance.now();
        window.__raf = true;
        const tick = (now) => {
            window.__frames.push(now - last);
            last = now;
            if (window.__raf) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    await page.evaluate(() => window.__deckLab.drop());
    await page.waitForTimeout(1700 + SPIN_MS);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    const frames = await page.evaluate(() => { window.__raf = false; return window.__frames; });
    await page.evaluate(() => window.__deckLab.lift());
    await page.waitForTimeout(600);
    return stats(frames);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices[DEVICE] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${BASE}/lab/deck`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__deckLab, null, { timeout: 15_000 });
await page.waitForTimeout(500);

const cdp = await ctx.newCDPSession(page);

const tr = await throttleRatio(page, cdp, THROTTLE);

const out = {};
for (const theme of ['dark', 'light']) {
    await page.evaluate((t) => window.__deckLab.setTheme(t), theme);
    await page.waitForTimeout(400);
    out[`${theme} / rings on`] = await run(page, cdp, { rings: true });
    out[`${theme} / rings off`] = await run(page, cdp, { rings: false });
}

// How many elements in the deck subtree actually carry a transform. This is
// the layer-budget number the brief asks about ("~10 or fewer"), counted from
// the rendered DOM rather than from the source.
const layers = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.sw-stage, .sw-stage *')];
    const transformed = all.filter((el) => getComputedStyle(el).transform !== 'none');
    const willChange = all.filter((el) => getComputedStyle(el).willChange !== 'auto');
    return { total: all.length, transformed: transformed.length, willChange: willChange.length };
});

await browser.close();

console.log(`\nPixel 7 / Chromium, ${THROTTLE}x CPU throttle — drop (1.7s) + ${SPIN_MS / 1000}s spin`);
console.log(`budget ${FRAME_BUDGET}ms\n`);
console.log(`CPU throttle verified: ${tr.base}ms unthrottled -> ${tr.slow}ms at ${THROTTLE}x (${tr.ratio}x slower)\n`);
console.log('case                 frames   avg   med   p95  worst   >16.7ms       dropped(>33.3)');
for (const [k, s] of Object.entries(out)) {
    if (!s) { console.log(`${k.padEnd(20)} (no frames)`); continue; }
    console.log(
        `${k.padEnd(20)} ${String(s.frames).padStart(6)} ${String(s.avg).padStart(5)} ` +
        `${String(s.median).padStart(5)} ${String(s.p95).padStart(5)} ${String(s.worst).padStart(6)} ` +
        `${String(s.over).padStart(6)} (${String(s.overPct).padStart(4)}%) ` +
        `${String(s.dropped).padStart(13)}`,
    );
}
const expected = Math.round((1700 + SPIN_MS) / 16.67);
console.log(`\n~${expected} frames expected at a clean 60Hz over the ${((1700 + SPIN_MS) / 1000).toFixed(1)}s window.`);
console.log(`\ndeck subtree: ${layers.total} elements, ${layers.transformed} transformed, ${layers.willChange} with will-change`);
if (errors.length) console.log('page errors:', errors);
