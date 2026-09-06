import type { StageDef } from '../schema';

export const STAGE_1: StageDef = {
  id: 's1_trainee', index: 1, name: '연습생', era: '2022 ~ 2024.02', map: 's1_trainee', bgm: 'stage', timerSec: 180,
  intro: ['2022년, 더뮤즈엔터테인먼트 연습실.', '원이와 미나미가 먼저 왔고, 리브·제나·메이는 2023년에 합류했다.', '데뷔조는 아직 정해지지 않았다. 월말평가가 다가온다.'],
  sections: [
    { lock: 'lock_a', spawn: 're_a', waves: [{ spawn: 'sp_a1', enemy: 'enemy_sleep_slime', count: 4, intervalMs: 900 }, { spawn: 'sp_a2', enemy: 'enemy_sleep_slime', count: 3, intervalMs: 1200 }],
      cheer: { npc: 'npc_minami', spawn: 'sp_cheer_a', text: '죄송합니다… 아니, 화이팅!' } },
    { lock: 'lock_b', spawn: 're_b', waves: [{ spawn: 'sp_b1', enemy: 'enemy_sore_mushroom', count: 3, intervalMs: 1500 }, { spawn: 'sp_b2', enemy: 'enemy_sleep_slime', count: 4, intervalMs: 800 }, { spawn: 'sp_b1', enemy: 'enemy_sore_mushroom', count: 1, intervalMs: 0, elite: true }], chest: true },
    { lock: 'lock_c', spawn: 're_c', waves: [{ spawn: 'sp_c1', enemy: 'enemy_offbeat_metronome', count: 3, intervalMs: 1000 }, { spawn: 'sp_c2', enemy: 'enemy_selfdoubt', count: 2, intervalMs: 2000 }],
      cheer: { npc: 'npc_liv', spawn: 'sp_cheer_c', text: '천천히 가도 멈추지 말자.' } },
    { lock: 'lock_d', spawn: 're_d', waves: [{ spawn: 'sp_d1', enemy: 'enemy_selfdoubt', count: 2, intervalMs: 1500 }, { spawn: 'sp_d2', enemy: 'enemy_offbeat_metronome', count: 4, intervalMs: 700 }, { spawn: 'sp_d1', enemy: 'enemy_selfdoubt', count: 1, intervalMs: 0, elite: true }], chest: true },
  ],
  boss: { lock: 'lock_boss', spawn: 'sp_boss', id: 'boss_monthly_judges' },
  cardPool: ['woni_ui', 'woni_oishie', 'liv_motto', 'minami_sorry', 'may_grip', 'zena_whatisit'],
};
