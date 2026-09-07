import { describe, it, expect } from 'vitest';
import { DEFAULT_MOVE_CONFIG, stepMovement, type MoveInput, type MoveState } from '../src/systems/movement';

const idle: MoveInput = { left: false, right: false, up: false, down: false, jumpPressed: false };
const ground: MoveState = { onGround: true, onLadder: false, climbing: false, jumpsLeft: 0, facing: 1 };
const air: MoveState = { ...ground, onGround: false, jumpsLeft: 1 };
const cfg = DEFAULT_MOVE_CONFIG;
const dbl = { ...cfg, maxJumps: 2 };

describe('running', () => {
  it('moves left/right and faces that way', () => {
    const r = stepMovement({ ...idle, left: true }, ground, cfg);
    expect(r.vx).toBe(-cfg.speed);
    expect(r.facing).toBe(-1);
    expect(r.gravity).toBe(true);
  });
  it('stops when no input and keeps facing', () => {
    const r = stepMovement(idle, { ...ground, facing: -1 }, cfg);
    expect(r.vx).toBe(0);
    expect(r.vy).toBeNull();
    expect(r.facing).toBe(-1);
  });
});

describe('jumping', () => {
  it('refills jumps on ground and jumps once', () => {
    const r = stepMovement({ ...idle, jumpPressed: true }, ground, cfg);
    expect(r.vy).toBe(cfg.jumpVelocity);
    expect(r.jumpsLeft).toBe(0);
  });
  it('cannot jump in air with maxJumps 1', () => {
    const r = stepMovement({ ...idle, jumpPressed: true }, { ...air, jumpsLeft: 0 }, cfg);
    expect(r.vy).toBeNull();
  });
  it('double jumps once with maxJumps 2, not twice', () => {
    const first = stepMovement({ ...idle, jumpPressed: true }, { ...ground }, dbl);
    expect(first.jumpsLeft).toBe(1);
    const second = stepMovement({ ...idle, jumpPressed: true }, { ...air, jumpsLeft: first.jumpsLeft }, dbl);
    expect(second.vy).toBe(dbl.jumpVelocity);
    expect(second.jumpsLeft).toBe(0);
    const third = stepMovement({ ...idle, jumpPressed: true }, { ...air, jumpsLeft: 0 }, dbl);
    expect(third.vy).toBeNull();
  });
  it('down+jump on ground drops through instead of jumping', () => {
    const r = stepMovement({ ...idle, down: true, jumpPressed: true }, ground, cfg);
    expect(r.dropThrough).toBe(true);
    expect(r.vy).toBeNull();
  });
});

describe('ladders', () => {
  const ladder: MoveState = { ...air, onLadder: true };
  it('starts climbing on up while on a ladder and disables gravity', () => {
    const r = stepMovement({ ...idle, up: true }, ladder, cfg);
    expect(r.climbing).toBe(true);
    expect(r.gravity).toBe(false);
    expect(r.vy).toBe(-cfg.climbSpeed);
    expect(r.vx).toBe(0);
  });
  it('holds still on a ladder with no vertical input', () => {
    const r = stepMovement(idle, { ...ladder, climbing: true }, cfg);
    expect(r.vy).toBe(0);
    expect(r.climbing).toBe(true);
  });
  it('leaves the ladder by jumping', () => {
    const r = stepMovement({ ...idle, jumpPressed: true }, { ...ladder, climbing: true }, cfg);
    expect(r.climbing).toBe(false);
    expect(r.vy).toBe(cfg.jumpVelocity);
    expect(r.gravity).toBe(true);
  });
  it('stops climbing when the ladder ends', () => {
    const r = stepMovement({ ...idle, up: true }, { ...air, climbing: true, onLadder: false }, cfg);
    expect(r.climbing).toBe(false);
    expect(r.gravity).toBe(true);
  });
});
