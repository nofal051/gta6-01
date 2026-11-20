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
// identical output. The second run proves the first was deterministic.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// This file's own directory is the repository root.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy one tree into the output, creating the destination first so a
// second run over an existing directory still lands cleanly.
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(out, { recursive: true });
copyTree(join(here, 'game'), join(out, 'game'));
copyTree(join(here, 'screenshots'), join(out, 'screenshots'));

// A quick sanity count before the dossier is built: the scorer refuses
// more than four screenshots, so a stray fifth file fails loudly here
// instead of silently in grading.
const shotNames = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((n) => !n.startsWith('.'))
  : [];
if (shotNames.length > 4) {
  throw new Error(`too many screenshots: ${shotNames.length} (max 4)`);
}

// The caps match the scorer's own gate (reference/gate.json). Only
// text_max_bytes changes the dossier bytes; the rest refuse an entry
// the scorer would refuse anyway: more than 4 screenshots or one over
// 256 KiB, more than 993 files in game/ or 48 MiB of game files in all,
// or a path under game/ longer than 1000 bytes. game/ shares /output's
// own 1000-entry cap with screenshots/ and dossier.json, so the counts
// here leave room for all three.
const dossierPath = join(out, 'dossier.json');
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// The grader runs this program twice and demands byte-identical
// output. A run that wrote nothing, or a dossier past the 1.5 MiB
// ceiling, is a broken entry, so fail loudly here instead of handing
// the grader an empty or oversized file.
if (!dossier || dossier.length === 0) {
  throw new Error('buildDossier returned an empty dossier');
}
writeFileSync(dossierPath, dossier);
if (dossier.length > 1572864) {
  throw new Error(`dossier too large: ${dossier.length} bytes (max 1572864)`);
}
