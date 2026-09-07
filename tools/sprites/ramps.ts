// 색 램프: 재질 기본색 하나에서 밝음·기본·그늘·어둠 4단을 만든다. 그늘은 차갑게(250°), 밝음은 따뜻하게(50°) 색상을 살짝 튼다(hue shift).
// 순수 함수 — 스프라이트·초상화 음영(shading.ts)이 쓴다.

export interface Ramp { light: string; base: string; shade: string; dark: string }
export type Tone = Exclude<keyof Ramp, 'base'>;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`bad color ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** #rrggbb → [h(0~360), s(0~1), l(0~1)]. */
export function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function fromHsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s = clamp01(s); l = clamp01(l);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** 상대 밝기(0~1). 램프 순서 검증용. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** h 를 target 쪽으로 amount 도만큼(짧은 호를 따라) 옮긴다. */
export function shiftHue(h: number, target: number, amount: number): number {
  const d = ((target - h + 540) % 360) - 180;
  if (Math.abs(d) <= amount) return target;
  return h + Math.sign(d) * amount;
}

const WARM = 50, COOL = 250;
const GREY = 0.08;

/** 기본색에서 4단 램프. 무채색(채도 < 0.08)은 색상을 틀지 않는다. */
export function ramp(hex: string): Ramp {
  const [h, s, l] = toHsl(hex);
  const grey = s < GREY;
  return {
    light: fromHsl(grey ? h : shiftHue(h, WARM, 6), grey ? s : Math.max(0, s - 0.08), l + 0.12),
    base: hex.toLowerCase(),
    shade: fromHsl(grey ? h : shiftHue(h, COOL, 4), grey ? s : Math.max(0, s - 0.02), l - 0.09),
    dark: fromHsl(grey ? h : shiftHue(h, COOL, 10), grey ? s : Math.min(1, s + 0.02), l - 0.18),
  };
}
