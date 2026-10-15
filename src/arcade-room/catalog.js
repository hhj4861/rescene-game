import {foundBread} from './bakery-hunt.js';
export const GAMES={
 drive:{member:'woni',name:'원이',title:'별이랑 산책',line:'별아, 오늘은 어디까지 가볼까?',hint:'별이와 모험 · 몬스터 격파 · 파이리로 변신!',color:'mint',keys:'← → 이동 · 숫자 1~3 길 선택 · Space / ↑ 점프 · F 공격',extra:'연속 간식'},
 blocks:{member:'may',name:'메이',title:'보글보글 공방',line:'방울에 가두고, 팡! 신나지?',hint:'방울로 가두고, 가까이에서 한 번 더 팡!',color:'peach',keys:'← → 이동 · X 뒤돌기 · Space 점프 · F 방울',extra:'터뜨린 방울'},
 photo:{member:'zena',name:'제나',title:'십원빵',line:'갓 구운 빵! 연쇄로 더 맛있게!',hint:'빵을 밀어 같은 빵 3개를 맞춰요!',color:'rose',keys:'빵 드래그 또는 두 번 터치 · 방향키 탐색 / Enter 선택 · R 밀대 · H 섞기',extra:'남은 교환'},
 rhythm:{member:'minami',name:'미나미',title:'펌프 댄스타임',line:'다섯 발판으로, 우리 무대 시작!',hint:'올라오는 화살표가 위 판정선에 닿으면 직접 클릭·터치!',color:'lilac',keys:'Z ↙ · Q ↖ · S ● · E ↗ · C ↘',extra:'연속 성공'},
 catch:{member:'liv',name:'리브',title:'별빛 진격대',line:'좋은 길을 골라! 우리 함께 전진!',hint:'좌우로 길 선택 · 사격은 자동이에요!',color:'sky',keys:'← → 이동 · 길 터치 / 숫자 1~3 · Space 지원',extra:'대원 수'},
};
export function extraValue(s){return s.kind==='blocks'?(s.mayVersion===3?s.level:s.popped):s.kind==='photo'?(s.linkVersion?s.board.filter(Boolean).length/2:s.moves):s.kind==='catch'?s.squad:s.combo;}
export function resultLine(s){return s.kind==='drive'?`간식 ${s.hits}개 · 최고 ${s.bestCombo}콤보 · 몬스터 ${s.defeated}마리`:s.kind==='blocks'?(s.mayVersion===3?`몬스터 ${s.popped}마리 · 성장 레벨 ${s.level}`:`방울 ${s.popped}개를 터뜨렸어요!`):s.linkVersion?`음식 ${s.pairs}쌍을 연결했어요!`:s.kind==='photo'?`숨겨진 십원빵 ${foundBread(s)}개를 찾았어요!`:s.kind==='catch'?`적 ${s.defeated}팀을 격파했어요!`:`성공 ${s.hits}번 · MISS ${s.misses}번 · 최고 ${s.bestCombo}콤보`;}
export const REACTIONS={
 'walk-helper':['친구가 산책에 합류했어요!'],'walk-prank':['친구가 장난치러 왔어요! 예고를 살펴요.'],'walk-prank-end':['장난 끝! 다시 신나게 걸어요.'],'walk-bread-clear':['제나의 빵을 치웠어요!'],
 'bread-song':['제나의 노래 아이템! 1분 동안 함께해요!'],
 'walk-byeol-power':['별이 슈퍼 발바닥! 다른 길 몬스터도 맡겨줘!'],'walk-treat':['별이가 좋아하는 간식 발견!','원이랑 별이, 나란히 한 걸음!'],'walk-song':['♪ 이번 무대의 노래와 함께 걸어요!'],'walk-byeol':['별이가 도와줄게! 자동 추적 공격!'],'walk-clock':['시계 발견! 조금 더 산책하자!'],'walk-jump':['별이랑 함께 폴짝!'],'walk-fever':['신나는 산책! 8초 동안 안전해요!'],'walk-miss':['천천히! 물웅덩이는 돌아가요!'],
 'bubble-jump':['방울 타고 폴짝!','더 높은 곳으로!'],
 'bubble-item':['아이템! 더 빠르고, 더 크게!'],'bread-item':['밀대로 한 줄 쭉!'],'defense-item':['별빛 아이템! 함께 더 강하게!'],'defense-boss':['구름왕이 왔어! 힘을 모으자!'],'defense-boss-clear':['우리가 해냈어! 별빛을 되찾았어!'],
 'bubble-chain':['연쇄로 팡팡! 방울을 모아봐!'],'bubble-escape':['앗, 풀려났어! 빨간 적을 조심해!'],
 'bubble-trap':['가뒀어! 가까이에서 팡 해봐!'],'bubble-pop':['팡! 방울 터뜨리는 맛이지!'],'bubble-miss':['다시, 방울부터 불어보자!'],
 'bread-found':['십원빵 아이가!'],'bread-match':['갓 구운 빵 나왔어요!'],'bread-chain':['연쇄로 팡팡! 십원빵 대박!'],'bread-invalid':['같은 빵 세 개를 맞춰봐.'],'bread-shuffle':['새로운 빵판, 준비됐지?'],
 'rhythm-perfect':['PERFECT! 발판을 지배했어!'],'rhythm-good':['좋아! 리듬 그대로!'],'rhythm-early':['위쪽 발판에 겹칠 때 톡!'],'rhythm-miss':['다음 박자부터 다시 같이!'],
 'defense-gate':['대원이 모였어! 함께 앞으로!'],'defense-hit':['좋아! 길을 열었어!'],'defense-burst':['별빛 파동! 한 번에 밀어내자!'],'defense-miss':['뒤로 빠져나가기 전에 막아줘!'],
};
// Catchphrases from source research; adapted lines are labeled separately from recordings.
export const SIGNATURES={
  woni:{line:'오이쉬에~',label:'원이의 힘찬 응원',motion:'cheer'},
  may:{line:'클리어는 그립감이 좋다',adapted:true,label:'메이의 윙크',motion:'wink'},
  zena:{line:'내는 원래 이 순간을 싸랑해~',adapted:true,label:'제나의 볼꽃 포즈',motion:'cheek'},
  minami:{line:'덴사이샨데슈!',label:'미나미의 댄스 브이',motion:'dance'},
  liv:{line:'너도? 아 나도!' ,label:'리브의 손하트',motion:'heart'},
};



// Keep the original bubble game playable at ?may=classic as the requested backup.
export const CLASSIC_MAY={...GAMES.blocks};
export const SURVIVAL_MAY={...GAMES.blocks,title:'별빛 생존전',line:'몰려와도 괜찮아, 더 강해질 거야!',hint:'이동에 집중! 자동 공격 · 별 조각으로 성장 · 아이템 조합',keys:'방향키 / WASD 이동 · Space 대시 · 자동 공격',extra:'성장 레벨'};


export const LINK_ZENA={...GAMES.photo,title:'빵 사천성',line:'같은 음식끼리 길을 찾아 만나요!',hint:'같은 음식 두 개를 빈 길로 연결해요.',extra:'남은 짝',keys:'두 번 터치 · 방향키 탐색 / Enter 선택 · H 섞기 · R 힌트'};
