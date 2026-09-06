// 멤버가 아닌 NPC 외형: 멤버와 같은 몸 템플릿에 머리·의상 팔레트·소품 오버레이만 바꾼다.
import type { Grid } from '../pixel-art';
import { HAIR, SPRITE_W } from './templates';

const rows = (name: string, g: Grid): Grid => {
  g.forEach((r, i) => { if (r.length !== SPRITE_W) throw new Error(`${name} row ${i} has ${r.length} != ${SPRITE_W}`); });
  return g;
};
const blank = (n: number): Grid => Array<string>(n).fill('.'.repeat(SPRITE_W));

/** 안경(7~8행 눈 위). */
const GLASSES: Grid = rows('npc.glasses', [
  ...blank(7),
  '...KSSSKEEKSSKEEKSSSK...',
  '...KSSSKEWKKKKEWKSSSK...',
]);
/** 야구모자(0~5행, 챙은 오른쪽 = 정면). */
const CAP: Grid = rows('npc.cap', [
  '........CCCCCCCC........',
  '......CCCCCCCCCCCC......',
  '.....CCCCCCCCCCCCCC.....',
  '....CCCCCCCCCCCCCCCC....',
  '....CCCCCCCCCCCCCCCCCCC.',
  '...KKKKKKKKKKKKKKKKKKKK.',
]);
/** 목걸이 사원증(18~25행). */
const LANYARD: Grid = rows('npc.lanyard', [
  ...blank(18),
  '.........L....L.........',
  '.........L....L.........',
  '..........L..L..........',
  '..........L..L..........',
  '..........KKKK..........',
  '..........KWWK..........',
  '..........KWWK..........',
  '..........KKKK..........',
]);
/** 이름표(20~21행 가슴 오른쪽). */
const NAME_TAG: Grid = rows('npc.nametag', [
  ...blank(20),
  '...............KWWK.....',
  '...............KKKK.....',
]);

export interface NpcLook {
  hair: keyof typeof HAIR;
  hairColor: [string, string];
  top: string;
  topShade: string;
  bottom?: string;
  overlays: Grid[];
  extra?: Record<string, string>;
}

export const NPC_LOOKS: Record<string, NpcLook> = {
  npc_audition_judge: { hair: 'short', hairColor: ['#3a3a4a', '#4b4b5e'], top: '#2d2f45', topShade: '#22243a', bottom: '#2d2f45', overlays: [GLASSES], extra: { A: '#c0caf5' } },
  npc_dance_teacher:  { hair: 'short', hairColor: ['#2b2330', '#3d3345'], top: '#9ece6a', topShade: '#73a34a', overlays: [CAP], extra: { C: '#2d2f45' } },
  npc_manager:        { hair: 'bob',   hairColor: ['#4a3327', '#5d4436'], top: '#7dcfff', topShade: '#4fa3d6', overlays: [LANYARD], extra: { L: '#f7768e' } },
  npc_clerk:          { hair: 'bob',   hairColor: ['#2b2330', '#3d3345'], top: '#e0af68', topShade: '#b98a48', overlays: [NAME_TAG] },
};
