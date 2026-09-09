// Every device project: the page loads, renders all six sections, throws no
// uncaught error, and has no horizontal overflow. The cheapest, broadest net —
// B56 ("the entire page goes blank") surfaces here as a pageerror.
import { test, expect } from './fixtures.js';
import { SECTIONS, expectNoHorizontalOverflow } from './helpers.js';

// console errors that are environmental noise rather than app defects
const CONSOLE_ALLOW = [/favicon/i, /apple-touch-icon/i, /manifest/i, /Failed to load resource.*404/i];

test('loads with all sections, no uncaught errors, no h-overflow', async ({
  page,
  pageErrors,
  consoleErrors,
}) => {
  await page.goto('/', { waitUntil: 'load' });

  await expect(page).toHaveTitle('Diego Damian');
  await expect(page.locator('nav.navbar')).toBeVisible();

  for (const id of SECTIONS) {
    await expect(page.locator(`section#${id}`)).toHaveCount(1);
  }
  // The turntable and the crate input — the hero's two load-bearing pieces.
  await expect(page.locator('#home .turntable')).toBeVisible();
  await expect(page.locator('#home .record-crate-input')).toBeVisible();

  // Let late work (Spotify data, GSAP setup, Lenis) settle, then re-check.
  await page.waitForTimeout(1500);
  await expectNoHorizontalOverflow(page);

  expect(pageErrors, pageErrors.map((e) => e.message).join('\n')).toHaveLength(0);

  const realConsole = consoleErrors.filter((t) => !CONSOLE_ALLOW.some((re) => re.test(t)));
  expect(realConsole, realConsole.join('\n')).toHaveLength(0);
});

test('deep link to /#projects lands on the section', async ({ page }) => {
  await page.goto('/#projects', { waitUntil: 'load' });
  // useHashScroll + its ResizeObserver re-issue can take a beat, and #my-taste
  // above it grows when its data lands (B3b).
  await page.waitForTimeout(3000);
  const top = await page.locator('#projects').evaluate((el) => el.getBoundingClientRect().top);
  // Landed near the navbar offset, not behind it and not way past it.
  expect(top).toBeGreaterThan(-5);
  expect(top).toBeLessThan(260);
});
