// #connect guestbook: client-side validation, the optimistic send (the
// confirmation shows before the network resolves — ROADMAP Task 1 revision),
// "send another", and the out-of-band failure toast.
import { test, expect } from './fixtures.js';
import { flowOnly } from './flow-projects.js';
import { gotoSection } from './helpers.js';

flowOnly();

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  await gotoSection(page, 'connect');
  await expect(page.locator('.contact-form')).toBeVisible();
});

// After a send the compose form unmounts and the title becomes the
// confirmation (role="status"). Tests run with prefers-reduced-motion forced
// (fixtures.js), so the heading swaps straight to the sent text — no scramble.
async function expectSentState(page) {
  await expect(page.locator('.contact-form')).toHaveCount(0, { timeout: 12000 });
  await expect(page.locator('.contact-title')).toHaveAttribute('role', 'status');
  await expect(page.locator('.contact-title')).toHaveText(/thank you for reaching out/i, {
    timeout: 12000,
  });
}

test('a valid note shows the confirmation and "send another" resets it', async ({ page }) => {
  await page.fill('#name', 'Casey Recruiter');
  await page.fill('#message', 'Loved the turntable — let’s talk.');
  await page.locator('.jcard-submit').click();

  await expectSentState(page);

  const again = page.locator('.walkman-reset-button');
  await expect(again).toBeVisible({ timeout: 12000 });
  await again.click();
  await expect(page.locator('.contact-form')).toBeVisible();
  await expect(page.locator('.contact-title')).toHaveText(/let.?s connect/i);
});

test('empty name blocks the send and marks the field invalid', async ({ page }) => {
  await page.fill('#message', 'No name provided.');
  await page.locator('.jcard-submit').click();

  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.contact-form')).toBeVisible();
  await expect(page.locator('.contact-title')).toHaveText(/let.?s connect/i);
});

test('a malformed email is rejected', async ({ page }) => {
  await page.fill('#name', 'Pat');
  await page.fill('#email', 'not-an-email');
  await page.fill('#message', 'Hello there.');
  await page.locator('.jcard-submit').click();

  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.contact-form')).toBeVisible();
});

test('a server failure surfaces the error toast (send is still optimistic)', async ({
  page,
  overrides,
  pageErrors,
}) => {
  overrides.contact = 'error';
  await page.fill('#name', 'Jordan');
  await page.fill('#message', 'Testing the failure path.');
  await page.locator('.jcard-submit').click();

  // Optimistic: the sent state still happens...
  await expect(page.locator('.contact-form')).toHaveCount(0, { timeout: 12000 });
  // ...and the failure is reported out of band.
  const toast = page.locator('.contact-error');
  await expect(toast).toBeVisible({ timeout: 12000 });
  await expect(toast).toHaveAttribute('role', 'alert');

  expect(pageErrors, pageErrors.map((e) => e.message).join('\n')).toHaveLength(0);
});
