import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { EYE_REGION, PORTRAITS, buildPortraitSheet, portraitSheetFile } from '../tools/sprites/portraits';
import { MEMBERS } from '../src/data/members';
import { PORTRAIT_FRAME, PORTRAIT_FRAME_COUNT } from '../src/core/spriteFrames';

const frameBytes = (sheet: { width: number; height: number; rgba: Uint8Array }, i: number): string => {
  const out: number[] = [];
  for (let y = 0; y < sheet.height; y++) {
    out.push(...sheet.rgba.slice((y * sheet.width + i * PORTRAIT_FRAME.width) * 4, (y * sheet.width + (i + 1) * PORTRAIT_FRAME.width) * 4));
  }
  return out.join(',');
};

describe('member portrait sheets', () => {
  it('every member has a portrait spec', () => {
    for (const m of MEMBERS) expect(PORTRAITS[m.id], m.id).toBeDefined();
  });
  it('builds a 192x64 sheet (3 frames of 64x64) for all five members', () => {
    for (const m of MEMBERS) {
      const sheet = buildPortraitSheet(m.id);
      expect(sheet.width, m.id).toBe(PORTRAIT_FRAME.width * PORTRAIT_FRAME_COUNT);
      expect(sheet.height, m.id).toBe(PORTRAIT_FRAME.height);
      expect(sheet.rgba.length, m.id).toBe(sheet.width * sheet.height * 4);
    }
  });
  it('the three frames (base, signature, hurt) differ from each other', () => {
    for (const m of MEMBERS) {
      const sheet = buildPortraitSheet(m.id);
      const [base, sig, hurt] = [0, 1, 2].map((i) => frameBytes(sheet, i));
      expect(base, `${m.id} base vs signature`).not.toBe(sig);
      expect(base, `${m.id} base vs hurt`).not.toBe(hurt);
      expect(sig, `${m.id} signature vs hurt`).not.toBe(hurt);
    }
  });
  it('members are distinguishable from each other in the base frame', () => {
    const bases = MEMBERS.map((m) => frameBytes(buildPortraitSheet(m.id), 0));
    expect(new Set(bases).size).toBe(MEMBERS.length);
  });
  it('frame 0 has white highlight pixels inside the eye region', () => {
    for (const m of MEMBERS) {
      const sheet = buildPortraitSheet(m.id);
      let white = 0;
      for (let y = EYE_REGION.y; y < EYE_REGION.y + EYE_REGION.h; y++) {
        for (let x = EYE_REGION.x; x < EYE_REGION.x + EYE_REGION.w; x++) {
          const i = (y * sheet.width + x) * 4;
          if (sheet.rgba[i] === 255 && sheet.rgba[i + 1] === 255 && sheet.rgba[i + 2] === 255 && sheet.rgba[i + 3] === 255) white++;
        }
      }
      expect(white, `${m.id} eye highlights`).toBeGreaterThanOrEqual(4);
    }
  });
  it('generated png files match the sources (run npm run portraits)', () => {
    for (const m of MEMBERS) {
      const file = portraitSheetFile(m.id);
      expect(existsSync(file), file).toBe(true);
      expect(Buffer.compare(readFileSync(file), Buffer.from(buildPortraitSheet(m.id).png)), m.id).toBe(0);
    }
  });
});
