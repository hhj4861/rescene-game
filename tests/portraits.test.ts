import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { EYE_REGION, PORTRAITS, UNDER_EYE, buildPortraitSheet, portraitSheetFile } from '../tools/sprites/portraits';
import { ramp } from '../tools/sprites/ramps';
import { BASE_PALETTE } from '../tools/sprites/templates';
import { MEMBERS } from '../src/data/members';
import { PORTRAIT_FRAME, PORTRAIT_FRAME_COUNT } from '../src/core/spriteFrames';

type Sheet = { width: number; height: number; rgba: Uint8Array };

const frameBytes = (sheet: Sheet, i: number): string => {
  const out: number[] = [];
  for (let y = 0; y < sheet.height; y++) {
    out.push(...sheet.rgba.slice((y * sheet.width + i * PORTRAIT_FRAME.width) * 4, (y * sheet.width + (i + 1) * PORTRAIT_FRAME.width) * 4));
  }
  return out.join(',');
};
/** 프레임 좌표의 픽셀 색(#rrggbb). 투명은 빈 문자열. */
const pixelHex = (sheet: Sheet, frame: number, x: number, y: number): string => {
  const i = (y * sheet.width + frame * PORTRAIT_FRAME.width + x) * 4;
  if (sheet.rgba[i + 3] === 0) return '';
  return '#' + [0, 1, 2].map((k) => sheet.rgba[i + k]!.toString(16).padStart(2, '0')).join('');
};
const SKIN = ramp(BASE_PALETTE.S!);

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
  it('frame 0 shows the shading: hair sheen (ramp light) and a forehead contact shadow (skin ramp shade)', () => {
    for (const m of MEMBERS) {
      const sheet = buildPortraitSheet(m.id);
      const sheen = ramp(PORTRAITS[m.id].hairColor[0]).light;
      let sheenPx = 0, foreheadShade = 0;
      for (let y = 0; y < sheet.height; y++) {
        for (let x = 0; x < PORTRAIT_FRAME.width; x++) {
          const hex = pixelHex(sheet, 0, x, y);
          if (hex === sheen) sheenPx++;
          // 눈 위(이마)의 피부 그늘은 앞머리 밑 접촉 그림자에서만 나온다 — 코·귀·목 그늘은 눈보다 아래다.
          if (hex === SKIN.shade && y < EYE_REGION.y) foreheadShade++;
        }
      }
      expect(sheenPx, `${m.id} hair sheen`).toBeGreaterThanOrEqual(8);
      expect(foreheadShade, `${m.id} forehead contact shadow`).toBeGreaterThanOrEqual(8);
    }
  });
  it('the row right below the eyes stays base skin in every frame (no dark circles)', () => {
    for (const m of MEMBERS) {
      const sheet = buildPortraitSheet(m.id);
      for (let f = 0; f < PORTRAIT_FRAME_COUNT; f++) {
        for (let x = UNDER_EYE.x0; x <= UNDER_EYE.x1; x++) {
          const hex = pixelHex(sheet, f, x, UNDER_EYE.y);
          expect([SKIN.shade, SKIN.dark], `${m.id} frame ${f} x=${x}`).not.toContain(hex);
        }
      }
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
