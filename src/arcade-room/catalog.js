export const GAMES={
 drive:{member:'woni',name:'원이',title:'파이리 불꽃추격',line:'달리는 파이리! 같이 따라잡자!',hint:'달리는 파이리를 톡! 5연속이면 피버!',color:'mint',guide:'달리고 점프하는 파이리를 따라 눌러요. 5연속 성공하면 6초 피버! 피버는 점수 두 배, 놓쳐도 목숨을 지켜줘요. 금빛 파이리는 추가 점수예요. 평소에는 화면 끝으로 놓치면 목숨 하나가 줄어요.',keys:'파이리 직접 터치 · 표시된 숫자 1~9',extra:'연속 성공'},
 blocks:{member:'may',name:'메이',title:'보글보글 공방',line:'방울에 가두고, 팡! 신나지?',hint:'방울로 가두고, 가까이에서 한 번 더 팡!',color:'peach',guide:'좌우를 누르면 그쪽을 보고 이동해요. 뒤돌기(X)는 제자리에서 방향만 바꿔요. 점프로 발판에 올라가요. 방울 버튼으로 적을 가둔 뒤 가까이에서 다시 누르거나 닿으면 팡! 갇힌 적은 5초 뒤 풀려나고, 맨몸으로 부딪히면 목숨이 줄어요.',keys:'← → 이동 · X 뒤돌기 · Space 점프 · F 방울',extra:'터뜨린 방울'},
 photo:{member:'zena',name:'제나',title:'신라빵',line:'갓 구운 빵! 연쇄로 더 맛있게!',hint:'빵을 밀어 같은 빵 3개를 맞춰요!',color:'rose',guide:'빵을 이웃한 칸으로 밀어 자리를 바꿔요. 두 번 눌러 교환할 수도 있어요. 같은 빵 3개가 맞으면 팡! 4개 이상은 십자 폭발 빵, 연쇄는 배수 점수예요. 교환 횟수 안에 목표를 채워요. 안 맞는 교환은 횟수를 쓰지 않아요.',keys:'빵 드래그 또는 두 번 터치 · 방향키 탐색 / Enter 선택',extra:'남은 교환'},
 rhythm:{member:'minami',name:'미나미',title:'펌프 댄스타임',line:'다섯 발판으로, 우리 무대 시작!',hint:'올라오는 화살표가 위 판정선에 닿으면 톡!',color:'lilac',guide:'음악의 박자에 맞춰 화살표가 위쪽 발판에 겹치면 같은 방향을 눌러요. ↙ ↖ ● ↗ ↘ 다섯 방향! 3단계부터 동시 발판도 나와요. 놓치면 목숨이 줄고, 연속 성공은 추가 점수예요.',keys:'Z ↙ · Q ↖ · S ● · E ↗ · C ↘',extra:'연속 성공'},
 catch:{member:'liv',name:'리브',title:'별빛 진격대',line:'좋은 길을 골라! 우리 함께 전진!',hint:'좌우로 길 선택 · 사격은 자동이에요!',color:'sky',guide:'세 길 중 하나를 선택해 숫자 게이트를 통과해요. +와 ×로 대원을 늘리고 -는 피해요. 사격은 자동! 적을 5번 격파해야 별빛 지원을 쓸 수 있어요. 적이 뒤로 빠져나가거나 대원이 모두 사라지면 목숨이 줄어요.',keys:'← → 이동 · 길 터치 / 숫자 1~3 · Space 지원',extra:'대원 수'},
};
export function extraValue(s){return s.kind==='blocks'?s.popped:s.kind==='photo'?s.moves:s.kind==='catch'?s.squad:s.combo;}
export function resultLine(s){return s.kind==='drive'?`파이리 ${s.hits}번 · 최고 ${s.bestCombo}콤보`:s.kind==='blocks'?`방울 ${s.popped}개를 터뜨렸어요!`:s.kind==='photo'?`빵 ${s.collected}개를 구웠어요!`:s.kind==='catch'?`적 ${s.defeated}팀을 격파했어요!`:`성공 ${s.hits}번 · 최고 ${s.bestCombo}콤보`;}
export const REACTIONS={
 'whack-fever':['불꽃 피버! 지금이야, 더 빠르게!'],'whack-hit':['잡았다! 손발이 척척이네!'],'whack-gold':['금빛 파이리! 두 배다!'],'whack-miss':['다음 파이리는 같이 잡자!'],
 'bubble-trap':['가뒀어! 가까이에서 팡 해봐!'],'bubble-pop':['팡! 방울 터뜨리는 맛이지!'],'bubble-miss':['다시, 방울부터 불어보자!'],
 'bread-match':['갓 구운 빵 나왔어요!'],'bread-chain':['연쇄로 팡팡! 신라빵 대박!'],'bread-invalid':['같은 빵 세 개를 맞춰봐.'],'bread-shuffle':['새로운 빵판, 준비됐지?'],
 'rhythm-perfect':['PERFECT! 발판을 지배했어!'],'rhythm-good':['좋아! 리듬 그대로!'],'rhythm-early':['위쪽 발판에 겹칠 때 톡!'],'rhythm-miss':['다음 박자부터 다시 같이!'],
 'defense-gate':['대원이 모였어! 함께 앞으로!'],'defense-hit':['좋아! 길을 열었어!'],'defense-burst':['별빛 파동! 한 번에 밀어내자!'],'defense-miss':['뒤로 빠져나가기 전에 막아줘!'],
};
// Catchphrases from source research; adapted lines are labeled separately from recordings.
export const SIGNATURES={
  woni:{line:'오이쉬에~',label:'원이의 힘찬 응원',motion:'cheer'},
  may:{line:'클리어는 그립감이 좋다',adapted:true,label:'메이의 윙크',motion:'wink'},
  zena:{line:'내는 원래 이 순간을 싸랑해~',adapted:true,label:'제나의 볼꽃 포즈',motion:'cheek'},
  minami:{line:'거제 야호~',label:'미나미의 댄스 브이',motion:'dance'},
  liv:{line:'너도? 아 나도!' ,label:'리브의 손하트',motion:'heart'},
};

for(const game of Object.values(GAMES))game.guide+=' 목숨 3개로 시작하고, 60초 안에 클리어하면 남은 목숨으로 더 어려운 다음 단계에 도전해요.';
