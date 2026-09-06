import { ENEMY_FRAME_COUNT, NPC_FRAME, NPC_FRAME_COUNT, PLAYER_ANIMS, PLAYER_FRAME, PLAYER_FRAME_COUNT } from '../src/core/spriteFrames';
import { NPCS } from '../src/data/chapters/index';
import { ENEMIES } from '../src/data/enemies';
import type { MemberId } from '../src/systems/types';
import { blit, composeLayers, encodePng, packSheet, rasterize, type Grid } from './pixel-art';
import { ENEMY_SPRITES } from './sprites/enemies';
import { NPC_LOOKS } from './sprites/npcs';
import { ATTACK_ARM, BASE_PALETTE, BODY, HAIR, HURT_EYES, LEGS, LOOKS, PROPS, SPRITE_H, SPRITE_W } from './sprites/templates';

export const SPRITES_DIR = 'public/assets/sprites';
export const playerSheetFile = (member: MemberId): string => `${SPRITES_DIR}/player_${member}.png`;
// 적·NPC id는 이미 enemy_/boss_/npc_ 접두사를 가진다
export const enemySheetFile = (enemyId: string): string => `${SPRITES_DIR}/${enemyId}.png`;
export const npcSheetFile = (npcId: string): string => `${SPRITES_DIR}/${npcId}.png`;

export interface Sheet { width: number; height: number; rgba: Uint8Array; png: Uint8Array }

const replaceRows = (grid: Grid, from: number, rows: Grid): Grid => grid.map((r, y) => (y >= from && y < from + rows.length ? rows[y - from]! : r));
/** 위쪽 rows 줄을 dy만큼 아래로 내린다(숨쉬기). 맨 윗줄은 비운다. */
const sink = (grid: Grid, rows: number, dy: number): Grid => grid.map((r, y) => (y < dy ? '.'.repeat(SPRITE_W) : y < rows + dy ? grid[y - dy]! : r));
/** 위쪽 rows 줄을 dx만큼 오른쪽으로 민다(기울기). */
const lean = (grid: Grid, rows: number, dx: number): Grid => grid.map((r, y) => (y < rows ? ('.'.repeat(dx) + r).slice(0, SPRITE_W) : r));

function poses(member: MemberId): Grid[] {
  const look = LOOKS[member];
  if (!look) throw new Error(`no look for member ${member}`);
  const hair = HAIR[look.hair]!;
  const prop = PROPS[look.prop]!;
  const withLegs = (legs: Grid): Grid => replaceRows(BODY, 32, legs);
  const stand = composeLayers([BODY, hair, prop], SPRITE_W, SPRITE_H);
  const legsOnly = (legs: Grid): Grid => composeLayers([withLegs(legs), hair, prop], SPRITE_W, SPRITE_H);
  const attackBody = replaceRows(BODY, 20, ATTACK_ARM);
  const attack1 = composeLayers([attackBody, hair], SPRITE_W, SPRITE_H);
  const attack2 = lean(attack1, 28, 1);
  const hurt = composeLayers([replaceRows(BODY, 7, HURT_EYES), hair, prop], SPRITE_W, SPRITE_H);
  const byAnim: Record<keyof typeof PLAYER_ANIMS, Grid[]> = {
    idle: [stand, sink(stand, 28, 1)],
    walk: [legsOnly(LEGS.strideL), stand, legsOnly(LEGS.strideR), stand],
    jump: [legsOnly(LEGS.tuck)],
    attack: [attack1, attack2],
    hurt: [hurt],
  };
  const frames: Grid[] = Array<Grid>(PLAYER_FRAME_COUNT);
  for (const [anim, def] of Object.entries(PLAYER_ANIMS) as [keyof typeof PLAYER_ANIMS, { frames: readonly number[] }][]) {
    def.frames.forEach((idx, i) => { frames[idx] = byAnim[anim][i]!; });
  }
  frames.forEach((f, i) => { if (!f) throw new Error(`frame ${i} unassigned`); });
  return frames;
}

export function buildPlayerSheet(member: MemberId): Sheet {
  const look = LOOKS[member]!;
  const palette = { ...BASE_PALETTE, H: look.hairColor[0], h: look.hairColor[1], T: look.top, t: look.topShade };
  return sheetOf(poses(member), palette, SPRITE_W, SPRITE_H, PLAYER_FRAME.width, PLAYER_FRAME.height);
}

/** 그리드 프레임들을 (fw×fh) 프레임 안에 아래 가운데 정렬로 배치한 시트. */
function sheetOf(grids: Grid[], palette: Record<string, string>, gw: number, gh: number, fw: number, fh: number): Sheet {
  const dx = Math.floor((fw - gw) / 2);
  const dy = fh - gh;
  const frames = grids.map((grid) => {
    const frame = new Uint8Array(fw * fh * 4);
    blit(frame, fw, fh, rasterize(grid, palette, gw, gh), gw, gh, dx, dy);
    return frame;
  });
  const sheet = packSheet(frames, fw, fh);
  return { ...sheet, png: encodePng(sheet.width, sheet.height, sheet.rgba) };
}

export function buildEnemySheet(enemyId: string): Sheet {
  const def = ENEMIES.find((e) => e.id === enemyId);
  const art = ENEMY_SPRITES[enemyId];
  if (!def) throw new Error(`unknown enemy ${enemyId}`);
  if (!art) throw new Error(`no sprite template for enemy ${enemyId}`);
  if (art.width !== def.width || art.height !== def.height) throw new Error(`${enemyId}: template ${art.width}x${art.height} != data ${def.width}x${def.height}`);
  if (art.frames.length !== ENEMY_FRAME_COUNT) throw new Error(`${enemyId}: ${art.frames.length} frames, expected ${ENEMY_FRAME_COUNT}`);
  art.frames.forEach((g, i) => { if (g.length !== art.height) throw new Error(`${enemyId} frame ${i}: ${g.length} rows != ${art.height}`); });
  return sheetOf(art.frames, art.palette, art.width, art.height, art.width, art.height);
}

export function buildNpcSheet(npcId: string): Sheet {
  const def = NPCS.find((n) => n.id === npcId);
  if (!def) throw new Error(`unknown npc ${npcId}`);
  let stand: Grid;
  let palette: Record<string, string>;
  if (def.member) {
    const look = LOOKS[def.member]!;
    stand = composeLayers([BODY, HAIR[look.hair]!, PROPS[look.prop]!], SPRITE_W, SPRITE_H);
    palette = { ...BASE_PALETTE, H: look.hairColor[0], h: look.hairColor[1], T: look.top, t: look.topShade };
  } else {
    const look = NPC_LOOKS[npcId];
    if (!look) throw new Error(`no look for npc ${npcId}`);
    stand = composeLayers([BODY, HAIR[look.hair]!, ...look.overlays], SPRITE_W, SPRITE_H);
    palette = { ...BASE_PALETTE, H: look.hairColor[0], h: look.hairColor[1], T: look.top, t: look.topShade, ...(look.bottom ? { B: look.bottom, b: look.bottom } : {}), ...(look.extra ?? {}) };
  }
  const frames = [stand, sink(stand, 28, 1)];
  if (frames.length !== NPC_FRAME_COUNT) throw new Error('npc frame count drift');
  return sheetOf(frames, palette, SPRITE_W, SPRITE_H, NPC_FRAME.width, NPC_FRAME.height);
}
