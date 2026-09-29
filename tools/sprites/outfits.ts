// 의상 5벌: 팔레트(상의·하의·신발·포인트·재킷) + 실루엣(하의 3종·재킷·소매·크롭) + 몸통 장식 오버레이.
// 상의 색이 없으면 멤버 컬러(LOOKS.top/topShade)를 쓴다.
import type { Grid } from '../pixel-art';
import type { Outfit } from '../../src/core/spriteFrames';
import { BASE_PALETTE, fill, outlined, over, TORSO, TORSO_Y, type MemberLook } from './templates';
import { variantChar } from './shading';

export type BottomStyle = 'pants' | 'skirt' | 'shorts';

export interface OutfitSpec {
  T?: string; t?: string;
  B: string; b: string; O: string; A: string;
  J?: string; j?: string;
  skirt: BottomStyle;
  jacket: boolean;
  sleeves: 'long' | 'short';
  /** 크롭탑: 몸통 아래 5행이 피부. */
  crop?: boolean;
  /** 몸통 장식(그리드 좌표, 몸통 위에 얹는다). */
  decor: Grid;
}

/** 후드 목깃(25~27행, 목 아래 어깨 위). */
const HOOD: Grid = over(outlined(fill('T', [[25, 25, 9, 22], [26, 27, 8, 23]])), fill('t', [[27, 27, 9, 22]]));
/** 후드 끈 2줄 + 캥거루 주머니. */
const DRAWSTRINGS: Grid = fill('A', [[28, 32, 14, 14], [28, 32, 17, 17]]);
const POCKET: Grid = over(fill('t', [[37, 40, 12, 19]]), fill('K', [[37, 37, 12, 19]]));
/** 집업 지퍼 라인. */
const ZIPPER: Grid = over(fill('A', [[28, 40, 15, 16]]), fill('K', [[28, 28, 15, 16]]));
/** 데뷔 무대: 목선 포인트 밴드 + 허리 벨트. */
const DEBUT_TRIM: Grid = fill('A', [[27, 28, 10, 21], [41, 41, 10, 21]]);
/** 데님 재킷: 어깨·옆판(가운데는 크롭탑이 보인다), 라펠 K 선, 왼판 광택 1줄. */
const JACKET: Grid = over(outlined(fill('J', [[26, 41, 9, 12], [26, 41, 19, 22]])), fill('j', [[27, 41, 12, 12], [27, 41, 19, 19]]), fill(variantChar('J', 'light'), [[28, 37, 11, 11]]), fill('K', [[26, 26, 9, 22]]));
/** 프리티 걸: 목 리본(옐로) + 허리 리본. */
const PRETTY_RIBBON: Grid = over(fill('A', [[27, 28, 13, 14], [27, 28, 17, 18], [28, 28, 15, 16], [41, 41, 10, 21]]), fill('K', [[27, 27, 15, 16]]));

export const OUTFIT_PALETTES: Record<Outfit, OutfitSpec> = {
  // S1 연습복: 멤버색 후드 + 네이비 트레이닝 팬츠 + 흰 운동화
  training: { B: '#2c3150', b: '#22263f', O: '#e6e0ff', A: '#ffffff', skirt: 'pants', jacket: false, sleeves: 'long', decor: over(HOOD, DRAWSTRINGS, POCKET) },
  // S2 Re:Scene: 화이트 톱 + 블랙 스커트 + 보라 포인트 + 흰 부츠
  debut: { T: '#f6f2ff', t: '#d6cfe6', B: '#1d1b26', b: '#100f16', O: '#f6f2ff', A: '#8f5cf7', skirt: 'skirt', jacket: false, sleeves: 'short', decor: DEBUT_TRIM },
  // S3 LOVE ATTACK: 데님 재킷 오버레이 + 멤버색 크롭탑 + 데님 쇼츠
  road: { J: '#4f7ab8', j: '#3a5c8f', B: '#3d4f80', b: '#2f3d63', O: '#e6e0ff', A: '#ff6b6b', skirt: 'shorts', jacket: true, sleeves: 'long', crop: true, decor: JACKET },
  // S4 역주행: 멤버색 집업 후드 + 크림 와이드 팬츠 + 다크 스니커즈
  comeback: { B: '#efe6d2', b: '#cfc4ad', O: '#2c3150', A: '#ffffff', skirt: 'pants', jacket: false, sleeves: 'long', decor: over(HOOD, ZIPPER) },
  // S5 Pretty Girl: 크림 톱 + 파스텔 핑크 스커트 + 옐로 리본
  pretty: { T: '#fff6f0', t: '#e9d5cc', B: '#ffb3d1', b: '#e08fb3', O: '#fff6f0', A: '#ffe066', skirt: 'skirt', jacket: false, sleeves: 'short', decor: PRETTY_RIBBON },
};

/** 멤버·의상의 완성 팔레트. U/L 소매 역할을 의상(긴소매 T · 반소매 S · 재킷 J)으로 푼다. */
export function outfitPalette(look: MemberLook, outfit: Outfit): Record<string, string> {
  const o = OUTFIT_PALETTES[outfit];
  const T = o.T ?? look.top, t = o.t ?? look.topShade;
  const J = o.J ?? T, j = o.j ?? t;
  return {
    ...BASE_PALETTE,
    H: look.hairColor[0], h: look.hairColor[1], C: look.accent,
    T, t, B: o.B, b: o.b, O: o.O, A: o.A, J, j,
    U: o.jacket ? J : T,
    L: o.jacket ? J : o.sleeves === 'long' ? T : BASE_PALETTE.S!,
  };
}

/** 의상별 몸통(26~41행, 그리드 좌표 전체 높이). 크롭탑은 아래 5행이 피부. plain 이면 장식 없는 단색 상의(배경 NPC). */
export function torsoFor(outfit: Outfit, plain = false): Grid {
  const o = OUTFIT_PALETTES[outfit];
  let core = TORSO;
  if (o.crop && !plain) core = core.map((r, i) => (TORSO_Y + i >= 37 && TORSO_Y + i <= 41 ? r.replace(/[Tt]/g, 'S') : r));
  const placed = fill('.', []).map((r, y) => (y >= TORSO_Y && y < TORSO_Y + core.length ? core[y - TORSO_Y]! : r));
  return plain ? placed : over(placed, o.decor);
}
