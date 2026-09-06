// 하트 음식(멤버 시그니처)·카드·상자 도트 템플릿.
// 역할: K 외곽선  C 그릇/카드면  F 내용물  X/Y 고명·포인트  M 금속  P/p 뚜껑  B/b 상자  G/g 광채  W 반짝임 하이라이트
import type { Grid } from '../pixel-art';

const put = (grid: Grid, ch: string, [y, x]: [number, number]): Grid => grid.map((r, ry) => (ry === y ? r.slice(0, x) + ch + r.slice(x + 1) : r));
const putAll = (grid: Grid, ch: string, points: [number, number][]): Grid => points.reduce((g, p) => put(g, ch, p), grid);

const rowsOf = (name: string, width: number, g: Grid): Grid => {
  g.forEach((r, i) => { if (r.length !== width) throw new Error(`${name} row ${i} has ${r.length} != ${width}`); });
  return g;
};

// ---------- 하트 음식 16×16 ----------
export const HEART_W = 16;
export const HEART_H = 16;

/** 국물 음식 공통 실루엣(그릇). */
const BOWL: Grid = rowsOf('bowl', HEART_W, [
  '................',
  '................',
  '....KKKKKKKK....',
  '...KCCCCCCCCK...',
  '..KCFFFFFFFFCK..',
  '..KFFFFFFFFFFK..',
  '..KFFFFFFFFFFK..',
  '..KFFFFFFFFFFK..',
  '...KFFFFFFFFK...',
  '....KKKKKKKK....',
  '.....KCCCCK.....',
  '......KCCK......',
  '................',
  '................',
  '................',
  '................',
]);

/** 하이라이트가 (5,10)→(5,11)로 한 칸 움직이는 반짝임 2프레임. */
export const sparkleFrames = (base: Grid): [Grid, Grid] => [put(base, 'W', [5, 10]), put(base, 'W', [5, 11])];

export interface HeartFood {
  base: Grid;
  palette: Record<string, string>;
}

const KC = { K: '#12131c', C: '#f4f1f7', W: '#ffffff' };

/** 멤버 시그니처 음식. 얼굴을 그리지 않고 색·고명으로만 구분한다. */
export const HEART_FOODS: Record<string, HeartFood> = {
  // 원이 — 물회(차가운 매운 회무침 국물) + 얼음 고명
  woni: { base: putAll(BOWL, 'X', [[4, 5], [7, 9]]), palette: { ...KC, F: '#e0464f', X: '#bfe6ff' } },
  // 리브 — 엽떡(깻잎 얹은 매운 떡볶이) + 깻잎 고명
  liv: { base: putAll(BOWL, 'X', [[4, 9], [7, 6]]), palette: { ...KC, F: '#ff6b4a', X: '#4f9d4f' } },
  // 미나미 — 떡국(대파·달걀 고명)
  minami: { base: putAll(putAll(BOWL, 'X', [[4, 6]]), 'Y', [[7, 10]]), palette: { ...KC, F: '#f2ede0', X: '#7fbf5f', Y: '#ffd166' } },
  // 메이 — 설렁탕(대파 고명)
  may: { base: putAll(BOWL, 'X', [[7, 8]]), palette: { ...KC, F: '#efe6d8', X: '#7fbf5f' } },
  // 제나 — 간식(약과) + 깨 고명
  zena: { base: putAll(BOWL, 'Y', [[4, 6], [4, 10]]), palette: { ...KC, F: '#c98a3e', Y: '#fff3d6' } },
};

export function heartFrames(food: HeartFood): [Grid, Grid] {
  return sparkleFrames(food.base);
}

// ---------- item_card 16×20, 2프레임(반짝임) ----------
export const CARD_W = 16;
export const CARD_H = 20;

const cardFace = '.KCCCCCCCCCCCCK.';
const CARD_BASE: Grid = rowsOf('card', CARD_W, [
  '................',
  '..KKKKKKKKKKKK..',
  ...Array<string>(16).fill(cardFace),
  '..KKKKKKKKKKKK..',
  '................',
]);
const CARD_WITH_STAR: Grid = putAll(CARD_BASE, 'A', [
  [7, 7],
  [8, 6], [8, 7], [8, 8],
  [9, 5], [9, 6], [9, 7], [9, 8], [9, 9],
  [10, 6], [10, 7], [10, 8],
  [11, 7],
]);
export const CARD_PALETTE = { K: '#12131c', C: '#5a4fcf', A: '#ffd166', W: '#ffffff' };
export const CARD_FRAMES: [Grid, Grid] = [put(CARD_WITH_STAR, 'W', [4, 3]), put(CARD_WITH_STAR, 'W', [4, 12])];

// ---------- item_chest 24×20, 2프레임(닫힘/열림) ----------
export const CHEST_W = 24;
export const CHEST_H = 20;

const border = (): string => '..' + 'K'.repeat(20) + '..';
const boxRow = (fill: string): string => '..K' + fill.repeat(18) + 'K..';
const blankRow = (): string => '.'.repeat(CHEST_W);

const CHEST_CLOSED_BASE: Grid = rowsOf('chest.closed', CHEST_W, [
  ...Array<string>(5).fill(blankRow()),
  border(),
  boxRow('P'), boxRow('P'), boxRow('p'),
  border(),
  boxRow('B'), boxRow('B'), boxRow('B'), boxRow('b'), boxRow('B'), boxRow('B'), boxRow('B'), boxRow('b'),
  border(),
  blankRow(),
]);
export const CHEST_CLOSED: Grid = putAll(CHEST_CLOSED_BASE, 'M', [[8, 11], [8, 12], [9, 11], [9, 12], [10, 11], [10, 12]]);

export const CHEST_OPEN: Grid = rowsOf('chest.open', CHEST_W, [
  ...Array<string>(2).fill(blankRow()),
  border(),
  boxRow('P'), boxRow('p'),
  blankRow(),
  border(),
  boxRow('G'), boxRow('G'), boxRow('g'),
  boxRow('B'), boxRow('B'), boxRow('B'), boxRow('b'), boxRow('B'), boxRow('B'), boxRow('B'), boxRow('b'),
  border(),
  blankRow(),
]);

export const CHEST_FRAMES: [Grid, Grid] = [CHEST_CLOSED, CHEST_OPEN];
export const CHEST_PALETTE = {
  K: '#12131c', P: '#b98a52', p: '#8f6238', M: '#e0af68',
  B: '#a0522d', b: '#7a3f22', G: '#ffd166', g: '#e0af68',
};
