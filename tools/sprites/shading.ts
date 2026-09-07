// 규칙 음영(캐릭터 입체감): 역할 격자에 빛(왼쪽 위)을 기준으로 형태 음영·접촉 그림자·정수리 광택·선택적 외곽선을 적용한다.
// 역할 문자를 톤 변형 문자(사용자 영역 U+E000~)로 바꾸고, shadePalette 가 그 문자에 램프 색을 매긴다. 순수 함수.
import type { Grid, Palette } from '../pixel-art';
import { ramp, type Tone } from './ramps';

export interface ShadeOptions {
  /** 음영을 받는 재질 역할. */
  materials: string[];
  /** 같은 덩어리로 보는 역할 묶음. 묶음 경계에서 림과 접촉 그림자가 생긴다. */
  groups: string[][];
  /** 림·접촉 그림자 띠 폭(px). 스프라이트 1, 초상화 2. */
  band: number;
  /** 내부 검정선을 아래 재질의 어둠색으로 바꾼다(실루엣 바깥선은 유지). */
  selectiveOutline: boolean;
  /** 눈·입·장식 등: 런을 끊지 않고 색도 바뀌지 않는 역할. 이 옆의 외곽선은 그림자를 드리우지 않는다. */
  features: string[];
  /** 형태 음영 없이 1px 림만 주는 재질(피부). */
  rimOnly?: string[];
  /** 정수리 광택 띠를 얹는 머리 역할. */
  sheen?: string[];
  /** 가로 런의 오른쪽 그늘 비율(기본 0.25). */
  sideShade?: number;
  /** 세로 런의 아래 그늘 비율(기본 0.2). */
  bottomShade?: number;
  /** 외곽선 역할(기본 'K'). */
  outline?: string;
}

const TONES: Tone[] = ['light', 'shade', 'dark'];
const PUA = 0xe000;

/** 역할의 톤 변형 문자(결정적: 같은 역할·톤이면 항상 같은 문자). */
export const variantChar = (role: string, tone: Tone): string => String.fromCharCode(PUA + (role.charCodeAt(0) & 0xff) * 4 + TONES.indexOf(tone) + 1);

/** 팔레트에 재질별 톤 변형 색을 더한다. 기본색이 없는 재질은 건너뛴다. */
export function shadePalette(palette: Palette, materials: string[]): Palette {
  const out: Palette = { ...palette };
  for (const role of materials) {
    const base = palette[role];
    if (!base) continue;
    const r = ramp(base);
    for (const tone of TONES) out[variantChar(role, tone)] = r[tone];
  }
  return out;
}

export function shadeGrid(grid: Grid, o: ShadeOptions): Grid {
  const H = grid.length, W = grid[0]?.length ?? 0;
  const K = o.outline ?? 'K';
  const side = o.sideShade ?? 0.25, bottom = o.bottomShade ?? 0.2;
  const at = (x: number, y: number): string => grid[y]?.[x] ?? '.';
  const groupOf = new Map<string, number>();
  o.groups.forEach((g, i) => g.forEach((r) => groupOf.set(r, i)));
  const mats = new Set(o.materials), feats = new Set(o.features), rimOnly = new Set(o.rimOnly ?? []);
  const isMat = (ch: string): boolean => mats.has(ch);
  const isFeat = (ch: string): boolean => feats.has(ch);
  const res = grid.map((r) => [...r]);
  const tone = (x: number, y: number, t: Tone): void => { const ch = at(x, y); if (isMat(ch)) res[y]![x] = variantChar(ch, t); };
  const inRun = (x: number, y: number, g: number): boolean => { const ch = at(x, y); return (isMat(ch) && groupOf.get(ch) === g) || isFeat(ch); };
  const N4: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const internalK = (x: number, y: number): boolean => at(x, y) === K && N4.every(([dx, dy]) => at(x + dx, y + dy) !== '.');
  /** 눈·입 테두리는 그림자를 드리우지 않는다. */
  const occluderK = (x: number, y: number): boolean => internalK(x, y) && !N4.some(([dx, dy]) => isFeat(at(x + dx, y + dy)));

  // (a) 가로 런: 오른쪽 side 비율 그늘, 왼쪽 band 밝음. 피부는 오른쪽 1px 만.
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const ch = at(x, y);
      if (!isMat(ch)) { x++; continue; }
      const g = groupOf.get(ch)!;
      let x1 = x;
      while (x1 + 1 < W && inRun(x1 + 1, y, g)) x1++;
      const n = x1 - x + 1;
      if (n >= 3) {
        const shadeN = rimOnly.has(ch) ? 1 : Math.ceil(n * side);
        for (let k = 0; k < shadeN; k++) tone(x1 - k, y, 'shade');
        for (let k = 0; k < o.band && k < n - shadeN; k++) tone(x + k, y, 'light');
      }
      x = x1 + 1;
    }
  }
  // (b) 세로 런: 아래 bottom 비율 그늘. 피부는 아래 band 만.
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      const ch = at(x, y);
      if (!isMat(ch)) { y++; continue; }
      const g = groupOf.get(ch)!;
      let y1 = y;
      while (y1 + 1 < H && inRun(x, y1 + 1, g)) y1++;
      const n = y1 - y + 1;
      if (n >= 3) {
        const shadeN = rimOnly.has(ch) ? Math.min(o.band, n - 1) : Math.ceil(n * bottom);
        for (let k = 0; k < shadeN; k++) tone(x, y1 - k, 'shade');
      }
      y = y1 + 1;
    }
  }
  // (c) 접촉 그림자: 위 band 안에 다른 덩어리나 내부 외곽선이 있으면 그늘, 이미 그늘이면 어둠.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y);
    if (!isMat(ch)) continue;
    const g = groupOf.get(ch)!;
    for (let k = 1; k <= o.band; k++) {
      const above = at(x, y - k);
      const occluded = (isMat(above) && groupOf.get(above) !== g) || occluderK(x, y - k);
      if (occluded) { res[y]![x] = res[y]![x] === variantChar(ch, 'shade') ? variantChar(ch, 'dark') : variantChar(ch, 'shade'); break; }
      if (above !== ch && !isFeat(above)) break;
    }
  }
  // (d) 정수리 광택: 머리 덩어리 높이의 15~32% 행에서 각 런의 왼쪽 65% 를 밝음으로(양 끝 1px 제외).
  for (const role of o.sheen ?? []) {
    let top = H, bot = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === role) { top = Math.min(top, y); bot = Math.max(bot, y); }
    if (bot < 0) continue;
    const hh = bot - top + 1, y0 = top + Math.round(hh * 0.15), y1 = Math.max(y0, top + Math.round(hh * 0.32) - 1);
    for (let y = y0; y <= y1; y++) {
      let x = 0;
      while (x < W) {
        if (at(x, y) !== role) { x++; continue; }
        let x1 = x;
        while (x1 + 1 < W && at(x1 + 1, y) === role) x1++;
        const n = x1 - x + 1;
        for (let k = 1; k < Math.max(2, Math.floor(n * 0.65)) && k < n - 1; k++) res[y]![x + k] = variantChar(role, 'light');
        x = x1 + 1;
      }
    }
  }
  // (e) 선택적 외곽선: 내부 K 를 아래(없으면 위·좌·우) 재질의 어둠색으로. 눈·입 옆은 유지.
  if (o.selectiveOutline) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!internalK(x, y)) continue;
      const nb = [at(x, y + 1), at(x, y - 1), at(x - 1, y), at(x + 1, y)];
      if (nb.some(isFeat)) continue;
      const mat = nb.find(isMat);
      if (mat) res[y]![x] = variantChar(mat, 'dark');
    }
  }
  return res.map((r) => r.join(''));
}

// ---------- 프리셋 ----------
/** 스프라이트(32×64) 재질. L(소매)은 팔레트가 피부색이면 피부 덩어리, 아니면 상의 덩어리. */
export const SPRITE_MATERIALS = ['H', 'h', 'S', 'T', 't', 'U', 'L', 'B', 'b', 'O', 'J', 'j'];
export const SPRITE_FEATURES = ['E', 'W', 'm', 'p', 's', 'A', 'C', 'G', 'M', 'P', 'N', 'R', 'Y'];
export function spriteShadeOptions(palette: Palette, selectiveOutline = true): ShadeOptions {
  const sleeveIsSkin = palette.L !== undefined && palette.L === palette.S;
  return {
    materials: SPRITE_MATERIALS,
    groups: [['H'], ['h'], ['S', ...(sleeveIsSkin ? ['L'] : [])], ['T', 't', 'U', ...(sleeveIsSkin ? [] : ['L'])], ['B', 'b'], ['O'], ['J', 'j']],
    band: 1,
    selectiveOutline,
    features: SPRITE_FEATURES,
    rimOnly: ['S', ...(sleeveIsSkin ? ['L'] : [])],
    sheen: ['H'],
  };
}

/** 초상화(64×64): 띠 2px, 앞머리 광택, 피부는 림만. */
export const PORTRAIT_SHADE_OPTIONS: ShadeOptions = {
  materials: ['S', 'H', 'N', 'T', 't'],
  groups: [['S'], ['H'], ['N'], ['T', 't']],
  band: 2,
  selectiveOutline: true,
  features: ['I', 'i', 'W', 'D', 'R', 'G', 'O', 'p', 's', 'L'],
  rimOnly: ['S'],
  sheen: ['H'],
};
