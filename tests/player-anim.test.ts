import { describe, it, expect } from 'vitest';
import {
  FLOURISH_AFTER_MS, FLOURISH_MS, HITSTOP_MS, IDLE_START, ZENA_SPIN_FLIP_MS,
  attackAnimFor, canStartHitstop, hitstopMsFor, nextIdleAnim, shouldResumeHitstop, superFlipX,
  type IdleAnimState,
} from '../src/systems/playerAnim';

/** resting 상태로 dtMs 씩 n 번 진행한 뒤의 (state, anim). */
function advance(state: IdleAnimState, dtMs: number, n: number): { state: IdleAnimState; anim: 'idle' | 'flourish' | null } {
  let s = state;
  let anim: 'idle' | 'flourish' | null = null;
  for (let i = 0; i < n; i++) {
    const r = nextIdleAnim(s, dtMs, true);
    s = r.state;
    anim = r.anim;
  }
  return { state: s, anim };
}

describe('chain attack frames and hitstop', () => {
  it('maps chain step 1/2/3 to attack1/attack2/attack3', () => {
    expect(attackAnimFor(1)).toBe('attack1');
    expect(attackAnimFor(2)).toBe('attack2');
    expect(attackAnimFor(3)).toBe('attack3');
  });
  it('only the third hit has a 60ms hitstop', () => {
    expect(HITSTOP_MS).toBe(60);
    expect(hitstopMsFor(1)).toBe(0);
    expect(hitstopMsFor(2)).toBe(0);
    expect(hitstopMsFor(3)).toBe(HITSTOP_MS);
  });
  it('never starts a hitstop while physics is already paused (super fx or death)', () => {
    expect(canStartHitstop(3, false)).toBe(true);
    expect(canStartHitstop(3, true)).toBe(false);
    expect(canStartHitstop(1, false)).toBe(false);
  });
  it('resumes only when no other pause happened in between and the world is still paused', () => {
    expect(shouldResumeHitstop(1, 1, true)).toBe(true);
    expect(shouldResumeHitstop(1, 2, true)).toBe(false);   // 그 사이 필살기·사망이 pause 를 걸었다 → 그쪽이 푼다
    expect(shouldResumeHitstop(1, 1, false)).toBe(false);  // 이미 풀렸다
  });
});

describe('idle → flourish (6s) → idle', () => {
  it('stays idle before 6 seconds', () => {
    const r = advance(IDLE_START, 100, 59);                 // 5.9s
    expect(r.anim).toBe('idle');
    expect(r.state.flourishMs).toBeNull();
    expect(r.state.idleMs).toBe(5900);
  });
  it('plays flourish once after 6 seconds of rest, then returns to idle', () => {
    const at6 = advance(IDLE_START, 100, 60);
    expect(at6.anim).toBe('flourish');
    expect(at6.state.flourishMs).toBe(0);
    const mid = advance(at6.state, 100, 5);
    expect(mid.anim).toBe('flourish');
    const after = advance(at6.state, 100, FLOURISH_MS / 100);
    expect(after.anim).toBe('idle');
    expect(after.state).toEqual(IDLE_START);
  });
  it('repeats every 6 seconds of continued rest', () => {
    const first = advance(IDLE_START, 100, 60);
    const back = advance(first.state, 100, FLOURISH_MS / 100);
    const second = advance(back.state, 100, FLOURISH_AFTER_MS / 100);
    expect(second.anim).toBe('flourish');
  });
  it('cancels immediately and resets the timer on input or movement', () => {
    const at6 = advance(IDLE_START, 100, 60);
    expect(at6.anim).toBe('flourish');
    const cancelled = nextIdleAnim(at6.state, 16, false);
    expect(cancelled.anim).toBeNull();                       // 호출자가 walk/jump 를 고른다
    expect(cancelled.state).toEqual(IDLE_START);
    const almost = advance(IDLE_START, 100, 59);
    const reset = nextIdleAnim(almost.state, 16, false);
    expect(reset.state.idleMs).toBe(0);
  });
  it('handles a big frame delta without skipping the flourish', () => {
    const r = nextIdleAnim(IDLE_START, FLOURISH_AFTER_MS + 500, true);
    expect(r.anim).toBe('flourish');
  });
});

describe('super pose flip (zena spin)', () => {
  it('keeps the facing direction for everyone but zena', () => {
    for (const m of ['woni', 'liv', 'minami', 'may'] as const) {
      expect(superFlipX(m, 0, 1)).toBe(false);
      expect(superFlipX(m, 500, 1)).toBe(false);
      expect(superFlipX(m, 500, -1)).toBe(true);
    }
  });
  it('toggles zena every 120ms relative to her facing', () => {
    expect(ZENA_SPIN_FLIP_MS).toBe(120);
    expect(superFlipX('zena', 0, 1)).toBe(false);
    expect(superFlipX('zena', 119, 1)).toBe(false);
    expect(superFlipX('zena', 120, 1)).toBe(true);
    expect(superFlipX('zena', 239, 1)).toBe(true);
    expect(superFlipX('zena', 240, 1)).toBe(false);
    expect(superFlipX('zena', 120, -1)).toBe(false);
  });
});
