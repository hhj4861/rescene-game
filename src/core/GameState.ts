import { EventBus } from './EventBus';
import { getItem, getMeme, getMember } from '../data/index';
import type { QuestDef, Reward } from '../data/schema';
import { addItem, emptyInventory, equipmentStats, type InventoryState } from '../systems/inventory';
import { emptyMemeState, openMemeSlot, passiveTotals, unlockMeme, type MemeState } from '../systems/memes';
import { applyXp, statsForLevel, xpForLevel } from '../systems/progression';
import { QuestEngine, emptyQuestState, type GameEvent, type QuestContext, type QuestState } from '../systems/quest';
import { emptySkillRuntime, type SkillRuntime } from '../systems/skills';
import { STAT_KEYS, type MemberId, type PlayerState, type Stats } from '../systems/types';

export const SAVE_VERSION = 1;

export interface GameStateSnapshot {
  version: number;
  player: PlayerState;
  inventory: InventoryState;
  hearts: number;
  memes: MemeState;
  quests: QuestState;
  flags: string[];
  fame: number;
  location: { mapId: string; spawnId: string };
  chapter: number;
  playTimeMs: number;
  savedAt: number;
}

export type GameEvents = {
  changed: undefined;
  levelup: { level: number };
  died: undefined;
  questCompletable: { questId: string };
  questCompleted: { questId: string; reward: Reward };
  memeUnlocked: { memeId: string };
};

export class GameState {
  player: PlayerState;
  inventory: InventoryState;
  hearts: number;
  memes: MemeState;
  readonly flags: Set<string>;
  fame: number;
  location: { mapId: string; spawnId: string };
  chapter: number;
  playTimeMs: number;
  savedAt: number;
  readonly quests: QuestEngine;
  readonly bus = new EventBus<GameEvents>();
  skillRuntime: SkillRuntime = emptySkillRuntime();
  private readonly questCtx: QuestContext;

  private constructor(snap: GameStateSnapshot, questDefs: QuestDef[]) {
    this.player = { ...snap.player, skillLevels: { ...snap.player.skillLevels } };
    this.inventory = { items: { ...snap.inventory.items }, equipment: { ...snap.inventory.equipment } };
    this.hearts = snap.hearts;
    this.memes = { unlocked: [...snap.memes.unlocked], equipped: [...snap.memes.equipped] };
    this.flags = new Set(snap.flags);
    this.fame = snap.fame;
    this.location = { ...snap.location };
    this.chapter = snap.chapter;
    this.playTimeMs = snap.playTimeMs;
    this.savedAt = snap.savedAt;
    this.questCtx = { level: snap.player.level, member: snap.player.member };
    this.quests = new QuestEngine(questDefs, snap.quests, this.flags, this.questCtx);
  }

  static newGame(member: MemberId, questDefs: QuestDef[]): GameState {
    const def = getMember(member);
    return new GameState(
      {
        version: SAVE_VERSION,
        player: { member, level: 1, xp: 0, sp: 0, hp: def.baseStats.hp, mp: def.baseStats.mp, skillLevels: {} },
        inventory: emptyInventory(),
        hearts: 0,
        memes: emptyMemeState(1),
        quests: emptyQuestState(),
        flags: [],
        fame: 0,
        location: { mapId: def.prologueMap, spawnId: 'start' },
        chapter: 0,
        playTimeMs: 0,
        savedAt: 0,
      },
      questDefs,
    );
  }

  static fromSnapshot(snap: GameStateSnapshot, questDefs: QuestDef[]): GameState {
    return new GameState(snap, questDefs);
  }

  snapshot(): GameStateSnapshot {
    return {
      version: SAVE_VERSION,
      player: { ...this.player, skillLevels: { ...this.player.skillLevels } },
      inventory: { items: { ...this.inventory.items }, equipment: { ...this.inventory.equipment } },
      hearts: this.hearts,
      memes: { unlocked: [...this.memes.unlocked], equipped: [...this.memes.equipped] },
      quests: this.quests.getState(),
      flags: [...this.flags],
      fame: this.fame,
      location: { ...this.location },
      chapter: this.chapter,
      playTimeMs: this.playTimeMs,
      savedAt: this.savedAt,
    };
  }

  maxStats(): Stats {
    const def = getMember(this.player.member);
    const stats = statsForLevel(def.baseStats, def.growth, this.player.level);
    const equip = equipmentStats(this.inventory, getItem);
    const passives = passiveTotals(this.memes, getMeme);
    for (const k of STAT_KEYS) stats[k] += (equip[k] ?? 0) + (passives[k] ?? 0);
    return stats;
  }

  xpNeeded(): number {
    return xpForLevel(this.player.level);
  }

  private changed(): void {
    this.bus.emit('changed', undefined);
  }

  gainXp(xp: number): number {
    const r = applyXp(this.player, xp);
    this.player = r.state;
    if (r.levelsGained > 0) {
      this.questCtx.level = this.player.level;
      const max = this.maxStats();
      this.player = { ...this.player, hp: max.hp, mp: max.mp };
      this.bus.emit('levelup', { level: this.player.level });
    }
    this.changed();
    return r.levelsGained;
  }

  addHearts(n: number): void {
    this.hearts += n;
    this.changed();
  }

  heal(hp: number, mp: number): void {
    const max = this.maxStats();
    this.player = { ...this.player, hp: Math.min(max.hp, this.player.hp + hp), mp: Math.min(max.mp, this.player.mp + mp) };
    this.changed();
  }

  takeDamage(n: number): boolean {
    this.player = { ...this.player, hp: Math.max(0, this.player.hp - n) };
    this.changed();
    if (this.player.hp === 0) {
      this.bus.emit('died', undefined);
      return true;
    }
    return false;
  }

  applyReward(r: Reward): void {
    if (r.hearts) this.hearts += r.hearts;
    for (const it of r.items ?? []) this.inventory = addItem(this.inventory, it.id, it.count);
    if (r.fame) this.fame += r.fame;
    if (r.openMemeSlot) this.memes = openMemeSlot(this.memes);
    if (r.meme) {
      this.memes = unlockMeme(this.memes, r.meme);
      this.bus.emit('memeUnlocked', { memeId: r.meme });
    }
    if (r.xp) this.gainXp(r.xp);
    else this.changed();
  }

  report(ev: GameEvent): string[] {
    const ids = this.quests.report(ev);
    for (const questId of ids) this.bus.emit('questCompletable', { questId });
    if (ids.length) this.changed();
    return ids;
  }

  completeQuest(id: string): Reward {
    const reward = this.quests.complete(id);
    this.applyReward(reward);
    this.bus.emit('questCompleted', { questId: id, reward });
    return reward;
  }
}
