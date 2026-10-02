import {createChase,chaseHit,stepChase} from './chase.js';
import {createRunner,runnerAction,stepRunner} from './runner.js';
import {PUMP_BEAT} from './music.js';
export const DURATION=60,INITIAL_LIVES=3;
export const GAME_IDS=['drive','blocks','photo','rhythm','catch'];
export const validStage=n=>Number.isSafeInteger(n)&&n>=1;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function stageSpeed(s){return 1+1.4*(1-1/(1+((validStage(s.stage)?s.stage:1)-1)*.1));}
const GOALS={drive:[[12,16,20,24,28],48],blocks:[[3,4,5,6,7],12],photo:[[18,24,30,36,42],72],rhythm:[[16,22,28,34,40],80],catch:[[6,8,10,12,14],28]};
export function stageTarget(kind,stage=1){const [first,cap]=GOALS[kind];stage=validStage(stage)?stage:1;return stage<=5?first[stage-1]:first[4]+Math.floor((cap-first[4])*(1-1/(1+(stage-5)*.1)));}
function loseLife(s){s.hearts=Math.max(0,s.hearts-1);if(!s.hearts){s.ended=true;s.endReason='lives';}}
function failRound(s,reason){if(s.ended)return;loseLife(s);s.ended=true;s.endReason=reason;}
export const PLATFORMS=[{x:0,y:536,w:480},{x:35,y:422,w:170},{x:267,y:330,w:178},{x:48,y:224,w:168}];
function enemy(s,home){const p=PLATFORMS[home];return {x:p.x+35+s.random()*(p.w-70),y:p.y,home,dir:s.random()<.5?-1:1,trapped:0};}
export const RHYTHM_WINDOW=.2,BEAT_SECONDS=PUMP_BEAT;
export function rhythmWindow(s){return Math.max(.09,.2-(stageSpeed(s)-1)*.045-s.elapsed*.0004);}
export function makeRhythmNotes(stage){
 const pattern=[0,2,4,1,3,2,0,4,2,1,3,2,4,0,3,1],notes=[];
 // Four intro beats, then steps on the score's beat grid. Higher stages add
 // offbeats and chords, rather than drifting the chart away from the song.
 for(let beat=4;beat<119;beat++){
  const i=beat-4,lane=pattern[i%pattern.length];
  if(stage===1&&i%2)continue;
  notes.push({at:beat*PUMP_BEAT,lane,status:'waiting'});
  if(stage>=3&&i%8===7)notes.push({at:beat*PUMP_BEAT,lane:(lane+2)%5,status:'waiting'});
  if(stage>=4&&i%4===(stage>=7?1:3))notes.push({at:(beat+.5)*PUMP_BEAT,lane:pattern[(i+1)%pattern.length],status:'waiting'});
 }
 return notes;
}
export function createGame(kind,options={}){
 if(!GAME_IDS.includes(kind))return undefined;
 const s={schema:3,kind,stage:validStage(options.stage)?options.stage:1,elapsed:0,remaining:DURATION,score:0,hearts:Number.isInteger(options.hearts)?clamp(options.hearts,1,3):3,ended:false,event:null,rngState:(options.seed??Math.floor(Math.random()*4294967296))>>>0};
 s.random=options.random||(()=>{s.rngState=(Math.imul(s.rngState,1664525)+1013904223)>>>0;return s.rngState/4294967296;});
 if(kind==='drive')Object.assign(s,createChase());
 if(kind==='blocks'){Object.assign(s,{player:{x:90,y:536,vy:0,facing:1,walk:0,dir:0},popped:0,combo:0,enemies:[enemy(s,0),enemy(s,1),enemy(s,2)],bubbles:[],invincible:1.2,cooldown:0,spawn:2,flash:0});s.enemies[0].x=340;}
 if(kind==='photo'){Object.assign(s,{board:playableBoard(s),selected:-1,collected:0,combo:0,moves:Math.max(10,18-Math.floor((stageSpeed(s)-1)*6)),shuffles:2,flash:0,clearedCells:[],hint:[]});s.hint=availableSwap(s.board)||[];}
 if(kind==='rhythm')Object.assign(s,{notes:makeRhythmNotes(s.stage),offset:clamp(Number(options.offsetMs)||0,-200,200)/1000,hits:0,misses:0,combo:0,bestCombo:0,lastTaps:Array(5).fill(-1),feedback:Array(5).fill(''),glows:Array(5).fill(0)});
 if(kind==='catch')Object.assign(s,createRunner());
 return s;
}
function popEnemy(s,e){s.enemies.splice(s.enemies.indexOf(e),1);s.popped++;s.combo++;s.score+=100+Math.min(5,s.combo)*50;s.flash=.25;s.event='bubble-pop';}
function bubbleAction(s,action){const p=s.player;if(action==='left'||action==='right'){p.dir=action==='left'?-1:1;p.facing=p.dir;p.walk=.18;}else if(action==='turn'){p.facing*=-1;p.dir=0;p.walk=0;}else if(action==='stop'){p.dir=0;p.walk=0;}else if(action==='jump'&&Math.abs(p.vy)<.01)p.vy=-550;else if(action==='bubble'&&!s.cooldown){s.cooldown=.25;const near=s.enemies.filter(e=>e.trapped&&Math.hypot(e.x-p.x,e.y-p.y)<130);if(near.length)near.forEach(e=>popEnemy(s,e));else if(s.bubbles.length<8)s.bubbles.push({x:p.x+p.facing*20,y:p.y-24,vx:p.facing*260,ttl:1.8});}}
function stepBubbles(s,dt){const p=s.player;for(const k of ['invincible','cooldown','flash'])s[k]=Math.max(0,s[k]-dt);p.x=clamp(p.x+p.dir*190*Math.min(dt,p.walk),18,462);p.walk=Math.max(0,p.walk-dt);const old=p.y;p.vy+=1200*dt;p.y+=p.vy*dt;if(p.vy>=0){for(const platform of [...PLATFORMS].sort((a,b)=>a.y-b.y)){if(p.x>=platform.x-6&&p.x<=platform.x+platform.w+6&&old<=platform.y&&p.y>=platform.y){p.y=platform.y;p.vy=0;break;}}}if(p.y>536){p.y=536;p.vy=0;}
 for(const b of s.bubbles){b.x+=b.vx*dt;b.y-=18*dt;b.ttl-=dt;const hit=s.enemies.find(e=>!e.trapped&&Math.hypot(e.x-b.x,e.y-20-b.y)<30);if(hit){hit.trapped=5;b.ttl=0;s.event='bubble-trap';}}s.bubbles=s.bubbles.filter(b=>b.ttl>0&&b.x>-20&&b.x<500);
 for(const e of [...s.enemies]){if(e.trapped){e.trapped=Math.max(0,e.trapped-dt);e.y=Math.max(70,e.y-12*dt);if(Math.hypot(e.x-p.x,e.y-p.y)<38){popEnemy(s,e);continue;}if(!e.trapped){e.y=PLATFORMS[e.home].y;s.combo=0;}}else{const platform=PLATFORMS[e.home];e.x+=e.dir*(32+18*stageSpeed(s))*dt;if(e.x<platform.x+18){e.x=platform.x+18;e.dir=1;}if(e.x>platform.x+platform.w-18){e.x=platform.x+platform.w-18;e.dir=-1;}if(!s.invincible&&Math.hypot(e.x-p.x,e.y-p.y)<31){loseLife(s);s.invincible=1.4;s.combo=0;s.event='bubble-miss';}}if(s.ended)return;}
 s.spawn=Math.max(0,s.spawn-dt);if(!s.spawn){if(s.enemies.length<3&&s.popped+s.enemies.length<stageTarget(s.kind,s.stage))s.enemies.push(enemy(s,Math.floor(s.random()*4)));s.spawn=1.4;}}
export function matches(board){const found=new Set();for(let row=0;row<6;row++)for(let col=0;col<6;col++){const i=row*6+col,color=board[i]%10;if(!color)continue;if(col<4&&board[i+1]%10===color&&board[i+2]%10===color){let c=col;while(c<6&&board[row*6+c]%10===color)found.add(row*6+c++);}if(row<4&&board[i+6]%10===color&&board[i+12]%10===color){let r=row;while(r<6&&board[r*6+col]%10===color)found.add(r++*6+col);}}return [...found];}
const adjacent=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&a<36&&b>=0&&b<36&&(Math.abs(a-b)===6||Math.floor(a/6)===Math.floor(b/6)&&Math.abs(a-b)===1);
export function availableSwap(board){for(let i=0;i<36;i++)for(const j of [i+1,i+6]){if(!adjacent(i,j))continue;const b=[...board];[b[i],b[j]]=[b[j],b[i]];if(matches(b).length)return [i,j];}return null;}
function playableBoard(s){for(let attempt=0;attempt<40;attempt++){const board=[];for(let i=0;i<36;i++){const colors=[1,2,3,4,5].filter(c=>!(i%6>=2&&board[i-1]===c&&board[i-2]===c)&&!(i>=12&&board[i-6]===c&&board[i-12]===c));board.push(colors[Math.floor(s.random()*colors.length)]);}if(availableSwap(board))return board;}return Array.from({length:36},(_,i)=>[1,2,1,3,4,5,3,1,4,5,2,3][i%12]);}
// Resolve the deterministic board once, then replay each swap/pop/fall in order.
// A saved game keeps the settled board; cosmetic frames never alter its RNG.
export function swapBread(s,a,b){
 if(s.ended||s.flash||!adjacent(a,b))return false;
 const frames=[],before=[...s.board];
 frames.push({kind:'swap',duration:.16,board:before,a,b});
 [s.board[a],s.board[b]]=[s.board[b],s.board[a]];
 let found=matches(s.board);
 if(!found.length){frames.push({kind:'swap',duration:.16,board:[...s.board],a,b});s.board=before;s.breadFrames=frames;s.flash=.32;s.event='bread-invalid';s.selected=-1;return false;}
 s.moves--;s.combo=0;s.clearedCells=[];
 while(found.length&&s.combo<12){
  s.combo++;const remove=new Set(found),queue=[...found];
  for(let n=0;n<queue.length;n++){const i=queue[n];if(s.board[i]>10)for(let k=0;k<6;k++)for(const j of [Math.floor(i/6)*6+k,k*6+i%6])if(!remove.has(j)){remove.add(j);queue.push(j);}}
  const special=s.combo===1&&found.length>=4?(found.includes(b)?b:found[0]):-1,color=special>=0?s.board[special]%10:0;
  if(special>=0)remove.delete(special);
  frames.push({kind:'pop',duration:.24,board:[...s.board],removed:[...remove],combo:s.combo});
  s.collected+=remove.size;s.score+=remove.size*30*s.combo;s.clearedCells.push(...remove);
  for(const i of remove)s.board[i]=0;if(special>=0)s.board[special]=color+10;
  const fromRows=Array(36);
  for(let col=0;col<6;col++){
   const values=[];for(let row=5;row>=0;row--)if(s.board[row*6+col])values.push({value:s.board[row*6+col],row});
   const missing=6-values.length;
   for(let row=5;row>=0;row--){const item=values[5-row],i=row*6+col;s.board[i]=item?.value||1+Math.floor(s.random()*5);fromRows[i]=item?.row??row-missing;}
  }
  frames.push({kind:'fall',duration:.42,board:[...s.board],fromRows,combo:s.combo});found=matches(s.board);
 }
 if(found.length||!availableSwap(s.board)){s.board=playableBoard(s);frames.push({kind:'fall',duration:.42,board:[...s.board],fromRows:Array.from({length:36},(_,i)=>Math.floor(i/6)-6),combo:0});}
 s.hint=availableSwap(s.board)||[];s.breadFrames=frames;s.flash=frames.reduce((sum,f)=>sum+f.duration,0);s.selected=-1;s.event=s.combo>1?'bread-chain':'bread-match';return true;
}
export function breadFrame(s){
 if(!s.flash||!s.breadFrames?.length)return null;
 let t=s.breadFrames.reduce((sum,f)=>sum+f.duration,0)-s.flash;
 for(const frame of s.breadFrames){if(t<frame.duration)return {...frame,progress:Math.max(0,t/frame.duration)};t-=frame.duration;}
 return null;
}
function stepBread(s,dt){s.flash=Math.max(0,s.flash-dt);if(!s.flash){s.breadFrames=null;if(!s.moves&&s.collected<stageTarget(s.kind,s.stage))failRound(s,'moves');}}
function breadAction(s,a){if(s.flash)return;if(a&&typeof a==='object'){swapBread(s,a.from,a.to);return;}if(a==='shuffle'){if(!s.shuffles)return;s.board=playableBoard(s);s.shuffles--;s.selected=-1;s.hint=availableSwap(s.board)||[];s.event='bread-shuffle';}else if(Number.isInteger(a)&&a>=0&&a<36){if(adjacent(s.selected,a))swapBread(s,s.selected,a);else s.selected=a;}}
export function tapRhythm(s,lane){if(s.ended||!Number.isInteger(lane)||lane<0||lane>4||s.elapsed-s.lastTaps[lane]<.08)return;s.lastTaps[lane]=s.elapsed;const waiting=s.notes.filter(n=>n.lane===lane&&n.status==='waiting').sort((a,b)=>Math.abs(a.at+s.offset-s.elapsed)-Math.abs(b.at+s.offset-s.elapsed)),n=waiting[0],delta=n?Math.abs(n.at+s.offset-s.elapsed):Infinity;s.glows[lane]=.25;if(delta>rhythmWindow(s)){s.combo=0;s.feedback[lane]='WAIT';s.event='rhythm-early';return;}n.status='hit';s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);const perfect=delta<.075;s.feedback[lane]=perfect?'PERFECT':'GOOD';s.score+=(perfect?100:60)+Math.min(10,s.combo)*5;s.event=perfect?'rhythm-perfect':'rhythm-good';}
function stepPump(s,dt){s.glows=s.glows.map(n=>Math.max(0,n-dt));for(const n of s.notes)if(n.status==='waiting'&&s.elapsed-s.offset-n.at>rhythmWindow(s)){n.status='miss';s.misses++;s.combo=0;s.feedback[n.lane]='MISS';s.glows[n.lane]=.25;s.event='rhythm-miss';loseLife(s);if(s.ended)return;}}
export function stepGame(s,dt){if(s.ended||!Number.isFinite(dt)||dt<=0)return;s.event=null;if(s.kind==='photo'&&s.collected>=stageTarget(s.kind,s.stage)){const advance=Math.min(dt,Math.max(0,s.remaining-.001));s.elapsed+=advance;s.remaining=DURATION-s.elapsed;stepBread(s,dt);return;}let remaining=Math.min(dt,s.remaining);while(remaining>1e-9&&!s.ended){const step=Math.min(.025,remaining);s.elapsed+=step;s.remaining=Math.max(0,DURATION-s.elapsed);remaining-=step;({drive:(s,dt)=>stepChase(s,dt,stageSpeed(s),loseLife),blocks:stepBubbles,photo:stepBread,rhythm:stepPump,catch:(s,dt)=>stepRunner(s,dt,stageSpeed(s),loseLife)})[s.kind](s,step);}if(!s.ended&&s.remaining<1e-7){s.remaining=0;s.elapsed=DURATION;failRound(s,'timeout');}}
export function gameAction(s,action){if(s.ended)return;({drive:chaseHit,blocks:bubbleAction,photo:breadAction,rhythm:tapRhythm,catch:runnerAction})[s.kind](s,action);}
export const RECORD_KEY='rescene.small-arcade.v1';
export function readRecords(storage){let data;try{data=JSON.parse(storage?.getItem(RECORD_KEY));}catch{/* Optional storage. */}return Object.fromEntries(GAME_IDS.map(k=>[k,Number.isSafeInteger(data?.[k])&&data[k]>=0?data[k]:0]));}
export function saveRecord(storage,kind,score){const records=readRecords(storage);if(!GAME_IDS.includes(kind)||!Number.isSafeInteger(score)||score<0)return {records,saved:false};records[kind]=Math.max(records[kind],score);try{storage.setItem(RECORD_KEY,JSON.stringify(records));return {records,saved:true};}catch{return {records,saved:false};}}
