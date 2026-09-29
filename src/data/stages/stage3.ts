import type { StageDef } from '../schema';

export const STAGE_3: StageDef = {
  id: 's3_road', index: 3, name: '신인의 길과 무명의 터널', era: '2024.06 ~ 2025.12', map: 's3_road', bgm: 'stage', timerSec: 240, palette: 'stage3', outfit: 'road',
  intro: [
    '2024년 6월 9일 위문열차. 데뷔 100일, 팬덤 이름은 리마인.',
    '8월 27일 LOVE ATTACK. 메이의 공약 — 멜론 TOP100에 들면 거제까지 뛴다.',
    '2025년 Glow Up, Dearest, lip bomb. 그리고 "리센느 아세요?"',
  ],
  sections: [
    { lock: 'lock_a', spawn: 're_a', waves: [{ spawn: 'sp_a1', enemy: 'enemy_chart_ghost', count: 4, intervalMs: 900 }, { spawn: 'sp_a2', enemy: 'enemy_schedule_bomb', count: 2, intervalMs: 1500 }],
      cheer: { npc: 'npc_may', spawn: 'sp_cheer_a', text: '기회는 그립감이 좋다.' } },
    { lock: 'lock_b', spawn: 're_b', waves: [{ spawn: 'sp_b1', enemy: 'enemy_hate_crow', count: 3, intervalMs: 800 }, { spawn: 'sp_b2', enemy: 'enemy_chart_ghost', count: 3, intervalMs: 900 }, { spawn: 'sp_b1', enemy: 'enemy_hate_crow', count: 1, intervalMs: 0, elite: true }], chest: true },
    { lock: 'lock_c', spawn: 're_c', waves: [{ spawn: 'sp_c1', enemy: 'enemy_chart_ghost', count: 3, intervalMs: 900 }, { spawn: 'sp_c3', enemy: 'boss_top100_gate', count: 1, intervalMs: 0 }] },
    { lock: 'lock_d', spawn: 're_d', waves: [{ spawn: 'sp_d1', enemy: 'enemy_apathy_fog', count: 3, intervalMs: 1200 }, { spawn: 'sp_d2', enemy: 'enemy_hate_crow', count: 4, intervalMs: 800 }], chest: true },
  ],
  boss: { lock: 'lock_boss', spawn: 'sp_boss', id: 'boss_silence' },
  cardPool: ['woni_doyouknow', 'liv_youtoo', 'minami_yaho', 'may_chance', 'zena_ani', 'minami_sorry', 'may_grip'],
};
