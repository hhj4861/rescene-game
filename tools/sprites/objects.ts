// 맵 오브젝트 도트 템플릿(점프대 등). tools/ascii-map.ts의 jumppad 오브젝트가 참조한다.
import type { Grid } from '../pixel-art';
import { layer, rectMask, shapeFromMask, type Mask } from './shapes';

export interface ObjectSprite {
  width: number;
  height: number;
  palette: Record<string, string>;
  /** [프레임0, 프레임1] */
  frames: Grid[];
}

// ---------- 점프대 32×16 (밈의 파도, S4 구간 D) ----------
const padBase: Mask = rectMask(32, 16, 2, 10, 28, 6, 2);
const padTopUp: Mask = rectMask(32, 16, 6, 4, 20, 6, 2);
const padTopDown: Mask = rectMask(32, 16, 6, 7, 20, 6, 2);
const padArrow: Mask = rectMask(32, 16, 15, 0, 2, 3);

const PAD_BASE_GRID: Grid = shapeFromMask(padBase, 'M', 'K');
const PAD_UP: Grid = layer(PAD_BASE_GRID, shapeFromMask(padTopUp, 'A', 'K'), shapeFromMask(padArrow, 'W', 'W'));
const PAD_DOWN: Grid = layer(PAD_BASE_GRID, shapeFromMask(padTopDown, 'A', 'K'));

export const OBJECT_SPRITES: Record<string, ObjectSprite> = {
  obj_jumppad: {
    width: 32, height: 16,
    palette: { K: '#12131c', M: '#3d3d4a', A: '#7dcfff', W: '#ffffff' },
    frames: [PAD_UP, PAD_DOWN],
  },
};
