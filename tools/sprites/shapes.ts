// 마스크 기반 도트 생성 유틸(2차 플랜 신규 잡몹·보스·오브젝트용).
// 생성자가 폭·높이를 보장하므로(각 행을 항상 w칸 순회) rows() 같은 수동 검증이 필요 없다.
import { pasteGrid, shiftGrid, type Grid } from '../pixel-art';

export type Mask = boolean[][];

export const emptyMask = (w: number, h: number): Mask => Array.from({ length: h }, () => Array<boolean>(w).fill(false));

/** 캔버스(w×h) 안 (cx,cy) 중심, 반지름 (rx,ry)의 채운 타원. */
export function ellipseMask(w: number, h: number, cx: number, cy: number, rx: number, ry: number): Mask {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      return nx * nx + ny * ny <= 1;
    }),
  );
}

/** 캔버스(w×h) 안 (x,y)에서 (rw×rh) 채운 사각형. corner>0이면 네 모서리를 대각선으로 깎는다. */
export function rectMask(w: number, h: number, x: number, y: number, rw: number, rh: number, corner = 0): Mask {
  const m = emptyMask(w, h);
  for (let ry = 0; ry < rh; ry++) {
    const gy = y + ry;
    if (gy < 0 || gy >= h) continue;
    for (let rx = 0; rx < rw; rx++) {
      const gx = x + rx;
      if (gx < 0 || gx >= w) continue;
      if (corner > 0) {
        const left = rx, right = rw - 1 - rx, top = ry, bottom = rh - 1 - ry;
        if (left < corner && top < corner && left + top < corner - 1) continue;
        if (right < corner && top < corner && right + top < corner - 1) continue;
        if (left < corner && bottom < corner && left + bottom < corner - 1) continue;
        if (right < corner && bottom < corner && right + bottom < corner - 1) continue;
      }
      m[gy]![gx] = true;
    }
  }
  return m;
}

/** (xTop,yTop)에서 (xBottom,yBottom)까지 두께 thickness의 직선(안테나·다리·지퍼 줄 등). */
export function lineMask(w: number, h: number, xTop: number, yTop: number, xBottom: number, yBottom: number, thickness: number): Mask {
  const m = emptyMask(w, h);
  const steps = Math.max(1, Math.abs(yBottom - yTop));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = Math.round(yTop + (yBottom - yTop) * t);
    const cx = Math.round(xTop + (xBottom - xTop) * t);
    for (let dx = -Math.floor(thickness / 2); dx < Math.ceil(thickness / 2); dx++) {
      const x = cx + dx;
      if (x >= 0 && x < w && y >= 0 && y < h) m[y]![x] = true;
    }
  }
  return m;
}

export function unionMask(...masks: Mask[]): Mask {
  const h = masks[0]!.length, w = masks[0]![0]!.length;
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => masks.some((m) => m[y]![x])));
}

export function subtractMask(a: Mask, b: Mask): Mask {
  return a.map((row, y) => row.map((v, x) => v && !b[y]![x]));
}

/** 마스크 → 그리드. 채워진 칸 중 상하좌우 이웃이 비었으면 outline, 아니면 fill(같은 문자를 주면 단색). */
export function shapeFromMask(mask: Mask, fill: string, outline: string): Grid {
  const h = mask.length, w = mask[0]!.length;
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      if (!mask[y]![x]) { row += '.'; continue; }
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !mask[y - 1]![x] || !mask[y + 1]![x] || !mask[y]![x - 1] || !mask[y]![x + 1];
      row += edge ? outline : fill;
    }
    out.push(row);
  }
  return out;
}

/** 여러 전체 캔버스 크기 그리드를 순서대로 덮어 합성한다('.'은 투명, 뒤가 앞을 덮는다). */
export function layer(base: Grid, ...overlays: Grid[]): Grid {
  return overlays.reduce((g, o) => pasteGrid(g, o, 0, 0), base);
}

/** 세로로 dy만큼 민다(양수=아래). 가로 shiftGrid의 세로판. 빈 곳은 투명. */
export function shiftVertical(grid: Grid, dy: number): Grid {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const blank = '.'.repeat(w);
  return Array.from({ length: h }, (_, y) => {
    const sy = y - dy;
    return sy >= 0 && sy < h ? grid[sy]! : blank;
  });
}

/** 대기2(세로 숨쉬기)·이동2(좌우 기울임) 4프레임을 만드는 기본 패턴. */
export function wobbleFrames(base: Grid): Grid[] {
  return [base, shiftVertical(base, 1), shiftGrid(base, -1), shiftGrid(base, 1)];
}

const DIGIT_FONT: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

/** 숫자 문자열을 3×5 도트 폰트로 그린 그리드(높이 5, 폭 4n-1). */
export function digitsGrid(text: string, color: string): Grid {
  const rows: string[] = Array.from({ length: 5 }, () => '');
  for (let i = 0; i < text.length; i++) {
    const glyph = DIGIT_FONT[text[i]!] ?? DIGIT_FONT['0']!;
    for (let y = 0; y < 5; y++) rows[y] += [...glyph[y]!].map((c) => (c === '1' ? color : '.')).join('') + (i < text.length - 1 ? '.' : '');
  }
  return rows;
}
