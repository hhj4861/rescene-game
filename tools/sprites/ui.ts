// HUD 아이콘 도트 템플릿(하트 목숨·GO 화살표). 역할: K 외곽선  F 내용물  W 반짝임
import type { Grid } from '../pixel-art';

const rowsOf = (name: string, width: number, g: Grid): Grid => {
  g.forEach((r, i) => { if (r.length !== width) throw new Error(`${name} row ${i} has ${r.length} != ${width}`); });
  return g;
};

// ---------- life_<member> 16×16: 멤버 시트 0프레임(40×64)에서 머리를 잘라낸 초상 아이콘 ----------
/** 프레임 좌표: 행 2~17 · 열 12~27(앞머리·눈·입이 들어오는 얼굴 중심). */
export const LIFE_CROP = { x: 12, y: 2, w: 16, h: 16 } as const;

// ---------- hud_heart_full / hud_heart_empty 12×12 ----------
export const HUD_HEART_W = 12;
export const HUD_HEART_H = 12;

const HEART_SHAPE: Grid = rowsOf('hudHeart', HUD_HEART_W, [
  '............',
  '.KK....KK...',
  'KFFK..KFFK..',
  'KFFFKKFFFK..',
  'KFFFFFFFFK..',
  '.KFFFFFFK...',
  '.KFFFFFFK...',
  '..KFFFFK....',
  '..KFFFFK....',
  '...KFFK.....',
  '....KK......',
  '............',
]);

export const HUD_HEART_FULL: { grid: Grid; palette: Record<string, string> } = {
  grid: HEART_SHAPE,
  palette: { K: '#12131c', F: '#f7768e' },
};
export const HUD_HEART_EMPTY: { grid: Grid; palette: Record<string, string> } = {
  grid: HEART_SHAPE.map((r) => r.replace(/F/g, '.')),
  palette: { K: '#414868' },
};

// ---------- hud_go 32×16, 2프레임 ----------
export const GO_W = 32;
export const GO_H = 16;

/** 오른쪽을 가리키는 굵은 화살표를 절차적으로 그린다(막대 + 삼각 머리), 가장자리는 외곽선으로 다듬는다. */
function arrowRows(): string[][] {
  const rows: string[][] = [];
  for (let y = 0; y < GO_H; y++) {
    const row = Array<string>(GO_W).fill('.');
    const dist = Math.abs(y - 7.5);
    if (y >= 5 && y <= 10) for (let x = 2; x < 14; x++) row[x] = 'F';
    const headRight = Math.max(14, Math.round(29 - dist * 3));
    for (let x = 14; x < headRight; x++) row[x] = 'F';
    rows.push(row);
  }
  return rows;
}

function outline(rows: string[][]): string[][] {
  const h = rows.length, w = rows[0]!.length;
  const out = rows.map((r) => [...r]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y]![x] !== 'F') continue;
      const edge = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].some(([ny, nx]) => ny! < 0 || ny! >= h || nx! < 0 || nx! >= w || rows[ny!]![nx!] !== 'F');
      if (edge) out[y]![x] = 'K';
    }
  }
  return out;
}

/** streak: 대각선 반짝임 줄무늬를 F칸 위에만 덧그린다(오프셋만큼 이동해 2프레임을 만든다). */
function withStreak(rows: string[][], offset: number): Grid {
  return rows.map((row, y) => row.map((ch, x) => (ch === 'F' && ((x - y + offset) % 6 + 6) % 6 === 0 ? 'W' : ch)).join(''));
}

export function buildGoFrames(): [Grid, Grid] {
  const outlined = outline(arrowRows());
  return [withStreak(outlined, 0), withStreak(outlined, 3)];
}

export const GO_PALETTE = { K: '#12131c', F: '#9ece6a', W: '#ffffff' };
