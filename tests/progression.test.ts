import { describe, it, expect } from 'vitest';
import { xpForLevel, statsForLevel, applyXp, MAX_LEVEL, SP_PER_LEVEL } from '../src/systems/progression';
import type { PlayerState, Stats } from '../src/systems/types';

const base: Stats = { hp: 120, mp: 40, atk: 8, def: 8, spd: 5, luk: 3 };
const growth: Stats = { hp: 12, mp: 3, atk: 1.2, def: 1.4, spd: 0.2, luk: 0.2 };

function player(level = 1, xp = 0): PlayerState {
  return { member: 'woni', level, xp, sp: 0, hp: 120, mp: 40, skillLevels: {} };
}

describe('xpForLevel', () => {
  it('follows floor(50 * lv^1.8)', () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(2)).toBe(Math.floor(50 * Math.pow(2, 1.8)));
    expect(xpForLevel(10)).toBe(Math.floor(50 * Math.pow(10, 1.8)));
  });
  it('is strictly increasing below max level', () => {
    for (let lv = 1; lv < MAX_LEVEL; lv++) expect(xpForLevel(lv + 1)).toBeGreaterThan(xpForLevel(lv));
  });
  it('is Infinity at max level', () => {
    expect(xpForLevel(MAX_LEVEL)).toBe(Infinity);
  });
});

describe('statsForLevel', () => {
  it('returns base stats at level 1', () => {
    expect(statsForLevel(base, growth, 1)).toEqual(base);
  });
  it('adds floor(growth * (level-1)) per stat', () => {
    const s = statsForLevel(base, growth, 11);
    expect(s.hp).toBe(120 + 120);
    expect(s.atk).toBe(8 + 12);
    expect(s.spd).toBe(5 + 2);
  });
});

describe('applyXp', () => {
  it('accumulates xp without leveling', () => {
    const r = applyXp(player(), 30);
    expect(r.state.level).toBe(1);
    expect(r.state.xp).toBe(30);
    expect(r.levelsGained).toBe(0);
  });
  it('levels up once, carries remainder, grants SP', () => {
    const r = applyXp(player(), 60);
    expect(r.state.level).toBe(2);
    expect(r.state.xp).toBe(10);
    expect(r.state.sp).toBe(SP_PER_LEVEL);
    expect(r.levelsGained).toBe(1);
  });
  it('levels up multiple times in one call', () => {
    const r = applyXp(player(), xpForLevel(1) + xpForLevel(2) + 5);
    expect(r.state.level).toBe(3);
    expect(r.state.xp).toBe(5);
    expect(r.state.sp).toBe(SP_PER_LEVEL * 2);
    expect(r.levelsGained).toBe(2);
  });
  it('caps at MAX_LEVEL and discards overflow', () => {
    const r = applyXp(player(MAX_LEVEL - 1, 0), 10_000_000);
    expect(r.state.level).toBe(MAX_LEVEL);
    expect(r.state.xp).toBe(0);
  });
  it('does not mutate input', () => {
    const p = player();
    applyXp(p, 500);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(0);
  });
});
