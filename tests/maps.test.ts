import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseAsciiMap } from '../tools/ascii-map';
import { MAPS, getMap } from '../src/data/maps';
import { getEnemy, getNpc } from '../src/data/index';

const files = readdirSync('maps').filter((f) => f.endsWith('.txt'));
const parsed = files.map((f) => parseAsciiMap(readFileSync(join('maps', f), 'utf8')));
const byId = new Map(parsed.map((p) => [p.id, p]));

describe('map sources', () => {
  it('every source is registered and every registry entry has a source and a generated json', () => {
    expect([...byId.keys()].sort()).toEqual(MAPS.map((m) => m.id).sort());
    for (const m of MAPS) expect(existsSync(join('public/assets/maps', m.file)), m.id).toBe(true);
  });
  it('every map has a start spawn', () => {
    for (const p of parsed) expect(p.objects.some((o) => o.type === 'spawn' && o.name === 'start'), p.id).toBe(true);
  });
  it('portals point at existing maps and spawns', () => {
    for (const p of parsed) {
      for (const o of p.objects.filter((o) => o.type === 'portal')) {
        const target = byId.get(o.props.target!);
        expect(target, `${p.id}/${o.name} -> ${o.props.target}`).toBeDefined();
        expect(target!.objects.some((s) => s.type === 'spawn' && s.name === o.props.spawn), `${p.id}/${o.name} spawn ${o.props.spawn}`).toBe(true);
        getMap(o.props.target!);
      }
    }
  });
  it('enemy and boss spawns reference existing enemies', () => {
    for (const p of parsed) for (const o of p.objects.filter((o) => o.type === 'enemy' || o.type === 'boss')) expect(() => getEnemy(o.name), `${p.id}/${o.name}`).not.toThrow();
  });
  it('npc spawns reference existing npcs', () => {
    for (const p of parsed) for (const o of p.objects.filter((o) => o.type === 'npc')) expect(() => getNpc(o.name), `${p.id}/${o.name}`).not.toThrow();
  });
  it('generated json matches sources (run npm run maps)', () => {
    for (const m of MAPS) {
      const json = JSON.parse(readFileSync(join('public/assets/maps', m.file), 'utf8'));
      expect(json.width, m.id).toBe(byId.get(m.id)!.rows[0]!.length);
    }
  });
});
