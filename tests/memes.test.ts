import { describe, it, expect } from 'vitest';
import { emptyMemeState, equipMeme, openMemeSlot, passiveTotals, unlockMeme } from '../src/systems/memes';
import { getMeme } from '../src/data/index';

describe('meme codex', () => {
  it('unlocks idempotently', () => {
    const s = unlockMeme(unlockMeme(emptyMemeState(), 'may_grip'), 'may_grip');
    expect(s.unlocked).toEqual(['may_grip']);
  });
  it('equips only unlocked memes into existing slots', () => {
    const s = unlockMeme(emptyMemeState(1), 'may_grip');
    expect(equipMeme(s, 0, 'may_grip').equipped).toEqual(['may_grip']);
    expect(() => equipMeme(s, 1, 'may_grip')).toThrow(/slot/);
    expect(() => equipMeme(s, 0, 'woni_ui')).toThrow(/unlocked/);
  });
  it('opens new slots', () => {
    expect(openMemeSlot(emptyMemeState(1)).equipped).toEqual([null, null]);
  });
  it('sums passives of equipped memes', () => {
    let s = unlockMeme(unlockMeme(emptyMemeState(2), 'may_grip'), 'minami_yaho');
    s = equipMeme(equipMeme(s, 0, 'may_grip'), 1, 'minami_yaho');
    expect(passiveTotals(s, getMeme)).toEqual({ luk: 5, aoeRange: 0.1 });
  });
});
