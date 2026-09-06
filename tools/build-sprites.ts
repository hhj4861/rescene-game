import { mkdirSync, writeFileSync } from 'node:fs';
import { NPCS } from '../src/data/chapters/index';
import { ENEMIES } from '../src/data/enemies';
import { MEMBERS } from '../src/data/members';
import { SPRITES_DIR, buildEnemySheet, buildItemSheets, buildNpcSheet, buildPlayerSheet, buildUiSheets, enemySheetFile, npcSheetFile, playerSheetFile } from './build-sprites-lib';

mkdirSync(SPRITES_DIR, { recursive: true });
const jobs: [string, () => { width: number; height: number; png: Uint8Array }][] = [
  ...MEMBERS.map((m): [string, () => ReturnType<typeof buildPlayerSheet>] => [playerSheetFile(m.id), () => buildPlayerSheet(m.id)]),
  ...ENEMIES.map((e): [string, () => ReturnType<typeof buildEnemySheet>] => [enemySheetFile(e.id), () => buildEnemySheet(e.id)]),
  ...NPCS.map((n): [string, () => ReturnType<typeof buildNpcSheet>] => [npcSheetFile(n.id), () => buildNpcSheet(n.id)]),
];
for (const [out, build] of jobs) {
  const sheet = build();
  writeFileSync(out, sheet.png);
  console.log(`${out} (${sheet.width}x${sheet.height}, ${sheet.png.length} bytes)`);
}
for (const sheet of [...buildItemSheets(), ...buildUiSheets()]) {
  writeFileSync(sheet.file, sheet.png);
  console.log(`${sheet.file} (${sheet.width}x${sheet.height}, ${sheet.png.length} bytes)`);
}
