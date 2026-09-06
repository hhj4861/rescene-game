import type { MemberId } from './types';
import type { BuffTotals } from './cards';

export interface RunState {
  member: MemberId;
  stageIndex: number;
  lives: number;
  hearts: number;
  maxHearts: number;
  score: number;
  gauge: number;
  cards: string[];
  continues: number;
  bossHit: boolean;
  stageKills: number;
  maxCombo: number;
}

export const RUN_DEFAULTS = { lives: 3, hearts: 5, continues: 1, gaugeMax: 100 } as const;

export function newRun(member: MemberId, stageIndex = 1): RunState {
  return {
    member,
    stageIndex,
    lives: RUN_DEFAULTS.lives,
    hearts: RUN_DEFAULTS.hearts,
    maxHearts: RUN_DEFAULTS.hearts,
    score: 0,
    gauge: 0,
    cards: [],
    continues: RUN_DEFAULTS.continues,
    bossHit: false,
    stageKills: 0,
    maxCombo: 0,
  };
}

export function takeHit(s: RunState, amount: number): RunState {
  return { ...s, hearts: Math.max(0, s.hearts - amount) };
}

export function isDead(s: RunState): boolean {
  return s.hearts === 0;
}

export function loseLife(s: RunState): RunState {
  return { ...s, lives: Math.max(0, s.lives - 1), hearts: s.maxHearts, gauge: 0 };
}

export function useContinue(s: RunState): RunState | null {
  if (s.continues <= 0) return null;
  return {
    ...s,
    lives: RUN_DEFAULTS.lives,
    hearts: s.maxHearts,
    score: 0,
    gauge: 0,
    cards: [],
    continues: s.continues - 1,
  };
}

export function heal(s: RunState, n: number): RunState {
  return { ...s, hearts: Math.min(s.maxHearts, s.hearts + n) };
}

export function raiseMaxHearts(s: RunState, n: number): RunState {
  return { ...s, maxHearts: s.maxHearts + n, hearts: s.hearts + n };
}

export function addGauge(s: RunState, amount: number, buffs: BuffTotals): RunState {
  const gained = Math.floor(amount * (1 + buffs.gauge));
  return { ...s, gauge: Math.min(RUN_DEFAULTS.gaugeMax, s.gauge + gained) };
}

export function isGaugeFull(s: RunState): boolean {
  return s.gauge >= RUN_DEFAULTS.gaugeMax;
}

export function spendGauge(s: RunState): RunState {
  return { ...s, gauge: 0 };
}

export function addScore(s: RunState, points: number, buffs: BuffTotals): RunState {
  return { ...s, score: s.score + Math.floor(points * (1 + buffs.score)) };
}

export function recordKill(s: RunState, comboCount: number): RunState {
  return { ...s, stageKills: s.stageKills + 1, maxCombo: Math.max(s.maxCombo, comboCount) };
}

export function markBossHit(s: RunState): RunState {
  return { ...s, bossHit: true };
}

export function stageCleared(s: RunState, bonus: number): RunState {
  return {
    ...s,
    score: s.score + bonus,
    stageIndex: s.stageIndex + 1,
    hearts: s.maxHearts,
    gauge: 0,
    bossHit: false,
    stageKills: 0,
    maxCombo: 0,
  };
}

export function stageRestarted(s: RunState): RunState {
  return { ...s, bossHit: false };
}
