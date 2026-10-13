import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,matches,gameAction,stepGame,swapBread,availableSwap} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';
test('2x2 squares match without a three-in-a-row and empty cells never match',()=>{
 const b=[1,1,2,3,1,1,3,2,2,3,4,5,3,2,5,4];assert.deepEqual(matches(b).sort((a,b)=>a-b),[0,1,4,5]);assert.deepEqual(matches(Array(16).fill(0)),[]);
});
test('removed cells stay empty through time, shuffle and reload; empty swaps do nothing',()=>{
 const s=createGame('photo',{seed:7});swapBread(s,...availableSwap(s.board));const empty=s.board.map((v,i)=>v===0?i:-1).filter(i=>i>=0),count=s.board.filter(Boolean).length;assert.ok(empty.length>=3);stepGame(s,1);assert.equal(swapBread(s,empty[0],empty[0]+1),false);gameAction(s,'shuffle');assert.ok(s.board.filter(Boolean).length<=count);assert.ok(empty.every(i=>s.board[i]===0));const r=restoreRound(snapshotRound(s));assert.ok(r);assert.deepEqual(r.board,s.board);
});
test('stuck finite boards provide a rolling pin to finish isolated remaining tiles',()=>{
 const s=createGame('photo');s.board=Array(36).fill(0);s.board[0]=1;s.board[35]=2;s.breadCover=s.board.map(v=>!v);s.rollingPins=1;gameAction(s,'rolling-pin');gameAction(s,0);assert.equal(s.board[0],0);assert.equal(s.rollingPins,1);stepGame(s,1);gameAction(s,'rolling-pin');gameAction(s,35);assert.ok(s.board.every(v=>v===0));
});

test('full rolling-pin storage caps charge and remains restorable after further matches',()=>{
 const s=createGame('photo',{seed:7});s.rollingPins=2;s.breadCharge=3;swapBread(s,...availableSwap(s.board));assert.equal(s.breadCharge,3);assert.ok(restoreRound(snapshotRound(s)));
});
