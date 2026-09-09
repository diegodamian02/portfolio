// The record crate: search -> results -> pick -> the turntable reacts.
// Desktop gets the anchored dropdown; touch/narrow gets the full-screen "dig"
// takeover (with its chevron + Escape dismiss).
import { test, expect } from './fixtures.js';
import { flowOnly } from './flow-projects.js';
import { usesHamburger } from './helpers.js';

flowOnly();

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
});

async function search(page, term) {
  const input = page.locator('.record-crate-input');
  await input.click();
  await input.fill(term);
  await expect(page.locator('.record-crate-card').first()).toBeVisible({ timeout: 8000 });
}

test('search returns results and picking one loads the deck', async ({ page }, testInfo) => {
  await search(page, 'midnight');

  const cards = page.locator('.record-crate-card');
  expect(await cards.count()).toBeGreaterThanOrEqual(1);
  await expect(cards.first()).toContainText(/\w/);

  const deck = page.locator('#home .turntable');
  await expect(deck).toHaveAttribute('data-deck-state', 'EMPTY');

  await cards.first().click();

  // Cross-engine: the deck leaves EMPTY (record dropped / loading / playing).
  await expect(deck).not.toHaveAttribute('data-deck-state', 'EMPTY', { timeout: 10000 });

  // Chromium can actually run the WebAudio graph far enough to reach PLAYING;
  // WebKit/Firefox headless are less reliable without an audio device, so they
  // only get the softer check above.
  if (testInfo.project.name.includes('chromium') || testInfo.project.name === 'desktop-chrome') {
    await expect(deck).toHaveAttribute('data-deck-state', 'PLAYING', { timeout: 15000 });
  }

  // The panel is gone once a pick is made.
  await expect(page.locator('.record-crate-card')).toHaveCount(0, { timeout: 5000 });
});

test('mobile "dig" takeover opens full-screen and dismisses', async ({ page }) => {
  test.skip(!usesHamburger(page), 'the dig takeover is the touch/narrow UI');

  const input = page.locator('.record-crate-input');
  await input.click();
  await input.fill('reptilia');
  await expect(page.locator('.record-crate.is-digging')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.record-crate-card').first()).toBeVisible();

  // Chevron-down closes it (mobile has no "outside" to tap — see FINDINGS D32).
  await page.locator('.record-crate-close').click();
  await expect(page.locator('.record-crate.is-digging')).toBeHidden({ timeout: 8000 });

  // Re-open, this time dismiss with Escape.
  await input.click();
  await input.fill('dreams');
  await expect(page.locator('.record-crate.is-digging')).toBeVisible({ timeout: 8000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.record-crate.is-digging')).toBeHidden({ timeout: 8000 });
});

test('crate error state', async ({ page, overrides }) => {
  overrides.itunes = 'error';
  const input = page.locator('.record-crate-input');
  await input.click();
  await input.fill('anything');
  await expect(page.locator('.record-crate-status-row')).toContainText(/couldn.t reach the crate/i, {
    timeout: 8000,
  });
});

test('crate empty state', async ({ page, overrides }) => {
  overrides.itunes = 'empty';
  const input = page.locator('.record-crate-input');
  await input.click();
  await input.fill('zzzznothing');
  await expect(page.locator('.record-crate-status-row')).toContainText(/nothing in the crate/i, {
    timeout: 8000,
  });
});
