import { describe, it, expect } from 'vitest';
import { calculateDamage, critChance } from '../src/systems/combat';
import type { Stats } from '../src/systems/types';

const atk10: Stats = { hp: 100, mp: 10, atk: 10, def: 0, spd: 0, luk: 0 };
const def4: Stats = { hp: 100, mp: 10, atk: 0, def: 4, spd: 0, luk: 0 };

function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('critChance', () => {
  it('starts at 5% and adds 1% per luk, capped at 50%', () => {
    expect(critChance(0)).toBeCloseTo(0.05);
    expect(critChance(10)).toBeCloseTo(0.15);
    expect(critChance(100)).toBe(0.5);
  });
});

describe('calculateDamage', () => {
  it('applies atk*mult - def*0.5 with no crit and neutral variance', () => {
    // rng: 0.99 -> no crit, 0.5 -> variance 1.0
    const r = calculateDamage(atk10, def4, 1.0, seq(0.99, 0.5));
    expect(r).toEqual({ amount: 8, crit: false });
  });
  it('multiplies by 1.5 on crit', () => {
    const r = calculateDamage(atk10, def4, 1.0, seq(0.0, 0.5));
    expect(r).toEqual({ amount: 12, crit: true });
  });
  it('applies skill multiplier before defense', () => {
    const r = calculateDamage(atk10, def4, 2.0, seq(0.99, 0.5));
    expect(r.amount).toBe(18);
  });
  it('never goes below 1', () => {
    const tank: Stats = { ...def4, def: 999 };
    expect(calculateDamage(atk10, tank, 1.0, seq(0.99, 0.0)).amount).toBe(1);
  });
  it('varies between 0.9x and 1.1x', () => {
    const low = calculateDamage(atk10, def4, 1.0, seq(0.99, 0.0)).amount;
    const high = calculateDamage(atk10, def4, 1.0, seq(0.99, 0.999)).amount;
    expect(low).toBe(Math.round(8 * 0.9));
    expect(high).toBe(Math.round(8 * 1.1));
  });
});
