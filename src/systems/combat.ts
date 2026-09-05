import type { Stats } from './types';

export interface DamageResult {
  amount: number;
  crit: boolean;
}

export function critChance(luk: number): number {
  return Math.min(0.5, 0.05 + luk * 0.01);
}

export function calculateDamage(
  attacker: Stats,
  defender: Stats,
  multiplier: number,
  rng: () => number,
): DamageResult {
  const base = Math.max(1, attacker.atk * multiplier - defender.def * 0.5);
  const crit = rng() < critChance(attacker.luk);
  const variance = 0.9 + rng() * 0.2;
  const amount = Math.max(1, Math.round(base * (crit ? 1.5 : 1) * variance));
  return { amount, crit };
}
