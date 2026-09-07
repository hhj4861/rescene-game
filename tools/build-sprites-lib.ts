import { heartTex, lifeTex, TEX2 } from '../src/core/ArcadeAssetKeys';
import { ENEMY_FRAME_COUNT, NPC_FRAME, NPC_FRAME_COUNT, PLAYER_ANIMS, PLAYER_FRAME, PLAYER_FRAME_COUNT, type Outfit } from '../src/core/spriteFrames';
import { NPCS } from '../src/data/npcs';
import { ENEMIES } from '../src/data/enemies';
import { MEMBER_IDS, type MemberId } from '../src/systems/types';
import { blit, crop, encodePng, packSheet, pasteGrid, rasterize, type Grid, type Palette } from './pixel-art';
import { ENEMY_SPRITES, type EnemySprite } from './sprites/enemies';
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

// ---------- 적 음영(A안) ----------
/**
 * 덩어리 재질(enemies.ts 헤더의 역할 규약): F/f 몸·그늘 · S/s 줄기 · T 정장·트로피 · D/d 책상 ·
 * P/p 기둥·명패 · C 왕관 · H/I/J 머리색. 여기 없는 역할은 평면으로 남으므로 새 역할 문자를 만들면 이 표에 넣어야 한다.
 * 문자의 뜻은 적마다 다를 수 있다(심사위원은 S가 줄기가 아니라 피부, W가 흰자가 아니라 셔츠다) —
 * 음영에 필요한 건 "덩어리냐 아니냐"뿐이라 같은 칸에 둬도 되지만, 뜻이 갈리면 아래 ENEMY_SHADE 에서 적별로 잡는다.
 */
export const ENEMY_MATERIALS = ['F', 'f', 'S', 's', 'T', 'D', 'd', 'P', 'p', 'C', 'H', 'I', 'J'];
/**
 * 평면으로 지키는 역할: W 흰자·유리 · E 눈동자 · L/l 빛·희미(발광) · A/a 포인트(지직·반짝·숫자) · M/m 금속.
 * - 눈·발광·이펙트에 램프 음영이 닿으면 24×24 잡몹에서 이목구비가 바로 뭉개진다.
 * - 금속은 바늘·톱니·가시·지퍼·거울처럼 죄다 얇은 부속이다. 4px 링에 런마다 밝음·그늘이 갈리면 반짝임이 아니라 얼룩이 되고,
 *   큰 몸 위에 얹힌 부속은 세로 런을 끊어 그 열만 그늘 길이가 달라진다(침묵 보스 몸통에 빗살 무늬가 생겼다).
 * - 외곽선 K 도 특징이다. 특징은 런을 끊지 않으므로 명암이 몸 전체 폭으로 흐르고,
 *   눈·입 같은 내부 검정선 바로 오른쪽에서 런이 새로 시작해 밝음 띠(흰 얼룩)가 찍히지 않는다.
 * 덩어리로 쓰는 적만 아래 표에서 재질로 승격한다.
 */
export const ENEMY_FEATURES = ['K', 'W', 'E', 'L', 'l', 'A', 'a', 'M', 'm'];
/**
 * 같은 덩어리로 보는 역할 묶음(경계에서만 림·접촉 그림자가 생긴다).
 * 명패(P)는 책상(D) 면에 붙어 있어 같은 덩어리로 둔다 — 나누면 명패 왼쪽이 그늘, 오른쪽이 밝음이 되어 광원이 뒤집힌다.
 */
const ENEMY_GROUPS: string[][] = [['F', 'f'], ['S', 's'], ['D', 'd', 'P', 'p'], ['A', 'a'], ['T'], ['C'], ['H'], ['I'], ['J']];

/** 그늘 띠의 목표 두께(px). 비율이 아니라 두께로 잡는다 — 96px 보스에서 25%는 24px짜리 검은 판이 된다. */
const SIDE_SHADE_PX = 9, BOTTOM_SHADE_PX = 7;

interface EnemyShadeSpec {
  /** 이 적에선 덩어리라 음영을 받는 역할(기본 특징 → 재질). */
  solid?: string[];
  /** 이 적에선 이펙트·발광이라 평면으로 두는 역할(기본 재질 → 특징). */
  flat?: string[];
  /** 정수리 광택을 얹을 머리 역할(그 적 안에서 그 역할이 머리 하나에만 쓰일 때만 — 광택 띠는 역할 전체 bbox로 자리를 잡는다). */
  sheen?: string[];
  /** 가로 런 오른쪽 그늘 비율. 기본은 폭에서 계산한다. */
  sideShade?: number;
  /** 세로 런 아래 그늘 비율. 기본은 높이에서 계산한다. */
  bottomShade?: number;
}

/** 역할 문자가 적마다 다른 뜻으로 쓰이거나(승격·강등), 형태가 규칙과 안 맞는 곳만 손으로 잡는다. */
const ENEMY_SHADE: Record<string, EnemyShadeSpec> = {
  // 받침대(A/a)는 반짝임이 아니라 메트로놈이 딛고 선 나무 덩어리다.
  enemy_offbeat_metronome: { solid: ['A', 'a'] },
  // 달력 줄(D)은 1px 눈금이라 램프를 태우면 점선처럼 끊긴다.
  enemy_schedule_bomb: { flat: ['D'] },
  // 유령은 몸빛(#e6e6f0)이 거의 흰색이라 밝음 톤이 순백으로 튄다 — 아래 그늘까지 주면 치맛단 곡선에 흰·회색 계단이 생긴다.
  enemy_chart_ghost: { bottomShade: 0 },
  // 안개는 반투명이고 K 외곽선도 없다 — 형태 음영을 절반만 줘야 구름이 고체 덩어리로 굳지 않는다.
  enemy_apathy_fog: { sideShade: 0.12, bottomShade: 0.1 },
  // 무대 함정은 바닥에 깔린 판이라 25% 그라데이션이 이음매로 보인다 — 오른쪽 4px·아래 3px 베벨만.
  enemy_stage_trap: { sideShade: 0.12, bottomShade: 0.15 },
  // 심사위원: 머리 3종(H 단발·I 쪽·J 백발)은 각각 한 명에게만 쓰여 자동 광택 띠가 제 정수리에 온다.
  boss_monthly_judges: { sheen: ['H', 'I', 'J'] },
  // 어깨 장식(A)은 반짝임이 아니라 어깨에 박힌 금속 구다.
  boss_trophy_guardian: { solid: ['A'] },
};

/**
 * 적 음영 옵션(A안). 적은 실존 인물이 아니라 감정·장애물의 의인화라 캐릭터 프리셋(피부·머리 전제) 대신
 * 역할 규약을 그대로 재질/특징으로 가른다. 캐릭터와 다른 점 셋:
 * - 선택적 외곽선을 끈다. 적의 내부 검정선은 입·톱니·정장 깃처럼 형태를 만드는 선이라 재질 어둠색으로 녹이면 이목구비가 사라진다.
 * - 자동 정수리 광택도 기본은 끈다. 몸 전체가 한 역할(F)이면 광택 띠가 몸통 한가운데에 깔린다(shading.ts 주의점 ②).
 * - 그늘 띠를 비율이 아니라 두께로 잡는다. 잡몹 24~44px 은 기존 25%/20% 그대로, 보스 72~112px 만 얇아진다.
 * 라이브러리의 rimOnly(피부용 1px 림)는 쓰지 않는다 — 적은 실루엣이 K 외곽선으로 둘러싸여 있어 1px 림이 그 검정선에 얹혀 사라진다.
 */
export function enemyShadeOptions(enemyId: string, art: EnemySprite): ShadeOptions {
  const spec = ENEMY_SHADE[enemyId] ?? {};
  const solid = spec.solid ?? [], flat = spec.flat ?? [];
  const materials = [...ENEMY_MATERIALS.filter((r) => !flat.includes(r)), ...solid];
  const groups = ENEMY_GROUPS.map((g) => g.filter((r) => materials.includes(r))).filter((g) => g.length > 0);
  // 묶음에 없는 재질은 shadeGrid 안에서 그룹 번호가 undefined 가 되어 서로 다른 재질끼리 한 덩어리로 붙는다.
  const ungrouped = materials.filter((r) => !groups.some((g) => g.includes(r)));
  if (ungrouped.length) throw new Error(`${enemyId}: ENEMY_GROUPS is missing ${ungrouped.join('')}`);
  return {
    materials,
    groups,
    band: 1,
    selectiveOutline: false,
    features: [...ENEMY_FEATURES.filter((r) => !solid.includes(r)), ...flat],
    sheen: spec.sheen ?? [],
    sideShade: spec.sideShade ?? Math.min(0.25, SIDE_SHADE_PX / art.width),
    bottomShade: spec.bottomShade ?? Math.min(0.2, BOTTOM_SHADE_PX / art.height),
  };
}

/**
 * 시트는 템플릿 목록(ENEMY_SPRITES) 기준으로 만든다 — 데이터(ENEMIES)에 없는 적도 빌드된다.
 * 데이터에 같은 id가 있으면 크기 일치만 검증하고, 없으면 검증을 건너뛴다.
 * 프레임마다 규칙 음영을 입히고 팔레트에 재질별 램프 색을 더한다(캐릭터와 같은 A안).
 */
export function buildEnemySheet(enemyId: string): Sheet {
  const art = ENEMY_SPRITES[enemyId];
  if (!art) throw new Error(`no sprite template for enemy ${enemyId}`);
  const def = ENEMIES.find((e) => e.id === enemyId);
  if (def && (art.width !== def.width || art.height !== def.height)) throw new Error(`${enemyId}: template ${art.width}x${art.height} != data ${def.width}x${def.height}`);
  if (art.frames.length !== ENEMY_FRAME_COUNT) throw new Error(`${enemyId}: ${art.frames.length} frames, expected ${ENEMY_FRAME_COUNT}`);
  art.frames.forEach((g, i) => { if (g.length !== art.height) throw new Error(`${enemyId} frame ${i}: ${g.length} rows != ${art.height}`); });
  const opts = enemyShadeOptions(enemyId, art);
  const frames = art.frames.map((g) => shadeGrid(g, opts));
  return sheetOf(frames, shadePalette(art.palette, opts.materials), art.width, art.height, art.width, art.height);
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
