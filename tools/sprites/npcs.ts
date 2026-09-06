// 멤버가 아닌 NPC 외형: 멤버와 같은 32×64 템플릿에 머리·의상 팔레트·오버레이(그리드 좌표)만 바꾼다.
import type { Grid } from '../pixel-art';
import { fill, outlined, over, type Accessory, type HairStyle } from './templates';

/** 안경: 눈(12~14행) 둘레 사각 테 + 콧대(13행). */
const GLASSES: Grid = fill('K', [[11, 11, 8, 13], [15, 15, 8, 13], [11, 15, 8, 8], [11, 15, 13, 13], [11, 11, 18, 23], [15, 15, 18, 23], [11, 15, 18, 18], [11, 15, 23, 23], [13, 13, 14, 17]]);
/** 야구모자(0~8행, 챙은 오른쪽 = 정면). */
const CAP: Grid = over(
  outlined(fill('C', [[1, 1, 10, 21], [2, 2, 9, 22], [3, 3, 8, 23], [4, 5, 7, 24], [6, 8, 6, 25], [8, 9, 20, 30]])),
  fill('K', [[9, 9, 6, 19]]),
);
/** 목걸이 사원증(27~36행). */
const LANYARD: Grid = over(
  fill('Y', [[27, 30, 13, 13], [27, 30, 18, 18], [31, 32, 14, 14], [31, 32, 17, 17]]),
  outlined(fill('W', [[33, 36, 14, 17]])),
);
/** 이름표(30~31행 가슴 오른쪽). */
const NAME_TAG: Grid = outlined(fill('W', [[30, 31, 18, 20]]));

export interface NpcLook {
  hair: HairStyle;
  hairColor: [string, string];
  top: string;
  topShade: string;
  bottom?: string;
  accessory?: Accessory;
  overlays: Grid[];
  extra?: Record<string, string>;
}

export const NPC_LOOKS: Record<string, NpcLook> = {
  npc_audition_judge: { hair: 'short', hairColor: ['#3a3a4a', '#4b4b5e'], top: '#2d2f45', topShade: '#22243a', bottom: '#2d2f45', overlays: [GLASSES], extra: { A: '#c0caf5' } },
  npc_dance_teacher:  { hair: 'short', hairColor: ['#2b2330', '#3d3345'], top: '#9ece6a', topShade: '#73a34a', overlays: [CAP], extra: { C: '#2d2f45' } },
  npc_manager:        { hair: 'bob',   hairColor: ['#4a3327', '#5d4436'], top: '#7dcfff', topShade: '#4fa3d6', overlays: [LANYARD], extra: { Y: '#f7768e' } },
  npc_clerk:          { hair: 'bob',   hairColor: ['#2b2330', '#3d3345'], top: '#e0af68', topShade: '#b98a48', overlays: [NAME_TAG] },
};
