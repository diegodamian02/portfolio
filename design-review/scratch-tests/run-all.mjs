// Runs every scratch suite and tallies. Requires the dev server on 5173.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const suites = ["engine", "gesture", "mobile", "states", "multitouch", "reduced"];

try {
    const res = await fetch("http://localhost:5173/");
    if (!res.ok) throw new Error(String(res.status));
} catch {
    console.error("Dev server is not on http://localhost:5173 — run `cd client && npm run dev` first.");
    process.exit(1);
}

let pass = 0, fail = 0;
for (const name of suites) {
    process.stdout.write(`\n── ${name}\n`);
    const out = await new Promise((resolve) => {
        let buf = "";
        // Headed, always: a headless AudioContext reports "running" but never
        // renders, so every measurement comes back frozen. See README.
        const p = spawn(process.execPath, [join(here, `${name}.mjs`)], { env: { ...process.env, HEADED: "1" } });
        p.stdout.on("data", (d) => { buf += d; });
        p.stderr.on("data", (d) => { buf += d; });
        p.on("close", () => resolve(buf));
    });
    const p = (out.match(/ {2}PASS/g) || []).length;
    const f = (out.match(/ {2}FAIL/g) || []).length;
    pass += p; fail += f;
    console.log(`   ${p} pass, ${f} fail`);
    if (f) console.log(out.split("\n").filter((l) => l.includes("  FAIL")).join("\n"));
    if (!p && !f) console.log(out.trim().split("\n").slice(-6).join("\n"));
    await new Promise((r) => setTimeout(r, 2000)); // let the browser fully release
}
console.log(`\n════════ TOTAL: ${pass} pass, ${fail} fail ════════`);
process.exit(fail ? 1 : 0);
