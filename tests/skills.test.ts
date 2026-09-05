import { describe, it, expect } from 'vitest';
import { canCast, cast, emptySkillRuntime, raiseSkill, skillLevelOf, skillMultiplier } from '../src/systems/skills';
import { getSkill } from '../src/data/index';
import type { PlayerState } from '../src/systems/types';

function woni(over: Partial<PlayerState> = {}): PlayerState {
  return { member: 'woni', level: 1, xp: 0, sp: 0, hp: 120, mp: 40, skillLevels: {}, ...over };
}

describe('canCast', () => {
  it('allows a level-1 skill with enough mp', () => {
    expect(canCast(getSkill('woni_ui'), woni(), emptySkillRuntime(), 0)).toEqual({ ok: true });
  });
  it('rejects another member skill', () => {
    expect(canCast(getSkill('liv_pitch'), woni(), emptySkillRuntime(), 0)).toEqual({ ok: false, reason: 'member' });
  });
  it('rejects a skill above player level', () => {
    expect(canCast(getSkill('woni_ma'), woni({ level: 4 }), emptySkillRuntime(), 0)).toEqual({ ok: false, reason: 'level' });
    expect(canCast(getSkill('woni_ma'), woni({ level: 5 }), emptySkillRuntime(), 0)).toEqual({ ok: true });
  });
  it('rejects when mp is short', () => {
    expect(canCast(getSkill('woni_ui'), woni({ mp: 7 }), emptySkillRuntime(), 0)).toEqual({ ok: false, reason: 'mp' });
  });
  it('rejects during cooldown', () => {
    const rt = { cooldownUntil: { woni_ui: 5000 } };
    expect(canCast(getSkill('woni_ui'), woni(), rt, 4999)).toEqual({ ok: false, reason: 'cooldown' });
    expect(canCast(getSkill('woni_ui'), woni(), rt, 5000)).toEqual({ ok: true });
  });
});

describe('cast', () => {
  it('deducts mp and sets cooldown', () => {
    const r = cast(getSkill('woni_ui'), woni(), emptySkillRuntime(), 1000);
    expect(r.player.mp).toBe(32);
    expect(r.rt.cooldownUntil.woni_ui).toBe(5000);
  });
  it('throws when not castable', () => {
    expect(() => cast(getSkill('woni_ui'), woni({ mp: 0 }), emptySkillRuntime(), 0)).toThrow(/mp/);
  });
});

describe('skill levels', () => {
  it('defaults to level 1 and scales multiplier 5% per level', () => {
    const s = getSkill('woni_ui');
    expect(skillLevelOf(woni(), 'woni_ui')).toBe(1);
    expect(skillMultiplier(s, 1)).toBeCloseTo(1.4);
    expect(skillMultiplier(s, 3)).toBeCloseTo(1.4 * 1.1);
  });
  it('raiseSkill spends one SP up to level 10', () => {
    let p = woni({ sp: 2 });
    p = raiseSkill(p, 'woni_ui');
    expect(p.skillLevels.woni_ui).toBe(2);
    expect(p.sp).toBe(1);
    p = raiseSkill(raiseSkill(p, 'woni_ui'), 'woni_ui');
    expect(p.skillLevels.woni_ui).toBe(3);
    expect(p.sp).toBe(0);
  });
  it('raiseSkill refuses at max level', () => {
    const p = woni({ sp: 5, skillLevels: { woni_ui: 10 } });
    expect(raiseSkill(p, 'woni_ui')).toEqual(p);
  });
});
