import type { StageDef } from '../schema';

export const STAGE_4: StageDef = {
  id: 's4_comeback', index: 4, name: '역주행', era: '2026.02 ~ 2026.06', map: 's4_comeback', bgm: 'stage', timerSec: 200, palette: 'stage4', outfit: 'comeback',
  intro: [
    '2026년 2월 4일, 원이의 유튜브가 열렸다.',
    '봄, 갸루 미나미의 "거제, 야호~!"가 퍼졌다. 4월 8일 Runaway.',
    '5월 22일 거제시 홍보대사. LOVE ATTACK이 차트를 거슬러 올랐다.',
  ],
  sections: [
    { lock: 'lock_a', spawn: 're_a', waves: [{ spawn: 'sp_a1', enemy: 'enemy_copycat', count: 4, intervalMs: 900 }],
      cheer: { npc: 'npc_woni', spawn: 'sp_cheer_a', text: '우이!' } },
    { lock: 'lock_b', spawn: 're_b', waves: [{ spawn: 'sp_b1', enemy: 'enemy_algorithm_golem', count: 2, intervalMs: 1500 }, { spawn: 'sp_b2', enemy: 'enemy_copycat', count: 3, intervalMs: 900 }], chest: true },
    { lock: 'lock_c', spawn: 're_c', waves: [{ spawn: 'sp_c1', enemy: 'enemy_copycat', count: 4, intervalMs: 800 }, { spawn: 'sp_c1', enemy: 'enemy_algorithm_golem', count: 1, intervalMs: 0, elite: true }] },
    { lock: 'lock_d', spawn: 're_d', waves: [{ spawn: 'sp_d1', enemy: 'enemy_algorithm_golem', count: 2, intervalMs: 1500 }, { spawn: 'sp_d2', enemy: 'enemy_copycat', count: 5, intervalMs: 800 }], chest: true },
  ],
  boss: { lock: 'lock_boss', spawn: 'sp_boss', id: 'boss_copycat_captain' },
  cardPool: ['woni_doyouknow', 'liv_youtoo', 'minami_yaho', 'may_chance', 'zena_ani', 'zena_whatisit', 'woni_ui'],
};
