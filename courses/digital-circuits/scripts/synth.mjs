#!/usr/bin/env node
/**
 * Builds the synth toolchain (Weft compiler, simulator and iCE40 flow) to WebAssembly from the commit pinned
 * in synth.json, and puts it in static/synth/, where the site and the tests load it.
 *
 *   npm run synth                    clone the pinned commit into .cache/ (once) and build it
 *   SYNTH_DIR=../../../synth npm run synth    build a local checkout instead (any commit)
 *   npm run synth -- --check         exit 1 if static/synth/ is missing or not the pinned commit
 *
 * Needs Rust with the wasm32-unknown-unknown target (rustup target add wasm32-unknown-unknown) and git.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pin = JSON.parse(readFileSync(join(root, 'synth.json'), 'utf8'));
const out = join(root, 'static', 'synth');
const stamp = join(out, 'VERSION');

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`synth: \`${cmd} ${args.join(' ')}\` failed`);
    process.exit(r.status ?? 1);
  }
}

function capture(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

if (process.argv.includes('--check')) {
  const have = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : null;
  if (!existsSync(join(out, pin.wasm)) || have === null) {
    console.error('synth: static/synth/ is missing; run `npm run synth` (needs Rust and the wasm32-unknown-unknown target)');
    process.exit(1);
  }
  if (have !== pin.commit && !have.endsWith('+local')) {
    console.error(`synth: static/synth/ is synth ${have.slice(0, 12)}, synth.json pins ${pin.commit.slice(0, 12)}; run \`npm run synth\``);
    process.exit(1);
  }
  process.exit(0);
}

let dir = process.env.SYNTH_DIR ? resolve(process.env.SYNTH_DIR) : null;
let version = pin.commit;
if (dir) {
  const head = capture('git', ['rev-parse', 'HEAD'], dir);
  const dirty = capture('git', ['status', '--porcelain'], dir);
  version = `${head ?? 'unknown'}${head === pin.commit && !dirty ? '' : '+local'}`;
} else {
  dir = join(root, '.cache', `synth-${pin.commit.slice(0, 12)}`);
  if (!existsSync(join(dir, 'Cargo.toml'))) {
    mkdirSync(dir, { recursive: true });
    run('git', ['init', '-q'], dir);
    run('git', ['remote', 'add', 'origin', pin.repo], dir);
    run('git', ['fetch', '-q', '--depth', '1', 'origin', pin.commit], dir);
    run('git', ['checkout', '-q', 'FETCH_HEAD'], dir);
  }
}

if (existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === version && !version.endsWith('+local') && existsSync(join(out, pin.wasm))) {
  console.log(`synth: static/synth/ is already synth ${version.slice(0, 12)}`);
  process.exit(0);
}

console.log(`synth: building ${pin.crate} at ${version.slice(0, 12)} for WebAssembly`);
run('cargo', ['build', '--release', '--locked', '--target', 'wasm32-unknown-unknown', '-p', pin.crate,
  '--config', 'profile.release.debug=false', '--config', 'profile.release.strip=true'], dir);
mkdirSync(out, { recursive: true });
copyFileSync(join(dir, 'target', 'wasm32-unknown-unknown', 'release', pin.wasm), join(out, pin.wasm));
writeFileSync(stamp, `${version}\n`);
console.log(`synth: static/synth/${pin.wasm} (${(readFileSync(join(out, pin.wasm)).length / 1e6).toFixed(1)} MB)`);
