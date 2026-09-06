// T1(data-v2)이 아직 `../data/schema`에 BuffKey를 추가하지 않아 로컬로 선언한다.
// T1 머지 후 리드가 import로 교체한다.
export type BuffKey = 'atk' | 'spd' | 'jump' | 'gauge' | 'heart' | 'combo' | 'score';

export interface BuffTotals {
  atk: number;
  spd: number;
  jump: number;
  gauge: number;
  heart: number;
  combo: number;
  score: number;
}

export const MAX_CARDS = 3;

export function emptyBuffs(): BuffTotals {
  return { atk: 0, spd: 0, jump: 0, gauge: 0, heart: 0, combo: 0, score: 0 };
}
