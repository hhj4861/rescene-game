// BGM 3곡의 패턴 시퀀서 데이터. 전부 이 프로젝트를 위해 새로 작곡한 짧은 루프이며
// 실존 곡의 멜로디를 인용하지 않는다. steps 값은 root 기준 반음(semitone) 오프셋,
// null은 쉼표. 64스텝 = 16분음표 × 4마디.
import type { VoiceWave } from '../systems/voice';

export type BgmId = 'title' | 'stage' | 'boss';

export interface BgmChannel {
  wave: VoiceWave | 'noise';
  gain: number;
  octave: number;
  steps: (number | null)[]; // 길이 64
}

export interface BgmTrack {
  bpm: number;
  root: number; // Hz
  channels: BgmChannel[];
}

const STEPS_PER_BAR = 16;
const BARS = 4;
const TOTAL_STEPS = STEPS_PER_BAR * BARS;

/** 한 마디(16스텝) 패턴을 지정한 마디 수만큼 이어붙여 64스텝을 만든다. */
function loop(bar: (number | null)[], bars: (number | null)[][] = []): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < BARS; i++) {
    const source = bars[i] ?? bar;
    out.push(...source);
  }
  return out.slice(0, TOTAL_STEPS);
}

// --- title: 100bpm 밝은 장조 아르페지오 -------------------------------------
const titleLeadBar: (number | null)[] = [
  0, null, 4, null, 7, null, 12, null, 7, null, 4, null, 0, null, null, null,
];
const titleLeadTurn: (number | null)[] = [
  0, null, 5, null, 9, null, 12, null, 11, null, 9, null, 7, null, null, null,
];
const titleBassBar: (number | null)[] = [
  0, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null,
];

// --- stage: 128bpm 베이스+리드+드럼 -----------------------------------------
const stageBassBar: (number | null)[] = [
  0, null, null, null, 0, null, 7, null, 0, null, null, null, 5, null, 7, null,
];
const stageLeadBar: (number | null)[] = [
  12, null, null, 15, null, 12, null, 10, 12, null, null, 15, null, 19, null, 17,
];
const stageDrumBar: (number | null)[] = [
  0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null,
];

// --- boss: 150bpm 단조 반복 --------------------------------------------------
const bossBassBar: (number | null)[] = [
  0, null, 0, null, 3, null, 0, null, 0, null, 0, null, 5, null, 3, null,
];
const bossLeadBar: (number | null)[] = [
  12, 12, null, 10, 12, 12, null, 15, 12, 12, null, 10, 15, null, 14, null,
];
const bossDrumBar: (number | null)[] = [
  0, null, 0, 0, null, 0, null, 0, 0, null, 0, 0, null, 0, null, 0,
];

export const BGM: Record<BgmId, BgmTrack> = {
  title: {
    bpm: 100,
    root: 261.63, // C4
    channels: [
      { wave: 'square', gain: 0.5, octave: 1, steps: loop(titleLeadBar, [titleLeadBar, titleLeadTurn, titleLeadBar, titleLeadTurn]) },
      { wave: 'triangle', gain: 0.4, octave: -1, steps: loop(titleBassBar) },
    ],
  },
  stage: {
    bpm: 128,
    root: 220, // A3
    channels: [
      { wave: 'triangle', gain: 0.5, octave: -1, steps: loop(stageBassBar) },
      { wave: 'square', gain: 0.45, octave: 1, steps: loop(stageLeadBar) },
      { wave: 'noise', gain: 0.35, octave: 0, steps: loop(stageDrumBar) },
    ],
  },
  boss: {
    bpm: 150,
    root: 196, // G3, 단조
    channels: [
      { wave: 'sawtooth', gain: 0.5, octave: -1, steps: loop(bossBassBar) },
      { wave: 'square', gain: 0.45, octave: 1, steps: loop(bossLeadBar) },
      { wave: 'noise', gain: 0.4, octave: 0, steps: loop(bossDrumBar) },
    ],
  },
};
