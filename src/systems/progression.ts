import { STAT_KEYS, type PlayerState, type Stats } from './types';

export const MAX_LEVEL = 60;
export const SP_PER_LEVEL = 3;

export function xpForLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(50 * Math.pow(level, 1.8));
}

export function statsForLevel(base: Stats, growth: Stats, level: number): Stats {
  const out = { ...base };
  for (const k of STAT_KEYS) out[k] = base[k] + Math.floor(growth[k] * (level - 1));
  return out;
}

export function applyXp(state: PlayerState, xp: number): { state: PlayerState; levelsGained: number } {
  let level = state.level;
  let pool = state.xp + xp;
  let sp = state.sp;
  let gained = 0;
  while (level < MAX_LEVEL && pool >= xpForLevel(level)) {
    pool -= xpForLevel(level);
    level += 1;
    sp += SP_PER_LEVEL;
    gained += 1;
  }
  if (level >= MAX_LEVEL) pool = 0;
  return { state: { ...state, level, xp: pool, sp }, levelsGained: gained };
}
