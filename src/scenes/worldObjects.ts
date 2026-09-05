import type Phaser from 'phaser';

export interface MapObject {
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, string>;
}

export function objectsOf(map: Phaser.Tilemaps.Tilemap, layer: string): MapObject[] {
  const objs = map.getObjectLayer(layer)?.objects ?? [];
  return objs.map((o) => {
    const props: Record<string, string> = {};
    for (const p of (o.properties ?? []) as { name: string; value: string }[]) props[p.name] = String(p.value);
    return { name: o.name ?? '', type: o.type ?? '', x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? 0, height: o.height ?? 0, props };
  });
}

export function findSpawn(map: Phaser.Tilemaps.Tilemap, name: string): { x: number; y: number } {
  const spawns = objectsOf(map, 'spawns_player');
  const saves = objectsOf(map, 'savepoints');
  const hit = spawns.find((s) => s.name === name) ?? saves.find((s) => s.name === name) ?? spawns.find((s) => s.name === 'start');
  if (!hit) throw new Error(`map has no spawn '${name}' and no 'start'`);
  return { x: hit.x, y: hit.y };
}
