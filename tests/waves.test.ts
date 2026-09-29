import { describe, it, expect } from 'vitest';
import { dueSpawns, enemyDied, openSection, remainingInSection, startSection } from '../src/systems/waves';
const def = { lock: 'lock_a', spawn: 're_a', waves: [{ spawn: 'sp1', enemy: 'e1', count: 2, intervalMs: 500 }, { spawn: 'sp2', enemy: 'e2', count: 1, intervalMs: 0, elite: true }] };
describe('section waves', () => {
  it('spawns the first wave on schedule', () => {
    const s = startSection(def, 0, 1000);
    let r = dueSpawns(s, 1000); expect(r.spawns.map((o) => o.spawn)).toEqual(['sp1']); expect(r.state.alive).toBe(1);
    r = dueSpawns(r.state, 1499); expect(r.spawns).toEqual([]);
    r = dueSpawns(r.state, 1500); expect(r.spawns.length).toBe(1); expect(r.state.pending).toEqual([]);
    expect(remainingInSection(r.state)).toBe(3);
  });
  it('starts the next wave only after the current one is dead, then clears', () => {
    let s = dueSpawns(startSection(def, 0, 0), 500).state;          // 2 alive
    s = enemyDied(s, 600); expect(s.waveIndex).toBe(0);
    s = enemyDied(s, 700); expect(s.waveIndex).toBe(1); expect(s.pending[0]).toMatchObject({ enemy: 'e2', elite: true, at: 700 });
    const r = dueSpawns(s, 700); s = enemyDied(r.state, 900);
    expect(s.phase).toBe('cleared'); expect(openSection(s).phase).toBe('open');
  });
});
