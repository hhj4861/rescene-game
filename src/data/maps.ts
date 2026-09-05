export interface MapDef {
  id: string;
  name: string;
  chapter: number;
  file: string;
}

export const MAPS: MapDef[] = [
  { id: 'ch1_practice', name: '더뮤즈 연습실 (야간)', chapter: 1, file: 'ch1_practice.json' },
  { id: 'ch1_alley', name: '편의점 골목', chapter: 1, file: 'ch1_alley.json' },
  { id: 'ch0_geoje', name: '거제 바닷가', chapter: 0, file: 'ch0_geoje.json' },
  { id: 'ch0_suwon', name: '수원 오디션 복도', chapter: 0, file: 'ch0_suwon.json' },
  { id: 'ch0_chiba', name: '치바 야치요 골목', chapter: 0, file: 'ch0_chiba.json' },
  { id: 'ch0_goyang', name: '픽플래닛 아카데미', chapter: 0, file: 'ch0_goyang.json' },
  { id: 'ch0_gyeongju', name: '청춘스타 대기실', chapter: 0, file: 'ch0_gyeongju.json' },
];

const byId = new Map(MAPS.map((m) => [m.id, m]));
export function getMap(id: string): MapDef {
  const m = byId.get(id);
  if (!m) throw new Error(`unknown map: ${id}`);
  return m;
}
