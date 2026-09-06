import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { buildPlayerSheet, playerSheetFile } from '../tools/build-sprites-lib';
import { MEMBERS } from '../src/data/members';
import { PLAYER_ANIMS, PLAYER_FRAME, PLAYER_FRAME_COUNT } from '../src/core/spriteFrames';

describe('player sprite sheets', () => {
  it('animation frame indices cover exactly the frame count without gaps', () => {
    const all = Object.values(PLAYER_ANIMS).flatMap((a) => [...a.frames]).sort((x, y) => x - y);
    expect(all).toEqual([...new Set(all)]);
    expect(Math.max(...all)).toBe(PLAYER_FRAME_COUNT - 1);
    expect(Math.min(...all)).toBe(0);
  });
  it('every member builds a sheet of PLAYER_FRAME_COUNT frames at the frame size', () => {
    for (const m of MEMBERS) {
      const sheet = buildPlayerSheet(m.id);
      expect(sheet.width, m.id).toBe(PLAYER_FRAME.width * PLAYER_FRAME_COUNT);
      expect(sheet.height, m.id).toBe(PLAYER_FRAME.height);
    }
  });
  it('frames are not identical to their neighbours (idle bob, walk stride, attack arm, hurt eyes)', () => {
    const sheet = buildPlayerSheet('woni');
    const frame = (i: number): string => {
      const out: number[] = [];
      for (let y = 0; y < sheet.height; y++) out.push(...sheet.rgba.slice((y * sheet.width + i * PLAYER_FRAME.width) * 4, (y * sheet.width + (i + 1) * PLAYER_FRAME.width) * 4));
      return out.join(',');
    };
    const f = PLAYER_ANIMS;
    expect(frame(f.idle.frames[0])).not.toBe(frame(f.idle.frames[1]));
    expect(frame(f.walk.frames[0])).not.toBe(frame(f.walk.frames[1]));
    expect(frame(f.walk.frames[0])).not.toBe(frame(f.walk.frames[2]));
    expect(frame(f.jump.frames[0])).not.toBe(frame(f.idle.frames[0]));
    expect(frame(f.attack.frames[0])).not.toBe(frame(f.idle.frames[0]));
    expect(frame(f.attack.frames[0])).not.toBe(frame(f.attack.frames[1]));
    expect(frame(f.hurt.frames[0])).not.toBe(frame(f.idle.frames[0]));
  });
  it('sprites are drawn inside the frame with the feet on the bottom row', () => {
    const sheet = buildPlayerSheet('liv');
    const idle = PLAYER_ANIMS.idle.frames[0];
    const bottom = sheet.height - 1;
    let opaque = 0;
    for (let x = idle * PLAYER_FRAME.width; x < (idle + 1) * PLAYER_FRAME.width; x++) if (sheet.rgba[(bottom * sheet.width + x) * 4 + 3]! > 0) opaque++;
    expect(opaque).toBeGreaterThan(0);
  });
  it('generated png files match the sources (run npm run sprites)', () => {
    for (const m of MEMBERS) {
      const file = playerSheetFile(m.id);
      expect(existsSync(file), file).toBe(true);
      expect(Buffer.compare(readFileSync(file), Buffer.from(buildPlayerSheet(m.id).png)), m.id).toBe(0);
    }
  });
});
