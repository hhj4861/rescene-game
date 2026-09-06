import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { pasteGrid, shiftGrid } from '../tools/pixel-art';
import { buildEnemySheet, buildNpcSheet, buildObjectSheets, enemySheetFile, npcSheetFile } from '../tools/build-sprites-lib';
import { buildPlayerSheet } from '../tools/build-sprites-lib';
import { ENEMIES } from '../src/data/enemies';
import { NPCS } from '../src/data/npcs';
import { ENEMY_SPRITES } from '../tools/sprites/enemies';
import { ENEMY_ANIMS, ENEMY_FRAME_COUNT, NPC_ANIMS, NPC_FRAME, NPC_FRAME_COUNT, PLAYER_FRAME } from '../src/core/spriteFrames';

const frameOf = (sheet: { width: number; height: number; rgba: Uint8Array }, fw: number, i: number): string => {
  const out: number[] = [];
  for (let y = 0; y < sheet.height; y++) out.push(...sheet.rgba.slice((y * sheet.width + i * fw) * 4, (y * sheet.width + (i + 1) * fw) * 4));
  return out.join(',');
};
const bottomOpaque = (sheet: { width: number; height: number; rgba: Uint8Array }, fw: number, i: number): number => {
  let n = 0;
  const y = sheet.height - 1;
  for (let x = i * fw; x < (i + 1) * fw; x++) if (sheet.rgba[(y * sheet.width + x) * 4 + 3]! > 0) n++;
  return n;
};

describe('grid helpers', () => {
  it('pasteGrid draws a sub grid at an offset, skipping transparent cells and clipping', () => {
    const base = ['....', '....', '....'];
    const sub = ['AB', '.C'];
    expect(pasteGrid(base, sub, 1, 1)).toEqual(['....', '.AB.', '..C.']);
    expect(pasteGrid(base, sub, 3, 2)).toEqual(['....', '....', '...A']);
  });
  it('shiftGrid moves cells horizontally and fills with transparent', () => {
    expect(shiftGrid(['AB.', 'C..'], 1)).toEqual(['.AB', '.C.']);
    expect(shiftGrid(['AB.', 'C..'], -1)).toEqual(['B..', '...']);
  });
});

describe('enemy sprite sheets', () => {
  it('animation indices cover the frame count', () => {
    const all = Object.values(ENEMY_ANIMS).flatMap((a) => [...a.frames]).sort((x, y) => x - y);
    expect(all).toEqual([...Array(ENEMY_FRAME_COUNT).keys()]);
  });
  // (a) 시트 생성은 데이터가 아니라 템플릿 목록(ENEMY_SPRITES) 기준이다 — ENEMIES에 없는 적도 PNG가 나와야 한다.
  it('every template builds a sheet sized by its own width/height and matches its generated file', () => {
    for (const id of Object.keys(ENEMY_SPRITES)) {
      const art = ENEMY_SPRITES[id]!;
      const sheet = buildEnemySheet(id);
      expect(sheet.width, id).toBe(art.width * ENEMY_FRAME_COUNT);
      expect(sheet.height, id).toBe(art.height);
      expect(bottomOpaque(sheet, art.width, 0), `${id} feet`).toBeGreaterThan(0);
      expect(frameOf(sheet, art.width, ENEMY_ANIMS.idle.frames[0]), `${id} idle`).not.toBe(frameOf(sheet, art.width, ENEMY_ANIMS.idle.frames[1]));
      expect(frameOf(sheet, art.width, ENEMY_ANIMS.move.frames[0]), `${id} move`).not.toBe(frameOf(sheet, art.width, ENEMY_ANIMS.move.frames[1]));
      const file = enemySheetFile(id);
      expect(existsSync(file), file).toBe(true);
      expect(Buffer.compare(readFileSync(file), Buffer.from(sheet.png)), id).toBe(0);
    }
  });
  // (b) 데이터(ENEMIES)의 모든 적에는 같은 크기의 템플릿이 있어야 한다(이 worktree엔 P1의 신규 적 데이터가 없을 수 있다).
  it('every ENEMIES entry has a template with a matching size', () => {
    for (const e of ENEMIES) {
      const art = ENEMY_SPRITES[e.id];
      expect(art, e.id).toBeDefined();
      expect([art!.width, art!.height], e.id).toEqual([e.width, e.height]);
    }
  });
});

describe('object sprites', () => {
  it('builds the jumppad sheet (32×16 × 2 frames) matching its generated file', () => {
    const pad = buildObjectSheets().find((s) => s.file.endsWith('obj_jumppad.png'));
    expect(pad).toBeDefined();
    expect(pad!.width).toBe(64);
    expect(pad!.height).toBe(16);
    expect(existsSync(pad!.file), pad!.file).toBe(true);
    expect(Buffer.compare(readFileSync(pad!.file), Buffer.from(pad!.png))).toBe(0);
  });
});

describe('npc sprite sheets', () => {
  it('every npc builds a 32×48 sheet with two differing idle frames', () => {
    expect(NPC_ANIMS.idle.frames.length).toBe(NPC_FRAME_COUNT);
    for (const n of NPCS) {
      const sheet = buildNpcSheet(n.id);
      expect(sheet.width, n.id).toBe(NPC_FRAME.width * NPC_FRAME_COUNT);
      expect(sheet.height, n.id).toBe(NPC_FRAME.height);
      expect(bottomOpaque(sheet, NPC_FRAME.width, 0), `${n.id} feet`).toBeGreaterThan(0);
      expect(frameOf(sheet, NPC_FRAME.width, 0)).not.toBe(frameOf(sheet, NPC_FRAME.width, 1));
    }
  });
  it('member npcs look exactly like the member player sprite', () => {
    const npc = buildNpcSheet('npc_woni');
    const player = buildPlayerSheet('woni');
    expect(frameOf(npc, NPC_FRAME.width, 0)).toBe(frameOf(player, PLAYER_FRAME.width, 0));
  });
  it('non-member npcs differ from every member', () => {
    const judge = frameOf(buildNpcSheet('npc_audition_judge'), NPC_FRAME.width, 0);
    for (const m of ['woni', 'liv', 'minami', 'may', 'zena'] as const) expect(judge).not.toBe(frameOf(buildPlayerSheet(m), PLAYER_FRAME.width, 0));
  });
  it('generated npc png files match the sources (run npm run sprites)', () => {
    for (const n of NPCS) {
      const file = npcSheetFile(n.id);
      expect(existsSync(file), file).toBe(true);
      expect(Buffer.compare(readFileSync(file), Buffer.from(buildNpcSheet(n.id).png)), n.id).toBe(0);
    }
  });
});
