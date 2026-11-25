// Stage 12.2 — the bottom sheet's one genuinely hard behaviour.
//
//   cd client && npm run dev
//   node design-review/mobile-v3/sheet-gesture.mjs
//
// "Drag to dismiss, but only from scroll-top." A downward swipe inside the
// sheet has to mean SCROLL when there is content above, and DISMISS when
// there is not — and the direction is not known at touch-down, so the
// gesture cannot simply be claimed or declined there. bottom-sheet.jsx arms
// on pointerdown and only hands the gesture to Draggable once the finger has
// travelled past a downward threshold.
//
// Four cases, which between them cover every branch of that decision:
//
//   A  far drag from the grabber          -> dismisses
//   B  short drag from the grabber        -> snaps back, stays open
//   C  far drag from content, scrolled    -> sheet does NOT move (scrolls)
//   D  far drag from content, at top      -> dismisses
//
// C is the regression this file exists for. Get it wrong and the sheet
// closes itself every time someone scrolls a tracklist.
//
// Real touch, via CDP Input.dispatchTouchEvent — that is what makes Chrome
// synthesise pointerType:"touch", and the handler under test is a pointer
// handler. Playwright's mouse would exercise a path a phone never takes.
//
// scrollTop is SET DIRECTLY for case C rather than scrolled into place with
// synthetic touch. design-review/scratch-tests/README.md records that CDP's
// synthetic touch ignores `touch-action` and scrolls the page regardless, so
// using it to establish scroll position would be measuring the harness.
// Assigning scrollTop is unambiguous and tests the branch that matters.
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';
const URL = `${BASE}/lab/player/`;

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'load' });
await page.waitForSelector('.player-lab-sleeve', { timeout: 30_000 });

const cdp = await context.newCDPSession(page);
const touch = (type, point) => cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: point ? [{ x: point.x, y: point.y, id: 1 }] : [],
});

const sheetOpen = () => page.evaluate(
    () => !!document.querySelector('.sheet-root')?.hasAttribute('data-open'),
);
const sheetY = () => page.evaluate(() => {
    const m = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.sheet')).transform);
    return Math.round(m.f);
});
const scrollTop = () => page.evaluate(() => document.querySelector('.sheet-scroll').scrollTop);

async function openSheet() {
    if (await sheetOpen()) return;
    const dock = page.locator('.player-dock-open');
    if (await dock.isVisible()) await dock.click();
    else await page.locator('.player-lab-sleeve').first().click();
    await page.waitForTimeout(900);
}

// A slow drag, in steps — a single jump from start to end gives the pull
// handler exactly one pointermove and no chance to read direction, which is
// not how a finger behaves and would let a broken implementation pass.
async function dragDown(from, distance, { steps = 14, settle = 1100 } = {}) {
    await touch('touchStart', from);
    for (let i = 1; i <= steps; i++) {
        await touch('touchMove', { x: from.x, y: from.y + (distance * i) / steps });
        await page.waitForTimeout(12);
    }
    await touch('touchEnd', null);
    await page.waitForTimeout(settle);
}

const centreOf = async (selector) => {
    const box = await page.locator(selector).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

// A start point and a distance that keep the whole gesture ON SCREEN.
//
// The first version of this started from the centre of the notes list and
// dragged a flat 320px. The list's centre sits at y=736 on a 839px-tall
// Pixel 7, so the finger left the viewport a third of the way through and
// the gesture died — case D failed for that reason and, worse, case C
// PASSED for it: "the sheet did not move" is trivially true when the drag
// never happened. A test that cannot fail is not evidence.
const contentDrag = async () => {
    const box = await page.locator('.sheet-scroll').boundingBox();
    const viewport = page.viewportSize();
    const from = { x: box.x + box.width / 2, y: box.y + 60 };
    // Stop well short of the bottom edge; CDP stops delivering touch moves
    // dispatched outside the viewport.
    const distance = Math.min(320, viewport.height - from.y - 60);
    return { from, distance };
};

const results = [];
const record = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
    console.log(`        ${detail}`);
};

console.log('\nbottom sheet — drag to dismiss, only from scroll-top\n');

// ---- A: a long drag from the grabber dismisses -----------------------------
await openSheet();
await dragDown(await centreOf('.sheet-grabber'), 320);
{
    const open = await sheetOpen();
    record('A  far drag from the grabber dismisses', open === false,
        `sheetOpen=${open} (want false)`);
}

// ---- B: a short drag from the grabber snaps back ---------------------------
await openSheet();
await dragDown(await centreOf('.sheet-grabber'), 40);
{
    const open = await sheetOpen();
    const y = await sheetY();
    record('B  short drag from the grabber snaps back', open === true && Math.abs(y) <= 2,
        `sheetOpen=${open} (want true), sheetY=${y} (want 0)`);
}

// ---- C: THE ONE THAT MATTERS ----------------------------------------------
// Content scrolled away from its top: a downward drag there is a scroll, and
// the sheet must not move at all.
await openSheet();
await page.evaluate(() => { document.querySelector('.sheet-scroll').scrollTop = 200; });
await page.waitForTimeout(120);
{
    const before = await scrollTop();
    const { from, distance } = await contentDrag();
    await dragDown(from, distance);
    const open = await sheetOpen();
    const y = await sheetY();
    // `before > 0` is asserted, not just reported: if the sheet's content
    // ever stops overflowing, this case silently becomes a duplicate of D
    // and would keep passing while testing nothing.
    record('C  drag from scrolled content does NOT dismiss',
        before > 0 && open === true && Math.abs(y) <= 2,
        `scrollTop before=${before} (want >0), dragged ${distance}px, `
        + `sheetOpen=${open} (want true), sheetY=${y} (want 0)`);
}

// ---- D: same gesture, same element, but from the top -----------------------
await openSheet();
await page.evaluate(() => { document.querySelector('.sheet-scroll').scrollTop = 0; });
await page.waitForTimeout(120);
{
    const { from, distance } = await contentDrag();
    await dragDown(from, distance);
    const open = await sheetOpen();
    record('D  drag from content AT TOP dismisses', open === false,
        `dragged ${distance}px from scrollTop 0, sheetOpen=${open} (want false)`);
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (errors.length) {
    console.log('page errors:');
    errors.forEach((e) => console.log(`  ${e}`));
}
process.exitCode = failed.length || errors.length ? 1 : 0;
