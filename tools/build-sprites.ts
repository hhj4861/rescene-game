import { mkdirSync, writeFileSync } from 'node:fs';
import { MEMBERS } from '../src/data/members';
import { SPRITES_DIR, buildPlayerSheet, playerSheetFile } from './build-sprites-lib';

mkdirSync(SPRITES_DIR, { recursive: true });
for (const m of MEMBERS) {
  const sheet = buildPlayerSheet(m.id);
  const out = playerSheetFile(m.id);
  writeFileSync(out, sheet.png);
  console.log(`${m.id} -> ${out} (${sheet.width}x${sheet.height}, ${sheet.png.length} bytes)`);
}
