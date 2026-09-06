import type { StageDef } from '../schema';

export const STAGE_5: StageDef = {
  id: 's5_first_win', index: 5, name: '첫 1위', era: '2026.07 ~ 2026.09', map: 's5_first_win', bgm: 'stage', timerSec: 200, palette: 'stage5',
  intro: [
    '2026년 7월 8일 Pretty Girl.',
    '7월 14일 더쇼 — 데뷔 841일 만의 첫 1위.',
    '음악중심, 인기가요, 트리플크라운. 트로피 앞 마지막 무대.',
  ],
  sections: [
    { lock: 'lock_a', spawn: 're_a', waves: [{ spawn: 'sp_a1', enemy: 'enemy_spotlight_drone', count: 4, intervalMs: 800 }, { spawn: 'sp_a2', enemy: 'enemy_stage_trap', count: 2, intervalMs: 1500 }],
      cheer: { npc: 'npc_minami', spawn: 'sp_cheer_a', text: '거제, 야호~!' } },
    { lock: 'lock_b', spawn: 're_b', waves: [{ spawn: 'sp_b1', enemy: 'enemy_spotlight_drone', count: 5, intervalMs: 800 }, { spawn: 'sp_b1', enemy: 'enemy_spotlight_drone', count: 1, intervalMs: 0, elite: true }], chest: true },
    { lock: 'lock_c', spawn: 're_c', waves: [{ spawn: 'sp_c1', enemy: 'enemy_stage_trap', count: 3, intervalMs: 1200 }, { spawn: 'sp_c2', enemy: 'enemy_inear_noise', count: 4, intervalMs: 700, elite: true }] },
    { lock: 'lock_d', spawn: 're_d', waves: [{ spawn: 'sp_d1', enemy: 'enemy_spotlight_drone', count: 6, intervalMs: 700 }], chest: true },
  ],
  boss: { lock: 'lock_boss', spawn: 'sp_boss', id: 'boss_trophy_guardian' },
  cardPool: ['woni_doyouknow', 'liv_youtoo', 'minami_yaho', 'may_chance', 'zena_ani', 'liv_motto', 'may_grip'],
};
