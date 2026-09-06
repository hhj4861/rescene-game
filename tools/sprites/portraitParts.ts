// 초상화(64×64) 합성 부품. 얼굴·머리 덩어리는 마스크(shapes.ts)로 만들고, 눈·입·손·액세서리는 손으로 그린 역할 문자 그리드다.
// 역할 문자: K 외곽선  S/s 피부·그늘  p 볼터치  H 앞머리  N 뒷머리  L 머리 윤기  T/t 상의·그늘
//           I/i 눈동자·동공  W 하이라이트  D 입 안  R 혀·리본  G 금속(귀걸이·클립)  O 땀방울
import { pasteGrid, type Grid } from '../pixel-art';
import { ellipseMask, rectMask, shapeFromMask, subtractMask, unionMask, type Mask } from './shapes';
import { PORTRAIT_FRAME } from '../../src/core/spriteFrames';

export const PW = PORTRAIT_FRAME.width;
export const PH = PORTRAIT_FRAME.height;

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

function faceGrid(variant: FaceVariant): Grid {
  const head = unionMask(SKULL, JAW, EARS, NECK, ...(variant === 'puff' ? [CHEEKS] : []));
  let g = stack(shapeFromMask(SHOULDERS, 'T', 'K'), shapeFromMask(head, 'S', 'K'));
  g = paint(g, Rc(0, 52, PW, 4), 't', 'T');            // 어깨 위 그늘
  g = pasteGrid(g, ['ssssssssss', 'ssssssssss'], 27, 47); // 턱 아래 목 그늘
  g = pasteGrid(g, ['s', 's', 's'], 13, 30);              // 귓바퀴
  g = pasteGrid(g, ['s', 's', 's'], 50, 30);
  g = pasteGrid(g, ['.s', 's.'], 31, 36);                 // 코
  return g;
}
export const FACE: Record<FaceVariant, Grid> = { normal: faceGrid('normal'), puff: faceGrid('puff') };

// ---------- 머리 ----------
/** 앞머리·뒷머리 공통 머리통(얼굴보다 2~3px 크다): 가로 11..52, 세로 3..43. */
const CROWN = E(31.5, 23, 20.5, 20.5);
/** 앞머리 윤기(정수리 호). */
const SHEEN = clip(subtractMask(E(31.5, 24, 17.5, 17), E(31.5, 25.5, 16, 16)), (x, y) => y >= 6 && y <= 12 && x >= 18 && x <= 45);
const tri = (v: number, period: number, amp: number): number => {
  const t = ((v % period) + period) % period;
  const half = period / 2;
  return Math.round((t < half ? t / half : (period - t) / half) * amp);
};
const inFace = (x: number): boolean => x >= 13 && x <= 50;

/** 앞머리 아래 가장자리(x → 마지막 머리 행). 얼굴 밖은 머리통 전체. */
const FRINGE: Record<HairStyle, (x: number) => number> = {
  long: (x) => (inFace(x) ? 18 + (x % 6 < 3 ? 0 : 1) : PH),                       // 일자 앞머리
  bob: (x) => (inFace(x) ? Math.round(20 - ((x - 31.5) / 17.5) ** 2 * 4) - (x % 5 === 0 ? 1 : 0) : PH), // 둥근 시스루 뱅
  wavy: (x) => (inFace(x) ? Math.min(20, Math.round(12 + (x - 13) * 0.25)) + (x % 4 === 3 ? 1 : 0) : PH), // 옆으로 넘긴 앞머리
  short: (x) => (inFace(x) ? 16 + tri(x + 2, 8, 3) : PH),                          // 삐죽한 짧은 앞머리
  twin: (x) => (inFace(x) ? Math.max(12, 19 - Math.max(0, 5 - Math.abs(x - 31.5)) * 1.6) | 0 : PH), // 가운데 가르마
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

function hairFront(style: HairStyle): Grid {
  const fringe = FRINGE[style];
  const mask = unionMask(clip(CROWN, (x, y) => y <= fringe(x)), SIDE_LOCKS[style]);
  let g = shapeFromMask(mask, 'H', 'K');
  g = paint(g, SHEEN, 'L', 'H');
  return g;
}
function hairBack(style: HairStyle): Grid {
  return shapeFromMask(BACK_MASS[style], 'N', 'K');
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
const EYE_OPEN: Grid = rows('eye.open', 8, [
  '..KKKK..',
  '.KKKKKK.',
  'KKWWIIIK',
  'KIWWIiIK',
  'KIIIiiiK',
  'KIIIiiiK',
  'KIIIIIIK',
  '.KIIIWK.',
  '..KKKK..',
]);
const EYE_CLOSED: Grid = rows('eye.closed', 8, [
  '........',
  '........',
  '........',
  '..KKKK..',
  '.KK..KK.',
  'KK....KK',
  '........',
  '........',
  '........',
]);
const EYE_SPARKLE: Grid = rows('eye.sparkle', 8, [
  '..KKKK..',
  '.KKKKKK.',
  'KKWWIIIK',
  'KIWWIWIK',
  'KIIIWWWK',
  'KIIIIWIK',
  'KIIIIIIK',
  '.KIWIIK.',
  '..KKKK..',
]);
const EYE_SQUINT: Grid = rows('eye.squint', 8, [
  '........',
  'KK......',
  '.KK.....',
  '..KK....',
  '...KK...',
  '..KK....',
  '.KK.....',
  'KK......',
  '........',
]);
const EYE_FLAT: Grid = rows('eye.flat', 8, [
  '........',
  '........',
  '........',
  'KKKKKKKK',
  'KWIIiIIK',
  'KIIIiiIK',
  'KIIIIIIK',
  '.KIIIIK.',
  '..KKKK..',
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
const BROW_NORMAL: Grid = rows('brow.normal', 7, ['.......', '..KKKK.', '.KK..KK']);
const BROW_DOWN: Grid = rows('brow.down', 7, ['KK.....', '.KKKK..', '....KKK']);
const BROW_WORRIED: Grid = rows('brow.worried', 7, ['.....KK', '..KKKK.', 'KKK....']);
const brows = (g: Grid): Grid => stack(place(g, 19, 21), place(mirror(g), 38, 21));
export const BROWS: Record<BrowVariant, Grid> = { normal: brows(BROW_NORMAL), down: brows(BROW_DOWN), worried: brows(BROW_WORRIED) };

// ---------- 입 ----------
const MOUTH_SMILE: Grid = rows('mouth.smile', 8, ['K......K', '.K....K.', '..KKKK..']);
const MOUTH_OPEN: Grid = rows('mouth.open', 10, [
  '..KKKKKK..',
  '.KWWWWWWK.',
  'KDDDDDDDDK',
  'KDDDDDDDDK',
  'KDRRRRRRDK',
  '.KRRRRRRK.',
  '..KKKKKK..',
]);
const MOUTH_TONGUE: Grid = rows('mouth.tongue', 10, [
  'K........K',
  '.KK....KK.',
  '..KKKKKK..',
  '...KRRRK..',
  '...KRRRK..',
  '....KKK...',
]);
const MOUTH_POUT: Grid = rows('mouth.pout', 6, ['..KK..', '.KDDK.', '.KDDK.', '..KK..']);
const MOUTH_PUFF: Grid = rows('mouth.puff', 6, ['KK....', '..KKK.', 'KK....']);
const MOUTH_WAVE: Grid = rows('mouth.wave', 10, ['.KK....KK.', 'K..K..K..K', '....KK....']);
export const MOUTH: Record<MouthVariant, Grid> = {
  smile: place(MOUTH_SMILE, 28, 39),
  open: place(MOUTH_OPEN, 27, 37),
  tongue: place(MOUTH_TONGUE, 27, 39),
  pout: place(MOUTH_POUT, 29, 38),
  puff: place(MOUTH_PUFF, 29, 39),
  wave: place(MOUTH_WAVE, 27, 39),
};

// ---------- 볼터치 ----------
const BLUSH_LEFT: Grid = rows('blush', 5, ['p.p.p', '.p.p.']);
export const BLUSH: Grid = stack(place(BLUSH_LEFT, 18, 35), place(BLUSH_LEFT, 41, 35));

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
/** 브이(오른손, 손가락 사이를 넓게) 14×17. */
const HAND_PEACE: Grid = rows('hand.peace', 14, [
  '.KK......KK...',
  'KSSK....KSSK..',
  'KSSK....KSSK..',
  'KSSK...KSSK...',
  'KSSK...KSSK...',
  '.KSSK.KSSK....',
  '.KSSKKSSK.....',
  '.KSSSSSSKKK...',
  '.KSSSSSSSSSK..',
  '.KSSSSSSSSSK..',
  '.KSsSSsSSSSK..',
  '.KSSSSSSSSSK..',
  '.KSsSSsSSSSK..',
  '.KSSSSSSSSSK..',
  '..KSSSSSSSSK..',
  '..KSSSSSSSK...',
  '...KKKKKKK....',
]);
/** 두 손 모음(턱 아래에서 두 주먹을 맞댄 모양, 손가락 마디가 위) 22×12. */
const HANDS_CLASP: Grid = rows('hand.clasp', 22, [
  '..KK.KK.KK..KK.KK.KK..',
  '.KSSKSSKSSKKSSKSSKSSK.',
  '.KSSKSSKSSKKSSKSSKSSK.',
  'KSSSSSSSSSKKSSSSSSSSSK',
  'KSSSSSSSSSKKSSSSSSSSSK',
  'KSSSSSSSSSKKSSSSSSSSSK',
  'KSSSSSSSSSKKSSSSSSSSSK',
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
  peace: place(HAND_PEACE, 47, 28),
  clasp: place(HANDS_CLASP, 21, 47),
};

// ---------- 액세서리 ----------
const HOOP: Grid = rows('acc.hoop', 4, ['.GG.', 'G..G', 'G..G', '.GG.']);
const CHOKER: Grid = rows('acc.choker', 12, ['KKKKKKKKKKKK', 'KKKKKKKKKKKK', '.....GG.....']);
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
  choker: place(CHOKER, 26, 49),
  galHighlight: stack(place(['W.W'], 22, 34), place(['W.W'], 39, 34)),
  hairclip: place(CLIP, 14, 11),
  ribbon: stack(place(RIBBON, 2, 17), place(RIBBON, 53, 17)),
};

// ---------- 땀방울(피격) ----------
const DROP: Grid = rows('sweat', 5, ['..K..', '.KOK.', '.KOK.', 'KOOOK', 'KOWOK', '.KKK.']);
export const SWEAT: Grid = place(DROP, 47, 19);
