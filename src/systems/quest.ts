import type { Objective, QuestDef, Reward } from '../data/schema';
import type { MemberId } from './types';

export type GameEvent =
  | { type: 'enemy_killed'; enemyId: string }
  | { type: 'item_collected'; itemId: string; count: number }
  | { type: 'npc_talked'; npcId: string; dialogueId?: string }
  | { type: 'map_entered'; mapId: string }
  | { type: 'minigame_scored'; minigameId: string; score: number }
  | { type: 'emote_used'; memeId: string; mapId: string };

export type QuestStatus = 'locked' | 'available' | 'active' | 'completable' | 'done';

export interface QuestState {
  active: Record<string, number[]>;
  done: string[];
}

export interface QuestContext {
  level: number;
  member: MemberId;
}

export function emptyQuestState(): QuestState {
  return { active: {}, done: [] };
}

function objectiveTarget(o: Objective): number {
  switch (o.kind) {
    case 'kill':
    case 'collect':
      return o.count;
    case 'minigame':
      return o.score;
    default:
      return 1;
  }
}

function objectiveDelta(o: Objective, ev: GameEvent): number {
  switch (o.kind) {
    case 'kill':
      return ev.type === 'enemy_killed' && ev.enemyId === o.target ? 1 : 0;
    case 'collect':
      return ev.type === 'item_collected' && ev.itemId === o.target ? ev.count : 0;
    case 'talk':
      return ev.type === 'npc_talked' && ev.npcId === o.target && (!o.dialogue || ev.dialogueId === o.dialogue) ? 1 : 0;
    case 'reach':
      return ev.type === 'map_entered' && ev.mapId === o.target ? 1 : 0;
    case 'minigame':
      return ev.type === 'minigame_scored' && ev.minigameId === o.target ? ev.score : 0;
    case 'emote':
      return ev.type === 'emote_used' && ev.memeId === o.target && ev.mapId === o.map ? 1 : 0;
  }
}

export class QuestEngine {
  private readonly byId: Map<string, QuestDef>;
  private state: QuestState;

  constructor(
    private readonly defs: QuestDef[],
    state: QuestState,
    private readonly flags: Set<string>,
    private readonly ctx: QuestContext,
  ) {
    this.byId = new Map(defs.map((q) => [q.id, q]));
    const droppedActive = Object.keys(state.active).filter((id) => !this.byId.has(id));
    const droppedDone = state.done.filter((id) => !this.byId.has(id));
    if (droppedActive.length || droppedDone.length) {
      console.warn('QuestEngine: dropping unknown quest ids', { active: droppedActive, done: droppedDone });
    }
    this.state = {
      active: Object.fromEntries(Object.entries(state.active).filter(([id]) => this.byId.has(id))),
      done: state.done.filter((id) => this.byId.has(id)),
    };
  }

  getState(): QuestState {
    return { active: { ...this.state.active }, done: [...this.state.done] };
  }

  private def(id: string): QuestDef {
    const q = this.byId.get(id);
    if (!q) throw new Error(`unknown quest: ${id}`);
    return q;
  }

  private requirementsMet(q: QuestDef): boolean {
    const r = q.requires;
    if (!r) return true;
    if (r.level !== undefined && this.ctx.level < r.level) return false;
    if (r.member !== undefined && this.ctx.member !== r.member) return false;
    if (r.questsDone?.some((id) => !this.state.done.includes(id))) return false;
    if (r.flags?.some((f) => !this.flags.has(f))) return false;
    return true;
  }

  private isComplete(q: QuestDef, progress: number[]): boolean {
    return q.objectives.every((o, i) => (progress[i] ?? 0) >= objectiveTarget(o));
  }

  status(id: string): QuestStatus {
    const q = this.def(id);
    if (this.state.done.includes(id)) return 'done';
    const progress = this.state.active[id];
    if (progress) return this.isComplete(q, progress) ? 'completable' : 'active';
    return this.requirementsMet(q) ? 'available' : 'locked';
  }

  available(): QuestDef[] {
    return this.defs.filter((q) => this.status(q.id) === 'available');
  }

  activeQuests(): QuestDef[] {
    return this.defs.filter((q) => this.state.active[q.id] !== undefined);
  }

  questsForNpc(npcId: string): QuestDef[] {
    return this.defs.filter((q) => q.giver === npcId && this.status(q.id) !== 'done' && this.status(q.id) !== 'locked');
  }

  progress(id: string): number[] {
    return [...(this.state.active[id] ?? this.def(id).objectives.map(() => 0))];
  }

  start(id: string): void {
    if (this.status(id) !== 'available') throw new Error(`quest ${id} is not available`);
    const self = `npc_${this.ctx.member}`;
    const initial = this.def(id).objectives.map((o) => (o.kind === 'talk' && o.target === self ? 1 : 0));
    this.state = { ...this.state, active: { ...this.state.active, [id]: initial } };
  }

  report(ev: GameEvent): string[] {
    const newlyCompletable: string[] = [];
    const active = { ...this.state.active };
    for (const [id, progress] of Object.entries(active)) {
      const q = this.def(id);
      const wasComplete = this.isComplete(q, progress);
      const next = q.objectives.map((o, i) => Math.min(objectiveTarget(o), (progress[i] ?? 0) + objectiveDelta(o, ev)));
      active[id] = next;
      if (!wasComplete && this.isComplete(q, next)) newlyCompletable.push(id);
    }
    this.state = { ...this.state, active };
    return newlyCompletable;
  }

  complete(id: string): Reward {
    if (this.status(id) !== 'completable') throw new Error(`quest ${id} is not completable`);
    const q = this.def(id);
    const active = { ...this.state.active };
    delete active[id];
    this.state = { active, done: [...this.state.done, id] };
    for (const f of q.rewards.flags ?? []) this.flags.add(f);
    return q.rewards;
  }
}
