// 적 도트 템플릿(감정 의인화). 프레임 크기는 src/data/enemies.ts의 width×height와 같아야 한다.
// 역할: K 외곽선  F/f 몸·그늘  L/l 빛·희미  W 흰자  E 눈동자  A/a 포인트·그늘  S/s 줄기  M 금속  T 정장  H/I/J 머리색  D/d 책상  P 명패
import { pasteGrid, shiftGrid, type Grid } from '../pixel-art';
import { ENEMY_SPRITES_2 } from './enemies2';

const rows = (name: string, w: number, g: Grid): Grid => {
  g.forEach((r, i) => { if (r.length !== w) throw new Error(`${name} row ${i} has ${r.length} != ${w}`); });
  return g;
};
const blankRow = (w: number): string => '.'.repeat(w);
/** 아래 정렬: 위에 빈 줄을 채워 h줄로 만든다. */
const padTop = (g: Grid, w: number, h: number): Grid => [...Array<string>(h - g.length).fill(blankRow(w)), ...g];
/** 위 rows줄을 dy만큼 내린다(눌림). */
const sink = (g: Grid, rows: number, dy: number): Grid => g.map((r, y) => (y < dy ? blankRow(r.length) : y < rows + dy ? g[y - dy]! : r));
/** 전체를 dy만큼 올린다(점프). 아래는 투명. */
const lift = (g: Grid, dy: number): Grid => g.map((r, y) => g[y + dy] ?? blankRow(r.length));
const remap = (g: Grid, map: Record<string, string>): Grid => g.map((r) => [...r].map((c) => map[c] ?? c).join(''));

export interface EnemySprite {
  width: number;
  height: number;
  palette: Record<string, string>;
  /** [대기0, 대기1, 이동0, 이동1] */
  frames: Grid[];
}

// ---------- 떨림 28×28 ----------
const NERVES = padTop(rows('nerves', 28, [
  '..........KKKKKKKK..........',
  '........KKFFFFFFFFKK........',
  '.......KFFFFFFFFFFFFK.......',
  '......KFFFFFFFFFFFFFFK......',
  '.....KFFFFFFFFFFFFFFFFK.....',
  '....KFFFWWWFFFFFFWWWFFFK....',
  '....KFFFWEWFFFFFFWEWFFFK....',
  '....KFFFWWWFFFFFFWWWFFFK....',
  '....KFFFFFFFFFFFFFFFFFFK....',
  '....KFFFFFFFKKKKKFFFFFFK....',
  '....KFFFFFFKfffffKFFFFFK....',
  '....KFFFFFFFKKKKKFFFFFFK....',
  '....KFFFFFFFFFFFFFFFFFFK....',
  '....KfFFFFFFFFFFFFFFFFfK....',
  '....KffFFFFFFFFFFFFFFffK....',
  '....KfffFFFFFFFFFFFFfffK....',
  '....KffffffffffffffffffK....',
  '....KffffffffffffffffffK....',
  '.....KfffffffffffffffffK....',
  '......KfffffffffffffffK.....',
  '.......KffKfffffffKffK......',
  '.......KfK.KfffffK.KfK......',
  '........K...KKKKK...K.......',
]), 28, 28);
const NERVES_MARKS = rows('nerves.marks', 28, [
  ...Array<string>(8).fill(blankRow(28)),
  '.A........................A.',
  '..A......................A..',
  '.A........................A.',
  '..A......................A..',
  ...Array<string>(16).fill(blankRow(28)),
]);

// ---------- 졸음 슬라임 36×28 ----------
const SLIME_Z = rows('slime.z', 36, [
  '..........................AAAA......',
  '............................AA......',
  '...........................AA.......',
  '..........................AAAA......',
]);
const SLIME_BODY = rows('slime', 36, [
  '..............KKKKKKKK..............',
  '...........KKKFFFFFFFFKKK...........',
  '.........KKFFFFFFFFFFFFFFKK.........',
  '.......KKFFFFFFFFFFFFFFFFFFKK.......',
  '......KFFFFFFFFFFFFFFFFFFFFFFK......',
  '.....KFFFFLLFFFFFFFFFFFFFFFFFFK.....',
  '....KFFFFLLFFFFFFFFFFFFFFFFFFFFK....',
  '....KFFFFFFFFFFFFFFFFFFFFFFFFFFK....',
  '...KFFFFFFKKKFFFFFFFFFFKKKFFFFFFK...',
  '...KFFFFFKFFFKFFFFFFFFKFFFKFFFFFK...',
  '...KFFFFFFFFFFFFFFFFFFFFFFFFFFFFK...',
  '..KFFFFFFFFFFFFFKKKFFFFFFFFFFFFFFK..',
  '..KFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFK..',
  '..KFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFK..',
  '..KfFFFFFFFFFFFFFFFFFFFFFFFFFFFFfK..',
  '..KffFFFFFFFFFFFFFFFFFFFFFFFFFFffK..',
  '..KfffFFFFFFFFFFFFFFFFFFFFFFFFfffK..',
  '..KffffffFFFFFFFFFFFFFFFFFFffffffK..',
  '..KffffffffffffffffffffffffffffffK..',
  '..KffffffffffffffffffffffffffffffK..',
  '...KffffffffffffffffffffffffffffK...',
  '....KKKKKKKKKKKKKKKKKKKKKKKKKKKK....',
]);
const SLIME = pasteGrid(padTop(SLIME_BODY, 36, 28), SLIME_Z, 0, 1);
const SLIME_Z_HIGH = pasteGrid(padTop(SLIME_BODY, 36, 28), shiftGrid(SLIME_Z, 1), 0, 0);

// ---------- 근육통 버섯 32×36 ----------
const MUSHROOM = padTop(rows('mushroom', 32, [
  '............KKKKKKKK............',
  '..........KKFFFFFFFFKK..........',
  '........KKFFFFFFFFFFFFKK........',
  '......KKFFFFFFFFFFFFFFFFKK......',
  '.....KFFFFFFFFFFFFFFFFFFFFK.....',
  '....KFFFFFFWWFFFFFFFFFFFFFFK....',
  '...KFFFFFFWWWWFFFFFFFFWWFFFFK...',
  '..KFFFFFFFWWWWFFFFFFFWWWWFFFFFK.',
  '..KFFFFFFFFWWFFFFFFFFWWWWFFFFFK.',
  '..KFFFFFFFFFFFFFFFFFFFWWFFFFFFK.',
  '..KffFFFFFFFFFFFFFFFFFFFFFFffK..',
  '..KffffffffffffffffffffffffffK..',
  '...KKKKKKKKKKKKKKKKKKKKKKKKKK...',
  '.........KSSSSSSSSSSSSK.........',
  '.........KSSSSSSSSSSSSK.........',
  '.........KSSKSSSSSSKSSK.........',
  '.........KSSSKSSSSKSSSK.........',
  '.........KSSKSSSSSSKSSK.........',
  '.........KSSSSSSSSSSSSK.........',
  '.........KSSSSKKKKSSSSK.........',
  '.........KSSSKSSSSKSSSK.........',
  '.........KSSSSSSSSSSSSK.........',
  '.........KSSSSSSSSSSSSK.........',
  '.........KSAASSSSSSAASK.........',
  '.........KSSAASSSSAASSK.........',
  '.........KSSSAASSAASSSK.........',
  '.........KSSSSAAAASSSSK.........',
  '.........KSSSAASSAASSSK.........',
  '.........KSSAASSSSAASSK.........',
  '.........KSAASSSSSSAASK.........',
  '........KssSSSSSSSSSSssK........',
  '........KKKKKKKKKKKKKKKK........',
]), 32, 36);

// ---------- 박자이탈 메트로놈 28×40 ----------
const METRONOME_BODY = padTop(rows('metronome', 28, [
  '...........KKKKKK...........',
  '..........KFFFFFFK..........',
  '..........KFFFFFFK..........',
  '.........KFFFFFFFFK.........',
  '.........KFFFFFFFFK.........',
  '.........KFFFFFFFFK.........',
  '........KFFFFFFFFFFK........',
  '........KFFFFFFFFFFK........',
  '........KFFFFFFFFFFK........',
  '.......KFFFFFFFFFFFFK.......',
  '.......KFFKKFFFFKKFFK.......',
  '.......KFFFKKFFKKFFFK.......',
  '......KFFFWEFFFFFFEWFFFK....',
  '......KFFFFFFFFFFFFFFK......',
  '......KFFFFFFFFFFFFFFK......',
  '.....KFFFFFFFFFFFFFFFFK.....',
  '.....KFFFFFKKKKKKFFFFFK.....',
  '.....KFFFFFKWWWWKFFFFFK.....',
  '.....KFFFFFKKKKKKFFFFFK.....',
  '....KFFFFFFFFFFFFFFFFFFK....',
  '....KFFFFFFFFFFFFFFFFFFK....',
  '....KFFFFFFFFFFFFFFFFFFK....',
  '...KFFFFFFFFFFFFFFFFFFFFK...',
  '...KFFFFFFFFFFFFFFFFFFFFK...',
  '...KffffffffffffffffffffK...',
  '..KAAAAAAAAAAAAAAAAAAAAAAK..',
  '..KAAAAAAAAAAAAAAAAAAAAAAK..',
  '..KaaaaaaaaaaaaaaaaaaaaaaK..',
  '..KaaaaaaaaaaaaaaaaaaaaaaK..',
  '..KKKKKKKKKKKKKKKKKKKKKKKK..',
]), 28, 40);
/** 바늘: 축(row 30, col 13~14)에서 위로. tilt = 3줄마다 1픽셀 기울기 방향(-1, 0, 1). */
function needle(tilt: -1 | 0 | 1): Grid {
  const g = Array<string>(40).fill(blankRow(28)).map((r) => [...r]);
  for (let y = 30; y >= 2; y--) {
    const x = 13 + tilt * Math.floor((30 - y) / 3);
    g[y]![x] = 'M';
    g[y]![x + 1] = 'M';
  }
  const tipX = 13 + tilt * Math.floor(28 / 3);
  for (let y = 4; y <= 6; y++) for (let x = tipX - 1; x <= tipX + 2; x++) if (x >= 0 && x < 28) g[y]![x] = 'K';
  return g.map((r) => r.join(''));
}
const metronome = (tilt: -1 | 0 | 1): Grid => pasteGrid(needle(tilt), METRONOME_BODY, 0, 0);

// ---------- 자기의심 그림자 40×56 ----------
const SHADOW = rows('shadow', 40, [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '................KKKKKKKK................',
  '..............KKFFFFFFFFKK..............',
  '.............KFFFFFFFFFFFFK.............',
  '............KFFFFFFFFFFFFFFK............',
  '............KFFFFFFFFFFFFFFK............',
  '............KFFFFFFFFFFFFFFK............',
  '............KFFFLLFFFFLLFFFK............',
  '............KFFFLLFFFFLLFFFK............',
  '............KFFFFFFFFFFFFFFK............',
  '............KFFFFFFFFFFFFFFK............',
  '.............KFFFFFFFFFFFFK.............',
  '..............KFFFFFFFFFFK..............',
  '...............KKFFFFFFKK...............',
  '.................KFFFFK.................',
  '.................KFFFFK.................',
  '..............KKKKFFFFKKKK..............',
  '...........KKKFFFFFFFFFFFFKKK...........',
  '.........KKFFFFFFFFFFFFFFFFFFKK.........',
  '........KFFFFFFFFFFFFFFFFFFFFFFK........',
  '.......KFFFFFFFFFFFFFFFFFFFFFFFFK.......',
  '......KFFFFFFFFFFFFFFFFFFFFFFFFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFFKFFFFFFFFFFFFFFFFFFKFFFK......',
  '......KFFKFFFFFFFFFFFFFFFFFFFFKFFK......',
  '......KKKFFFFFFFFFFFFFFFFFFFFFFKKK......',
  '........KFFFFFFFFFFFFFFFFFFFFFFK........',
  '........KFFFFFFFFFFFFFFFFFFFFFFK........',
  '........KFFFFFFFFFFFFFFFFFFFFFFK........',
  '........KfFFFFFFFFFFFFFFFFFFFFfK........',
  '........KffFFFFFFFFFFFFFFFFFFffK........',
  '........KfffFFFFFFFFFFFFFFFFfffK........',
  '........KffffFFFFFFFFFFFFFFffffK........',
  '........KffffffFFFFFFFFFFffffffK........',
  '........KffffffffFFFFFFffffffffK........',
  '........KffffffffffffffffffffffK........',
  '........KffffffffffffffffffffffK........',
  '........KfffffKffffffffffKfffffK........',
  '........KfffffKffffffffffKfffffK........',
  '.........KfffK.KffffffffK.KfffK.........',
  '.........KfffK.KffffffffK.KfffK.........',
  '..........KfK...KffffffK...KfK..........',
  '..........KfK...KffffffK...KfK..........',
  '...........K.....KffffK.....K...........',
  '..................KKKK..................',
]);
const shadowWisps = (dx: number): Grid => [...SHADOW.slice(0, 48), ...shiftGrid(SHADOW.slice(48), dx)];

// ---------- 월말평가 심사위원단 96×96 ----------
const BUST = rows('bust', 26, [
  '..........................',
  '..........................',
  '.........KKKKKKKK.........',
  '.......KKSSSSSSSSKK.......',
  '......KSSSSSSSSSSSSK......',
  '.....KSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSK.....',
  '.....KSSSEESSSSEESSSK.....',
  '.....KSSSEESSSSEESSSK.....',
  '.....KSSSSSSSSSSSSSSK.....',
  '.....KSSSSSSSSSSSSSSK.....',
  '.....KSSSSSKKKKSSSSSK.....',
  '......KSSSSSSSSSSSSK......',
  '.......KSSSSSSSSSSK.......',
  '........KKKKKKKKKK........',
  '..........KSSSSK..........',
  '......KKKKKSSSSKKKKK......',
  '....KKTTTTKWWWWKTTTTKK....',
  '...KTTTTTTKWWWWKTTTTTTK...',
  '..KTTTTTTTKWWWWKTTTTTTTK..',
  '.KTTTTTTTTTKWWKTTTTTTTTTK.',
  'KTTTTTTTTTTKWWKTTTTTTTTTTK',
  'KTTTTTTTTTTTKKTTTTTTTTTTTK',
  ...Array<string>(12).fill('KTTTTTTTTTTTTTTTTTTTTTTTTK'),
]);
const HAIR_SHORT = rows('bust.short', 26, [
  '..........................',
  '..........................',
  '.........KKKKKKKK.........',
  '.......KKHHHHHHHHKK.......',
  '......KHHHHHHHHHHHHK......',
  '.....KHHHHHHHHHHHHHHK.....',
  '.....KHHHHHHHHHHHHHHK.....',
  '.....KHHK........KHHK.....',
  '.....KHK..........KHK.....',
]);
const HAIR_BUN = rows('bust.bun', 26, [
  '...........KKKK...........',
  '..........KIIIIK..........',
  '.........KKIIIIKK.........',
  '.......KKIIIIIIIIKK.......',
  '......KIIIIIIIIIIIIK......',
  '.....KIIIIIIIIIIIIIIK.....',
  '.....KIIK........KIIK.....',
]);
const HAIR_GREY = rows('bust.grey', 26, [
  '..........................',
  '..........................',
  '.........KKKKKKKK.........',
  '.......KKJJJJJJJJKK.......',
  '......KJJJJJJJJJJJJK......',
  '.....KJJJJJJJJJJJJJJK.....',
  '.....KJJJK......KJJJK.....',
  '.....KJJK........KJJK.....',
  '.....KSSKKKKSSKKKKSSK.....',
  '.....KSSKEEKKKKEEKSSK.....',
  '.....KSSKEEKSSKEEKSSK.....',
  '.....KSSKKKKSSKKKKSSK.....',
]);
const CARD = rows('card', 12, [
  'KKKKKKKKKKKK',
  'KAAAAAAAAAAK',
  'KAAAKKKKAAAK',
  'KAAKAAAAKAAK',
  'KAAAAAAAKAAK',
  'KAAAAAAKAAAK',
  'KAAAAAKAAAAK',
  'KAAAAAKAAAAK',
  'KAAAAAAAAAAK',
  'KAAAAAKAAAAK',
  'KAAAAAAAAAAK',
  'KKKKKKKKKKKK',
  '.....KK.....',
  '.....KK.....',
  '.....KK.....',
  '.....KK.....',
]);
function desk(): Grid {
  const g: Grid = [];
  g.push('..' + 'K'.repeat(92) + '..');
  for (let i = 0; i < 4; i++) g.push('..K' + 'd'.repeat(90) + 'K..');
  for (let i = 0; i < 30; i++) g.push('..K' + 'D'.repeat(90) + 'K..');
  g.push('..' + 'K'.repeat(92) + '..');
  const plate = rows('plate', 24, ['KKKKKKKKKKKKKKKKKKKKKKKK', 'KPPPPPPPPPPPPPPPPPPPPPPK', 'KPPKKKPPKKKKPPKKKPPPPPPK', 'KPPPPPPPPPPPPPPPPPPPPPPK', 'KKKKKKKKKKKKKKKKKKKKKKKK']);
  return pasteGrid(g, plate, 36, 12);
}
function judges(middleDy: number, cardsDy: number | null): Grid {
  let g: Grid = Array<string>(96).fill(blankRow(96));
  const heads: [Grid, number, number][] = [[HAIR_SHORT, 6, 26], [HAIR_BUN, 35, 26 + middleDy], [HAIR_GREY, 64, 26]];
  for (const [hair, x, y] of heads) g = pasteGrid(pasteGrid(g, BUST, x, y), hair, x, y);
  if (cardsDy !== null) {
    g = pasteGrid(g, CARD, 24, 44 + cardsDy);
    g = pasteGrid(g, CARD, 60, 44 + cardsDy);
  }
  return pasteGrid(g, desk(), 0, 60);
}

export const ENEMY_SPRITES: Record<string, EnemySprite> = {
  enemy_nerves: {
    width: 28, height: 28,
    palette: { K: '#2a2e45', F: '#c8cfe8', f: '#a9b1d6', W: '#ffffff', E: '#2a2e45', A: '#7dcfff' },
    frames: [NERVES, shiftGrid(NERVES, 1), pasteGrid(shiftGrid(NERVES, -1), NERVES_MARKS, 0, 0), pasteGrid(shiftGrid(NERVES, 1), NERVES_MARKS, 0, 0)],
  },
  enemy_sleep_slime: {
    width: 36, height: 28,
    palette: { K: '#1f2a4d', F: '#7aa2f7', f: '#5a7fd6', L: '#b6cbff', A: '#e6e0ff' },
    frames: [SLIME, sink(SLIME_Z_HIGH, 8, 1), lift(SLIME, 2), SLIME_Z_HIGH],
  },
  enemy_sore_mushroom: {
    width: 32, height: 36,
    palette: { K: '#3a2a1a', F: '#e0af68', f: '#b98a48', W: '#fff3d6', S: '#f4e4c1', s: '#d9c5a0', A: '#ffffff' },
    frames: [MUSHROOM, sink(MUSHROOM, 17, 1), lift(MUSHROOM, 2), MUSHROOM],
  },
  enemy_offbeat_metronome: {
    width: 28, height: 40,
    palette: { K: '#3a1a24', F: '#f7768e', f: '#c95a70', W: '#ffffff', E: '#3a1a24', A: '#6b4a2f', a: '#4e3522', M: '#d9dce8' },
    frames: [metronome(0), metronome(1), metronome(-1), metronome(1)],
  },
  enemy_selfdoubt: {
    width: 40, height: 56,
    palette: { K: '#2a2438', F: '#565f89', f: '#414868', L: '#c0caf5', l: '#7a83b0' },
    frames: [SHADOW, remap(SHADOW, { L: 'l' }), shadowWisps(1), shadowWisps(-1)],
  },
  boss_monthly_judges: {
    width: 96, height: 96,
    palette: { K: '#1a1b26', S: '#f2cfb3', E: '#1a1b26', W: '#ffffff', T: '#2d2f45', H: '#2b2330', I: '#5d4436', J: '#c0caf5', A: '#ffffff', D: '#6b4a2f', d: '#8a6340', P: '#e0af68' },
    frames: [judges(0, null), judges(1, null), judges(0, 0), judges(0, -3)],
  },
  // 2차 플랜(스테이지 2~5) 신규 잡몹 10종·보스 5종 — tools/sprites/enemies2.ts
  ...ENEMY_SPRITES_2,
};
