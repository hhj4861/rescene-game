import { heartTex, lifeTex, TEX2 } from '../src/core/ArcadeAssetKeys';
import { ENEMY_FRAME_COUNT, NPC_FRAME, NPC_FRAME_COUNT, PLAYER_ANIMS, PLAYER_FRAME, PLAYER_FRAME_COUNT, type Outfit } from '../src/core/spriteFrames';
import { NPCS } from '../src/data/npcs';
import { ENEMIES } from '../src/data/enemies';
import { MEMBER_IDS, type MemberId } from '../src/systems/types';
import { blit, crop, encodePng, packSheet, pasteGrid, rasterize, type Grid, type Palette } from './pixel-art';
import { ENEMY_SPRITES } from './sprites/enemies';
import { CARD_FRAMES, CARD_H, CARD_PALETTE, CARD_W, CHEST_FRAMES, CHEST_H, CHEST_PALETTE, CHEST_W, HEART_FOODS, HEART_H, HEART_W, heartFrames } from './sprites/items';
import { NPC_LOOKS } from './sprites/npcs';
import { OBJECT_SPRITES } from './sprites/objects';
import { OUTFIT_PALETTES, outfitPalette, torsoFor } from './sprites/outfits';
import { SPRITE_FEATURES, SPRITE_MATERIALS, shadeGrid, shadePalette, spriteShadeOptions, variantChar, type ShadeOptions } from './sprites/shading';
import { FLOURISH, POSES, SUPER, WIN, armLayer, lean, legsGrid, sink, type PoseSpec } from './sprites/poses';
import { ACCESSORIES, BLUSH, BODY_X, CANVAS_W, DETAIL_LINE, EYES, EYE_X, EYE_Y, FACE, HAIR, HEAD_BACK, LOOKS, MOUTHS, MOUTH_POS, PROPS, SPRITE_H, blank, flipH, type MemberLook, type Placed } from './sprites/templates';
import { GROUND_TILE, LADDER_TILE, PLATFORM_TILE, TILE, TILESET_PALETTES } from './sprites/tiles';
import { buildGoFrames, GO_H, GO_PALETTE, GO_W, HUD_HEART_EMPTY, HUD_HEART_FULL, HUD_HEART_H, HUD_HEART_W, LIFE_CROP } from './sprites/ui';

export const TILES_DIR = 'public/assets/tiles';

export const SPRITES_DIR = 'public/assets/sprites';
/** training 시트는 옛 이름(player_<m>.png)을 유지하고, 나머지 의상은 player_<m>_<outfit>.png. */
export const playerSheetFile = (member: MemberId, outfit: Outfit = 'training'): string =>
  outfit === 'training' ? `${SPRITES_DIR}/player_${member}.png` : `${SPRITES_DIR}/player_${member}_${outfit}.png`;
// 적·NPC id는 이미 enemy_/boss_/npc_ 접두사를 가진다
export const enemySheetFile = (enemyId: string): string => `${SPRITES_DIR}/${enemyId}.png`;
export const npcSheetFile = (npcId: string): string => `${SPRITES_DIR}/${npcId}.png`;

export interface Sheet { width: number; height: number; rgba: Uint8Array; png: Uint8Array }

if (CANVAS_W !== PLAYER_FRAME.width || SPRITE_H !== PLAYER_FRAME.height) throw new Error('template canvas != PLAYER_FRAME');
if (NPC_FRAME.width !== PLAYER_FRAME.width || NPC_FRAME.height !== PLAYER_FRAME.height) throw new Error('NPC_FRAME != PLAYER_FRAME');

/**
 * 소품을 얹고 그 아래 1px 접촉 그림자를 남긴다 — 소품 아랫변 바로 밑이 재질이면 그 재질의 그늘 톤으로 바꿔
 * 손·몸에 붙여 놓은 듯 보이지 않게 한다. 미리 놓인 톤 문자는 규칙 음영이 건드리지 않는다.
 */
function withProp(canvas: Grid, prop: Grid, px: number, py: number): Grid {
  const out = pasteGrid(canvas, prop, px, py).map((r) => [...r]);
  prop.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.' || (prop[y + 1]?.[x] ?? '.') !== '.') continue;
      const ch = out[py + y + 1]?.[px + x];
      if (ch && SPRITE_MATERIALS.includes(ch)) out[py + y + 1]![px + x] = variantChar(ch, 'shade');
    }
  });
  return out.map((r) => r.join(''));
}

/**
 * 한 포즈를 40×64 캔버스에 합성한다. 순서: 뒷머리 → 뒷팔 → 얼굴·몸통·다리 → 눈·입·홍조 → 앞머리 → 액세서리 → 앞팔 → 소품 → 기울기·숨쉬기 → 바닥 소품 → 효과.
 * overlays 는 NPC 전용(안경·모자 등, 그리드 좌표)이며 앞머리 뒤·액세서리 자리에 얹는다.
 */
export function renderPose(look: MemberLook, outfit: Outfit, spec: PoseSpec, overlays: Grid[] = [], plain = false): Grid {
  const at = (base: Grid, g: Grid, x = BODY_X, y = 0): Grid => pasteGrid(base, g, x, y);
  const hair = HAIR[look.hair];
  const propIdleArm = PROPS[look.prop].idleArm;
  const skinSleeve = OUTFIT_PALETTES[outfit].sleeves === 'short' && !OUTFIT_PALETTES[outfit].jacket;
  const front = armLayer(spec.holdProp && propIdleArm ? { path: propIdleArm } : spec.front, skinSleeve);
  const back = armLayer(spec.back, skinSleeve);
  let c = blank(SPRITE_H, CANVAS_W);
  c = at(c, hair.back);
  c = at(c, back.grid, 0, 0);
  c = at(c, spec.backView ? HEAD_BACK : FACE);
  c = at(c, torsoFor(outfit, plain));
  c = at(c, legsGrid(OUTFIT_PALETTES[outfit].skirt, spec.legs));
  if (!spec.backView) {
    const left = EYES[spec.eyes ?? 'open'], right = flipH(EYES[spec.eyesRight ?? spec.eyes ?? 'open']);
    c = at(c, left, BODY_X + EYE_X.left - 1, EYE_Y);
    c = at(c, right, BODY_X + EYE_X.right - 1, EYE_Y);
    c = at(c, MOUTHS[spec.mouth ?? 'smile'], BODY_X + MOUTH_POS.x, MOUTH_POS.y);
    c = at(c, BLUSH);
  }
  // 뒷모습은 앞머리 레이어를 생략한다(뒤통수 실루엣 = 얼굴 타원, 갈래 끝 어둠·앞머리 외곽선이 뒤통수에 띠로 남지 않게)
  if (!spec.backView) c = at(c, hair.front);
  for (const o of overlays) c = at(c, o);
  if (!spec.backView || look.accessory !== 'galHighlight') c = at(c, ACCESSORIES[look.accessory]);
  c = at(c, front.grid, 0, 0);
  const prop = PROPS[look.prop];
  const propMode = spec.prop ?? 'idle';
  const grounded = prop.grounded && propMode === 'idle';
  const hold = (p: Placed | undefined): void => { if (p) c = withProp(c, p.grid, front.hand[0] + p.x, front.hand[1] + p.y); };
  if (propMode === 'idle' && !grounded) hold(prop.idle);
  if (propMode === 'grip') hold(prop.grip);
  if (propMode === 'swing') hold(prop.swing);
  if (spec.lean) c = lean(c, spec.lean);
  if (spec.sink) c = sink(c, spec.sink);
  if (grounded && prop.idle) c = withProp(c, prop.idle.grid, prop.idle.x, prop.idle.y);
  if (spec.fx) c = at(c, spec.fx, 0, 0);
  return c;
}

/** 멤버의 15프레임(PLAYER_ANIMS 순서). */
export function playerPoses(member: MemberId): PoseSpec[] {
  const byAnim: Record<keyof typeof PLAYER_ANIMS, PoseSpec[]> = {
    idle: [POSES.idle, POSES.breathe],
    flourish: [FLOURISH[member]],
    walk: [POSES.walkA, POSES.pass, POSES.walkB, POSES.pass],
    jump: [POSES.jump],
    attack: [POSES.attack1, POSES.attack2, POSES.attack3],
    attack1: [POSES.attack1],
    attack2: [POSES.attack2],
    attack3: [POSES.attack3],
    hurt: [POSES.hurt],
    super: SUPER[member],
    win: [WIN[member]],
  };
  const frames: PoseSpec[] = Array<PoseSpec>(PLAYER_FRAME_COUNT);
  for (const [anim, def] of Object.entries(PLAYER_ANIMS) as [keyof typeof PLAYER_ANIMS, { frames: readonly number[] }][]) {
    def.frames.forEach((idx, i) => { frames[idx] = byAnim[anim][i]!; });
  }
  frames.forEach((f, i) => { if (!f) throw new Error(`frame ${i} unassigned`); });
  return frames;
}

export function buildPlayerSheet(member: MemberId, outfit: Outfit = 'training'): Sheet {
  const look = LOOKS[member];
  if (!look) throw new Error(`no look for member ${member}`);
  const grids = playerPoses(member).map((spec) => renderPose(look, outfit, spec));
  return shadedSheet(grids, outfitPalette(look, outfit), PLAYER_FRAME.width, PLAYER_FRAME.height);
}

/**
 * 캐릭터(멤버·NPC) 음영 옵션: 라이브러리 프리셋(A안) 에서 두 가지를 덮어쓴다.
 * - 검정 세부선 k(안경테·초커)를 특징으로 지켜 선택적 외곽선이 지우지 않게 한다.
 * - 신발 O 는 규칙 음영에서 뺀다(4×3 덩어리에 형태 음영·접촉 그림자가 겹치면 얼룩진다). poses.ts 가 손으로 칠한다.
 * - 자동 정수리 광택도 끈다(런의 왼쪽 65%를 통째로 밝혀 16×16 목숨 아이콘에서 네모난 판이 된다).
 *   templates.ts 의 HEAD_SHEEN 이 앞머리·뒤통수에 모양을 잡아 미리 얹는다.
 */
export function characterShadeOptions(palette: Palette): ShadeOptions {
  const base = spriteShadeOptions(palette);
  return { ...base, materials: base.materials.filter((m) => m !== 'O'), features: [...SPRITE_FEATURES, DETAIL_LINE], sheen: [] };
}

/** 캐릭터 시트: 프레임마다 형태 음영·접촉 그림자·정수리 광택·선택적 외곽선을 입히고, 팔레트에 재질별 램프 색을 더한다. */
function shadedSheet(grids: Grid[], palette: Palette, fw: number, fh: number): Sheet {
  const opts = characterShadeOptions(palette);
  return sheetOf(grids.map((g) => shadeGrid(g, opts)), shadePalette(palette, SPRITE_MATERIALS), CANVAS_W, SPRITE_H, fw, fh);
}

/** 그리드 프레임들을 (fw×fh) 프레임 안에 아래 가운데 정렬로 배치한 시트. */
function sheetOf(grids: Grid[], palette: Palette, gw: number, gh: number, fw: number, fh: number): Sheet {
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

/**
 * 시트는 템플릿 목록(ENEMY_SPRITES) 기준으로 만든다 — 데이터(ENEMIES)에 없는 적도 빌드된다.
 * 데이터에 같은 id가 있으면 크기 일치만 검증하고, 없으면 검증을 건너뛴다.
 */
export function buildEnemySheet(enemyId: string): Sheet {
  const art = ENEMY_SPRITES[enemyId];
  if (!art) throw new Error(`no sprite template for enemy ${enemyId}`);
  const def = ENEMIES.find((e) => e.id === enemyId);
  if (def && (art.width !== def.width || art.height !== def.height)) throw new Error(`${enemyId}: template ${art.width}x${art.height} != data ${def.width}x${def.height}`);
  if (art.frames.length !== ENEMY_FRAME_COUNT) throw new Error(`${enemyId}: ${art.frames.length} frames, expected ${ENEMY_FRAME_COUNT}`);
  art.frames.forEach((g, i) => { if (g.length !== art.height) throw new Error(`${enemyId} frame ${i}: ${g.length} rows != ${art.height}`); });
  return sheetOf(art.frames, art.palette, art.width, art.height, art.width, art.height);
}

/** NPC: 멤버 NPC는 멤버 연습복 외형 그대로, 배경 NPC는 머리·팔레트·오버레이만 다른 같은 템플릿. 대기 2프레임. */
export function buildNpcSheet(npcId: string): Sheet {
  const def = NPCS.find((n) => n.id === npcId);
  if (!def) throw new Error(`unknown npc ${npcId}`);
  let grids: Grid[];
  let palette: Record<string, string>;
  if (def.member) {
    const look = LOOKS[def.member]!;
    grids = [POSES.idle, POSES.breathe].map((spec) => renderPose(look, 'training', spec));
    palette = outfitPalette(look, 'training');
  } else {
    const npc = NPC_LOOKS[npcId];
    if (!npc) throw new Error(`no look for npc ${npcId}`);
    const look: MemberLook = { hair: npc.hair, hairColor: npc.hairColor, top: npc.top, topShade: npc.topShade, prop: 'none', accessory: npc.accessory ?? 'none', accent: '#12131c' };
    // 배경 NPC는 후드 끈·주머니 없는 단색 상의(plain)
    grids = [POSES.idle, POSES.breathe].map((spec) => renderPose(look, 'training', { ...spec, prop: 'none' }, npc.overlays, true));
    palette = { ...outfitPalette(look, 'training'), ...(npc.bottom ? { B: npc.bottom, b: npc.bottom } : {}), ...(npc.extra ?? {}) };
  }
  if (grids.length !== NPC_FRAME_COUNT) throw new Error('npc frame count drift');
  return shadedSheet(grids, palette, NPC_FRAME.width, NPC_FRAME.height);
}

export interface NamedSheet { file: string; png: Uint8Array; width: number; height: number; rgba?: Uint8Array }

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
    const rgba = crop(sheet.rgba, sheet.width, LIFE_CROP.x, LIFE_CROP.y, LIFE_CROP.w, LIFE_CROP.h);
    return { file: `${SPRITES_DIR}/${lifeTex(m)}.png`, width: LIFE_CROP.w, height: LIFE_CROP.h, rgba, png: encodePng(LIFE_CROP.w, LIFE_CROP.h, rgba) };
  });
  return [heartFull, heartEmpty, go, ...lives];
}

/** 스테이지별 도트 타일셋: gid 1 바닥·2 원웨이 발판·3 사다리, 각 32×32(그리드 공용, 팔레트만 스테이지별). */
export function buildTileset(palette: keyof typeof TILESET_PALETTES): NamedSheet {
  const colors = TILESET_PALETTES[palette];
  if (!colors) throw new Error(`unknown tileset palette ${palette}`);
  const frames = [GROUND_TILE, PLATFORM_TILE, LADDER_TILE].map((g) => rasterize(g, colors, TILE, TILE));
  const sheet = packSheet(frames, TILE, TILE);
  return { file: `${TILES_DIR}/${palette}.png`, width: sheet.width, height: sheet.height, png: encodePng(sheet.width, sheet.height, sheet.rgba) };
}

/** 점프대 등 맵 오브젝트 시트(Task 5). */
export function buildObjectSheets(): NamedSheet[] {
  return Object.entries(OBJECT_SPRITES).map(([id, art]) => packFrames(art.frames, art.palette, art.width, art.height, `${SPRITES_DIR}/${id}.png`));
}
