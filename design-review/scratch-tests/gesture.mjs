// Drives the REAL page: crate click -> choreography -> needle contact -> a
// synthetic pointer scratch on the platter. Search and preview are stubbed so
// the track is a linear ramp and the read position is directly measurable.
import { chromium } from "playwright";

const RATE = 44100, DURATION = 8;
function rampWav() {
    const frames = DURATION * RATE, bytes = 44 + frames * 2;
    const buf = Buffer.alloc(bytes);
    buf.write("RIFF", 0); buf.writeUInt32LE(bytes - 8, 4); buf.write("WAVE", 8);
    buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22); buf.writeUInt32LE(RATE, 24);
    buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
    buf.write("data", 36); buf.writeUInt32LE(frames * 2, 40);
    for (let i = 0; i < frames; i++) buf.writeInt16LE(Math.round((i / frames) * 32767), 44 + i * 2);
    return buf;
}

const browser = await chromium.launch({
    headless: false,
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.route("**/api/itunes/search**", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ results: [{
        trackId: 424242, trackName: "Ramp Test", artistName: "Synthetic",
        artworkUrl100: "", previewUrl: "https://audio.test/ramp.wav",
        collectionName: "Test", trackTimeMillis: DURATION * 1000,
    }] }),
}));
await page.route("https://audio.test/ramp.wav", (route) =>
    route.fulfill({ status: 200, contentType: "audio/wav", body: rampWav() }));
await page.route("**/api/telemetry/**", (route) => route.fulfill({ status: 204, body: "" }));

await page.goto("http://localhost:5173/", { waitUntil: "load" });

// --- pick a record, through the real crate ------------------------------
await page.fill(".record-crate-input, input[type='search'], .record-crate input", "ramp");
await page.waitForSelector(".record-crate-list li[role='option'], .record-crate-list button", { timeout: 8000 });
await page.locator(".record-crate-list li").first().click();

await page.waitForFunction(
    () => document.querySelector(".turntable")?.dataset.deckState === "PLAYING",
    null, { timeout: 15000 });
await page.waitForTimeout(900); // let prepareScratch's 400ms defer land

// Read through the app's OWN module instance via __skylineDebug — a bare
// dynamic import of the same path hands back a second, uninitialised copy
// (skyline-background.jsx's own comment documents this).
const probe = await page.evaluate(() => {
    const spin = document.querySelector(".turntable-platter-spin");
    const dbg = window.__skylineDebug;
    window.__probe = {
        rot: () => {
            const m = new DOMMatrixReadOnly(getComputedStyle(spin).transform);
            return Math.atan2(m.b, m.a) * 180 / Math.PI;
        },
        // On the ramp preview the rendered level IS the read position:
        // level = TARGET_VOLUME * position / duration. Measures what is
        // actually audible rather than what the bookkeeping believes.
        level: () => {
            const an = dbg.analyser;
            const td = new Float32Array(an.fftSize);
            an.getFloatTimeDomainData(td);
            let s = 0; for (let i = 0; i < td.length; i++) s += td[i];
            return s / td.length;
        },
        canvas: document.querySelector(".hero-skyline-canvas"),
    };
    return { hasDebug: !!dbg, state: dbg && dbg.audioState };
});

const platter = page.locator(".turntable-platter");
const box = await platter.boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
const r = box.width * 0.34;
const at = (deg) => ({ x: cx + r * Math.cos(deg * Math.PI / 180), y: cy + r * Math.sin(deg * Math.PI / 180) });

const sample = () => page.evaluate(() => ({
    elapsed: window.__skylineDebug.audioState.elapsed,
    scratching: window.__skylineDebug.audioState.scratching,
    level: window.__probe.level(),
    rotation: window.__probe.rot(),
    deck: document.querySelector(".turntable").dataset.deckState,
    scratchAttr: document.querySelector(".turntable").hasAttribute("data-scratching"),
    skyline: window.__probe.canvas?.dataset.skylineState,
}));

const before = await sample();

// --- the gesture: grab, drag BACKWARDS through 150deg --------------------
await page.mouse.move(at(0).x, at(0).y);
await page.mouse.down();
const onGrab = await sample();

for (let d = -6; d >= -150; d -= 6) {           // negative = counter-clockwise
    const p = at(d);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(11);              // ~90Hz, a realistic pointer rate
}
const duringReverse = await sample();

// --- hold still: must fall silent ---------------------------------------
await page.waitForTimeout(220);
const held = await sample();

// --- drag FORWARD fast ---------------------------------------------------
for (let d = -144; d <= 40; d += 8) {
    const p = at(d);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(9);
}
const duringForward = await sample();

await page.mouse.up();
const onRelease = await sample();
await page.waitForTimeout(900);                 // recovery ramp + hand-back
const afterRecovery = await sample();
await page.waitForTimeout(600);
const settled = await sample();

await browser.close();

const f = (n) => Number(n).toFixed(3);
console.log("\n=== gesture layer (real page) ===");
console.log("debug hook:", probe.hasDebug, " state:", JSON.stringify(probe.state));
console.log("\n                     elapsed     level   rotation   scratching  deck       skyline");
const row = (n, o) => console.log(`  ${n.padEnd(18)} ${f(o.elapsed).padStart(7)} ${f(o.level).padStart(9)} ${f(o.rotation).padStart(9)}   ${String(o.scratching).padEnd(10)} ${String(o.deck).padEnd(10)} ${o.skyline}`);
row("before grab", before);
row("on grab", onGrab);
row("dragged back", duringReverse);
row("held still", held);
row("dragged forward", duringForward);
row("on release", onRelease);
row("after recovery", afterRecovery);
row("settled", settled);

console.log("\n=== assertions ===");
const check = (n, ok, d) => console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
check("gesture engaged the scratch engine", onGrab.scratching);
check("data-scratching set during the gesture", onGrab.scratchAttr && duringReverse.scratchAttr);
check("dragging BACK rewinds the track",
    duringReverse.elapsed < before.elapsed, `${f(before.elapsed)} -> ${f(duringReverse.elapsed)}`);
check("...and the AUDIBLE signal rewinds with it",
    duringReverse.level < before.level, `level ${f(before.level)} -> ${f(duringReverse.level)}`);
check("holding the record still goes silent",
    Math.abs(held.level) < 0.01, `level ${f(held.level)}`);
// atan2 on the computed matrix wraps to (-180, 180], and the platter is
// grabbed at an arbitrary point in a continuous rotation, so a raw
// less-than crosses the seam roughly half the time. Compare the SHORTEST
// signed difference instead — the sweep is 150deg, well inside +/-180.
const signedDelta = (a, b) => { let d = b - a; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
const backDelta = signedDelta(onGrab.rotation, duringReverse.rotation);
check("dragging back rotates the platter counter-clockwise",
    backDelta < -100, `${f(backDelta)}deg (swept -150)`);
check("dragging FORWARD advances the track again",
    duringForward.elapsed > duringReverse.elapsed, `${f(duringReverse.elapsed)} -> ${f(duringForward.elapsed)}`);
check("deck stays PLAYING throughout", duringForward.deck === "PLAYING");
check("skyline stays live during the scratch", duringForward.skyline === "playing");
check("release hands back to the ordinary source", !afterRecovery.scratching);
check("data-scratching cleared after release", !afterRecovery.scratchAttr);
check("playback continues after the scratch",
    settled.elapsed > afterRecovery.elapsed, `${f(afterRecovery.elapsed)} -> ${f(settled.elapsed)}`);
check("platter is turning again after recovery",
    Math.abs(settled.rotation - afterRecovery.rotation) > 1, `rotation moved ${f(Math.abs(settled.rotation - afterRecovery.rotation))}deg`);
check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
