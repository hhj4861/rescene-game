import { describe, it, expect } from 'vitest';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY_Y, TILE } from '../src/config';

describe('config', () => {
  it('uses the spec resolution and physics constants', () => {
    expect(GAME_WIDTH).toBe(960);
    expect(GAME_HEIGHT).toBe(540);
    expect(GRAVITY_Y).toBe(800);
    expect(TILE).toBe(32);
  });
});
