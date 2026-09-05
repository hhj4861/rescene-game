import { describe, it, expect, beforeEach } from 'vitest';
import { QuestEngine, emptyQuestState, type GameEvent } from '../src/systems/quest';
import type { QuestDef } from '../src/data/schema';

const dlg = { offer: 'd_offer', inProgress: 'd_prog', complete: 'd_done' };
const DEFS: QuestDef[] = [
  { id: 'q_a', chapter: 1, type: 'main', title: 'A', description: '', giver: 'npc_woni', map: 'm1',
    objectives: [{ kind: 'kill', target: 'slime', count: 2 }], rewards: { xp: 10, flags: ['a_done'] }, dialogues: dlg },
  { id: 'q_b', chapter: 1, type: 'main', title: 'B', description: '', giver: 'npc_woni', map: 'm1',
    requires: { questsDone: ['q_a'] },
    objectives: [{ kind: 'collect', target: 'snack', count: 3 }, { kind: 'talk', target: 'npc_may' }], rewards: { hearts: 5 }, dialogues: dlg },
  { id: 'q_c', chapter: 1, type: 'side', title: 'C', description: '', giver: 'npc_zena', map: 'm1',
    requires: { level: 5, member: 'zena' },
    objectives: [{ kind: 'reach', target: 'm2' }], rewards: {}, dialogues: dlg },
];

let flags: Set<string>;
let engine: QuestEngine;
const ev = (e: GameEvent) => engine.report(e);

beforeEach(() => {
  flags = new Set();
  engine = new QuestEngine(DEFS, emptyQuestState(), flags, { level: 1, member: 'woni' });
});

describe('status and requirements', () => {
  it('unlocks quests without requirements, locks the rest', () => {
    expect(engine.status('q_a')).toBe('available');
    expect(engine.status('q_b')).toBe('locked');
    expect(engine.status('q_c')).toBe('locked');
    expect(engine.available().map((q) => q.id)).toEqual(['q_a']);
  });
  it('checks level and member requirements', () => {
    const zena = new QuestEngine(DEFS, emptyQuestState(), new Set(), { level: 5, member: 'zena' });
    expect(zena.status('q_c')).toBe('available');
    const lowZena = new QuestEngine(DEFS, emptyQuestState(), new Set(), { level: 4, member: 'zena' });
    expect(lowZena.status('q_c')).toBe('locked');
  });
  it('lists quests by giver', () => {
    expect(engine.questsForNpc('npc_woni').map((q) => q.id)).toEqual(['q_a']);
  });
});

describe('progress', () => {
  it('counts kills and becomes completable at the target', () => {
    engine.start('q_a');
    expect(engine.status('q_a')).toBe('active');
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual([]);
    expect(engine.progress('q_a')).toEqual([1]);
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual(['q_a']);
    expect(engine.status('q_a')).toBe('completable');
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual([]);
    expect(engine.progress('q_a')).toEqual([2]);
  });
  it('ignores events for other targets and inactive quests', () => {
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual([]);
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'mushroom' });
    expect(engine.progress('q_a')).toEqual([0]);
  });
  it('tracks multiple objectives including talk', () => {
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    engine.complete('q_a');
    engine.start('q_b');
    ev({ type: 'item_collected', itemId: 'snack', count: 2 });
    ev({ type: 'npc_talked', npcId: 'npc_may' });
    expect(engine.progress('q_b')).toEqual([2, 1]);
    expect(engine.status('q_b')).toBe('active');
    expect(ev({ type: 'item_collected', itemId: 'snack', count: 1 })).toEqual(['q_b']);
  });
});

describe('completion', () => {
  it('returns rewards, sets flags, moves to done, unlocks dependents', () => {
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    const reward = engine.complete('q_a');
    expect(reward).toEqual({ xp: 10, flags: ['a_done'] });
    expect(flags.has('a_done')).toBe(true);
    expect(engine.status('q_a')).toBe('done');
    expect(engine.status('q_b')).toBe('available');
    expect(engine.getState().done).toEqual(['q_a']);
  });
  it('throws when starting a locked quest or completing an unfinished one', () => {
    expect(() => engine.start('q_b')).toThrow(/q_b/);
    engine.start('q_a');
    expect(() => engine.complete('q_a')).toThrow(/q_a/);
  });
  it('restores from state', () => {
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    const restored = new QuestEngine(DEFS, engine.getState(), flags, { level: 1, member: 'woni' });
    expect(restored.progress('q_a')).toEqual([1]);
    expect(restored.status('q_a')).toBe('active');
  });
});

describe('self-talk objectives', () => {
  it('auto-completes talk objectives targeting the player\'s own member npc', () => {
    const defs: QuestDef[] = [{ id: 'q_self', chapter: 1, type: 'main', title: 's', description: '', giver: 'npc_manager', map: 'm',
      objectives: [{ kind: 'talk', target: 'npc_may' }, { kind: 'talk', target: 'npc_zena' }], rewards: {}, dialogues: dlg }];
    const asMay = new QuestEngine(defs, emptyQuestState(), new Set(), { level: 1, member: 'may' });
    asMay.start('q_self');
    expect(asMay.progress('q_self')).toEqual([1, 0]);
  });
});

describe('content id drift', () => {
  it('drops unknown active/done quest ids on construction and keeps working', () => {
    const state = { ...emptyQuestState(), active: { ghost: [0] }, done: ['q_a', 'phantom'] };
    const engine2 = new QuestEngine(DEFS, state, new Set(), { level: 1, member: 'woni' });
    expect(engine2.getState()).toEqual({ active: {}, done: ['q_a'] });
    expect(() => engine2.report({ type: 'enemy_killed', enemyId: 'slime' })).not.toThrow();
  });
});
