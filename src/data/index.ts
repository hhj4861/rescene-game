import type { MemberId } from '../systems/types';
import { MEMBER_IDS } from '../systems/types';
import {
  MemberDefSchema, SkillDefSchema, EnemyDefSchema, ItemDefSchema, MemeDefSchema,
  CutsceneDefSchema, DialogueScriptSchema, NpcDefSchema, QuestDefSchema,
  type MemberDef, type SkillDef, type EnemyDef, type ItemDef, type MemeDef,
  type CutsceneDef, type DialogueScript, type NpcDef, type QuestDef,
} from './schema';
import { MEMBERS } from './members';
import { SKILLS } from './skills';
import { ENEMIES } from './enemies';
import { ITEMS } from './items';
import { MEMES } from './memes';
import { CUTSCENES, DIALOGUES, NPCS, QUESTS } from './chapters/index';
import { MAPS, getMap } from './maps';

export { MEMBERS, SKILLS, ENEMIES, ITEMS, MEMES, CUTSCENES, DIALOGUES, NPCS, QUESTS, MAPS, getMap };

const memberById = new Map(MEMBERS.map((m) => [m.id, m]));
const skillById = new Map(SKILLS.map((s) => [s.id, s]));
const enemyById = new Map(ENEMIES.map((e) => [e.id, e]));
const itemById = new Map(ITEMS.map((i) => [i.id, i]));
const memeById = new Map(MEMES.map((m) => [m.id, m]));
const npcById = new Map(NPCS.map((n) => [n.id, n]));
const dialogueById = new Map(DIALOGUES.map((d) => [d.id, d]));
const questById = new Map(QUESTS.map((q) => [q.id, q]));
const cutsceneById = new Map(CUTSCENES.map((c) => [c.id, c]));

export function getMember(id: MemberId): MemberDef {
  const m = memberById.get(id);
  if (!m) throw new Error(`unknown member: ${id}`);
  return m;
}

export function getSkill(id: string): SkillDef {
  const s = skillById.get(id);
  if (!s) throw new Error(`unknown skill: ${id}`);
  return s;
}

export function getEnemy(id: string): EnemyDef {
  const e = enemyById.get(id);
  if (!e) throw new Error(`unknown enemy: ${id}`);
  return e;
}

export function getItem(id: string): ItemDef {
  const i = itemById.get(id);
  if (!i) throw new Error(`unknown item: ${id}`);
  return i;
}

export function getMeme(id: string): MemeDef {
  const m = memeById.get(id);
  if (!m) throw new Error(`unknown meme: ${id}`);
  return m;
}

export function hasMeme(id: string): boolean { return memeById.has(id); }
export function hasItem(id: string): boolean { return itemById.has(id); }
export function hasQuest(id: string): boolean { return questById.has(id); }

export function getNpc(id: string): NpcDef {
  const n = npcById.get(id);
  if (!n) throw new Error(`unknown npc: ${id}`);
  return n;
}
export function getDialogue(id: string): DialogueScript {
  const d = dialogueById.get(id);
  if (!d) throw new Error(`unknown dialogue: ${id}`);
  return d;
}
export function getQuest(id: string): QuestDef {
  const q = questById.get(id);
  if (!q) throw new Error(`unknown quest: ${id}`);
  return q;
}
export function getCutscene(id: string): CutsceneDef {
  const c = cutsceneById.get(id);
  if (!c) throw new Error(`unknown cutscene: ${id}`);
  return c;
}
export function speakerName(id: string): string {
  if (id === 'narrator') return '';
  if ((MEMBER_IDS as string[]).includes(id)) return getMember(id as MemberId).name;
  return npcById.get(id)?.name ?? '';
}

function assertUnique(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

/** 모든 데이터의 스키마와 id 참조를 검사한다. 이후 태스크가 검사 항목을 여기에 추가한다. */
export function validateAllData(): void {
  MEMBERS.forEach((m) => MemberDefSchema.parse(m));
  SKILLS.forEach((s) => SkillDefSchema.parse(s));
  assertUnique('member', MEMBERS.map((m) => m.id));
  assertUnique('skill', SKILLS.map((s) => s.id));
  for (const m of MEMBERS) {
    for (const sid of m.skills) {
      const s = getSkill(sid);
      if (s.member !== m.id) throw new Error(`skill ${sid} belongs to ${s.member}, listed under ${m.id}`);
    }
  }
  ENEMIES.forEach((e) => EnemyDefSchema.parse(e));
  ITEMS.forEach((i) => ItemDefSchema.parse(i));
  MEMES.forEach((m) => MemeDefSchema.parse(m));
  assertUnique('enemy', ENEMIES.map((e) => e.id));
  assertUnique('item', ITEMS.map((i) => i.id));
  assertUnique('meme', MEMES.map((m) => m.id));
  for (const e of ENEMIES) for (const d of e.drops) getItem(d.itemId);
  NPCS.forEach((n) => NpcDefSchema.parse(n));
  DIALOGUES.forEach((d) => DialogueScriptSchema.parse(d));
  QUESTS.forEach((q) => QuestDefSchema.parse(q));
  CUTSCENES.forEach((c) => CutsceneDefSchema.parse(c));
  assertUnique('npc', NPCS.map((n) => n.id));
  assertUnique('dialogue', DIALOGUES.map((d) => d.id));
  assertUnique('quest', QUESTS.map((q) => q.id));
  assertUnique('cutscene', CUTSCENES.map((c) => c.id));
  for (const n of NPCS) getDialogue(n.dialogue);
  for (const d of DIALOGUES) for (const node of d.nodes) {
    if (node.speaker !== 'narrator' && speakerName(node.speaker) === '') throw new Error(`dialogue ${d.id}/${node.id}: unknown speaker ${node.speaker}`);
  }
  for (const q of QUESTS) {
    getNpc(q.giver);
    getMap(q.map);
    getDialogue(q.dialogues.offer); getDialogue(q.dialogues.inProgress); getDialogue(q.dialogues.complete);
    for (const o of q.objectives) {
      if (o.kind === 'kill') getEnemy(o.target);
      if (o.kind === 'collect') getItem(o.target);
      if (o.kind === 'talk') { getNpc(o.target); if (o.dialogue) getDialogue(o.dialogue); }
      if (o.kind === 'reach') getMap(o.target);
      if (o.kind === 'emote') { getMeme(o.target); getMap(o.map); }
    }
    for (const it of q.rewards.items ?? []) getItem(it.id);
    if (q.rewards.meme) getMeme(q.rewards.meme);
    for (const id of q.requires?.questsDone ?? []) getQuest(id);
    for (const f of q.rewards.flags ?? []) {
      const m = /^ch(\d+)_clear$/.exec(f);
      if (m) getCutscene(`ch${m[1]}_clear`);
    }
  }
  for (const m of MEMBERS) { getMap(m.prologueMap); getCutscene(`ch0_intro_${m.id}`); }
}
