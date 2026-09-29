import type { RunStore } from './RunStore';

const KEY = 'run';

export function setRun(scene: { registry: { set(k: string, v: unknown): void } }, store: RunStore): void {
  scene.registry.set(KEY, store);
}

export function hasRun(scene: { registry: { has(k: string): boolean } }): boolean {
  return scene.registry.has(KEY);
}

export function getRun(scene: { registry: { get(k: string): unknown } }): RunStore {
  const store = scene.registry.get(KEY) as RunStore | undefined;
  if (!store) throw new Error('no active run: start from Select');
  return store;
}
