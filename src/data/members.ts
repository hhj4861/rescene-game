import type { MemberDef } from './schema';

// 음성·말투 v2. 부록(2026-09-06-rescene-character-v2-design.md) §4 표를 그대로 반영한다.
// lines는 전부 창작 문장이다(실제 발언·인터뷰 인용 금지, 실명·타 그룹 이름 금지, 말풍선용 30자 이내).
export const MEMBERS: MemberDef[] = [
  {
    id: 'woni', name: '원이', role: '리더 · 서브보컬', hometown: '거제', color: '#045a42',
    attack: 'melee', weapon: '마이크 스탠드',
    atk: 10, spd: 5, jump: 5, basicSkill: 'woni_basic', superSkill: 'woni_ui', superText: '우이!',
    voice: { baseHz: 210, syllableMs: 90, wave: 'square', accent: 'fall', spread: 1.0 },
    lines: {
      cheer: ['마! 힘내라!', '잘하고 있다, 계속 가자!', '우이! 그기 맞다!'],
      win: ['우이! 오늘도 해냈다!', '봐라, 우리가 1등 했다!', '다들 고생했데이!'],
      hurt: ['아야! 마 아프다!', '이기 뭐꼬!', '잠깐, 숨 좀 돌리자!'],
      card: ['오, 이거 좋네!', '마 잘 챙겼다!', '우이! 득템했나!'],
    },
  },
  {
    id: 'liv', name: '리브', role: '메인보컬', hometown: '수원', color: '#ffb3c6',
    attack: 'ranged', weapon: '핸드 마이크',
    atk: 8, spd: 6, jump: 5, basicSkill: 'liv_basic', superSkill: 'liv_pitch', superText: '너도? 나도!',
    voice: { baseHz: 330, syllableMs: 85, wave: 'triangle', accent: 'flat', spread: 0.8 },
    lines: {
      cheer: ['할 수 있어요, 천천히 가요.', '너도? 나도 응원할게요!', '괜찮아요, 잘하고 있어요.'],
      win: ['우리, 해냈네요.', '너도? 나도 정말 기뻐요!', '다음에도 함께해요.'],
      hurt: ['아, 조금 아프네요.', '잠시만요, 숨 고를게요.', '괜찮아요, 다시 가볼게요.'],
      card: ['좋은 걸 얻었네요.', '너도? 나도 반가워요!', '소중히 쓸게요.'],
    },
  },
  {
    id: 'minami', name: '미나미', role: '메인보컬 · 메인댄서', hometown: '치바', color: '#ffd166',
    attack: 'ranged', weapon: '붓',
    atk: 9, spd: 6, jump: 6, basicSkill: 'minami_basic', superSkill: 'minami_brush', superText: '거제, 야호~!',
    voice: { baseHz: 400, syllableMs: 60, wave: 'pulse', accent: 'rise', spread: 1.3 },
    lines: {
      cheer: ['에~ 힘내세요, 화이팅!', '야호~! 잘하고 있어요!', '스고이, 계속 가봐요!'],
      win: ['야호~! 우리가 1등이에요!', '스고이, 다 같이 해냈어요!', '에~ 정말 기뻐요!'],
      hurt: ['아야, 죄송합니다…', '에~ 좀 아파요!', '잠깐만요, 다시 갈게요!'],
      card: ['와, 스고이한 아이템!', '에~ 이거 좋아요!', '야호~! 득템했어요!'],
    },
  },
  {
    id: 'may', name: '메이', role: '서브보컬 · 킬링파트', hometown: '고양', color: '#ffe08a',
    attack: 'ranged', weapon: '스티커',
    atk: 7, spd: 7, jump: 6, basicSkill: 'may_basic', superSkill: 'may_chatter', superText: '기회는 그립감이 좋다',
    voice: { baseHz: 350, syllableMs: 55, wave: 'pulse', vibrato: 6, accent: 'bounce', spread: 1.2 },
    lines: {
      cheer: ['가자가자, 기회는 지금이야!', '힘내힘내, 기회는 그립감이 좋다!', '빨리빨리, 다 잡을 수 있어!'],
      win: ['우리가 해냈어, 완전 대박!', '역시 기회는 그립감이 좋다니까!', '다음 무대도 기대해줘!'],
      hurt: ['아야아야, 잠깐 스톱!', '이거 좀 따가운데!', '괜찮아 괜찮아, 계속가자!'],
      card: ['오 이거 완전 대박템!', '역시 기회는 잡아야 제맛!', '빨리 챙기자, 좋은 거야!'],
    },
  },
  {
    id: 'zena', name: '제나', role: '메인댄서 · 리드보컬', hometown: '경주', color: '#c77dff',
    attack: 'melee', weapon: '헤어핀',
    atk: 10, spd: 8, jump: 5, basicSkill: 'zena_basic', superSkill: 'zena_turn', superText: '아뉘이이이!',
    voice: { baseHz: 250, syllableMs: 70, wave: 'square', accent: 'fall', spread: 0.7 },
    lines: {
      cheer: ['힘내요.', '가봐요, 할 수 있어요.', '아뉘, 더 잘할 수 있어요.'],
      win: ['이겼다.', '그게 뭔데요, 1등이잖아요.', '다음도 가봐요.'],
      hurt: ['아야.', '아뉘, 아파요.', '잠깐만요.'],
      card: ['이거 뭔데요?', '오, 좋은 거네요.', '아뉘, 득템했어요.'],
    },
  },
];
