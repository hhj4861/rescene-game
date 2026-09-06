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
});
