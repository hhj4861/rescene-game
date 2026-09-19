// All numerical abilities and stage roles below are game fiction, not artist ratings.
export const members = [
  { id: 'minami', name: '미나미', color: '#557cc0', role: '리듬과 새로운 시도' },
  { id: 'woni', name: '원이', color: '#568d74', role: '호흡과 무대 흐름' },
  { id: 'zena', name: '제나', color: '#9973af', role: '표현과 포인트' },
  { id: 'liv', name: '리브', color: '#697682', role: '음색과 감정' },
  { id: 'may', name: '메이', color: '#bd8c39', role: '분위기와 연결' },
];
export const judges = ['보컬 디렉터', '안무가', '음악 프로듀서', '무대 연출가', '공연 심사위원']
  .map((name, i) => ({ id: `judge-${i + 1}`, name, fictional: true }));
export const concepts = ['네온 야경', '여름의 파도', '기억의 향기', '비밀 정원', '겨울 편지', '새벽 열차', '달빛 축제', '도시의 리듬', '꿈의 도서관', '새로운 세계'];
export const music = [
  { id: 'glow', name: '잔광', bpm: 96, mood: '몽환적인 신스', demand: 1 },
  { id: 'wave', name: '물결', bpm: 112, mood: '경쾌한 디스코', demand: 2 },
  { id: 'spark', name: '불꽃', bpm: 128, mood: '강렬한 일렉트로', demand: 3 },
];
export const dances = ['flow', 'groove', 'power'];
export const risks = ['none', 'adlib', 'danceBreak', 'unit'];
const urls = [
  'https://www.hellokpop.com/exclusive/exclusive-interview-rescene-first-ep-scenedrome/',
  'https://17caratkpop.substack.com/p/rescene-is-a-breath-of-fresh-air',
];
const observations = {
  minami: ['Pinball의 어려운 멜로디와 박자를 반복 연습하며 익숙해지는 과정이 즐거웠다고 설명했다.', '다양한 콘셉트를 시도하고 무대에서 여러 모습을 보여 주기를 좋아한다고 소개했다.'],
  woni: ['LOVE ATTACK 준비 때 호흡 구간이 모호해 어려웠고 서로 가르치며 배우는 과정이 즐거웠다고 말했다.', '리더로서 퍼포먼스를 이끌고 좋은 에너지를 전달하는 역할을 소개했다.'],
  zena: ['New World 녹음에서 특정 가사의 발음과 박자가 어려웠다고 회상했다.', '여러 매력을 탐색하면서 그룹의 고유한 색을 드러내고 싶다고 소개했다.'],
  liv: ['곡의 내용을 이해하고 느낌을 표현하는 것이 어려웠으며 멤버들의 음색이 조화될 때 즐거웠다고 말했다.', '음색을 통해 섬세하고 독특하게 감정을 표현하려 한다고 소개했다.'],
  may: ['네 곡 각각의 분위기와 포인트를 정하는 데 시간이 필요했다고 설명했다.', '밝은 미소와 긍정적인 무대 에너지를 전하려 한다고 소개했다.'],
};
export const sources = members.flatMap(m => observations[m.id].map((summary, i) => ({
  sourceId: `${m.id}-interview-${i + 1}`, memberId: m.id, speakerId: m.id,
  url: urls[i], title: i ? '17 Carat K-Pop 직접 인터뷰' : 'Hellokpop SCENEDROME 직접 인터뷰',
  publishedAt: i ? '2025-03-03' : '2024-09-11', retrievedAt: '2026-09-19',
  summary, evidenceType: 'direct-interview', verificationStatus: 'reviewed-text',
  usageBasis: '짧은 한국어 요약 및 원문 링크. 전문·음원 미복제.',
})));
export const profileVersion = 'interviews-v1-two-sources';
export const defaultPlan = () => ({ music: 'glow', dance: 'flow', risk: 'none',
  leads: members.map(m => m.id), practice: [3, 3, 2, 2, 2], direction: '서로의 호흡을 들으며 한 장면을 완성하자.' });
export const publicCatalog = { members, judges, concepts, music, dances, risks, sources, profileVersion,
  personaStatus: '멤버별 인터뷰 2건을 확인한 실험판입니다. 영상·블로그 전체 학습 및 인물 재현 품질 검수는 미완료입니다.' };
