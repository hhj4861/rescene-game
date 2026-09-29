import { describe, it, expect } from 'vitest';
import { addCard, buffTotals, comboWindowMs, emptyBuffs } from '../src/systems/cards';
const lookup = (id: string) => ({ a: { key: 'atk' as const, value: 2 }, b: { key: 'gauge' as const, value: 0.25 }, c: { key: 'combo' as const, value: 1000 }, d: { key: 'atk' as const, value: 2 } })[id]!;
describe('cards', () => {
  it('holds at most three, dropping the oldest', () => {
    let r = addCard([], 'a'); r = addCard(r.cards, 'b'); r = addCard(r.cards, 'c'); expect(r).toEqual({ cards: ['a', 'b', 'c'], dropped: null });
    r = addCard(r.cards, 'd'); expect(r).toEqual({ cards: ['b', 'c', 'd'], dropped: 'a' });
  });
  it('ignores a duplicate', () => { expect(addCard(['a'], 'a')).toEqual({ cards: ['a'], dropped: null }); });
  it('sums buffs by key', () => { expect(buffTotals(['a', 'd', 'b'], lookup)).toEqual({ ...emptyBuffs(), atk: 4, gauge: 0.25 }); expect(comboWindowMs(buffTotals(['c'], lookup))).toBe(3000); });
});
