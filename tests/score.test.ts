import { describe, it, expect } from 'vitest';
import { clearBonus, comboExpired, comboMultiplier, emptyCombo, killPoints, registerKill } from '../src/systems/score';
describe('combo', () => {
  it('chains kills inside the window and resets outside it', () => {
    let c = registerKill(emptyCombo(), 1000); c = registerKill(c, 2500); expect(c.count).toBe(2);
    c = registerKill(c, 6000); expect(c.count).toBe(1);
  });
  it('multiplier steps at 5 and 10', () => { expect(comboMultiplier(4)).toBe(1); expect(comboMultiplier(5)).toBe(2); expect(comboMultiplier(10)).toBe(3); expect(killPoints(150, 7)).toBe(300); });
  it('expiry is reported for the HUD', () => { expect(comboExpired(registerKill(emptyCombo(), 0), 2001)).toBe(true); expect(comboExpired(registerKill(emptyCombo(), 0), 1999)).toBe(false); });
  it('a longer window from the combo card keeps the chain', () => { expect(registerKill(registerKill(emptyCombo(), 0), 2500, 3000).count).toBe(2); });
});
describe('clear bonus', () => {
  it('adds lives, time and no-hit bonuses', () => { expect(clearBonus(2, 37, true)).toEqual({ lives: 2000, time: 370, noHit: 2000, total: 4370 }); expect(clearBonus(0, -5, false).total).toBe(0); });
});
