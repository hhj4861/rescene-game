import {walkLaneQuota} from './walk.js';
const lanes=['왼쪽','가운데','오른쪽'];
export const breadName=value=>['빈칸','식빵','도넛','컵케이크','소보로빵','말차빵'][value%10];
export function interactionHints(kind){
 if(kind==='drive')return `<div class="play-guidance"><div class="lane-stamps" aria-label="길별 간식 수집">${lanes.map((name,i)=>`<span data-lane-stamp="${i}">${name} ○</span>`).join('')}</div><span class="sr-only" id="interaction-hint" role="status" aria-live="polite"></span></div>`;
 if(kind==='photo')return '<p class="play-guidance" id="interaction-hint" role="status" aria-live="polite"></p>';
 return '';
}
export function syncInteractionHints(app,s){
 const hint=app.querySelector('#interaction-hint');if(!hint)return;
 let message;
 if(s.kind==='drive'){
  const missing=lanes.filter((_,i)=>s.laneTreats[i]<walkLaneQuota(s));
  message=missing.length?`${missing.join('·')} 길의 간식을 각각 ${walkLaneQuota(s)}개 모아요.`:'세 길 수집 완료! 목표 간식을 채워요.';
  app.querySelectorAll('[data-lane-stamp]').forEach((el,i)=>{
   const quota=walkLaneQuota(s),done=s.laneTreats[i]>=quota,label=`${lanes[i]} ${Math.min(quota,s.laneTreats[i])}/${quota} ${done?'✓':'○'}`;
   if(el.textContent!==label)el.textContent=label;
   el.dataset.collected=String(done);el.setAttribute('aria-label',`${lanes[i]} 길: ${done?'수집 완료':'간식 필요'}`);
  });
 }else if(s.linkVersion){
  message=s.linkMessage||(s.selected>=0?`${breadName(s.board[s.selected])} 선택 · 같은 빵을 하나 더 눌러요.`:'같은 빵 두 개를 골라요. 선은 두 번까지 꺾을 수 있어요.');
  app.querySelectorAll('.field-controls button').forEach(el=>{el.dataset.swapTarget='false';});
 }else{
  const size=Math.round(Math.sqrt(s.board.length)),selected=s.selected>=0&&s.board[s.selected]&&!s.flash&&!s.itemArmed;
  const neighbors=s.board.map((v,i)=>selected&&v&&Math.abs(Math.floor(i/size)-Math.floor(s.selected/size))+Math.abs(i%size-s.selected%size)===1);
  message=s.itemArmed?'밀대로 지울 가로줄을 골라요.':s.flash?'퍼즐을 없애고 십원빵을 찾고 있어요.':selected&&!neighbors.some(Boolean)?'이 빵은 이웃이 없어요. 다른 빵이나 밀대를 골라요.':selected?`${Math.floor(s.selected/size)+1}행 ${s.selected%size+1}열 ${breadName(s.board[s.selected])} 선택 · 점선 칸과 교환해요.`:'빵 하나를 고른 뒤 이웃한 빵을 눌러요.';
  if(!s.itemArmed&&!s.flash&&app.querySelector('[data-bread-zoom]')?.getAttribute('aria-pressed')==='true')message+=' 확대 중에는 밀어서 이동해요.';
  app.querySelectorAll('.field-controls button').forEach((el,i)=>{
   el.dataset.swapTarget=String(!!neighbors[i]);
  });
 }
 if(hint.textContent!==message)hint.textContent=message;
}
