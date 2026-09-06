import type { MemberId } from '../systems/types';

/** 멤버 스프라이트시트 프레임 규격. 빌드 도구(tools/build-sprites)와 Phaser 로더가 공유한다. */
export const PLAYER_FRAME = { width: 32, height: 48 } as const;

export const PLAYER_ANIMS = {
  idle:   { frames: [0, 1], frameRate: 2, repeat: -1 },
  walk:   { frames: [2, 3, 4, 5], frameRate: 8, repeat: -1 },
  jump:   { frames: [6], frameRate: 1, repeat: 0 },
  attack: { frames: [7, 8], frameRate: 10, repeat: 0 },
  hurt:   { frames: [9], frameRate: 1, repeat: 0 },
} as const;

export type PlayerAnim = keyof typeof PLAYER_ANIMS;
export const PLAYER_FRAME_COUNT = 10;

export const playerAnimKey = (member: MemberId, anim: PlayerAnim): string => `player_${member}_${anim}`;
export const playerSheetUrl = (member: MemberId): string => `assets/sprites/player_${member}.png`;
