import type { StageDef } from '../schema';

export const STAGE_2: StageDef = {
  id: 's2_debut', index: 2, name: '데뷔', era: '2024.02 ~ 2024.03', map: 's2_debut', bgm: 'stage', timerSec: 200, palette: 'stage2',
  intro: [
    '2024년 2월 7일, COMING SOON. 티저가 하나씩 열렸다 — 미나미, 원이, 제나, 메이, 리브.',
    '2월 29일 YoYo 선공개. 3월 26일 데뷔 쇼케이스.',
    'Re:Scene, 첫 무대 UhUh. 카메라 앞에 선다.',
  ],
  sections: [
    { lock: 'lock_a', spawn: 're_a', waves: [{ spawn: 'sp_a1', enemy: 'enemy_nerves', count: 5, intervalMs: 900 }],
      cheer: { npc: 'npc_zena', spawn: 'sp_cheer_a', text: '그게 뭔데요? …떨지 마요!' } },
    { lock: 'lock_b', spawn: 're_b', waves: [{ spawn: 'sp_b1', enemy: 'enemy_inear_noise', count: 4, intervalMs: 800 }, { spawn: 'sp_b2', enemy: 'enemy_apathetic_audience', count: 2, intervalMs: 1500 }], chest: true },
    { lock: 'lock_c', spawn: 're_c', waves: [{ spawn: 'sp_c1', enemy: 'enemy_inear_noise', count: 3, intervalMs: 900 }, { spawn: 'sp_c2', enemy: 'enemy_nerves', count: 4, intervalMs: 800 }, { spawn: 'sp_c1', enemy: 'enemy_inear_noise', count: 1, intervalMs: 0, elite: true }] },
    { lock: 'lock_d', spawn: 're_d', waves: [{ spawn: 'sp_d1', enemy: 'enemy_apathetic_audience', count: 3, intervalMs: 1500 }, { spawn: 'sp_d2', enemy: 'enemy_inear_noise', count: 4, intervalMs: 800 }], chest: true },
  ],
  boss: { lock: 'lock_boss', spawn: 'sp_boss', id: 'boss_first_camera' },
  cardPool: ['woni_doyouknow', 'liv_youtoo', 'minami_yaho', 'may_chance', 'zena_ani', 'woni_ui', 'liv_motto'],
};
