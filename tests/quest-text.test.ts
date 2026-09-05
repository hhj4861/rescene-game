import { describe, it, expect } from 'vitest';
import { describeObjective } from '../src/systems/questText';

describe('describeObjective', () => {
  it('formats each objective kind with resolved names', () => {
    expect(describeObjective({ kind: 'kill', target: 'enemy_sleep_slime', count: 5 }, 2)).toBe('졸음 슬라임 2/5');
    expect(describeObjective({ kind: 'collect', target: 'etc_snack_ingredient', count: 3 }, 0)).toBe('야식 재료 0/3');
    expect(describeObjective({ kind: 'talk', target: 'npc_zena' }, 1)).toBe('제나와 대화 1/1');
    expect(describeObjective({ kind: 'reach', target: 'ch1_rooftop' }, 0)).toBe('옥상 도착 0/1');
    expect(describeObjective({ kind: 'minigame', target: 'rhythm_uhuh', score: 80 }, 40)).toBe('rhythm_uhuh 40/80점');
    expect(describeObjective({ kind: 'emote', target: 'minami_yaho', map: 'ch1_practice' }, 0)).toBe('더뮤즈 연습실 (야간)에서 "거제, 야호~!" 0/1');
  });
});
