import type { MemberDef } from './schema';

export const MEMBERS: MemberDef[] = [
  {
    id: 'woni', name: '원이', role: '리더 · 서브보컬', hometown: '거제', color: '#045a42',
    baseStats: { hp: 120, mp: 40, atk: 8, def: 8, spd: 5, luk: 3 },
    growth: { hp: 12, mp: 3, atk: 1.2, def: 1.4, spd: 0.2, luk: 0.2 },
    attack: 'melee', weapon: '마이크 스탠드',
    skills: ['woni_basic', 'woni_ui', 'woni_ma'], prologueMap: 'ch0_geoje',
  },
  {
    id: 'liv', name: '리브', role: '메인보컬', hometown: '수원', color: '#ffb3c6',
    baseStats: { hp: 90, mp: 60, atk: 11, def: 5, spd: 5, luk: 4 },
    growth: { hp: 8, mp: 5, atk: 1.6, def: 0.8, spd: 0.2, luk: 0.3 },
    attack: 'ranged', weapon: '핸드 마이크',
    skills: ['liv_basic', 'liv_pitch', 'liv_thumb'], prologueMap: 'ch0_suwon',
  },
  {
    id: 'minami', name: '미나미', role: '메인보컬 · 메인댄서', hometown: '치바', color: '#ffd166',
    baseStats: { hp: 100, mp: 80, atk: 10, def: 6, spd: 6, luk: 3 },
    growth: { hp: 9, mp: 7, atk: 1.4, def: 1.0, spd: 0.3, luk: 0.2 },
    attack: 'ranged', weapon: '붓',
    skills: ['minami_basic', 'minami_brush', 'minami_gal'], prologueMap: 'ch0_chiba',
  },
  {
    id: 'may', name: '메이', role: '서브보컬 · 킬링파트', hometown: '고양', color: '#ffe08a',
    baseStats: { hp: 95, mp: 70, atk: 8, def: 6, spd: 7, luk: 6 },
    growth: { hp: 9, mp: 6, atk: 1.1, def: 1.0, spd: 0.4, luk: 0.5 },
    attack: 'ranged', weapon: '스티커',
    skills: ['may_basic', 'may_chatter', 'may_focus'], prologueMap: 'ch0_goyang',
  },
  {
    id: 'zena', name: '제나', role: '메인댄서 · 리드보컬', hometown: '경주', color: '#c77dff',
    baseStats: { hp: 100, mp: 50, atk: 10, def: 5, spd: 8, luk: 4 },
    growth: { hp: 10, mp: 4, atk: 1.5, def: 0.8, spd: 0.5, luk: 0.3 },
    attack: 'melee', weapon: '헤어핀',
    skills: ['zena_basic', 'zena_turn', 'zena_ani'], prologueMap: 'ch0_gyeongju',
  },
];
