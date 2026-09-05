export interface MapDef {
  id: string;
  name: string;
  chapter: number;
  file: string;
}

export const MAPS: MapDef[] = [
  { id: 'ch1_practice', name: '더뮤즈 연습실 (야간)', chapter: 1, file: 'ch1_practice.json' },
  { id: 'ch1_alley', name: '편의점 골목', chapter: 1, file: 'ch1_alley.json' },
];

const byId = new Map(MAPS.map((m) => [m.id, m]));
export function getMap(id: string): MapDef {
  const m = byId.get(id);
  if (!m) throw new Error(`unknown map: ${id}`);
  return m;
}
