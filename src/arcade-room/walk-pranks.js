// Friendly cameos: one visit per member per stage, with a warning before effects.
export const PRANK_MEMBERS=['liv','may','minami','zena'];
export const PRANK_NAMES={liv:'리브',may:'메이',minami:'미나미',zena:'제나'};
export const PRANK_HINTS={liv:'하트 구름 · 아래쪽 길을 살펴요',may:'방울 장난 · 이동이 느려져요',minami:'좌우 반전 · 반대쪽을 눌러요',zena:'빵 장애물 · 점프하거나 공격해요'};
export const prankActive=(s,member)=>s.prank?.member===member&&s.prank.warning===0&&s.prank.time>0;
export function prankMessage(s){const p=s.prank;return p?`${PRANK_NAMES[p.member]} 등장! ${p.warning>0?`곧 ${PRANK_HINTS[p.member]}`:`${PRANK_HINTS[p.member]} · ${Math.ceil(p.time)}초`}`:'';}
export function validPranks(s){
 const p=s.prank;
 return Number.isInteger(s.prankIndex)&&s.prankIndex>=0&&s.prankIndex<=4&&(p===null||p&&s.prankIndex>0&&p.member===PRANK_MEMBERS[(s.prankIndex-1+(s.stage-1)%4)%4]&&Number.isFinite(p.warning)&&p.warning>=0&&p.warning<=1.5&&Number.isFinite(p.time)&&p.time>0&&p.time<=4&&Number.isInteger(p.lane)&&p.lane>=0&&p.lane<3);
}
export function stepPranks(s,dt){
 if(s.prank){
  const p=s.prank;
  if(p.warning>0){p.warning=Math.max(0,p.warning-dt);if(p.warning===0&&p.member==='zena')s.objects.push({id:s.nextObject++,lane:p.lane,y:110,kind:'bread',hp:1});}
  else{p.time=Math.max(0,p.time-dt);if(!p.time){s.prank=null;s.event='walk-prank-end';}}
 }
 if(!s.prank&&s.prankIndex<4&&s.elapsed>=10+s.prankIndex*15){
  const member=PRANK_MEMBERS[(s.prankIndex+(s.stage-1)%4)%4];s.prankIndex++;
  s.prank={member,warning:1.5,time:4,lane:(s.stage+s.prankIndex)%3};s.event='walk-prank';
 }
}
