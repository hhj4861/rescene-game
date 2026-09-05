import type { EquipSlot, ItemDef } from '../data/schema';
import { STAT_KEYS, type Stats } from './types';

export interface InventoryState {
  items: Record<string, number>;
  equipment: Record<EquipSlot, string | null>;
}

export function emptyInventory(): InventoryState {
  return { items: {}, equipment: { inear: null, outfit: null, mic: null, shoes: null } };
}

export function countOf(inv: InventoryState, itemId: string): number {
  return inv.items[itemId] ?? 0;
}

export function addItem(inv: InventoryState, itemId: string, count = 1): InventoryState {
  return { ...inv, items: { ...inv.items, [itemId]: countOf(inv, itemId) + count } };
}

export function removeItem(inv: InventoryState, itemId: string, count = 1): InventoryState {
  const have = countOf(inv, itemId);
  if (have < count) throw new Error(`not enough ${itemId}: have ${have}, need ${count}`);
  const items = { ...inv.items };
  if (have === count) delete items[itemId];
  else items[itemId] = have - count;
  return { ...inv, items };
}

export function equipItem(inv: InventoryState, item: ItemDef): InventoryState {
  if (item.type !== 'equip') throw new Error(`${item.id} is not an equip item`);
  let next = removeItem(inv, item.id);
  const previous = next.equipment[item.slot];
  if (previous) next = addItem(next, previous);
  return { ...next, equipment: { ...next.equipment, [item.slot]: item.id } };
}

export function equipmentStats(inv: InventoryState, getItem: (id: string) => ItemDef): Partial<Stats> {
  const total: Partial<Stats> = {};
  for (const id of Object.values(inv.equipment)) {
    if (!id) continue;
    const item = getItem(id);
    if (item.type !== 'equip') continue;
    for (const k of STAT_KEYS) {
      const v = item.stats[k];
      if (v !== undefined) total[k] = (total[k] ?? 0) + v;
    }
  }
  return total;
}
