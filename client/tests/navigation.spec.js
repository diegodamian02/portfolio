// Navbar behaviour across the matrix: inline links on wide viewports, the
// hamburger panel at ≤900px, the theme toggle + its persistence, and the URL
// hash updating on a nav click (B3c).
import { test, expect } from './fixtures.js';
import { gotoSection, waitForScrollSettle, usesHamburger } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(800);
});

test('nav to #projects updates the hash and lands near the offset', async ({ page }) => {
  await gotoSection(page, 'projects');
  await expect(page).toHaveURL(/#projects$/);
  const m = await page.locator('#projects').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, offset: parseFloat(getComputedStyle(el).scrollMarginTop) || 0 };
  });
  // top edge lands near scroll-offset — generous tolerance for Lenis's easing
  // tail; the strict "no content behind the navbar" check is B3's own concern
  // and covered by responsive.spec's per-section top bound.
  expect(Math.abs(m.top - m.offset), `#projects top ${m.top.toFixed(0)} vs offset ${m.offset}`).toBeLessThan(100);
});

test('inline links vs hamburger for this viewport', async ({ page }) => {
  if (usesHamburger(page)) {
    await expect(page.locator('.hamburger')).toBeVisible();
    await expect(page.locator('.navbar-right')).toBeHidden();
  } else {
    await expect(page.locator('.hamburger')).toBeHidden();
    await expect(page.locator('.navbar-links a').first()).toBeVisible();
  }
});

test('hamburger menu opens, navigates, and closes', async ({ page }) => {
  test.skip(!usesHamburger(page), 'wide viewport shows inline links');

  const burger = page.locator('.hamburger');
  await expect(burger).toHaveAttribute('aria-expanded', 'false');
  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');

  const panel = page.locator('.navbar-mobile');
  await expect(panel).toHaveClass(/is-open/);

  // Pick a destination from inside the panel.
  await panel.locator('a[href="#experience"]').click();
  await expect(burger).toHaveAttribute('aria-expanded', 'false', { timeout: 5000 });
  await waitForScrollSettle(page);
  await expect(page).toHaveURL(/#experience$/);
});

test('Escape closes an open hamburger menu', async ({ page }) => {
  test.skip(!usesHamburger(page), 'wide viewport shows inline links');
  await page.locator('.hamburger').click();
  await expect(page.locator('.navbar-mobile')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.hamburger')).toHaveAttribute('aria-expanded', 'false');
});

test('theme toggle flips data-theme and persists across a reload', async ({ page }) => {
  const themeOf = () => page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const before = await themeOf();
  const want = before === 'dark' ? 'light' : 'dark';

  if (usesHamburger(page)) {
    await page.locator('.hamburger').click();
    await page.locator('.navbar-mobile .theme-toggle').click();
  } else {
    await page.locator('.navbar-right .theme-toggle').click();
  }

  // The flip runs through document.startViewTransition() — data-theme changes
  // in an async callback after the snapshot, so poll rather than read once.
  await expect.poll(themeOf, { timeout: 6000 }).toBe(want);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(want);

  await page.reload({ waitUntil: 'load' });
  await expect.poll(themeOf, { timeout: 4000 }).toBe(want);
});
