import type { MemeDef } from './schema';

export const MEMES: MemeDef[] = [
  { id: 'woni_ui', member: 'woni', text: '우이!', origin: '원이의 시그니처 감탄사', note: '감정이 북받칠 때 나오는 소리. 팬들이 인사처럼 따라 한다.', passive: { key: 'atk', value: 2 } },
  { id: 'woni_doyouknow', member: 'woni', text: '리센느 아세요?', origin: '무명기 홍보 멘트', note: '알려지지 않았던 시절 어디서든 물어보던 말. 지금은 반전의 상징.', passive: { key: 'fameGain', value: 0.1 } },
  { id: 'liv_youtoo', member: 'liv', text: '너도? 나도!', origin: '안녕하세요원이입니다잘부탁드립니다 첫 출연', note: '리브의 대표 유행어.', passive: { key: 'spd', value: 1 } },
  { id: 'liv_motto', member: 'liv', text: '천천히 가도 멈추지 말자', origin: '리브의 좌우명', note: '연습생 시절부터 지켜온 말.', passive: { key: 'hp', value: 10 } },
  { id: 'minami_yaho', member: 'minami', text: '거제, 야호~!', origin: '2026년 봄, 원이 유튜브 갸루 일본어 강의 편', note: "'야호'가 한국어 감탄사이자 일본어 인사말이라 생긴 반전. 2026 올해의 유행어로 꼽히며 거제시 홍보대사 위촉으로 이어졌다.", passive: { key: 'aoeRange', value: 0.1 } },
  { id: 'minami_sorry', member: 'minami', text: '죄송합니다', origin: '미나미가 처음 배운 한국어', note: '방과후 설렘 참가 3일 전 한국어 공부를 시작했다.', passive: { key: 'def', value: 2 } },
  { id: 'may_grip', member: 'may', text: '기회는 그립감이 좋다', origin: '메이의 대표 유행어', note: '양손을 모으는 포즈와 함께.', passive: { key: 'luk', value: 5 } },
  { id: 'may_chance', member: 'may', text: '기회를 잡는 것도 기회가 와야 잡을 수 있는 거야', origin: '메이의 인생 명언', note: '연습생 시절을 버티게 한 말.', passive: { key: 'foodHeal', value: 0.2 } },
  { id: 'zena_whatisit', member: 'zena', text: '그게 뭔데요?', origin: '제나의 대표 유행어', note: '모르는 개념을 들었을 때의 반응.', passive: { key: 'statusDuration', value: -0.2 } },
  { id: 'zena_ani', member: 'zena', text: '아뉘이이이!', origin: '제나의 시그니처 투정', note: '억울할 때 나오는 소리.', passive: { key: 'mp', value: 10 } },
];
