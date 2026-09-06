// 효과음의 절차적 합성 데이터. Web Audio 재생기(AudioBus)가 이 스펙을 읽어
// 주파수 스윕(또는 노이즈)으로 렌더링한다. 파일 없이 코드로만 정의된 순수 데이터.
import type { VoiceWave } from '../systems/voice';

export type SfxName =
  | 'hit'
  | 'hit3'
  | 'jump'
  | 'kill'
  | 'elite'
  | 'gauge'
  | 'super'
  | 'hurt'
  | 'card'
  | 'go'
  | 'heart'
  | 'boss_phase'
  | 'clear'
  | 'gameover'
  | 'menu';

export interface SfxSpec {
  wave: VoiceWave | 'noise';
  from: number;
  to: number;
  durationMs: number;
  gain: number;
  arp?: number[]; // semitone 스텝, durationMs를 균등 분할해 순서대로 재생
}

export const SFX: Record<SfxName, SfxSpec> = {
  hit: { wave: 'square', from: 440, to: 220, durationMs: 80, gain: 0.5 },
  hit3: { wave: 'square', from: 300, to: 300, durationMs: 150, gain: 0.5, arp: [0, 2, 4] },
  jump: { wave: 'triangle', from: 200, to: 500, durationMs: 120, gain: 0.4 },
  kill: { wave: 'sawtooth', from: 600, to: 100, durationMs: 200, gain: 0.6 },
  elite: { wave: 'sawtooth', from: 800, to: 100, durationMs: 300, gain: 0.7, arp: [0, 3, 7] },
  gauge: { wave: 'square', from: 300, to: 900, durationMs: 250, gain: 0.5 },
  super: { wave: 'square', from: 220, to: 880, durationMs: 500, gain: 0.8, arp: [0, 4, 7, 12] },
  hurt: { wave: 'sawtooth', from: 220, to: 80, durationMs: 150, gain: 0.5 },
  card: { wave: 'triangle', from: 500, to: 900, durationMs: 120, gain: 0.5 },
  go: { wave: 'square', from: 440, to: 440, durationMs: 200, gain: 0.6, arp: [0, 7, 12] },
  heart: { wave: 'triangle', from: 700, to: 900, durationMs: 90, gain: 0.4 },
  boss_phase: { wave: 'sawtooth', from: 300, to: 60, durationMs: 400, gain: 0.7 },
  clear: { wave: 'square', from: 400, to: 400, durationMs: 600, gain: 0.7, arp: [0, 4, 7, 12, 16] },
  gameover: { wave: 'sawtooth', from: 300, to: 50, durationMs: 500, gain: 0.6 },
  menu: { wave: 'square', from: 600, to: 600, durationMs: 40, gain: 0.3 },
};
