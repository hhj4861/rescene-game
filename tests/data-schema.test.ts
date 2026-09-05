import { describe, it, expect } from 'vitest';
import { MEMBERS } from '../src/data/members';
import { SKILLS } from '../src/data/skills';
import { MemberDefSchema, SkillDefSchema } from '../src/data/schema';
import { getMember, getSkill, validateAllData } from '../src/data/index';
import { MEMBER_IDS } from '../src/systems/types';

describe('members', () => {
  it('has exactly the five members', () => {
    expect(MEMBERS.map((m) => m.id).sort()).toEqual([...MEMBER_IDS].sort());
  });
  it('every member passes the schema', () => {
    for (const m of MEMBERS) expect(() => MemberDefSchema.parse(m), m.id).not.toThrow();
  });
  it('every member references existing skills including a *_basic skill', () => {
    for (const m of MEMBERS) {
      expect(m.skills).toContain(`${m.id}_basic`);
      for (const s of m.skills) expect(() => getSkill(s), `${m.id} -> ${s}`).not.toThrow();
    }
  });
});

describe('skills', () => {
  it('every skill passes the schema and belongs to a member', () => {
    for (const s of SKILLS) {
      expect(() => SkillDefSchema.parse(s), s.id).not.toThrow();
      expect(getMember(s.member).skills, s.id).toContain(s.id);
    }
  });
  it('ids are unique', () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('basic skills cost no MP and have no cooldown longer than 500ms', () => {
    for (const s of SKILLS.filter((s) => s.id.endsWith('_basic'))) {
      expect(s.mpCost).toBe(0);
      expect(s.cooldownMs).toBeLessThanOrEqual(500);
      expect(s.level).toBe(1);
    }
  });
});

describe('validateAllData', () => {
  it('passes on shipped data', () => {
    expect(() => validateAllData()).not.toThrow();
  });
  it('getSkill throws on unknown id', () => {
    expect(() => getSkill('nope')).toThrow(/nope/);
  });
});
