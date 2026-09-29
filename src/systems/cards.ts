import type { BuffKey } from '../data/schema';

export type { BuffKey };

export interface BuffTotals {
  atk: number;
  spd: number;
  jump: number;
  gauge: number;
  heart: number;
  combo: number;
  score: number;
}

export const MAX_CARDS = 3;

export function emptyBuffs(): BuffTotals {
  return { atk: 0, spd: 0, jump: 0, gauge: 0, heart: 0, combo: 0, score: 0 };
}

export function addCard(cards: string[], id: string): { cards: string[]; dropped: string | null } {
  if (cards.includes(id)) return { cards, dropped: null };
  const next = [...cards, id];
  if (next.length > MAX_CARDS) {
    const [dropped, ...rest] = next;
    return { cards: rest, dropped: dropped! };
  }
  return { cards: next, dropped: null };
}

export function buffTotals(cards: string[], lookup: (id: string) => { key: BuffKey; value: number }): BuffTotals {
  const totals = emptyBuffs();
  for (const id of cards) {
    const { key, value } = lookup(id);
    totals[key] += value;
  }
  return totals;
}

export function comboWindowMs(buffs: BuffTotals): number {
  return 2000 + buffs.combo;
}
