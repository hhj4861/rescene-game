import {pumpNoteAt} from './pump-input.js';
import {createMay,mayAction,stepMay} from './may.js';
export {PLATFORMS} from './may.js';
import {createFlame,flameAction,stepFlame} from './flame.js';
import {createRunner,runnerAction,stepRunner} from './runner.js';
import {pumpSong,PUMP_BEAT} from './music.js';
export const DURATION=60,INITIAL_LIVES=3;
export const GAME_IDS=['rhythm','drive','blocks','photo','catch'];
export const validStage=n=>Number.isSafeInteger(n)&&n>=1;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function stageSpeed(s){return 1+1.4*(1-1/(1+((validStage(s.stage)?s.stage:1)-1)*.1));}
const GOALS={drive:[[12,16,20,24,28],48],blocks:[[18,24,30,36,42],72],photo:[[18,24,30,36,42],72],rhythm:[[16,22,28,34,40],80],catch:[[6,8,10,12,14],28]};
export function stageTarget(kind,stage=1){const [first,cap]=GOALS[kind];stage=validStage(stage)?stage:1;return stage<=5?first[stage-1]:first[4]+Math.floor((cap-first[4])*(1-1/(1+(stage-5)*.1)));}
export function roundDuration(kind){return kind==='catch'?300:kind==='blocks'?180:kind==='drive'?90:60;}
export function boardSize(s){return Math.round(Math.sqrt(s.board.length));}
export function stageBoardSize(stage){return Math.min(10,5+stage);}
function loseLife(s){if(s.damageCooldown>0)return;s.damageCooldown=1.4;s.hearts=Math.max(0,s.hearts-1);if(!s.hearts){s.ended=true;s.endReason='lives';}}
function failRound(s,reason){if(s.ended)return;loseLife(s);s.ended=true;s.endReason=reason;}
export const RHYTHM_WINDOW=.2,BEAT_SECONDS=PUMP_BEAT;
export function rhythmWindow(s){return Math.max(.09,.2-(stageSpeed(s)-1)*.045-s.elapsed*.0004);}
export function makeRhythmNotes(stage,songId,beatShift=0){
 const song=pumpSong(songId),pattern=song.pattern,beatSeconds=60/song.bpm,notes=[];
 // Four intro beats, then steps on the score's beat grid. Higher stages add
 // offbeats and chords, rather than drifting the chart away from the song.
 for(let beat=4;beat<(DURATION-.5-beatShift)/beatSeconds;beat++){
  const i=beat-4,lane=pattern[i%pattern.length];
  if(stage===1&&i%2)continue;
  notes.push({at:beatShift+beat*beatSeconds,lane,status:'waiting'});
  if(stage>=3&&i%8===7)notes.push({at:beatShift+beat*beatSeconds,lane:(lane+2)%5,status:'waiting'});
  if(stage>=4&&i%4===(stage>=7?1:3))notes.push({at:beatShift+(beat+.5)*beatSeconds,lane:pattern[(i+1)%pattern.length],status:'waiting'});
 }
 return notes;
}
export function createGame(kind,options={}){
 if(!GAME_IDS.includes(kind))return undefined;
 const s={schema:3,kind,stage:validStage(options.stage)?options.stage:1,elapsed:0,remaining:roundDuration(kind),score:0,hearts:Number.isInteger(options.hearts)?clamp(options.hearts,1,3):3,ended:false,event:null,damageCooldown:0,itemPickups:0,rngState:(options.seed??Math.floor(Math.random()*4294967296))>>>0};
 s.random=options.random||(()=>{s.rngState=(Math.imul(s.rngState,1664525)+1013904223)>>>0;return s.rngState/4294967296;});
 if(kind==='drive')Object.assign(s,createFlame());
 if(kind==='blocks')createMay(s);
 if(kind==='photo'){Object.assign(s,{bakeryVersion:1,songDrops:Number.isSafeInteger(options.songDrops)&&options.songDrops>=0?options.songDrops:0,songPickups:0,rollingPins:1,breadCharge:0,itemArmed:false,board:playableBoard(s),selected:-1,collected:0,combo:0,moves:Math.max(10,18-Math.floor((stageSpeed(s)-1)*6)),shuffles:2,flash:0,clearedCells:[],hint:[]});s.hint=availableSwap(s.board)||[];}
 if(kind==='rhythm')Object.assign(s,{gauge:50,hearts:INITIAL_LIVES,songId:pumpSong(options.songId).id,beatShift:clamp(Number(options.beatShift)||0,-.6,.6),notes:makeRhythmNotes(s.stage,options.songId,clamp(Number(options.beatShift)||0,-.6,.6)),offset:clamp(Number(options.offsetMs)||0,-200,200)/1000,hits:0,misses:0,combo:0,bestCombo:0,lastTaps:Array(5).fill(-1),feedback:Array(5).fill(''),glows:Array(5).fill(0)});
 if(kind==='catch')Object.assign(s,createRunner(options));
 return s;
}
export function matches(board){const size=boardSize({board}),found=new Set();for(let row=0;row<size;row++)for(let col=0;col<size;col++){const i=row*size+col,color=board[i]%10;if(!color)continue;if(col<size-2&&board[i+1]%10===color&&board[i+2]%10===color){let c=col;while(c<size&&board[row*size+c]%10===color)found.add(row*size+c++);}if(row<size-2&&board[i+size]%10===color&&board[i+size*2]%10===color){let r=row;while(r<size&&board[r*size+col]%10===color)found.add(r++*size+col);}}return [...found];}
const adjacent=(a,b,size)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&a<size*size&&b>=0&&b<size*size&&(Math.abs(a-b)===size||Math.floor(a/size)===Math.floor(b/size)&&Math.abs(a-b)===1);
export function availableSwap(board){const size=boardSize({board});for(let i=0;i<board.length;i++)for(const j of [i+1,i+size]){if(!adjacent(i,j,size))continue;const b=[...board];[b[i],b[j]]=[b[j],b[i]];if(matches(b).length)return [i,j];}return null;}
function playableBoard(s){const size=s.board?boardSize(s):stageBoardSize(s.stage);for(let attempt=0;attempt<40;attempt++){const board=[];for(let i=0;i<size*size;i++){const colors=[1,2,3,4,5].filter(c=>!(i%size>=2&&board[i-1]===c&&board[i-2]===c)&&!(i>=size*2&&board[i-size]===c&&board[i-size*2]===c));board.push(colors[Math.floor(s.random()*colors.length)]);}if(availableSwap(board))return board;}const board=Array.from({length:size*size},(_,i)=>1+(i%size+Math.floor(i/size)*2)%5);board[0]=1;board[1]=2;board[2]=1;board[size+1]=1;return board;}
// Resolve the deterministic board once, then replay each swap/pop/fall in order.
// A saved game keeps the settled board; cosmetic frames never alter its RNG.
export function swapBread(s,a,b){
 if(s.ended||s.flash||!adjacent(a,b,boardSize(s)))return false;
 const frames=[],before=[...s.board];
 frames.push({kind:'swap',duration:.16,board:before,a,b});
 [s.board[a],s.board[b]]=[s.board[b],s.board[a]];
 let found=matches(s.board);
 if(!found.length){frames.push({kind:'swap',duration:.16,board:[...s.board],a,b});s.board=before;s.breadFrames=frames;s.flash=.32;s.event='bread-invalid';s.selected=-1;return false;}
 s.moves--;return resolveBread(s,frames,found,b,true);
}
function resolveBread(s,frames,found,b=-1,earn=true){
 const size=boardSize(s);s.combo=0;s.clearedCells=[];
 while(found.length&&s.combo<12){
  s.combo++;const remove=new Set(found),queue=[...found];
  for(let n=0;n<queue.length;n++){const i=queue[n];if(s.board[i]>10)for(let k=0;k<size;k++)for(const j of [Math.floor(i/size)*size+k,k*size+i%size])if(!remove.has(j)){remove.add(j);queue.push(j);}}
  const special=earn&&s.combo===1&&found.length>=4?(found.includes(b)?b:found[0]):-1,color=special>=0?s.board[special]%10:0;
  if(special>=0)remove.delete(special);
  frames.push({kind:'pop',duration:.24,board:[...s.board],removed:[...remove],combo:s.combo});
  s.collected+=remove.size;s.score+=remove.size*30*s.combo;s.clearedCells.push(...remove);
  if([...remove].some(i=>s.board[i]>10))s.songDrops++;
  for(const i of remove)s.board[i]=0;if(special>=0)s.board[special]=color+10;
  const fromRows=Array(size*size);
  for(let col=0;col<size;col++){
   const values=[];for(let row=size-1;row>=0;row--)if(s.board[row*size+col])values.push({value:s.board[row*size+col],row});
   const missing=size-values.length;
   for(let row=size-1;row>=0;row--){const item=values[size-1-row],i=row*size+col;s.board[i]=item?.value||1+Math.floor(s.random()*5);fromRows[i]=item?.row??row-missing;}
  }
  frames.push({kind:'fall',duration:.42,board:[...s.board],fromRows,combo:s.combo});found=matches(s.board);
 }
 if(found.length||!availableSwap(s.board)){s.board=playableBoard(s);frames.push({kind:'fall',duration:.42,board:[...s.board],fromRows:Array.from({length:size*size},(_,i)=>Math.floor(i/size)-size),combo:0});}
 if(earn&&s.combo>1){s.breadCharge+=s.combo-1;while(s.breadCharge>=3&&s.rollingPins<2){s.breadCharge-=3;s.rollingPins++;s.itemPickups++;}s.breadCharge=Math.min(3,s.breadCharge);}
 s.hint=availableSwap(s.board)||[];s.breadFrames=frames;s.flash=frames.reduce((sum,f)=>sum+f.duration,0);s.selected=-1;s.event=s.combo>1?'bread-chain':'bread-match';return true;
}
export function breadFrame(s){
 if(!s.flash||!s.breadFrames?.length)return null;
 let t=s.breadFrames.reduce((sum,f)=>sum+f.duration,0)-s.flash;
 for(const frame of s.breadFrames){if(t<frame.duration)return {...frame,progress:Math.max(0,t/frame.duration)};t-=frame.duration;}
 return null;
}
function stepBread(s,dt){s.flash=Math.max(0,s.flash-dt);if(!s.flash){s.breadFrames=null;if(!s.moves&&s.collected<stageTarget(s.kind,s.stage))failRound(s,'moves');}}
function breadAction(s,a){if(a==='song-pickup'){if(s.songDrops){s.songDrops--;s.songPickups++;s.itemPickups++;s.event='bread-song';}return;}if(s.flash)return;if(a==='rolling-pin'){if(s.rollingPins)s.itemArmed=!s.itemArmed;return;}if(s.itemArmed&&Number.isInteger(a)&&a>=0&&a<s.board.length){s.rollingPins--;s.itemArmed=false;resolveBread(s,[],Array.from({length:boardSize(s)},(_,i)=>Math.floor(a/boardSize(s))*boardSize(s)+i),-1,false);s.event='bread-item';return;}if(a&&typeof a==='object'){swapBread(s,a.from,a.to);return;}if(a==='shuffle'){if(!s.shuffles)return;s.board=playableBoard(s);s.shuffles--;s.selected=-1;s.hint=availableSwap(s.board)||[];s.event='bread-shuffle';}else if(Number.isInteger(a)&&a>=0&&a<s.board.length){if(adjacent(s.selected,a,boardSize(s)))swapBread(s,s.selected,a);else s.selected=a;}}
export function tapRhythm(s,action){const targeted=action&&typeof action==='object',note=targeted?pumpNoteAt(s,action.x,action.y,action.height):null,lane=targeted?note?.lane:action;if(s.ended||!Number.isInteger(lane)||lane<0||lane>4||s.elapsed-s.lastTaps[lane]<.08)return;s.lastTaps[lane]=s.elapsed;const waiting=s.notes.filter(n=>n.lane===lane&&n.status==='waiting').sort((a,b)=>Math.abs(a.at+s.offset-s.elapsed)-Math.abs(b.at+s.offset-s.elapsed)),n=targeted?note:waiting[0],delta=n?Math.abs(n.at+s.offset-s.elapsed):Infinity;s.glows[lane]=.25;if(delta>rhythmWindow(s)){s.combo=0;s.feedback[lane]='WAIT';s.event='rhythm-early';return;}n.status='hit';s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.gauge=Math.min(100,s.gauge+2+Math.min(4,s.combo/10));const perfect=delta<.075;s.feedback[lane]=perfect?'PERFECT':'GOOD';s.score+=(perfect?100:60)+Math.min(10,s.combo)*5;s.event=perfect?'rhythm-perfect':'rhythm-good';}
function stepPump(s,dt){s.glows=s.glows.map(n=>Math.max(0,n-dt));for(const n of s.notes)if(n.status==='waiting'&&s.elapsed-s.offset-n.at>rhythmWindow(s)){n.status='miss';s.misses++;s.combo=0;s.feedback[n.lane]='MISS';s.glows[n.lane]=.25;s.event='rhythm-miss';s.gauge=Math.max(0,s.gauge-12);if(!s.gauge){s.hearts=0;s.ended=true;s.endReason='gauge';return;}}}
export function stepGame(s,dt){if(s.ended||!Number.isFinite(dt)||dt<=0)return;s.event=null;if(s.kind==='photo'&&s.collected>=stageTarget(s.kind,s.stage)){const advance=Math.min(dt,Math.max(0,s.remaining-.001));s.elapsed+=advance;s.remaining=roundDuration(s.kind)-s.elapsed;stepBread(s,dt);return;}let remaining=Math.min(dt,s.remaining);while(remaining>1e-9&&!s.ended){const step=Math.min(.025,remaining);s.damageCooldown=Math.max(0,s.damageCooldown-step);s.elapsed+=step;s.remaining=Math.max(0,roundDuration(s.kind)-s.elapsed);remaining-=step;({drive:(s,dt)=>stepFlame(s,dt,stageSpeed(s),loseLife),blocks:(s,dt)=>stepMay(s,dt,loseLife,stageTarget(s.kind,s.stage)),photo:stepBread,rhythm:stepPump,catch:(s,dt)=>stepRunner(s,dt,stageSpeed(s),loseLife,stageTarget(s.kind,s.stage))})[s.kind](s,step);}if(!s.ended&&s.remaining<1e-7){s.remaining=0;s.elapsed=roundDuration(s.kind);if(s.kind==='rhythm')s.ended=true;else failRound(s,'timeout');}}
export function gameAction(s,action){if(s.ended)return;({drive:flameAction,blocks:mayAction,photo:breadAction,rhythm:tapRhythm,catch:runnerAction})[s.kind](s,action);}
export const RECORD_KEY='rescene.small-arcade.v1';
export function readRecords(storage){let data;try{data=JSON.parse(storage?.getItem(RECORD_KEY));}catch{/* Optional storage. */}return Object.fromEntries(GAME_IDS.map(k=>[k,Number.isSafeInteger(data?.[k])&&data[k]>=0?data[k]:0]));}
export function saveRecord(storage,kind,score){const records=readRecords(storage);if(!GAME_IDS.includes(kind)||!Number.isSafeInteger(score)||score<0)return {records,saved:false};records[kind]=Math.max(records[kind],score);try{storage.setItem(RECORD_KEY,JSON.stringify(records));return {records,saved:true};}catch{return {records,saved:false};}}
