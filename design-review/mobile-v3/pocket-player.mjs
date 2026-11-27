// Stage 12.3 — does the real turntable actually end up in the sheet, and does
// a crate pick drive it?
//
//   cd client && npm run dev        (or: npx vite --host)
//   node design-review/mobile-v3/pocket-player.mjs
//
// Six checks. The first two are the whole point of the stage — the deck has
// two homes and must be in exactly one of them — and the rest are the wiring
// that only exists on the live site, which /lab/player/ structurally cannot
// test because it has no crate, no Lenis and a stand-in deck.
//
// /api/itunes/search is MOCKED here, the same way client/tests/fixtures.js
// mocks it. The crate is search-driven (there is no hardcoded favourites
// list), so a pick cannot be exercised without it, and hitting Apple from a
// measurement script would make the result depend on the network.
//
// AUDIO IS NOT ASSERTED. There is no audio device in headless Chromium
// (CLAUDE.md, design-review/scratch-tests/README.md), so the deck cannot
// reach DECK.PLAYING here and anything claiming it did would be measuring a
// mock. What IS asserted is everything up to that line: the deck state leaves
// EMPTY, the record visually drops, and the dock appears. Playback on a real
// device is the owner's review and the 12.5 device pass.
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:5173';

const ITUNES = {
    resultCount: 2,
    results: [
        {
            wrapperType: 'track', kind: 'song', trackId: 1001,
            trackName: 'Midnight City', artistName: 'M83',
            collectionName: 'Hurry Up, We’re Dreaming',
            artworkUrl100: 'https://example.test/art100.jpg',
            // artworkUrl60 matters: record-crate.jsx's toTrack() maps it to
            // `artworkThumbUrl`, which is what the dock displays. The first
            // version of this fixture omitted it and check 13 failed against
            // correct code.
            artworkUrl60: 'https://example.test/art60.jpg',
            previewUrl: 'https://example.test/preview.m4a',
            trackViewUrl: 'https://example.test/track',
        },
        {
            wrapperType: 'track', kind: 'song', trackId: 1002,
            trackName: 'Redbone', artistName: 'Childish Gambino',
            collectionName: 'Awaken, My Love!',
            artworkUrl100: 'https://example.test/art100b.jpg',
            artworkUrl60: 'https://example.test/art60b.jpg',
            previewUrl: 'https://example.test/previewb.m4a',
            trackViewUrl: 'https://example.test/trackb',
        },
    ],
};

// A WAV tone, built here rather than committed as a binary fixture: it is
// twelve lines of arithmetic and a reviewer can see exactly what it contains,
// which is not true of a checked-in .wav.
//
// TWELVE SECONDS, mono, 22.05kHz. Long enough that the deck is still PLAYING
// when check 9 presses the dock's transport — the drop choreography alone is
// ~1.6s, and a short tone would have the deck sitting in STOPPED_LOADED by
// then, which is a different branch of handleTransport (replay, not pause).
function makeTone({ seconds = 12, rate = 22050, freq = 220 } = {}) {
    const n = Math.floor(rate * seconds);
    const data = Buffer.alloc(n * 2);
    for (let i = 0; i < n; i++) {
        // Fades in and out so there is no click at either end; irrelevant to
        // what is measured, but it keeps the file honest as an audio file.
        const env = Math.min(1, i / (rate * 0.05), (n - i) / (rate * 0.05));
        data.writeInt16LE(Math.round(12000 * env * Math.sin((2 * Math.PI * freq * i) / rate)), i * 2);
    }
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);      // fmt chunk size
    header.writeUInt16LE(1, 20);       // PCM
    header.writeUInt16LE(1, 22);       // mono
    header.writeUInt32LE(rate, 24);
    header.writeUInt32LE(rate * 2, 28); // byte rate
    header.writeUInt16LE(2, 32);        // block align
    header.writeUInt16LE(16, 34);       // bits per sample
    header.write('data', 36);
    header.writeUInt32LE(data.length, 40);
    return Buffer.concat([header, data]);
}
const TONE = makeTone();

const results = [];
const notes = [];
const record = (name, pass, detail) => {
    results.push({ name, pass });
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}`);
    console.log(`        ${detail}`);
};

const browser = await chromium.launch();
const errors = [];

async function openPage(deviceName) {
    const context = await browser.newContext(
        deviceName ? { ...devices[deviceName] } : { viewport: { width: 1440, height: 900 } },
    );
    // Every /api/* call mocked, so nothing here touches Apple, Spotify or Resend.
    await context.route('**/api/itunes/search**', (r) => r.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify(ITUNES),
    }));
    await context.route('**/api/spotify/**', (r) => r.fulfill({
        status: 200, contentType: 'application/json', body: '[]',
    }));
    // The preview itself: a REAL, DECODABLE WAV tone, not a 404.
    //
    // Two bugs lived here. The first version 404'd the preview, which drove
    // the deck to DECK.ERROR — and an errored deck correctly REFUSES a
    // transport press, so check 9 below could not tell a broken dock
    // registration from a deck behaving exactly as designed. The second
    // registered a specific `/preview**` route and then a catch-all for the
    // same host: Playwright matches routes in REVERSE registration order, so
    // the catch-all won and the preview still 404'd. One handler with a
    // conditional cannot have that bug.
    //
    // decodeAudioData handles WAV natively, and headless Chromium runs an
    // AudioContext fine with no audio device — verified here: the deck reaches
    // PLAYING and then STOPPED_LOADED when the tone ends. It is OUTPUT that
    // does not exist, which is why CLAUDE.md keeps audio tests out of the
    // suite. This script still asserts nothing about what is AUDIBLE, only
    // about the state the deck reports.
    await context.route('https://example.test/**', (route) => {
        if (route.request().url().includes('/preview')) {
            return route.fulfill({ status: 200, contentType: 'audio/wav', body: TONE });
        }
        // Artwork. A 404 is fine and realistic; nothing here asserts on it.
        return route.fulfill({ status: 404, body: '' });
    });

    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`[${deviceName || 'desktop'}] pageerror: ${e.message}`));
    page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const text = m.text();
        // Resource-load failures are not page faults and neither of the two
        // seen here is this stage's doing: the mocked preview URL answers 404
        // by design (there is no audio device in headless anyway), and the
        // desktop NotSameOrigin is pre-existing on `main` — reproduced there
        // before this stage was written. Collected separately so they stay
        // visible without failing the run.
        if (text.includes('Failed to load resource')) {
            notes.push(`[${deviceName || 'desktop'}] ${text}`);
            return;
        }
        errors.push(`[${deviceName || 'desktop'}] console: ${text}`);
    });
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForSelector('.record-crate', { timeout: 30_000 });
    // The intro overlay is what a pointer hits first; every click below would
    // land on it. Same trap that made the first fader measurement read zero.
    await page.waitForFunction(() => {
        const el = document.querySelector('.loading-screen');
        if (!el) return true;
        const cs = getComputedStyle(el);
        return cs.display === 'none' || cs.visibility === 'hidden'
            || Number(cs.opacity) === 0 || cs.pointerEvents === 'none';
    }, null, { timeout: 30_000 });
    return { context, page };
}

const where = (page) => page.evaluate(() => {
    const deck = document.querySelector('.turntable');
    return {
        deckExists: !!deck,
        deckCount: document.querySelectorAll('.turntable').length,
        inHero: !!deck?.closest('.hero-deck-stage'),
        inSheet: !!deck?.closest('.sheet-deck-stage'),
        heroStageExists: !!document.querySelector('.hero-deck-stage'),
        dockExists: !!document.querySelector('.player-dock'),
        sheetExists: !!document.querySelector('.sheet-root'),
        pocketAttr: document.querySelector('.home')?.hasAttribute('data-pocket-player'),
    };
});

console.log('\nStage 12.3 — the real turntable in the Pocket Player\n');

// ---- 1. desktop is untouched ----------------------------------------------
{
    const { context, page } = await openPage(null);
    const w = await where(page);
    const preview = await page.locator('.hero-deck-preview').count();
    record('1  desktop: deck stays in the hero, no dock, no sheet, no preview',
        w.deckCount === 1 && w.inHero && !w.inSheet && !w.dockExists && !w.sheetExists
        && !w.pocketAttr && preview === 0,
        `deckCount=${w.deckCount} inHero=${w.inHero} dock=${w.dockExists} `
        + `sheet=${w.sheetExists} data-pocket-player=${w.pocketAttr} heroPreview=${preview}`);
    await context.close();
}

// ---- 2. phone: the deck is in the sheet, and ONLY there --------------------
const { context, page } = await openPage('Pixel 7');
{
    const w = await where(page);
    // deckCount === 1 is the load-bearing half: two <Turntable> instances
    // would be two GSAP timelines and two sets of deck-state writes racing
    // through one module-level audio engine.
    record('2  phone: exactly one deck, inside the sheet, hero stage gone',
        w.deckCount === 1 && w.inSheet && !w.inHero && !w.heroStageExists
        && w.dockExists && w.sheetExists && w.pocketAttr,
        `deckCount=${w.deckCount} inSheet=${w.inSheet} heroStage=${w.heroStageExists} `
        + `dock=${w.dockExists} data-pocket-player=${w.pocketAttr}`);
}

// ---- 3. the hero's grid has no orphaned deck row ---------------------------
{
    const grid = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.home'));
        return {
            areas: cs.gridTemplateAreas,
            rows: cs.gridTemplateRows.split(' ').length,
            children: [...document.querySelector('.home').children]
                .filter((el) => getComputedStyle(el).gridArea !== 'auto').length,
        };
    });
    record('3  hero grid declares no "deck" area it cannot fill',
        !grid.areas.includes('deck'),
        `grid-template-areas=${grid.areas} (rows=${grid.rows})`);
}

// ---- 4. a crate pick loads the deck and raises the sheet -------------------
{
    const before = await page.evaluate(() => ({
        open: document.querySelector('.sheet-root')?.hasAttribute('data-open'),
    }));

    await page.locator('.record-crate-input, .record-crate input').first().click();
    await page.locator('.record-crate-input, .record-crate input').first().fill('midnight');
    await page.waitForSelector('.record-crate-slot', { timeout: 15_000 });
    await page.locator('.record-crate-slot [role="option"], .record-crate-slot button').first().click();

    // The sheet's rise is 620ms; the drop runs ~1.6s past it.
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => ({
        open: document.querySelector('.sheet-root')?.hasAttribute('data-open'),
        dockShown: document.querySelector('.player-dock')?.hasAttribute('data-shown'),
        title: document.querySelector('.player-dock-title')?.textContent || '',
    }));
    record('4  crate pick raises the sheet with the record loaded',
        before.open !== true && after.open === true,
        `sheet open ${before.open} -> ${after.open}; dock title="${after.title}" `
        + `(dock is hidden while the sheet is up, by design: data-shown=${after.dockShown})`);
}

// ---- 5. the deck left EMPTY and the record actually moved ------------------
{
    const deck = await page.evaluate(() => {
        const wrap = document.querySelector('.vinyl-record-wrap');
        const cs = wrap ? getComputedStyle(wrap) : null;
        return {
            opacity: cs ? Number(cs.opacity) : null,
            transform: cs ? cs.transform : null,
            armRotation: (() => {
                const arm = document.querySelector('.turntable-tonearm-rotor');
                if (!arm) return null;
                const m = new DOMMatrixReadOnly(getComputedStyle(arm).transform);
                return +(Math.atan2(m.b, m.a) * 180 / Math.PI).toFixed(1);
            })(),
        };
    });
    // The record is only visible once the drop has run — it starts at
    // opacity 0, y -260. A non-zero opacity is proof the choreography ran
    // inside the sheet, not merely that the element exists.
    record('5  the record dropped (choreography ran inside the sheet)',
        deck.opacity !== null && deck.opacity > 0.9,
        `record opacity=${deck.opacity}, arm rotation=${deck.armRotation}deg`);
}

// ---- 6. the page behind an open sheet cannot be scrolled -------------------
//
// The one failure the lab cannot see, and the one this script got wrong twice.
//
// WRONG ATTEMPT 1: looked for `data-lenis-stopped`. This Lenis version signals
// a stop with the CLASS `lenis-stopped`, so a correctly stopped instance
// reported false.
//
// WRONG ATTEMPT 2: drove the scroll with window.scrollBy(). Per spec,
// `overflow: hidden` blocks USER scrolling but still permits PROGRAMMATIC
// scrolling — so scrollBy moved the page 400px through a lock that was
// working correctly, and the failure was in the measurement.
//
// A real wheel event is what a visitor produces and what the lock is for, so
// that is what this dispatches, through CDP rather than page.evaluate (a
// synthetic WheelEvent from JS is not trusted and never scrolls anything).
//
// WITH A CONTROL. "The page did not scroll" is worthless on its own: it is
// trivially true if the page is too short, if the wheel never landed, or if
// the sheet never opened. So the identical gesture is measured with the sheet
// SHUT first, and that one has to move the page.
{
    const cdp = await context.newCDPSession(page);
    const wheel = async () => {
        await cdp.send('Input.dispatchMouseEvent', {
            type: 'mouseWheel', x: 200, y: 300, deltaX: 0, deltaY: 400,
        });
        await page.waitForTimeout(400);
    };
    const y = () => page.evaluate(() => Math.round(window.scrollY));

    // --- control: sheet shut, the same wheel must move the page ---
    await page.evaluate(() => {
        document.querySelector('.sheet-scrim')?.dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        );
    });
    await page.waitForTimeout(700);
    const shutBefore = await y();
    await wheel();
    const shutAfter = await y();

    // --- the real case: sheet open, the page must not move ---
    await page.locator('.player-dock-open').click();
    await page.waitForTimeout(800);
    const lenis = await page.evaluate(() => {
        const html = document.documentElement;
        return {
            present: html.classList.contains('lenis'),
            stopped: html.classList.contains('lenis-stopped'),
            rootOverflow: getComputedStyle(html).overflow,
            bodyOverflow: getComputedStyle(document.body).overflow,
            open: !!document.querySelector('.sheet-root')?.hasAttribute('data-open'),
        };
    });
    const openBefore = await y();
    await wheel();
    const openAfter = await y();

    const controlMoved = shutAfter > shutBefore;
    record('6  control: with the sheet SHUT the same wheel scrolls the page',
        controlMoved, `scrollY ${shutBefore} -> ${shutAfter} (want an increase)`);
    record('7  page behind an OPEN sheet does not scroll',
        lenis.open && lenis.stopped && openAfter === openBefore,
        `sheet open=${lenis.open}, lenis stopped=${lenis.stopped}, `
        + `scrollY ${openBefore} -> ${openAfter} (want unchanged); `
        + `overflow root=${lenis.rootOverflow} body=${lenis.bodyOverflow}`);

    // --- and it must come back afterwards ---
    await page.evaluate(() => {
        document.querySelector('.sheet-scrim')?.dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        );
    });
    await page.waitForTimeout(800);
    const restored = await page.evaluate(() => ({
        stopped: document.documentElement.classList.contains('lenis-stopped'),
        rootOverflow: document.documentElement.style.overflow || '(cleared)',
    }));
    const closedBefore = await y();
    await wheel();
    const closedAfter = await y();
    record('8  closing the sheet gives scrolling back',
        !restored.stopped && closedAfter > closedBefore,
        `lenis stopped=${restored.stopped}, inline root overflow=${restored.rootOverflow}, `
        + `scrollY ${closedBefore} -> ${closedAfter} (want an increase)`);
}

// ---- 9. the dock's transport button reaches the REAL deck ------------------
//
// This is the seam lib/deck-controls.js exists for: the dock is portaled to
// <body>, the deck is inside the sheet, and there is no common ancestor to
// thread a ref through. If the registration is broken the button is simply
// inert, which looks like nothing at all going wrong.
//
// Asserted through `data-deck-state` on `.turntable` — written by the deck
// itself from the state applyDeckState set, so it cannot be satisfied by the
// dock being optimistic. The dock is only visible with the sheet SHUT.
{
    const deckState = () => page.evaluate(
        () => document.querySelector('.turntable')?.dataset.deckState ?? null,
    );
    const dockLabel = () => page.evaluate(
        () => document.querySelector('.player-dock-transport')?.getAttribute('aria-label') ?? null,
    );

    const before = await deckState();
    const labelBefore = await dockLabel();
    await page.locator('.player-dock-transport').click();
    await page.waitForTimeout(700);
    const after = await deckState();
    const labelAfter = await dockLabel();

    // NOT asserting a specific destination state. There is no audio device in
    // headless Chromium, so where the deck lands after a press depends on how
    // the audio layer fails, which is not what this check is about. What it
    // asserts is that the press REACHED the deck at all: a dock whose
    // getActiveDeck() returned null would leave deck state untouched.
    record('9  dock transport reaches the deck (deck-controls registration)',
        before !== null && after !== null && after !== before,
        `data-deck-state ${before} -> ${after}; dock aria-label `
        + `"${labelBefore}" -> "${labelAfter}"`);
}

// ---- 10. the navbar is GONE while the sheet is up (D43) --------------------
//
// Rewritten in 12.4. The previous version opened the sheet and then clicked
// the hamburger, to prove a nav tap closed the sheet rather than scrolling a
// hidden page. That test now cannot run, because the thing it was working
// around is fixed: the navbar is hidden while a sheet is open, so there is
// no hamburger to click. The check became an assertion that the bar is NOT
// reachable.
//
// Not merely invisible — OUT OF THE TAB ORDER. `opacity: 0` alone leaves the
// links focusable, so Tab would walk into a bar the dialog declares inert,
// reopening from the other side the exact hole check 12's focus trap closes.
{
    await page.locator('.player-dock-open').click();
    await page.waitForTimeout(900);
    const shut = await page.evaluate(() => {
        const nav = document.querySelector('nav.navbar');
        const cs = getComputedStyle(nav);
        const burger = document.querySelector('.hamburger');
        return {
            sheetOpen: !!document.querySelector('.sheet-root')?.hasAttribute('data-open'),
            attr: document.documentElement.hasAttribute('data-sheet-open'),
            visibility: cs.visibility,
            opacity: Number(cs.opacity),
            // Try to FOCUS it. `offsetParent !== null` was the first probe
            // here and it is wrong: offsetParent is only null for
            // display:none, so a visibility:hidden element reports
            // "reachable" while being entirely unfocusable. Attempting the
            // focus is the only test that answers the question actually
            // being asked.
            burgerReachable: (() => {
                if (!burger) return false;
                const before = document.activeElement;
                burger.focus();
                const got = document.activeElement === burger;
                if (!got && before) before.focus?.();
                return got;
            })(),
            // A later `transition` shorthand at the same specificity REPLACES
            // the earlier one. The first version of this rule silently
            // dropped background-color from the navbar's transition and with
            // it the theme crossfade.
            transition: cs.transitionProperty,
        };
    });
    record('10  navbar hidden AND unfocusable while the sheet is open (D43)',
        shut.sheetOpen && shut.attr && shut.visibility === 'hidden'
        && shut.opacity === 0 && !shut.burgerReachable
        && shut.transition.includes('background-color'),
        `sheetOpen=${shut.sheetOpen}, data-sheet-open=${shut.attr}, `
        + `visibility=${shut.visibility}, opacity=${shut.opacity}, `
        + `hamburger reachable=${shut.burgerReachable}; `
        + `transition-property=[${shut.transition}] (background-color must survive)`);
}

// ---- 11. a programmatic scroll still closes the sheet ----------------------
//
// The belt-and-braces path from 12.3, which outlives the navbar fix: a deep
// link, use-hash-scroll's ResizeObserver re-issue, or anything else calling
// scrollToSection() while a sheet happens to be open. scrollToSection passes
// `force: true` so a stopped Lenis cannot refuse it, which is precisely why
// the sheet has to get out of the way rather than rely on being untappable.
//
// Driven by a hash change rather than a click, since the nav is now hidden.
{
    const before = await page.evaluate(
        () => !!document.querySelector('.sheet-root')?.hasAttribute('data-open'));
    await page.evaluate(() => { window.location.hash = '#experience'; });
    await page.waitForTimeout(2000);
    const after = await page.evaluate(() => ({
        open: !!document.querySelector('.sheet-root')?.hasAttribute('data-open'),
        lenisStopped: document.documentElement.classList.contains('lenis-stopped'),
        navVisible: getComputedStyle(document.querySelector('nav.navbar')).visibility,
        experienceTop: Math.round(
            document.getElementById('experience').getBoundingClientRect().top),
    }));
    record('11  a programmatic scroll closes the sheet and the nav comes back',
        before === true && after.open === false && !after.lenisStopped
        && after.navVisible === 'visible'
        && after.experienceTop > -5 && after.experienceTop < 260,
        `sheet ${before} -> ${after.open}, lenis stopped=${after.lenisStopped}, `
        + `navbar visibility=${after.navVisible}, `
        + `#experience top=${after.experienceTop}px (want -5..260)`);
}

// ---- 12. Tab cannot leave the sheet ----------------------------------------
//
// REAL key presses via page.keyboard, not dispatched KeyboardEvents. A
// synthetic event is untrusted: the handler runs, but the browser performs no
// default action, so focus never moves and the test measures nothing. The
// first version of this check dispatched events, found focus on <body> 14
// times, and reported a failing trap against working code.
//
// And the sheet has to be OPEN — check 11 above closes it.
{
    await page.locator('.player-dock-open').click();
    await page.waitForTimeout(900);
    const openNow = await page.evaluate(
        () => !!document.querySelector('.sheet-root')?.hasAttribute('data-open'));

    const outside = [];
    for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab');
        const where = await page.evaluate(() => {
            const sheet = document.querySelector('.sheet');
            const a = document.activeElement;
            if (!a || a === document.body) return null;          // nowhere, fine
            return sheet.contains(a) || a === sheet
                ? null
                : `${a.tagName}.${(a.className || '').toString().slice(0, 28)}`;
        });
        if (where) outside.push(where);
    }
    record('12  Tab stays inside the sheet (focus trap)',
        openNow && outside.length === 0,
        `sheet open=${openNow}; 14 real Tab presses, ${outside.length} landed outside`
        + (outside.length ? `: ${[...new Set(outside)].slice(0, 4).join(', ')}` : ''));
}

// ---- 13. the dock shows real album art -------------------------------------
{
    await page.evaluate(() => document.querySelector('.sheet-scrim')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(900);
    const art = await page.evaluate(() => {
        const el = document.querySelector('.player-dock-art');
        const cs = getComputedStyle(el);
        return {
            image: cs.backgroundImage,
            inlineImage: el.style.getPropertyValue('--dock-art-image'),
            inlineColor: el.style.getPropertyValue('--dock-art'),
            size: cs.backgroundSize,
        };
    });
    // The mocked artwork URL 404s on purpose, which is the point: the colour
    // layer underneath must still be a real wax colour rather than a hole.
    record('13  dock art layers the artwork over a per-track wax fallback',
        art.inlineImage.startsWith('url(')
        && art.inlineColor.startsWith('var(--wax-')
        && art.image.includes('url(')
        && art.size.includes('cover'),
        `--dock-art-image=${art.inlineImage.slice(0, 48)}…, --dock-art=${art.inlineColor}, `
        + `background-size=${art.size}`);
}

// ---- 14. the hero's standing deck is a PREVIEW, not a second turntable ----
//
// The whole safety argument for putting a deck back in the hero (12.4) is
// that it is the presentational Snow White deck, never a second <Turntable>.
// Two <Turntable> instances would be two GSAP timelines and two sets of
// deck-state writes racing through one module-level audio engine.
//
// `.turntable` must still be exactly 1 — the same invariant check 2 asserts,
// re-asserted here because this is the change most likely to break it.
{
    const hero = await page.evaluate(() => {
        const btn = document.querySelector('.hero-deck-preview');
        return {
            exists: !!btn,
            label: btn?.getAttribute('aria-label') || '',
            loaded: btn?.hasAttribute('data-loaded'),
            swDecks: document.querySelectorAll('.sw-stage').length,
            turntables: document.querySelectorAll('.turntable').length,
            previewHoldsTurntable: !!document.querySelector('.hero-deck-preview .turntable'),
            inPreviewStage: !!document.querySelector('.hero-preview-stage .hero-deck-preview'),
        };
    });
    record('14  hero preview is the Snow White deck, and there is still ONE turntable',
        hero.exists && hero.inPreviewStage && hero.swDecks === 1
        && hero.turntables === 1 && !hero.previewHoldsTurntable && hero.loaded,
        `preview=${hero.exists} inStage=${hero.inPreviewStage} .sw-stage=${hero.swDecks} `
        + `.turntable=${hero.turntables} (want 1) previewHoldsTurntable=`
        + `${hero.previewHoldsTurntable} data-loaded=${hero.loaded} label="${hero.label}"`);
}

// ---- 15. tapping the hero preview opens the sheet -------------------------
{
    const before = await page.evaluate(
        () => !!document.querySelector('.sheet-root')?.hasAttribute('data-open'));
    await page.locator('.hero-deck-preview').click();
    await page.waitForTimeout(900);
    const after = await page.evaluate(
        () => !!document.querySelector('.sheet-root')?.hasAttribute('data-open'));
    record('15  tapping the hero deck opens the sheet',
        before === false && after === true, `sheet ${before} -> ${after}`);
}

// ---- 16. the progress readout actually advances ---------------------------
//
// --progress is written straight to a custom property from a rAF loop, never
// through React state. Sampled twice a second apart: it has to MOVE, and the
// total has to be the decoded buffer's real length rather than a hardcoded 30.
{
    const read = () => page.evaluate(() => {
        const bar = document.querySelector('.np-meta-track');
        const times = [...document.querySelectorAll('.np-meta-times span')]
            .map((el) => el.textContent);
        return {
            progress: Number(bar?.style.getPropertyValue('--progress') || -1),
            elapsed: times[0], total: times[1],
            deck: document.querySelector('.turntable')?.dataset.deckState,
        };
    });
    // The deck is PAUSED here — check 9 pressed transport and nothing resumed
    // it. The progress loop deliberately does not run while paused (a paused
    // deck has not moved), so sampling now would measure the correct
    // behaviour and call it a failure. Resume through the deck's own
    // transport: the sheet is open, so the dock is hidden by design.
    await page.locator('.turntable-start-button').click();
    await page.waitForFunction(
        () => document.querySelector('.turntable')?.dataset.deckState === 'PLAYING',
        null, { timeout: 10_000 },
    );

    const a = await read();
    await page.waitForTimeout(1400);
    const b = await read();
    record('16  the sheet\'s progress readout advances while playing',
        a.progress >= 0 && b.progress > a.progress
        && /^\d:\d\d$/.test(b.total) && b.total !== '0:00',
        `--progress ${a.progress} -> ${b.progress}; `
        + `elapsed ${a.elapsed} -> ${b.elapsed}; total=${b.total} `
        + `(decoded length, not a hardcoded 30); deck=${b.deck}`);
}

await context.close();
await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (notes.length) {
    console.log('ignored (resource loads, not page faults):');
    [...new Set(notes)].forEach((e) => console.log(`  ${e}`));
}
if (errors.length) {
    console.log('page errors:');
    [...new Set(errors)].forEach((e) => console.log(`  ${e}`));
}
process.exitCode = failed.length || errors.length ? 1 : 0;
