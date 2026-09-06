import type { MemberDef } from './schema';

export const MEMBERS: MemberDef[] = [
  {
    id: 'woni', name: '원이', role: '리더 · 서브보컬', hometown: '거제', color: '#045a42',
    attack: 'melee', weapon: '마이크 스탠드',
    atk: 10, spd: 5, jump: 5, basicSkill: 'woni_basic', superSkill: 'woni_ui', superText: '우이!',
    voice: { baseHz: 220, syllableMs: 85, wave: 'square' },
  },
  {
    id: 'liv', name: '리브', role: '메인보컬', hometown: '수원', color: '#ffb3c6',
    attack: 'ranged', weapon: '핸드 마이크',
    atk: 8, spd: 6, jump: 5, basicSkill: 'liv_basic', superSkill: 'liv_pitch', superText: '너도? 나도!',
    voice: { baseHz: 330, syllableMs: 80, wave: 'triangle' },
  },
  {
    id: 'minami', name: '미나미', role: '메인보컬 · 메인댄서', hometown: '치바', color: '#ffd166',
    attack: 'ranged', weapon: '붓',
    atk: 9, spd: 6, jump: 6, basicSkill: 'minami_basic', superSkill: 'minami_brush', superText: '거제, 야호~!',
    voice: { baseHz: 392, syllableMs: 65, wave: 'pulse' },
  },
  {
    id: 'may', name: '메이', role: '서브보컬 · 킬링파트', hometown: '고양', color: '#ffe08a',
    attack: 'ranged', weapon: '스티커',
    atk: 7, spd: 7, jump: 6, basicSkill: 'may_basic', superSkill: 'may_chatter', superText: '기회는 그립감이 좋다',
    voice: { baseHz: 349, syllableMs: 70, wave: 'pulse', vibrato: 6 },
  },
  {
    id: 'zena', name: '제나', role: '메인댄서 · 리드보컬', hometown: '경주', color: '#c77dff',
    attack: 'melee', weapon: '헤어핀',
    atk: 10, spd: 8, jump: 5, basicSkill: 'zena_basic', superSkill: 'zena_turn', superText: '아뉘이이이!',
    voice: { baseHz: 262, syllableMs: 60, wave: 'square' },
  },
];
