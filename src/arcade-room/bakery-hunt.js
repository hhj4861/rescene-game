export const BAKERY_MAX_SIZE=8,BAKERY_GROWTH_STAGES=5;
export const bakerySize=stage=>Math.min(BAKERY_MAX_SIZE,6+Math.floor(((Number.isSafeInteger(stage)&&stage>=1?stage:1)-1)/BAKERY_GROWTH_STAGES));
const areaCache=new Map();
export function hiddenBreadAreas(size,stage=1,layout=2){
 const key=`${size}:${stage}:${layout}`;
 if(!areaCache.has(key)){
  if(areaCache.size>=32)areaCache.delete(areaCache.keys().next().value);
  areaCache.set(key,Object.freeze((layout===1?makeBreadAreas(size,stage):variedBreadAreas(size,stage)).map(a=>Object.freeze(a))));
 }
 return areaCache.get(key);
}
function variedBreadAreas(size,stage){
 if(stage<=4||stage%5===0)return makeBreadAreas(size,stage%5===0?3:stage);
 // A large single wrapper is a milestone, not the first rectangle on every board.
 const count=Math.min(6,3+Math.floor((stage-1)/5)),areas=[];
 for(let row=0;row<2;row++)for(let col=0;col<3;col++){
  const left=Math.floor(col*size/3),right=Math.floor((col+1)*size/3),top=Math.floor(row*size/2);
  const w=right-left,h=Math.min(3,Math.floor(size/2));
  areas.push({x:left,y:top,w,h});
 }
 const offset=(stage-1)%areas.length;return [...areas.slice(offset),...areas.slice(0,offset)].slice(0,count);
}
function makeBreadAreas(size,stage){
 if(stage===1)return [{x:0,y:1,w:2,h:2},{x:size-3,y:size-2,w:3,h:2}];
 if(stage===2)return [{x:0,y:0,w:2,h:2},{x:size-3,y:0,w:3,h:3},{x:1,y:size-2,w:3,h:2}];
 const first=Math.min(8,stage===4?size-2:size),areas=[{x:0,y:0,w:first,h:first}];
 const count=breadGoal(stage);
 while(areas.length<count){
  const w=areas.length%2?2:3,h=areas.length%3?2:3;let best=null,distance=-1;
  for(let y=0;y<=size-h;y++)for(let x=0;x<=size-w;x++){
   if(areas.some(a=>x<a.x+a.w&&x+w>a.x&&y<a.y+a.h&&y+h>a.y))continue;
   const spread=Math.min(...areas.map(a=>Math.hypot(x+w/2-a.x-a.w/2,y+h/2-a.y-a.h/2)));
   if(spread>distance){best={x,y,w,h};distance=spread;}
  }
  if(!best)break;areas.push(best);
 }
 return areas;
}
export function breadAreaCells(area,size){return Array.from({length:area.w*area.h},(_,i)=>(area.y+Math.floor(i/area.w))*size+area.x+i%area.w);}
export function breadHunt(s){const size=Math.round(Math.sqrt(s.board.length));return hiddenBreadAreas(size,s.stage,s.breadLayout??1).map(a=>{const cells=breadAreaCells(a,size),left=cells.filter(i=>!s.breadCover[i]).length;return {...a,left,found:left===0};});}
export const foundBread=s=>breadHunt(s).filter(a=>a.found).length;
export const breadGoal=stage=>stage===1?2:stage===2?3:stage===3?1:Math.min(12,2+Math.floor((stage-4)/2));
export const breadMoves=stage=>36+Math.min(44,(stage-1)*4);
