import type { DialogueScript } from '../../schema';

type Node = DialogueScript['nodes'][number];
const line = (id: string, speaker: string, text: string, next?: string): Node =>
  next ? { id, speaker, text, next } : { id, speaker, text, end: true };
const one = (id: string, speaker: string, text: string): DialogueScript => ({ id, nodes: [line('n0', speaker, text)] });

export const CH1_DIALOGUES: DialogueScript[] = [
  one('d1_dance_teacher_idle', 'npc_dance_teacher', '자세 낮추고, 시선은 앞. 다시!'),
  one('d1_manager_idle', 'npc_manager', '스케줄표 확인했지? 오늘도 연습실 마감이야.'),
  one('d1_clerk_idle', 'npc_clerk', '또 야식이에요? 근육통 버섯 조심하세요, 골목에 많아요.'),

  { id: 'd1_q01_offer', nodes: [
    line('n0', 'npc_dance_teacher', '연습실에 졸음 슬라임이 잔뜩이네. 야간 연습이 이래서 힘들어.', 'n1'),
    line('n1', 'npc_dance_teacher', '다섯 마리만 쫓아내 봐. 몸 풀기 삼아. (A: 공격, S: 스킬)'),
  ] },
  one('d1_q01_progress', 'npc_dance_teacher', '아직 졸음이 남아 있는데? 다섯 마리야.'),
  one('d1_q01_complete', 'npc_dance_teacher', '좋아, 이제 잠은 깼지? 매니저가 찾더라.'),

  { id: 'd1_q02_offer', nodes: [
    line('n0', 'npc_manager', '배고프지? 골목 편의점에서 야식 재료 좀 구해 와.', 'n1'),
    line('n1', 'npc_manager', '골목에 근육통 버섯이 있는데, 걔들이 재료를 떨어뜨려. 세 개면 돼.'),
  ] },
  one('d1_q02_progress', 'npc_manager', '재료 세 개. 골목이야, 골목.'),
  one('d1_q02_complete', 'npc_manager', '엽떡 두 개 챙겨 줄게. 리브가 좋아하는 거.'),

  { id: 'd1_q03_offer', nodes: [
    line('n0', 'npc_manager', '막내 제나가 들어온 지 한 달인데 한 시간에 한 마디밖에 안 해.', 'n1'),
    line('n1', 'npc_manager', '연습실에 남은 애들이랑 한 번씩 얘기해 봐. 제나, 미나미, 리브.'),
  ] },
  one('d1_q03_progress', 'npc_manager', '세 명 다 얘기해 봤어?'),
  one('d1_q03_complete', 'npc_manager', '리브 좌우명 들었지? 천천히 가도 멈추지 말자. 그거 기억해 둬.'),
  { id: 'd1_zena_word', nodes: [
    line('n0', 'zena', '...', 'n1'),
    line('n1', 'narrator', '(한참 뒤)', 'n2'),
    line('n2', 'zena', '...엄마 보고 싶어요.', 'n3'),
    line('n3', 'narrator', '(한 시간의 한 마디였다.)'),
  ] },
  { id: 'd1_minami_korean', nodes: [
    line('n0', 'minami', '오늘 배운 말: "박자 놓쳤다". 제가 제일 많이 듣는 말이에요.', 'n1'),
    line('n1', 'minami', '...농담이에요. 저 박자 안 놓쳐요.'),
  ] },
  { id: 'd1_liv_motto', nodes: [
    line('n0', 'liv', '힘들지? 나도. 근데 내 좌우명이 뭔지 알아?', 'n1'),
    line('n1', 'liv', '천천히 가도 멈추지 말자. 그러니까 오늘도 한 번만 더.'),
  ] },

  { id: 'd1_q04_offer', nodes: [
    line('n0', 'npc_manager', '메이가 옥상에 올라갔어. 요즘 자꾸 그만두겠다고 해.', 'n1'),
    line('n1', 'npc_manager', '옥상에 자기의심 그림자가 붙어 있을 거야. 걷어내고 얘기 좀 해 줘.'),
  ] },
  one('d1_q04_progress', 'npc_manager', '옥상이야. 그림자 셋, 그리고 메이.'),
  one('d1_q04_complete', 'npc_manager', '메이가 남기로 했다며. 고마워. 이제 월말평가만 남았네.'),
  { id: 'd1_may_stay', nodes: [
    { id: 'n0', speaker: 'may', face: 'sad', text: '언니... 저 진짜 못 하겠어요. 그만둘까 봐요.', next: 'n1' },
    { id: 'n1', speaker: 'narrator', text: '(원이라면 이렇게 말했을 것이다. "기회는 잡는 것도 기회가 와야 잡을 수 있는 거다.")',
      choices: [
        { text: '같이 남자. 기회는 와야 잡는 거야.', next: 'n2', setFlags: ['may_stayed'] },
        { text: '네 마음이 제일 중요해.', next: 'n3' },
      ] },
    { id: 'n2', speaker: 'may', face: 'happy', text: '...그립감, 좋네요. 남을게요.', end: true },
    { id: 'n3', speaker: 'may', text: '...조금만 더 생각해 볼게요. 그래도 고마워요.', next: 'n2' },
  ] },

  { id: 'd1_q05_offer', nodes: [
    line('n0', 'npc_dance_teacher', '월말평가다. 보컬, 댄스, 랩 순서로 본다.', 'n1'),
    line('n1', 'npc_dance_teacher', '평가장 문은 오른쪽 위. 준비되면 들어가. 한 달 동안 한 거, 다 보여 줘.'),
  ] },
  one('d1_q05_progress', 'npc_dance_teacher', '평가장은 오른쪽 위 문이야. 심사위원단이 기다려.'),
  { id: 'd1_q05_complete', nodes: [
    line('n0', 'npc_dance_teacher', '통과. 데뷔조야.', 'n1'),
    line('n1', 'narrator', '2024년 2월, 더뮤즈엔터테인먼트는 새 걸그룹의 COMING SOON을 띄웠다.', 'n2'),
    line('n2', 'narrator', '이름은 RESCENE. 향기로 장면을 다시 떠올린다는 뜻이었다.'),
  ] },
];
