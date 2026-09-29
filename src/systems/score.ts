export interface ComboState {
  count: number;
  lastKillAt: number;
}

export const COMBO_WINDOW_MS = 2000;
export const ELITE_SCORE = 500;
export const BOSS_SCORE = 3000;
export const NO_HIT_BONUS = 2000;

export function emptyCombo(): ComboState {
  return { count: 0, lastKillAt: -Infinity };
}

export function registerKill(c: ComboState, now: number, windowMs = COMBO_WINDOW_MS): ComboState {
  const inWindow = now - c.lastKillAt <= windowMs;
  return { count: inWindow ? c.count + 1 : 1, lastKillAt: now };
}

export function comboExpired(c: ComboState, now: number, windowMs = COMBO_WINDOW_MS): boolean {
  return now - c.lastKillAt > windowMs;
}

export function comboMultiplier(count: number): 1 | 2 | 3 {
  if (count < 5) return 1;
  if (count < 10) return 2;
  return 3;
}

export function killPoints(base: number, comboCount: number): number {
  return base * comboMultiplier(comboCount);
}

export interface ClearBonus {
  lives: number;
  time: number;
  noHit: number;
  total: number;
}

export function clearBonus(lives: number, remainingSec: number, noHitBoss: boolean): ClearBonus {
  const livesBonus = lives * 1000;
  const timeBonus = Math.max(0, remainingSec) * 10;
  const noHit = noHitBoss ? NO_HIT_BONUS : 0;
  return { lives: livesBonus, time: timeBonus, noHit, total: livesBonus + timeBonus + noHit };
}
