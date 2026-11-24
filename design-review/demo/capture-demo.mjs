/**
 * Captures the raw footage for the 15s LinkedIn demo clip.
 *
 *   cd client && VITE_API_BASE_URL=http://localhost:5050 npm run dev   # server on :5050, client on :5173
 *   node design-review/demo/capture-demo.mjs
 *
 * Output:
 *   design-review/demo/raw/<hash>.webm   — one continuous recording (no audio; Playwright video never has any)
 *   design-review/demo/raw/marks.json    — { label, t } beat markers in ms from first frame, for build-demo.sh to cut on
 *
 * Why local API (VITE_API_BASE_URL override): client/.env points at
 * https://api.diegodamian.com. For a deterministic capture we want the crate
 * search + everything else on the local Express (server/.env has the keys),
 * and the contact POST is route-mocked below so no real email is sent even
 * though it would otherwise hit local Resend.
 *
 * Port 5173 matters — the local server's CORS allowlist permits localhost:5173
 * and nothing else (see server/server.js DEFAULT_ALLOWED_ORIGINS).
 *
 * The clip's three beats (see design-review/demo/ notes):
 *   1  cold open mid-type on the "be different" intro -> hero settles   (light)
 *   2  record crate loads "Last Train to London", platter spins up      (light)
 *   3  scroll -> light->dark toggle -> Connect -> message -> send        (dark)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:5173/';
const RAW = path.join(HERE, 'raw');

// Beat durations in ms. The capture is deliberately loose — build-demo.sh cuts
// the final 5.0 / 5.0 / 5.0 windows out of this footage — so each phase carries
// a bit of head/tail margin.
const T = {
    beat1Hold: 6800, // intro (~2.6s) + hero settle + margin for a 5s beat-1 window
    crateType: 'Last Train to London',
    crateTypeDelay: 60,
    beforeFlip: 350, // after picking the record, before the light->dark flip (dropdown closes)
    skylineHold: 3400, // hold once the spectrum skyline is actually up (on dark)
    skylineTimeout: 14000, // deck usually reaches PLAYING in ~2-4s; wait it out under load
    atConnectPause: 500, // settle at "Let's Connect!" before the message
    scrollCapture: 1700, // Lenis nav-scroll past About/Experience (a fast pass)
    msgText: "Let's build something great.",
    msgDelay: 46,
    msgHold: 700, // show the finished message sitting in the cassette before it ships
    afterSend: 2100, // cassette -> walkman takeover; inject the card as ALL DONE lands (before the reset button)
    cardHold: 3400, // end card on screen
};

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });

const browser = await chromium.launch({
    args: [
        '--autoplay-policy=no-user-gesture-required', // deck reaches PLAYING without a gesture-gated stall
        '--mute-audio', // belt-and-suspenders: the ELO preview must never be audible (video has no audio track anyway)
        '--force-color-profile=srgb',
        '--hide-scrollbars',
    ],
});

const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // render at 2x so the 1080p capture is supersampled -> crisper text/edges
    reducedMotion: 'no-preference', // intro + section entrance animations are all gated on this
    colorScheme: 'no-preference',
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
});

// Seed the light theme before first paint so beat 1 opens light with no dark
// flash. navbar.jsx reads localStorage.getItem("theme") || "dark" on mount;
// setting data-theme too covers the gap before React mounts.
await context.addInitScript(() => {
    try {
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
    } catch {
        /* private-mode / storage disabled — the attribute alone still holds */
    }
});

const page = await context.newPage();

// No real contact email. The POST is fire-and-forget in connect.jsx (the
// takeover animation runs regardless), so a 200 keeps the console clean.
await page.route('**/api/contact', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
);

const marks = [];
let t0 = 0;
const mark = (label) => {
    const t = t0 ? Date.now() - t0 : 0;
    marks.push({ label, t });
    console.log(`  [${String(t).padStart(6)}ms] ${label}`);
};

async function clickThemeToggle() {
    // Two .theme-toggle nodes exist (desktop bar + mobile menu); the desktop
    // one is the visible one at this viewport.
    const toggle = page.locator('.navbar .theme-toggle, header .theme-toggle, .theme-toggle').first();
    await toggle.click({ timeout: 5000 });
}

async function openCrateAndSelect() {
    const input = page.locator('.record-crate-input');
    await input.click({ timeout: 8000 });
    await input.pressSequentially(T.crateType, { delay: T.crateTypeDelay });

    // Wait for a result card. Prefer the exact ELO title; fall back to the first.
    const wanted = page.locator('.record-crate-card', { hasText: 'Last Train to London' }).first();
    const anyCard = page.locator('.record-crate-card').first();
    try {
        await wanted.waitFor({ state: 'visible', timeout: 8000 });
        await page.waitForTimeout(600); // let the result list settle / entrance finish
        await wanted.click();
        mark('crate:selected(exact)');
    } catch {
        await anyCard.waitFor({ state: 'visible', timeout: 8000 });
        await page.waitForTimeout(600);
        await anyCard.click();
        mark('crate:selected(fallback-first)');
    }
}

async function fillAndSend() {
    // Name is required client-side (nameEmpty || emailInvalid || messageEmpty
    // rejects with a shake). Fill it instantly, off the eye-line; the message
    // is what visibly "gets written".
    await page.fill('.jcard-name-input', 'Hiring team');
    const msg = page.locator('.jcard-textarea');
    await msg.click();
    await msg.pressSequentially(T.msgText, { delay: T.msgDelay });
    await page.waitForTimeout(T.msgHold);
    await page.locator('.jcard-submit').click();
}

try {
    t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'load' });
    mark('goto:load');

    // ---- Beat 1 — cold open on the intro, hero settles (LIGHT) ----
    await page.waitForTimeout(T.beat1Hold);
    mark('cut1');

    // ---- Beat 2 — crate loads the record, then the world goes DARK to play it ----
    await openCrateAndSelect();          // still light: open, type, pick the ELO row
    await page.waitForTimeout(T.beforeFlip);
    await clickThemeToggle();             // "play a song" -> light->dark view transition
    mark('beat2:dark');
    // The spectrum skyline only reveals once the deck actually reaches PLAYING,
    // which waits on the iTunes preview buffering — slow and variable. Wait for
    // the canvas to report it rather than guessing a fixed delay.
    try {
        await page.waitForSelector('canvas.hero-skyline-canvas[data-skyline-state="playing"]', {
            timeout: T.skylineTimeout,
        });
        mark('beat2:skyline');
    } catch {
        mark('beat2:skyline(TIMEOUT — no skyline)');
    }
    await page.waitForTimeout(T.skylineHold); // hold on the dark spinning record + skyline
    mark('cut2');

    // ---- Beat 3 — scroll to Connect -> message -> walkman "ship it" (already DARK) ----
    await page.evaluate(() => document.querySelector('a[href="#connect"]')?.click());
    await page.waitForTimeout(T.scrollCapture);
    mark('beat3:atConnect');
    await page.waitForTimeout(T.atConnectPause);

    await fillAndSend();
    mark('beat3:sent');
    await page.waitForTimeout(T.afterSend);

    // End card — injected into the page so it's captured natively with the
    // real Urbanist face (this ffmpeg build has no drawtext). A near-solid
    // outro panel that dissolves up over the walkman, so the takeover's
    // "send another message" reset button never shows.
    await page.evaluate(() => {
        const el = document.createElement('div');
        el.id = '__demo_endcard';
        el.innerHTML =
            '<div class="__ec-inner">' +
            '<div class="__ec-name">Diego Damian</div>' +
            '<div class="__ec-url">diegodamian.com</div>' +
            '</div>';
        const s = document.createElement('style');
        s.textContent = `
            #__demo_endcard{position:fixed;inset:0;z-index:99999;pointer-events:none;
              display:flex;align-items:center;justify-content:center;
              background:radial-gradient(120% 120% at 50% 45%,#111521 0%,#0a0d16 70%);
              opacity:0;transition:opacity .75s ease}
            #__demo_endcard.__in{opacity:1}
            #__demo_endcard .__ec-inner{text-align:center;
              font-family:'Urbanist',system-ui,sans-serif;color:#fff;
              transform:translateY(18px);opacity:0;
              transition:transform .8s cubic-bezier(.2,.7,.2,1) .12s,opacity .8s ease .12s}
            #__demo_endcard.__in .__ec-inner{transform:none;opacity:1}
            #__demo_endcard .__ec-name{font-size:64px;font-weight:600;letter-spacing:.004em;line-height:1.05}
            #__demo_endcard .__ec-url{margin-top:26px;font-size:27px;font-weight:500;
              letter-spacing:.02em;color:#e0a15e;
              padding-bottom:8px;border-bottom:2px solid rgba(224,161,94,.5);display:inline-block}`;
        document.head.appendChild(s);
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('__in')));
    });
    mark('beat3:endcard');
    await page.waitForTimeout(T.cardHold);
    mark('end');
} catch (err) {
    console.error('\nCapture failed:', err.message);
    marks.push({ label: 'ERROR', t: t0 ? Date.now() - t0 : 0, error: err.message });
} finally {
    await context.close(); // finalizes the .webm
    await browser.close();

    const video = fs.readdirSync(RAW).find((f) => f.endsWith('.webm'));
    fs.writeFileSync(path.join(RAW, 'marks.json'), JSON.stringify({ video, marks }, null, 2));
    console.log(`\nRaw footage:  ${path.join(RAW, video || '(none)')}`);
    console.log(`Beat marks:   ${path.join(RAW, 'marks.json')}`);
}
