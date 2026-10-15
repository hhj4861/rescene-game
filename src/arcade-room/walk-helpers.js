export const WALK_HELPERS=['liv','may','minami','zena'];
export const HELPER_NAMES={liv:'리브',may:'메이',minami:'미나미',zena:'제나'};
export const HELPER_SKILLS={liv:'하트',may:'길 정리',minami:'가속',zena:'간식'};
export const HELPER_SECONDS=20;
export const WONI_HEIGHT=94,HELPER_HEIGHT=WONI_HEIGHT/2,BYEOL_HEIGHT=WONI_HEIGHT/3;
export const helperActive=(s,member)=>s.songItemTime>0||(s.helpers?.[member]||0)>0;
export const activeHelpers=s=>WALK_HELPERS.filter(member=>helperActive(s,member));
export function helperPosition(s,member){
 const [dx,dy]={liv:[-105,-51],may:[80,-51],minami:[-105,17],zena:[80,17]}[member];
 return {x:Math.max(40,Math.min(440,s.x+dx)),y:514+dy};
}
export function helperStatus(s){return activeHelpers(s).map(member=>`${HELPER_NAMES[member]} ${HELPER_SKILLS[member]}`).join(' / ');}
export function validHelpers(s){
 const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
 return s.helpers&&Object.keys(s.helpers).length===4&&WALK_HELPERS.every(m=>finite(s.helpers[m],0,HELPER_SECONDS))&&Array.isArray(s.helperFx)&&s.helperFx.length<=4&&s.helperFx.every(e=>e&&WALK_HELPERS.includes(e.member)&&finite(e.x,40,440)&&finite(e.y,0,560)&&finite(e.ttl,0,.45));
}
