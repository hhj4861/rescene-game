import { emptySave, parseSave, serialize, SAVE_KEY, type ArcadeSave } from '../systems/highscore';

export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function defaultStore(): KeyValueStore | undefined {
  const g = globalThis as unknown as { localStorage?: KeyValueStore };
  return g.localStorage;
}

export function loadArcadeSave(store: KeyValueStore | undefined = defaultStore()): ArcadeSave {
  if (!store) return emptySave();
  return parseSave(store.getItem(SAVE_KEY));
}

export function persistArcadeSave(save: ArcadeSave, store: KeyValueStore | undefined = defaultStore()): void {
  if (!store) return;
  store.setItem(SAVE_KEY, serialize(save));
}
