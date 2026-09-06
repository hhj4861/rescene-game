import { describe, it, expect } from 'vitest';
import { MEMBERS } from '../src/data/members';
import { SKILLS } from '../src/data/skills';
import { MemberDefSchema, SkillDefSchema, EnemyDefSchema, MemeDefSchema, NpcDefSchema, StageDefSchema, VoiceProfileSchema } from '../src/data/schema';
import { getMember, getSkill, validateAllData, ENEMIES, MEMES, getEnemy, getMeme, getNpc, NPCS, STAGES, getStage } from '../src/data/index';
import { MEMBER_IDS } from '../src/systems/types';

describe('members', () => {
  it('has exactly the five members', () => {
    expect(MEMBERS.map((m) => m.id).sort()).toEqual([...MEMBER_IDS].sort());
  });
  it('every member passes the schema', () => {
    for (const m of MEMBERS) expect(() => MemberDefSchema.parse(m), m.id).not.toThrow();
  });
  it('every member owns its basic and super skill', () => {
    for (const m of MEMBERS) {
      expect(getSkill(m.basicSkill).member, m.id).toBe(m.id);
      expect(getSkill(m.superSkill).member, m.id).toBe(m.id);
    }
  });
});

describe('skills', () => {
  it('every skill passes the schema and belongs to its member', () => {
    for (const s of SKILLS) {
      expect(() => SkillDefSchema.parse(s), s.id).not.toThrow();
      expect(getMember(s.member).id, s.id).toBe(s.member);
    }
  });
  it('ids are unique', () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
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

describe('enemies and memes', () => {
  it('pass their schemas', () => {
    ENEMIES.forEach((e) => expect(() => EnemyDefSchema.parse(e), e.id).not.toThrow());
    MEMES.forEach((m) => expect(() => MemeDefSchema.parse(m), m.id).not.toThrow());
  });
  it('ids are unique', () => {
    expect(new Set(ENEMIES.map((e) => e.id)).size).toBe(ENEMIES.length);
    expect(new Set(MEMES.map((m) => m.id)).size).toBe(MEMES.length);
  });
  it('getters throw on unknown ids', () => {
    expect(() => getEnemy('x')).toThrow(/x/);
    expect(() => getMeme('x')).toThrow(/x/);
  });
});

describe('npcs', () => {
  it('pass the schema', () => {
    NPCS.forEach((n) => expect(() => NpcDefSchema.parse(n), n.id).not.toThrow());
  });
  it('member npcs are tagged with their member', () => {
    for (const m of MEMBERS) expect(getNpc(`npc_${m.id}`).member).toBe(m.id);
  });
});

describe('schema v2', () => {
  it('members carry arcade stats, super text and a voice profile', () => {
    for (const m of MEMBERS) {
      expect(m.atk).toBeGreaterThan(0);
      expect(m.superText.length).toBeGreaterThan(0);
      VoiceProfileSchema.parse(m.voice);
      getSkill(m.basicSkill); getSkill(m.superSkill);
    }
  });
  it('enemies carry score and heartChance', () => {
    for (const e of ENEMIES) { expect(e.score).toBeGreaterThanOrEqual(0); expect(e.heartChance).toBeLessThanOrEqual(1); }
  });
  it('memes carry a run buff', () => { for (const m of MEMES) expect(['atk', 'spd', 'jump', 'gauge', 'heart', 'combo', 'score']).toContain(m.buff.key); });
  it('rejects a stage whose intro is not exactly three lines', () => {
    expect(() => StageDefSchema.parse({ id: 'x', index: 1, name: 'x', era: 'x', map: 'x', intro: ['a'], bgm: 'stage', timerSec: 180,
      sections: [{ lock: 'l', spawn: 's', waves: [{ spawn: 's', enemy: 'e', count: 1, intervalMs: 0 }] }], boss: { lock: 'lb', spawn: 'sb', id: 'b' }, cardPool: ['c'] })).toThrow();
  });
});

describe('stages', () => {
  it('validateAllData accepts shipped stages and getStage resolves', () => { expect(() => validateAllData()).not.toThrow(); expect(getStage('s1_trainee').sections.length).toBe(4); });
  it('stage indices are 1..n without gaps', () => { expect(STAGES.map((s) => s.index)).toEqual(STAGES.map((_, i) => i + 1)); });
  it('getStage throws on unknown id', () => { expect(() => getStage('nope')).toThrow(); });
  it('every stage names a tileset palette and enemies may be static or summon minions', () => {
    for (const st of STAGES) expect(st.palette.length, st.id).toBeGreaterThan(0);
    expect(() => EnemyDefSchema.parse({ id: 'x', name: 'x', hp: 1, atk: 0, spd: 0, ai: 'static', width: 8, height: 8, color: '#000000', score: 0, heartChance: 0, minion: 'enemy_sleep_slime' })).not.toThrow();
  });
});

describe('plan-2 stages', () => {
  it('registers stages 2-5 with the plan-2 boss gate wave', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['s1_trainee', 's2_debut', 's3_road', 's4_comeback', 's5_first_win']);
    expect(getStage('s3_road').sections[2]!.waves.at(-1)!.enemy).toBe('boss_top100_gate');
    expect(() => validateAllData()).not.toThrow();
  });
});

describe('plan-2 enemies and bosses', () => {
  it('has every plan-2 enemy and boss with the shared sizes', () => {
    const dims: Record<string, [number, number]> = {
      enemy_inear_noise: [24, 24], enemy_apathetic_audience: [32, 40], enemy_chart_ghost: [28, 36], enemy_schedule_bomb: [24, 28],
      enemy_apathy_fog: [40, 32], enemy_hate_crow: [32, 24], enemy_copycat: [28, 44], enemy_algorithm_golem: [44, 52],
      enemy_spotlight_drone: [28, 20], enemy_stage_trap: [32, 16],
      boss_first_camera: [80, 80], boss_top100_gate: [72, 96], boss_silence: [96, 96], boss_copycat_captain: [48, 72], boss_trophy_guardian: [96, 112],
    };
    for (const [id, [w, h]] of Object.entries(dims)) { const e = getEnemy(id); expect([e.width, e.height], id).toEqual([w, h]); }
    expect(getEnemy('boss_silence').minion).toBe('enemy_apathy_fog');
    expect(getEnemy('boss_first_camera').gimmick).toBe('lens');
    expect(getEnemy('enemy_apathetic_audience').ai).toBe('static');
  });
});
