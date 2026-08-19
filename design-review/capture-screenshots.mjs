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

// Every file THIS run writes that needs the 1440px downscale below — tracked
// explicitly rather than re-derived from a glob at the end (see that
// comment for why a glob is the wrong tool here).
const writtenForDownscale = [];

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
        writtenForDownscale.push(`${OUT}/00-loading-${vp.name}.png`);
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
        // Navigate via the real navbar link (a real, in-page element.click()
        // — bypasses Playwright's own visibility check, since the mobile
        // build renders a second copy of every link inside the closed
        // hamburger menu, and either copy's onClick runs the identical
        // handler), not scrollIntoViewIfNeeded(). Found live (Stage 3 Task
        // 10): SECTIONS' own order here doesn't match the page's real DOM
        // order (it visits 'projects' right after 'home', but #projects
        // sits well below #about in the actual document), so reaching it
        // means scrolling straight through About's own ~2.9s scroll-hold
        // (about.jsx) along the way. That hold's own escape hatch —
        // isProgrammaticScrollActive() — only recognizes scrolls started
        // through this app's OWN scrollToSection() (nav clicks); a raw
        // scrollIntoViewIfNeeded() looks exactly like an organic visitor
        // scroll to it, so the hold engaged for real and never released:
        // Lenis stopped at scrollY 910 and stayed there, confirmed live
        // even after waiting 3.6s, well past the hold's own ~2.9s bound —
        // the capture landed permanently trapped, not just early (found
        // live: only the first project row visible, the other three stuck
        // at their pre-entrance opacity:0). Clicking the real nav link
        // instead marks the scroll programmatic, which is EXACTLY the
        // escape hatch About's/My Taste's own holds already carry for this
        // precise case ("a nav click already scrolling through") — the
        // capture tool just wasn't using it. Falls back to
        // scrollIntoViewIfNeeded() only if a section has no matching nav
        // link (none currently do; defensive, not exercised).
        const navLink = await page.$(`a[href="#${id}"]`);
        if (navLink) {
            await page.evaluate((linkId) => document.querySelector(`a[href="#${linkId}"]`)?.click(), id);
        } else {
            await el.scrollIntoViewIfNeeded();
        }
        // #my-taste (Stage 4 Task 4) pins and runs a ~2s entrance cascade
        // before settling — the default 700ms below was written for every
        // OTHER section, which just fades/settles well inside that window.
        // Without this, the capture landed mid-cascade (found live: Stone
        // Temple Pilots' card and the whole crate missing from the shot,
        // reading as broken/missing content rather than "captured too
        // early"). 3200ms comfortably clears the cascade's own measured
        // ~2.1s — unaffected by the nav-link change above, since this
        // timing is about My Taste's OWN entrance duration, not about
        // reaching it.
        await page.waitForTimeout(id === 'my-taste' ? 3200 : 1100);
        const box = await el.boundingBox();
        await el.screenshot({ path: `${OUT}/${id}-${vp.name}.png` });
        if (vp.name === 'desktop') writtenForDownscale.push(`${OUT}/${id}-${vp.name}.png`);
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
            writtenForDownscale.push(`${OUT}/${id}-light.png`);
        }
        console.log('  light-theme: home, about');
    }

    await ctx.close();
}

await browser.close();

// Captured at 2x. Downscale desktop to native 1440 CSS px so the files stay
// small enough to live in the repo; mobile stays at 2x since 390px native is
// too small to read and those files are only tens of KB anyway.
//
// Explicit file list, NOT a `*-desktop.png ${OUT}/*-light.png` glob — found
// live (Stage 3 Task 10): that glob matches every OTHER dated, ad-hoc
// screenshot already sitting in this directory too (t3-*-light.png,
// b8-*-light.png, and a dozen more from past bug investigations, several
// deliberately captured at 480/768/1024px, not 1440), silently upscaling
// and overwriting evidence screenshots this run never touched. Confirmed
// live: running the old glob command turned a 480px-wide, 132KB reference
// shot into an upscaled 1440px, 915KB one. This run's own writes are
// tracked in `writtenForDownscale` above and are the only files listed here.
console.log('\nNow downscale this run\'s own desktop/light shots to 1440px wide:');
console.log(`  for f in ${writtenForDownscale.filter((f) => f.includes('-desktop.png') || f.includes('-light.png')).map((f) => `"${f}"`).join(' ')}; do sips --resampleWidth 1440 "$f" --out "$f"; done`);
