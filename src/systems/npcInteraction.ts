import type { QuestEngine } from './quest';

export type NpcAction =
  | { kind: 'complete'; questId: string; scriptId: string }
  | { kind: 'objective'; questId: string; scriptId: string }
  | { kind: 'progress'; questId: string; scriptId: string }
  | { kind: 'offer'; questId: string; scriptId: string }
  | { kind: 'idle'; scriptId: string };

function pendingTalk(quests: QuestEngine, npcId: string): { questId: string; dialogue?: string } | null {
  for (const q of quests.activeQuests()) {
    const prog = quests.progress(q.id);
    const i = q.objectives.findIndex((o, idx) => o.kind === 'talk' && o.target === npcId && (prog[idx] ?? 0) < 1);
    if (i >= 0) {
      const o = q.objectives[i]!;
      return { questId: q.id, dialogue: o.kind === 'talk' ? o.dialogue : undefined };
    }
  }
  return null;
}

export function pickNpcAction(quests: QuestEngine, npcId: string, defaultScript: string): NpcAction {
  const mine = quests.questsForNpc(npcId);
  const completable = mine.find((q) => quests.status(q.id) === 'completable');
  if (completable) return { kind: 'complete', questId: completable.id, scriptId: completable.dialogues.complete };
  const talk = pendingTalk(quests, npcId);
  if (talk) return { kind: 'objective', questId: talk.questId, scriptId: talk.dialogue ?? defaultScript };
  const active = mine.find((q) => quests.status(q.id) === 'active');
  if (active) return { kind: 'progress', questId: active.id, scriptId: active.dialogues.inProgress };
  const available = mine.find((q) => quests.status(q.id) === 'available');
  if (available) return { kind: 'offer', questId: available.id, scriptId: available.dialogues.offer };
  return { kind: 'idle', scriptId: defaultScript };
}

export function markerFor(quests: QuestEngine, npcId: string): { text: string; color: string } | null {
  const action = pickNpcAction(quests, npcId, '');
  switch (action.kind) {
    case 'complete': return { text: '?', color: '#ffd166' };
    case 'objective': return { text: '…', color: '#7dcfff' };
    case 'offer': return { text: '!', color: '#ffd166' };
    case 'progress': return { text: '?', color: '#a9b1d6' };
    case 'idle': return null;
  }
}
