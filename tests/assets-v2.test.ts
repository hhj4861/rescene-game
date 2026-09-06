import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { buildItemSheets, buildUiSheets } from '../tools/build-sprites-lib';

describe('item and ui sheets', () => {
  it('builds the expected files with the expected sizes', () => {
    const items = buildItemSheets();
    expect(items.map((s) => s.file).sort()).toEqual(['public/assets/sprites/heart_liv.png', 'public/assets/sprites/heart_may.png', 'public/assets/sprites/heart_minami.png', 'public/assets/sprites/heart_woni.png', 'public/assets/sprites/heart_zena.png', 'public/assets/sprites/item_card.png', 'public/assets/sprites/item_chest.png']);
    for (const s of items.filter((s) => s.file.includes('heart_'))) { expect(s.width).toBe(32); expect(s.height).toBe(16); }
    const ui = buildUiSheets(); expect(ui.find((s) => s.file.endsWith('hud_go.png'))).toMatchObject({ width: 64, height: 16 });
    for (const m of ['woni', 'liv', 'minami', 'may', 'zena']) expect(ui.find((s) => s.file.endsWith(`life_${m}.png`))).toMatchObject({ width: 16, height: 16 });
  });
  it('generated files match sources (run npm run sprites)', () => { for (const s of [...buildItemSheets(), ...buildUiSheets()]) { expect(existsSync(s.file), s.file).toBe(true); expect(Buffer.compare(readFileSync(s.file), Buffer.from(s.png))).toBe(0); } });
});
