import { describe, it, expect } from 'vitest';
import { SFX } from '../src/audio/sfxData';
import { BGM } from '../src/audio/bgmData';
import { AudioBus } from '../src/audio/AudioBus';
describe('audio data', () => {
  it('every sfx has a positive duration and gain within 0..1', () => { for (const [k, s] of Object.entries(SFX)) { expect(s.durationMs, k).toBeGreaterThan(0); expect(s.gain).toBeLessThanOrEqual(1); } expect(Object.keys(SFX).length).toBe(15); });
  it('every bgm channel has 64 steps', () => { for (const t of Object.values(BGM)) { expect(t.channels.length).toBeGreaterThanOrEqual(2); for (const c of t.channels) expect(c.steps.length).toBe(64); } });
});

function fakeCtx() {
  const node = () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} });
  let created = 0;
  return { currentTime: 0, state: 'suspended', destination: {}, sampleRate: 44100, resumed: 0, created: () => created,
    resume: async function () { this.state = 'running'; this.resumed++; },
    createOscillator: () => { created++; return { type: 'sine', frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {}, onended: null }; },
    createGain: node, createBuffer: () => ({ getChannelData: () => new Float32Array(10) }), createBufferSource: () => ({ buffer: null, connect() {}, start() {}, stop() {} }) };
}
describe('AudioBus', () => {
  it('schedules one oscillator per note and resumes on unlock', () => {
    const ctx = fakeCtx(); const bus = new AudioBus(ctx); bus.unlock();
    bus.speak([{ at: 0, durationMs: 80, freq: 220, gain: 1, wave: 'square' }, { at: 80, durationMs: 80, freq: 240, gain: 1, wave: 'square' }]);
    expect(ctx.created()).toBe(2); expect(ctx.resumed).toBe(1);
  });
  it('plays nothing while muted', () => { const ctx = fakeCtx(); const bus = new AudioBus(ctx); bus.setMuted(true); bus.sfx('hit'); expect(ctx.created()).toBe(0); });
});
