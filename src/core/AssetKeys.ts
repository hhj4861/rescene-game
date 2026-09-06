import type { MemberId } from '../systems/types';

export const SCENE = {
  boot: 'Boot', preload: 'Preload', title: 'Title', select: 'CharacterSelect',
  world: 'World', hud: 'Hud', cutscene: 'Cutscene',
  result: 'Result', continue: 'Continue', gameOver: 'GameOver', nameEntry: 'NameEntry',
  codex: 'Codex', stageSelect: 'StageSelect', ending: 'Ending',
} as const;

export const TEX = {
  projectile: 'projectile', hit: 'hit',
} as const;

export const playerTex = (member: MemberId): string => `player_${member}`;
export const enemyTex = (enemyId: string): string => `enemy_${enemyId}`;
export const npcTex = (npcId: string): string => `npc_${npcId}`;
export const mapKey = (mapId: string): string => `map_${mapId}`;
