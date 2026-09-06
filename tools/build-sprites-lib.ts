import { PLAYER_ANIMS, PLAYER_FRAME, PLAYER_FRAME_COUNT } from '../src/core/spriteFrames';
import type { MemberId } from '../src/systems/types';
import { blit, composeLayers, encodePng, packSheet, rasterize, type Grid } from './pixel-art';
import { ATTACK_ARM, BASE_PALETTE, BODY, HAIR, HURT_EYES, LEGS, LOOKS, PROPS, SPRITE_H, SPRITE_W } from './sprites/templates';

export const SPRITES_DIR = 'public/assets/sprites';
export const playerSheetFile = (member: MemberId): string => `${SPRITES_DIR}/player_${member}.png`;

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

export function buildPlayerSheet(member: MemberId): { width: number; height: number; rgba: Uint8Array; png: Uint8Array } {
  const look = LOOKS[member]!;
  const palette = { ...BASE_PALETTE, H: look.hairColor[0], h: look.hairColor[1], T: look.top, t: look.topShade };
  const { width: fw, height: fh } = PLAYER_FRAME;
  const dx = Math.floor((fw - SPRITE_W) / 2);
  const dy = fh - SPRITE_H;
  const frames = poses(member).map((grid) => {
    const frame = new Uint8Array(fw * fh * 4);
    blit(frame, fw, fh, rasterize(grid, palette, SPRITE_W, SPRITE_H), SPRITE_W, SPRITE_H, dx, dy);
    return frame;
  });
  const sheet = packSheet(frames, fw, fh);
  return { ...sheet, png: encodePng(sheet.width, sheet.height, sheet.rgba) };
}
