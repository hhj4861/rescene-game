export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'spd' | 'luk';
export type Stats = Record<StatKey, number>;
export const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'def', 'spd', 'luk'];

export type MemberId = 'woni' | 'liv' | 'minami' | 'may' | 'zena';
export const MEMBER_IDS: MemberId[] = ['woni', 'liv', 'minami', 'may', 'zena'];

export interface PlayerState {
  member: MemberId;
  level: number;
  xp: number;
  sp: number;
  hp: number;
  mp: number;
  skillLevels: Record<string, number>;
}
