import { z } from 'zod';

export const StatKeySchema = z.enum(['hp', 'mp', 'atk', 'def', 'spd', 'luk']);
export const StatsSchema = z.object({
  hp: z.number(), mp: z.number(), atk: z.number(), def: z.number(), spd: z.number(), luk: z.number(),
});
export const MemberIdSchema = z.enum(['woni', 'liv', 'minami', 'may', 'zena']);

export const MemberDefSchema = z.object({
  id: MemberIdSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  hometown: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  baseStats: StatsSchema,
  growth: StatsSchema,
  attack: z.enum(['melee', 'ranged']),
  weapon: z.string().min(1),
  skills: z.array(z.string().min(1)).min(1),
  prologueMap: z.string().min(1),
});
export type MemberDef = z.infer<typeof MemberDefSchema>;

export const SkillEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('melee'), width: z.number().positive(), height: z.number().positive(), knockback: z.number().min(0), centered: z.boolean().optional() }),
  z.object({ kind: z.literal('projectile'), speed: z.number().positive(), range: z.number().positive(), pierce: z.boolean() }),
  z.object({ kind: z.literal('dot'), ticks: z.number().int().positive(), intervalMs: z.number().positive() }),
  z.object({ kind: z.literal('buff'), stat: StatKeySchema, ratio: z.number(), durationMs: z.number().positive() }),
  z.object({ kind: z.literal('debuff'), stat: StatKeySchema, ratio: z.number(), durationMs: z.number().positive() }),
  z.object({ kind: z.literal('stun'), width: z.number().positive(), height: z.number().positive(), durationMs: z.number().positive() }),
  z.object({ kind: z.literal('counter'), windowMs: z.number().positive(), multiplier: z.number().positive() }),
  z.object({ kind: z.literal('heal'), ratio: z.number().positive() }),
]);
export type SkillEffect = z.infer<typeof SkillEffectSchema>;

export const SkillDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  member: MemberIdSchema,
  level: z.number().int().min(1),
  mpCost: z.number().min(0),
  cooldownMs: z.number().min(0),
  multiplier: z.number().min(0),
  origin: z.string(),
  effects: z.array(SkillEffectSchema).min(1),
});
export type SkillDef = z.infer<typeof SkillDefSchema>;
