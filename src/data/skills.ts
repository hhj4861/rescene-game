import type { SkillDef } from './schema';

export const SKILLS: SkillDef[] = [
  // 기본 공격
  { id: 'woni_basic', name: '스탠드 휘두르기', member: 'woni', level: 1, mpCost: 0, cooldownMs: 400, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'melee', width: 48, height: 40, knockback: 120 }] },
  { id: 'liv_basic', name: '음파', member: 'liv', level: 1, mpCost: 0, cooldownMs: 450, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 500, range: 320, pierce: false }] },
  { id: 'minami_basic', name: '먹물 튀기기', member: 'minami', level: 1, mpCost: 0, cooldownMs: 450, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 480, range: 280, pierce: false }] },
  { id: 'may_basic', name: '스티커 던지기', member: 'may', level: 1, mpCost: 0, cooldownMs: 400, multiplier: 0.9, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 450, range: 260, pierce: false }] },
  { id: 'zena_basic', name: '헤어핀 베기', member: 'zena', level: 1, mpCost: 0, cooldownMs: 350, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'melee', width: 44, height: 44, knockback: 100 }] },

  // Lv1 시그니처
  { id: 'woni_ui', name: '우이!', member: 'woni', level: 1, mpCost: 8, cooldownMs: 4000, multiplier: 1.4, origin: '시그니처 감탄사',
    effects: [{ kind: 'melee', width: 96, height: 48, knockback: 200 }, { kind: 'buff', stat: 'atk', ratio: 0.10, durationMs: 8000 }] },
  { id: 'liv_pitch', name: '고음 안정', member: 'liv', level: 1, mpCost: 8, cooldownMs: 3000, multiplier: 1.3, origin: '라이브 음정이 흔들리지 않는 메인보컬',
    effects: [{ kind: 'projectile', speed: 520, range: 400, pierce: true }] },
  { id: 'minami_brush', name: '일필휘지', member: 'minami', level: 1, mpCost: 10, cooldownMs: 3500, multiplier: 1.5, origin: '서예 8년, 치바현 대회 1등',
    effects: [{ kind: 'projectile', speed: 700, range: 300, pierce: true }] },
  { id: 'may_chatter', name: '쫑알쫑알', member: 'may', level: 1, mpCost: 8, cooldownMs: 3000, multiplier: 0.5, origin: '별명 쫑알메이 · 메찬호',
    effects: [{ kind: 'projectile', speed: 400, range: 240, pierce: false }, { kind: 'dot', ticks: 5, intervalMs: 500 }] },
  { id: 'zena_turn', name: '까엉턴', member: 'zena', level: 1, mpCost: 8, cooldownMs: 3000, multiplier: 1.3, origin: '시그니처 딥 턴',
    effects: [{ kind: 'melee', width: 72, height: 56, knockback: 150, centered: true }] },

  // Lv5
  { id: 'woni_ma', name: '마! 니 뭐!', member: 'woni', level: 5, mpCost: 12, cooldownMs: 8000, multiplier: 1.0, origin: '경상도 사투리 경고',
    effects: [{ kind: 'stun', width: 80, height: 48, durationMs: 1500 }] },
  { id: 'liv_thumb', name: '왕따봉', member: 'liv', level: 5, mpCost: 10, cooldownMs: 5000, multiplier: 1.6, origin: '수원 왕발가락 개인기',
    effects: [{ kind: 'melee', width: 56, height: 48, knockback: 320 }] },
  { id: 'minami_gal', name: '쵸베리구', member: 'minami', level: 5, mpCost: 15, cooldownMs: 12000, multiplier: 0, origin: '갸루 표현 "완전 좋다"',
    effects: [{ kind: 'buff', stat: 'atk', ratio: 0.15, durationMs: 10000 }] },
  { id: 'may_focus', name: '집쭝!', member: 'may', level: 5, mpCost: 10, cooldownMs: 6000, multiplier: 0.8, origin: '라이브 시청자 집중 요청',
    effects: [{ kind: 'projectile', speed: 450, range: 260, pierce: false }, { kind: 'debuff', stat: 'def', ratio: -0.20, durationMs: 6000 }] },
  { id: 'zena_ani', name: '아뉘이이이!', member: 'zena', level: 5, mpCost: 12, cooldownMs: 7000, multiplier: 3.0, origin: '시그니처 투정',
    effects: [{ kind: 'counter', windowMs: 1000, multiplier: 3.0 }] },
];
