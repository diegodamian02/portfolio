// Stage 12.1 — the Snow White accent's contrast, in both themes.
//
//   cd client && npm run dev
//   node design-review/mobile-v3/contrast.mjs
//
// Every ratio is computed from values READ BACK OUT OF THE RENDERED DOM
// (getComputedStyle on the live custom properties, resolved against the real
// painted backgrounds), never from the hexes written in main.scss and never
// sampled off a screenshot. CLAUDE.md's standing rule, and the reason B1/B2
// were found at all: a token can be correct in source and still land on the
// wrong background at runtime.
//
// 4.5:1 is the bar the brief sets, i.e. the WCAG AA floor for body text. Note
// where that does and does not bite: the accent is a TEXT colour in the
// Pocket Player's dock (track title, timecode) but only a surface colour on
// the deck itself (the headshell), where 3:1 is the real floor. Both are
// reported; the 4.5 verdict is applied to the text cases.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
await page.goto(`${BASE}/lab/deck/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__deckLab, null, { timeout: 45_000 });

const out = {};
for (const theme of ['dark', 'light']) {
    await page.evaluate((t) => window.__deckLab.setTheme(t), theme);
    await page.waitForTimeout(350);

    out[theme] = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const tok = (n) => root.getPropertyValue(n).trim();

        // Resolve through the browser rather than parsing hex/rgb()/
        // color-mix() by hand: a probe element is painted with the value and
        // its COMPUTED colour is read back, so color-mix(), currentColor and
        // any other function all resolve the way the page actually paints
        // them. Parsing the token string would quietly mis-handle exactly the
        // values most likely to be wrong.
        const probe = document.createElement('span');
        probe.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(probe);
        const rgb = (value) => {
            probe.style.color = '';
            probe.style.color = value;
            const m = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
            return [m[0], m[1], m[2]];
        };

        const lin = (c) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const ratio = (a, b) => {
            const [x, y] = [L(rgb(a)), L(rgb(b))].sort((p, q) => q - p);
            return +((x + 0.05) / (y + 0.05)).toFixed(2);
        };

        const accent = tok('--deck-sw-accent');
        const pairs = {
            'accent on page bg':      [accent, tok('--bg-color')],
            'accent on body (light stop)': [accent, tok('--deck-sw-body-hi')],
            'accent on body (dark stop)':  [accent, tok('--deck-sw-body-lo')],
            'headshell on body (dark stop)': [tok('--deck-sw-head'), tok('--deck-sw-body-lo')],
            'ribs hi vs lo':          [tok('--deck-sw-rib-hi'), tok('--deck-sw-rib-lo')],
            'body (light stop) vs page bg': [tok('--deck-sw-body-hi'), tok('--bg-color')],
            'edge vs body (dark stop)': [tok('--deck-sw-edge'), tok('--deck-sw-body-lo')],
        };
        const res = {};
        for (const [name, [a, b]] of Object.entries(pairs)) {
            res[name] = { ratio: ratio(a, b), a: tok ? a : a, b };
        }
        probe.remove();
        return { accent, res };
    });
}

await browser.close();

// Which rows are TEXT uses (4.5 floor) and which are surface/edge separation
// (3:1 is the UI-component floor; the rest are reported for the record).
const TEXT_ROWS = new Set([
    'accent on page bg',
    'accent on body (light stop)',
    'accent on body (dark stop)',
]);

let fails = 0;
for (const [theme, data] of Object.entries(out)) {
    console.log(`\n${theme === 'dark' ? 'Graphite (dark)' : 'Studio Paper (light)'} — accent ${data.accent}`);
    console.log('  pair                              ratio   floor  verdict');
    for (const [name, r] of Object.entries(data.res)) {
        const isText = TEXT_ROWS.has(name);
        const floor = isText ? 4.5 : 3;
        const ok = r.ratio >= floor;
        if (isText && !ok) fails += 1;
        console.log(
            `  ${name.padEnd(32)}${String(r.ratio).padStart(5)}  ${String(floor).padStart(5)}  ` +
            `${ok ? 'pass' : (isText ? 'FAIL' : 'below (non-text)')}`,
        );
    }
}
console.log(fails ? `\n${fails} TEXT pair(s) under 4.5:1` : '\nEvery text pair clears 4.5:1');
process.exitCode = fails ? 1 : 0;
