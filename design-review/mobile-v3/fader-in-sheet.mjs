// Stage 12.4 reproduction — the pitch fader fights the sheet's dismiss
// gesture. Reported by the owner 2026-11-27 ("weird behavior when you scroll
// up and down because of the pop up window"). Recorded, not yet fixed.
//
//   cd client && npm run dev:lan      (or npm run dev)
//   node design-review/mobile-v3/fader-in-sheet.mjs
//
// The mechanism, from the code: bottom-sheet.jsx attaches its pull handler to
// `.sheet-scroll`, and arms it on ANY pointerdown while the scroller is at
// its top. The deck — and therefore the pitch fader — is a child of
// `.sheet-scroll`, and sits at the top. So a downward drag on the fader is
// also a downward drag "from scroll-top", which the sheet claims as a
// dismiss. Nothing in the handler asks whether the finger landed on a
// control.
//
// Two gestures, measured against each other:
//   DOWN on the fader (pitch should go NEGATIVE, sheet should NOT move)
//   UP   on the fader (pitch should go POSITIVE, sheet should NOT move)
//
// UP is the control: the sheet only pulls downward, so if the fader works
// upward and fails downward, the conflict is proven to be the sheet's pull
// rather than anything wrong with the fader itself.
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'load', timeout: 30_000 });
await page.waitForFunction(() => {
    const el = document.querySelector('.loading-screen');
    if (!el) return true;
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden'
        || Number(cs.opacity) === 0 || cs.pointerEvents === 'none';
}, null, { timeout: 30_000 });

await page.locator('.record-crate-input').click();
await page.locator('.record-crate-input').type('midnight city', { delay: 40 });
await page.waitForSelector('.record-crate-card', { timeout: 20_000 });
await page.locator('.record-crate-card').first().click();
await page.waitForTimeout(3500);   // drop + sheet rise

const cdp = await context.newCDPSession(page);
const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', {
    type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [],
});
const pitch = () => page.evaluate(
    () => Number(document.querySelector('.turntable-fader-input')?.value ?? NaN));
const sheetY = () => page.evaluate(() => {
    const el = document.querySelector('.sheet');
    return Math.round(new DOMMatrixReadOnly(getComputedStyle(el).transform).f);
});
const open = () => page.evaluate(
    () => !!document.querySelector('.sheet-root')?.hasAttribute('data-open'));
const scrollTop = () => page.evaluate(
    () => document.querySelector('.sheet-scroll')?.scrollTop ?? -1);

async function dragFader(dy, label) {
    await page.evaluate(() => { document.querySelector('.sheet-scroll').scrollTop = 0; });
    await page.waitForTimeout(200);
    const box = await page.locator('.turntable-fader-handle').boundingBox();
    if (!box) { console.log('  fader handle not found'); return; }
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const top0 = await scrollTop();

    await touch('touchStart', from);
    let heldPitch = NaN; let heldSheet = 0;
    for (let i = 1; i <= 12; i++) {
        await touch('touchMove', { x: from.x, y: from.y + (dy * i) / 12 });
        await page.waitForTimeout(14);
        if (i === 12) { heldPitch = await pitch(); heldSheet = await sheetY(); }
    }
    await touch('touchEnd', null);
    await page.waitForTimeout(900);

    console.log(`  ${label}`);
    console.log(`      scrollTop at start : ${top0}`);
    console.log(`      pitch while held   : ${heldPitch}`);
    console.log(`      sheet y while held : ${heldSheet}px   (0 = the sheet did not move)`);
    console.log(`      sheet still open   : ${await open()}`);
    return { heldPitch, heldSheet, stillOpen: await open() };
}

console.log('\npitch fader vs the sheet\'s pull-to-dismiss\n');
const up = await dragFader(-45, 'DRAG UP 45px   (control: the sheet never pulls upward)');
if (!(await open())) { await page.locator('.player-dock-open').click(); await page.waitForTimeout(900); }
const down = await dragFader(45, 'DRAG DOWN 45px (the reported case)');

console.log('\nverdict');
console.log(`  upward   : fader moved=${Math.abs(up?.heldPitch ?? 0) > 0.5}  sheet moved=${Math.abs(up?.heldSheet ?? 0) > 2}`);
console.log(`  downward : fader moved=${Math.abs(down?.heldPitch ?? 0) > 0.5}  sheet moved=${Math.abs(down?.heldSheet ?? 0) > 2}`);
console.log(
    Math.abs(down?.heldSheet ?? 0) > 2
        ? '\n  CONFLICT REPRODUCED — a downward drag on the fader also drags the sheet.'
        : '\n  No sheet movement on a downward fader drag.',
);
await browser.close();
