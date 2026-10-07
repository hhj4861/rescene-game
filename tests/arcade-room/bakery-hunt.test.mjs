import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame,stageBoardSize} from '../../src/arcade-room/model.js';
import {breadHunt,breadAreaCells,foundBread,hiddenBreadAreas} from '../../src/arcade-room/bakery-hunt.js';
import {isStageClear,snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';
import {playBreadTurn} from '../helpers/bakery-player.mjs';
test('fixed 20x20 from stage one and stage-specific wrappers stay within the board and never overlap',()=>{for(let stage=1;stage<=60;stage++){const size=stageBoardSize(stage);assert.equal(size,20);const all=hiddenBreadAreas(size,stage).flatMap(a=>breadAreaCells(a,size));assert.equal(all.length,new Set(all).size);assert.ok(all.every(i=>i>=0&&i<size*size));}assert.equal(stageBoardSize(15),20);assert.equal(stageBoardSize(100),20);assert.deepEqual(hiddenBreadAreas(7,2).map(a=>[a.w,a.h]),[[2,2],[3,3],[3,2]]);assert.deepEqual(hiddenBreadAreas(8,3).map(a=>[a.w,a.h]),[[8,8]]);});
test('clearing only 63 cells of an 8x8 wrapper never awards its bread, even with a huge score',()=>{const s=createGame('photo',{stage:3,seed:7});s.collected=999;s.score=99999;s.breadCover.fill(true);s.breadCover[147]=false;assert.equal(foundBread(s),0);assert.equal(isStageClear(s),false);gameAction(s,'rolling-pin');gameAction(s,147);assert.equal(foundBread(s),1);assert.equal(isStageClear(s),true);assert.ok(s.flash>0);stepGame(s,10);assert.ok(!s.endReason);const r=restoreRound(snapshotRound(s));assert.ok(r);assert.equal(foundBread(r),1);});
test('wrapper progress persists after gravity, shuffle and reload and does not duplicate bread',()=>{const s=createGame('photo',{stage:2,seed:7});const a=breadHunt(s)[0];for(const i of breadAreaCells(a,20))s.breadCover[i]=true;assert.equal(foundBread(s),1);gameAction(s,'shuffle');const r=restoreRound(snapshotRound(s));assert.ok(r);assert.equal(foundBread(r),1);assert.deepEqual(r.breadCover,s.breadCover);assert.equal(restoreRound({...snapshotRound(r),breadCover:[true]}),null);});
test('legacy bakery saves retain points and lives and receive the new hunt time and moves',()=>{const old=snapshotRound(createGame('photo',{seed:7}));old.bakeryVersion=1;delete old.breadCover;old.remaining=40;old.elapsed=20;old.moves=9;old.score=800;old.hearts=2;const r=restoreRound(old);assert.ok(r);assert.equal(r.remaining,160);assert.equal(r.moves,36);assert.equal(r.score,800);assert.equal(r.hearts,2);assert.ok(restoreRound(snapshotRound(r)));});
test('a player aiming at covered areas can finish early hunts within the real time and move budget',()=>{for(const stage of [1,2,3,4,10,15]){const s=createGame('photo',{stage,seed:7});for(let turns=0;turns<80&&!s.ended&&!isStageClear(s);turns++){if(s.songDrops&&!s.songItemTime)gameAction(s,'song-pickup');playBreadTurn(s);stepGame(s,Math.max(1,s.flash+.1));}assert.ok(isStageClear(s),`stage ${stage}: ${foundBread(s)} bread, ${s.moves} moves, ${s.remaining} seconds`);}});

test('legacy late-stage 10x10 boards expand to 20x20 and remain playable',()=>{const old=snapshotRound(createGame('photo',{stage:5,seed:7}));old.stage=12;old.board=old.board.slice(0,100);old.hint=[];old.bakeryVersion=1;delete old.breadCover;old.remaining=45;old.elapsed=15;old.moves=12;const r=restoreRound(old);assert.ok(r);assert.equal(r.board.length,400);assert.equal(r.breadCover.length,400);assert.equal(r.remaining,165);assert.ok(restoreRound(snapshotRound(r)));});

for(const [stage,size] of [[1,6],[2,7],[4,9],[12,10],[14,19]])test(`stage ${stage} upgrades a ${size}x${size} save once without losing resources or wrapper progress`,()=>{
 const old=snapshotRound(createGame('photo',{stage,seed:7}));old.board=old.board.slice(0,size*size);old.breadCover=Array(size*size).fill(false);old.hint=[];
 const areas=hiddenBreadAreas(size,stage);for(const i of breadAreaCells(areas[0],size))old.breadCover[i]=true;
 if(areas[1])old.breadCover[breadAreaCells(areas[1],size)[0]]=true;
 old.board[0]=11;old.score=900;old.hearts=2;old.elapsed=30;old.remaining=150;old.moves=11;old.songDrops=2;old.songItemTime=25;
 const r=restoreRound(old);assert.ok(r);assert.equal(r.board.length,400);assert.equal(breadHunt(r)[0].found,true);
 if(areas[1])assert.equal(r.breadCover[breadAreaCells(breadHunt(r)[1],20)[0]],true);
 for(const key of ['stage','score','hearts','elapsed','remaining','moves','songDrops','songItemTime'])assert.equal(r[key],old[key]);
 assert.equal(r.board.filter(n=>n>10).length,1);assert.deepEqual(snapshotRound(restoreRound(snapshotRound(r))),snapshotRound(r));
});
