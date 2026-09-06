// 스테이지 1 타일셋 도트 템플릿. 디자인 시안(docs/design/gen.mjs)의 TILES.B·PLATFORM·LADDER(16×16)
// 그리드를 그대로 옮겨 2배로 키운다(32×32 = 프로젝트 타일 크기).
// 역할: G/g 바닥  P/p 발판  R/r 사다리
import { pasteGrid, scale2, type Grid } from '../pixel-art';

const rowsOf = (name: string, width: number, g: Grid): Grid => {
  g.forEach((r, i) => { if (r.length !== width) throw new Error(`${name} row ${i} has ${r.length} != ${width}`); });
  return g;
};

// TILES.B.ground (docs/design/gen.mjs)
const GROUND_16: Grid = rowsOf('ground16', 16, [
  'GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'gggggggggggggggg',
  'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'gggggggggggggggg',
  'GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'gggggggggggggggg',
  'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'gggggggggggggggg',
]);

// PLATFORM (docs/design/gen.mjs)
const PLATFORM_16: Grid = rowsOf('platform16', 16, [
  'PPPPPPPPPPPPPPPP', 'PPPPPPPPPPPPPPPP', 'pppppppppppppppp', 'pppppppppppppppp', 'pppppppppppppppp', 'pppppppppppppppp',
]);

// LADDER (docs/design/gen.mjs)
const LADDER_16: Grid = rowsOf('ladder16', 16, [
  '...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...',
  '...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...',
  '...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...',
  '...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...',
]);

export const TILE = 32;
const blank32: Grid = Array<string>(TILE).fill('.'.repeat(TILE));

/** gid 1: 바닥. */
export const GROUND_TILE: Grid = scale2(GROUND_16);

/** gid 2: 원웨이 발판. 위 8px(시안 4행을 2배)만 칠하고 아래는 투명(현재 플레이스홀더와 같은 충돌 규약). */
export const PLATFORM_TILE: Grid = pasteGrid(blank32, scale2(PLATFORM_16.slice(0, 4)), 0, 0);

/** gid 3: 사다리. */
export const LADDER_TILE: Grid = scale2(LADDER_16);

export const TILESET_PALETTE: Record<string, string> = {
  G: '#3b4261', g: '#2a2f47',
  P: '#9ece6a', p: '#4f6b2f',
  R: '#e0af68', r: '#a97f3f',
};
