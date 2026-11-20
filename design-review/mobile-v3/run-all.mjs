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
const SUITES = ['contrast.mjs', 'reverse-test.mjs', 'perf-trace.mjs', 'lab-shots.mjs'];

let failed = 0;
for (const suite of SUITES) {
    console.log(`\n${'='.repeat(72)}\n  ${suite}\n${'='.repeat(72)}`);
    const r = spawnSync(process.execPath, [path.join(HERE, suite)], { stdio: 'inherit' });
    if (r.status !== 0) { failed += 1; console.log(`  -> ${suite} exited ${r.status}`); }
}
console.log(failed ? `\n${failed}/${SUITES.length} suite(s) failed` : `\nAll ${SUITES.length} suites passed`);
process.exitCode = failed ? 1 : 0;
