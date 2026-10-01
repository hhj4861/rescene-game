/* global structuredClone */
import {GAME_IDS,STAGE_COUNT,DURATION,COLS,ROWS,createGame,fits} from './model.js';
export const PROGRESS_KEY='rescene.arcade.journey.v1';
const TARGETS={drive:[3,5,7,9,12],blocks:[2,3,5,7,10],photo:[5,8,12,16,20],rhythm:[12,20,28,36,45],catch:[8,14,20,26,32]};
const UNITS={drive:'별',blocks:'줄',photo:'사진',rhythm:'박자',catch:'별'};
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const number=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function stageGoal(kind,stage){return {target:TARGETS[kind][stage-1],unit:UNITS[kind]};}
export function stageValue(s){return s.kind==='blocks'?s.lines:s.kind==='photo'?s.photos||0:s.kind==='rhythm'?s.hits:s.stars;}
export function isStageClear(s){return !!s.stage&&stageValue(s)>=stageGoal(s.kind,s.stage).target&&(s.kind!=='drive'||s.hearts>0);}
export function emptyProgress(){return {version:1,games:Object.fromEntries(GAME_IDS.map(id=>[id,{unlocked:1,cleared:[],best:Array(STAGE_COUNT).fill(0),snapshot:null}]))};}
function validPiece(p){return p&&integer(p.x,-3,COLS-1)&&integer(p.y,0,ROWS-1)&&integer(p.color,1,7)&&Array.isArray(p.cells)&&p.cells.length>=1&&p.cells.length<=4&&p.cells.every(row=>Array.isArray(row)&&row.length===p.cells[0].length&&row.length>=1&&row.length<=4&&row.every(n=>n===0||n===1))&&p.cells.flat().some(Boolean);}
export function restoreRound(data){
  try{
    if(!data||!GAME_IDS.includes(data.kind)||!integer(data.stage,1,STAGE_COUNT)||data.ended!==false||!number(data.remaining,.000001,DURATION)||!integer(data.score,0,10000000)||!integer(data.rngState,0,4294967295))return null;
    const s=createGame(data.kind,{stage:data.stage,seed:data.rngState,offsetMs:(data.offset||0)*1000});
    const scalarRanges={elapsed:[0,60],lane:[0,2],hearts:[1,3],spawn:[0,2],invincible:[0,1.4],stars:[0,1000],lines:[0,1000],fall:[0,2],shots:[0,1000],photos:[0,1000],perfect:[0,1000],combo:[0,1000],cooldown:[0,.65],flash:[0,.2],offset:[-.2,.2],bestCombo:[0,1000],hits:[0,1000],misses:[0,1000],lastTap:[-1,60]};
    for(const key of Object.keys(s)){
      if(key==='random'||key==='event')continue;
      if(scalarRanges[key]&&!number(data[key],...scalarRanges[key]))return null;
      if(['lane','hearts','stars','lines','shots','photos','perfect','combo','bestCombo','hits','misses'].includes(key)&&!Number.isInteger(data[key]))return null;
      if(key in data)s[key]=structuredClone(data[key]);
    }
    if(s.kind!=='blocks'&&Math.abs(s.elapsed+s.remaining-60)>.001)return null;
    if(['drive','catch'].includes(s.kind)){
      if(!Array.isArray(s.objects)||s.objects.length>100||!s.objects.every(o=>o&&integer(o.lane,0,2)&&number(o.y,-.1,1.2)&&typeof o.hit==='boolean'&&(s.kind==='drive'?['star','cone'].includes(o.kind):typeof o.blue==='boolean')))return null;
    }
    if(s.kind==='blocks'){
      if(!Array.isArray(s.board)||s.board.length!==ROWS||!s.board.every(row=>Array.isArray(row)&&row.length===COLS&&row.every(n=>integer(n,0,7)))||!validPiece(s.active)||!validPiece(s.next)||!fits(s,s.active))return null;
    }
    if(s.kind==='photo'&&(!Array.isArray(s.album)||s.album.length>5||!s.album.every(g=>['perfect','good','miss'].includes(g))||s.photos>s.shots||s.perfect>s.photos))return null;
    if(s.kind==='rhythm'){
      const expected=createGame('rhythm',{stage:s.stage}).notes;
      if(!Array.isArray(s.notes)||s.notes.length!==expected.length||!s.notes.every((n,i)=>n&&n.at===expected[i].at&&n.lane===expected[i].lane&&['waiting','hit','miss'].includes(n.status)))return null;
    }
    s.event=null;return s;
  }catch{return null;}
}
export function snapshotRound(s){if(!s||s.ended||!s.stage)return null;const copy=JSON.parse(JSON.stringify(s));delete copy.event;return copy;}
export function readProgress(storage){
  const progress=emptyProgress();let data;
  try{const raw=storage?.getItem(PROGRESS_KEY);if(raw?.length>200000)return progress;data=JSON.parse(raw);}catch{return progress;}
  if(data?.version!==1)return progress;
  for(const id of GAME_IDS){
    const source=data.games?.[id],entry=progress.games[id];if(!source)continue;
    // Only a contiguous sequence of cleared stages unlocks later stages.
    for(let stage=1;stage<=STAGE_COUNT&&Array.isArray(source.cleared)&&source.cleared.includes(stage);stage++)entry.cleared.push(stage);
    entry.unlocked=Math.min(STAGE_COUNT,entry.cleared.length+1);
    entry.best=entry.best.map((_,i)=>integer(source.best?.[i],0,10000000)?source.best[i]:0);
    const restored=restoreRound(source.snapshot);
    if(restored?.kind===id&&restored.stage<=entry.unlocked)entry.snapshot=snapshotRound(restored);
  }
  return progress;
}
export function saveProgress(storage,progress){try{storage.setItem(PROGRESS_KEY,JSON.stringify(progress));return true;}catch{return false;}}
export function finishStage(progress,s){
  const entry=progress.games[s.kind];entry.snapshot=null;const cleared=isStageClear(s);
  entry.best[s.stage-1]=Math.max(entry.best[s.stage-1],s.score);
  if(cleared&&!entry.cleared.includes(s.stage)&&s.stage<=entry.unlocked){entry.cleared.push(s.stage);entry.cleared.sort((a,b)=>a-b);entry.unlocked=Math.min(STAGE_COUNT,Math.max(entry.unlocked,s.stage+1));}
  return cleared;
}
