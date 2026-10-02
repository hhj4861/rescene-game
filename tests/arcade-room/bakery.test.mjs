import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,swapBread,availableSwap,breadFrame,stepGame,gameAction} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';

test('each cascade falls into its cleared cells and new bread starts above the board',()=>{
 let cascades=0;
 for(let seed=1;seed<=40;seed++){
  const s=createGame('photo',{seed});swapBread(s,...availableSwap(s.board));assert.equal(breadFrame(s).kind,'swap');
  for(let n=1;n<s.breadFrames.length;n+=2){const pop=s.breadFrames[n],fall=s.breadFrames[n+1];assert.equal(pop.kind,'pop');assert.equal(fall.kind,'fall');if(pop.combo>1)cascades++;
   for(let col=0;col<6;col++){const survivors=[];for(let row=0;row<6;row++){const i=row*6+col;if(!pop.removed.includes(i))survivors.push({row,value:pop.board[i]});}
    for(let row=0;row<6;row++){const i=row*6+col,from=fall.fromRows[i];assert.ok(from<=row);if(from>=0){const source=survivors.find(x=>x.row===from);assert.ok(source);assert.equal(fall.board[i]%10,source.value%10);}else assert.ok(from>=-6);}
   }
  }
  const board=[...s.board],moves=s.moves;gameAction(s,'shuffle');gameAction(s,{from:0,to:1});assert.deepEqual(s.board,board);assert.equal(s.moves,moves);
  stepGame(s,10);assert.equal(breadFrame(s),null);
 }
 assert.ok(cascades>0);
});
test('an invalid adjacent exchange animates back without charging a move',()=>{
 const s=createGame('photo',{seed:7}),before=[...s.board];let pair;
 for(let i=0;i<35;i++){if(i%6===5)continue;const trial=createGame('photo',{seed:7});if(!swapBread(trial,i,i+1)){pair=[i,i+1];break;}}
 assert.ok(pair);assert.equal(swapBread(s,...pair),false);assert.deepEqual(s.board,before);assert.equal(s.moves,18);assert.equal(s.breadFrames.length,2);stepGame(s,.17);assert.equal(breadFrame(s).kind,'swap');stepGame(s,.2);assert.equal(s.flash,0);
});
test('saving during a fall preserves the settled board, score and RNG without replaying rewards',()=>{
 const s=createGame('photo',{seed:7});swapBread(s,...availableSwap(s.board));stepGame(s,.5);assert.equal(breadFrame(s).kind,'fall');
 const saved=snapshotRound(s),restored=restoreRound(saved);assert.ok(restored);assert.equal(restored.flash,0);assert.deepEqual(restored.board,s.board);assert.equal(restored.score,s.score);assert.equal(restored.rngState,s.rngState);assert.equal(restored.moves,17);assert.equal('breadFrames' in saved,false);
});

test('a winning match completes its animation without losing a life at the deadline',()=>{
 const s=createGame('photo',{seed:7});s.collected=17;s.elapsed=59.95;s.remaining=.05;swapBread(s,...availableSwap(s.board));stepGame(s,.3);assert.equal(s.hearts,3);assert.equal(s.ended,false);assert.ok(s.flash>0);stepGame(s,10);assert.equal(s.flash,0);assert.equal(s.hearts,3);assert.equal(s.endReason,undefined);const resumed=restoreRound(snapshotRound(s));assert.ok(resumed);stepGame(resumed,.05);assert.equal(resumed.endReason,undefined);assert.equal(resumed.hearts,3);
});
