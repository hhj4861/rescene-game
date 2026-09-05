import { z } from 'zod';
import { SAVE_VERSION, type GameStateSnapshot } from '../core/GameState';
import { MemberIdSchema, EquipSlotSchema } from '../data/schema';
import type { MemberId } from './types';

export { SAVE_VERSION };
export const SLOT_COUNT = 3;

const SnapshotSchema = z.object({
  version: z.number().int(),
  player: z.object({
    member: MemberIdSchema, level: z.number().int().min(1), xp: z.number().min(0), sp: z.number().int().min(0),
    hp: z.number().min(0), mp: z.number().min(0), skillLevels: z.record(z.number().int()),
  }),
  inventory: z.object({ items: z.record(z.number().int()), equipment: z.record(EquipSlotSchema, z.string().nullable()) }),
  hearts: z.number().int().min(0),
  memes: z.object({ unlocked: z.array(z.string()), equipped: z.array(z.string().nullable()) }),
  quests: z.object({ active: z.record(z.array(z.number())), done: z.array(z.string()) }),
  flags: z.array(z.string()),
  fame: z.number().min(0),
  location: z.object({ mapId: z.string(), spawnId: z.string() }),
  chapter: z.number().int().min(0),
  playTimeMs: z.number().min(0),
  savedAt: z.number(),
});

/** 버전별 마이그레이션. 키 n은 "버전 n → n+1". */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

export function serialize(snap: GameStateSnapshot): string {
  return JSON.stringify(snap);
}

export function deserialize(json: string): GameStateSnapshot {
  let raw = JSON.parse(json) as Record<string, unknown>;
  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version > SAVE_VERSION) throw new Error(`save version ${version} is newer than supported ${SAVE_VERSION}`);
  for (let v = version; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`no migration from save version ${v}`);
    raw = { ...step(raw), version: v + 1 };
  }
  return SnapshotSchema.parse(raw) as GameStateSnapshot;
}

export interface SaveStore {
  read(slot: number): string | null;
  write(slot: number, data: string): void;
  clear(slot: number): void;
}

export function createMemoryStore(): SaveStore {
  const m = new Map<number, string>();
  return { read: (s) => m.get(s) ?? null, write: (s, d) => void m.set(s, d), clear: (s) => void m.delete(s) };
}

export function createLocalStorageStore(storage: Storage): SaveStore {
  const key = (slot: number) => `rescene.save.${slot}`;
  return {
    read: (s) => storage.getItem(key(s)),
    write: (s, d) => storage.setItem(key(s), d),
    clear: (s) => storage.removeItem(key(s)),
  };
}

export interface SlotSummary {
  member: MemberId;
  level: number;
  chapter: number;
  savedAt: number;
  playTimeMs: number;
}

function assertSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) throw new Error(`invalid slot ${slot}`);
}

export function saveGame(store: SaveStore, slot: number, snap: GameStateSnapshot): void {
  assertSlot(slot);
  store.write(slot, serialize(snap));
}

export function loadGame(store: SaveStore, slot: number): GameStateSnapshot | null {
  assertSlot(slot);
  const raw = store.read(slot);
  return raw === null ? null : deserialize(raw);
}

export function listSlots(store: SaveStore): (SlotSummary | null)[] {
  return Array.from({ length: SLOT_COUNT }, (_, slot) => {
    const raw = store.read(slot);
    if (raw === null) return null;
    try {
      const s = deserialize(raw);
      return { member: s.player.member, level: s.player.level, chapter: s.chapter, savedAt: s.savedAt, playTimeMs: s.playTimeMs };
    } catch {
      return null;
    }
  });
}
