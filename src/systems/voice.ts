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

type PendingMark = { type: '!' | '?' | '~'; index: number };

/** 문장 끝 억양(accent)을 notes 배열 전체에 적용한다. spread가 적용된 뒤, !·?·~ 보다 먼저 실행된다. */
function applyAccent(notes: VoiceNote[], accent: VoiceProfile['accent']): void {
  if (!accent || accent === 'flat' || notes.length === 0) return;
  if (accent === 'fall') {
    const last = notes[notes.length - 1]!;
    last.freq = shiftFreq(last.freq, -3);
    return;
  }
  if (accent === 'rise') {
    const last = notes[notes.length - 1]!;
    last.freq = shiftFreq(last.freq, 3);
    return;
  }
  if (accent === 'bounce') {
    notes.forEach((note, i) => {
      note.freq = shiftFreq(note.freq, i % 2 === 0 ? 1 : -1);
    });
  }
}

/**
 * 문장을 문자 단위로 훑어 VoiceNote 배열을 만든다. 결정론적: 같은 문장 + 같은 프로필 = 같은 결과.
 * 스펙 §9.1 규칙을 그대로 따른다. 순서: 음절 semitone × spread(반올림) → accent → !·?·~. 최대 MAX_NOTES 개에서 끊는다.
 */
export function speakNotes(text: string, profile: VoiceProfile): VoiceNote[] {
  const notes: VoiceNote[] = [];
  const marks: PendingMark[] = [];
  const spread = profile.spread ?? 1;
  let cursor = 0;

  for (const ch of text) {
    if (notes.length >= MAX_NOTES) break;

    const hangul = decomposeHangul(ch);
    if (hangul) {
      const { cho, jung, jong } = hangul;
      const hasJong = jong !== 0;
      let semitone = (jung % 7) - 3 + (cho % 3);
      if (hasJong) semitone -= 1;
      semitone = Math.round(semitone * spread);
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

    if (ch === '!' || ch === '?' || ch === '~') {
      const targetIndex = notes.length - 1;
      if (targetIndex >= 0) {
        marks.push({ type: ch, index: targetIndex });
        if (ch === '~') cursor += notes[targetIndex]!.durationMs;
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

  applyAccent(notes, profile.accent);

  for (const mark of marks) {
    const note = notes[mark.index];
    if (!note) continue;
    if (mark.type === '!') note.gain = note.gain * 1.3;
    if (mark.type === '?') note.freq = shiftFreq(note.freq, 4);
    if (mark.type === '~') {
      note.slideTo = shiftFreq(note.freq, 2);
      note.durationMs = note.durationMs * 2;
    }
  }

  return notes;
}
