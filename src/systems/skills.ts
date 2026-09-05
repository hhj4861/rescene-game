import type { SkillDef } from '../data/schema';
import type { PlayerState } from './types';

export const MAX_SKILL_LEVEL = 10;

export interface SkillRuntime {
  cooldownUntil: Record<string, number>;
}

export function emptySkillRuntime(): SkillRuntime {
  return { cooldownUntil: {} };
}

export type CastCheck = { ok: true } | { ok: false; reason: 'member' | 'level' | 'mp' | 'cooldown' };

export function canCast(skill: SkillDef, player: PlayerState, rt: SkillRuntime, now: number): CastCheck {
  if (skill.member !== player.member) return { ok: false, reason: 'member' };
  if (player.level < skill.level) return { ok: false, reason: 'level' };
  if (player.mp < skill.mpCost) return { ok: false, reason: 'mp' };
  if ((rt.cooldownUntil[skill.id] ?? 0) > now) return { ok: false, reason: 'cooldown' };
  return { ok: true };
}

export function cast(
  skill: SkillDef,
  player: PlayerState,
  rt: SkillRuntime,
  now: number,
): { player: PlayerState; rt: SkillRuntime } {
  const check = canCast(skill, player, rt, now);
  if (!check.ok) throw new Error(`cannot cast ${skill.id}: ${check.reason}`);
  return {
    player: { ...player, mp: player.mp - skill.mpCost },
    rt: { cooldownUntil: { ...rt.cooldownUntil, [skill.id]: now + skill.cooldownMs } },
  };
}

export function skillLevelOf(player: PlayerState, skillId: string): number {
  return player.skillLevels[skillId] ?? 1;
}

export function skillMultiplier(skill: SkillDef, skillLevel: number): number {
  return skill.multiplier * (1 + 0.05 * (skillLevel - 1));
}

export function raiseSkill(player: PlayerState, skillId: string): PlayerState {
  const current = skillLevelOf(player, skillId);
  if (player.sp <= 0 || current >= MAX_SKILL_LEVEL) return player;
  return { ...player, sp: player.sp - 1, skillLevels: { ...player.skillLevels, [skillId]: current + 1 } };
}
