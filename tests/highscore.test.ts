import { describe, it, expect } from 'vitest';
import { addCodex, emptySave, insertScore, parseSave, qualifies, sanitizeInitials, serialize, unlockStage } from '../src/systems/highscore';
import { loadArcadeSave, persistArcadeSave } from '../src/core/arcadeSave';
const e = (score: number, initials = 'AAA') => ({ initials, score, member: 'woni' as const, stageReached: 1, date: '2026-09-06' });
describe('highscores', () => {
  it('keeps the top ten sorted, ties keep insertion order', () => {
    let s = emptySave(); for (let i = 0; i < 10; i++) s = insertScore(s, e(1000 * (i + 1))).save;
    expect(qualifies(s, 1000)).toBe(false); expect(qualifies(s, 1001)).toBe(true);
    const r = insertScore(s, e(5000, 'NEW')); expect(r.rank).toBe(7); expect(r.save.highscores.length).toBe(10); expect(r.save.highscores[5]!.initials).toBe('AAA'); expect(r.save.highscores[6]!.initials).toBe('NEW');
    expect(insertScore(r.save, e(1)).rank).toBeNull();
  });
  it('round-trips and rejects garbage', () => {
    const s = addCodex(unlockStage(emptySave(), 3), ['woni_ui', 'woni_ui']);
    expect(parseSave(serialize(s))).toEqual(s); expect(s.codex).toEqual(['woni_ui']);
    expect(parseSave('{not json')).toEqual(emptySave()); expect(parseSave(JSON.stringify({ version: 1 }))).toEqual(emptySave());
  });
  it('sanitizes initials', () => { expect(sanitizeInitials('ab')).toBe('AB.'); expect(sanitizeInitials('wo-ni!')).toBe('WON'); });
  it('persists through a key-value store', () => {
    const mem = new Map<string, string>(); const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    persistArcadeSave(unlockStage(emptySave(), 2), store); expect(loadArcadeSave(store).unlockedStages).toBe(2);
  });
});
