// Hands in The Clockwork Vault (Node 22+, standard library only). The game is the static game/
// folder beside this file; this program copies game/ and screenshots/ into the output directory
// and writes dossier.json, the summary the judge reads, with the kit's vendored make.fun library.
//
// The grader runs it with /output; locally, point MAKEFUN_OUTPUT_DIR somewhere else:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// To play: `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(root, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'screenshots'))) {
  cpSync(join(root, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps: at most 4 screenshots of 256 KiB each, 993 game files, 48 MiB of game, paths
// of 1000 bytes, and a 160 KiB source text in the dossier.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`dossier.json written to ${join(outputDir, 'dossier.json')} (${dossier.byteLength} bytes)`);
