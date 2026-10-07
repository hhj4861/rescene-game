export const bakerySize=stage=>Math.min(20,5+stage);
export function hiddenBreadAreas(size,stage=1){
 if(stage===1)return [{x:0,y:1,w:2,h:2},{x:size-3,y:size-2,w:3,h:2}];
 if(stage===2)return [{x:0,y:0,w:2,h:2},{x:size-3,y:0,w:3,h:3},{x:1,y:size-2,w:3,h:2}];
 const first=Math.min(8,stage===4?size-2:size),areas=[{x:0,y:0,w:first,h:first}];
 const count=stage===3?1:Math.min(12,2+Math.floor((stage-4)/2));
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
export function breadHunt(s){const size=Math.round(Math.sqrt(s.board.length));return hiddenBreadAreas(size,s.stage).map(a=>{const cells=breadAreaCells(a,size),left=cells.filter(i=>!s.breadCover[i]).length;return {...a,left,found:left===0};});}
export const foundBread=s=>breadHunt(s).filter(a=>a.found).length;
export const breadGoal=stage=>hiddenBreadAreas(bakerySize(stage),stage).length;
export const breadMoves=stage=>36+Math.min(44,(stage-1)*4);
