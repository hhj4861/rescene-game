import { describe, it, expect } from 'vitest';
import { RunStore } from '../src/core/RunStore';
const lookup = (id: string) => (id === 'heart' ? { key: 'heart' as const, value: 1 } : { key: 'atk' as const, value: 2 });
describe('RunStore', () => {
  it('emits gaugeFull exactly once when the gauge reaches 100', () => {
    const r = new RunStore('woni', lookup); let n = 0; r.bus.on('gaugeFull', () => n++);
    for (let i = 0; i < 30; i++) r.hit(); expect(r.state.gauge).toBe(100); expect(n).toBe(1); expect(r.useSuper()).toBe(true); expect(r.useSuper()).toBe(false);
  });
  it('kills score with combo multiplier and elite flat score', () => {
    const r = new RunStore('liv', lookup); for (let i = 0; i < 5; i++) r.kill(100, 1000 + i * 100, false);
    expect(r.combo.count).toBe(5); expect(r.state.score).toBe(600); r.kill(100, 1600, true); expect(r.state.score).toBe(1600);
  });
  it('picking a heart card raises max hearts', () => { const r = new RunStore('may', lookup); r.pickCard('heart'); expect(r.state.maxHearts).toBe(6); expect(r.buffs.heart).toBe(1); });
  it('a heart card pushed out of the hand lowers max hearts again', () => {
    const r = new RunStore('may', lookup); r.pickCard('heart'); r.pickCard('a'); r.pickCard('b');
    expect(r.state.maxHearts).toBe(6); expect(r.state.cards).toEqual(['heart', 'a', 'b']);
    let dropped: string | null = null; r.bus.on('card', (c) => { dropped = c.dropped; });
    r.pickCard('c');                                                                   // 4장째 → 'heart' 탈락
    expect(dropped).toBe('heart'); expect(r.state.cards).toEqual(['a', 'b', 'c']); expect(r.state.maxHearts).toBe(5); expect(r.state.hearts).toBe(5); expect(r.buffs.heart).toBe(0);
  });
  it('takeHit to zero emits died and loseLife reports remaining lives', () => {
    const r = new RunStore('zena', lookup); let died = 0; r.bus.on('died', () => died++);
    r.takeHit(5); expect(died).toBe(1); expect(r.loseLife()).toBe(2); expect(r.state.hearts).toBe(5);
  });
  it('tick expires the combo once', () => { const r = new RunStore('woni', lookup); const seen: number[] = []; r.bus.on('combo', (c) => seen.push(c.count)); r.kill(100, 0, false); r.tick(2500); r.tick(2600); expect(seen).toEqual([1, 0]); });
});
