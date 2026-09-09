// Interaction-flow specs (crate / my-taste / connect) are behaviour tests, not
// layout tests — one representative device per class is enough, and running
// them on all 15 projects would triple CI time for little added signal.
// Smoke / navigation / responsive still cover every project.
import { test } from './fixtures.js';

export const FLOW_PROJECTS = new Set([
  'desktop-chrome',
  'desktop-firefox',
  'desktop-safari',
  'iphone-14', // WebKit phone ≈ mobile Safari
  'iphone-chromium', // touch paths WebKit can't drive
  'ipad-portrait', // WebKit tablet
  'pixel-7', // Chromium ≈ Android Chrome
  'galaxy-s24', // small modern Android
]);

export function flowOnly() {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      !FLOW_PROJECTS.has(testInfo.project.name),
      'flow spec runs on a representative device subset',
    );
  });
}
