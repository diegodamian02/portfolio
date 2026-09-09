// Shared navigation + measurement helpers. Kept engine-agnostic (no CDP) so
// every helper works on Chromium, WebKit and Firefox alike.
import { expect } from './fixtures.js';

export const SECTIONS = ['home', 'about', 'experience', 'my-taste', 'projects', 'connect'];

/**
 * Navigate to a section the way the app itself does — a real click on an
 * <a href="#id">. Fired through evaluate() so it works whether the link is the
 * visible desktop one or the copy inside the closed hamburger, and so it counts
 * as an app-initiated scroll (About's scroll-hold only yields to those; a raw
 * scrollIntoView traps the page — see capture-screenshots.mjs / FINDINGS D14).
 */
export async function gotoSection(page, id) {
  await page.evaluate((sid) => {
    const link = document.querySelector(`a[href="#${sid}"]`);
    if (link) link.click();
    else document.getElementById(sid)?.scrollIntoView();
  }, id);
  await page.waitForTimeout(150); // let Lenis pick the gesture up
  await waitForScrollSettle(page);
  await page.waitForTimeout(200); // reduced-motion entrances settle a frame later
}

/**
 * Resolves once window.scrollY has held steady across three consecutive
 * ~150ms polls — Lenis has a long slow easing tail, and two samples can both
 * land on it while it's still creeping a pixel or two per frame.
 */
export async function waitForScrollSettle(page, { timeout = 10000 } = {}) {
  await page
    .waitForFunction(
      () => {
        const y = window.scrollY;
        const hist = (window.__pwYHist = (window.__pwYHist || []).concat(y).slice(-3));
        return hist.length === 3 && Math.max(...hist) - Math.min(...hist) < 1.5;
      },
      null,
      { timeout, polling: 150 },
    )
    .catch(() => {
      /* fall through — the caller's own assertions report the real problem */
    });
  await page.evaluate(() => {
    delete window.__pwYHist;
  });
}

/**
 * Asserts the document has no horizontal overflow at the current viewport.
 * Names the first few offending elements so a failure points somewhere.
 * This is the B33/B34/B42/B69/B70/B48 regression class — a hard invariant on
 * every device.
 */
export async function expectNoHorizontalOverflow(page) {
  const report = await page.evaluate(() => {
    const de = document.documentElement;
    const allowance = 1;
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > de.clientWidth + allowance || r.left < -allowance) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${String(el.className || '').trim().split(/\s+/).join('.')}` +
            ` (right=${Math.round(r.right)} left=${Math.round(r.left)})`,
        );
        if (offenders.length >= 6) break;
      }
    }
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders };
  });

  expect(
    report.scrollWidth,
    `horizontal overflow: scrollWidth ${report.scrollWidth} > clientWidth ${report.clientWidth}\n` +
      `  offenders: ${report.offenders.join('\n             ') || '(none pinpointed)'}`,
  ).toBeLessThanOrEqual(report.clientWidth + 1);
}

/**
 * Measures a section against the navbar-cleared screen it's meant to fill.
 * `room` = innerHeight − scroll-margin-top (the token B3 added, read off the
 * element so calc() is resolved). `fillRatio` = section height ÷ room.
 * `bottomOverflowPx` = how far the section's bottom edge sits past the fold
 * after it's been navigated to.
 */
export async function measureSectionFit(page, id) {
  return page.evaluate((sid) => {
    const el = document.getElementById(sid);
    const r = el.getBoundingClientRect();
    const scrollOffset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const vh = window.innerHeight;
    const room = vh - scrollOffset;
    return {
      id: sid,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
      vh,
      scrollOffset: Math.round(scrollOffset),
      room: Math.round(room),
      fillRatio: +(r.height / room).toFixed(3),
      bottomOverflowPx: Math.round(r.bottom - vh),
    };
  }, id);
}

/** True when the hamburger menu is the active nav (viewport ≤ 900px, per main.scss). */
export function usesHamburger(page) {
  const vp = page.viewportSize();
  return !!vp && vp.width <= 900;
}
