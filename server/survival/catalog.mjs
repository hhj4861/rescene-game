import { createHash } from 'node:crypto';
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
// Recommendations guide discussion, never change the common judging weights.
export const conceptCatalog = [
  ['네온 야경', 110, 130, 'groove', '박자와 빛의 대비'],
  ['여름의 파도', 105, 120, 'groove', '경쾌한 파트 전환'],
  ['기억의 향기', 90, 105, 'flow', '음색과 감정의 연결'],
  ['비밀 정원', 90, 115, 'flow', '섬세한 표현'],
  ['겨울 편지', 85, 100, 'flow', '절제와 호흡'],
  ['새벽 열차', 100, 120, 'groove', '점차 커지는 흐름'],
  ['달빛 축제', 105, 130, 'groove', '서로 이어지는 에너지'],
  ['도시의 리듬', 115, 135, 'power', '정확한 리듬'],
  ['꿈의 도서관', 90, 105, 'flow', '장면을 전하는 표현'],
  ['새로운 세계', 110, 135, 'power', '도입과 피날레의 대비'],
  ['유리 바다', 90, 112, 'flow', '투명한 음색의 조화'],
  ['우주 우체국', 105, 128, 'groove', '메시지를 잇는 파트'],
  ['오렌지 노을', 95, 115, 'flow', '따뜻한 표현'],
  ['흑백 영화', 90, 112, 'flow', '명확한 감정 대비'],
  ['사막의 별', 100, 128, 'groove', '긴장과 여백'],
  ['봄날의 약속', 95, 115, 'flow', '자연스러운 전환'],
  ['번개 신호', 120, 135, 'power', '강한 동작 속 완성도'],
  ['회전목마', 105, 120, 'groove', '반복되는 리듬의 변화'],
  ['푸른 미로', 100, 125, 'groove', '파트 간 질문과 응답'],
  ['자정의 라디오', 90, 105, 'flow', '음색과 호흡 균형'],
  ['불꽃 행진', 120, 135, 'power', '끝까지 유지하는 에너지'],
  ['비 오는 거리', 90, 112, 'flow', '작은 감정 변화'],
  ['종이비행기', 105, 128, 'groove', '가벼운 움직임과 연결'],
  ['별빛 운동장', 115, 135, 'power', '함께 만드는 피날레'],
].map(([name, min, max, dance, hint], i) => ({ id: `concept-${i + 1}`, name,
  bpmRange: [min, max], dance, hint, parts: '다섯 멤버가 각자 12초 리드 파트' }));
export const habits = {
  power: '고강도 선호', risk: '승부수 선호', steady: '안정적인 구성 선호',
};
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
  'https://www.hellokpop.com/interview/exclusive-interview-introducing-rescene/',
];
const observations = {
  minami: ['Pinball의 어려운 멜로디와 박자를 반복 연습하며 익숙해지는 과정이 즐거웠다고 설명했다.', '다양한 콘셉트를 시도하고 무대에서 여러 모습을 보여 주기를 좋아한다고 소개했다.'],
  woni: ['LOVE ATTACK 준비 때 호흡 구간이 모호해 어려웠고 서로 가르치며 배우는 과정이 즐거웠다고 말했다.', '리더로서 퍼포먼스를 이끌고 좋은 에너지를 전달하는 역할을 소개했다.'],
  zena: ['New World 녹음에서 특정 가사의 발음과 박자가 어려웠다고 회상했다.', '여러 매력을 탐색하면서 그룹의 고유한 색을 드러내고 싶다고 소개했다.'],
  liv: ['곡의 내용을 이해하고 느낌을 표현하는 것이 어려웠으며 멤버들의 음색이 조화될 때 즐거웠다고 말했다.', '음색을 통해 섬세하고 독특하게 감정을 표현하려 한다고 소개했다.'],
  may: ['네 곡 각각의 분위기와 포인트를 정하는 데 시간이 필요했다고 설명했다.', '밝은 미소와 긍정적인 무대 에너지를 전하려 한다고 소개했다.'],
};
const debut = {
  minami: '멤버마다 다른 음색을 서로 맞추면 한 곡에서도 다양한 분위기를 만들 수 있다고 말했다.',
  woni: '연습할 때 곡에서 느낀 감정과 각자의 스타일을 함께 나눈다고 설명했다.',
  zena: '다양한 표정을 활용해 무대를 풍성하게 만들고 싶다고 말했다.',
  liv: '서로의 보컬 색을 살리고 조화시키며 팀의 고유한 소리를 만든다고 설명했다.',
  may: '각자의 독특한 목소리로 하나의 감정을 공유하며 노래한다고 설명했다.',
};
export const sources = members.flatMap(m => [...observations[m.id], debut[m.id]].map((summary, i) => ({
  sourceId: `${m.id}-interview-${i + 1}`, memberId: m.id, speakerId: m.id,
  url: urls[i], title: ['Hellokpop SCENEDROME 직접 인터뷰', '17 Carat K-Pop 직접 인터뷰', 'Hellokpop 데뷔 직접 인터뷰'][i],
  publishedAt: ['2024-09-11', '2025-03-03', '2024-06-14'][i], retrievedAt: '2026-09-19',
  summary, evidenceType: 'direct-interview', verificationStatus: 'reviewed-text',
  contentHash: createHash('sha256').update(summary).digest('hex'),
  usageBasis: '짧은 한국어 요약 및 원문 링크. 전문·음원 미복제.',
})));
export const profileVersion = 'interviews-v2-three-sources';
export const defaultPlan = () => ({ music: 'glow', dance: 'flow', risk: 'none',
  leads: members.map(m => m.id), practice: [3, 3, 2, 2, 2], recovery: [0, 0, 0, 0, 0], direction: '서로의 호흡을 들으며 한 장면을 완성하자.' });
export const publicCatalog = { members, judges, concepts, conceptCatalog, habits, music, dances, risks, sources, profileVersion,
  personaStatus: '멤버별 인터뷰 3건의 짧은 요약을 확인한 실험판입니다. 영상·블로그 전체 학습 및 인물 재현 품질 검수는 미완료입니다.' };
