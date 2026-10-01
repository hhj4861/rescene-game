export const DURATION=60;
export const STAGE_COUNT=5;
export function stageSpeed(s){return 1+(Math.max(1,Math.min(STAGE_COUNT,s.stage||1))-1)*.12;}
// Keep the first ten seconds steady, then ramp smoothly through the round.
function pressure(elapsed){return Math.max(0,Math.min(1,(elapsed-10)/(DURATION-10)));}
export const COLS=8,ROWS=12;
export const SHAPES=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
export function makeDrive(random=Math.random){return {kind:'drive',remaining:DURATION,elapsed:0,score:0,lane:1,hearts:3,objects:[],spawn:0.6,invincible:0,ended:false,stars:0,random,event:null};}
export function steer(s,direction){if(!s.ended)s.lane=Math.max(0,Math.min(2,s.lane+direction));}
export function stepDrive(s,dt){
  if(s.ended)return;s.event=null;dt=Math.min(Math.max(dt,0),s.remaining);s.remaining=Math.max(0,s.remaining-dt);s.elapsed+=dt;s.invincible=Math.max(0,s.invincible-dt);s.spawn-=dt;
  if(s.spawn<=0){
    // At most one obstacle in a row, always leaving two safe lanes.
    const lane=Math.floor(s.random()*3);s.objects.push({lane,y:-.08,kind:s.random()<.42?'star':'cone',hit:false});
    s.spawn=(.8-.22*pressure(s.elapsed))/stageSpeed(s);
  }
  for(const o of s.objects){
    const before=o.y;o.y+=dt*(.32+.14*pressure(s.elapsed))*stageSpeed(s);
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
  const interval=Math.max(.4,.95-.35*pressure(DURATION-s.remaining)-s.lines*.025)/stageSpeed(s);while(s.fall>=interval&&!s.ended){s.fall-=interval;dropBlock(s);}
}
export const RECORD_KEY='rescene.small-arcade.v1';
export const GAME_IDS=['drive','blocks','photo','rhythm','catch'];
export function readRecords(storage){
  let data;try{data=JSON.parse(storage?.getItem(RECORD_KEY));}catch{/* Missing or denied storage starts with empty records. */}
  return Object.fromEntries(GAME_IDS.map(k=>[k,Number.isSafeInteger(data?.[k])&&data[k]>=0?data[k]:0]));
}
export function saveRecord(storage,kind,score){const records=readRecords(storage);if(!GAME_IDS.includes(kind)||!Number.isSafeInteger(score)||score<0)return {records,saved:false};records[kind]=Math.max(records[kind],score);try{storage.setItem(RECORD_KEY,JSON.stringify(records));return {records,saved:true};}catch{return {records,saved:false};}}

function advance(s,dt){
  if(s.ended)return 0;
  const delta=Math.min(Number.isFinite(dt)?Math.max(0,dt):0,s.remaining);
  s.elapsed+=delta;s.remaining=Math.max(0,DURATION-s.elapsed);
  if(s.remaining===0)s.ended=true;
  return delta;
}
function timed(kind){return {kind,elapsed:0,remaining:DURATION,score:0,ended:false,event:null};}
export function makePhoto(){return {...timed('photo'),shots:0,perfect:0,combo:0,cooldown:0,flash:0,album:[]};}
export function photoPosition(s){
  // Integrate the increasing speed so the cursor never jumps at a tempo change.
  const ramp=Math.max(0,s.elapsed-10);
  const phase=s.elapsed/1.4+ramp*ramp*(1/1.05-1/1.4)/(2*(DURATION-10));
  return .5+Math.sin(phase*Math.PI*stageSpeed(s))*.43;
}
export function photoWindows(s){const p=pressure(s.elapsed),factor=1+(stageSpeed(s)-1)*.5;return {perfect:(.045-.01*p)/factor,good:(.13-.03*p)/factor};}
export function stepPhoto(s,dt){const delta=advance(s,dt);s.cooldown=Math.max(0,s.cooldown-delta);s.flash=Math.max(0,s.flash-delta);}
export function snapPhoto(s){
  if(s.ended||s.cooldown>0)return false;
  s.cooldown=.65;s.shots++;const distance=Math.abs(photoPosition(s)-.5);
  const windows=photoWindows(s),grade=distance<=windows.perfect?'perfect':distance<=windows.good?'good':'miss';
  s.combo=grade==='miss'?0:s.combo+1;
  if(grade!=='miss'){s.photos=(s.photos||0)+1;s.score+=(grade==='perfect'?100:60)+Math.min(5,s.combo)*10;s.flash=.2;if(grade==='perfect')s.perfect++;}
  s.album.push(grade);s.album=s.album.slice(-5);s.event=grade==='miss'?'photo-miss':`photo-${grade}`;return true;
}
export const BEAT_SECONDS=.7;
export const RHYTHM_WINDOW=.19;
function rhythmWindow(at,stage=1){return RHYTHM_WINDOW-.04*pressure(at)-.008*(stage-1);}
const PATTERN=[0,1,0,0,1,1,0,1];
export function makeRhythm(offsetMs=0,stage=1){
  const offset=Number.isFinite(offsetMs)?Math.max(-200,Math.min(200,offsetMs))/1000:0;
  const notes=[];
  // Leave enough time for the final note, even with +200ms calibration.
  for(let at=2,i=0;at<=DURATION-.4;i++){
    notes.push({at,lane:PATTERN[i%PATTERN.length],status:'waiting'});
    at+=(BEAT_SECONDS-.18*pressure(at))/stageSpeed({stage});
  }
  return {...timed('rhythm'),offset,combo:0,bestCombo:0,hits:0,misses:0,lastTap:-1,
    notes};
}
export function stepRhythm(s,dt){
  if(s.ended)return;advance(s,dt);
  for(const note of s.notes)if(note.status==='waiting'&&s.elapsed-s.offset-note.at>rhythmWindow(note.at,s.stage)){note.status='miss';s.misses++;s.combo=0;s.event='rhythm-miss';}
}
export function tapRhythm(s,lane){
  if(s.ended||![0,1].includes(lane)||s.elapsed-s.lastTap<.1)return false;
  s.lastTap=s.elapsed;
  const note=s.notes.filter(n=>n.status==='waiting'&&n.lane===lane).sort((a,b)=>Math.abs(a.at-s.elapsed+s.offset)-Math.abs(b.at-s.elapsed+s.offset))[0];
  const delta=note?Math.abs(s.elapsed-s.offset-note.at):Infinity;
  if(!note||delta>rhythmWindow(note.at,s.stage)){s.combo=0;s.event='rhythm-early';return false;}
  note.status='hit';s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);
  const perfect=delta<=.08-.015*pressure(note.at);
  s.score+=(perfect?100:60)+Math.min(10,s.combo)*5;s.event=perfect?'rhythm-perfect':'rhythm-good';return true;
}
export function makeCatch(random=Math.random){return {...timed('catch'),lane:1,stars:0,misses:0,objects:[],spawn:.6,random};}
export function stepCatch(s,dt){
  if(s.ended)return;const delta=advance(s,dt);s.spawn-=delta;
  if(s.spawn<=0){s.objects.push({lane:Math.floor(s.random()*3),y:-.06,blue:s.random()<.2,hit:false});s.spawn=(.78-.22*pressure(s.elapsed))/stageSpeed(s);}
  for(const o of s.objects){
    const before=o.y;o.y+=delta*(.38+.14*pressure(s.elapsed))*stageSpeed(s);
    if(!o.hit&&before<=.88&&o.y>=.73&&o.lane===s.lane){o.hit=true;s.stars++;s.score+=o.blue?200:100;s.event=o.blue?'blue-star':'catch-star';}
    if(!o.hit&&before<=1&&o.y>1){s.misses++;s.event='catch-miss';}
  }
  s.objects=s.objects.filter(o=>o.y<=1.1&&!o.hit);
}
export function createGame(kind,options={}){
  const stage=Number.isInteger(options.stage)?Math.max(1,Math.min(STAGE_COUNT,options.stage)):1;
  let seed=(options.seed??Math.floor(Math.random()*4294967296))>>>0;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const random=options.random||(options.stage?next:Math.random);
  const s=({drive:()=>makeDrive(random),blocks:()=>makeBlocks(random),photo:makePhoto,rhythm:()=>makeRhythm(options.offsetMs,stage),catch:()=>makeCatch(random)})[kind]?.();
  if(s&&options.stage){s.stage=stage;s.rngState=seed;if(!options.random)s.random=()=>{s.rngState=(Math.imul(s.rngState,1664525)+1013904223)>>>0;return s.rngState/4294967296;};}
  if(s?.kind==='photo')s.photos=0;
  return s;
}
export function stepGame(s,dt){({drive:stepDrive,blocks:stepBlocks,photo:stepPhoto,rhythm:stepRhythm,catch:stepCatch})[s.kind](s,dt);}
export function gameAction(s,action){
  if(s.ended)return;
  if(s.kind==='drive'||s.kind==='catch'){if(action==='left'||action==='right')steer(s,action==='left'?-1:1);}
  else if(s.kind==='blocks'){if(action==='left'||action==='right')moveBlock(s,action==='left'?-1:1);else if(action==='rotate')rotateBlock(s);else if(action==='drop')dropBlock(s,true);else if(action==='down')dropBlock(s);}
  else if(s.kind==='photo'&&action==='snap')snapPhoto(s);
  else if(s.kind==='rhythm'&&(action==='left'||action==='right'))tapRhythm(s,action==='left'?0:1);
}
