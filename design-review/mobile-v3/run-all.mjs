// Runs the four Stage 12.1 measurement scripts in order, same shape as
// design-review/scratch-tests/run-all.mjs.
//
//   cd client && npm run dev     # must be :5173 (CLAUDE.md)
//   node design-review/mobile-v3/run-all.mjs
//
// Contrast first and screenshots last: contrast is instant and catches a
// broken token set before five minutes of browser work, and lab-shots is the
// only one that writes files.
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:5173';
const SUITES = ['contrast.mjs', 'reverse-test.mjs', 'perf-trace.mjs', 'lab-shots.mjs'];

// Prime the dev server before anything is measured.
//
// Vite transforms modules on first request and caches them. A cold server —
// or one that just restarted, which it does every time vite.config.js is
// edited — does that work inside whatever the first suite happens to be
// doing. Observed on exactly that: reverse-test.mjs timed out waiting for the
// probe, and perf-trace.mjs reported single 210-230ms frames in three of four
// cases that were pure transform cost, not the deck. Both came back clean the
// moment the page had been loaded once.
//
// Two fetches rather than one: the first pulls index.html, the second lands
// after the module graph it references has been transformed.
console.log(`priming ${BASE}/lab/deck/ ...`);
for (let i = 0; i < 2; i++) {
    try { await fetch(`${BASE}/lab/deck/`); } catch (e) {
        console.log(`  could not reach the dev server (${e.message}) — is \`npm run dev\` up on :5173?`);
        process.exit(1);
    }
}

let failed = 0;
for (const suite of SUITES) {
    console.log(`\n${'='.repeat(72)}\n  ${suite}\n${'='.repeat(72)}`);
    const r = spawnSync(process.execPath, [path.join(HERE, suite)], { stdio: 'inherit' });
    if (r.status !== 0) { failed += 1; console.log(`  -> ${suite} exited ${r.status}`); }
}
console.log(failed ? `\n${failed}/${SUITES.length} suite(s) failed` : `\nAll ${SUITES.length} suites passed`);
process.exitCode = failed ? 1 : 0;
