import type { MemberId } from '../systems/types';

/** 하트 음식(멤버 시그니처 음식) 16×16 텍스처 키. */
export const heartTex = (member: MemberId): string => `heart_${member}`;

export const TEX2 = {
  card: 'item_card',
  hudHeartFull: 'hud_heart_full',
  hudHeartEmpty: 'hud_heart_empty',
  go: 'hud_go',
  chest: 'item_chest',
  jumppad: 'obj_jumppad',
} as const;

/** 멤버 시트 0프레임의 머리를 잘라낸 16×16 초상 텍스처 키. */
export const lifeTex = (member: MemberId): string => `life_${member}`;

/** 팔레트별 스테이지 타일셋 텍스처 키. */
export const tilesetTex = (palette: string): string => `tiles_${palette}`;
