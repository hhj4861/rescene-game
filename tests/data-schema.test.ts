import { describe, it, expect } from 'vitest';
import { MEMBERS } from '../src/data/members';
import { SKILLS } from '../src/data/skills';
import { MemberDefSchema, SkillDefSchema, EnemyDefSchema, ItemDefSchema, MemeDefSchema, NpcDefSchema, CutsceneDefSchema, DialogueScriptSchema } from '../src/data/schema';
import { getMember, getSkill, validateAllData, ENEMIES, ITEMS, MEMES, getEnemy, getItem, getMeme, getDialogue, getNpc, speakerName } from '../src/data/index';
import { MEMBER_IDS } from '../src/systems/types';
import { NPCS, DIALOGUES, CUTSCENES } from '../src/data/chapters/index';
import { MAPS } from '../src/data/maps';

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

describe('enemies, items, memes', () => {
  it('pass their schemas', () => {
    ENEMIES.forEach((e) => expect(() => EnemyDefSchema.parse(e), e.id).not.toThrow());
    ITEMS.forEach((i) => expect(() => ItemDefSchema.parse(i), i.id).not.toThrow());
    MEMES.forEach((m) => expect(() => MemeDefSchema.parse(m), m.id).not.toThrow());
  });
  it('enemy drops reference existing items', () => {
    for (const e of ENEMIES) for (const d of e.drops) expect(() => getItem(d.itemId), `${e.id} -> ${d.itemId}`).not.toThrow();
  });
  it('has one signature food per member', () => {
    const foods = ITEMS.filter((i) => i.type === 'consumable');
    expect(foods.map((f) => f.id).sort()).toEqual(['food_malatang', 'food_mulhoe', 'food_seolleongtang', 'food_tteokguk', 'food_yeopddeok']);
  });
  it('getters throw on unknown ids', () => {
    expect(() => getEnemy('x')).toThrow(/x/);
    expect(() => getMeme('x')).toThrow(/x/);
  });
});

describe('chapter 0 content', () => {
  it('npcs, dialogues and cutscenes pass their schemas', () => {
    NPCS.forEach((n) => expect(() => NpcDefSchema.parse(n), n.id).not.toThrow());
    DIALOGUES.forEach((d) => expect(() => DialogueScriptSchema.parse(d), d.id).not.toThrow());
    CUTSCENES.forEach((c) => expect(() => CutsceneDefSchema.parse(c), c.id).not.toThrow());
  });
  it('every npc default dialogue exists and every speaker resolves to a name', () => {
    for (const n of NPCS) expect(() => getDialogue(n.dialogue), n.id).not.toThrow();
    for (const d of DIALOGUES) for (const node of d.nodes) {
      if (node.speaker === 'narrator') continue;
      expect(speakerName(node.speaker), `${d.id}/${node.id}`).not.toBe('');
    }
  });
  it('every member has a prologue map, intro cutscene and audition dialogue', () => {
    for (const m of MEMBERS) {
      expect(MAPS.some((map) => map.id === m.prologueMap), m.id).toBe(true);
      expect(CUTSCENES.some((c) => c.id === `ch0_intro_${m.id}`), m.id).toBe(true);
      expect(() => getDialogue(`d0_${m.id}_audition`), m.id).not.toThrow();
    }
  });
  it('member npcs are tagged with their member', () => {
    for (const m of MEMBERS) expect(getNpc(`npc_${m.id}`).member).toBe(m.id);
  });
});
