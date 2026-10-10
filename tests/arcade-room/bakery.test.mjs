import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,swapBread,availableSwap,breadFrame,stepGame,boardSize} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';

test('matched tiles are removed without falling or refill, leaving other tiles untouched',()=>{
 for(let seed=1;seed<=20;seed++){const s=createGame('photo',{seed});swapBread(s,...availableSwap(s.board));assert.equal(breadFrame(s).kind,'swap');const pop=s.breadFrames.find(f=>f.kind==='pop');for(let i=0;i<s.board.length;i++)assert.equal(s.board[i],pop.removed.includes(i)?0:pop.board[i]);assert.equal(s.breadFrames.some(f=>f.kind==='fall'),false);stepGame(s,1);assert.equal(breadFrame(s),null);}
});
test('an invalid adjacent exchange animates back without charging a move',()=>{
 const s=createGame('photo',{seed:7}),before=[...s.board];let pair;
 for(let i=0;i<s.board.length-1;i++){if(i%boardSize(s)===boardSize(s)-1)continue;const trial=createGame('photo',{seed:7});if(!swapBread(trial,i,i+1)){pair=[i,i+1];break;}}
 assert.ok(pair);assert.equal(swapBread(s,...pair),false);assert.deepEqual(s.board,before);assert.equal(s.moves,36);assert.equal(s.breadFrames.length,2);stepGame(s,.17);assert.equal(breadFrame(s).kind,'swap');stepGame(s,.2);assert.equal(s.flash,0);
});
test('saving during removal preserves the settled board, score and RNG without replaying rewards',()=>{
 const s=createGame('photo',{seed:7});swapBread(s,...availableSwap(s.board));stepGame(s,.2);assert.equal(breadFrame(s).kind,'pop');
 const saved=snapshotRound(s),restored=restoreRound(saved);assert.ok(restored);assert.equal(restored.flash,0);assert.deepEqual(restored.board,s.board);assert.equal(restored.score,s.score);assert.equal(restored.rngState,s.rngState);assert.equal(restored.moves,35);assert.equal('breadFrames' in saved,false);
});

test('a winning match completes its animation without losing a life at the deadline',()=>{
 const s=createGame('photo',{seed:7});s.breadCover.fill(true);s.elapsed=179.95;s.remaining=.05;swapBread(s,...availableSwap(s.board));stepGame(s,.3);assert.equal(s.hearts,3);assert.equal(s.ended,false);assert.ok(s.flash>0);stepGame(s,10);assert.equal(s.flash,0);assert.equal(s.hearts,3);assert.equal(s.endReason,undefined);const resumed=restoreRound(snapshotRound(s));assert.ok(resumed);stepGame(resumed,.05);assert.equal(resumed.endReason,undefined);assert.equal(resumed.hearts,3);
});
