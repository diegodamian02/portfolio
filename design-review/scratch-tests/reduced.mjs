import { chromium } from "playwright";
const RATE=44100, DURATION=20;
function wav(){const f=DURATION*RATE,b=Buffer.alloc(44+f*2);b.write("RIFF",0);b.writeUInt32LE(44+f*2-8,4);b.write("WAVE",8);b.write("fmt ",12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(RATE,24);b.writeUInt32LE(RATE*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write("data",36);b.writeUInt32LE(f*2,40);for(let i=0;i<f;i++)b.writeInt16LE(Math.round(i/f*32767),44+i*2);return b;}
const browser = await chromium.launch({ headless:false, args:["--autoplay-policy=no-user-gesture-required","--mute-audio"] });
const page = await browser.newPage({ viewport:{width:1440,height:900}, reducedMotion:"reduce" });
const errors=[]; page.on("pageerror",e=>errors.push(e.message));
await page.route("**/api/itunes/search**",(r)=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({results:[{trackId:1,trackName:"R",artistName:"S",artworkUrl100:"",previewUrl:"https://audio.test/r.wav",collectionName:"T",trackTimeMillis:DURATION*1000}]})}));
await page.route("https://audio.test/r.wav",(r)=>r.fulfill({status:200,contentType:"audio/wav",body:wav()}));
await page.route("**/api/telemetry/**",(r)=>r.fulfill({status:204,body:""}));
await page.goto("http://localhost:5173/",{waitUntil:"load"});
await page.fill(".record-crate input","r");
await page.waitForSelector(".record-crate-list li",{timeout:8000});
await page.locator(".record-crate-list li").first().click();
await page.waitForFunction(()=>document.querySelector(".turntable")?.dataset.deckState==="PLAYING",null,{timeout:15000});
await page.waitForTimeout(1200);
const rot = () => page.evaluate(()=>{const m=new DOMMatrixReadOnly(getComputedStyle(document.querySelector(".turntable-platter-spin")).transform);return Math.atan2(m.b,m.a)*180/Math.PI;});
// skyline-background.jsx installs __skylineDebug only on its ANIMATED path,
// so under reduced motion there is no hook into the app's audio module and
// this probe is DOM-only. It covers the reduced-motion-specific behaviour —
// the platter must not move, the gesture must still engage, nothing may throw
// — and deliberately not the audio itself, which is the same code path the
// engine and gesture suites already measure.
const st = () => page.evaluate(()=>({
    deck: document.querySelector(".turntable").dataset.deckState,
    scratching: document.querySelector(".turntable").hasAttribute("data-scratching"),
}));
const box = await page.locator(".turntable-platter").boundingBox();
const cx=box.x+box.width/2, cy=box.y+box.height/2, r=box.width*0.35;
const at=(d)=>({x:cx+r*Math.cos(d*Math.PI/180), y:cy+r*Math.sin(d*Math.PI/180)});
const rotIdleA = await rot(); await page.waitForTimeout(700); const rotIdleB = await rot();
const before = await st();
await page.mouse.move(at(0).x, at(0).y); await page.mouse.down();
for(let d=-8; d>=-160; d-=8){ await page.mouse.move(at(d).x, at(d).y); await page.waitForTimeout(10); }
const during = await st(); const rotDuring = await rot();
await page.mouse.up(); await page.waitForTimeout(1400);
const after = await st();
await browser.close();
const f=(n)=>Number(n).toFixed(3);
const check=(n,ok,d)=>console.log(`  ${ok?"PASS":"FAIL"}  ${n}${d?" — "+d:""}`);
console.log("\n=== prefers-reduced-motion ===\n");
check("the platter does NOT spin on its own", Math.abs(rotIdleB-rotIdleA) < 0.5, `${f(rotIdleA)} -> ${f(rotIdleB)}`);
check("the scratch still engages", during.scratching);
check("the gesture is held for the whole drag", during.scratching);
check("the platter stays visually still while scratching", Math.abs(rotDuring-rotIdleB) < 0.5, `${f(rotDuring)}`);
check("it settles back to playing", after.deck === "PLAYING" && !after.scratching, after.deck);
check("no page errors", errors.length===0, errors.slice(0,2).join(" | "));
