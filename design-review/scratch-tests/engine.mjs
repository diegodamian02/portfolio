// Measures the scratch engine against a SYNTHETIC ramp buffer.
//
// The preview is a linear ramp 0 -> 1 over 4s, so the instantaneous output
// value IS the read position: value = TARGET_VOLUME * (position / duration).
// That turns "does it play backwards" from a thing you listen for into a
// number that either falls or doesn't.
import { chromium } from "playwright";

const browser = await chromium.launch({
    headless: process.env.HEADED !== "1",
    args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("  [page error]", m.text()); });
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });

const result = await page.evaluate(async () => {
    const DURATION = 4;
    const RATE = 44100;
    const log = [];

    // --- synthetic WAV: mono, linear ramp ---------------------------------
    const frames = DURATION * RATE;
    const bytes = 44 + frames * 2;
    const buf = new ArrayBuffer(bytes);
    const dv = new DataView(buf);
    const ascii = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    ascii(0, "RIFF"); dv.setUint32(4, bytes - 8, true); ascii(8, "WAVE");
    ascii(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true); dv.setUint32(24, RATE, true);
    dv.setUint32(28, RATE * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    ascii(36, "data"); dv.setUint32(40, frames * 2, true);
    for (let i = 0; i < frames; i++) dv.setInt16(44 + i * 2, Math.round((i / frames) * 32767), true);

    const URL_ = "https://example.test/ramp.wav";
    const realFetch = window.fetch;
    window.fetch = (u, ...rest) =>
        (String(u) === URL_ ? Promise.resolve(new Response(buf)) : realFetch(u, ...rest));

    const audio = await import("/src/lib/turntable-audio.js");
    audio.init();
    await audio.load(URL_);

    const ctxProbe = () => {
        const st = audio.getState();
        return { state: st.contextState };
    };
    const prepared = await audio.prepareScratch(URL_);
    log.push(["worklet prepared", prepared]);

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const an = audio.getAnalyser();
    const td = new Float32Array(an.fftSize);
    // Mean over the analyser window. On a monotonic ramp the mean is the
    // position at the middle of the window, which is all this needs.
    const level = () => { an.getFloatTimeDomainData(td);
        let s = 0; for (let i = 0; i < td.length; i++) s += td[i]; return s / td.length; };

    // Normal playback from the 2s mark, volume forced up so the 0.26s default
    // fade isn't what we end up measuring.
    audio.playCached({ previewUrl: URL_, trackId: "ramp", offset: 2 });
    audio.setVolume(0.65, 0.01);
    await sleep(250);
    const beforeScratch = { level: level(), elapsed: audio.getElapsed() };

    // --- take over --------------------------------------------------------
    const began = audio.beginScratch(1);
    await sleep(120);
    const atHandover = { level: level(), elapsed: audio.getElapsed(), scratching: audio.isScratching() };

    // --- REVERSE ----------------------------------------------------------
    audio.scratchTo(-2);
    await sleep(60);   // let the rate ramp arrive before the first sample
    const revA = { level: level(), elapsed: audio.getElapsed() };
    await sleep(250);
    const revB = { level: level(), elapsed: audio.getElapsed() };

    // --- held still must be SILENT ----------------------------------------
    audio.scratchTo(0);
    await sleep(200);
    const held = { level: level(), elapsed: audio.getElapsed() };

    // --- forward again, fast ----------------------------------------------
    audio.scratchTo(2.5);
    await sleep(60);
    const fwdA = { level: level(), elapsed: audio.getElapsed() };
    await sleep(250);
    const fwdB = { level: level(), elapsed: audio.getElapsed() };

    // --- hand back to the ordinary source ---------------------------------
    audio.scratchTo(1);
    await sleep(60);
    const handbackFrom = audio.getElapsed();
    audio.endScratch({ resume: true });
    await sleep(300);
    const afterHandback = {
        level: level(), elapsed: audio.getElapsed(),
        scratching: audio.isScratching(), isPlaying: audio.getState().isPlaying,
    };

    window.fetch = realFetch;
    const t0 = performance.now();
    await sleep(200);
    return { ctx: ctxProbe(), log, prepared, began, beforeScratch, atHandover, revA, revB, held,
             fwdA, fwdB, handbackFrom, afterHandback };
});

await browser.close();

const r = (n) => Number(n).toFixed(4);
console.log("\n=== scratch engine ===");
console.log("worklet prepared:", result.prepared, " beginScratch:", result.began, " ctx:", JSON.stringify(result.ctx));
console.log("");
console.log("                       analyser level    getElapsed()");
const row = (name, o) => console.log(`  ${name.padEnd(20)} ${r(o.level).padStart(9)}   ${r(o.elapsed).padStart(9)}`);
row("normal playback", result.beforeScratch);
row("scratch handover", result.atHandover);
row("reverse @ -2 (t0)", result.revA);
row("reverse @ -2 (t+250)", result.revB);
row("HELD at rate 0", result.held);
row("forward @ 2.5 (t0)", result.fwdA);
row("forward @ 2.5 (+250)", result.fwdB);
row("after hand-back", result.afterHandback);

console.log("\n=== assertions ===");
const check = (name, ok, detail) => console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
check("worklet loaded + took over", result.prepared && result.began);
check("handover is continuous in position",
    Math.abs(result.atHandover.elapsed - result.beforeScratch.elapsed) < 0.35,
    `${r(result.beforeScratch.elapsed)} -> ${r(result.atHandover.elapsed)}`);
check("REVERSE moves the head backwards",
    result.revB.elapsed < result.revA.elapsed - 0.3,
    `${r(result.revA.elapsed)} -> ${r(result.revB.elapsed)}`);
check("REVERSE renders falling audio",
    result.revB.level < result.revA.level - 0.01,
    `level ${r(result.revA.level)} -> ${r(result.revB.level)}`);
check("holding the record is silent",
    Math.abs(result.held.level) < 0.01, `level ${r(result.held.level)}`);
check("forward again moves the head forward",
    result.fwdB.elapsed > result.fwdA.elapsed + 0.3,
    `${r(result.fwdA.elapsed)} -> ${r(result.fwdB.elapsed)}`);
check("forward renders rising audio",
    result.fwdB.level > result.fwdA.level + 0.01,
    `level ${r(result.fwdA.level)} -> ${r(result.fwdB.level)}`);
check("hand-back resumes the ordinary source",
    !result.afterHandback.scratching && result.afterHandback.isPlaying);
check("hand-back keeps the position",
    Math.abs(result.afterHandback.elapsed - result.handbackFrom) < 0.4,
    `${r(result.handbackFrom)} -> ${r(result.afterHandback.elapsed)}`);
