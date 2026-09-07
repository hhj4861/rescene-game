// 초상화(64×64) 합성 부품. 얼굴·머리 덩어리는 마스크(shapes.ts)로 만들고, 눈·입·손·액세서리는 손으로 그린 역할 문자 그리드다.
// 역할 문자: K 실루엣 외곽선  F 머리 안쪽선(머리 어둠)  f 머리결(머리 그늘)  S/s 피부·그늘  p/q 볼터치 바깥·안쪽
//           H 앞머리  N 뒷머리  L 정수리 광택  T/t/u 상의·그늘·주름  I/i/j 눈동자·위 어둠·아래 밝음
//           W 하이라이트  D 입 안  R/r 혀·리본·혀 광택  v 입술 광택  G 금속(귀걸이·클립)  O 땀방울
//           E 얼굴 선(눈·눈썹) — K 와 같은 검정이지만 음영 규칙에서 제외해 눈 밑 얼룩(다크서클)을 막는다
import { pasteGrid, type Grid } from '../pixel-art';
import { ellipseMask, rectMask, shapeFromMask, subtractMask, unionMask, type Mask } from './shapes';
import { PORTRAIT_FRAME } from '../../src/core/spriteFrames';

export const PW = PORTRAIT_FRAME.width;
export const PH = PORTRAIT_FRAME.height;

/** 규칙 음영이 건드리지 않는 초상화 전용 디테일 역할(팔레트가 색을 직접 준다). 런을 끊지 않도록 features 로 넘긴다. */
export const PORTRAIT_DETAIL_ROLES = ['E', 'F', 'f', 'j', 'q', 'u', 'v', 'r'] as const;

export type HairStyle = 'long' | 'bob' | 'wavy' | 'short' | 'twin';
/** squint = 피격 `><`, flat = 반눈(째려봄, 제나 "아뉘"). */
export type EyeVariant = 'open' | 'closed' | 'wink' | 'sparkle' | 'squint' | 'flat';
export type BrowVariant = 'normal' | 'down' | 'worried';
export type MouthVariant = 'smile' | 'open' | 'tongue' | 'pout' | 'puff' | 'wave';
export type HandVariant = 'none' | 'up' | 'thumb' | 'peace' | 'clasp';
export type Accessory = 'earring' | 'choker' | 'galHighlight' | 'hairclip' | 'ribbon';
export type FaceVariant = 'normal' | 'puff';

// ---------- 그리드 유틸 ----------
const blank = (): Grid => Array<string>(PH).fill('.'.repeat(PW));
const rows = (name: string, w: number, g: Grid): Grid => {
  g.forEach((r, i) => { if (r.length !== w) throw new Error(`${name} row ${i} has ${r.length} != ${w}`); });
  return g;
};
/** 작은 그리드를 64×64 캔버스의 (x, y)에 놓는다. */
export const place = (sub: Grid, x: number, y: number): Grid => pasteGrid(blank(), sub, x, y);
/** 좌우 반전(왼눈 → 오른눈, 왼손 → 오른손). */
export const mirror = (g: Grid): Grid => g.map((r) => [...r].reverse().join(''));
/** 64×64 레이어들을 순서대로 덮는다. */
export const stack = (...layers: Grid[]): Grid => layers.reduce((acc, g) => pasteGrid(acc, g, 0, 0), blank());

// ---------- 마스크 유틸 ----------
const E = (cx: number, cy: number, rx: number, ry: number): Mask => ellipseMask(PW, PH, cx, cy, rx, ry);
const Rc = (x: number, y: number, w: number, h: number, corner = 0): Mask => rectMask(PW, PH, x, y, w, h, corner);
const clip = (mask: Mask, keep: (x: number, y: number) => boolean): Mask => mask.map((row, y) => row.map((v, x) => v && keep(x, y)));
/** 마스크가 참이고 현재 문자가 over 인 칸을 ch 로 칠한다(외곽선은 건드리지 않는다). */
const paint = (grid: Grid, mask: Mask, ch: string, over: string): Grid =>
  grid.map((r, y) => [...r].map((c, x) => (mask[y]![x] && c === over ? ch : c)).join(''));
/** 점 목록 중 현재 문자가 over 인 칸만 ch 로 칠한다(머리결 선). */
const paintPoints = (grid: Grid, pts: readonly (readonly [number, number])[], ch: string, over: string): Grid => {
  const out = grid.map((r) => [...r]);
  for (const [x, y] of pts) if (out[y]?.[x] === over) out[y]![x] = ch;
  return out.map((r) => r.join(''));
};
/** 제어점 하나짜리 2차 베지어 위의 정수 좌표들(머리결 곡선). */
const curve = (x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): [number, number][] => {
  const n = Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, mt = 1 - t;
    pts.push([Math.round(mt * mt * x0 + 2 * mt * t * cx + t * t * x1), Math.round(mt * mt * y0 + 2 * mt * t * cy + t * t * y1)]);
  }
  return pts;
};
const lum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
export const isLighter = (a: string, b: string): boolean => lum(a) > lum(b);

// ---------- 얼굴 ----------
// 머리통(위 타원) + 턱(아래 타원): 정면, 눈이 큰 2.5등신 얼굴. 가로 14..49, 세로 7..46.
const SKULL = E(31.5, 24, 18, 17.5);
const JAW = E(31.5, 31, 15.5, 15);
const EARS = unionMask(E(13.5, 31, 2.5, 4), E(49.5, 31, 2.5, 4));
const NECK = Rc(26, 40, 12, 14);
const CHEEKS = unionMask(E(16, 37.5, 4, 4.5), E(47, 37.5, 4, 4.5));
/** 어깨: 52행부터 시작해 아래로 넓어지는 타원 윗부분. */
const SHOULDERS = clip(E(31.5, 66, 30, 14), (_x, y) => y >= 52);

/** 머리(앞·뒤) 가장자리가 "얼굴 위"인지 판정하는 마스크 — 그 위의 검정선은 실루엣이 아니라 안쪽선이다. */
const HEAD_AREA = unionMask(SKULL, JAW, EARS, NECK);

function faceGrid(variant: FaceVariant): Grid {
  const head = unionMask(SKULL, JAW, EARS, NECK, ...(variant === 'puff' ? [CHEEKS] : []));
  let g = stack(shapeFromMask(SHOULDERS, 'T', 'K'), shapeFromMask(head, 'S', 'K'));
  g = paint(g, Rc(0, 52, PW, 4), 't', 'T');            // 어깨 위 그늘
  g = pasteGrid(g, ['uu....', '.uu...', '..u...'], 17, 57);   // 어깨 주름(왼쪽)
  g = pasteGrid(g, ['....uu', '...uu.', '...u..'], 41, 57);   // 어깨 주름(오른쪽)
  g = pasteGrid(g, ['ssssssssss', 'ssssssssss'], 27, 47); // 턱 아래 목 그늘
  g = pasteGrid(g, ['s', 's', 's', 's'], 13, 29);         // 귀 안쪽 그늘
  g = pasteGrid(g, ['s', 's', 's', 's'], 50, 29);
  g = pasteGrid(g, ['.s', 'ss'], 31, 36);                 // 코(콧방울에 1px 그늘)
  return g;
}
export const FACE: Record<FaceVariant, Grid> = { normal: faceGrid('normal'), puff: faceGrid('puff') };

// ---------- 머리 ----------
/** 앞머리·뒷머리 공통 머리통(얼굴보다 2~3px 크다): 가로 11..52, 세로 3..43. */
const CROWN = E(31.5, 23, 20.5, 20.5);
/** 정수리 광택 띠(호). 스타일마다 가르마를 피해 끊는다 — 띠가 앞머리 갈래를 무시하면 가발처럼 보인다. */
const SHEEN_ARC = subtractMask(E(31.5, 24, 17.5, 17), E(31.5, 25.5, 16, 16));
const SHEEN: Record<HairStyle, Mask> = {
  long: clip(SHEEN_ARC, (x, y) => y >= 6 && y <= 12 && x >= 18 && x <= 45),
  bob: clip(SHEEN_ARC, (x, y) => y >= 6 && y <= 12 && x >= 18 && x <= 45),
  wavy: clip(SHEEN_ARC, (x, y) => y >= 6 && y <= 12 && x >= 24 && x <= 47),        // 옆으로 넘긴 쪽만
  short: clip(SHEEN_ARC, (x, y) => y >= 6 && y <= 11 && x >= 20 && x <= 43),
  twin: clip(SHEEN_ARC, (x, y) => y >= 6 && y <= 12 && x >= 17 && x <= 46 && Math.abs(x - 31.5) > 3.5), // 가운데 가르마에서 끊는다
};
const tri = (v: number, period: number, amp: number): number => {
  const t = ((v % period) + period) % period;
  const half = period / 2;
  return Math.round((t < half ? t / half : (period - t) / half) * amp);
};
const inFace = (x: number): boolean => x >= 13 && x <= 50;

/** 앞머리 아래 가장자리(x → 마지막 머리 행). 얼굴 밖은 머리통 전체.
 *  1px 톱니(dither)를 쓰지 않는다 — 접촉 그림자 2px 이 톱니를 그대로 따라가 이마에 빗살무늬가 생긴다. 결은 머리결 선(f)으로 낸다. */
const FRINGE: Record<HairStyle, (x: number) => number> = {
  long: (x) => (inFace(x) ? 18 + (Math.abs(x - 31.5) > 13 ? 1 : 0) : PH),          // 일자 앞머리(옆만 한 칸 길게)
  bob: (x) => (inFace(x) ? Math.round(20 - ((x - 31.5) / 17.5) ** 2 * 4) : PH),    // 둥근 시스루 뱅
  wavy: (x) => (inFace(x) ? Math.min(20, Math.round(12 + (x - 13) * 0.25)) : PH),  // 옆으로 넘긴 앞머리
  short: (x) => (inFace(x) ? 16 + tri(x + 2, 8, 3) : PH),                          // 삐죽한 짧은 앞머리
  twin: (x) => (inFace(x) ? Math.max(14, 19 - Math.max(0, 4 - Math.abs(x - 31.5)) * 1.4) | 0 : PH), // 가운데 가르마(얕게 — 깊으면 이마가 비어 보인다)
};

/** 머리결 선(f): 스타일별로 앞머리 흐름을 2~4줄만 긋는다. 가로로 눕지 않게(머리는 위에서 아래로 흐른다) 세로가 긴 곡선만 쓴다.
 *  hairFront 에서 앞머리 아래 가장자리 2행은 잘라낸다 — 접촉 그림자 판정이 결 선(feature)을 그늘로 치지 않아 이마에 구멍이 생긴다. */
const STRANDS: Record<HairStyle, [number, number][]> = {
  long: [...curve(21, 11, 20, 14, 20, 17), ...curve(31, 11, 31, 14, 31, 18), ...curve(42, 11, 43, 14, 43, 17)],
  bob: [...curve(21, 10, 20, 14, 22, 18), ...curve(31, 10, 31, 14, 31, 19), ...curve(42, 10, 43, 14, 41, 18)],
  wavy: [...curve(19, 8, 20, 12, 24, 16), ...curve(28, 9, 30, 13, 34, 18), ...curve(38, 9, 41, 13, 44, 17)],
  short: [...curve(19, 10, 20, 13, 19, 16), ...curve(27, 9, 27, 12, 26, 15), ...curve(36, 9, 37, 12, 37, 15), ...curve(45, 10, 44, 13, 45, 16)],
  twin: [...curve(29, 11, 26, 15, 24, 19), ...curve(34, 11, 37, 15, 39, 19), ...curve(20, 12, 19, 15, 20, 18), ...curve(43, 12, 44, 15, 43, 18)],
};

/** 옆머리(얼굴 옆을 감싸는 앞쪽 가닥) 마스크. 위쪽 모서리 깎임이 앞머리 덩어리 안에 숨도록 12행부터 시작한다. */
const wave = (y: number): number => Math.round(1.5 + 1.5 * Math.sin(y * 0.8));
const SIDE_LOCKS: Record<HairStyle, Mask> = {
  long: unionMask(Rc(9, 12, 7, 52, 3), Rc(48, 12, 7, 52, 3)),
  bob: unionMask(Rc(10, 12, 7, 33, 3), Rc(47, 12, 7, 33, 3), Rc(12, 41, 8, 4, 2), Rc(44, 41, 8, 4, 2)),
  wavy: unionMask(
    clip(Rc(6, 12, 10, 49), (x, y) => x >= 6 + wave(y) && x <= 15 - wave(y + 3)),
    clip(Rc(48, 12, 10, 49), (x, y) => x <= 57 - wave(y) && x >= 48 + wave(y + 3)),
  ),
  short: unionMask(Rc(11, 12, 5, 14, 2), Rc(48, 12, 5, 14, 2)),
  twin: unionMask(Rc(11, 12, 5, 18, 2), Rc(48, 12, 5, 18, 2)),
};

/** 뒷머리(얼굴 뒤) 마스크. */
const BACK_MASS: Record<HairStyle, Mask> = {
  long: unionMask(CROWN, Rc(8, 20, 9, 44, 4), Rc(47, 20, 9, 44, 4)),
  bob: unionMask(CROWN, Rc(10, 20, 44, 25, 6)),
  wavy: unionMask(
    CROWN,
    clip(Rc(4, 20, 14, 44), (x, y) => x >= 4 + wave(y + 1)),
    clip(Rc(46, 20, 14, 44), (x, y) => x <= 59 - wave(y + 1)),
  ),
  short: clip(CROWN, (x, y) => y <= 27 || (x >= 15 && x <= 48)),
  twin: unionMask(CROWN, E(5.5, 42, 4.5, 20), E(58.5, 42, 4.5, 20), Rc(4, 18, 8, 6, 1), Rc(52, 18, 8, 6, 1)),
};

/** 얼굴 위에 놓인 검정 가장자리를 지운다 — 실루엣만 검정으로 남긴다(선택적 외곽선).
 *  옆선은 머리 어둠색(F)으로 바꾸고, 아래쪽 가장자리는 덩어리(fill)에 합친다.
 *  아래 가장자리를 F 로 두면 접촉 그림자 띠(2px)를 F 행이 먹어버려 이마 그림자가 1px 로 줄고 얼룩진다. */
const innerEdge = (g: Grid, mask: Mask, fill: string): Grid =>
  g.map((row, y) => [...row].map((c, x) => (c === 'K' && HEAD_AREA[y]![x] ? (mask[y + 1]?.[x] ? 'F' : fill) : c)).join(''));

function hairFront(style: HairStyle): Grid {
  const fringe = FRINGE[style];
  const mask = unionMask(clip(CROWN, (x, y) => y <= fringe(x)), SIDE_LOCKS[style]);
  let g = innerEdge(shapeFromMask(mask, 'H', 'K'), mask, 'H');
  g = paint(g, SHEEN[style], 'L', 'H');
  g = paintPoints(g, STRANDS[style].filter(([x, y]) => y <= fringe(x) - 2), 'f', 'H');
  return g;
}
function hairBack(style: HairStyle): Grid {
  const mask = BACK_MASS[style];
  return innerEdge(shapeFromMask(mask, 'N', 'K'), mask, 'N');
}
export const HAIR_FRONT: Record<HairStyle, Grid> = {
  long: hairFront('long'), bob: hairFront('bob'), wavy: hairFront('wavy'), short: hairFront('short'), twin: hairFront('twin'),
};
export const HAIR_BACK: Record<HairStyle, Grid> = {
  long: hairBack('long'), bob: hairBack('bob'), wavy: hairBack('wavy'), short: hairBack('short'), twin: hairBack('twin'),
};

// ---------- 눈 (왼눈 기준 8×9, 오른눈은 반전) ----------
export const EYE_LEFT = { x: 20, y: 25 } as const;
export const EYE_RIGHT = { x: 36, y: 25 } as const;
// 눈동자 3단: 위 어둠(i) → 가운데 기본(I) → 아래 밝음(j), 하이라이트 W 는 왼쪽 위 + 오른쪽 아래.
const EYE_OPEN: Grid = rows('eye.open', 8, [
  '..EEEE..',
  '.EEEEEE.',
  'EEWWiiiE',
  'EiWWiiiE',
  'EiIIIIiE',
  'EIIIIIIE',
  'EIjjjjIE',
  '.EjjjWE.',
  '..EEEE..',
]);
const EYE_CLOSED: Grid = rows('eye.closed', 8, [
  '........',
  '........',
  '........',
  '..EEEE..',
  '.EE..EE.',
  'EE....EE',
  '........',
  '........',
  '........',
]);
const EYE_SPARKLE: Grid = rows('eye.sparkle', 8, [
  '..EEEE..',
  '.EEEEEE.',
  'EEWWiiiE',
  'EiWWIWIE',
  'EiIIWWWE',
  'EIIIIWIE',
  'EIjjjjIE',
  '.EjWjjE.',
  '..EEEE..',
]);
const EYE_SQUINT: Grid = rows('eye.squint', 8, [
  '........',
  'EE......',
  '.EE.....',
  '..EE....',
  '...EE...',
  '..EE....',
  '.EE.....',
  'EE......',
  '........',
]);
const EYE_FLAT: Grid = rows('eye.flat', 8, [
  '........',
  '........',
  '........',
  'EEEEEEEE',
  'EWIiiiiE',
  'EIIIiiIE',
  'EIjjjjIE',
  '.EjjjjE.',
  '..EEEE..',
]);
const pair = (left: Grid, right: Grid): Grid => stack(place(left, EYE_LEFT.x, EYE_LEFT.y), place(mirror(right), EYE_RIGHT.x, EYE_RIGHT.y));
export const EYES: Record<EyeVariant, Grid> = {
  open: pair(EYE_OPEN, EYE_OPEN),
  closed: pair(EYE_CLOSED, EYE_CLOSED),
  wink: pair(EYE_OPEN, EYE_CLOSED),
  sparkle: pair(EYE_SPARKLE, EYE_SPARKLE),
  squint: pair(EYE_SQUINT, EYE_SQUINT),
  flat: pair(EYE_FLAT, EYE_FLAT),
};

// ---------- 눈썹 (왼눈썹 기준 7×3, 앞머리 바로 아래 21~23행) ----------
// 검정선이지만 역할은 E: 눈썹이 접촉 그림자를 드리우면 눈 위·눈초리에 얼룩(다크서클)이 생긴다.
const BROW_NORMAL: Grid = rows('brow.normal', 7, ['.......', '..EEEE.', '.EE..EE']);
const BROW_DOWN: Grid = rows('brow.down', 7, ['EE.....', '.EEEE..', '....EEE']);
const BROW_WORRIED: Grid = rows('brow.worried', 7, ['.....EE', '..EEEE.', 'EEE....']);
const brows = (g: Grid): Grid => stack(place(g, 19, 21), place(mirror(g), 38, 21));
export const BROWS: Record<BrowVariant, Grid> = { normal: brows(BROW_NORMAL), down: brows(BROW_DOWN), worried: brows(BROW_WORRIED) };

// ---------- 입 ----------
// 입술·혀 하이라이트는 1px 만(v 입술 광택 · r 혀 광택).
const MOUTH_SMILE: Grid = rows('mouth.smile', 8, ['K......K', '.K....K.', '..KKKK..', '...vv...']);
const MOUTH_OPEN: Grid = rows('mouth.open', 10, [
  '..KKKKKK..',
  '.KWWWWWWK.',
  'KDDDDDDDDK',
  'KDDDDDDDDK',
  'KDrrRRRRDK',
  '.KRRRRRRK.',
  '..KKKKKK..',
  '...vvvv...',
]);
const MOUTH_TONGUE: Grid = rows('mouth.tongue', 10, [
  'K........K',
  '.KK....KK.',
  '..KKKKKK..',
  '...KrRRK..',
  '...KRRRK..',
  '....KKK...',
]);
const MOUTH_POUT: Grid = rows('mouth.pout', 6, ['..KK..', '.KvDK.', '.KDDK.', '..KK..']);
const MOUTH_PUFF: Grid = rows('mouth.puff', 6, ['EE....', '..EEE.', 'EE....']);
const MOUTH_WAVE: Grid = rows('mouth.wave', 10, ['.EE....EE.', 'E..E..E..E', '....EE....']);
export const MOUTH: Record<MouthVariant, Grid> = {
  smile: place(MOUTH_SMILE, 28, 39),
  open: place(MOUTH_OPEN, 27, 37),
  tongue: place(MOUTH_TONGUE, 27, 39),
  pout: place(MOUTH_POUT, 29, 38),
  puff: place(MOUTH_PUFF, 29, 39),
  wave: place(MOUTH_WAVE, 27, 39),
};

// ---------- 볼터치(2톤: 바깥 p 점묘 · 안쪽 q 2×2) ----------
const BLUSH_LEFT: Grid = rows('blush', 5, ['.pp..', 'pqqp.', '.pp..']);
// 눈 바로 아랫줄(34행)은 비워 둔다 — 그 줄에 색이 앉으면 다크서클처럼 읽힌다.
export const BLUSH: Grid = stack(place(BLUSH_LEFT, 20, 35), place(mirror(BLUSH_LEFT), 39, 35));

// ---------- 손 ----------
/** 활짝 편 왼손(손바닥 정면, 엄지가 얼굴 쪽) 12×14. */
const HAND_OPEN: Grid = rows('hand.open', 12, [
  '.KK.KK.KK...',
  'KSSKSSKSSK..',
  'KSSKSSKSSK..',
  'KSSKSSKSSK..',
  'KSSKSSKSSKK.',
  'KSSSSSSSSKSK',
  'KSSSSSSSSSSK',
  'KSSSSSSSSSK.',
  'KSSSSSSSSSK.',
  '.KSSSSSSSSK.',
  '.KSSSSSSSK..',
  '..KSSSSSSK..',
  '..KSSSSSK...',
  '...KKKKK....',
]);
/** 왕따봉(오른손 주먹 정면 + 엄지 위, 손가락 주름은 s) 15×17. */
const HAND_THUMB: Grid = rows('hand.thumb', 15, [
  '......KK.......',
  '.....KSSK......',
  '.....KSSK......',
  '.....KSSK......',
  '.....KSSSK.....',
  '.KKKKKSSSSK....',
  'KSSSSSSSSSSK...',
  'KSSSSSSSSSSSK..',
  'KsssssssSSSSK..',
  'KSSSSSSSSSSSK..',
  'KsssssssSSSSK..',
  'KSSSSSSSSSSSK..',
  'KsssssssSSSSK..',
  'KSSSSSSSSSSSK..',
  '.KSSSSSSSSSSK..',
  '..KSSSSSSSSK...',
  '...KKKKKKKK....',
]);
/** 브이(오른손, 손가락을 길게·사이를 넓게) 16×19. */
const HAND_PEACE: Grid = rows('hand.peace', 16, [
  '.KK.......KK....',
  'KSSK.....KSSK...',
  'KSSK.....KSSK...',
  'KSSK....KSSK....',
  'KSSK....KSSK....',
  'KSSK...KSSK.....',
  '.KSSK.KSSK......',
  '.KSSKKSSK.......',
  '.KSSSSSSKKKK....',
  '.KSSSSSSSSSSK...',
  '.KSSSSSSSSSSSK..',
  '.KSsSSsSSSSSSK..',
  '.KSSSSSSSSSSSK..',
  '.KSsSSsSSSSSSK..',
  '.KSSSSSSSSSSSK..',
  '..KSSSSSSSSSSK..',
  '..KSSSSSSSSSK...',
  '...KSSSSSSSK....',
  '....KKKKKKK.....',
]);
/** 두 손 모음(턱 밑에서 두 주먹을 맞댄 모양, 손가락 마디 3줄 + 주름) 22×13. */
const HANDS_CLASP: Grid = rows('hand.clasp', 22, [
  '..KK.KK.KK..KK.KK.KK..',
  '.KSSKSSKSSKKSSKSSKSSK.',
  '.KSSKSSKSSKKSSKSSKSSK.',
  'KSSSKSSKSSSKSSSKSSKSSK',
  'KSSSSSSSSSKKSSSSSSSSSK',
  'KSSSSSSSSSKKSSSSSSSSSK',
  'KSSSSSSSSSKKSSSSSSSSSK',
  'KSsSSsSSsSKKSsSSsSSsSK',
  '.KSSSSSSSSKKSSSSSSSSK.',
  '.KSSSSSSSSKKSSSSSSSSK.',
  '..KSSSSSSSKKSSSSSSSK..',
  '...KKSSSSSKKSSSSSKK...',
  '.....KKKKKKKKKKKK.....',
]);
export const HANDS: Record<HandVariant, Grid> = {
  none: blank(),
  up: stack(place(HAND_OPEN, 1, 22), place(mirror(HAND_OPEN), 51, 22)),
  thumb: place(HAND_THUMB, 46, 38),
  peace: place(HAND_PEACE, 46, 28),
  clasp: place(HANDS_CLASP, 21, 45),
};

// ---------- 액세서리 ----------
const HOOP: Grid = rows('acc.hoop', 4, ['.GG.', 'G..G', 'G..G', '.GG.']);
/** 초커: 목 중간 3행 검정 띠 + 금색 펜던트(옷깃과 떨어뜨려 띠로 읽히게). */
const CHOKER: Grid = rows('acc.choker', 12, ['KKKKKKKKKKKK', 'KKKKKWKKKKKK', 'KKKKKKKKKKKK', '.....GG.....', '.....GG.....']);
const CLIP: Grid = rows('acc.clip', 7, ['KKK....', 'KRRKK..', '.KRRRK.', '..KKRRK', '....KKK']);
const RIBBON: Grid = rows('acc.ribbon', 9, [
  '.KK...KK.',
  'KRRK.KRRK',
  'KRRRKRRRK',
  'KRRRWRRRK',
  'KRRK.KRRK',
  '.KK...KK.',
]);
export const ACCESSORY: Record<Accessory, Grid> = {
  earring: stack(place(HOOP, 11, 34), place(HOOP, 49, 34)),
  choker: place(CHOKER, 26, 47),
  galHighlight: stack(place(['WW.WW'], 21, 34), place(['WW.WW'], 38, 34)),
  hairclip: place(CLIP, 14, 11),
  ribbon: stack(place(RIBBON, 2, 17), place(RIBBON, 53, 17)),
};

// ---------- 땀방울(피격) ----------
const DROP: Grid = rows('sweat', 6, ['...K..', '..KOK.', '..KOK.', '.KOOOK', '.KOOOK', 'KOWOOK', 'KOOOOK', '.KKKK.']);
export const SWEAT: Grid = place(DROP, 48, 17);
