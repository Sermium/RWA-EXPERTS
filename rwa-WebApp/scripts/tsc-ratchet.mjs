// Type-check ratchet: runs `tsc --noEmit` and fails if the number of errors
// is higher than the committed baseline in .tsc-baseline. The existing errors
// are tolerated while they get fixed; new ones are blocked.
//
//   node scripts/tsc-ratchet.mjs           check against the baseline
//   node scripts/tsc-ratchet.mjs --update  lower the baseline to the current count
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineFile = path.join(root, '.tsc-baseline');
const tscBin = createRequire(import.meta.url).resolve('typescript/bin/tsc');

const result = spawnSync(process.execPath, [tscBin, '--noEmit', '--pretty', 'false', '--incremental', 'false'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (result.error) throw result.error;

const output = `${result.stdout}${result.stderr}`;
const errors = output.split(/\r?\n/).filter((line) => /error TS\d+:/.test(line));
const count = errors.length;

if (count === 0 && result.status !== 0) {
  console.error(output);
  console.error('tsc failed without reporting any TS errors; see output above.');
  process.exit(1);
}

const baseline = Number.parseInt(readFileSync(baselineFile, 'utf8').trim(), 10);
if (!Number.isFinite(baseline)) {
  console.error(`Could not read a number from ${baselineFile}`);
  process.exit(1);
}

if (process.argv.includes('--update')) {
  if (count > baseline) {
    console.error(`Refusing to raise the baseline from ${baseline} to ${count}. Fix the new errors instead.`);
    process.exit(1);
  }
  writeFileSync(baselineFile, `${count}\n`);
  console.log(`Baseline set to ${count} (was ${baseline}).`);
  process.exit(0);
}

console.log(`TypeScript errors: ${count} (baseline ${baseline})`);
if (count > baseline) {
  console.error(errors.join('\n'));
  console.error(`\n${count - baseline} new TypeScript error(s) above the baseline of ${baseline}. Fix them before merging.`);
  process.exit(1);
}
if (count < baseline) {
  console.log(`Nice: ${baseline - count} fewer than the baseline. Lock it in with "npm run typecheck:ratchet -- --update".`);
}
