// The state interactions: cueing a PAUSED deck, transport pressed mid-gesture,
// a track swap mid-gesture, and transport still working afterwards.
import { chromium } from "playwright";
const RATE=44100, DURATION=20;
function wav(){const f=DURATION*RATE,b=Buffer.alloc(44+f*2);b.write("RIFF",0);b.writeUInt32LE(44+f*2-8,4);b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(RATE,24);b.writeUInt32LE(RATE*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(f*2,40);for(let i=0;i<f;i++)b.writeInt16LE(Math.round(i/f*32767),44+i*2);return b;}

const browser = await chromium.launch({ headless:false, args:["--autoplay-policy=no-user-gesture-required","--mute-audio"] });
const page = await browser.newPage({ viewport:{width:1440,height:900} });
const errors=[]; page.on("pageerror",e=>errors.push(e.message));
let term = "one";
await page.route("**/api/itunes/search**",(r,req)=>{
    const t = new URL(req.url()).searchParams.get("term");
    r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({results:[{
        trackId: t==="two"?222:111, trackName:t==="two"?"Two":"One", artistName:"S",
        artworkUrl100:"", previewUrl:`https://audio.test/${t}.wav`, collectionName:"T",
        trackTimeMillis:DURATION*1000}]})});
});
await page.route("https://audio.test/*.wav",(r)=>r.fulfill({status:200,contentType:"audio/wav",body:wav()}));
await page.route("**/api/telemetry/**",(r)=>r.fulfill({status:204,body:""}));
await page.goto("http://localhost:5173/",{waitUntil:"load"});

async function pick(t){
    await page.fill(".record-crate input", t);
    await page.waitForSelector(".record-crate-list li",{timeout:8000});
    await page.locator(".record-crate-list li").first().click();
}
const st = () => page.evaluate(() => ({
    deck: document.querySelector(".turntable").dataset.deckState,
    scratching: window.__skylineDebug.audioState.scratching,
    elapsed: window.__skylineDebug.audioState.elapsed,
    skyline: document.querySelector(".hero-skyline-canvas")?.dataset.skylineState,
    level: (()=>{ const an=window.__skylineDebug.analyser, td=new Float32Array(an.fftSize);
        an.getFloatTimeDomainData(td); let s=0; for(let i=0;i<td.length;i++) s+=td[i]; return s/td.length; })(),
}));

await pick("one");
await page.waitForFunction(()=>document.querySelector(".turntable")?.dataset.deckState==="PLAYING",null,{timeout:15000});
await page.waitForTimeout(1200);

const box = await page.locator(".turntable-platter").boundingBox();
const cx=box.x+box.width/2, cy=box.y+box.height/2, r=box.width*0.35;
const at=(d)=>({x:cx+r*Math.cos(d*Math.PI/180), y:cy+r*Math.sin(d*Math.PI/180)});
const sweep = async (from,to,step=8)=>{ const dir=Math.sign(to-from);
    for(let d=from; dir>0?d<=to:d>=to; d+=dir*step){ await page.mouse.move(at(d).x,at(d).y); await page.waitForTimeout(10);} };

const check=(n,ok,d)=>console.log(`  ${ok?"PASS":"FAIL"}  ${n}${d?" — "+d:""}`);
const f=(n)=>Number(n).toFixed(3);
console.log("\n=== state interactions ===\n");

// --- 1. PAUSE, then CUE the stopped record ------------------------------
await page.click(".turntable-start-button");
await page.waitForTimeout(1400);
const paused = await st();
console.log(`  paused: deck=${paused.deck} level=${f(paused.level)} skyline=${paused.skyline}`);

await page.mouse.move(at(0).x, at(0).y);
await page.mouse.down();
await page.waitForTimeout(60);
await sweep(0, 120);
const cueing = await st();
await page.waitForTimeout(200);
const cueHeld = await st();
await page.mouse.up();
await page.waitForTimeout(1200);
const afterCue = await st();
console.log(`  cueing: deck=${cueing.deck} level=${f(cueing.level)} skyline=${cueing.skyline}`);
console.log(`  after release: deck=${afterCue.deck} level=${f(afterCue.level)}\n`);

check("a PAUSED deck can still be cued by hand", cueing.scratching);
check("cueing makes sound on a stopped deck", Math.abs(cueing.level) > 0.005, `level ${f(cueing.level)}`);
check("cueing moves the groove", Math.abs(cueing.elapsed - paused.elapsed) > 0.2,
      `${f(paused.elapsed)} -> ${f(cueing.elapsed)}`);
check("the skyline lights up for a cue", cueing.skyline === "playing");
check("holding the cue still is silent", Math.abs(cueHeld.level) < 0.01, `level ${f(cueHeld.level)}`);
check("releasing a cue returns to PAUSED", afterCue.deck === "PAUSED" && !afterCue.scratching, afterCue.deck);
check("...and to silence", Math.abs(afterCue.level) < 0.01, `level ${f(afterCue.level)}`);

// --- 2. transport still works after a cue -------------------------------
await page.click(".turntable-start-button");
await page.waitForTimeout(1600);
const resumed = await st();
check("transport resumes from the cued position", resumed.deck === "PLAYING" && resumed.elapsed > afterCue.elapsed,
      `${f(afterCue.elapsed)} -> ${f(resumed.elapsed)}`);

// Interrupting a live gesture (transport mid-scratch, track swap mid-scratch)
// is NOT testable here: you cannot click a button with the same mouse that is
// already holding the drag — Playwright's click issues its own mouse.up, which
// just ends the gesture. Those paths moved to scratch-multitouch-test.mjs,
// which uses a genuine second finger and the keyboard.

check("no page errors", errors.length === 0, errors.slice(0,2).join(" | "));
await browser.close();
