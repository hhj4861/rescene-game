import { describe, it, expect } from 'vitest';
import { markerFor, pickNpcAction } from '../src/systems/npcInteraction';
import { QuestEngine, emptyQuestState } from '../src/systems/quest';
import type { QuestDef } from '../src/data/schema';

const dlg = (p: string) => ({ offer: `${p}_offer`, inProgress: `${p}_prog`, complete: `${p}_done` });
const DEFS: QuestDef[] = [
  { id: 'q1', chapter: 1, type: 'main', title: '1', description: '', giver: 'npc_manager', map: 'm',
    objectives: [{ kind: 'kill', target: 'slime', count: 1 }], rewards: {}, dialogues: dlg('q1') },
  { id: 'q2', chapter: 1, type: 'main', title: '2', description: '', giver: 'npc_manager', map: 'm', requires: { questsDone: ['q1'] },
    objectives: [{ kind: 'talk', target: 'npc_zena', dialogue: 'd_zena' }], rewards: {}, dialogues: dlg('q2') },
];
const engine = () => new QuestEngine(DEFS, emptyQuestState(), new Set(), { level: 1, member: 'woni' });

describe('pickNpcAction', () => {
  it('offers an available quest from its giver', () => {
    expect(pickNpcAction(engine(), 'npc_manager', 'idle')).toEqual({ kind: 'offer', questId: 'q1', scriptId: 'q1_offer' });
    expect(markerFor(engine(), 'npc_manager')).toEqual({ text: '!', color: '#ffd166' });
  });
  it('shows progress while active and completion when done', () => {
    const e = engine();
    e.start('q1');
    expect(pickNpcAction(e, 'npc_manager', 'idle')).toEqual({ kind: 'progress', questId: 'q1', scriptId: 'q1_prog' });
    expect(markerFor(e, 'npc_manager')).toEqual({ text: '?', color: '#a9b1d6' });
    e.report({ type: 'enemy_killed', enemyId: 'slime' });
    expect(pickNpcAction(e, 'npc_manager', 'idle')).toEqual({ kind: 'complete', questId: 'q1', scriptId: 'q1_done' });
    expect(markerFor(e, 'npc_manager')).toEqual({ text: '?', color: '#ffd166' });
  });
  it('routes talk objectives to the objective dialogue and falls back to idle', () => {
    const e = engine();
    expect(pickNpcAction(e, 'npc_zena', 'zena_idle')).toEqual({ kind: 'idle', scriptId: 'zena_idle' });
    expect(markerFor(e, 'npc_zena')).toBeNull();
    e.start('q1'); e.report({ type: 'enemy_killed', enemyId: 'slime' }); e.complete('q1'); e.start('q2');
    expect(pickNpcAction(e, 'npc_zena', 'zena_idle')).toEqual({ kind: 'objective', questId: 'q2', scriptId: 'd_zena' });
    expect(markerFor(e, 'npc_zena')).toEqual({ text: '…', color: '#7dcfff' });
    e.report({ type: 'npc_talked', npcId: 'npc_zena', dialogueId: 'd_zena' });
    expect(pickNpcAction(e, 'npc_zena', 'zena_idle')).toEqual({ kind: 'idle', scriptId: 'zena_idle' });
  });
});
