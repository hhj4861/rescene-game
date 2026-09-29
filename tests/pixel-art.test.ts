import { describe, it, expect } from 'vitest';
import { inflateSync } from 'node:zlib';
import { composeLayers, rasterize, encodePng, packSheet } from '../tools/pixel-art';

describe('composeLayers', () => {
  it('later layers overwrite earlier ones except transparent cells', () => {
    const base = ['SS', 'SS'];
    const hair = ['H.', '..'];
    expect(composeLayers([base, hair], 2, 2)).toEqual(['HS', 'SS']);
  });
  it('rejects a row whose width does not match', () => {
    expect(() => composeLayers([['SSS']], 2, 1)).toThrow(/width/);
  });
});

describe('rasterize', () => {
  it('maps role letters to RGBA and leaves unknown roles and dots transparent', () => {
    const px = rasterize(['S.', 'X.'], { S: '#ff0080' }, 2, 2);
    expect([...px.slice(0, 4)]).toEqual([255, 0, 128, 255]);
    expect(px[7]).toBe(0);
    expect(px[11]).toBe(0);
  });
});

describe('encodePng', () => {
  it('writes a PNG whose IDAT inflates back to the unfiltered scanlines', () => {
    const w = 3, h = 2;
    const rgba = new Uint8Array(w * h * 4).map((_, i) => (i * 37) % 256);
    const png = encodePng(w, h, rgba);
    expect([...png.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(dv.getUint32(16)).toBe(w);
    expect(dv.getUint32(20)).toBe(h);
    expect(png[24]).toBe(8);   // bit depth
    expect(png[25]).toBe(6);   // RGBA
    // IDAT 찾기
    let off = 8, idat: Uint8Array | null = null;
    while (off < png.length) {
      const len = dv.getUint32(off);
      const type = String.fromCharCode(...png.slice(off + 4, off + 8));
      if (type === 'IDAT') idat = png.slice(off + 8, off + 8 + len);
      off += 12 + len;
    }
    expect(idat).not.toBeNull();
    const raw = inflateSync(idat!);
    expect(raw.length).toBe((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) {
      expect(raw[y * (w * 4 + 1)]).toBe(0);
      expect([...raw.slice(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1))]).toEqual([...rgba.slice(y * w * 4, (y + 1) * w * 4)]);
    }
  });
});

describe('packSheet', () => {
  it('lays equal-size frames left to right', () => {
    const a = new Uint8Array(4).fill(1), b = new Uint8Array(4).fill(2);
    const sheet = packSheet([a, b], 1, 1);
    expect(sheet.width).toBe(2);
    expect(sheet.height).toBe(1);
    expect([...sheet.rgba]).toEqual([1, 1, 1, 1, 2, 2, 2, 2]);
  });
});
