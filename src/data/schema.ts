import { z } from 'zod';

export const VoiceWaveSchema = z.enum(['square', 'triangle', 'sawtooth', 'pulse']);
export type VoiceWave = z.infer<typeof VoiceWaveSchema>;
// 문장 끝 억양: fall = 마지막 노트 -3반음, rise = +3, bounce = 노트마다 짝수 +1/홀수 -1 교대, flat = 변화 없음.
export const VoiceAccentSchema = z.enum(['fall', 'rise', 'flat', 'bounce']);
export type VoiceAccent = z.infer<typeof VoiceAccentSchema>;
export const VoiceProfileSchema = z.object({
  baseHz: z.number().positive(),
  syllableMs: z.number().positive(),
  wave: VoiceWaveSchema,
  vibrato: z.number().min(0).optional(),
  accent: VoiceAccentSchema.optional(),
  spread: z.number().positive().optional(), // 음절 semitone 배율, 기본 1
});
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
  palette: z.string().min(1), // 타일셋 팔레트 키 (tilesetTex(palette))
  outfit: z.enum(['training', 'debut', 'road', 'comeback', 'pretty']).optional(), // 멤버 의상(기본 training)
  sections: z.array(SectionDefSchema).min(1),
  boss: z.object({ lock: z.string().min(1), spawn: z.string().min(1), id: z.string().min(1) }),
  cardPool: z.array(z.string().min(1)).min(1),
});
export type StageDef = z.infer<typeof StageDefSchema>;

// SkillEffect의 buff/debuff가 여전히 참조하므로 유지한다(StatsSchema는 v0.1 스탯 묶음이라 v0.2에서 뺐다).
export const StatKeySchema = z.enum(['hp', 'mp', 'atk', 'def', 'spd', 'luk']);
export const MemberIdSchema = z.enum(['woni', 'liv', 'minami', 'may', 'zena']);

// 멤버 말버릇 대사 4종, 각 3문장 이상. 창작 문장(실제 발언 인용 금지), 말풍선용 30자 이내.
export const MemberLinesSchema = z.object({
  cheer: z.array(z.string().min(1)).min(3), // 응원 NPC로 등장할 때
  win: z.array(z.string().min(1)).min(3), // 결과 화면
  hurt: z.array(z.string().min(1)).min(3), // 피격 말풍선(20% 확률)
  card: z.array(z.string().min(1)).min(3), // 카드 획득 시 한 마디
});
export type MemberLines = z.infer<typeof MemberLinesSchema>;

export const MemberDefSchema = z.object({
  id: MemberIdSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  hometown: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  attack: z.enum(['melee', 'ranged']),
  weapon: z.string().min(1),
  atk: z.number().positive(),
  spd: z.number().positive(),
  jump: z.number().positive(),
  basicSkill: z.string().min(1),
  superSkill: z.string().min(1),
  superText: z.string().min(1),
  voice: VoiceProfileSchema,
  lines: MemberLinesSchema,
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
  multiplier: z.number().min(0),
  origin: z.string(),
  effects: z.array(SkillEffectSchema).min(1),
});
export type SkillDef = z.infer<typeof SkillDefSchema>;

export const EnemyDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hp: z.number().positive(),
  atk: z.number().min(0),
  spd: z.number().min(0),
  ai: z.enum(['patrol', 'chase', 'static', 'boss']),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  score: z.number().int().min(0),
  heartChance: z.number().min(0).max(1),
  eliteScale: z.number().positive().optional(),
  gimmick: z.enum(['lens', 'silence', 'copycat', 'trophy']).optional(),
  phases: z.array(z.object({ hpRatio: z.number().min(0).max(1), name: z.string().min(1) })).optional(),
  minion: z.string().min(1).optional(), // 보스가 소환하는 잡몹 id (침묵·트로피)
});
export type EnemyDef = z.infer<typeof EnemyDefSchema>;

export const MemeDefSchema = z.object({
  id: z.string().min(1),
  member: MemberIdSchema,
  text: z.string().min(1),
  origin: z.string().min(1),
  note: z.string(),
  buff: z.object({ key: BuffKeySchema, value: z.number() }),
});
export type MemeDef = z.infer<typeof MemeDefSchema>;

export const NpcDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  member: MemberIdSchema.optional(),
});
export type NpcDef = z.infer<typeof NpcDefSchema>;
