import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseAsciiMap, toTiled } from '../tools/ascii-map';
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
      expect(json).toEqual(toTiled(byId.get(m.id)!));
    }
  });
  it('stage maps expose the lock and spawn objects their stage data references', () => {
    const p = byId.get('s1_trainee')!;
    const names = (type: string) => p.objects.filter((o) => o.type === type).map((o) => o.name);
    expect(names('lock')).toEqual(['lock_a', 'lock_b', 'lock_c', 'lock_d', 'lock_boss']);
    for (const s of ['start', 're_a', 're_b', 're_c', 're_d', 're_boss', 'sp_a1', 'sp_a2', 'sp_b1', 'sp_b2', 'sp_c1', 'sp_c2', 'sp_d1', 'sp_d2', 'sp_boss', 'sp_cheer_a', 'sp_cheer_c']) expect(names('spawn')).toContain(s);
    expect(p.rows.length).toBe(17);
    expect(p.rows[0]!.length).toBe(120);
  });
});
