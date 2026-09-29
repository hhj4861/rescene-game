export const DURATION=60;
export const COLS=8,ROWS=12;
export const SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
export function makeDrive(random=Math.random){return {kind:'drive',remaining:DURATION,elapsed:0,score:0,lane:1,hearts:3,objects:[],spawn:0.6,invincible:0,ended:false,stars:0,random,event:null};}
export function steer(s,direction){if(!s.ended)s.lane=Math.max(0,Math.min(2,s.lane+direction));}
export function stepDrive(s,dt){
  if(s.ended)return;s.event=null;dt=Math.min(Math.max(dt,0),s.remaining);s.remaining=Math.max(0,s.remaining-dt);s.elapsed+=dt;s.invincible=Math.max(0,s.invincible-dt);s.spawn-=dt;
  if(s.spawn<=0){
    // At most one obstacle in a row, always leaving two safe lanes.
    const lane=Math.floor(s.random()*3);s.objects.push({lane,y:-.08,kind:s.random()<.42?'star':'cone',hit:false});
    s.spawn=.9-Math.min(.2,s.elapsed/240);
  }
  for(const o of s.objects){
    const before=o.y;o.y+=dt*(.29+Math.min(.12,s.elapsed/400));
    if(!o.hit&&o.lane===s.lane&&before<=.91&&o.y>=.73){
      o.hit=true;
      if(o.kind==='star'){s.stars++;s.event='star';}
      else if(!s.invincible){s.hearts--;s.invincible=1.4;s.event='bump';}
    }
  }
  s.objects=s.objects.filter(o=>o.y<1.12&&!o.hit);s.score=Math.floor(s.elapsed*10)+s.stars*100;
  s.ended=s.hearts<=0||s.remaining<=0;
}
function piece(s){const index=Math.floor(s.random()*SHAPES.length),cells=SHAPES[index].map(row=>[...row]);return {cells,color:index+1,x:Math.floor((COLS-cells[0].length)/2),y:0};}
export function makeBlocks(random=Math.random){const s={kind:'blocks',remaining:DURATION,score:0,lines:0,board:Array.from({length:ROWS},()=>Array(COLS).fill(0)),fall:0,ended:false,random,event:null};s.active=piece(s);s.next=piece(s);return s;}
export function fits(s,p){return p.cells.every((row,dy)=>row.every((cell,dx)=>!cell||(p.x+dx>=0&&p.x+dx<COLS&&p.y+dy>=0&&p.y+dy<ROWS&&!s.board[p.y+dy][p.x+dx])));}
export function moveBlock(s,dx){if(s.ended)return false;const p={...s.active,x:s.active.x+dx};if(!fits(s,p))return false;s.active=p;return true;}
export function rotateBlock(s){
  if(s.ended)return false;
  const cells=s.active.cells[0].map((_,x)=>s.active.cells.map(row=>row[x]).reverse());
  for(const shift of [0,-1,1,-2,2]){const p={...s.active,cells,x:s.active.x+shift};if(fits(s,p)){s.active=p;return true;}}
  return false;
}
function lock(s){
  s.active.cells.forEach((row,dy)=>row.forEach((cell,dx)=>{if(cell)s.board[s.active.y+dy][s.active.x+dx]=s.active.color;}));
  const rest=s.board.filter(row=>row.some(cell=>!cell)),count=ROWS-rest.length;
  s.board=[...Array.from({length:count},()=>Array(COLS).fill(0)),...rest];s.lines+=count;s.score+=count?[0,100,250,450,700][count]:10;s.event=count?'line':'place';
  s.active=s.next;s.next=piece(s);s.fall=0;if(!fits(s,s.active))s.ended=true;
}
export function dropBlock(s,hard=false){
  if(s.ended)return;
  if(hard){while(fits(s,{...s.active,y:s.active.y+1})){s.active.y++;s.score++;}lock(s);return;}
  if(fits(s,{...s.active,y:s.active.y+1}))s.active.y++;else lock(s);
}
export function ghostRow(s){let y=s.active.y;while(fits(s,{...s.active,y:y+1}))y++;return y;}
export function stepBlocks(s,dt){
  if(s.ended)return;s.remaining=Math.max(0,s.remaining-Math.max(0,dt));
  if(!s.remaining){s.ended=true;return;}s.fall+=dt;
  const interval=Math.max(.5,1.15-s.lines*.035);while(s.fall>=interval&&!s.ended){s.fall-=interval;dropBlock(s);}
}
export const RECORD_KEY='rescene.small-arcade.v1';
export function readRecords(storage){try{const x=JSON.parse(storage.getItem(RECORD_KEY));return Object.fromEntries(['drive','blocks'].map(k=>[k,Number.isSafeInteger(x?.[k])&&x[k]>=0?x[k]:0]));}catch{return {drive:0,blocks:0};}}
export function saveRecord(storage,kind,score){const records=readRecords(storage);if(!['drive','blocks'].includes(kind)||!Number.isSafeInteger(score)||score<0)return {records,saved:false};records[kind]=Math.max(records[kind],score);try{storage.setItem(RECORD_KEY,JSON.stringify(records));return {records,saved:true};}catch{return {records,saved:false};}}
