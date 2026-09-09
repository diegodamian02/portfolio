// #my-taste against the mocked Spotify data: the wall + setlist render, links
// point at real Spotify URLs, and the failure/empty states degrade cleanly
// without taking the page down (B56 — a SplitText/React insertBefore race that
// blanked the whole app; reproduced by toggling theme while this section is in
// view).
import { test, expect } from './fixtures.js';
import { flowOnly } from './flow-projects.js';
import { gotoSection, usesHamburger } from './helpers.js';

flowOnly();

async function toggleTheme(page) {
  if (usesHamburger(page)) {
    await page.locator('.hamburger').click();
    await page.locator('.navbar-mobile .theme-toggle').click();
    await page.keyboard.press('Escape');
  } else {
    await page.locator('.navbar-right .theme-toggle').click();
  }
}

test('renders the wall, the setlist, and real Spotify links', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await gotoSection(page, 'my-taste');

  await expect(page.locator('.my-taste-featured-name')).toHaveCount(2);
  await expect(page.locator('.my-taste-secondary-name')).toHaveCount(3);
  await expect(page.locator('.my-taste-setlist-item')).toHaveCount(5);
  await expect(page.locator('.my-taste-featured-name').first()).toHaveText('Tame Impala');

  const artistLink = page.locator('a.my-taste-card-link').first();
  await expect(artistLink).toHaveAttribute('href', /open\.spotify\.com\/artist\//);
  await expect(page.locator('a.my-taste-setlist-link').first()).toHaveAttribute(
    'href',
    /open\.spotify\.com\/track\//,
  );
});

test('theme toggle in #my-taste does not blank the page (B56)', async ({ page, pageErrors }) => {
  await page.goto('/', { waitUntil: 'load' });
  await gotoSection(page, 'my-taste');
  await expect(page.locator('.my-taste-featured-name').first()).toBeVisible();

  await toggleTheme(page);
  await page.waitForTimeout(600);
  await toggleTheme(page);
  await page.waitForTimeout(600);

  expect(pageErrors, pageErrors.map((e) => e.message).join('\n')).toHaveLength(0);
  await expect(page.locator('.my-taste-heading')).toBeVisible();
  await expect(page.locator('#home .turntable')).toBeVisible(); // app still mounted
});

test('Spotify failure shows the "taking a nap" state, page intact', async ({
  page,
  overrides,
  pageErrors,
}) => {
  overrides.spotify = 'error';
  await page.goto('/', { waitUntil: 'load' });
  await gotoSection(page, 'my-taste');

  await expect(page.locator('.my-taste-status').first()).toContainText(/taking a nap/i, {
    timeout: 8000,
  });
  await toggleTheme(page);
  await page.waitForTimeout(500);
  expect(pageErrors, pageErrors.map((e) => e.message).join('\n')).toHaveLength(0);
});

test('empty Spotify data shows the "nothing here yet" state', async ({ page, overrides }) => {
  overrides.spotify = 'empty';
  await page.goto('/', { waitUntil: 'load' });
  await gotoSection(page, 'my-taste');
  await expect(page.locator('.my-taste-status').first()).toContainText(/nothing here yet/i, {
    timeout: 8000,
  });
});
