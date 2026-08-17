/**
 * Regenerates design-review/screenshots/ from the running site.
 *
 *   cd client && npx vite build && npx vite preview --port 5173 &
 *   node design-review/capture-screenshots.mjs
 *
 * Port 5173 matters: the backend's CORS allowlist permits localhost:5173 but
 * not 4173, and #my-taste silently renders its "taking a nap" error state if
 * the Spotify fetch is blocked. Screenshots taken on the wrong port will look
 * like a broken Spotify integration when nothing is actually wrong.
 *
 * Requires playwright (npm i -D playwright). Set BASE to point at production
 * instead: BASE=https://diegodamian.com/ node design-review/capture-screenshots.mjs
 * — note production may never reach networkidle, so waitUntil is 'load'.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:5173/';
const OUT = process.env.OUT || path.join(HERE, 'screenshots');

fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
];

// Section anchors as rendered by client/src/App.jsx.
const SECTIONS = ['home', 'projects', 'my-taste', 'about', 'connect'];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    // The intro is gated on sessionStorage and would otherwise cover the first
    // capture. Grab it once on desktop, then mark it played for everything else.
    if (vp.name === 'desktop') {
        await page.goto(BASE, { waitUntil: 'load' });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${OUT}/00-loading-${vp.name}.png` });
    }

    await page.addInitScript(() => window.sessionStorage.setItem('introPlayed', '1'));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(2500); // let Spotify data land and animations settle

    for (const id of SECTIONS) {
        const el = page.locator(`#${id}`);
        if (!(await el.count())) {
            console.log(`  ${vp.name}: #${id} NOT FOUND`);
            continue;
        }
        await el.scrollIntoViewIfNeeded();
        // #my-taste (Stage 4 Task 4) pins and runs a ~2s entrance cascade
        // before settling — the default 700ms below was written for every
        // OTHER section, which just fades/settles well inside that window.
        // Without this, the capture landed mid-cascade (found live: Stone
        // Temple Pilots' card and the whole crate missing from the shot,
        // reading as broken/missing content rather than "captured too
        // early"). 3200ms comfortably clears the cascade's own measured
        // ~2.1s even accounting for scrollIntoViewIfNeeded() not
        // necessarily landing scroll at the same position a real organic
        // scroll would.
        await page.waitForTimeout(id === 'my-taste' ? 3200 : 700);
        const box = await el.boundingBox();
        await el.screenshot({ path: `${OUT}/${id}-${vp.name}.png` });
        console.log(`  ${vp.name}: #${id} ${Math.round(box?.width)}x${Math.round(box?.height)}`);
    }

    // Light theme, desktop only — enough to catch token-inversion contrast bugs.
    if (vp.name === 'desktop') {
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'light');
            window.dispatchEvent(new Event('themeChange'));
        });
        await page.waitForTimeout(600);
        for (const id of ['home', 'about']) {
            const el = page.locator(`#${id}`);
            await el.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            await el.screenshot({ path: `${OUT}/${id}-light.png` });
        }
        console.log('  light-theme: home, about');
    }

    await ctx.close();
}

await browser.close();

// Captured at 2x. Downscale desktop to native 1440 CSS px so the files stay
// small enough to live in the repo; mobile stays at 2x since 390px native is
// too small to read and those files are only tens of KB anyway.
console.log('\nNow downscale desktop shots to 1440px wide:');
console.log(`  for f in ${OUT}/*-desktop.png ${OUT}/*-light.png; do sips --resampleWidth 1440 "$f" --out "$f"; done`);
