// 캐릭터 v2: 3등신 32×64 도트 템플릿(40×64 프레임 아래 가운데 — 소품 여유 4px). 역할 문자:
// K 외곽선  H/h 앞머리·뒷머리(어두운 톤)  S/s 피부·홍조  E 눈  W 하이라이트  m 입  p 혀
// T/t 상의·그늘  U 소매 어깨  L 소매(의상이 T/S/J 로 해석)  B/b 하의·그늘  O 신발  A 포인트  J/j 재킷·그늘
// C 액세서리(멤버 포인트색)  R 리본  G 금색  M 금속  P 나무손잡이  N 잉크(붓끝)
// 머리 0~22행 · 목 23~25 · 몸통 26~41 · 허리·다리 42~63.
import type { Grid } from '../pixel-art';

export const SPRITE_W = 32;
export const SPRITE_H = 64;
/** 합성 캔버스 폭(= 프레임 폭). 몸 그리드는 BODY_X 만큼 오른쪽에 놓인다. */
export const CANVAS_W = 40;
export const BODY_X = 4;

export const rows = (name: string, g: Grid, w = SPRITE_W): Grid => {
  g.forEach((r, i) => { if (r.length !== w) throw new Error(`${name} row ${i} has ${r.length} != ${w}`); });
  return g;
};
export const blank = (n: number, w = SPRITE_W): Grid => Array<string>(n).fill('.'.repeat(w));

/** [y0, y1, x0, x1] 닫힌 구간을 ch 로 채운 그리드(폭 w, 높이 h). */
export type Span = [y0: number, y1: number, x0: number, x1: number];
export function fill(ch: string, spans: Span[], w = SPRITE_W, h = SPRITE_H): Grid {
  const out: string[][] = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  for (const [y0, y1, x0, x1] of spans) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < h && x >= 0 && x < w) out[y]![x] = ch;
  return out.map((r) => r.join(''));
}
/** 투명('.')이면서 4방향 이웃에 내용이 있는 칸을 K 로 채운다(바깥 외곽선). */
export function outlined(g: Grid, k = 'K'): Grid {
  const h = g.length, w = g[0]?.length ?? 0;
  const out = g.map((r) => [...r]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y]![x] !== '.') continue;
    const near = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].some(([ny, nx]) => ny! >= 0 && ny! < h && nx! >= 0 && nx! < w && g[ny!]![nx!] !== '.' && g[ny!]![nx!] !== k);
    if (near) out[y]![x] = k;
  }
  return out.map((r) => r.join(''));
}
/** 지정한 칸을 투명으로 뚫는다(앞머리 갈래 등). */
export function punch(g: Grid, cells: [y: number, x: number][]): Grid {
  const out = g.map((r) => [...r]);
  for (const [y, x] of cells) if (out[y]?.[x] !== undefined) out[y]![x] = '.';
  return out.map((r) => r.join(''));
}
/** 여러 그리드를 순서대로 겹친다('.' 투명). */
export function over(...layers: Grid[]): Grid {
  const h = Math.max(...layers.map((l) => l.length)), w = layers[0]![0]!.length;
  const out: string[][] = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  for (const layer of layers) layer.forEach((row, y) => { for (let x = 0; x < w; x++) if (row[x] !== '.') out[y]![x] = row[x]!; });
  return out.map((r) => r.join(''));
}

/** 얼굴(0~22) + 목(23~25). 눈·입·홍조는 오버레이(EYES/MOUTHS/BLUSH). */
export const FACE: Grid = rows('face', [
  '...........KKKKKKKKKK...........',
  '.........KSSSSSSSSSSSSK.........',
  '........KSSSSSSSSSSSSSSK........',
  '.......KSSSSSSSSSSSSSSSSK.......',
  '......KSSSSSSSSSSSSSSSSSSK......',
  '......KSSSSSSSSSSSSSSSSSSK......',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSSSSSSSK.....',
  '......KSSSSSSSSSSSSSSSSSSK......',
  '......KSSSSSSSSSSSSSSSSSSK......',
  '.......KSSSSSSSSSSSSSSSSK.......',
  '........KSSSSSSSSSSSSSSK........',
  '.........KSSSSSSSSSSSSK.........',
  '...........KKKKKKKKKK...........',
  '............KSSSSSSK............',
  '............KSSSSSSK............',
  '............KSSSSSSK............',
]);
/** 뒷모습용 머리 뒤통수: 얼굴 타원을 앞머리색으로 채운 것. */
export const HEAD_BACK: Grid = FACE.slice(0, 23).map((r) => r.replace(/S/g, 'H'));

/** 몸통 코어 26~41행(어깨선 + 15행). 팔은 poses.ts 가 선으로 그린다. */
export const TORSO_Y = 26;
export const TORSO: Grid = rows('torso', [
  '..........KKKKKKKKKKKK..........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KTTTTTTTTTTTTK.........',
  '.........KttttttttttttK.........',
  '.........KKKKKKKKKKKKK..........',
]);

// ---------- 얼굴 부품 (그리드 좌표) ----------
/** 눈 4×4 상자 왼쪽 위 좌표: 왼눈 x9·오른눈 x19, y12(큰 눈 3×4 + 하이라이트). 오른눈은 좌우 반전. */
export const EYE_Y = 12;
export const EYE_X = { left: 9, right: 19 } as const;
export type EyeStyle = 'open' | 'closed' | 'happy' | 'wink' | 'sparkle';
/** 4×4 상자, 왼쪽 눈 기준(오른쪽 눈은 좌우 반전). */
export const EYES: Record<EyeStyle, Grid> = {
  open:    ['.EEE', '.WEE', '.EEE', '..EE'],
  closed:  ['.E..', '..E.', '..E.', '.E..'],      // 피격 ><
  happy:   ['....', '.EE.', 'E..E', '....'],      // ^ ^
  wink:    ['....', '.EEE', '....', '....'],      // 한쪽만 감음(오른눈에 쓴다)
  sparkle: ['.EEE', '.WEE', '.EEW', '..EE'],      // 반짝(하이라이트 2개)
};
export const flipH = (g: Grid): Grid => g.map((r) => [...r].reverse().join(''));

export type MouthStyle = 'smile' | 'open' | 'big' | 'tongue' | 'pout' | 'wave' | 'grin';
/** 4×4 상자, (14,16)에 붙인다. */
export const MOUTH_POS = { x: 14, y: 16 } as const;
export const MOUTHS: Record<MouthStyle, Grid> = {
  smile:  ['....', '.mm.', '....', '....'],
  open:   ['....', '.mm.', '.mm.', '....'],
  big:    ['KKKK', 'KmmK', 'KmmK', 'KKKK'],
  tongue: ['....', '.mm.', '.mp.', '....'],
  pout:   ['....', 'm..m', '.mm.', '....'],
  wave:   ['....', 'm.m.', '.m.m', '....'],
  grin:   ['....', 'mmmm', '.mm.', '....'],
};
/** 홍조: 16행, 눈 바깥 아래. */
export const BLUSH: Grid = fill('s', [[16, 16, 7, 8], [16, 16, 23, 24]]);

// ---------- 머리 5종 (앞 H / 뒤 h) ----------
export type HairStyle = 'long' | 'bob' | 'wavy' | 'short' | 'twin';
/** 공통 캡(1~10행): 이마를 덮는 앞머리. 옆머리·갈래는 스타일별. */
const CAP: Span[] = [[1, 1, 10, 21], [2, 2, 9, 22], [3, 3, 8, 23], [4, 5, 7, 24], [6, 6, 6, 25]];
export const HAIR: Record<HairStyle, { front: Grid; back: Grid }> = {
  // 원이: 어깨 아래 긴 생머리, 일자 앞머리
  long: {
    front: punch(outlined(fill('H', [...CAP, [7, 10, 5, 26], [8, 24, 4, 5], [8, 24, 26, 27]])), [[10, 9], [10, 13], [10, 18], [10, 22], [11, 9], [11, 22]]),
    back: outlined(fill('h', [[4, 5, 6, 25], [6, 8, 4, 27], [9, 34, 3, 28], [35, 38, 4, 27], [39, 40, 5, 26], [41, 41, 6, 7], [41, 41, 24, 25]])),
  },
  // 리브: 턱선 단발, 안으로 말린 끝, 옆으로 흘린 앞머리
  bob: {
    front: punch(outlined(fill('H', [...CAP, [7, 9, 5, 26], [10, 10, 5, 12], [10, 10, 22, 26], [11, 11, 5, 8], [8, 19, 4, 5], [8, 19, 26, 27], [20, 20, 5, 6], [20, 20, 25, 26], [21, 21, 6, 6], [21, 21, 25, 25]])), [[9, 15], [9, 19], [10, 11], [10, 25]]),
    back: outlined(fill('h', [[4, 5, 6, 25], [6, 8, 4, 27], [9, 21, 3, 28], [22, 22, 4, 27], [23, 23, 5, 26]])),
  },
  // 미나미: 물결 롱헤어, 가르마 없는 옆으로 넘긴 앞머리, 끝이 퍼진다
  wavy: {
    front: punch(outlined(fill('H', [...CAP, [7, 9, 5, 26], [10, 10, 5, 9], [10, 10, 19, 26], [11, 11, 5, 6], [11, 11, 22, 26], [12, 12, 24, 26], [8, 13, 4, 5], [8, 13, 26, 27], [14, 16, 3, 5], [14, 16, 26, 28], [17, 19, 4, 5], [17, 19, 26, 27], [20, 24, 3, 5], [20, 24, 26, 28]])), [[10, 21], [11, 24]]),
    back: outlined(fill('h', [[4, 5, 6, 25], [6, 8, 4, 27], [9, 12, 3, 28], [13, 16, 2, 29], [17, 20, 3, 28], [21, 24, 2, 29], [25, 28, 3, 28], [29, 32, 2, 29], [33, 36, 1, 30], [37, 40, 2, 29], [41, 42, 1, 30], [43, 43, 2, 4], [43, 43, 27, 29]])),
  },
  // 메이: 귀 위 짧은 단발, 삐죽한 앞머리
  short: {
    front: punch(outlined(fill('H', [...CAP, [7, 9, 5, 26], [10, 10, 5, 26], [8, 14, 4, 5], [8, 14, 26, 27], [15, 15, 5, 5], [15, 15, 26, 26]])), [[10, 8], [10, 12], [10, 16], [10, 20], [10, 24], [11, 8], [11, 16], [11, 24]]),
    back: outlined(fill('h', [[4, 5, 6, 25], [6, 8, 4, 27], [9, 15, 3, 28], [16, 16, 4, 27]])),
  },
  // 제나: 트윈테일 + 리본(신라공주), 가운데 살짝 갈라진 앞머리
  twin: {
    front: punch(outlined(fill('H', [...CAP, [7, 10, 5, 26], [8, 11, 4, 5], [8, 11, 26, 27]])), [[10, 15], [10, 16], [9, 15], [9, 16], [11, 15], [11, 16], [10, 9], [10, 22]]),
    back: outlined(fill('h', [[4, 5, 6, 25], [6, 8, 4, 27], [9, 10, 3, 28], [8, 12, 1, 3], [8, 12, 28, 30], [13, 30, 0, 3], [13, 30, 28, 31], [31, 35, 1, 3], [31, 35, 28, 30], [36, 37, 0, 2], [36, 37, 29, 31]])),
  },
};

// ---------- 액세서리 (그리드 좌표, 앞머리 위에 얹는다) ----------
export type Accessory = 'earring' | 'choker' | 'galHighlight' | 'hairclip' | 'ribbon' | 'none';
export const ACCESSORIES: Record<Accessory, Grid> = {
  none: blank(SPRITE_H),
  earring: fill('G', [[18, 18, 4, 4], [18, 18, 27, 27]]),                 // 귀걸이 금색 1px(양쪽)
  choker: fill('K', [[24, 24, 12, 19]]),                                   // 초커 검정 1행
  galHighlight: fill('W', [[16, 16, 11, 11], [16, 16, 20, 20]]),          // 눈 밑 흰 1px×2
  hairclip: fill('C', [[8, 8, 22, 23]]),                                   // 헤어클립 2px
  ribbon: over(outlined(fill('R', [[6, 6, 0, 1], [6, 6, 3, 4], [7, 7, 0, 4], [8, 8, 0, 1], [8, 8, 3, 4], [6, 6, 27, 28], [6, 6, 30, 31], [7, 7, 27, 31], [8, 8, 27, 28], [8, 8, 30, 31]])), fill('W', [[7, 7, 2, 2], [7, 7, 29, 29]])), // 리본 나비 5×3 양쪽
};

// ---------- 소품 (캔버스 좌표 40 폭 · 손 기준 상대 좌표) ----------
export type Prop = 'micstand' | 'handmic' | 'brush' | 'keyring' | 'none';
export interface Placed { grid: Grid; x: number; y: number }
export interface PropSpec {
  /** 대기·걷기: 캔버스 절대 좌표. 없으면 안 그린다. */
  idle?: Placed;
  /** 바닥에 놓인 소품(숨쉬기·기울기 변환에서 제외). */
  grounded?: boolean;
  /** 공격 1·2타: 손 왼쪽 위 기준 상대 좌표(세워 쥔 모양). */
  grip?: Placed;
  /** 공격 3타: 손 기준 상대 좌표(앞으로 휘두른 모양). */
  swing?: Placed;
  /** 대기·걷기 때 앞팔 경로(캔버스 좌표) — 바닥 소품을 잡는 손. */
  idleArm?: [x: number, y: number][];
}
const MIC_STAND_IDLE: Grid = rows('prop.micstand', [
  '.KKK.', 'KMMMK', 'KMMMK', '.KMK.', '.KMK.', ...Array<string>(30).fill('..M..'), '.KMK.', 'KMMMK', 'KKKKK',
], 5);
const MIC_HELD: Grid = rows('prop.micstand.grip', ['.KKK.', 'KMMMK', 'KMMMK', '.KMK.', '.KMK.', '..M..', '..M..', '..M..', '..M..', '..M..', '..M..', '..M..', '..M..', '.KMK.'], 5);
const MIC_SWING: Grid = rows('prop.micstand.swing', ['.............KK', 'KMMMMMMMMMMMKMK', '.............KK'], 15);
const HANDMIC: Grid = rows('prop.handmic', ['.KKK.', 'KMMMK', 'KMWMK', 'KMMMK', '.KKK.', '..K..', '..K..'], 5);
const HANDMIC_SWING: Grid = rows('prop.handmic.swing', ['....KKK', 'KKKKMMK', '....KMK', '....KKK'], 7);
const BRUSH: Grid = rows('prop.brush', ['NNN', 'NNN', '.M.', '.P.', '.P.', '.P.', '.P.', '.P.', '.P.', '.P.'], 3);
const BRUSH_SWING: Grid = rows('prop.brush.swing', ['.........NNN', 'PPPPPPPPMNNN', '.........NNN'], 12);
const KEYRING: Grid = rows('prop.keyring', ['M.', 'M.', 'CW', 'CC'], 2);
const KEYRING_HELD: Grid = rows('prop.keyring.grip', ['.M.', '.M.', 'CWC', 'CCC'], 3);
const KEYRING_SWING: Grid = rows('prop.keyring.swing', ['.....CWC', 'MMMMMCCC', '.....CCC'], 8);
export const PROPS: Record<Prop, PropSpec> = {
  micstand: { idle: { grid: MIC_STAND_IDLE, x: 35, y: 26 }, grounded: true, idleArm: [[27, 28], [33, 33]], grip: { grid: MIC_HELD, x: -1, y: -9 }, swing: { grid: MIC_SWING, x: 1, y: 0 } },
  handmic: { idle: { grid: HANDMIC, x: -1, y: -5 }, grip: { grid: HANDMIC, x: -1, y: -5 }, swing: { grid: HANDMIC_SWING, x: 2, y: -1 } },
  brush: { idle: { grid: BRUSH, x: 0, y: -8 }, grip: { grid: BRUSH, x: 0, y: -8 }, swing: { grid: BRUSH_SWING, x: 2, y: 0 } },
  keyring: { idle: { grid: KEYRING, x: 27, y: 42 }, grounded: false, grip: { grid: KEYRING_HELD, x: 0, y: 3 }, swing: { grid: KEYRING_SWING, x: 2, y: 0 } },
  none: {},
};

export interface MemberLook {
  hair: HairStyle;
  hairColor: [string, string];
  /** 연습복 상의(멤버 컬러)와 그늘. C1 초상화가 그대로 읽는다. */
  top: string;
  topShade: string;
  prop: Prop;
  accessory: Accessory;
  /** 액세서리 포인트색(C 역할). */
  accent: string;
}

/** 멤버별 외형. 얼굴을 닮게 그리지 않고 머리 모양·포인트 컬러·소품·액세서리로 구분한다. */
export const LOOKS: Record<string, MemberLook> = {
  woni:   { hair: 'long',  hairColor: ['#2b2330', '#3d3345'], top: '#0f9d6e', topShade: '#0b7452', prop: 'micstand', accessory: 'earring',      accent: '#f2c14e' },
  liv:    { hair: 'bob',   hairColor: ['#f3b4c6', '#d98aa3'], top: '#ff8fb1', topShade: '#d96e91', prop: 'handmic',  accessory: 'choker',       accent: '#12131c' },
  minami: { hair: 'wavy',  hairColor: ['#d9a25b', '#b5813f'], top: '#ffd166', topShade: '#d9ad4a', prop: 'brush',    accessory: 'galHighlight', accent: '#ffffff' },
  may:    { hair: 'short', hairColor: ['#4a3327', '#5d4436'], top: '#ff9e64', topShade: '#d97f4b', prop: 'keyring',  accessory: 'hairclip',     accent: '#7dcfff' },
  zena:   { hair: 'twin',  hairColor: ['#1f1a24', '#312a3a'], top: '#bb9af7', topShade: '#957ad1', prop: 'none',     accessory: 'ribbon',       accent: '#f7768e' },
};

/** 공통 팔레트(멤버·의상 색은 위에 덮는다). */
export const BASE_PALETTE: Record<string, string> = {
  K: '#12131c', S: '#f2cfb3', s: '#f0a3a3', E: '#12131c', W: '#ffffff', m: '#c8465f', p: '#ff8fb1',
  M: '#9aa3c7', G: '#f2c14e', P: '#a0522d', N: '#12131c', R: '#f7768e',
  B: '#2c3150', b: '#22263f', O: '#e6e0ff', A: '#ffffff',
};
