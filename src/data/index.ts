import type { MemberId } from '../systems/types';
import {
  MemberDefSchema, SkillDefSchema, EnemyDefSchema, MemeDefSchema, NpcDefSchema, StageDefSchema,
  type MemberDef, type SkillDef, type EnemyDef, type MemeDef, type NpcDef,
} from './schema';
import { MEMBERS } from './members';
import { SKILLS } from './skills';
import { ENEMIES } from './enemies';
import { MEMES } from './memes';
import { NPCS } from './npcs';
import { MAPS, getMap } from './maps';
import { STAGES, getStage, getStageByIndex } from './stages/index';

export { MEMBERS, SKILLS, ENEMIES, MEMES, NPCS, MAPS, getMap, STAGES, getStage, getStageByIndex };

const memberById = new Map(MEMBERS.map((m) => [m.id, m]));
const skillById = new Map(SKILLS.map((s) => [s.id, s]));
const enemyById = new Map(ENEMIES.map((e) => [e.id, e]));
const memeById = new Map(MEMES.map((m) => [m.id, m]));
const npcById = new Map(NPCS.map((n) => [n.id, n]));

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

export function getMeme(id: string): MemeDef {
  const m = memeById.get(id);
  if (!m) throw new Error(`unknown meme: ${id}`);
  return m;
}

export function hasMeme(id: string): boolean { return memeById.has(id); }

export function getNpc(id: string): NpcDef {
  const n = npcById.get(id);
  if (!n) throw new Error(`unknown npc: ${id}`);
  return n;
}

function assertUnique(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

/** 모든 데이터의 스키마와 id 참조를 검사한다. */
export function validateAllData(): void {
  MEMBERS.forEach((m) => MemberDefSchema.parse(m));
  SKILLS.forEach((s) => SkillDefSchema.parse(s));
  assertUnique('member', MEMBERS.map((m) => m.id));
  assertUnique('skill', SKILLS.map((s) => s.id));
  for (const m of MEMBERS) {
    if (getSkill(m.basicSkill).member !== m.id) throw new Error(`basicSkill ${m.basicSkill} belongs to another member, listed under ${m.id}`);
    if (getSkill(m.superSkill).member !== m.id) throw new Error(`superSkill ${m.superSkill} belongs to another member, listed under ${m.id}`);
  }
  ENEMIES.forEach((e) => EnemyDefSchema.parse(e));
  MEMES.forEach((m) => MemeDefSchema.parse(m));
  assertUnique('enemy', ENEMIES.map((e) => e.id));
  assertUnique('meme', MEMES.map((m) => m.id));
  NPCS.forEach((n) => NpcDefSchema.parse(n));
  assertUnique('npc', NPCS.map((n) => n.id));

  STAGES.forEach((s) => StageDefSchema.parse(s));
  assertUnique('stage', STAGES.map((s) => s.id));
  const sortedIndices = STAGES.map((s) => s.index).sort((a, b) => a - b);
  sortedIndices.forEach((idx, i) => {
    if (idx !== i + 1) throw new Error(`stage indices must be 1..n without gaps, got ${sortedIndices.join(',')}`);
  });
  for (const st of STAGES) {
    getMap(st.map);
    for (const sec of st.sections) {
      for (const w of sec.waves) getEnemy(w.enemy);
      if (sec.cheer) getNpc(sec.cheer.npc);
    }
    const boss = getEnemy(st.boss.id);
    if (boss.ai !== 'boss') throw new Error(`stage ${st.id}: boss ${st.boss.id} is not ai:boss`);
    for (const c of st.cardPool) if (!hasMeme(c)) throw new Error(`stage ${st.id}: unknown meme ${c}`);
  }
}
