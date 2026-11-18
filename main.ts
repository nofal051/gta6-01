// Solmar Bay — the gta6-01 entry program. Node 22, standard library only.
//
// The game is plain static files under game/: game/index.html plus its
// ES modules, no library, no build step, no network request. This
// program is what hands the entry in. It copies game/ and screenshots/
// from beside this file into /output and writes /output/dossier.json
// using the vendored make.fun library.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for
// /output, so a local check looks like this:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice into two directories: both runs must write byte-for-byte
// identical output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// This file's own directory is the repository root.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps match the scorer's own gate (reference/gate.json). Only
// text_max_bytes changes the dossier bytes; the rest refuse an entry
// the scorer would refuse anyway: more than 4 screenshots or one over
// 256 KiB, more than 993 files in game/ or 48 MiB of game files in all,
// or a path under game/ longer than 1000 bytes. game/ shares /output's
// own 1000-entry cap with screenshots/ and dossier.json, so the counts
// here leave room for all three.
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
