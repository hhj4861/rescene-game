import { describe, it, expect } from 'vitest';
import { MAX_NOTES, decomposeHangul, speakNotes } from '../src/systems/voice';
const woni = { baseHz: 220, syllableMs: 85, wave: 'square' as const };
const minami = { baseHz: 392, syllableMs: 65, wave: 'pulse' as const };
describe('voice blips', () => {
  it('decomposes hangul syllables', () => { expect(decomposeHangul('강')).toEqual({ cho: 0, jung: 0, jong: 21 }); expect(decomposeHangul('a')).toBeNull(); });
  it('makes one note per syllable, none for spaces and punctuation', () => { expect(speakNotes('우이! 리센느 아세요?', woni).length).toBe(8); });
  it('is deterministic and profile-dependent', () => {
    expect(speakNotes('안녕', woni)).toEqual(speakNotes('안녕', woni));
    expect(speakNotes('안녕', woni)[0]!.freq).not.toBe(speakNotes('안녕', minami)[0]!.freq);
    expect(speakNotes('안녕', minami)[0]!.wave).toBe('pulse');
  });
  it('applies !, ? and ~ to the previous note', () => {
    const bang = speakNotes('우이!', woni); expect(bang[1]!.gain).toBeCloseTo(1.3);
    const q = speakNotes('요?', woni); const plain = speakNotes('요', woni); expect(q[0]!.freq).toBeCloseTo(plain[0]!.freq * 2 ** (4 / 12), 1);
    const tilde = speakNotes('야호~', woni); expect(tilde[1]!.durationMs).toBe(plain[0]!.durationMs * 2); expect(tilde[1]!.slideTo).toBeGreaterThan(tilde[1]!.freq);
  });
  it('adds 80ms rests at spaces and caps at 24 notes', () => {
    const n = speakNotes('가 나', woni); expect(n[1]!.at).toBe(85 + 80);
    expect(speakNotes('가'.repeat(40), woni).length).toBe(MAX_NOTES);
  });
  it('spread scales the syllable semitone step (rounded)', () => {
    // '가' 음절: semitone = (0 % 7) - 3 + (0 % 3) = -3, jong 없음
    const base = speakNotes('가', woni)[0]!.freq;
    const wide = speakNotes('가', { ...woni, spread: 2 })[0]!.freq; // -3 * 2 = -6
    expect(wide).toBeCloseTo(base * 2 ** (-3 / 12), 1);
  });
  it('accent fall shifts only the last note down 3 semitones', () => {
    const base = speakNotes('안녕', woni);
    const fallen = speakNotes('안녕', { ...woni, accent: 'fall' });
    expect(fallen[0]!.freq).toBeCloseTo(base[0]!.freq, 1);
    expect(fallen.at(-1)!.freq).toBeCloseTo(base.at(-1)!.freq * 2 ** (-3 / 12), 1);
  });
  it('accent rise shifts only the last note up 3 semitones', () => {
    const base = speakNotes('안녕', woni);
    const risen = speakNotes('안녕', { ...woni, accent: 'rise' });
    expect(risen[0]!.freq).toBeCloseTo(base[0]!.freq, 1);
    expect(risen.at(-1)!.freq).toBeCloseTo(base.at(-1)!.freq * 2 ** (3 / 12), 1);
  });
  it('accent bounce alternates +1/-1 semitone by note index', () => {
    const base = speakNotes('가나다', woni);
    const bounced = speakNotes('가나다', { ...woni, accent: 'bounce' });
    expect(bounced[0]!.freq).toBeCloseTo(base[0]!.freq * 2 ** (1 / 12), 2);
    expect(bounced[1]!.freq).toBeCloseTo(base[1]!.freq * 2 ** (-1 / 12), 2);
    expect(bounced[2]!.freq).toBeCloseTo(base[2]!.freq * 2 ** (1 / 12), 2);
  });
  it('accent flat leaves notes unchanged', () => {
    const base = speakNotes('안녕', woni);
    const flat = speakNotes('안녕', { ...woni, accent: 'flat' });
    expect(flat).toEqual(base);
  });
  it('applies ? after accent so the shift stacks on the accented note', () => {
    const risenPlain = speakNotes('가', { ...woni, accent: 'rise' })[0]!.freq;
    const q = speakNotes('가?', { ...woni, accent: 'rise' });
    expect(q[0]!.freq).toBeCloseTo(risenPlain * 2 ** (4 / 12), 1);
  });
});
