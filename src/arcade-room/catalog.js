export const GAMES={
  drive:{member:'woni',name:'원이',title:'바닷길 드라이브',line:'바다 보러 갈래? 내가 운전할게!',hint:'좌우로 피하고, 별빛을 모아요.',color:'mint',guide:'차는 자동으로 달려요. 좌우 버튼이나 길을 눌러 별을 모아요. 10초 뒤부터 점점 빨라져요. 세 번 부딪히면 이번 여행은 끝!',keys:'← → 이동 · 길 터치',extra:'남은 기회'},
  blocks:{member:'may',name:'메이',title:'조각 공방',line:'작은 조각도 모이면 예뻐질 거야.',hint:'조각을 맞춰 한 줄을 채워요.',color:'peach',guide:'좌우로 옮기고 회전해 한 줄을 채워요. 점선은 내려놓을 자리예요. 10초 뒤부터 조각이 점점 빨리 내려와요. 위까지 쌓이면 완성!',keys:'← → 이동 · ↑ 회전 · Space 내려놓기',extra:'완성한 줄'},
  photo:{member:'zena',name:'제나',title:'깜짝 포토부스',line:'준비됐지? 우리 표정 남기자!',hint:'불빛이 가운데 오면 찰칵!',color:'rose',guide:'불빛이 가운데 노란 칸에 오면 찰칵! 10초 뒤부터 불빛이 빨라지고 노란 칸이 좁아져요. 놓쳐도 60초 동안 다시 찍어요.',keys:'Space 또는 찰칵 버튼',extra:'멋진 사진'},
  rhythm:{member:'minami',name:'미나미',title:'댄스 타임',line:'왼쪽, 오른쪽! 같이 춰 볼까?',hint:'음표가 선에 닿으면 같은 쪽을 톡!',color:'lilac',guide:'음표가 아래 선에 닿으면 같은 쪽 버튼을 눌러요. 10초 뒤부터 박자가 빨라지니 선에 더 정확히 맞춰봐요. 놓쳐도 끝나지 않고, 소리 없이도 할 수 있어요.',keys:'← → 또는 A / L',extra:'연속 성공'},
  catch:{member:'liv',name:'리브',title:'별빛 산책',line:'오늘은 어떤 별을 만나게 될까?',hint:'좌우로 움직여 떨어지는 별을 받아요.',color:'sky',guide:'좌우 버튼이나 별길을 눌러 바구니를 옮겨요. 파란 별은 두 배! 10초 뒤부터 별이 더 자주, 빠르게 내려와요. 놓쳐도 60초 내내 함께 걸어요.',keys:'← → 이동 · 별길 터치/드래그',extra:'모은 별'},
};
export function extraValue(s){return s.kind==='drive'?'♥ '.repeat(s.hearts).trim()||'—':s.kind==='blocks'?s.lines:s.kind==='photo'?s.perfect:s.kind==='rhythm'?s.combo:s.stars;}
export function resultLine(s){return s.kind==='drive'||s.kind==='catch'?`별빛 ${s.stars}개를 모았어요.`:s.kind==='blocks'?`${s.lines}줄의 조각을 완성했어요.`:s.kind==='photo'?`찰칵 ${s.shots}번 · 멋진 사진 ${s.perfect}장`:`성공 ${s.hits}번 · 최고 연속 ${s.bestCombo}번`;}
export const REACTIONS={
  star:['반짝! 별빛 하나 더 모았어.','바다까지 조금만 더 가자!'],bump:['괜찮아, 천천히 다시 가자.','다음 길은 같이 살펴보자.'],
  line:['짜잔! 조각들이 딱 맞았어.','우리가 만든 무늬, 예쁘다!'],place:['좋아, 다음 조각도 같이 맞춰 보자.','작은 조각도 소중해.'],
  'photo-perfect':['지금 표정, 완벽해!','이건 꼭 간직하자!'],'photo-good':['찰칵! 우리답게 나왔어.','다음엔 다른 표정 해 볼까?'],'photo-miss':['앗, 내가 먼저 웃었네!','괜찮아, 또 찍으면 되지!'],
  'rhythm-perfect':['딱 맞았어! 이 느낌이야.','우리 호흡 잘 맞는다!'],'rhythm-good':['좋아, 리듬을 타고 있어!','왼쪽, 오른쪽, 같이 가자.'],'rhythm-early':['선에 닿을 때 톡 눌러봐.'],'rhythm-miss':['다음 음표부터 다시 같이!'],
  'catch-star':['작은 별 하나, 우리 주머니에.','오늘 밤도 반짝이네.'],'blue-star':['파란 별이다! 두 배로 반짝여.'],'catch-miss':['저 별은 하늘에 남겨두자.'],
};
