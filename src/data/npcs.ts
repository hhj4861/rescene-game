import type { NpcDef } from './schema';

/** 멤버 NPC(구간 사이 응원)와 배경 NPC. `dialogue` 필드는 v0.1 분기 대화 트리 전용이라 v0.2에서 뺐다. */
export const NPCS: NpcDef[] = [
  { id: 'npc_woni', name: '원이', color: '#045a42', member: 'woni' },
  { id: 'npc_liv', name: '리브', color: '#ffb3c6', member: 'liv' },
  { id: 'npc_minami', name: '미나미', color: '#ffd166', member: 'minami' },
  { id: 'npc_may', name: '메이', color: '#ffe08a', member: 'may' },
  { id: 'npc_zena', name: '제나', color: '#c77dff', member: 'zena' },
  { id: 'npc_audition_judge', name: '오디션 심사위원', color: '#c0caf5' },
  { id: 'npc_dance_teacher', name: '안무 선생님', color: '#9ece6a' },
  { id: 'npc_manager', name: '매니저', color: '#7dcfff' },
  { id: 'npc_clerk', name: '편의점 알바', color: '#e0af68' },
];
