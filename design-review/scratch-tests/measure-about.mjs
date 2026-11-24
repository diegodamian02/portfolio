import { chromium } from 'playwright';

const viewports = [
  { name: 'small Android', width: 360, height: 740 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone SE (tall URL bar hidden)', width: 375, height: 812 },
  { name: 'iPhone 14/17 Pro-ish', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'iPad portrait', width: 768, height: 1024 },
  { name: 'iPad Air portrait', width: 820, height: 1180 },
  { name: 'iPad Pro 11 portrait', width: 834, height: 1194 },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    const about = document.querySelector('#about');
    const rect = about.getBoundingClientRect();
    const cs = getComputedStyle(about);
    const navbarHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;
    const scrollOffset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scroll-offset')) || 0;
    const bio = document.querySelector('.about-me-bio');
    return {
      sectionHeight: rect.height,
      cssMinHeight: cs.minHeight,
      scrollMarginTop: cs.scrollMarginTop,
      innerHeight: window.innerHeight,
      navbarHeight,
      scrollOffset,
      bioLines: bio ? Math.round(bio.getBoundingClientRect().height / parseFloat(getComputedStyle(bio).lineHeight)) : null,
    };
  });

  const budget = data.innerHeight - data.scrollOffset;
  const fill = data.sectionHeight / budget;
  const overflowPx = data.sectionHeight - budget;
  console.log(`${vp.name} (${vp.width}x${vp.height}): section=${data.sectionHeight.toFixed(1)}px cssMinHeight=${data.cssMinHeight} scrollMarginTop=${data.scrollMarginTop} navbarHeight=${data.navbarHeight} scrollOffset=${data.scrollOffset} budget=${budget.toFixed(1)}px fill=${fill.toFixed(3)} overflow=${overflowPx.toFixed(1)}px bioLines=${data.bioLines}`);
  await page.close();
}
await browser.close();
