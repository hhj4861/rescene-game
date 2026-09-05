import type { MemberId } from '../systems/types';

export const SCENE = {
  boot: 'Boot', preload: 'Preload', title: 'Title', select: 'CharacterSelect',
  world: 'World', hud: 'Hud', dialogue: 'Dialogue', cutscene: 'Cutscene',
} as const;

export const TEX = {
  tiles: 'tiles', portal: 'portal', portalLocked: 'portal_locked', savepoint: 'savepoint',
  heart: 'drop_heart', item: 'drop_item', projectile: 'projectile', hit: 'hit',
} as const;

export const playerTex = (member: MemberId): string => `player_${member}`;
export const enemyTex = (enemyId: string): string => `enemy_${enemyId}`;
export const npcTex = (npcId: string): string => `npc_${npcId}`;
export const mapKey = (mapId: string): string => `map_${mapId}`;
