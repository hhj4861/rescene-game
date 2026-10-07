export const GAMES={
 drive:{member:'woni',name:'원이',title:'파이리 불꽃모험',line:'파이리와 함께, 불꽃으로 길을 열자!',hint:'열매는 모으고 물방울은 피하기 · F로 바위 파괴',color:'mint',guide:'파이리를 좌우 세 길로 움직여 열매를 모아요. 바위는 F 또는 불꽃 버튼으로 부수고, 물방울은 길을 바꿔 피해요. 열매 5개를 연속으로 모으면 8초 불꽃 피버! 피버 동안 충돌에 안전하고 불꽃도 더 빠르게 나가요. 90초 안에 목표 열매를 모으면 다음 단계로 가요.',keys:'← → 이동 · 숫자 1~3 길 선택 · F / Space 불꽃',extra:'연속 열매'},
 blocks:{member:'may',name:'메이',title:'보글보글 공방',line:'방울에 가두고, 팡! 신나지?',hint:'방울로 가두고, 가까이에서 한 번 더 팡!',color:'peach',guide:'좌우를 누르면 그쪽을 보고 이동해요. 뒤돌기(X)는 제자리에서 방향만 바꿔요. 점프로 발판에 올라가요. 빈 방울 위에 착지하면 방울이 터지며 더 높이 튀어 올라요. 방울 버튼으로 적을 가둔 뒤 가까이에서 다시 누르거나 닿으면 팡! 가까운 방울을 터뜨리면 붙어 있는 방울도 연쇄로 팡! 적은 발판을 오가며 쫓아오고, 3~4.5초 안에 못 터뜨리면 빨갛게 변해 더 빨라져요. 120초부터 모든 적이 빨라져요. 맨몸으로 부딪히면 목숨이 줄어요. 떨어진 » 아이템은 이동 1.5배, ○ 아이템은 큰 방울! 세 번째 격파마다 나오는 ♪ 스페셜 아이템 꿀보이스를 직접 먹으면 메이 노래가 1분간 나와요. 일반 속도·크기 아이템은 노래를 재생하지 않아요. 스테이지가 바뀌어도 노래는 이어져요. 속도와 큰 방울 효과는 10초 동안 유지돼요.',keys:'← → 이동 · X 뒤돌기 · Space 점프 · F 방울',extra:'터뜨린 방울'},
 photo:{member:'zena',name:'제나',title:'신라빵',line:'갓 구운 빵! 연쇄로 더 맛있게!',hint:'빵을 밀어 같은 빵 3개를 맞춰요!',color:'rose',guide:'♪ 반짝 빵을 터뜨리면 노래 아이템이 나와요. 노래 아이템 줍기 버튼으로 직접 획득하면 제나 노래가 1분간 나와요. 스테이지가 바뀌어도 노래는 이어져요. 빵판은 6×6으로 시작해 스테이지마다 7×7, 8×8, 9×9, 최대 10×10으로 커져요. 빵을 이웃한 칸으로 밀어 자리를 바꿔요. 두 번 눌러 교환할 수도 있어요. 같은 빵 3개가 맞으면 팡! 4개 이상은 십자 폭발 빵, 연쇄는 배수 점수예요. 교환 횟수 안에 목표를 채워요. 안 맞는 교환은 횟수를 쓰지 않아요. 밀대(R)를 누르고 빵을 고르면 그 줄을 지워요. 처음 1개, 연쇄 3회마다 충전하며 최대 2개예요.',keys:'빵 드래그 또는 두 번 터치 · 방향키 탐색 / Enter 선택 · R 밀대 · H 섞기',extra:'남은 교환'},
 rhythm:{member:'minami',name:'미나미',title:'펌프 댄스타임',line:'다섯 발판으로, 우리 무대 시작!',hint:'올라오는 화살표가 위 판정선에 닿으면 직접 클릭·터치!',color:'lilac',guide:'곡과 발판 난이도를 고른 뒤 60초 음악의 박자에 맞춰 올라오는 화살표가 위 판정선에 겹칠 때 그 화살표를 직접 클릭하거나 터치해요. 너무 일찍 누르면 점수가 나지 않아요. 키보드 Z·Q·S·E·C도 사용할 수 있어요. 생명 게이지 50%로 시작해 성공하면 채워지고, 콤보가 높을수록 더 많이 채워져요. 미스마다 12%가 줄고 0%가 되면 즉시 게임이 끝나요. ↙ ↖ ● ↗ ↘ 다섯 방향! 3단계부터 동시 화살표도 나와요. 두 손가락 터치나 키보드로 함께 맞춰요. 놓치면 게이지가 줄고 콤보가 끊기고, 연속 성공은 추가 점수예요.',keys:'Z ↙ · Q ↖ · S ● · E ↗ · C ↘',extra:'연속 성공'},
 catch:{member:'liv',name:'리브',title:'별빛 진격대',line:'좋은 길을 골라! 우리 함께 전진!',hint:'좌우로 길 선택 · 사격은 자동이에요!',color:'sky',guide:'세 길 중 하나를 선택해 숫자 게이트를 통과해요. +는 대원과 연사 속도, ×는 대원과 탄 수를 늘려요. -는 피해요. 러브어택은 하트 탄환, 핀볼은 연쇄 반사, Heart Drop은 하트 비, YoYo는 왕복 관통탄, New World는 세 길 동시 공격! 곡 아이템을 먹으면 노래는 20초, 특수공격은 30초! 다섯 곡은 획득 순서대로 돌아가며, 재도전과 다음 스테이지에도 순서가 이어져요. 다음 곡 아이템은 최소 24초 뒤에 나와요. +2~3, ×1.5 게이트로 대원을 키우고 더 단단한 적과 몰려오는 무리를 막아요. 첫 곡 아이템을 먹고 2분이 지난 뒤 구름왕 보스가 나와요. 추가 아이템을 먹어도 등장 시간이 밀리지 않아요. 최대 5분 안에 보스를 쓰러뜨려야 클리어예요. 사격은 자동! 적을 5번 격파해야 별빛 지원을 쓸 수 있어요. 적이 뒤로 빠져나가거나 대원이 모두 사라지면 목숨이 줄어요.',keys:'← → 이동 · 길 터치 / 숫자 1~3 · Space 지원',extra:'대원 수'},
};
export function extraValue(s){return s.kind==='blocks'?s.popped:s.kind==='photo'?s.moves:s.kind==='catch'?s.squad:s.combo;}
export function resultLine(s){return s.kind==='drive'?`열매 ${s.hits}개 · 최고 ${s.bestCombo}콤보`:s.kind==='blocks'?`방울 ${s.popped}개를 터뜨렸어요!`:s.kind==='photo'?`빵 ${s.collected}개를 구웠어요!`:s.kind==='catch'?`적 ${s.defeated}팀을 격파했어요!`:`성공 ${s.hits}번 · MISS ${s.misses}번 · 최고 ${s.bestCombo}콤보`;}
export const REACTIONS={
 'bread-song':['제나의 노래 아이템! 1분 동안 함께해요!'],
 'flame-berry':['열매 발견! 파이리와 한 걸음 더!'],'flame-break':['불꽃으로 바위를 부쉈어!'],'flame-fever':['불꽃 피버! 힘차게 달려보자!'],'flame-miss':['물과 바위는 피해요!'],
 'bubble-jump':['방울 타고 폴짝!','더 높은 곳으로!'],
 'whack-fake':['앗, 가짜야! −150점 · 진짜만 잡자!'],'whack-fever':['불꽃 피버! 지금이야, 더 빠르게!'],'whack-hit':['잡았다! 손발이 척척이네!'],'whack-gold':['금빛 파이리! 두 배다!'],'whack-miss':['다음 파이리는 같이 잡자!'],
 'bubble-item':['아이템! 더 빠르고, 더 크게!'],'bread-item':['밀대로 한 줄 쭉!'],'defense-item':['별빛 아이템! 함께 더 강하게!'],'defense-boss':['구름왕이 왔어! 힘을 모으자!'],'defense-boss-clear':['우리가 해냈어! 별빛을 되찾았어!'],
 'bubble-chain':['연쇄로 팡팡! 방울을 모아봐!'],'bubble-escape':['앗, 풀려났어! 빨간 적을 조심해!'],
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

for(const [id,game] of Object.entries(GAMES))if(id!=='rhythm')game.guide+=` 목숨 3개로 시작하고, ${id==='blocks'?180:id==='catch'?300:id==='drive'?90:60}초 안에 클리어하면 남은 목숨으로 더 어려운 다음 단계에 도전해요. 스테이지마다 배경도 바뀌어요.`;
