import type { MemeDef, PassiveKey } from '../data/schema';

export interface MemeState {
  unlocked: string[];
  equipped: (string | null)[];
}

export function emptyMemeState(slots = 1): MemeState {
  return { unlocked: [], equipped: Array.from({ length: slots }, () => null) };
}

export function unlockMeme(s: MemeState, id: string): MemeState {
  if (s.unlocked.includes(id)) return s;
  return { ...s, unlocked: [...s.unlocked, id] };
}

export function equipMeme(s: MemeState, slot: number, id: string): MemeState {
  if (slot < 0 || slot >= s.equipped.length) throw new Error(`meme slot ${slot} out of range`);
  if (!s.unlocked.includes(id)) throw new Error(`meme ${id} is not unlocked`);
  const equipped = s.equipped.map((e) => (e === id ? null : e));
  equipped[slot] = id;
  return { ...s, equipped };
}

export function openMemeSlot(s: MemeState): MemeState {
  return { ...s, equipped: [...s.equipped, null] };
}

export function passiveTotals(s: MemeState, getMeme: (id: string) => MemeDef): Partial<Record<PassiveKey, number>> {
  const total: Partial<Record<PassiveKey, number>> = {};
  for (const id of s.equipped) {
    if (!id) continue;
    const p = getMeme(id).passive;
    if (!p) continue;
    total[p.key] = (total[p.key] ?? 0) + p.value;
  }
  return total;
}
