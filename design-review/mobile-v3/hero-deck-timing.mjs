// Stage 12.4 — the hero deck must not animate behind the sheet.
//
//   cd client && npm run dev:lan      (or npm run dev)
//   node design-review/mobile-v3/hero-deck-timing.mjs
//
// The owner reported the hero deck "popping" into place. Cause, measured:
// its whole 2.6s drop ran while the sheet was covering it, so by the time
// the sheet was dismissed the deck had silently become tilted, open and
// spinning. Nobody saw it move, so it read as a pop.
//
// Two assertions, and the second is the one that proves the fix rather than
// merely describing it:
//
//   A  while the sheet is OPEN the hero deck does not move at all
//   B  once the sheet closes it DOES move — i.e. the drop was deferred,
//      not deleted
//
// B is the control. Without it, "the deck did not move" is trivially
// satisfied by a deck that never animates again.
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 15 Pro'] });
const page = await context.newPage();

await page.goto(BASE, { waitUntil: 'load', timeout: 30_000 });
await page.waitForFunction(() => {
    const el = document.querySelector('.loading-screen');
    if (!el) return true;
    const cs = getComputedStyle(el);
    return cs.display === 'none' || cs.visibility === 'hidden'
        || Number(cs.opacity) === 0 || cs.pointerEvents === 'none';
}, null, { timeout: 30_000 });

// A fingerprint of the hero deck's whole 3D pose: every transformed element
// at once. Comparing one element would miss a lid that moved while the
// plinth held still.
const pose = () => page.evaluate(() => {
    const root = document.querySelector('.hero-deck-preview');
    if (!root) return null;
    return [...root.querySelectorAll('*')]
        .map((el) => {
            const cs = getComputedStyle(el);
            return cs.transform === 'none' ? '' : `${cs.transform}|${cs.opacity}`;
        })
        .join('~');
});

await page.locator('.record-crate-input').click();
await page.locator('.record-crate-input').type('midnight city', { delay: 40 });
await page.waitForSelector('.record-crate-card', { timeout: 20_000 });

const before = await pose();
await page.locator('.record-crate-card').first().click();

// Sample across the whole window the drop used to occupy.
const samples = [];
for (const at of [300, 800, 1400, 2000, 2800]) {
    await page.waitForTimeout(at === 300 ? 300 : 600);
    samples.push({
        at,
        pose: await pose(),
        sheetOpen: await page.evaluate(
            () => !!document.querySelector('.sheet-root')?.hasAttribute('data-open')),
    });
}

const movedWhileCovered = samples.filter((s) => s.sheetOpen && s.pose !== before);
const results = [];
const record = (name, pass, detail) => {
    results.push(pass);
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
    console.log(`        ${detail}`);
};

console.log('\nthe hero deck must not animate behind the sheet\n');
record('A  hero deck is motionless while the sheet covers it',
    movedWhileCovered.length === 0,
    `${samples.filter((s) => s.sheetOpen).length} samples taken with the sheet open, `
    + `${movedWhileCovered.length} showed movement `
    + `(at ${movedWhileCovered.map((s) => `${s.at}ms`).join(', ') || 'none'})`);

// ---- B: the control ----
const atClose = await pose();
await page.evaluate(() => document.querySelector('.sheet-scrim')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
// Mid-drop, not after it: sampling once the timeline has finished would
// compare two settled poses and could pass on a deck that teleported.
await page.waitForTimeout(700);
const midDrop = await pose();
await page.waitForTimeout(2600);
const settled = await pose();

record('B  control: the drop RUNS once the sheet is out of the way',
    midDrop !== atClose && settled !== midDrop,
    `pose at close -> mid-drop: ${midDrop !== atClose ? 'changed' : 'IDENTICAL'}; `
    + `mid-drop -> settled: ${settled !== midDrop ? 'changed' : 'IDENTICAL'} `
    + `(both must change, or the drop was deleted rather than deferred)`);

await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exitCode = results.every(Boolean) ? 0 : 1;
