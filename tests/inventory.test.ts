import { describe, it, expect } from 'vitest';
import { addItem, countOf, emptyInventory, equipItem, equipmentStats, removeItem } from '../src/systems/inventory';
import { getItem } from '../src/data/index';

describe('inventory items', () => {
  it('adds and counts', () => {
    const inv = addItem(addItem(emptyInventory(), 'food_mulhoe'), 'food_mulhoe', 2);
    expect(countOf(inv, 'food_mulhoe')).toBe(3);
    expect(countOf(inv, 'nothing')).toBe(0);
  });
  it('removes and deletes the key at zero', () => {
    const inv = removeItem(addItem(emptyInventory(), 'food_mulhoe', 2), 'food_mulhoe', 2);
    expect(inv.items).toEqual({});
  });
  it('throws when removing more than owned', () => {
    expect(() => removeItem(emptyInventory(), 'food_mulhoe')).toThrow(/food_mulhoe/);
  });
});

describe('equipment', () => {
  it('moves an equip item from bag to slot and back', () => {
    let inv = addItem(emptyInventory(), 'equip_inear_basic');
    inv = equipItem(inv, getItem('equip_inear_basic'));
    expect(inv.equipment.inear).toBe('equip_inear_basic');
    expect(countOf(inv, 'equip_inear_basic')).toBe(0);
    inv = addItem(inv, 'equip_inear_basic');
    inv = equipItem(inv, getItem('equip_inear_basic'));
    expect(countOf(inv, 'equip_inear_basic')).toBe(1);
  });
  it('refuses non-equip items', () => {
    expect(() => equipItem(addItem(emptyInventory(), 'food_mulhoe'), getItem('food_mulhoe'))).toThrow(/equip/);
  });
  it('sums equipment stats', () => {
    const inv = equipItem(addItem(emptyInventory(), 'equip_inear_basic'), getItem('equip_inear_basic'));
    expect(equipmentStats(inv, getItem)).toEqual({ def: 2 });
  });
});
