import { describe, it, expect } from 'vitest';
import { SFX } from '../src/audio/sfxData';
import { BGM } from '../src/audio/bgmData';
describe('audio data', () => {
  it('every sfx has a positive duration and gain within 0..1', () => { for (const [k, s] of Object.entries(SFX)) { expect(s.durationMs, k).toBeGreaterThan(0); expect(s.gain).toBeLessThanOrEqual(1); } expect(Object.keys(SFX).length).toBe(15); });
  it('every bgm channel has 64 steps', () => { for (const t of Object.values(BGM)) { expect(t.channels.length).toBeGreaterThanOrEqual(2); for (const c of t.channels) expect(c.steps.length).toBe(64); } });
});
