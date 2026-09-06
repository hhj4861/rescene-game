// B안(나이트 2.5등신) 24×40 픽셀 템플릿. 역할 문자:
// K 외곽선  H/h 머리·그늘  S/s 피부·홍조  E 눈  W 하이라이트  T/t 상의·그늘  B/b 하의·그늘  O 신발  A 포인트  M 금속  P 나무손잡이  R 리본
import type { Grid } from '../pixel-art';

export const SPRITE_W = 24;
export const SPRITE_H = 40;

const rows = (name: string, g: Grid): Grid => {
  g.forEach((r, i) => { if (r.length !== SPRITE_W) throw new Error(`${name} row ${i} has ${r.length} != ${SPRITE_W}`); });
  return g;
};
const blank = (n: number): Grid => Array<string>(n).fill('.'.repeat(SPRITE_W));

/** 머리 0~15, 목 16, 몸통 17~28, 바지 29~39. */
export const BODY: Grid = rows('body', [
  '........KKKKKKKK........',
  '......KKSSSSSSSSKK......',
  '.....KSSSSSSSSSSSSK.....',
  '....KSSSSSSSSSSSSSSK....',
  '....KSSSSSSSSSSSSSSK....',
  '...KSSSSSSSSSSSSSSSSK...',
  '...KSSSSSSSSSSSSSSSSK...',
  '...KSSSSEESSSSEESSSSK...',
  '...KSSSSEWSSSSEWSSSSK...',
  '...KSsSSSSSSSSSSSSsSK...',
  '...KSSSSSSSSSSSSSSSSK...',
  '....KSSSSSSSSSSSSSSK....',
  '....KSSSSSSKKSSSSSSK....',
  '.....KSSSSSSSSSSSSK.....',
  '......KSSSSSSSSSSK......',
  '.......KKKKKKKKKK.......',
  '.........KSSSSK.........',
  '.......KKKTTTTKKK.......',
  '.....KKTTTTTTTTTTKK.....',
  '....KTTTTTTTTTTTTTTK....',
  '...KTTTTTTTTTTTTTTTTK...',
  '...KTTKTTTTTTTTTTKTTK...',
  '...KTTKTTTTTTTTTTKTTK...',
  '...KTTKTTAAAAAATTKTTK...',
  '...KSSKTTTTTTTTTTKSSK...',
  '...KSSKTTTTTTTTTTKSSK...',
  '...KKKKTTTTTTTTTTKKKK...',
  '......KTTTTTTTTTTK......',
  '......KttttttttttK......',
  '......KBBBBBBBBBBK......',
  '......KBBBBBBBBBBK......',
  '......KBBBBBBBBBBK......',
  '......KBBBBKKBBBBK......',
  '......KBBBBKKBBBBK......',
  '......KBBBBKKBBBBK......',
  '......KbbbbKKbbbbK......',
  '......KBBBBKKBBBBK......',
  '......KOOOOKKOOOOK......',
  '......KOOOOKKOOOOK......',
  '......KKKKKKKKKKKK......',
]);

/** 다리 포즈 오버레이(32~39행). 원본 다리 행은 먼저 지운 뒤 덮는다. */
export const LEGS = {
  stand: BODY.slice(32, 40),
  strideL: rows('strideL', [
    '....KBBBBK....KBBBBK....',
    '....KBBBBK....KBBBBK....',
    '....KBBBBK....KBBBBK....',
    '....KbbbbK....KbbbbK....',
    '....KBBBBK....KOOOOK....',
    '....KOOOOK....KOOOOK....',
    '....KOOOOK....KKKKKK....',
    '....KKKKKK..............',
  ]),
  strideR: rows('strideR', [
    '....KBBBBK....KBBBBK....',
    '....KBBBBK....KBBBBK....',
    '....KBBBBK....KBBBBK....',
    '....KbbbbK....KbbbbK....',
    '....KOOOOK....KBBBBK....',
    '....KOOOOK....KOOOOK....',
    '....KKKKKK....KOOOOK....',
    '..............KKKKKK....',
  ]),
  tuck: rows('tuck', [
    '......KBBBBKKBBBBK......',
    '......KbbbbKKbbbbK......',
    '......KOOOOKKOOOOK......',
    '......KOOOOKKOOOOK......',
    '......KKKKKKKKKKKK......',
    '........................',
    '........................',
    '........................',
  ]),
} as const;

/** 공격: 오른팔을 앞으로 뻗는다(20~26행 교체). */
export const ATTACK_ARM: Grid = rows('attackArm', [
  '...KTTTTTTTTTTTTTTTTK...',
  '...KTTKTTTTTTTTTTKKKKKKK',
  '...KTTKTTTTTTTTTTKTTTTSK',
  '...KTTKTTAAAAAATTKTTTTSK',
  '...KSSKTTTTTTTTTTKKKKKKK',
  '...KSSKTTTTTTTTTTK......',
  '...KKKKTTTTTTTTTTK......',
]);

/** 피격: 눈 감음(7~8행 교체). */
export const HURT_EYES: Grid = rows('hurtEyes', [
  '...KSSSSSSSSSSSSSSSSK...',
  '...KSSSSKKSSSSKKSSSSK...',
]);

export const HAIR: Record<string, Grid> = {
  long: rows('hair.long', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHHHHHhHHHHHHHHK...', '..KHHHHHHHHHHHhHHHHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '...KKK............KKK...',
  ]),
  bob: rows('hair.bob', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHHHHHhHHHHHHHHK...', '..KHHHHHHHHHHHhHHHHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '...KKK............KKK...',
  ]),
  wavy: rows('hair.wavy', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHhHHHHHHHHhHHHK...', '..KHHHHHHHHHhHHHHHHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '..KhHHK..........KHHhK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '.KHHHHK..........KHHHHK.', '.KhHHHK..........KHHHhK.', '.KHHHHK..........KHHHHK.', 'KHHhHHK..........KHHhHHK',
    'KHHHHHK..........KHHHHHK', 'KhHHHHK..........KHHHHhK', 'KHHHHHK..........KHHHHHK', '.KKKKK............KKKKK.',
  ]),
  short: rows('hair.short', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHHhHHHHHHhHHHHK...', '..KHHHHHHHHHHHhHHHHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '...KKK............KKK...',
  ]),
  twin: rows('hair.twin', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '.RRKHHHHHHhHHHHHHHHKRR..', 'RWRKHHHHHHHHHHhHHHHKRWR.', '.RRK................KRR.', 'KHHK................KHHK',
    'KHHK................KHHK', 'KHhK................KhHK', 'KHHK................KHHK', 'KHHK................KHHK',
    'KHHK................KHHK', 'KHhK................KhHK', 'KHHK................KHHK', 'KHHK................KHHK',
    'KHHK................KHHK', 'KHHK................KHHK', 'KHHK................KHHK', '.KK..................KK.',
  ]),
};

export const PROPS: Record<string, Grid> = {
  micstand: rows('prop.micstand', [
    ...blank(13),
    '.....................KKK',
    '.....................KMK',
    '.....................KKK',
    ...Array<string>(22).fill('......................M.'),
    '.....................MMM',
  ]),
  handmic: rows('prop.handmic', [
    ...blank(20),
    '..................KKK...',
    '..................KMK...',
    '..................KKK...',
    '...................M....',
    '...................M....',
    ...blank(15),
  ]),
  brush: rows('prop.brush', [
    ...blank(15),
    '.....................KK.',
    '.....................KK.',
    '.....................P..',
    '....................P...',
    '....................P...',
    '....................P...',
    '...................P....',
    '...................P....',
    '...................P....',
    '...................P....',
    '..................P.....',
    ...blank(14),
  ]),
  keyring: rows('prop.keyring', [
    ...blank(28),
    '.................M......',
    '.................M......',
    '................AWA.....',
    '................AAA.....',
    ...blank(8),
  ]),
  none: blank(SPRITE_H),
};

export interface MemberLook {
  hair: keyof typeof HAIR;
  hairColor: [string, string];
  top: string;
  topShade: string;
  prop: keyof typeof PROPS;
}

/** 멤버별 외형. 얼굴을 닮게 그리지 않고 머리 모양·포인트 컬러·소품으로 구분한다. */
export const LOOKS: Record<string, MemberLook> = {
  woni:   { hair: 'long',  hairColor: ['#2b2330', '#3d3345'], top: '#0f9d6e', topShade: '#0b7452', prop: 'micstand' },
  liv:    { hair: 'bob',   hairColor: ['#f3b4c6', '#d98aa3'], top: '#ff8fb1', topShade: '#d96e91', prop: 'handmic' },
  minami: { hair: 'wavy',  hairColor: ['#d9a25b', '#b5813f'], top: '#ffd166', topShade: '#d9ad4a', prop: 'brush' },
  may:    { hair: 'short', hairColor: ['#4a3327', '#5d4436'], top: '#ff9e64', topShade: '#d97f4b', prop: 'keyring' },
  zena:   { hair: 'twin',  hairColor: ['#1f1a24', '#312a3a'], top: '#bb9af7', topShade: '#957ad1', prop: 'none' },
};

/** 연습복 공통 팔레트(멤버 색은 LOOKS로 덮는다). */
export const BASE_PALETTE: Record<string, string> = {
  K: '#12131c', S: '#f2cfb3', s: '#d9a98b', E: '#12131c', W: '#ffffff', M: '#9aa3c7',
  B: '#2c3150', b: '#22263f', O: '#e6e0ff', A: '#ffffff', P: '#a0522d', R: '#f7768e',
};
