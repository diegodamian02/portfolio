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
import os from 'os';
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const THROTTLE = Number(process.env.THROTTLE || 4);
// Every case runs REPEATS times and all of them are printed. One run is not
// a measurement on a shared laptop: a single 200-300ms main-thread stall
// shows up as "2 dropped frames" and is indistinguishable, in one run, from
// a real regression. Three runs make host noise obvious — it lands in
// different cases each time — where a regression would not move.
const REPEATS = Number(process.env.REPEATS || 3);
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
        raw: d,
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
    //
    // The generation id is load-bearing, and the first version of this got it
    // wrong. It gated the loop on a single shared boolean (`window.__raf`),
    // set false at the end of a run and true at the start of the next — so
    // the PREVIOUS run's loop, which only re-checks the flag on its next
    // tick, found it true again and RESURRECTED itself. Two loops then pushed
    // into the same array, and the zombie's first delta spanned the whole gap
    // between runs. Symptom: 415 frames in a 6.7s window (60Hz allows 402,
    // so the count was physically impossible and that is what gave it away)
    // and single "frames" of 210-317ms that were reported as dropped frames.
    // An id that only ever increases cannot be re-entered.
    await page.evaluate(() => {
        const id = (window.__rafGen || 0) + 1;
        window.__rafGen = id;
        window.__frames = [];
        let last = performance.now();
        const tick = (now) => {
            if (window.__rafGen !== id) return; // a newer probe owns the loop
            window.__frames.push(now - last);
            last = now;
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
    await page.evaluate(() => window.__deckLab.drop());
    await page.waitForTimeout(1700 + SPIN_MS);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    // Bumping the generation is what stops the loop — it can never be undone
    // by a later install, unlike the boolean this replaced.
    const frames = await page.evaluate(() => {
        window.__rafGen += 1;
        return window.__frames;
    });
    await page.evaluate(() => window.__deckLab.lift());
    await page.waitForTimeout(600);
    return stats(frames);
}

const loadAvg = os.loadavg().map((n) => n.toFixed(2)).join(' ');

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices[DEVICE] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${BASE}/lab/deck/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__deckLab, null, { timeout: 45_000 });
await page.waitForTimeout(500);

const cdp = await ctx.newCDPSession(page);

const tr = await throttleRatio(page, cdp, THROTTLE);

const out = {};
for (const theme of ['dark', 'light']) {
    await page.evaluate((t) => window.__deckLab.setTheme(t), theme);
    await page.waitForTimeout(400);
    // One unsampled drop first. Even on a primed server the very first drop
    // of a page pays for GSAP's initial transform parse, the browser's first
    // promotion of the ten 3D layers, and the first rasterisation of the
    // platter's conic gradient — none of which recur, and all of which would
    // otherwise land in the first measured case and only the first, making
    // "rings on" look worse than "rings off" for reasons unrelated to rings.
    await run(page, cdp, { rings: true });
    for (const rings of [true, false]) {
        const key = `${theme} / rings ${rings ? 'on' : 'off'}`;
        out[key] = [];
        for (let i = 0; i < REPEATS; i++) out[key].push(await run(page, cdp, { rings }));
    }
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
console.log(`${REPEATS} runs per case, all shown.\n`);
console.log('case                 run  frames   avg   med   p95  worst   >16.7ms   dropped(>33.3)');
for (const [k, runs] of Object.entries(out)) {
    runs.forEach((s, i) => {
        if (!s) { console.log(`${k.padEnd(20)} ${i + 1}    (no frames)`); return; }
        console.log(
            `${(i === 0 ? k : '').padEnd(20)} ${String(i + 1).padStart(3)} ` +
            `${String(s.frames).padStart(7)} ${String(s.avg).padStart(5)} ` +
            `${String(s.median).padStart(5)} ${String(s.p95).padStart(5)} ${String(s.worst).padStart(6)} ` +
            `${String(s.over).padStart(6)} (${String(s.overPct).padStart(4)}%) ` +
            `${String(s.dropped).padStart(9)}`,
        );
    });
}
const expected = Math.round((1700 + SPIN_MS) / 16.67);
console.log(`\n~${expected} frames expected at a clean 60Hz over the ${((1700 + SPIN_MS) / 1000).toFixed(1)}s window.`);
// A count ABOVE the 60Hz ceiling is impossible for one rAF loop, so it means
// the probe is double-counting, not that the deck ran fast. Called out rather
// than left for a reader to notice — it is how the generation-id bug above
// was caught, and the resulting numbers looked plausible enough to quote.
const flat = Object.entries(out).flatMap(([k, runs]) => runs.map((v, i) => [`${k} #${i + 1}`, v]));
const impossible = flat.filter(([, v]) => v && v.frames > expected + 5);
if (impossible.length) {
    console.log('\nWARNING: more frames than 60Hz allows — the rAF probe is double-counting:');
    impossible.forEach(([k, v]) => console.log(`  ${k}: ${v.frames} > ${expected}`));
}

// Every frame over 100ms, across every run. A 60Hz budget is 16.7ms and a
// dropped frame is 33.3; nothing the deck does can produce 200ms+, so these
// are host stalls (other processes, GC, the dev server rebuilding) and not a
// property of the page. Printed with the machine's load so the reader can
// tell a noisy run from a real one rather than taking the word of this
// comment for it.
const stalls = flat.flatMap(([k, v]) => (v ? v.raw.filter((x) => x > 100).map((x) => [k, +x.toFixed(0)]) : []));
console.log(`\nhost load average during this run: ${loadAvg}`);
if (stalls.length) {
    console.log(`frames over 100ms (host stalls, not the deck): ${stalls.length}`);
    stalls.forEach(([k, x]) => console.log(`  ${k}: ${x}ms`));
    console.log('  -> re-run on an idle machine before quoting the dropped-frame column.');
} else {
    console.log('no frame over 100ms in any run.');
}
console.log(`\ndeck subtree: ${layers.total} elements, ${layers.transformed} transformed, ${layers.willChange} with will-change`);
if (errors.length) console.log('page errors:', errors);
