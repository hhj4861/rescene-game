// 멤버 초상화 64×64 × 3프레임(0 기본 · 1 시그니처 · 2 피격) 시트. 부품은 portraitParts.ts, 색은 templates.ts의 LOOKS·BASE_PALETTE.
import { PORTRAIT_FRAME, PORTRAIT_FRAME_COUNT } from '../../src/core/spriteFrames';
import type { MemberId } from '../../src/systems/types';
import { composeLayers, encodePng, packSheet, rasterize, type Grid } from '../pixel-art';
import { ACCESSORY, BLUSH, BROWS, EYE_LEFT, EYE_RIGHT, EYES, FACE, HAIR_BACK, HAIR_FRONT, HANDS, MOUTH, PH, PORTRAIT_DETAIL_ROLES, PW, SWEAT, isLighter, type Accessory, type BrowVariant, type EyeVariant, type FaceVariant, type HairStyle, type HandVariant, type MouthVariant } from './portraitParts';
import { ramp } from './ramps';
import { PORTRAIT_SHADE_OPTIONS, shadeGrid, shadePalette, type ShadeOptions } from './shading';
import { BASE_PALETTE, LOOKS } from './templates';

export type Signature = 'ui' | 'thumb' | 'peace' | 'grip' | 'pout';

export interface PortraitSpec {
  hair: HairStyle;
  hairColor: [string, string];
  /** 포인트색(어깨 상의) — 스프라이트 상의색과 같다. */
  accent: string;
  accessory: Accessory;
  signature: Signature;
}

const look = (m: MemberId): { hair: HairStyle; hairColor: [string, string]; accent: string } => {
  const l = LOOKS[m];
  if (!l) throw new Error(`no look for member ${m}`);
  return { hair: l.hair as HairStyle, hairColor: l.hairColor, accent: l.top };
};

/** 멤버별 초상화 외형. 얼굴을 닮게 그리지 않고 머리 모양·액세서리·시그니처 표정으로 구분한다(부록 §1). */
export const PORTRAITS: Record<MemberId, PortraitSpec> = {
  woni: { ...look('woni'), accessory: 'earring', signature: 'ui' },
  liv: { ...look('liv'), accessory: 'choker', signature: 'thumb' },
  minami: { ...look('minami'), accessory: 'galHighlight', signature: 'peace' },
  may: { ...look('may'), accessory: 'hairclip', signature: 'grip' },
  zena: { ...look('zena'), accessory: 'ribbon', signature: 'pout' },
};

export interface Expression {
  eyes: EyeVariant;
  brows: BrowVariant;
  mouth: MouthVariant;
  face: FaceVariant;
  hands: HandVariant;
  sweat: boolean;
}
const expr = (e: Partial<Expression>): Expression => ({ eyes: 'open', brows: 'normal', mouth: 'smile', face: 'normal', hands: 'none', sweat: false, ...e });

/** 프레임 0 기본 표정. */
export const BASE_EXPRESSION: Expression = expr({});
/** 프레임 1 시그니처: 원이 우이! · 리브 왕따봉 · 미나미 갸루 피스 · 메이 그립감 · 제나 아뉘. */
export const SIGNATURE_EXPRESSION: Record<Signature, Expression> = {
  ui: expr({ eyes: 'closed', mouth: 'open', hands: 'up' }),
  thumb: expr({ eyes: 'wink', mouth: 'smile', hands: 'thumb' }),
  peace: expr({ eyes: 'open', mouth: 'tongue', hands: 'peace' }),
  grip: expr({ eyes: 'sparkle', mouth: 'smile', hands: 'clasp' }),
  pout: expr({ eyes: 'flat', brows: 'down', mouth: 'puff', face: 'puff' }),
};
/** 프레임 2 피격: 눈 ><, 입 물결, 땀방울. */
export const HURT_EXPRESSION: Expression = expr({ eyes: 'squint', brows: 'worried', mouth: 'wave', sweat: true });

/** 테스트용: 두 눈을 모두 담는 영역(프레임 좌표). */
export const EYE_REGION = { x: EYE_LEFT.x - 1, y: EYE_LEFT.y - 1, w: EYE_RIGHT.x + 9 - EYE_LEFT.x, h: 11 } as const;
/** 테스트용: 눈 상자 바로 아래 행과 두 눈이 걸치는 가로 범위(다크서클 검사). */
export const UNDER_EYE = { y: EYE_LEFT.y + 9, x0: EYE_LEFT.x, x1: EYE_RIGHT.x + 8 } as const;

export const PORTRAITS_DIR = 'public/assets/portraits';
export const portraitSheetFile = (member: MemberId): string => `${PORTRAITS_DIR}/portrait_${member}.png`;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number): string => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/** t만큼 흰색(t>0) 또는 검정(t<0) 쪽으로 섞는다. */
const mix = (hex: string, t: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const to = t > 0 ? 255 : 0;
  const a = Math.abs(t);
  return rgbToHex(r + (to - r) * a, g + (to - g) * a, b + (to - b) * a);
};

/** 머리색에서 눈동자·동공·뒷머리·윤기 색을 끌어낸 멤버 팔레트. 디테일 역할(F·f·j·q·u·v·r)은 램프에서 뽑는다. */
export function portraitPalette(member: MemberId): Record<string, string> {
  const spec = PORTRAITS[member];
  const [main, sub] = spec.hairColor;
  const shine = isLighter(sub, main);                 // 두 번째 톤이 밝으면 윤기, 어두우면 뒷머리 그늘
  const dark = shine ? main : sub;                    // 머리색 어두운 톤
  const iris = isLighter(dark, '#333333') ? dark : mix(dark, 0.28);
  const hair = ramp(main);
  const top = ramp(spec.accent);
  return {
    ...BASE_PALETTE,
    H: main,
    N: shine ? main : sub,
    L: hair.light,                                    // 정수리 광택
    F: hair.dark,                                     // 머리 안쪽선(실루엣만 검정)
    f: hair.shade,                                    // 머리결
    T: spec.accent,
    t: top.shade,
    u: top.dark,                                      // 어깨 주름
    I: iris,
    i: mix(iris, -0.45),
    j: mix(iris, 0.34),                               // 눈동자 아래 밝은 단
    s: ramp(BASE_PALETTE.S!).shade,                   // 피부 그늘(코·귀·목)
    p: '#f0919f',
    q: '#ffc2d1',                                     // 볼터치 안쪽
    v: '#ffe1cf',                                     // 입술 광택
    r: '#ff9db3',                                     // 혀 광택
    D: '#7a2b3d',
    G: '#f5c542',
  };
}

/** 표정 하나를 64×64 역할 그리드로 합성한다. */
export function composePortrait(member: MemberId, e: Expression): Grid {
  const spec = PORTRAITS[member];
  const layers: Grid[] = [
    HAIR_BACK[spec.hair],
    FACE[e.face],
    EYES[e.eyes],
    BROWS[e.brows],
    MOUTH[e.mouth],
    BLUSH,
    HAIR_FRONT[spec.hair],
    ACCESSORY[spec.accessory],
    HANDS[e.hands],
  ];
  if (e.sweat) layers.push(SWEAT);
  return composeLayers(layers, PW, PH);
}

/** 초상화 음영 옵션(라이브러리 프리셋 기반).
 *  - 디테일 역할을 features 로 넘겨 음영 규칙이 색을 덮거나 런을 끊지 않게 한다.
 *  - selectiveOutline 은 끈다: 64×64 에서는 눈·눈썹·입 테두리까지 아래쪽 재질(=피부) 어둠색으로 바뀌어 얼굴이 뭉개진다.
 *    "실루엣만 검정, 내부선은 재질 어둠색"은 머리 부품이 직접(F) 그린다.
 *  - sheen 도 끈다: 머리 덩어리 bbox 가 옆머리 끝(63행)까지라 광택 띠가 정수리가 아니라 앞머리 아래에 깔린다.
 *    정수리 광택은 스타일별 SHEEN 마스크(L)가 낸다. */
export const PORTRAIT_SHADING: ShadeOptions = {
  ...PORTRAIT_SHADE_OPTIONS,
  selectiveOutline: false,
  sheen: [],
  // 피부는 밝음 띠를 뺀다: 턱에서 목으로 이어지는 좁은 런에 밝음이 앉아 세로 줄무늬로 읽힌다(그늘·접촉 그림자는 유지).
  noLight: ['S'],
  features: [...PORTRAIT_SHADE_OPTIONS.features, ...PORTRAIT_DETAIL_ROLES],
};

/** 표정 3장(기본·시그니처·피격)을 합성하고 음영을 입힌 역할 그리드. */
export function portraitFrames(member: MemberId): Grid[] {
  const spec = PORTRAITS[member];
  return [BASE_EXPRESSION, SIGNATURE_EXPRESSION[spec.signature], HURT_EXPRESSION].map((e) => shadeGrid(composePortrait(member, e), PORTRAIT_SHADING));
}

export interface PortraitSheet { width: number; height: number; rgba: Uint8Array; png: Uint8Array }

export function buildPortraitSheet(member: MemberId): PortraitSheet {
  const palette = shadePalette(portraitPalette(member), PORTRAIT_SHADING.materials);
  const frames = portraitFrames(member).map((g) => rasterize(g, palette, PW, PH));
  if (frames.length !== PORTRAIT_FRAME_COUNT) throw new Error(`portrait ${member}: ${frames.length} frames != ${PORTRAIT_FRAME_COUNT}`);
  const sheet = packSheet(frames, PORTRAIT_FRAME.width, PORTRAIT_FRAME.height);
  return { ...sheet, png: encodePng(sheet.width, sheet.height, sheet.rgba) };
}
