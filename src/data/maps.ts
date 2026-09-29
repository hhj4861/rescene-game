export interface MapDef {
  id: string;
  name: string;
  file: string;
}

export const MAPS: MapDef[] = [
  { id: 's1_trainee', name: '스테이지 1 — 연습생', file: 's1_trainee.json' },
  { id: 's2_debut', name: '스테이지 2 — 데뷔', file: 's2_debut.json' },
  { id: 's3_road', name: '스테이지 3 — 신인의 길과 무명의 터널', file: 's3_road.json' },
  { id: 's4_comeback', name: '스테이지 4 — 역주행', file: 's4_comeback.json' },
  { id: 's5_first_win', name: '스테이지 5 — 첫 1위', file: 's5_first_win.json' },
];

const byId = new Map(MAPS.map((m) => [m.id, m]));
export function getMap(id: string): MapDef {
  const m = byId.get(id);
  if (!m) throw new Error(`unknown map: ${id}`);
  return m;
}
