import { mkdirSync, writeFileSync } from 'node:fs';
import { NPCS } from '../src/data/npcs';
import { MEMBERS } from '../src/data/members';
import { OUTFITS } from '../src/core/spriteFrames';
import { ENEMY_SPRITES } from './sprites/enemies';
import { SPRITES_DIR, TILES_DIR, buildEnemySheet, buildItemSheets, buildNpcSheet, buildObjectSheets, buildPlayerSheet, buildTileset, buildUiSheets, enemySheetFile, npcSheetFile, playerSheetFile } from './build-sprites-lib';

mkdirSync(SPRITES_DIR, { recursive: true });
mkdirSync(TILES_DIR, { recursive: true });
const jobs: [string, () => { width: number; height: number; png: Uint8Array }][] = [
  // 멤버 5인 × 의상 5벌(training = player_<m>.png, 나머지 = player_<m>_<outfit>.png)
  ...MEMBERS.flatMap((m) => OUTFITS.map((o): [string, () => ReturnType<typeof buildPlayerSheet>] => [playerSheetFile(m.id, o), () => buildPlayerSheet(m.id, o)])),
  // 시트 생성은 데이터(ENEMIES)가 아니라 템플릿 목록(ENEMY_SPRITES) 기준이다 — 데이터가 없어도 PNG가 나온다.
  ...Object.keys(ENEMY_SPRITES).map((id): [string, () => ReturnType<typeof buildEnemySheet>] => [enemySheetFile(id), () => buildEnemySheet(id)]),
  ...NPCS.map((n): [string, () => ReturnType<typeof buildNpcSheet>] => [npcSheetFile(n.id), () => buildNpcSheet(n.id)]),
];
for (const [out, build] of jobs) {
  const sheet = build();
  writeFileSync(out, sheet.png);
  console.log(`${out} (${sheet.width}x${sheet.height}, ${sheet.png.length} bytes)`);
}
const tilesets = (['stage1', 'stage2', 'stage3', 'stage4', 'stage5'] as const).map((p) => buildTileset(p));
for (const sheet of [...buildItemSheets(), ...buildUiSheets(), ...buildObjectSheets(), ...tilesets]) {
  writeFileSync(sheet.file, sheet.png);
  console.log(`${sheet.file} (${sheet.width}x${sheet.height}, ${sheet.png.length} bytes)`);
}
