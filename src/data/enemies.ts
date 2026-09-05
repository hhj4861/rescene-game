import type { EnemyDef } from './schema';

export const ENEMIES: EnemyDef[] = [
  { id: 'enemy_nerves', name: '떨림', chapter: 0, hp: 15, atk: 2, def: 0, spd: 30, xp: 8, hearts: [1, 3],
    ai: 'patrol', width: 28, height: 28, color: '#a9b1d6', drops: [] },
  { id: 'enemy_sleep_slime', name: '졸음 슬라임', chapter: 1, hp: 30, atk: 4, def: 1, spd: 40, xp: 12, hearts: [3, 6],
    ai: 'patrol', width: 36, height: 28, color: '#7aa2f7', drops: [{ itemId: 'food_mulhoe', chance: 0.05 }] },
  { id: 'enemy_sore_mushroom', name: '근육통 버섯', chapter: 1, hp: 45, atk: 6, def: 3, spd: 30, xp: 18, hearts: [4, 8],
    ai: 'patrol', width: 32, height: 36, color: '#e0af68', drops: [{ itemId: 'food_yeopddeok', chance: 0.05 }, { itemId: 'etc_snack_ingredient', chance: 0.5 }] },
  { id: 'enemy_offbeat_metronome', name: '박자이탈 메트로놈', chapter: 1, hp: 40, atk: 7, def: 2, spd: 90, xp: 22, hearts: [5, 9],
    ai: 'chase', width: 28, height: 40, color: '#f7768e', drops: [{ itemId: 'food_tteokguk', chance: 0.05 }] },
  { id: 'enemy_selfdoubt', name: '자기의심 그림자', chapter: 1, hp: 70, atk: 9, def: 4, spd: 70, xp: 35, hearts: [8, 14],
    ai: 'chase', width: 40, height: 56, color: '#565f89', drops: [{ itemId: 'food_seolleongtang', chance: 0.08 }, { itemId: 'photocard_may_rescene', chance: 0.03 }] },
  { id: 'boss_monthly_judges', name: '월말평가 심사위원단', chapter: 1, hp: 600, atk: 12, def: 6, spd: 60, xp: 400, hearts: [120, 160],
    ai: 'boss', width: 96, height: 96, color: '#bb9af7', drops: [{ itemId: 'equip_inear_basic', chance: 1 }] },
];
