import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { buildItemSheets, buildPlayerSheet, buildTileset, buildUiSheets } from '../tools/build-sprites-lib';
import { crop } from '../tools/pixel-art';

describe('item and ui sheets', () => {
  it('life icons are the 16×16 head crop (rows 2..17, cols 12..27) of the member idle frame and are mostly opaque', () => {
    const ui = buildUiSheets();
    for (const m of ['woni', 'liv', 'minami', 'may', 'zena'] as const) {
      const life = ui.find((s) => s.file.endsWith(`life_${m}.png`))!;
      const sheet = buildPlayerSheet(m);
      const expected = crop(sheet.rgba, sheet.width, 12, 2, 16, 16);
      expect(life.rgba, `${m} rgba`).toBeDefined();
      expect(Buffer.compare(Buffer.from(life.rgba!), Buffer.from(expected)), m).toBe(0);
      let opaque = 0;
      for (let i = 3; i < expected.length; i += 4) if (expected[i]! > 0) opaque++;
      expect(opaque, `${m} opaque`).toBeGreaterThan(16 * 16 * 0.6);
    }
  });
  it('builds the expected files with the expected sizes', () => {
    const items = buildItemSheets();
    expect(items.map((s) => s.file).sort()).toEqual(['public/assets/sprites/heart_liv.png', 'public/assets/sprites/heart_may.png', 'public/assets/sprites/heart_minami.png', 'public/assets/sprites/heart_woni.png', 'public/assets/sprites/heart_zena.png', 'public/assets/sprites/item_card.png', 'public/assets/sprites/item_chest.png']);
    for (const s of items.filter((s) => s.file.includes('heart_'))) { expect(s.width).toBe(32); expect(s.height).toBe(16); }
    const ui = buildUiSheets(); expect(ui.find((s) => s.file.endsWith('hud_go.png'))).toMatchObject({ width: 64, height: 16 });
    for (const m of ['woni', 'liv', 'minami', 'may', 'zena']) expect(ui.find((s) => s.file.endsWith(`life_${m}.png`))).toMatchObject({ width: 16, height: 16 });
  });
  it('generated files match sources (run npm run sprites)', () => { for (const s of [...buildItemSheets(), ...buildUiSheets()]) { expect(existsSync(s.file), s.file).toBe(true); expect(Buffer.compare(readFileSync(s.file), Buffer.from(s.png))).toBe(0); } });
});

describe('stage tilesets', () => {
  const palettes = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5'] as const;
  it('builds all 5 stage tilesets 96×32', () => {
    for (const p of palettes) {
      const tileset = buildTileset(p);
      expect(tileset.file, p).toBe(`public/assets/tiles/${p}.png`);
      expect(tileset.width, p).toBe(96);
      expect(tileset.height, p).toBe(32);
    }
  });
  it('generated tileset png files match the sources (run npm run sprites)', () => {
    for (const p of palettes) {
      const tileset = buildTileset(p);
      expect(existsSync(tileset.file), tileset.file).toBe(true);
      expect(Buffer.compare(readFileSync(tileset.file), Buffer.from(tileset.png))).toBe(0);
    }
  });
});
