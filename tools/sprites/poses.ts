// 포즈: 다리(스타일 × 자세)를 절차적으로 그리고, 팔은 어깨에서 시작하는 선(2px 굵기 + 외곽선)으로 그린다.
// 좌표는 40 폭 캔버스 기준(몸 그리드 x + BODY_X). 앞팔 어깨 (27,28) · 뒷팔 어깨 (11,28).
import type { Grid } from '../pixel-art';
import type { MemberId } from '../../src/systems/types';
import { BODY_X, CANVAS_W, EYES, SPRITE_H, SPRITE_W, blank, fill, outlined, over, type EyeStyle, type MouthStyle } from './templates';
import type { BottomStyle } from './outfits';

// ---------- 다리 ----------
export type LegPose = 'stand' | 'strideA' | 'strideB' | 'tuck' | 'wide' | 'lunge' | 'kick';
interface LegColumn { x0: number; slant: number; top?: number; bottom?: number }
const LEG_POSES: Record<LegPose, [LegColumn, LegColumn]> = {
  stand:   [{ x0: 10, slant: 0 }, { x0: 16, slant: 0 }],
  strideA: [{ x0: 10, slant: -3, bottom: 62 }, { x0: 16, slant: 3 }],
  strideB: [{ x0: 10, slant: 3 }, { x0: 16, slant: -3, bottom: 62 }],
  tuck:    [{ x0: 10, slant: 0, bottom: 57 }, { x0: 16, slant: 0, bottom: 57 }],
  wide:    [{ x0: 10, slant: -3 }, { x0: 16, slant: 3 }],
  lunge:   [{ x0: 10, slant: -2 }, { x0: 16, slant: 5 }],
  kick:    [{ x0: 10, slant: 0 }, { x0: 16, slant: 8, bottom: 56 }],
};
export const LEGS_TOP = 46;
const WAIST_Y = 42;

/** 다리 한 줄(6 폭: K + 4 + K)을 위에서 아래로 기울여 그린다. 스타일별 채움: 바지 B · 치마·쇼츠는 피부. */
function legColumn(out: string[][], col: LegColumn, style: BottomStyle): void {
  const top = col.top ?? LEGS_TOP, bottom = col.bottom ?? SPRITE_H - 1;
  for (let y = top; y <= bottom; y++) {
    const dx = Math.round((col.slant * (y - top)) / (SPRITE_H - 1 - LEGS_TOP));
    const x = col.x0 + dx;
    let ch: string;
    if (y === bottom) ch = 'K';
    else if (y >= bottom - 3) ch = 'O';
    else if (y === bottom - 4) ch = 'K';
    else if (style === 'pants') ch = y === bottom - 5 ? 'b' : 'B';
    else if (style === 'shorts') ch = y <= top + 4 ? (y === top + 4 ? 'b' : 'B') : 'S';
    else ch = 'S';
    for (let i = 0; i < 6; i++) {
      const tx = x + i;
      if (tx < 0 || tx >= SPRITE_W) continue;
      out[y]![tx] = i === 0 || i === 5 ? 'K' : ch;
    }
  }
}

/** 허리(42~45) + 다리(46~63) 그리드(그리드 좌표, 전체 높이). */
export function legsGrid(style: BottomStyle, pose: LegPose): Grid {
  const out: string[][] = blank(SPRITE_H).map((r) => [...r]);
  const [l, r] = LEG_POSES[pose];
  legColumn(out, l, style);
  legColumn(out, r, style);
  const grid = out.map((row) => row.join(''));
  if (style === 'skirt') {
    // 허리에서 퍼지는 A라인 스커트(42~51행)
    const skirt = over(outlined(fill('B', [[WAIST_Y, WAIST_Y + 1, 10, 21], [WAIST_Y + 2, WAIST_Y + 3, 9, 22], [WAIST_Y + 4, WAIST_Y + 5, 8, 23], [WAIST_Y + 6, WAIST_Y + 7, 7, 24], [WAIST_Y + 8, WAIST_Y + 8, 6, 25]])), fill('b', [[WAIST_Y + 8, WAIST_Y + 8, 6, 25]]));
    return over(grid, skirt);
  }
  const band = over(outlined(fill('B', [[WAIST_Y, WAIST_Y + 3, 10, 21]])), fill('b', [[WAIST_Y + 3, WAIST_Y + 3, 10, 21]]));
  // 허리띠 아래 외곽선은 다리와 이어지므로 지운다
  const bandOpen = band.map((row, y) => (y === WAIST_Y + 4 ? row.replace(/K/g, '.') : row));
  return over(grid, bandOpen);
}

// ---------- 팔 ----------
export type Path = [x: number, y: number][];
export type HandStyle = 'fist' | 'open' | 'peace' | 'thumb' | 'none';
export interface ArmSpec { path: Path; hand?: HandStyle }
export const SHOULDER = { front: [27, 28] as [number, number], back: [11, 28] as [number, number] };

const sgn = (n: number): number => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** 팔 레이어(40×64)와 손 왼쪽 위 좌표. 어깨 근처 3점은 U(소매 어깨), 나머지 L(소매/피부), 손은 S. */
export function armLayer(spec: ArmSpec): { grid: Grid; hand: [number, number] } {
  const out: string[][] = blank(SPRITE_H, CANVAS_W).map((r) => [...r]);
  const stamp = (x: number, y: number, ch: string, w = 2, h = 2): void => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const tx = x + dx, ty = y + dy;
      if (tx >= 0 && tx < CANVAS_W && ty >= 0 && ty < SPRITE_H) out[ty]![tx] = ch;
    }
  };
  let idx = 0;
  const pts = spec.path;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!, [x1, y1] = pts[i]!;
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
      stamp(x, y, idx < 3 ? 'U' : 'L');
      idx++;
    }
  }
  const [ex, ey] = pts[pts.length - 1]!;
  const [px, py] = pts.length > 1 ? pts[pts.length - 2]! : [ex, ey];
  const sx = sgn(ex - px), sy = sgn(ey - py);
  const hx = sx > 0 ? ex + 1 : sx < 0 ? ex - 2 : ex - 1;
  const hy = sy > 0 ? ey + 1 : sy < 0 ? ey - 2 : ey - 1;
  const hand = spec.hand ?? 'fist';
  if (hand !== 'none') {
    stamp(hx, hy, 'S', 3, 3);
    if (hand === 'peace') { stamp(hx, hy - 2, 'S', 1, 2); stamp(hx + 2, hy - 2, 'S', 1, 2); }
    if (hand === 'thumb') stamp(sx >= 0 ? hx : hx + 2, hy - 3, 'S', 1, 3);
    if (hand === 'open') { stamp(hx - 1, hy, 'S', 1, 2); stamp(hx + 3, hy, 'S', 1, 2); stamp(hx, hy - 1, 'S', 3, 1); }
  }
  return { grid: outlined(out.map((r) => r.join(''))), hand: [hx, hy] };
}

// ---------- 포즈 명세 ----------
export interface PoseSpec {
  front: ArmSpec;
  back: ArmSpec;
  legs: LegPose;
  eyes?: EyeStyle;
  /** 오른눈만 다르게(윙크). */
  eyesRight?: EyeStyle;
  mouth?: MouthStyle;
  /** 상체(0~41행)를 오른쪽(양수)으로 기울인다. */
  lean?: number;
  /** 상체를 아래로 내린다(숨쉬기). */
  sink?: number;
  prop?: 'idle' | 'grip' | 'swing' | 'none';
  /** 바닥 소품(마이크 스탠드)이 있으면 앞팔이 그것을 잡는다(PROPS.idleArm). */
  holdProp?: boolean;
  /** 뒷모습(회전): 얼굴 대신 뒤통수. */
  backView?: boolean;
  /** 효과(캔버스 좌표 40 폭). */
  fx?: Grid;
}

const F = SHOULDER.front, B = SHOULDER.back;
const down = (s: [number, number], dx = 0): ArmSpec => ({ path: [s, [s[0] + dx, s[1] + 9]] });

export const POSES: Record<'idle' | 'breathe' | 'walkA' | 'pass' | 'walkB' | 'jump' | 'attack1' | 'attack2' | 'attack3' | 'hurt', PoseSpec> = {
  idle:    { front: down(F), back: down(B), legs: 'stand', prop: 'idle', holdProp: true },
  breathe: { front: down(F), back: down(B), legs: 'stand', prop: 'idle', sink: 1, holdProp: true },
  walkA:   { front: { path: [F, [30, 35]] }, back: { path: [B, [9, 35]] }, legs: 'strideA', prop: 'idle', holdProp: true },
  pass:    { front: down(F), back: down(B), legs: 'stand', prop: 'idle', sink: 1, holdProp: true },
  walkB:   { front: { path: [F, [26, 36]] }, back: { path: [B, [12, 36]] }, legs: 'strideB', prop: 'idle', holdProp: true },
  jump:    { front: { path: [F, [32, 18]], hand: 'open' }, back: { path: [B, [6, 18]], hand: 'open' }, legs: 'tuck', mouth: 'open', prop: 'none' },
  attack1: { front: { path: [F, [33, 31]] }, back: { path: [B, [9, 36]] }, legs: 'stand', prop: 'grip', mouth: 'open' },
  attack2: { front: { path: [F, [34, 23]] }, back: { path: [B, [8, 34]] }, legs: 'strideA', prop: 'grip', lean: 1, mouth: 'open' },
  attack3: { front: { path: [F, [37, 28]] }, back: { path: [B, [5, 32]] }, legs: 'lunge', prop: 'swing', lean: 2, mouth: 'big', fx: fill('W', [[20, 20, 36, 37], [23, 23, 38, 39], [33, 33, 38, 39]], CANVAS_W, SPRITE_H) },
  hurt:    { front: { path: [F, [24, 36]], hand: 'open' }, back: { path: [B, [7, 33]], hand: 'open' }, legs: 'stand', eyes: 'closed', mouth: 'wave', lean: -1, prop: 'none' },
};

/** 개인기(대기 6초): 원이 팔짱 · 리브 머리 넘기기 · 미나미 피스 · 메이 손 모으기 · 제나 헤어핀(리본) 만지기. */
export const FLOURISH: Record<MemberId, PoseSpec> = {
  woni:   { front: { path: [F, [27, 34], [16, 34]], hand: 'none' }, back: { path: [B, [11, 31], [22, 31]], hand: 'none' }, legs: 'stand', eyes: 'happy', mouth: 'smile', prop: 'idle' },
  liv:    { front: { path: [F, [33, 22], [31, 13]], hand: 'open' }, back: down(B), legs: 'stand', eyesRight: 'wink', mouth: 'smile', prop: 'none' },
  minami: { front: { path: [F, [32, 22], [30, 19]], hand: 'peace' }, back: down(B), legs: 'stand', eyes: 'happy', mouth: 'tongue', prop: 'none' },
  may:    { front: { path: [F, [22, 34]] }, back: { path: [B, [17, 34]] }, legs: 'stand', eyes: 'sparkle', mouth: 'open', prop: 'none' },
  zena:   { front: { path: [F, [32, 20], [31, 10]] }, back: down(B), legs: 'stand', mouth: 'pout', prop: 'none' },
};

/** 필살기 2프레임: 원이 우이! 두 팔 벌림 · 리브 왕따봉 · 미나미 갸루 피스 · 메이 그립감 손 모으기 · 제나 까엉턴(2프레임은 뒷모습). */
export const SUPER: Record<MemberId, [PoseSpec, PoseSpec]> = {
  woni: [
    { front: { path: [F, [37, 25]], hand: 'open' }, back: { path: [B, [1, 25]], hand: 'open' }, legs: 'wide', eyes: 'happy', mouth: 'big', prop: 'none' },
    { front: { path: [F, [35, 17]], hand: 'open' }, back: { path: [B, [3, 17]], hand: 'open' }, legs: 'wide', eyes: 'happy', mouth: 'big', prop: 'none', sink: 1 },
  ],
  liv: [
    { front: { path: [F, [31, 33], [32, 25]], hand: 'thumb' }, back: down(B), legs: 'stand', eyesRight: 'wink', mouth: 'grin', prop: 'none' },
    { front: { path: [F, [31, 33], [32, 24]], hand: 'thumb' }, back: { path: [B, [7, 33], [6, 24]], hand: 'thumb' }, legs: 'wide', eyesRight: 'wink', mouth: 'grin', prop: 'none' },
  ],
  minami: [
    { front: { path: [F, [32, 21], [31, 18]], hand: 'peace' }, back: { path: [B, [8, 24]], hand: 'peace' }, legs: 'stand', eyes: 'happy', mouth: 'tongue', prop: 'none' },
    { front: { path: [F, [34, 18]], hand: 'peace' }, back: { path: [B, [4, 18]], hand: 'peace' }, legs: 'wide', eyes: 'happy', mouth: 'tongue', prop: 'none', lean: 1 },
  ],
  may: [
    { front: { path: [F, [22, 34]] }, back: { path: [B, [17, 34]] }, legs: 'stand', eyes: 'sparkle', mouth: 'open', prop: 'none', fx: fill('W', [[30, 30, 8, 8], [33, 33, 31, 31], [36, 36, 6, 6]], CANVAS_W, SPRITE_H) },
    { front: { path: [F, [22, 30]] }, back: { path: [B, [17, 30]] }, legs: 'stand', eyes: 'sparkle', mouth: 'big', prop: 'none', fx: fill('W', [[27, 27, 33, 33], [31, 31, 5, 5], [24, 24, 8, 8]], CANVAS_W, SPRITE_H) },
  ],
  zena: [
    { front: { path: [F, [36, 22]], hand: 'open' }, back: { path: [B, [2, 22]], hand: 'open' }, legs: 'wide', mouth: 'open', prop: 'none' },
    { front: { path: [F, [35, 24]], hand: 'open' }, back: { path: [B, [3, 24]], hand: 'open' }, legs: 'strideB', prop: 'none', backView: true },
  ],
};

/** 승리 포즈(결과 화면). */
export const WIN: Record<MemberId, PoseSpec> = {
  woni:   { front: { path: [F, [34, 15]], hand: 'open' }, back: { path: [B, [4, 15]], hand: 'open' }, legs: 'wide', eyes: 'happy', mouth: 'big', prop: 'none' },
  liv:    { front: { path: [F, [34, 17]], hand: 'open' }, back: { path: [B, [11, 35]], hand: 'thumb' }, legs: 'stand', eyesRight: 'wink', mouth: 'grin', prop: 'none' },
  minami: { front: { path: [F, [33, 16]], hand: 'peace' }, back: { path: [B, [5, 16]], hand: 'peace' }, legs: 'tuck', eyes: 'happy', mouth: 'tongue', prop: 'none' },
  may:    { front: { path: [F, [31, 34], [32, 25]] }, back: { path: [B, [7, 34], [6, 25]] }, legs: 'wide', eyes: 'sparkle', mouth: 'big', prop: 'none', fx: fill('W', [[20, 20, 2, 2], [18, 18, 36, 36], [30, 30, 37, 37]], CANVAS_W, SPRITE_H) },
  zena:   { front: { path: [F, [33, 16]], hand: 'open' }, back: { path: [B, [12, 36]] }, legs: 'kick', eyes: 'happy', mouth: 'grin', prop: 'none' },
};

/** 피격 눈(><). */
export const HURT_EYES: Grid = EYES.closed;

/** 상체(0~41행)를 dx 만큼 오른쪽으로 민다. */
export const lean = (grid: Grid, dx: number, rowsN = 42): Grid => grid.map((r, y) => {
  if (y >= rowsN || dx === 0) return r;
  const w = r.length;
  return dx > 0 ? ('.'.repeat(dx) + r).slice(0, w) : (r + '.'.repeat(-dx)).slice(-dx, -dx + w);
});
/** 상체를 dy 만큼 내린다(숨쉬기). 맨 윗줄은 비운다. */
export const sink = (grid: Grid, dy: number, rowsN = 42): Grid => grid.map((r, y) => (y < dy ? '.'.repeat(r.length) : y < rowsN + dy ? grid[y - dy]! : r));

export { BODY_X };
