import type { SkillDef } from './schema';

// 스펙 §5 표: 필살기 배율·효과. 기본 공격 5개는 v0.1 그대로 둔다.
export const SKILLS: SkillDef[] = [
  // 기본 공격
  { id: 'woni_basic', name: '스탠드 휘두르기', member: 'woni', multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'melee', width: 48, height: 40, knockback: 120 }] },
  { id: 'liv_basic', name: '음파', member: 'liv', multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 500, range: 320, pierce: false }] },
  { id: 'minami_basic', name: '먹물 튀기기', member: 'minami', multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 480, range: 280, pierce: false }] },
  { id: 'may_basic', name: '스티커 던지기', member: 'may', multiplier: 0.9, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 450, range: 260, pierce: false }] },
  { id: 'zena_basic', name: '헤어핀 베기', member: 'zena', multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'melee', width: 44, height: 44, knockback: 100 }] },

  // 필살기(유행어)
  { id: 'woni_ui', name: '우이!', member: 'woni', multiplier: 2.0, origin: '시그니처 감탄사',
    effects: [{ kind: 'melee', width: 96, height: 48, knockback: 300 }, { kind: 'buff', stat: 'atk', ratio: 0.20, durationMs: 8000 }] },
  { id: 'liv_pitch', name: '고음 안정', member: 'liv', multiplier: 2.5, origin: '라이브 음정이 흔들리지 않는 메인보컬',
    effects: [{ kind: 'projectile', speed: 520, range: 1200, pierce: true }] },
  { id: 'minami_brush', name: '일필휘지', member: 'minami', multiplier: 3.0, origin: '서예 8년, 치바현 대회 1등',
    effects: [{ kind: 'projectile', speed: 700, range: 1200, pierce: true }] },
  { id: 'may_chatter', name: '쫑알쫑알', member: 'may', multiplier: 0.5, origin: '별명 쫑알메이 · 메찬호',
    effects: [{ kind: 'dot', ticks: 5, intervalMs: 500 }] },
  { id: 'zena_turn', name: '까엉턴', member: 'zena', multiplier: 3.0, origin: '시그니처 딥 턴',
    effects: [{ kind: 'melee', width: 240, height: 240, knockback: 250, centered: true }] },
];
