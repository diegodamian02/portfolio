// Does the EXISTING pitch fader respond to a real finger on a phone?
//
// CSS says it should: the handle carries a 44x44 ::before hit area and
// touch-action: pan-x, which hands vertical drags to JS and leaves horizontal
// panning to the browser. But that is an inference from styles. This drives
// CDP Input.dispatchTouchEvent (the only thing that makes Chrome synthesise
// pointerType:"touch") and reads the backing <input type=range> value, which
// syncPitchInput() keeps in step with the handle.
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForSelector('.turntable-fader-handle', { timeout: 30_000 });

// The intro loading screen covers the whole page and is what a pointer hits
// first. The first version of this file dragged straight onto it and read
// pitch=0 — which looks exactly like "the fader is not wired up" and is
// actually "nothing was ever dragged". Wait it out.
await page.waitForFunction(() => {
    const el = document.querySelector('.loading-screen');
    if (!el) return true;
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0
        || cs.pointerEvents === 'none';
}, null, { timeout: 30_000 });
// And assert it: the handle must be the topmost element under its own centre.
await page.waitForFunction(() => {
    const h = document.querySelector('.turntable-fader-handle');
    const r = h.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return top === h || h.contains(top);
}, null, { timeout: 30_000 });

const cdp = await context.newCDPSession(page);
const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', {
    type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [],
});
const pitch = () => page.evaluate(
    () => Number(document.querySelector('.turntable-fader-input').value),
);
const handleY = () => page.evaluate(() => {
    const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.turntable-fader-handle')).transform);
    return Math.round(m.f);
});

// ---- geometry, first: the numbers the docs quote for travel and hit area ---
const geom = await page.evaluate(() => {
    const h = document.querySelector('.turntable-fader-handle');
    const t = document.querySelector('.turntable-fader-track');
    const hr = h.getBoundingClientRect(), tr = t.getBoundingClientRect();
    const before = getComputedStyle(h, '::before');
    return {
        handle: `${hr.width.toFixed(0)}x${hr.height.toFixed(0)}`,
        track: `${tr.width.toFixed(0)}x${tr.height.toFixed(1)}`,
        hit: `${before.width} x ${before.height}`,
        travel: +(tr.height - hr.height).toFixed(1),
        touchActionComputed: getComputedStyle(h).touchAction,
        touchActionAuthored: 'none (main.scss) — Draggable overrides it inline',
    };
});
const PITCH_RANGE = 8;
console.log(`\nviewport  ${await page.evaluate(() => `${innerWidth}x${innerHeight}`)}`);
console.log(`  handle ${geom.handle}, hit area ${geom.hit}  (44px is the touch floor)`);
console.log(`  track ${geom.track} -> ${geom.travel}px of travel for +/-${PITCH_RANGE}%`
    + `  = ${(geom.travel / (2 * PITCH_RANGE)).toFixed(1)}px per percent`);
console.log(`  touch-action computed: ${geom.touchActionComputed}  [authored: ${geom.touchActionAuthored}]`);

const box = await page.locator('.turntable-fader-handle').boundingBox();
const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
const scrollBefore = await page.evaluate(() => window.scrollY);

console.log(`\nhandle at (${from.x.toFixed(0)}, ${from.y.toFixed(0)})  pitch=${await pitch()}`);

// Drag UP 40px, in steps, holding at the end so the spring has not yet run.
await touch('touchStart', from);
for (let i = 1; i <= 10; i++) {
    await touch('touchMove', { x: from.x, y: from.y - (40 * i) / 10 });
    await page.waitForTimeout(16);
}
const held = await pitch();
const heldY = await handleY();
const scrollDuring = await page.evaluate(() => window.scrollY);
await touch('touchEnd', null);

// Release: the fader is a pitch BEND, so it springs back to 0 in 400ms.
await page.waitForTimeout(700);
const settled = await pitch();

console.log(`  while held (dragged up 40px):  pitch=${held}  handleY=${heldY}`);
console.log(`  page scrollY: ${scrollBefore} -> ${scrollDuring}  (want unchanged: the fader must not scroll the page)`);
console.log(`  400ms after release:           pitch=${settled}  (spring-back to 0)`);
console.log(`\n  touch moves the fader: ${held > 0.5 ? 'YES' : 'NO'}`);
console.log(`  page stayed put:       ${scrollDuring === scrollBefore ? 'YES' : 'NO'}`);
console.log(`  springs back to zero:  ${Math.abs(settled) < 0.2 ? 'YES' : 'NO'}`);
if (errors.length) console.log('\npage errors:', errors);
await browser.close();
