// T1(data-v2)이 아직 `../data/schema`에 SectionDef/WaveDef를 추가하지 않아 로컬로 선언한다.
// T1 머지 후 리드가 `import type { SectionDef, WaveDef } from '../data/schema';`로 교체한다.
export interface WaveDef {
  spawn: string;
  enemy: string;
  count: number;
  intervalMs: number;
  elite?: boolean;
}

export interface SectionDef {
  lock: string;
  spawn: string;
  waves: WaveDef[];
  chest?: boolean;
  cheer?: { npc: string; spawn: string; text: string };
}

export type SectionPhase = 'locked' | 'cleared' | 'open';

export interface SpawnOrder {
  spawn: string;
  enemy: string;
  elite: boolean;
  at: number;
}

export interface SectionState {
  index: number;
  phase: SectionPhase;
  waveIndex: number;
  pending: SpawnOrder[];
  alive: number;
  startedAt: number;
  waves: WaveDef[];
}

function orders(w: WaveDef | undefined, now: number): SpawnOrder[] {
  if (!w) return [];
  return Array.from({ length: w.count }, (_, i) => ({
    spawn: w.spawn,
    enemy: w.enemy,
    elite: !!w.elite,
    at: now + i * w.intervalMs,
  }));
}

export function startSection(def: SectionDef, index: number, now: number): SectionState {
  return {
    index,
    phase: 'locked',
    waveIndex: 0,
    pending: orders(def.waves[0], now),
    alive: 0,
    startedAt: now,
    waves: def.waves,
  };
}

export function dueSpawns(s: SectionState, now: number): { state: SectionState; spawns: SpawnOrder[] } {
  const spawns = s.pending.filter((o) => o.at <= now);
  const pending = s.pending.filter((o) => o.at > now);
  return { state: { ...s, pending, alive: s.alive + spawns.length }, spawns };
}

export function enemyDied(s: SectionState, now: number): SectionState {
  const alive = Math.max(0, s.alive - 1);
  if (alive === 0 && s.pending.length === 0) {
    const nextIndex = s.waveIndex + 1;
    if (nextIndex < s.waves.length) {
      return { ...s, alive: 0, waveIndex: nextIndex, pending: orders(s.waves[nextIndex], now) };
    }
    return { ...s, alive: 0, phase: 'cleared', pending: [] };
  }
  return { ...s, alive };
}

export function openSection(s: SectionState): SectionState {
  return { ...s, phase: 'open' };
}

export function remainingInSection(s: SectionState): number {
  const remainingWaves = s.waves.slice(s.waveIndex + 1).reduce((sum, w) => sum + w.count, 0);
  return s.alive + s.pending.length + remainingWaves;
}
