export interface MapDef {
  id: string;
  name: string;
  file: string;
}

export const MAPS: MapDef[] = [
  { id: 's1_trainee', name: '스테이지 1 — 연습생', file: 's1_trainee.json' },
];

const byId = new Map(MAPS.map((m) => [m.id, m]));
export function getMap(id: string): MapDef {
  const m = byId.get(id);
  if (!m) throw new Error(`unknown map: ${id}`);
  return m;
}
