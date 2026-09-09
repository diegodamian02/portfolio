// The "one screen per section" contract, measured per device.
//
// ROADMAP tracks section-fill ratios obsessively (Stage 5 mobile, the desktop
// one-screen-fit pass, D34). This encodes them as assertions with deliberately
// generous tolerances — a failure here means a real regression in how a section
// sizes itself on some device, and the message prints the exact numbers.
//
// Phone,  ≥360w  (the project's stated one-screen target): every section fills
//                its navbar-cleared screen (ratio ≥ 0.5) without bleeding hard
//                past the fold.
// Phone,  <360w  (iphone-se, 320px legacy tier): only "no overflow, nothing
//                catastrophic" — the tight fit was never a goal here.
// Tablet  (≤1024w): sections fill ≥ 0.6. #projects on an iPad is D34's still-open
//                   half — marked test.fail so the suite flags it if it's fixed.
// Desktop (≥1024w): every section fits one screen after a nav click (the
//                   1440-and-up pass; 1366 keeps a looser bound).
//
// Runs with prefers-reduced-motion forced (see fixtures.js) EXCEPT the
// #experience block below — that section has a deliberately different, tall,
// always-visible static document under reduced motion, so its one-screen fit
// can only be checked with the animated filmstrip.
import { test, expect } from './fixtures.js';
import { SECTIONS, gotoSection, measureSectionFit, expectNoHorizontalOverflow } from './helpers.js';

function tier(page) {
  const w = page.viewportSize().width;
  if (w <= 500) return 'phone';
  if (w <= 1024) return 'tablet';
  return 'desktop';
}

async function assertSectionFits(page, testInfo, id) {
  await gotoSection(page, id);
  await expectNoHorizontalOverflow(page);

  const m = await measureSectionFit(page, id);
  // #home sits at document top — its offset clamps to 0, measure against the
  // whole viewport.
  const room = id === 'home' ? m.vh : m.room;
  const ratio = m.height / room;
  const note =
    `#${id} @ ${page.viewportSize().width}x${m.vh}: height ${m.height}, ` +
    `room ${Math.round(room)}, ratio ${ratio.toFixed(2)}, bottomOverflow ${m.bottomOverflowPx}px`;
  testInfo.annotations.push({ type: 'fit', description: note });

  const t = tier(page);
  if (t === 'phone') {
    const tightFit = page.viewportSize().width >= 360; // project targets 360–440
    expect(m.top, note).toBeGreaterThan(-8);
    expect(m.top, note).toBeLessThan(m.scrollOffset + 90);
    expect(ratio, note).toBeGreaterThanOrEqual(tightFit ? 0.5 : 0.45);
    const bound = tightFit ? Math.max(28, room * 0.12) : room * 0.7;
    expect(m.bottomOverflowPx, note).toBeLessThanOrEqual(bound);
  } else if (t === 'tablet') {
    expect(ratio, note).toBeGreaterThanOrEqual(0.6);
    expect(m.bottomOverflowPx, note).toBeLessThanOrEqual(Math.max(40, room * 0.15));
  } else {
    // 1440+ is tight; 1366 (desktop-small) and 1080 (ipad-landscape) looser
    // (ROADMAP: "~27px residual" at 1366).
    const strict = page.viewportSize().width >= 1440 && testInfo.project.name === 'desktop-chrome';
    const bound = strict ? Math.max(40, room * 0.06) : Math.max(60, room * 0.18);
    expect(m.bottomOverflowPx, note).toBeLessThanOrEqual(bound);
  }
}

test.describe('section fit (reduced motion)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(1200); // Spotify data lands, section heights settle
  });

  for (const id of SECTIONS.filter((s) => s !== 'experience')) {
    test(`#${id} fits its screen`, async ({ page }, testInfo) => {
      const isIpad =
        testInfo.project.name.startsWith('ipad-') && testInfo.project.name !== 'ipad-landscape';
      if (isIpad && id === 'projects') {
        // D34's unresolved half — #projects floats at 0.40–0.62× on 768–1024
        // portrait. Expected-fail; the suite alerts if it starts passing.
        test.fail(true, 'D34: no tablet tier for #projects yet');
      }
      await assertSectionFits(page, testInfo, id);
    });
  }

  test('no horizontal overflow anywhere down the full page', async ({ page }) => {
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.6;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('section fit — #experience filmstrip (motion on)', () => {
  test.use({ forceReducedMotion: false });

  test('#experience filmstrip fits its screen', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await gotoSection(page, 'experience');
    await page.waitForTimeout(1500); // filmstrip entrance / scale settle
    await expectNoHorizontalOverflow(page);

    const m = await measureSectionFit(page, 'experience');
    const note =
      `#experience @ ${page.viewportSize().width}x${m.vh}: height ${m.height}, ` +
      `room ${m.room}, ratio ${(m.height / m.room).toFixed(2)}, bottomOverflow ${m.bottomOverflowPx}px`;
    testInfo.annotations.push({ type: 'fit', description: note });

    // The filmstrip owns exactly one navbar-cleared screen on every device
    // (D34 resolved 2026-09-08). Generous bounds — it's a fit check, not a
    // pixel lock.
    expect(m.height / m.room, note).toBeGreaterThanOrEqual(0.6);
    expect(m.bottomOverflowPx, note).toBeLessThanOrEqual(Math.max(60, m.room * 0.15));
  });
});
