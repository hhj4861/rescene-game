import type { EnemyDef } from './schema';

export const ENEMIES: EnemyDef[] = [
  // 스테이지 2(데뷔)용 잡몹 — 스펙 §3. 스테이지 1 웨이브에는 쓰이지 않는다.
  { id: 'enemy_nerves', name: '긴장 떨림', hp: 15, atk: 2, spd: 30,
    ai: 'patrol', width: 28, height: 28, color: '#a9b1d6', score: 100, heartChance: 0.15 },
  { id: 'enemy_sleep_slime', name: '졸음 슬라임', hp: 30, atk: 4, spd: 40,
    ai: 'patrol', width: 36, height: 28, color: '#7aa2f7', score: 100, heartChance: 0.15 },
  { id: 'enemy_sore_mushroom', name: '근육통 버섯', hp: 45, atk: 6, spd: 30,
    ai: 'patrol', width: 32, height: 36, color: '#e0af68', score: 150, heartChance: 0.15 },
  { id: 'enemy_offbeat_metronome', name: '박자이탈 메트로놈', hp: 40, atk: 7, spd: 90,
    ai: 'chase', width: 28, height: 40, color: '#f7768e', score: 200, heartChance: 0.15 },
  { id: 'enemy_selfdoubt', name: '자기의심 그림자', hp: 70, atk: 9, spd: 70,
    ai: 'chase', width: 40, height: 56, color: '#565f89', score: 300, heartChance: 0.15 },
  { id: 'boss_monthly_judges', name: '월말평가 심사위원단', hp: 600, atk: 12, spd: 60,
    ai: 'boss', width: 96, height: 96, color: '#bb9af7', score: 3000, heartChance: 0,
    phases: [{ hpRatio: 1, name: '1라운드: 보컬' }, { hpRatio: 0.66, name: '2라운드: 댄스' }, { hpRatio: 0.33, name: '3라운드: 랩' }] },
];
