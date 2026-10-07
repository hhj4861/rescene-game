// One coordinate system for drawing and tapping notes on both canvas heights.
export function pumpNotePosition(s,n,height=600){
 const travel=height===600?205:(height-150)/2.2;
 return {x:75+n.lane*82,y:136+(n.at+s.offset-s.elapsed)*travel};
}
export function pumpNoteAt(s,x,y,height){
 if(![x,y,height].every(Number.isFinite)||height<=150||x<30||x>450||y<110||y>height-40)return null;
 // Last drawn note wins if two visible notes overlap. Never hit another note
 // in the same lane just because it happens to be closer to the beat.
 for(let i=s.notes.length-1;i>=0;i--){
  const n=s.notes[i],p=pumpNotePosition(s,n,height);
  if(n.status==='waiting'&&p.y>=100&&p.y<=height-40&&Math.abs(x-p.x)<=38&&Math.abs(y-p.y)<=31)return n;
 }
 return null;
}
