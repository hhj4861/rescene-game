import type { MemberId } from '../systems/types';
import { MemberDefSchema, SkillDefSchema, type MemberDef, type SkillDef } from './schema';
import { MEMBERS } from './members';
import { SKILLS } from './skills';

export { MEMBERS, SKILLS };

const memberById = new Map(MEMBERS.map((m) => [m.id, m]));
const skillById = new Map(SKILLS.map((s) => [s.id, s]));

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
}
