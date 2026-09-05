import type { MemberId } from '../systems/types';
import { MemberDefSchema, SkillDefSchema, EnemyDefSchema, ItemDefSchema, MemeDefSchema, type MemberDef, type SkillDef, type EnemyDef, type ItemDef, type MemeDef } from './schema';
import { MEMBERS } from './members';
import { SKILLS } from './skills';
import { ENEMIES } from './enemies';
import { ITEMS } from './items';
import { MEMES } from './memes';

export { MEMBERS, SKILLS, ENEMIES, ITEMS, MEMES };

const memberById = new Map(MEMBERS.map((m) => [m.id, m]));
const skillById = new Map(SKILLS.map((s) => [s.id, s]));
const enemyById = new Map(ENEMIES.map((e) => [e.id, e]));
const itemById = new Map(ITEMS.map((i) => [i.id, i]));
const memeById = new Map(MEMES.map((m) => [m.id, m]));

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
}
