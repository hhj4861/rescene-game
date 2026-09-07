import { describe, it, expect } from 'vitest';
import { damage } from '../src/systems/combat';

describe('damage', () => {
  it('multiplies atk by the skill multiplier, rounded to the nearest integer', () => {
    expect(damage(10, 1.0)).toBe(10);
    expect(damage(10, 1.6)).toBe(16);
    expect(damage(7, 0.5)).toBe(4);
  });
  it('never goes below 1', () => {
    expect(damage(0, 1)).toBe(1);
    expect(damage(1, 0.01)).toBe(1);
  });
});
