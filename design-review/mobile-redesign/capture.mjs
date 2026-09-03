/**
 * Renders each *.dc.html mockup in this folder to a PNG in
 * design-review/screenshots/mobile-redesign/ — for the no-repo-access
 * design-research chat, and as a visual check of the seeded canvas.
 *
 *   node design-review/mobile-redesign/capture.mjs
 *
 * Strips the Design-Components wrappers (<x-dc>, <helmet>, support.js) and
 * renders the plain markup + styles at each artboard's canvas.json size.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'screenshots', 'mobile-redesign');
fs.mkdirSync(OUT, { recursive: true });

const canvas = JSON.parse(fs.readFileSync(path.join(HERE, 'canvas.json'), 'utf8'));
const sizeOf = Object.fromEntries(canvas.artboards.map((a) => [a.file, a]));

function toPlainHtml(src) {
  const helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
  let body = (src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/) || [, ''])[1];
  if (!body) body = (src.match(/<x-dc>([\s\S]*?)<\/x-dc>/) || [, ''])[1];
  return `<!doctype html><html><head><meta charset="utf-8">${helmet}</head><body>${body}</body></html>`;
}

const browser = await chromium.launch();
const files = fs.readdirSync(HERE).filter((f) => f.endsWith('.dc.html')).sort();

for (const file of files) {
  const meta = sizeOf[file] || { w: 390, h: 900 };
  const ctx = await browser.newContext({
    viewport: { width: Math.round(meta.w), height: Math.round(meta.h) },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.setContent(toPlainHtml(fs.readFileSync(path.join(HERE, file), 'utf8')), { waitUntil: 'load' });
  await page.waitForTimeout(500); // webfonts
  const name = file.replace('.dc.html', '') .replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const out = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: out, fullPage: true });
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log(`${file.padEnd(28)} frame h=${String(meta.h).padStart(5)}  content=${h}`);
  await ctx.close();
}

await browser.close();
