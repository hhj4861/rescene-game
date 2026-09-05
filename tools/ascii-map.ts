export const TILE = 32;
export const TILE_GIDS: Record<string, number> = { '#': 1, '=': 2, 'H': 3 };
const EMPTY = '.';
const OBJECT_TYPES = ['spawn', 'portal', 'npc', 'enemy', 'savepoint', 'boss'] as const;
export type AsciiObjectType = (typeof OBJECT_TYPES)[number];

export interface AsciiObject {
  type: AsciiObjectType;
  name: string;
  tx: number;
  ty: number;
  props: Record<string, string>;
}

export interface ParsedAsciiMap {
  id: string;
  meta: Record<string, string>;
  rows: string[];
  objects: AsciiObject[];
}

function parseKeyValues(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const eq = t.indexOf('=');
    if (eq <= 0) throw new Error(`bad key=value token '${t}'`);
    out[t.slice(0, eq)] = t.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return out;
}

function tokenize(line: string): string[] {
  // key="값에 공백 포함" 토큰을 하나로 유지한다
  return line.match(/[^\s"]+="[^"]*"|"[^"]*"|\S+/g) ?? [];
}

export function parseAsciiMap(text: string): ParsedAsciiMap {
  const lines = text.split(/\r?\n/);
  let section: 'none' | 'tiles' | 'objects' = 'none';
  const meta: Record<string, string> = {};
  const rows: string[] = [];
  const objects: AsciiObject[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (section !== 'tiles' && (line === '' || line.startsWith('#'))) continue;
    if (line.startsWith('@meta')) { Object.assign(meta, parseKeyValues(tokenize(line).slice(1))); continue; }
    if (line === '@tiles') { section = 'tiles'; continue; }
    if (line === '@objects') { section = 'objects'; continue; }
    if (section === 'tiles') {
      if (line === '') continue;
      for (const ch of line) if (ch !== EMPTY && !(ch in TILE_GIDS)) throw new Error(`unknown tile char '${ch}' in row ${rows.length}`);
      rows.push(line);
    } else if (section === 'objects') {
      const [type, name, tx, ty, ...rest] = tokenize(line);
      if (!type || !name || tx === undefined || ty === undefined) throw new Error(`bad object line '${line}'`);
      if (!(OBJECT_TYPES as readonly string[]).includes(type)) throw new Error(`unknown object type '${type}'`);
      const props = parseKeyValues(rest);
      if (type === 'portal' && (!props.target || !props.spawn)) throw new Error(`portal ${name} needs target= and spawn=`);
      objects.push({ type: type as AsciiObjectType, name, tx: Number(tx), ty: Number(ty), props });
    }
  }

  if (!meta.id) throw new Error('@meta id= is required');
  if (rows.length === 0) throw new Error('@tiles section is empty');
  const width = rows[0]!.length;
  rows.forEach((r, i) => { if (r.length !== width) throw new Error(`row ${i} has length ${r.length}, expected ${width}`); });
  return { id: meta.id, meta, rows, objects };
}

export interface TiledProperty { name: string; type: 'string' | 'int' | 'bool'; value: string | number | boolean }
export interface TiledObject {
  id: number; name: string; type: string; x: number; y: number; width: number; height: number;
  rotation: 0; visible: true; point?: true; properties: TiledProperty[];
}
export interface TiledLayer {
  id: number; name: string; type: 'tilelayer' | 'objectgroup'; x: 0; y: 0; opacity: 1; visible: true;
  width?: number; height?: number; data?: number[]; objects?: TiledObject[];
}
export interface TiledMap {
  type: 'map'; version: string; tiledversion: string; orientation: 'orthogonal'; renderorder: 'right-down'; infinite: false;
  width: number; height: number; tilewidth: number; tileheight: number; nextlayerid: number; nextobjectid: number;
  properties: TiledProperty[];
  tilesets: { firstgid: number; name: string; tilewidth: number; tileheight: number; tilecount: number; columns: number; image: string; imagewidth: number; imageheight: number; margin: 0; spacing: 0 }[];
  layers: TiledLayer[];
}

const OBJECT_LAYER: Record<AsciiObjectType, string> = {
  spawn: 'spawns_player', portal: 'portals', npc: 'spawns_npc', enemy: 'spawns_enemy', savepoint: 'savepoints', boss: 'bosses',
};

export function toTiled(p: ParsedAsciiMap): TiledMap {
  const width = p.rows[0]!.length;
  const height = p.rows.length;
  const tileLayer = (name: string, chars: string[]): TiledLayer => ({
    id: 0, name, type: 'tilelayer', x: 0, y: 0, opacity: 1, visible: true, width, height,
    data: p.rows.flatMap((row) => [...row].map((ch) => (chars.includes(ch) ? TILE_GIDS[ch]! : 0))),
  });
  const layers: TiledLayer[] = [tileLayer('ground', ['#']), tileLayer('platforms', ['=']), tileLayer('ladders', ['H'])];

  let nextObjectId = 1;
  for (const layerName of Object.values(OBJECT_LAYER)) {
    const objects = p.objects
      .filter((o) => OBJECT_LAYER[o.type] === layerName)
      .map((o): TiledObject => {
        const footX = o.tx * TILE + TILE / 2;
        const footY = (o.ty + 1) * TILE;
        const properties = Object.entries(o.props).sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]): TiledProperty => ({ name, type: 'string', value }));
        const base = { id: nextObjectId++, name: o.name, type: o.type, rotation: 0 as const, visible: true as const, properties };
        if (o.type === 'portal') return { ...base, x: footX - TILE / 2, y: footY - 2 * TILE, width: TILE, height: 2 * TILE };
        return { ...base, x: footX, y: footY, width: 0, height: 0, point: true };
      });
    layers.push({ id: 0, name: layerName, type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, objects });
  }
  layers.forEach((l, i) => (l.id = i + 1));

  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    width, height, tilewidth: TILE, tileheight: TILE, nextlayerid: layers.length + 1, nextobjectid: nextObjectId,
    properties: [
      { name: 'chapter', type: 'int', value: Number(p.meta.chapter ?? 0) },
      { name: 'name', type: 'string', value: p.meta.name ?? p.id },
    ],
    tilesets: [{ firstgid: 1, name: 'tiles', tilewidth: TILE, tileheight: TILE, tilecount: 3, columns: 3, image: 'tiles.png', imagewidth: 96, imageheight: 32, margin: 0, spacing: 0 }],
    layers,
  };
}
