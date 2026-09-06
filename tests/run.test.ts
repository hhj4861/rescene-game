import { describe, it, expect } from 'vitest';
import { addGauge, addScore, heal, isDead, isGaugeFull, loseLife, newRun, spendGauge, stageCleared, takeHit, useContinue, raiseMaxHearts, lowerMaxHearts, recordKill } from '../src/systems/run';
import { emptyBuffs } from '../src/systems/cards';
const B = emptyBuffs();
describe('run state', () => {
  it('starts with 3 lives, 5 hearts, 0 score, 0 gauge, 1 continue', () => {
    expect(newRun('woni')).toMatchObject({ member: 'woni', stageIndex: 1, lives: 3, hearts: 5, maxHearts: 5, score: 0, gauge: 0, continues: 1, cards: [] });
  });
  it('hits reduce hearts and never go below zero', () => { expect(takeHit(newRun('liv'), 2).hearts).toBe(3); expect(takeHit(takeHit(newRun('liv'), 4), 4).hearts).toBe(0); expect(isDead(takeHit(newRun('liv'), 5))).toBe(true); });
  it('losing a life refills hearts and clears gauge', () => { const s = loseLife({ ...takeHit(newRun('may'), 5), gauge: 60 }); expect(s).toMatchObject({ lives: 2, hearts: 5, gauge: 0 }); });
  it('continue resets score and cards once, then is unavailable', () => {
    const dead = { ...newRun('zena'), lives: 0, score: 4200, cards: ['woni_ui'] };
    const c = useContinue(dead)!; expect(c).toMatchObject({ lives: 3, score: 0, cards: [], continues: 0, hearts: 5 }); expect(useContinue(c)).toBeNull();
  });
  it('gauge clamps at 100 and buffs multiply the charge', () => {
    expect(addGauge(newRun('woni'), 96, B).gauge).toBe(96); expect(isGaugeFull(addGauge(newRun('woni'), 120, B))).toBe(true);
    expect(addGauge(newRun('woni'), 40, { ...B, gauge: 0.25 }).gauge).toBe(50); expect(spendGauge(addGauge(newRun('woni'), 100, B)).gauge).toBe(0);
  });
  it('score applies the score buff and floors', () => { expect(addScore(newRun('woni'), 105, { ...B, score: 0.1 }).score).toBe(115); });
  it('heal and raiseMaxHearts respect the cap', () => { expect(heal(takeHit(newRun('liv'), 3), 9).hearts).toBe(5); expect(raiseMaxHearts(takeHit(newRun('liv'), 1), 1)).toMatchObject({ maxHearts: 6, hearts: 5 }); });
  it('lowerMaxHearts floors at 1 and clamps current hearts', () => {
    const up = raiseMaxHearts(newRun('liv'), 2);                                   // 7/7
    expect(lowerMaxHearts(up, 2)).toMatchObject({ maxHearts: 5, hearts: 5 });
    expect(lowerMaxHearts(takeHit(up, 1), 1)).toMatchObject({ maxHearts: 6, hearts: 6 });
    expect(lowerMaxHearts(newRun('liv'), 99)).toMatchObject({ maxHearts: 1, hearts: 1 });
  });
  it('stage clear adds bonus, advances and resets per-stage counters', () => {
    const s = stageCleared({ ...recordKill(newRun('minami'), 7), gauge: 30, hearts: 2, bossHit: true }, 1500);
    expect(s).toMatchObject({ score: 1500, stageIndex: 2, hearts: 5, gauge: 0, bossHit: false, stageKills: 0, maxCombo: 0 });
  });
});
