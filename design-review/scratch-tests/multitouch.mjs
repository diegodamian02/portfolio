// Interrupting a live scratch. You cannot click a button with a mouse that is
// already holding a drag, so the only genuinely reachable paths are a SECOND
// FINGER on a touch device, and the keyboard. Both are tested here.
import { chromium, devices } from "playwright";
const RATE=44100, DURATION=20;
function wav(){const f=DURATION*RATE,b=Buffer.alloc(44+f*2);b.write("RIFF",0);b.writeUInt32LE(44+f*2-8,4);b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(RATE,24);b.writeUInt32LE(RATE*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(f*2,40);for(let i=0;i<f;i++)b.writeInt16LE(Math.round(i/f*32767),44+i*2);return b;}

const browser = await chromium.launch({ headless:false, args:["--autoplay-policy=no-user-gesture-required","--mute-audio"] });
const context = await browser.newContext({ ...devices["iPhone 13"], hasTouch:true, isMobile:true });
const page = await context.newPage();
const errors=[]; page.on("pageerror",e=>errors.push(e.message));
await page.route("**/api/itunes/search**",(r,req)=>{
    const t=new URL(req.url()).searchParams.get("term");
    r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({results:[{
        trackId:t==="two"?222:111, trackName:t==="two"?"Two":"One", artistName:"S", artworkUrl100:"",
        previewUrl:`https://audio.test/${t}.wav`, collectionName:"T", trackTimeMillis:DURATION*1000}]})});
});
await page.route("https://audio.test/*.wav",(r)=>r.fulfill({status:200,contentType:"audio/wav",body:wav()}));
await page.route("**/api/telemetry/**",(r)=>r.fulfill({status:204,body:""}));
await page.goto("http://localhost:5173/",{waitUntil:"load"});

const cdp = await context.newCDPSession(page);
const send = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });

async function pick(t){
    await page.fill(".record-crate input", t);
    await page.waitForSelector(".record-crate-list li",{timeout:8000});
    await page.locator(".record-crate-list li").first().click();
}
const st = () => page.evaluate(() => ({
    deck: document.querySelector(".turntable").dataset.deckState,
    scratching: window.__skylineDebug.audioState.scratching,
    trackId: window.__skylineDebug.audioState.trackId,
    elapsed: window.__skylineDebug.audioState.elapsed,
}));

await pick("one");
await page.waitForFunction(()=>document.querySelector(".turntable")?.dataset.deckState==="PLAYING",null,{timeout:15000});
await page.waitForTimeout(1200);

// CDP's synthetic touch scrolls the page (it does not consult touch-action),
// so every block re-homes the viewport and re-measures. A box cached from an
// earlier block points at wherever the platter USED to be.
let at, P1;
async function reacquire() {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(350);
    const b = await page.locator(".turntable-platter").boundingBox();
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2, r = b.width * 0.35;
    at = (d) => ({ x: cx + r * Math.cos(d * Math.PI / 180), y: cy + r * Math.sin(d * Math.PI / 180) });
    P1 = (d) => ({ ...at(d), id: 1 });
}
await reacquire();

const check=(n,ok,dd)=>console.log(`  ${ok?"PASS":"FAIL"}  ${n}${dd?" — "+dd:""}`);
const f=(n)=>Number(n).toFixed(3);
console.log("\n=== interrupting a live scratch ===\n");

// --- second finger taps the TRANSPORT button mid-scratch ----------------
const btn = await page.locator(".turntable-start-button").boundingBox();
const b2 = { x: btn.x + btn.width/2, y: btn.y + btn.height/2, id: 2 };

await send("touchStart", [P1(0)]);
for (let d=-8; d>=-70; d-=8) await send("touchMove",[P1(d)]);
const live = await st();

await send("touchStart", [P1(-70), b2]);          // finger 2 lands on transport
await send("touchEnd",   [P1(-70)]);              // finger 2 lifts (finger 1 stays)
await page.waitForTimeout(150);
const afterTap = await st();

for (let d=-78; d>=-140; d-=8) await send("touchMove",[P1(d)]);
const stillGoing = await st();
await send("touchEnd", []);
await page.waitForTimeout(1400);
const settled = await st();

check("gesture is live before the interruption", live.scratching);
check("a transport tap mid-scratch does NOT pause the deck",
      afterTap.scratching && afterTap.deck === "PLAYING", `deck=${afterTap.deck} scratching=${afterTap.scratching}`);
check("the scratch keeps working after the tap",
      Math.abs(stillGoing.elapsed - afterTap.elapsed) > 0.1,
      `${f(afterTap.elapsed)} -> ${f(stillGoing.elapsed)}`);
check("the deck settles coherently", settled.deck === "PLAYING" && !settled.scratching, settled.deck);

// --- keyboard transport (Space on the focused button) mid-scratch -------
await reacquire();
await page.evaluate(() => document.querySelector(".turntable-start-button").focus());
await send("touchStart", [P1(0)]);
for (let d=-8; d>=-60; d-=8) await send("touchMove",[P1(d)]);
await page.keyboard.press("Space");
await page.waitForTimeout(150);
const afterKey = await st();
await send("touchEnd", []);
await page.waitForTimeout(1400);
const afterKeySettled = await st();
check("Space on the focused transport is ignored mid-scratch",
      afterKey.scratching && afterKey.deck === "PLAYING", `deck=${afterKey.deck}`);
check("deck settles coherently after that too",
      afterKeySettled.deck === "PLAYING" && !afterKeySettled.scratching);

// --- is a track swap mid-scratch reachable at all? ----------------------
// record-crate.jsx's outside-click handler is named handlePointerDown but is
// bound to "mousedown" (record-crate.jsx:158), and a touch drag produces no
// mousedown — so on touch the crate panel stays OPEN underneath a live
// scratch. Recorded as measured rather than assumed: it means a second finger
// can in principle reach a record while finger 1 is on the platter, which is
// why abortScratchGesture() is called from the choreography effect. The tap
// itself could not be driven here (Chrome does not synthesise a click for a
// touch that is part of a multi-touch sequence), so that exact path is
// unverified end to end; the abort it would take is the same one the tab-blur
// case below exercises.
await reacquire();
await page.fill(".record-crate input", "two");
await page.waitForSelector(".record-crate-list li", { timeout: 8000 });
const panelBefore = await page.locator(".record-crate-list li").count();
await send("touchStart", [P1(0)]);
for (let d = -8; d >= -40; d -= 8) await send("touchMove", [P1(d)]);
await page.waitForTimeout(150);
const panelDuring = await page.locator(".record-crate-list li").count();
await send("touchEnd", []);
await page.waitForTimeout(1400);
check("the crate panel survives a touch scratch (mousedown-bound handler)",
      panelBefore > 0 && panelDuring > 0, `${panelBefore} before, ${panelDuring} during`);

// --- the abort path that IS reachable: the tab going away ---------------
await reacquire();
await send("touchStart", [P1(0)]);
for (let d = -8; d >= -60; d -= 8) await send("touchMove", [P1(d)]);
const beforeHide = await st();
await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
});
await page.waitForTimeout(600);
const hidden = await st();
await send("touchEnd", []);
await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
});
await page.waitForTimeout(1200);
const backAgain = await st();
check("gesture was live before the tab hid", beforeHide.scratching);
check("hiding the tab aborts the gesture", !hidden.scratching, `deck=${hidden.deck}`);
check("...and leaves the deck paused, not stuck", hidden.deck === "PAUSED", hidden.deck);
check("the deck is still usable after coming back",
      backAgain.deck === "PAUSED" && !backAgain.scratching, `deck=${backAgain.deck}`);

check("no page errors", errors.length === 0, errors.slice(0,2).join(" | "));
await browser.close();
