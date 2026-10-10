import {validSurvival} from './may-survival.js';
import {validPranks} from './walk-pranks.js';
import {breadMoves,foundBread,breadHunt,breadAreaCells,hiddenBreadAreas} from './bakery-hunt.js';
import {SONG_ITEM_SECONDS} from './song-time.js';
import {WALK_MAX_BONUS} from './walk.js';
import {songLedger} from './score-songs.js';
import {LIV_ITEMS,LEGACY_LIV_ITEMS,LIV_SONG_SECONDS,LIV_ITEM_INTERVAL} from './runner.js';
import {PUMP_SONGS} from './music.js';
/* global structuredClone */
import {GAME_IDS,INITIAL_LIVES,validStage,roundDuration,roundBudget,boardSize,stageBoardSize,createGame,stageTarget,availableSwap} from './model.js';
export const PROGRESS_KEY='rescene.arcade.journey.v1';
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const number=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const vector=(a,len,test)=>Array.isArray(a)&&a.length===len&&a.every(test);
const list=(a,max,test)=>Array.isArray(a)&&a.length<=max&&a.every(test);
export function stageGoal(kind,stage){return {target:stageTarget(kind,stage),unit:{drive:'간식',blocks:'방울',photo:'십원빵',rhythm:'박자',catch:'격파'}[kind]};}
export function stageValue(s){return s.kind==='blocks'?s.popped:s.kind==='photo'?foundBread(s):s.kind==='catch'?s.defeated:s.hits;}
export function isStageClear(s){if(s.kind==='blocks'&&s.mayVersion===3)return s.bossDefeated&&s.hearts>0&&!s.endReason;if(s.kind==='rhythm')return !!s.stage&&s.remaining<=.001&&s.gauge>0&&!s.endReason;return !!s.stage&&stageValue(s)>=(s.kind==='photo'?breadHunt(s).length:stageGoal(s.kind,s.stage).target)&&s.hearts>0&&!s.endReason&&(s.kind!=='catch'||s.bossDefeated>0)&&(s.kind!=='rhythm'||s.remaining<=.001);}
export function emptyProgress(){return {version:2,games:Object.fromEntries(GAME_IDS.map(id=>[id,{stage:1,highest:1,hearts:INITIAL_LIVES,snapshot:null,...(id==='catch'?{itemSongIndex:0}:id==='photo'?{songDrops:0}:{}),songs:songLedger()}]))};}
export function newRun(progress,kind){if(kind==='photo')progress.games.photo.songDrops=0;Object.assign(progress.games[kind],{stage:1,hearts:INITIAL_LIVES,snapshot:null});(progress.games[kind].songs??=songLedger()).roundHigh=0;}
export function snapshotRound(s){if(!s||s.ended||!s.stage)return null;const copy=JSON.parse(JSON.stringify(s));delete copy.event;delete copy.breadFrames;delete copy.breadDrag;if(s.kind==='photo')copy.flash=0;return copy;}
export function saveRound(progress,s){if(s?.kind==='photo')progress.games.photo.songDrops=s.songDrops;if(s?.kind==='catch')progress.games.catch.itemSongIndex=s.itemSongIndex;if(s&&!s.ended){const e=progress.games[s.kind];e.stage=s.stage;e.highest=Math.max(e.highest,s.stage);e.hearts=s.hearts;e.snapshot=snapshotRound(s);}}
function validState(s){
 if(!number(s.songTimeBonus,0,s.elapsed+.001)||!number(s.songItemTime,0,SONG_ITEM_SECONDS[s.kind])||(s.kind==='rhythm'&&s.songTimeBonus!==0)||!number(s.elapsed,0,roundBudget(s))||Math.abs(s.elapsed+s.remaining-roundBudget(s))>.001||!integer(s.hearts,1,3))return false;
 for(const key of ['itemPickups','hits','combo','bestCombo','misses','popped','collected','defeated','nextEnemy'])if(key in s&&!integer(s[key],0,100000))return false;
 for(const key of ['damageCooldown','spawn','invincible','cooldown','flash','burst','burstCooldown','energyClock'])if(key in s&&!number(s[key],0,15))return false;
 if(s.kind==='drive')return s.walkVersion===1&&integer(s.firePickups,0,3)&&integer(s.fireLevel,1,2)&&(s.fireLevel!==2||s.firePickups===3)&&integer(s.byeolTreats,0,2)&&number(s.byeolPower,0,6)&&number(s.allyShotCooldown,0,1)&&number(s.allyClearCooldown,0,4)&&validPranks(s)&&number(s.byeolTime,0,20)&&number(s.byeolCooldown,0,.45)&&number(s.transformTime,0,20)&&number(s.attackCooldown,0,.38)&&list(s.shots,32,b=>b&&number(b.x,100,380)&&number(b.y,100,465)&&['star','fire','blaze','paw','super-paw','heart'].includes(b.kind)&&(!['paw','super-paw','heart'].includes(b.kind)||[100,240,380].includes(b.targetX)))&&list(s.effects,12,e=>e&&number(e.x,100,380)&&number(e.y,0,550)&&number(e.ttl,0,.45))&&integer(s.songPickups,0,100000)&&integer(s.timeBonus,0,WALK_MAX_BONUS)&&s.timeBonus%10===0&&integer(s.clockPickups,0,100000)&&s.timeBonus===Math.min(WALK_MAX_BONUS,s.clockPickups*10)&&number(s.jumpTime,0,.8)&&number(s.jumpCooldown,0,1.05)&&number(s.rewardTime,0,1.4)&&['','treat','song','clock','clock-max','charmander','byeol'].includes(s.lastReward)&&integer(s.lane,0,2)&&number(s.x,100,380)&&integer(s.nextObject,0,100000)&&integer(s.heat,0,4)&&number(s.fever,0,8)&&number(s.shield,0,1.4)&&list(s.objects,24,o=>o&&integer(o.id,0,200000)&&integer(o.lane,0,2)&&number(o.y,0,560)&&['treat','song','clock','charmander','byeol','monster','puddle','log','bread'].includes(o.kind)&&(!['monster','bread'].includes(o.kind)||integer(o.hp,1,5)));
 if(s.kind==='blocks'&&s.mayVersion===3)return validSurvival(s);
 if(s.kind==='blocks'){const p=s.player;return integer(s.songPickups,0,100000)&& s.mayVersion===2&&integer(s.mayLayout,1,2)&&number(s.speedBoost,0,10)&&number(s.sizeBoost,0,10)&&list(s.items,4,i=>i&&number(i.x,0,480)&&number(i.y,0,536)&&['speed','size','honey'].includes(i.kind)&&number(i.ttl,0,12))&&p&&number(p.x,18,462)&&number(p.y,-220,536)&&number(p.vy,-600,1300)&&[-1,1].includes(p.facing)&&[-1,0,1].includes(p.dir)&&number(p.walk,0,.18)&&list(s.enemies,7,e=>e&&number(e.x,0,480)&&number(e.y,0,536)&&integer(e.home,0,3)&&[-1,1].includes(e.dir)&&number(e.trapped,0,5)&&number(e.vy??0,-550,1300)&&number(e.think??0,0,1.2)&&(e.angry===undefined||typeof e.angry==='boolean'))&&list(s.bubbles,8,b=>b&&number(b.x,-20,500)&&number(b.y,-250,600)&&[-260,260].includes(b.vx)&&number(b.ttl,0,3.2)&&(b.radius===undefined||[21,34].includes(b.radius)));}
 if(s.kind==='photo')return integer(s.songDrops,0,100000)&&integer(s.songPickups,0,100000)&&s.bakeryVersion===3&&vector(s.breadCover,s.board.length,v=>typeof v==='boolean')&&integer(s.rollingPins,0,2)&&integer(s.breadCharge,0,3)&&typeof s.itemArmed==='boolean'&&(!s.itemArmed||s.rollingPins>0)&&[6,20,5+s.stage,Math.min(10,5+s.stage),Math.min(20,5+s.stage),stageBoardSize(s.stage)].includes(boardSize(s))&&vector(s.board,boardSize(s)**2,n=>integer(n,0,5)||integer(n,11,15))&&integer(s.selected,-1,s.board.length-1)&&integer(s.moves,0,80)&&integer(s.shuffles,0,2)&&list(s.clearedCells,s.board.length*12,n=>integer(n,0,s.board.length-1))&&list(s.hint,2,n=>integer(n,0,s.board.length-1));
 if(s.kind==='rhythm'){const notes=createGame('rhythm',{stage:s.stage,songId:s.songId,beatShift:s.beatShift}).notes;return number(s.gauge,.000001,100)&&number(s.beatShift,-.6,.6)&&Object.hasOwn(PUMP_SONGS,s.songId)&&number(s.offset,-.2,.2)&&vector(s.lastTaps,5,n=>number(n,-1,60))&&vector(s.feedback,5,n=>['','WAIT','MISS','GOOD','PERFECT'].includes(n))&&vector(s.glows,5,n=>number(n,0,.25))&&vector(s.notes,notes.length,(n,i)=>n&&n.at===notes[i].at&&n.lane===notes[i].lane&&['waiting','hit','miss'].includes(n.status));}
 return (s.firstItemAt===null||number(s.firstItemAt,0,s.elapsed))&&integer(s.itemSongIndex,0,LIV_ITEMS.length-1)&&['',...LIV_ITEMS].includes(s.songItem)&&number(s.songTime,0,LIV_SONG_SECONDS)&&number(s.itemCooldown,0,LIV_ITEM_INTERVAL)&&s.upgradeVersion===1&&s.songVersion===1&&list(s.effects,40,e=>e&&['pinball','heart-drop'].includes(e.kind)&&number(e.x,0,480)&&number(e.toX,0,480)&&number(e.y,0,480)&&number(e.toY,0,480)&&number(e.ttl,0,.45))&&integer(s.fireLevel,0,5)&&integer(s.volley,1,5)&&typeof s.bossSpawned==='boolean'&&integer(s.bossDefeated,0,1)&&integer(s.itemCount,0,100000)&&['',...LIV_ITEMS].includes(s.item)&&number(s.itemTime,0,30)&&number(s.itemClock,0,1)&&list(s.pickups,3,i=>i&&integer(i.lane,0,2)&&number(i.y,0,540)&&LIV_ITEMS.includes(i.kind))&&s.runnerVersion===1&&integer(s.lane,0,2)&&number(s.x,95,385)&&integer(s.squad,1,60)&&integer(s.gatesTaken,0,1000)&&number(s.gateSpawn,0,6)&&number(s.shotClock,0,.28)&&integer(s.charge,0,5)&&number(s.gateFlash,0,.8)&&typeof s.lastGate==='string'&&s.lastGate.length<=8&&list(s.gates,3,g=>g&&number(g.y,0,480)&&vector(g.options,3,o=>o&&(o.op==='add'&&integer(o.value,-6,6)||o.op==='multiply'&&[1.5,2].includes(o.value))))&&list(s.enemies,13,e=>e&&integer(e.id,0,100000)&&integer(e.lane,0,2)&&number(e.y,0,480)&&integer(e.hp,-100,1000)&&integer(e.maxHp,1,1000)&&typeof e.boss==='boolean')&&list(s.shots,120,b=>b&&number(b.x,71,409)&&number(b.y,40,455)&&integer(b.power,1,17)&&['',...LIV_ITEMS].includes(b.kind)&&typeof b.returning==='boolean'&&list(b.hitIds,20,id=>integer(id,0,100000)));
}
// Upgrade a validated older board once. Keep earned bread and partial wrapper
// progress at the corresponding wrapper positions, plus all round resources.
function resizeBakery(s){
 const size=boardSize(s),nextSize=stageBoardSize(s.stage);
 if(size===nextSize)return;
 const fresh=createGame('photo',{stage:s.stage,seed:s.rngState}),cover=fresh.breadCover;
 for(let i=0;i<s.board.length;i++){
  const row=Math.floor(i/size),col=i%size;
  if(row<nextSize&&col<nextSize)cover[row*nextSize+col]=s.breadCover[i];
 }
 // Preserve special tiles when a former fixed 20x20 board becomes smaller.
 const specialCount=s.board.filter(v=>v>10).length;

 const oldAreas=breadHunt(s),newAreas=hiddenBreadAreas(nextSize,s.stage);
 for(let n=0;n<oldAreas.length;n++){
  const old=oldAreas[n],next=newAreas[n];if(!next)continue;
  if(old.found){for(const i of breadAreaCells(next,nextSize))cover[i]=true;continue;}
  for(let y=0;y<Math.min(old.h,next.h);y++)for(let x=0;x<Math.min(old.w,next.w);x++)
   if(s.breadCover[(old.y+y)*size+old.x+x])cover[(next.y+y)*nextSize+next.x+x]=true;
 }
 // A smaller board can have fewer wrappers. Keep earned bread even when its
 // old wrapper no longer has a corresponding position on the compact board.
 let earned=Math.min(oldAreas.filter(a=>a.found).length,newAreas.length)-newAreas.filter(a=>breadAreaCells(a,nextSize).every(i=>cover[i])).length;
 for(const area of newAreas){if(earned<=0)break;const cells=breadAreaCells(area,nextSize);if(cells.every(i=>cover[i]))continue;for(const i of cells)cover[i]=true;earned--;}
 let specials=specialCount;for(let i=0;i<fresh.board.length&&specials;i++)if(!cover[i]){fresh.board[i]+=10;specials--;}s.songDrops+=specials;
 Object.assign(s,{board:fresh.board,breadCover:cover,rngState:fresh.rngState,selected:-1,hint:fresh.hint,clearedCells:[],flash:0});
}
export function restoreRound(data){try{
 if(!data||data.schema!==3||!GAME_IDS.includes(data.kind)||!validStage(data.stage)||data.ended!==false||!number(data.remaining,.000001,roundDuration(data.kind)+(data.kind==='drive'?WALK_MAX_BONUS:0))||!integer(data.score,0,10000000)||!integer(data.rngState,0,4294967295))return null;
 if(data.kind==='drive'&&data.walkVersion!==1)return null;
 if(data.kind==='photo'&&data.bakeryVersion!==undefined&&![1,2,3].includes(data.bakeryVersion))return null;
 const s=createGame(data.kind,{survival:data.mayVersion===3,stage:data.stage,seed:data.rngState,hearts:data.hearts,offsetMs:(data.offset||0)*1000,songId:data.songId,beatShift:data.beatShift});
 for(const key of Object.keys(s)){if(key==='random'||key==='event')continue;if(!(key in data)){if(['songTimeBonus','songItemTime'].includes(key))continue;if(s.kind==='drive'&&['firePickups','fireLevel','byeolTreats','byeolPower','allyShotCooldown','allyClearCooldown'].includes(key))continue;if(s.kind==='photo'&&key==='breadCover'&&data.bakeryVersion!==2)continue;if(s.kind==='drive'&&data.prankIndex===undefined&&['prankIndex','prank'].includes(key))continue;if(s.kind==='drive'&&data.walkVersion===1&&['transformTime','attackCooldown','shots','effects','defeated','byeolTime','byeolCooldown'].includes(key))continue;if(s.kind==='photo'&&key==='songDrops')continue;if(s.kind==='rhythm'&&key==='gauge'||s.kind==='catch'&&key==='firstItemAt')continue;if(['blocks','photo'].includes(s.kind)&&key==='songPickups')continue;if(s.kind==='rhythm'&&key==='beatShift')continue;if(s.kind==='catch'&&['songItem','songTime','itemCooldown','itemSongIndex'].includes(key))continue;if(s.kind==='blocks'&&key==='mayLayout'&&(data.mayVersion===undefined||data.mayVersion===1))continue;if(s.kind==='rhythm'&&key==='songId'&&data.songId===undefined)continue;if(s.kind==='catch'&&data.songVersion===undefined&&['songVersion','effects'].includes(key))continue;if(['damageCooldown','itemPickups'].includes(key)||s.kind==='blocks'&&data.mayVersion===undefined&&['mayVersion','items','speedBoost','sizeBoost'].includes(key)||s.kind==='photo'&&data.bakeryVersion===undefined&&['bakeryVersion','rollingPins','breadCharge','itemArmed'].includes(key)||s.kind==='catch'&&data.upgradeVersion===undefined&&['upgradeVersion','fireLevel','volley','bossSpawned','bossDefeated','pickups','item','itemTime','itemClock','itemCount'].includes(key))continue;if(s.kind==='drive'&&data.chaseVersion===undefined&&['chaseVersion','heat','fever'].includes(key))continue;return null;}s[key]=structuredClone(data[key]);}
 if(s.kind==='photo'&&(data.bakeryVersion===undefined||data.bakeryVersion===1)){s.bakeryVersion=2;s.breadCover=Array(s.board.length).fill(false);for(const i of s.clearedCells)if(i>=0&&i<s.board.length)s.breadCover[i]=true;s.moves=Math.max(s.moves,breadMoves(s.stage));if(s.elapsed+s.remaining<=60+s.songTimeBonus+.001)s.remaining+=120;}
 if(['blocks','catch'].includes(s.kind)&&!s.songTimeBonus&&Math.abs(s.elapsed+s.remaining-60)<.001)s.remaining=roundDuration(s.kind)-s.elapsed;
 if(s.kind==='blocks')for(const item of s.items)if(item.kind==='song')item.kind='honey';
 if(s.kind==='catch'&&data.firstItemAt===undefined){if(s.itemPickups>0)s.firstItemAt=s.elapsed;s.bossSpawned=false;s.bossDefeated=0;s.enemies=s.enemies.filter(e=>!e.boss);}
 if(s.kind==='blocks'&&(data.mayVersion===undefined||data.mayVersion===1)){s.mayVersion=2;s.mayLayout=1;for(const e of s.enemies){e.vy??=0;e.think??=.8;e.angry??=false;}}
 if(s.kind==='catch'&&data.upgradeVersion===undefined)s.bossSpawned=s.enemies.some(e=>e.boss);
 if(s.kind==='catch'){if(data.songVersion===undefined){s.item=LEGACY_LIV_ITEMS[s.item]||s.item;for(const i of s.pickups)i.kind=LEGACY_LIV_ITEMS[i.kind]||i.kind;}for(const b of s.shots){b.kind??='';b.returning??=false;b.hitIds??=[];}}
 if(s.kind==='catch'&&data.songTime===undefined){s.songItem=s.item;s.songTime=s.itemTime?LIV_SONG_SECONDS-10+s.itemTime:0;s.itemCooldown=s.itemTime?LIV_ITEM_INTERVAL:0;}
 if(s.kind==='catch'&&data.itemSongIndex===undefined){const last=s.songItem||s.item;s.itemSongIndex=LIV_ITEMS.includes(last)?(LIV_ITEMS.indexOf(last)+1)%LIV_ITEMS.length:0;}
 if(s.kind==='drive'&&data.prankIndex===undefined){s.prankIndex=Math.min(4,Math.max(0,Math.ceil((s.elapsed-10)/15)));s.prank=null;}
 if(s.kind==='photo')s.bakeryVersion=3;
 if(!validState(s))return null;
 if(s.kind==='photo'){resizeBakery(s);for(let i=0;i<s.board.length;i++)if(s.breadCover[i]){if(s.board[i]>10)s.songDrops++;s.board[i]=0;}s.hint=availableSwap(s.board)||[];if(!s.hint.length&&s.board.some(Boolean)&&!s.rollingPins)s.rollingPins=1;}
 if(s.kind==='rhythm'){s.hearts=INITIAL_LIVES;s.damageCooldown=0;}
 s.event=null;return s;
 }catch{return null;}}
export function readProgress(storage){const progress=emptyProgress();let data;try{const raw=storage?.getItem(PROGRESS_KEY);data=JSON.parse(raw);}catch{return progress;}if(![1,2].includes(data?.version))return progress;
 for(const id of GAME_IDS){const source=data.games?.[id],entry=progress.games[id];if(!source)continue;if(data.version===1){let cleared=0;while(cleared<5&&Array.isArray(source.cleared)&&source.cleared.includes(cleared+1))cleared++;entry.stage=entry.highest=cleared+1;const old=source.snapshot;if(old?.kind===id&&validStage(old.stage)&&old.stage<=entry.highest){entry.stage=old.stage;if(integer(old.hearts,1,3))entry.hearts=old.hearts;}}else{if(!validStage(source.highest)||!validStage(source.stage)||source.stage>source.highest||!integer(source.hearts,0,3))continue;entry.stage=source.stage;entry.highest=source.highest;entry.hearts=source.hearts;}entry.songs=songLedger(source.songs);if(id==='rhythm')entry.hearts=INITIAL_LIVES;const restored=restoreRound(source.snapshot);if(restored?.kind===id&&restored.stage===entry.stage&&restored.hearts===entry.hearts)entry.snapshot=snapshotRound(restored);if(id==='photo')entry.songDrops=integer(source.songDrops,0,100000)?source.songDrops:entry.snapshot?.songDrops??0;if(id==='catch')entry.itemSongIndex=integer(source.itemSongIndex,0,LIV_ITEMS.length-1)?source.itemSongIndex:entry.snapshot?.itemSongIndex??0;if(!source.songs&&entry.snapshot)entry.songs.roundHigh=entry.snapshot.score;}return progress;}
export function saveProgress(storage,progress){try{storage.setItem(PROGRESS_KEY,JSON.stringify(progress));return true;}catch{return false;}}
export function finishStage(progress,s){if(s.settled)return s.cleared;if(!s.ended&&!isStageClear(s))return false;const entry=progress.games[s.kind];if(s.stage!==entry.stage)return false;const cleared=isStageClear(s);s.settled=true;s.cleared=cleared;entry.snapshot=null;entry.hearts=s.hearts;if(s.kind==='photo')entry.songDrops=s.songDrops;if(s.kind==='catch')entry.itemSongIndex=s.itemSongIndex;if(cleared){if(s.kind==='catch')entry.itemSongIndex=s.stage%LIV_ITEMS.length;entry.stage=Math.min(Number.MAX_SAFE_INTEGER,s.stage+1);entry.highest=Math.max(entry.highest,entry.stage);}return cleared;}
