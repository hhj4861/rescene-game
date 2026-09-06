// 순수 픽셀 유틸: ASCII 역할 그리드 → RGBA → PNG. Phaser 의존 없음.
import { deflateSync } from 'node:zlib';

export type Grid = string[];
export type Palette = Record<string, string | undefined>;

/** 여러 레이어를 합친다. '.'는 투명이며 뒤 레이어가 앞을 덮는다. 폭이 맞지 않으면 던진다. */
export function composeLayers(layers: Grid[], width: number, height: number): Grid {
  const out: string[][] = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  layers.forEach((layer, li) => {
    layer.forEach((row, y) => {
      if (row.length !== width) throw new Error(`layer ${li} row ${y}: width ${row.length} != ${width}`);
      if (y >= height) return;
      for (let x = 0; x < width; x++) {
        const ch = row[x]!;
        if (ch !== '.') out[y]![x] = ch;
      }
    });
  });
  return out.map((r) => r.join(''));
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`bad color ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 역할 문자를 팔레트 색으로 칠한 RGBA 버퍼. 팔레트에 없는 문자와 '.'는 투명. */
export function rasterize(grid: Grid, palette: Palette, width: number, height: number): Uint8Array {
  const px = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = grid[y] ?? '';
    for (let x = 0; x < width; x++) {
      const color = palette[row[x] ?? '.'];
      if (!color) continue;
      const [r, g, b] = hexToRgb(color);
      const i = (y * width + x) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  return px;
}

/** 같은 크기의 프레임을 가로로 이어 붙인 시트. */
export function packSheet(frames: Uint8Array[], frameW: number, frameH: number): { width: number; height: number; rgba: Uint8Array } {
  const width = frameW * frames.length;
  const rgba = new Uint8Array(width * frameH * 4);
  frames.forEach((f, i) => {
    if (f.length !== frameW * frameH * 4) throw new Error(`frame ${i} has ${f.length} bytes, expected ${frameW * frameH * 4}`);
    for (let y = 0; y < frameH; y++) rgba.set(f.subarray(y * frameW * 4, (y + 1) * frameW * 4), (y * width + i * frameW) * 4);
  });
  return { width, height: frameH, rgba };
}

/** 프레임 안의 (dx, dy) 위치에 작은 RGBA 이미지를 그린다(불투명 픽셀만). 프레임 밖은 잘린다. */
export function blit(dst: Uint8Array, dstW: number, dstH: number, src: Uint8Array, srcW: number, srcH: number, dx: number, dy: number): void {
  for (let y = 0; y < srcH; y++) {
    const ty = y + dy;
    if (ty < 0 || ty >= dstH) continue;
    for (let x = 0; x < srcW; x++) {
      const tx = x + dx;
      if (tx < 0 || tx >= dstW) continue;
      const si = (y * srcW + x) * 4;
      if (src[si + 3] === 0) continue;
      dst.set(src.subarray(si, si + 4), (ty * dstW + tx) * 4);
    }
  }
}

// ---------- PNG ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** 8비트 RGBA, 필터 없음(0)의 최소 PNG 인코더. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  if (rgba.length !== width * height * 4) throw new Error(`rgba has ${rgba.length} bytes, expected ${width * height * 4}`);
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(raw, { level: 9 }))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}
