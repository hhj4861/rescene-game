import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { buildPlayerSheet, playerSheetFile } from '../tools/build-sprites-lib';
import { MEMBERS } from '../src/data/members';
import { OUTFITS, PLAYER_ANIMS, PLAYER_BODY, PLAYER_FRAME, PLAYER_FRAME_COUNT } from '../src/core/spriteFrames';
import { LOOKS } from '../tools/sprites/templates';

type Sheet = { width: number; height: number; rgba: Uint8Array };
const frameOf = (sheet: Sheet, i: number): string => {
  const out: number[] = [];
  for (let y = 0; y < sheet.height; y++) out.push(...sheet.rgba.slice((y * sheet.width + i * PLAYER_FRAME.width) * 4, (y * sheet.width + (i + 1) * PLAYER_FRAME.width) * 4));
  return out.join(',');
};
const hex = (s: string): [number, number, number] => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
/** 프레임 i 안에 색 color 픽셀이 몇 개 있는지. */
const countColor = (sheet: Sheet, i: number, color: string): number => {
  const [r, g, b] = hex(color);
  let n = 0;
  for (let y = 0; y < sheet.height; y++) for (let x = i * PLAYER_FRAME.width; x < (i + 1) * PLAYER_FRAME.width; x++) {
    const o = (y * sheet.width + x) * 4;
    if (sheet.rgba[o + 3]! > 0 && sheet.rgba[o] === r && sheet.rgba[o + 1] === g && sheet.rgba[o + 2] === b) n++;
  }
  return n;
};
/** 프레임 i의 불투명 픽셀 경계(프레임 좌표). */
const bounds = (sheet: Sheet, i: number): { left: number; right: number; top: number; bottom: number } => {
  let left: number = PLAYER_FRAME.width, right = -1, top: number = PLAYER_FRAME.height, bottom = -1;
  for (let y = 0; y < sheet.height; y++) for (let x = 0; x < PLAYER_FRAME.width; x++) {
    if (sheet.rgba[(y * sheet.width + i * PLAYER_FRAME.width + x) * 4 + 3]! === 0) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { left, right, top, bottom };
};

describe('player sprite sheets (character v2, 40×64 × 15)', () => {
  it('has 15 frames and the animation indices cover 0..14 without gaps', () => {
    expect(PLAYER_FRAME_COUNT).toBe(15);
    expect(PLAYER_FRAME).toEqual({ width: 40, height: 64 });
    const all = [...new Set(Object.values(PLAYER_ANIMS).flatMap((a) => [...a.frames]))].sort((x, y) => x - y);
    expect(all).toEqual([...Array(PLAYER_FRAME_COUNT).keys()]);
    // 웨이브 1 호환: 옛 Player가 통째로 재생하는 attack = 체인 1·2·3타 프레임
    expect([...PLAYER_ANIMS.attack.frames]).toEqual([PLAYER_ANIMS.attack1.frames[0], PLAYER_ANIMS.attack2.frames[0], PLAYER_ANIMS.attack3.frames[0]]);
  });
  it('every member × outfit builds a 600×64 sheet', () => {
    for (const m of MEMBERS) for (const o of OUTFITS) {
      const sheet = buildPlayerSheet(m.id, o);
      expect(sheet.width, `${m.id}/${o}`).toBe(PLAYER_FRAME.width * PLAYER_FRAME_COUNT);
      expect(sheet.height, `${m.id}/${o}`).toBe(PLAYER_FRAME.height);
    }
  });
  it('pose frames differ (idle bob, flourish, walk, jump, attack chain, hurt, super, win)', () => {
    for (const m of MEMBERS) {
      const sheet = buildPlayerSheet(m.id);
      const f = PLAYER_ANIMS;
      const idle = frameOf(sheet, f.idle.frames[0]);
      expect(frameOf(sheet, f.idle.frames[1]), `${m.id} idle`).not.toBe(idle);
      expect(frameOf(sheet, f.flourish.frames[0]), `${m.id} flourish`).not.toBe(idle);
      expect(frameOf(sheet, f.walk.frames[0]), `${m.id} walk0`).not.toBe(frameOf(sheet, f.walk.frames[1]));
      expect(frameOf(sheet, f.walk.frames[0]), `${m.id} walk0/2`).not.toBe(frameOf(sheet, f.walk.frames[2]));
      expect(frameOf(sheet, f.jump.frames[0]), `${m.id} jump`).not.toBe(idle);
      const a1 = frameOf(sheet, f.attack1.frames[0]), a2 = frameOf(sheet, f.attack2.frames[0]), a3 = frameOf(sheet, f.attack3.frames[0]);
      expect(a1, `${m.id} attack1`).not.toBe(idle);
      expect(a1, `${m.id} attack1/2`).not.toBe(a2);
      expect(a2, `${m.id} attack2/3`).not.toBe(a3);
      expect(a1, `${m.id} attack1/3`).not.toBe(a3);
      expect(frameOf(sheet, f.hurt.frames[0]), `${m.id} hurt`).not.toBe(idle);
      expect(frameOf(sheet, f.super.frames[0]), `${m.id} super0`).not.toBe(frameOf(sheet, f.super.frames[1]));
      expect(frameOf(sheet, f.super.frames[0]), `${m.id} super`).not.toBe(idle);
      expect(frameOf(sheet, f.win.frames[0]), `${m.id} win`).not.toBe(idle);
    }
  });
  it('members are told apart: idle frames differ and each signature accessory colour is present', () => {
    const idles = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), 0));
    expect(new Set(idles).size).toBe(MEMBERS.length);
    // 액세서리: 원이 금색 귀걸이 · 메이 헤어클립(2px) · 제나 리본(3×3 × 2) · 미나미 갸루 하이라이트(눈 밑 흰 픽셀 2개 더)
    expect(countColor(buildPlayerSheet('woni'), 0, LOOKS.woni!.accent)).toBeGreaterThanOrEqual(1);
    expect(countColor(buildPlayerSheet('may'), 0, LOOKS.may!.accent)).toBeGreaterThanOrEqual(2);
    expect(countColor(buildPlayerSheet('zena'), 0, LOOKS.zena!.accent)).toBeGreaterThanOrEqual(6);
    expect(countColor(buildPlayerSheet('minami'), 0, '#ffffff')).toBeGreaterThanOrEqual(countColor(buildPlayerSheet('woni'), 0, '#ffffff') + 2);
  });
  it('signature poses differ between members (flourish, super and win are per member)', () => {
    const supers = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), PLAYER_ANIMS.super.frames[0]));
    const wins = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), PLAYER_ANIMS.win.frames[0]));
    const flourishes = MEMBERS.map((m) => frameOf(buildPlayerSheet(m.id), PLAYER_ANIMS.flourish.frames[0]));
    expect(new Set(supers).size).toBe(MEMBERS.length);
    expect(new Set(wins).size).toBe(MEMBERS.length);
    expect(new Set(flourishes).size).toBe(MEMBERS.length);
  });
  it('outfits differ from each other for the same member', () => {
    const idles = OUTFITS.map((o) => frameOf(buildPlayerSheet('woni', o), 0));
    expect(new Set(idles).size).toBe(OUTFITS.length);
  });
  it('sprites stand on the bottom row, start inside the physics body top and stay inside the frame', () => {
    for (const m of MEMBERS) {
      const sheet = buildPlayerSheet(m.id);
      for (let i = 0; i < PLAYER_FRAME_COUNT; i++) {
        const b = bounds(sheet, i);
        expect(b.left, `${m.id} frame ${i} left`).toBeGreaterThanOrEqual(0);
        expect(b.right, `${m.id} frame ${i} right`).toBeLessThanOrEqual(PLAYER_FRAME.width - 1);
        expect(b.top, `${m.id} frame ${i} top`).toBeGreaterThanOrEqual(0);
      }
      const idle = bounds(sheet, PLAYER_ANIMS.idle.frames[0]);
      expect(idle.bottom, `${m.id} feet`).toBe(PLAYER_FRAME.height - 1);
      expect(idle.top, `${m.id} head`).toBeLessThanOrEqual(PLAYER_BODY.offsetY);
    }
  });
  it('generated png files (5 members × 5 outfits) match the sources (run npm run sprites)', () => {
    for (const m of MEMBERS) for (const o of OUTFITS) {
      const file = playerSheetFile(m.id, o);
      expect(file).toBe(o === 'training' ? `public/assets/sprites/player_${m.id}.png` : `public/assets/sprites/player_${m.id}_${o}.png`);
      expect(existsSync(file), file).toBe(true);
      expect(Buffer.compare(readFileSync(file), Buffer.from(buildPlayerSheet(m.id, o).png)), file).toBe(0);
    }
  });
});
