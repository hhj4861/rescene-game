export const GAMES={
 drive:{member:'woni',name:'원이',title:'파이리 팡팡',line:'파이리 나왔다! 같이 잡자!',hint:'나타난 파이리를 톡! 금빛은 두 배예요.',color:'mint',guide:'9개 구멍에서 나타나는 파이리를 눌러요. 금빛 파이리는 두 배, 연속 성공은 추가 점수! 놓치면 목숨 하나가 줄어요.',keys:'구멍 터치 · 숫자 1~9',extra:'연속 성공'},
 blocks:{member:'may',name:'메이',title:'보글보글 공방',line:'방울에 가두고, 팡! 신나지?',hint:'방울로 가두고, 가까이에서 한 번 더 팡!',color:'peach',guide:'좌우로 이동하고 점프로 발판에 올라가요. 방울 버튼으로 적을 가둔 뒤 가까이에서 다시 누르거나 닿으면 팡! 갇힌 적은 5초 뒤 풀려나고, 맨몸으로 부딪히면 목숨이 줄어요.',keys:'← → 이동 · Space 점프 · F 방울',extra:'터뜨린 방울'},
 photo:{member:'zena',name:'제나',title:'신라빵',line:'갓 구운 빵! 연쇄로 더 맛있게!',hint:'이웃한 빵 두 개를 바꿔 같은 빵 3개!',color:'rose',guide:'빵을 하나 누르고 이웃한 빵을 눌러 자리를 바꿔요. 같은 빵 3개가 맞으면 팡! 4개 이상은 십자 폭발 빵, 연쇄는 배수 점수예요. 교환 횟수 안에 목표를 채워요. 안 맞는 교환은 횟수를 쓰지 않아요.',keys:'빵 두 개 터치 · 방향키 탐색 / Enter 선택',extra:'남은 교환'},
 rhythm:{member:'minami',name:'미나미',title:'펌프 댄스타임',line:'다섯 발판으로, 우리 무대 시작!',hint:'올라오는 화살표가 위 판정선에 닿으면 톡!',color:'lilac',guide:'화살표가 위쪽 발판에 겹치면 같은 방향을 눌러요. ↙ ↖ ● ↗ ↘ 다섯 방향! 3단계부터 동시 발판도 나와요. 놓치면 목숨이 줄고, 연속 성공은 추가 점수예요.',keys:'Z ↙ · Q ↖ · S ● · E ↗ · C ↘',extra:'연속 성공'},
 catch:{member:'liv',name:'리브',title:'별빛 디펜스',line:'우리 별빛 정원, 내가 지킬게!',hint:'빈 칸에 수비대 배치, 다시 누르면 강화!',color:'sky',guide:'세 길의 빈 칸을 누르면 별 2개로 수비대를 세워요. 같은 칸을 다시 누르면 별 3개로 강화해요. 별은 자동으로 모이고 적을 막아도 받아요. 위험할 땐 별빛 파동! 적이 왼쪽 끝에 닿으면 목숨이 줄어요.',keys:'수비 칸 터치 · 숫자 1~6 · Space 파동',extra:'배치용 별'},
};
export function extraValue(s){return s.kind==='blocks'?s.popped:s.kind==='photo'?s.moves:s.kind==='catch'?s.energy:s.combo;}
export function resultLine(s){return s.kind==='drive'?`파이리 ${s.hits}번 · 최고 ${s.bestCombo}콤보`:s.kind==='blocks'?`방울 ${s.popped}개를 터뜨렸어요!`:s.kind==='photo'?`빵 ${s.collected}개를 구웠어요!`:s.kind==='catch'?`정원을 ${s.defeated}번 지켰어요!`:`성공 ${s.hits}번 · 최고 ${s.bestCombo}콤보`;}
export const REACTIONS={
 'whack-hit':['잡았다! 손발이 척척이네!'],'whack-gold':['금빛 파이리! 두 배다!'],'whack-miss':['다음 파이리는 같이 잡자!'],
 'bubble-trap':['가뒀어! 가까이에서 팡 해봐!'],'bubble-pop':['팡! 방울 터뜨리는 맛이지!'],'bubble-miss':['다시, 방울부터 불어보자!'],
 'bread-match':['갓 구운 빵 나왔어요!'],'bread-chain':['연쇄로 팡팡! 신라빵 대박!'],'bread-invalid':['같은 빵 세 개를 맞춰봐.'],'bread-shuffle':['새로운 빵판, 준비됐지?'],
 'rhythm-perfect':['PERFECT! 발판을 지배했어!'],'rhythm-good':['좋아! 리듬 그대로!'],'rhythm-early':['위쪽 발판에 겹칠 때 톡!'],'rhythm-miss':['다음 박자부터 다시 같이!'],
 'defense-build':['든든한 수비대, 준비 완료!'],'defense-hit':['별빛 정원은 안전해!'],'defense-burst':['별빛 파동! 한 번에 밀어내자!'],'defense-miss':['다음 길을 더 단단하게 지키자!'],
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
