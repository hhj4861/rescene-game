import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame,stageBoardSize,stageTarget} from '../../src/arcade-room/model.js';
import {breadHunt,breadAreaCells,foundBread,hiddenBreadAreas} from '../../src/arcade-room/bakery-hunt.js';
import {isStageClear,snapshotRound,restoreRound,emptyProgress,saveRound,readProgress} from '../../src/arcade-room/progress.js';
import {playBreadTurn} from '../helpers/bakery-player.mjs';
test('boards grow every five stages and never exceed 8x8; goals match nonoverlapping hidden bread',()=>{
 for(const [stage,size] of [[1,6],[5,6],[6,7],[10,7],[11,8],[15,8],[16,8],[100,8],[Number.MAX_SAFE_INTEGER,8]])assert.equal(stageBoardSize(stage),size);
 for(let stage=1;stage<=60;stage++){const size=stageBoardSize(stage),areas=hiddenBreadAreas(size,stage),all=areas.flatMap(a=>breadAreaCells(a,size));assert.equal(stageTarget('photo',stage),areas.length);assert.equal(all.length,new Set(all).size);assert.ok(all.every(i=>i>=0&&i<size*size));}
});
test('clearing only 63 cells of an 8x8 wrapper never awards its bread, even with a huge score',()=>{const s=createGame('photo',{stage:11,seed:7});s.collected=999;s.score=99999;s.breadCover.fill(true);s.breadCover[63]=false;assert.equal(foundBread(s),0);assert.equal(isStageClear(s),false);gameAction(s,'rolling-pin');gameAction(s,63);assert.equal(foundBread(s),1);assert.equal(isStageClear(s),true);assert.ok(s.flash>0);stepGame(s,10);assert.ok(!s.endReason);const r=restoreRound(snapshotRound(s));assert.ok(r);assert.equal(foundBread(r),1);});
test('wrapper progress persists after gravity, shuffle and reload and does not duplicate bread',()=>{const s=createGame('photo',{stage:2,seed:7});const a=breadHunt(s)[0];for(const i of breadAreaCells(a,6))s.breadCover[i]=true;assert.equal(foundBread(s),1);gameAction(s,'shuffle');const r=restoreRound(snapshotRound(s));assert.ok(r);assert.equal(foundBread(r),1);assert.deepEqual(r.breadCover,s.breadCover);assert.equal(restoreRound({...snapshotRound(r),breadCover:[true]}),null);});
test('legacy bakery saves retain points and lives and receive the new hunt time and moves',()=>{const old=snapshotRound(createGame('photo',{seed:7}));old.bakeryVersion=1;delete old.breadCover;old.remaining=40;old.elapsed=20;old.moves=9;old.score=800;old.hearts=2;const r=restoreRound(old);assert.ok(r);assert.equal(r.remaining,160);assert.equal(r.moves,36);assert.equal(r.score,800);assert.equal(r.hearts,2);assert.ok(restoreRound(snapshotRound(r)));});
test('a player aiming at covered areas can finish early hunts within the real time and move budget',()=>{for(const stage of [1,2,3,4,10,15]){const s=createGame('photo',{stage,seed:7});for(let turns=0;turns<80&&!s.ended&&!isStageClear(s);turns++){if(s.songDrops&&!s.songItemTime)gameAction(s,'song-pickup');playBreadTurn(s);stepGame(s,Math.max(1,s.flash+.1));}assert.ok(isStageClear(s),`stage ${stage}: ${foundBread(s)} bread, ${s.moves} moves, ${s.remaining} seconds`);}});

test('legacy late-stage 10x10 boards shrink to the current stage size and remain playable',()=>{const old=snapshotRound(createGame('photo',{stage:5,seed:7}));old.stage=12;old.board=Array.from({length:100},(_,i)=>old.board[i%old.board.length]);old.hint=[];old.bakeryVersion=1;delete old.breadCover;old.remaining=45;old.elapsed=15;old.moves=12;const r=restoreRound(old);assert.ok(r);assert.equal(r.board.length,64);assert.equal(r.breadCover.length,64);assert.equal(r.remaining,165);assert.ok(restoreRound(snapshotRound(r)));});

for(const [stage,size] of [[1,20],[2,20],[4,20],[12,10],[14,20],[16,20],[16,21],[36,41]])test(`stage ${stage} upgrades a ${size}x${size} save once without losing resources or wrapper progress`,()=>{
 const old=snapshotRound(createGame('photo',{stage,seed:7}));old.board=Array.from({length:size*size},(_,i)=>old.board[i%old.board.length]);old.breadCover=Array(size*size).fill(false);old.hint=[];
 const areas=hiddenBreadAreas(size,stage);for(const i of breadAreaCells(areas[0],size))old.breadCover[i]=true;
 if(areas[1])old.breadCover[breadAreaCells(areas[1],size)[0]]=true;
 old.board[0]=11;old.score=900;old.hearts=2;old.elapsed=30;old.remaining=150;old.moves=11;old.songDrops=2;old.songItemTime=25;
 const r=restoreRound(old);assert.ok(r);assert.equal(r.board.length,stageBoardSize(stage)**2);assert.equal(breadHunt(r)[0].found,true);
 if(breadHunt(r)[1])assert.equal(r.breadCover[breadAreaCells(breadHunt(r)[1],stageBoardSize(stage))[0]],true);
 for(const key of ['stage','score','hearts','elapsed','remaining','moves','songItemTime'])assert.equal(r[key],old[key]);
 assert.equal(r.board.filter(n=>n>10).length+r.songDrops-old.songDrops,1);assert.deepEqual(snapshotRound(restoreRound(snapshotRound(r))),snapshotRound(r));
});

test('large legacy saves shrink once while keeping earned bread, resources and a playable board',()=>{
 const s=createGame('photo',{stage:160,seed:7}),size=165,p=emptyProgress();
 s.board=Array.from({length:size*size},(_,i)=>s.board[i%s.board.length]);s.breadCover=Array(size*size).fill(false);s.hint=[];s.clearedCells=Array.from({length:5000},(_,i)=>i);
 // This earned wrapper lies outside the new board; do not discard its reward.
 for(const i of breadAreaCells(hiddenBreadAreas(size,160).at(-1),size))s.breadCover[i]=true;
 saveRound(p,s);const raw=JSON.stringify(p);assert.ok(raw.length>200000);const r=readProgress({getItem:()=>raw}).games.photo.snapshot;
 assert.ok(r);assert.equal(r.board.length,64);assert.equal(foundBread(r),1);assert.equal(r.clearedCells.length,0);assert.equal(r.moves,s.moves);assert.deepEqual(snapshotRound(restoreRound(r)),r);
});
