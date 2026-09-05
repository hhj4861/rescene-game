import { describe, it, expect } from 'vitest';
import { parseAsciiMap, toTiled } from '../tools/ascii-map';

const SRC = `# test map
@meta id=t chapter=1 name="테스트"
@tiles
......
..==..
H.....
######
@objects
spawn start 1 2
portal exit 4 2 target=other spawn=in
enemy enemy_sleep_slime 3 2
npc npc_woni 2 2 dialogue=d1
savepoint scent_t 0 2
`;

describe('parseAsciiMap', () => {
  it('parses meta, rows and objects', () => {
    const p = parseAsciiMap(SRC);
    expect(p.id).toBe('t');
    expect(p.meta).toEqual({ id: 't', chapter: '1', name: '테스트' });
    expect(p.rows).toHaveLength(4);
    expect(p.objects).toHaveLength(5);
    expect(p.objects[1]).toEqual({ type: 'portal', name: 'exit', tx: 4, ty: 2, props: { target: 'other', spawn: 'in' } });
  });
  it('rejects ragged rows', () => {
    expect(() => parseAsciiMap(SRC.replace('..==..', '..==.'))).toThrow(/row 1/);
  });
  it('rejects unknown tile characters', () => {
    expect(() => parseAsciiMap(SRC.replace('H.....', 'H..X..'))).toThrow(/'X'/);
  });
  it('rejects portals without target/spawn and unknown object types', () => {
    expect(() => parseAsciiMap(SRC.replace(' target=other spawn=in', ''))).toThrow(/portal exit/);
    expect(() => parseAsciiMap(SRC.replace('savepoint scent_t', 'tree scent_t'))).toThrow(/tree/);
  });
});

describe('toTiled', () => {
  const t = toTiled(parseAsciiMap(SRC));
  const layer = (name: string) => t.layers.find((l) => l.name === name)!;
  it('emits map size, tileset and properties', () => {
    expect(t.width).toBe(6);
    expect(t.height).toBe(4);
    expect(t.tilewidth).toBe(32);
    expect(t.tilesets[0]).toMatchObject({ firstgid: 1, name: 'tiles', tilecount: 3 });
    expect(t.properties).toEqual([
      { name: 'chapter', type: 'int', value: 1 },
      { name: 'name', type: 'string', value: '테스트' },
    ]);
  });
  it('splits tiles into ground/platforms/ladders layers with gids', () => {
    const ground = layer('ground');
    expect(ground.type).toBe('tilelayer');
    expect(ground.data!.slice(18, 24)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(layer('platforms').data![8]).toBe(2);
    expect(layer('platforms').data![0]).toBe(0);
    expect(layer('ladders').data![12]).toBe(3);
  });
  it('converts objects to pixel coordinates by type', () => {
    const spawn = layer('spawns_player').objects![0]!;
    expect(spawn).toMatchObject({ name: 'start', x: 48, y: 96, point: true });
    const portal = layer('portals').objects![0]!;
    expect(portal).toMatchObject({ name: 'exit', x: 128, y: 32, width: 32, height: 64 });
    expect(portal.properties).toEqual([
      { name: 'spawn', type: 'string', value: 'in' },
      { name: 'target', type: 'string', value: 'other' },
    ]);
    expect(layer('spawns_enemy').objects![0]).toMatchObject({ name: 'enemy_sleep_slime', x: 112, y: 96 });
    expect(layer('spawns_npc').objects![0]!.properties).toEqual([{ name: 'dialogue', type: 'string', value: 'd1' }]);
    expect(layer('savepoints').objects![0]).toMatchObject({ name: 'scent_t' });
  });
});
