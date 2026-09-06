import { heartTex, lifeTex, TEX2 } from '../src/core/ArcadeAssetKeys';
import { ENEMY_FRAME_COUNT, NPC_FRAME, NPC_FRAME_COUNT, PLAYER_ANIMS, PLAYER_FRAME, PLAYER_FRAME_COUNT } from '../src/core/spriteFrames';
import { NPCS } from '../src/data/chapters/index';
import { ENEMIES } from '../src/data/enemies';
import { MEMBER_IDS, type MemberId } from '../src/systems/types';
import { blit, composeLayers, crop, encodePng, packSheet, rasterize, type Grid } from './pixel-art';
import { ENEMY_SPRITES } from './sprites/enemies';
import { CARD_FRAMES, CARD_H, CARD_PALETTE, CARD_W, CHEST_FRAMES, CHEST_H, CHEST_PALETTE, CHEST_W, HEART_FOODS, HEART_H, HEART_W, heartFrames } from './sprites/items';
import { NPC_LOOKS } from './sprites/npcs';
import { ATTACK_ARM, BASE_PALETTE, BODY, HAIR, HURT_EYES, LEGS, LOOKS, PROPS, SPRITE_H, SPRITE_W } from './sprites/templates';
import { GROUND_TILE, LADDER_TILE, PLATFORM_TILE, TILE, TILESET_PALETTE } from './sprites/tiles';
import { buildGoFrames, GO_H, GO_PALETTE, GO_W, HUD_HEART_EMPTY, HUD_HEART_FULL, HUD_HEART_H, HUD_HEART_W } from './sprites/ui';

export const TILES_DIR = 'public/assets/tiles';

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

export interface NamedSheet { file: string; png: Uint8Array; width: number; height: number }

/** 프레임들을 그대로(오프셋 없이) 이어붙인 시트 PNG. */
const packFrames = (grids: Grid[], palette: Record<string, string>, w: number, h: number, file: string): NamedSheet => {
  const frames = grids.map((g) => rasterize(g, palette, w, h));
  const sheet = packSheet(frames, w, h);
  return { file, width: sheet.width, height: sheet.height, png: encodePng(sheet.width, sheet.height, sheet.rgba) };
};

/** 단일 프레임 이미지 PNG. */
const image = (grid: Grid, palette: Record<string, string>, w: number, h: number, file: string): NamedSheet => {
  const rgba = rasterize(grid, palette, w, h);
  return { file, width: w, height: h, png: encodePng(w, h, rgba) };
};

/** 하트 음식 5종·카드·상자 시트(Task 15). */
export function buildItemSheets(): NamedSheet[] {
  const hearts = MEMBER_IDS.map((m) => {
    const food = HEART_FOODS[m];
    if (!food) throw new Error(`no heart food for ${m}`);
    return packFrames(heartFrames(food), food.palette, HEART_W, HEART_H, `${SPRITES_DIR}/${heartTex(m)}.png`);
  });
  const card = packFrames(CARD_FRAMES, CARD_PALETTE, CARD_W, CARD_H, `${SPRITES_DIR}/${TEX2.card}.png`);
  const chest = packFrames(CHEST_FRAMES, CHEST_PALETTE, CHEST_W, CHEST_H, `${SPRITES_DIR}/${TEX2.chest}.png`);
  return [...hearts, card, chest];
}

/** HUD 하트·GO 화살표·초상(목숨 아이콘) 시트(Task 15). */
export function buildUiSheets(): NamedSheet[] {
  const heartFull = image(HUD_HEART_FULL.grid, HUD_HEART_FULL.palette, HUD_HEART_W, HUD_HEART_H, `${SPRITES_DIR}/${TEX2.hudHeartFull}.png`);
  const heartEmpty = image(HUD_HEART_EMPTY.grid, HUD_HEART_EMPTY.palette, HUD_HEART_W, HUD_HEART_H, `${SPRITES_DIR}/${TEX2.hudHeartEmpty}.png`);
  const go = packFrames(buildGoFrames(), GO_PALETTE, GO_W, GO_H, `${SPRITES_DIR}/${TEX2.go}.png`);
  const lives = MEMBER_IDS.map((m) => {
    const sheet = buildPlayerSheet(m);
    const rgba = crop(sheet.rgba, sheet.width, 4, 0, 16, 16);
    return { file: `${SPRITES_DIR}/${lifeTex(m)}.png`, width: 16, height: 16, png: encodePng(16, 16, rgba) };
  });
  return [heartFull, heartEmpty, go, ...lives];
}

/** 스테이지 1 도트 타일셋(Task 16): gid 1 바닥·2 원웨이 발판·3 사다리, 각 32×32. */
export function buildTileset(palette: 'stage1'): NamedSheet {
  if (palette !== 'stage1') throw new Error(`unknown tileset palette ${palette}`);
  const frames = [GROUND_TILE, PLATFORM_TILE, LADDER_TILE].map((g) => rasterize(g, TILESET_PALETTE, TILE, TILE));
  const sheet = packSheet(frames, TILE, TILE);
  return { file: `${TILES_DIR}/stage1.png`, width: sheet.width, height: sheet.height, png: encodePng(sheet.width, sheet.height, sheet.rgba) };
}
