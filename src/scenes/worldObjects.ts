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

/** 오브젝트 레이어 하나를 평탄한 목록으로 읽는다. 없는 레이어는 빈 배열. */
export function objectsOf(map: Phaser.Tilemaps.Tilemap, layer: string): MapObject[] {
  const objs = map.getObjectLayer(layer)?.objects ?? [];
  return objs.map((o) => {
    const props: Record<string, string> = {};
    for (const p of (o.properties ?? []) as { name: string; value: string }[]) props[p.name] = String(p.value);
    return { name: o.name ?? '', type: o.type ?? '', x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? 0, height: o.height ?? 0, props };
  });
}

/** 플레이어·적·응원 스폰은 전부 `spawns_player` 레이어의 `spawn` 오브젝트다(발 위치). */
export function findSpawnOrNull(map: Phaser.Tilemaps.Tilemap, name: string): { x: number; y: number } | null {
  const hit = objectsOf(map, 'spawns_player').find((s) => s.name === name);
  return hit ? { x: hit.x, y: hit.y } : null;
}

export function findSpawn(map: Phaser.Tilemaps.Tilemap, name: string): { x: number; y: number } {
  const hit = findSpawnOrNull(map, name);
  if (!hit) throw new Error(`map has no spawn '${name}'`);
  return hit;
}

/** 잠금선 x. `lock` 오브젝트는 1타일 사각형이므로 오른쪽 변(`x + width`)이 잠금선이다. */
export function lockX(map: Phaser.Tilemaps.Tilemap, name: string): number {
  const hit = objectsOf(map, 'objects').find((o) => o.type === 'lock' && o.name === name);
  if (!hit) throw new Error(`map has no lock '${name}'`);
  return hit.x + hit.width;
}
