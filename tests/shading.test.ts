import { describe, it, expect } from 'vitest';
import { ramp, toHsl, luminance } from '../tools/sprites/ramps';
import { shadeGrid, shadePalette, variantChar, spriteShadeOptions, PORTRAIT_SHADE_OPTIONS } from '../tools/sprites/shading';

describe('ramp', () => {
  it('orders light > base > shade > dark by luminance', () => {
    const r = ramp('#0f9d6e');
    expect(r.base).toBe('#0f9d6e');
    expect(luminance(r.light)).toBeGreaterThan(luminance(r.base));
    expect(luminance(r.base)).toBeGreaterThan(luminance(r.shade));
    expect(luminance(r.shade)).toBeGreaterThan(luminance(r.dark));
  });
  it('shifts highlights toward warm (50°) and shadows toward cool (250°)', () => {
    const [h] = toHsl('#0f9d6e'); // ≈160°
    const r = ramp('#0f9d6e');
    expect(toHsl(r.light)[0]).toBeLessThan(h);
    expect(toHsl(r.shade)[0]).toBeGreaterThan(h);
    expect(toHsl(r.dark)[0]).toBeGreaterThan(toHsl(r.shade)[0]);
  });
  it('keeps greys grey and clamps at white and black', () => {
    const g = ramp('#808080');
    for (const c of [g.light, g.shade, g.dark]) expect(/^#(..)\1\1$/.test(c)).toBe(true);
    expect(ramp('#ffffff').light).toBe('#ffffff');
    expect(ramp('#000000').dark).toBe('#000000');
  });
});

const L = (r: string) => variantChar(r, 'light');
const S = (r: string) => variantChar(r, 'shade');
const D = (r: string) => variantChar(r, 'dark');

describe('variantChar / shadePalette', () => {
  it('is deterministic and distinct per role and tone', () => {
    expect(variantChar('T', 'light')).toBe(variantChar('T', 'light'));
    expect(new Set([L('T'), S('T'), D('T'), L('H'), S('H'), D('H')]).size).toBe(6);
    expect(L('T').length).toBe(1);
  });
  it('adds ramp colors for each material that has a base color', () => {
    const p = shadePalette({ T: '#0f9d6e', K: '#000000' }, ['T', 'X']);
    const r = ramp('#0f9d6e');
    expect(p[L('T')]).toBe(r.light);
    expect(p[S('T')]).toBe(r.shade);
    expect(p[D('T')]).toBe(r.dark);
    expect(p.T).toBe('#0f9d6e');
    expect(p[L('X')]).toBeUndefined();
  });
});

const opts = (extra: Partial<Parameters<typeof shadeGrid>[1]> = {}) => ({
  materials: ['T', 'H', 'S'], groups: [['T'], ['H'], ['S']], band: 1, selectiveOutline: true, features: ['A', 'E'], rimOnly: ['S'], ...extra,
});

describe('shadeGrid', () => {
  it('shades the right 25% and bottom 20% of a block and lights the left edge', () => {
    const g = shadeGrid(['TTTTTT', 'TTTTTT', 'TTTTTT', 'TTTTTT'], opts());
    expect(g[0]).toBe(`${L('T')}TTT${S('T')}${S('T')}`);
    expect(g[2]).toBe(`${L('T')}TTT${S('T')}${S('T')}`);
    expect(g[3]).toBe(S('T').repeat(6));
  });
  it('treats features as part of the run and leaves them untouched', () => {
    const g = shadeGrid(['TTATT'], opts());
    expect(g[0]).toBe(`${L('T')}TA${S('T')}${S('T')}`);
  });
  it('drops a contact shadow under an occluding group, deepening an existing shade to dark', () => {
    const g = shadeGrid(['HHH', 'SSS', 'SSS'], opts());
    expect(g[1]).toBe(`${S('S')}${S('S')}${D('S')}`);
    expect(g[2]).toBe(`${L('S')}S${S('S')}`);
  });
  it('replaces internal outline pixels with the dark tone of the material below, keeping the silhouette black', () => {
    const g = shadeGrid(['HHH', 'KKK', 'SSS'], opts());
    expect(g[1]).toBe(`K${D('S')}K`);
    expect(shadeGrid(['HHH', 'KKK', 'SSS'], opts({ selectiveOutline: false }))[1]).toBe('KKK');
  });
  it('does not cast eye shadows: outline next to a feature is not an occluder', () => {
    const tall = ['SSSS', 'SKES', 'SSSS', 'SSSS', 'SSSS'];
    const g = shadeGrid(tall, opts());
    expect(g[2]![1]).toBe('S');
    const plain = shadeGrid(['SSS', 'SKS', 'SSS', 'SSS', 'SSS'], opts());
    expect(plain[2]![1]).toBe(S('S'));
  });
  it('paints a sheen band near the crown of the sheen role', () => {
    const g = shadeGrid(Array<string>(10).fill('HHHHHH'), opts({ sheen: ['H'] }));
    expect(g[2]![1]).toBe(L('H'));
    expect(g[2]![2]).toBe(L('H'));
    expect(g[5]![1]).toBe('H');
  });
  it('keeps transparent cells and non-material roles untouched', () => {
    const g = shadeGrid(['.A.', '.K.'], opts());
    expect(g).toEqual(['.A.', '.K.']);
  });
});

describe('presets', () => {
  it('groups short sleeves with skin when the L role resolves to skin', () => {
    const skin = spriteShadeOptions({ L: '#f2cfb3', S: '#f2cfb3', T: '#ffffff' });
    expect(skin.groups.find((g) => g.includes('S'))).toContain('L');
    const top = spriteShadeOptions({ L: '#ffffff', S: '#f2cfb3', T: '#ffffff' });
    expect(top.groups.find((g) => g.includes('T'))).toContain('L');
    expect(skin.band).toBe(1);
  });
  it('portrait preset uses a 2px band and sheen on the front hair', () => {
    expect(PORTRAIT_SHADE_OPTIONS.band).toBe(2);
    expect(PORTRAIT_SHADE_OPTIONS.sheen).toContain('H');
    expect(PORTRAIT_SHADE_OPTIONS.rimOnly).toContain('S');
  });
});
