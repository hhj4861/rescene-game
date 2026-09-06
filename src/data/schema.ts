import { z } from 'zod';

export const VoiceWaveSchema = z.enum(['square', 'triangle', 'sawtooth', 'pulse']);
export type VoiceWave = z.infer<typeof VoiceWaveSchema>;
export const VoiceProfileSchema = z.object({ baseHz: z.number().positive(), syllableMs: z.number().positive(), wave: VoiceWaveSchema, vibrato: z.number().min(0).optional() });
export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;
export const BuffKeySchema = z.enum(['atk', 'spd', 'jump', 'gauge', 'heart', 'combo', 'score']);
export type BuffKey = z.infer<typeof BuffKeySchema>;
export const WaveDefSchema = z.object({ spawn: z.string().min(1), enemy: z.string().min(1), count: z.number().int().positive(), intervalMs: z.number().min(0), elite: z.boolean().optional() });
export type WaveDef = z.infer<typeof WaveDefSchema>;
export const SectionDefSchema = z.object({
  lock: z.string().min(1), spawn: z.string().min(1), waves: z.array(WaveDefSchema).min(1), chest: z.boolean().optional(),
  cheer: z.object({ npc: z.string().min(1), spawn: z.string().min(1), text: z.string().min(1) }).optional(),
});
export type SectionDef = z.infer<typeof SectionDefSchema>;
export const StageDefSchema = z.object({
  id: z.string().min(1), index: z.number().int().min(1), name: z.string().min(1), era: z.string().min(1), map: z.string().min(1),
  intro: z.array(z.string().min(1)).length(3), bgm: z.enum(['title', 'stage', 'boss']), timerSec: z.number().int().positive(),
  sections: z.array(SectionDefSchema).min(1),
  boss: z.object({ lock: z.string().min(1), spawn: z.string().min(1), id: z.string().min(1) }),
  cardPool: z.array(z.string().min(1)).min(1),
});
export type StageDef = z.infer<typeof StageDefSchema>;

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
  atk: z.number().positive(),
  spd: z.number().positive(),
  jump: z.number().positive(),
  basicSkill: z.string().min(1),
  superSkill: z.string().min(1),
  superText: z.string().min(1),
  voice: VoiceProfileSchema,
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

export const EnemyDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chapter: z.number().int().min(0),
  hp: z.number().positive(),
  atk: z.number().min(0),
  def: z.number().min(0),
  spd: z.number().min(0),
  xp: z.number().int().min(0),
  hearts: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  ai: z.enum(['patrol', 'chase', 'boss']),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  drops: z.array(z.object({ itemId: z.string().min(1), chance: z.number().min(0).max(1) })),
  score: z.number().int().min(0),
  heartChance: z.number().min(0).max(1),
  eliteScale: z.number().positive().optional(),
  gimmick: z.enum(['lens', 'silence', 'copycat', 'trophy']).optional(),
  phases: z.array(z.object({ hpRatio: z.number().min(0).max(1), name: z.string().min(1) })).optional(),
});
export type EnemyDef = z.infer<typeof EnemyDefSchema>;

export const EquipSlotSchema = z.enum(['inear', 'outfit', 'mic', 'shoes']);
export type EquipSlot = z.infer<typeof EquipSlotSchema>;

const ItemBase = { id: z.string().min(1), name: z.string().min(1), description: z.string(), price: z.number().int().min(0) };
export const ItemDefSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('consumable'), ...ItemBase, heal: z.object({ hp: z.number().optional(), mp: z.number().optional() }) }),
  z.object({ type: z.literal('equip'), ...ItemBase, slot: EquipSlotSchema, stats: StatsSchema.partial() }),
  z.object({ type: z.literal('etc'), ...ItemBase }),
  z.object({ type: z.literal('photocard'), ...ItemBase, member: MemberIdSchema }),
]);
export type ItemDef = z.infer<typeof ItemDefSchema>;

export const PassiveKeySchema = z.enum(['hp', 'mp', 'atk', 'def', 'spd', 'luk', 'aoeRange', 'foodHeal', 'fameGain', 'statusDuration']);
export type PassiveKey = z.infer<typeof PassiveKeySchema>;

export const MemeDefSchema = z.object({
  id: z.string().min(1),
  member: MemberIdSchema,
  text: z.string().min(1),
  origin: z.string().min(1),
  note: z.string(),
  passive: z.object({ key: PassiveKeySchema, value: z.number() }).optional(),
  buff: z.object({ key: BuffKeySchema, value: z.number() }),
});
export type MemeDef = z.infer<typeof MemeDefSchema>;

export const ObjectiveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('kill'), target: z.string().min(1), count: z.number().int().positive() }),
  z.object({ kind: z.literal('collect'), target: z.string().min(1), count: z.number().int().positive() }),
  z.object({ kind: z.literal('talk'), target: z.string().min(1), dialogue: z.string().optional() }),
  z.object({ kind: z.literal('reach'), target: z.string().min(1) }),
  z.object({ kind: z.literal('minigame'), target: z.string().min(1), score: z.number() }),
  z.object({ kind: z.literal('emote'), target: z.string().min(1), map: z.string().min(1) }),
]);
export type Objective = z.infer<typeof ObjectiveSchema>;

export const RewardSchema = z.object({
  xp: z.number().int().min(0).optional(),
  hearts: z.number().int().min(0).optional(),
  items: z.array(z.object({ id: z.string().min(1), count: z.number().int().positive() })).optional(),
  meme: z.string().optional(),
  fame: z.number().min(0).optional(),
  flags: z.array(z.string()).optional(),
  openMemeSlot: z.boolean().optional(),
});
export type Reward = z.infer<typeof RewardSchema>;

export const QuestDefSchema = z.object({
  id: z.string().min(1),
  chapter: z.number().int().min(0),
  type: z.enum(['main', 'side']),
  title: z.string().min(1),
  description: z.string(),
  giver: z.string().min(1),
  map: z.string().min(1),
  requires: z.object({
    level: z.number().int().optional(),
    questsDone: z.array(z.string()).optional(),
    flags: z.array(z.string()).optional(),
    member: MemberIdSchema.optional(),
  }).optional(),
  objectives: z.array(ObjectiveSchema).min(1),
  rewards: RewardSchema,
  dialogues: z.object({ offer: z.string().min(1), inProgress: z.string().min(1), complete: z.string().min(1) }),
});
export type QuestDef = z.infer<typeof QuestDefSchema>;

export const FaceSchema = z.enum(['neutral', 'happy', 'sad', 'surprised']);
export type Face = z.infer<typeof FaceSchema>;

export const DialogueChoiceSchema = z.object({
  text: z.string().min(1),
  next: z.string().min(1),
  setFlags: z.array(z.string()).optional(),
  requiresFlags: z.array(z.string()).optional(),
});
export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;

export const DialogueNodeSchema = z.object({
  id: z.string().min(1),
  speaker: z.string().min(1),
  face: FaceSchema.optional(),
  text: z.string().min(1),
  next: z.string().optional(),
  choices: z.array(DialogueChoiceSchema).min(1).optional(),
  setFlags: z.array(z.string()).optional(),
  end: z.boolean().optional(),
});
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;

export const DialogueScriptSchema = z
  .object({ id: z.string().min(1), nodes: z.array(DialogueNodeSchema).min(1) })
  .superRefine((script, ctx) => {
    const ids = new Set(script.nodes.map((n) => n.id));
    for (const n of script.nodes) {
      if (n.next && !ids.has(n.next)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${script.id}/${n.id}: next '${n.next}' not found` });
      for (const c of n.choices ?? []) {
        if (!ids.has(c.next)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${script.id}/${n.id}: choice next '${c.next}' not found` });
      }
      if (!n.next && !n.choices && !n.end) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${script.id}/${n.id}: needs next, choices, or end` });
    }
  });
export type DialogueScript = z.infer<typeof DialogueScriptSchema>;

export const NpcDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  dialogue: z.string().min(1),
  member: MemberIdSchema.optional(),
});
export type NpcDef = z.infer<typeof NpcDefSchema>;

export const CutsceneDefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lines: z.array(z.string().min(1)).min(1),
});
export type CutsceneDef = z.infer<typeof CutsceneDefSchema>;
