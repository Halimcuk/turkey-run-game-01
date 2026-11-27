// Gobble Dash — entry program (Node 22, standard library only).
//
// It hands the game in: it copies this directory's game/ and screenshots/
// beside itself into the output directory and writes output/dossier.json
// with the vendored make.fun library (vendor/makefun-game.ts, copied
// unchanged from the kit starter).
//
// The output directory is MAKEFUN_OUTPUT_DIR outside the grader and /output
// inside it. The program creates the output directory when it is missing,
// then empties ONLY the contents of that directory, one entry at a time.
// It never removes the output directory itself: in the grader the output
// directory is a mounted folder, and removing it fails with "device or
// resource busy" and aborts the run with exit code 1.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory when it is missing, then clear only its
// contents, one entry at a time — never the directory itself, which the
// grader has bind-mounted.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Gobble Dash handed in to ${out}`);
const gameFiles = readdirSync(join(out, 'game'), { recursive: true }).length;
const shotFiles = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).length
  : 0;
console.log(`game entries: ${gameFiles}, screenshots: ${shotFiles}, dossier: ${join(out, 'dossier.json')}`);
