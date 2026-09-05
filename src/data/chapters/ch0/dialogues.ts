import type { DialogueScript } from '../../schema';

const line = (id: string, speaker: string, text: string, next?: string): DialogueScript['nodes'][number] =>
  next ? { id, speaker, text, next } : { id, speaker, text, end: true };

export const CH0_DIALOGUES: DialogueScript[] = [
  { id: 'd_woni_idle', nodes: [line('n0', 'woni', '우이! 오늘도 연습 가자.')] },
  { id: 'd_liv_idle', nodes: [line('n0', 'liv', '천천히 가도 멈추지 말자. 내 좌우명이야.')] },
  { id: 'd_minami_idle', nodes: [line('n0', 'minami', '한국어 아직 어렵지만... 죄송합니다, 는 제일 먼저 배웠어요.')] },
  { id: 'd_may_idle', nodes: [line('n0', 'may', '기회는 그립감이 좋다! ...라고 하면 좀 멋있죠?')] },
  { id: 'd_zena_idle', nodes: [line('n0', 'zena', '...')] },
  { id: 'd0_judge_idle', nodes: [line('n0', 'npc_audition_judge', '준비되면 오른쪽 문으로. 더뮤즈는 저 너머야.')] },

  { id: 'd0_woni_audition', nodes: [
    line('n0', 'npc_audition_judge', '거제에서 부산까지 매주 다녔다고? 뮤닥터 아카데미 원이 맞지?', 'n1'),
    line('n1', 'woni', '예. 중학교 때 댄스부 "성지뱀장어"도 제가 만들었습니다.', 'n2'),
    line('n2', 'npc_audition_judge', '뱀장어... 강하고 유연해서? 좋네. 더뮤즈로 가자.', 'n3'),
    line('n3', 'woni', '우이!'),
  ] },
  { id: 'd0_liv_audition', nodes: [
    line('n0', 'npc_audition_judge', 'JYP, SM, 더블랙레이블... 붙은 데가 이렇게 많은데 왜 여길?', 'n1'),
    line('n1', 'liv', '출구 없는 매력을 가진 리브입니다. 여기서 시작하고 싶어요.', 'n2'),
    line('n2', 'npc_audition_judge', '그 자신감, 무대에서 보자.'),
  ] },
  { id: 'd0_minami_audition', nodes: [
    line('n0', 'npc_audition_judge', '방과후 설렘 파이널까지 갔다가 일본으로 돌아갔었지.', 'n1'),
    line('n1', 'minami', '네. 그래도 다시 왔어요. 한국어는 참가 3일 전에 시작했는데, 지금은 꽤 해요.', 'n2'),
    line('n2', 'npc_audition_judge', '끈기 하나는 확실하네. 환영해.'),
  ] },
  { id: 'd0_may_audition', nodes: [
    line('n0', 'npc_audition_judge', '픽플래닛 홍대점 오디션에서 왔구나. 긴장했어?', 'n1'),
    line('n1', 'may', '조금요... 아니 많이요. 그래도 기회는 와야 잡을 수 있는 거니까요.', 'n2'),
    line('n2', 'npc_audition_judge', '좋은 말이네. 잡아 봐.'),
  ] },
  { id: 'd0_zena_audition', nodes: [
    line('n0', 'npc_audition_judge', '청춘스타 2라운드에서 봤어. 경주에서 이미 유명하던데?', 'n1'),
    line('n1', 'zena', '...', 'n2'),
    line('n2', 'npc_audition_judge', '말수는 적어도 무대에선 다르다는 거 알아. 더뮤즈로 가자.', 'n3'),
    line('n3', 'zena', '...그게 뭔데요?'),
  ] },
];
