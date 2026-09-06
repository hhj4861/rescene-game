// 문장을 훑어 멤버 음색 프로필에 따른 음성 블립 노트로 바꾸는 순수 함수 모음.
// 실제 재생은 src/audio/AudioBus.ts 가 담당한다(Phaser 미의존 유지).
// VoiceProfile/VoiceWave는 data/schema.ts가 원본이다(중복 선언 통일, T7).
import type { VoiceProfile, VoiceWave } from '../data/schema';

export type { VoiceProfile, VoiceWave };

export interface VoiceNote {
  at: number;
  durationMs: number;
  freq: number;
  gain: number;
  wave: VoiceWave;
  slideTo?: number;
}

export const MAX_NOTES = 24;

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;
const REST_MS = 80;
const REST_CHARS = new Set([' ', ',', '.']);
const ALNUM = /[A-Za-z0-9]/;

/** 한글 완성형 음절을 초성·중성·종성 index로 분해한다. 한글이 아니면 null. */
export function decomposeHangul(ch: string): { cho: number; jung: number; jong: number } | null {
  const code = ch.codePointAt(0);
  if (code === undefined || code < HANGUL_FIRST || code > HANGUL_LAST) return null;
  const offset = code - HANGUL_FIRST;
  const cho = Math.floor(offset / (JUNG_COUNT * JONG_COUNT));
  const jung = Math.floor((offset % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT);
  const jong = offset % JONG_COUNT;
  return { cho, jung, jong };
}

function toFreq(baseHz: number, semitone: number): number {
  return Math.round(baseHz * 2 ** (semitone / 12) * 100) / 100;
}

function shiftFreq(freq: number, semitoneDelta: number): number {
  return toFreq(freq, semitoneDelta);
}

/**
 * 문장을 문자 단위로 훑어 VoiceNote 배열을 만든다. 결정론적: 같은 문장 + 같은 프로필 = 같은 결과.
 * 스펙 §9.1 규칙을 그대로 따른다. 최대 MAX_NOTES 개에서 끊는다.
 */
export function speakNotes(text: string, profile: VoiceProfile): VoiceNote[] {
  const notes: VoiceNote[] = [];
  let cursor = 0;

  for (const ch of text) {
    if (notes.length >= MAX_NOTES) break;

    const hangul = decomposeHangul(ch);
    if (hangul) {
      const { cho, jung, jong } = hangul;
      const hasJong = jong !== 0;
      let semitone = (jung % 7) - 3 + (cho % 3);
      if (hasJong) semitone -= 1;
      const durationMs = profile.syllableMs + (hasJong ? 20 : 0);
      notes.push({
        at: cursor,
        durationMs,
        freq: toFreq(profile.baseHz, semitone),
        gain: 1,
        wave: profile.wave,
      });
      cursor += durationMs;
      continue;
    }

    if (REST_CHARS.has(ch)) {
      cursor += REST_MS;
      continue;
    }

    if (ch === '!') {
      const prev = notes[notes.length - 1];
      if (prev) prev.gain = prev.gain * 1.3;
      continue;
    }

    if (ch === '?') {
      const prev = notes[notes.length - 1];
      if (prev) prev.freq = shiftFreq(prev.freq, 4);
      continue;
    }

    if (ch === '~') {
      const prev = notes[notes.length - 1];
      if (prev) {
        const extra = prev.durationMs;
        prev.slideTo = shiftFreq(prev.freq, 2);
        prev.durationMs = prev.durationMs * 2;
        cursor += extra;
      }
      continue;
    }

    if (ALNUM.test(ch)) {
      const durationMs = profile.syllableMs;
      notes.push({
        at: cursor,
        durationMs,
        freq: toFreq(profile.baseHz, 0),
        gain: 1,
        wave: profile.wave,
      });
      cursor += durationMs;
      continue;
    }

    // 그 외 문자(…, 괄호 등)는 무시한다.
  }

  return notes;
}
