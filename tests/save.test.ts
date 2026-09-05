import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';
import { SAVE_VERSION, SLOT_COUNT, createLocalStorageStore, createMemoryStore, deserialize, listSlots, loadGame, saveGame, serialize } from '../src/systems/save';

describe('serialize/deserialize', () => {
  it('round-trips a snapshot', () => {
    const snap = GameState.newGame('may', []).snapshot();
    expect(deserialize(serialize(snap))).toEqual(snap);
  });
  it('rejects malformed json and wrong shapes', () => {
    expect(() => deserialize('not json')).toThrow();
    expect(() => deserialize('{"version":1}')).toThrow();
  });
  it('rejects a newer version than it knows', () => {
    const snap = { ...GameState.newGame('may', []).snapshot(), version: SAVE_VERSION + 1 };
    expect(() => deserialize(JSON.stringify(snap))).toThrow(/version/);
  });
});

describe('stores', () => {
  it('memory store saves, lists and loads three slots', () => {
    const store = createMemoryStore();
    expect(listSlots(store)).toEqual([null, null, null]);
    expect(SLOT_COUNT).toBe(3);
    const snap = GameState.newGame('liv', []).snapshot();
    saveGame(store, 1, snap);
    expect(loadGame(store, 1)).toEqual(snap);
    expect(loadGame(store, 0)).toBeNull();
    expect(listSlots(store)[1]).toEqual({ member: 'liv', level: 1, chapter: 0, savedAt: snap.savedAt, playTimeMs: 0 });
  });
  it('localStorage store uses namespaced keys', () => {
    const backing = new Map<string, string>();
    const fake = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    } as unknown as Storage;
    const store = createLocalStorageStore(fake);
    saveGame(store, 2, GameState.newGame('minami', []).snapshot());
    expect([...backing.keys()]).toEqual(['rescene.save.2']);
    store.clear(2);
    expect(backing.size).toBe(0);
  });
});
