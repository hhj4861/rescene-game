import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDrive,steer,stepDrive,makeBlocks,moveBlock,rotateBlock,dropBlock,stepBlocks,readRecords,saveRecord,RECORD_KEY} from '../../src/arcade-room/model.js';
test('drive collects only in the occupied lane and collision grants a grace period',()=>{
  const s=makeDrive(()=>.5);s.objects=[{lane:1,y:.75,kind:'star'},{lane:0,y:.75,kind:'star'},{lane:1,y:.76,kind:'cone'},{lane:1,y:.77,kind:'cone'}];stepDrive(s,.01);
  assert.equal(s.stars,1);assert.equal(s.hearts,2);assert.ok(s.invincible>0);steer(s,-1);stepDrive(s,.01);assert.equal(s.stars,2);steer(s,-1);assert.equal(s.lane,0);
});
test('drive stops at sixty seconds or three collisions; ended state cannot move or score',()=>{
  const s=makeDrive(()=>0);for(let i=0;i<3;i++){s.invincible=0;s.objects=[{lane:1,y:.76,kind:'cone'}];stepDrive(s,.01);}assert.equal(s.ended,true);const score=s.score;steer(s,1);stepDrive(s,60);assert.equal(s.score,score);assert.equal(s.lane,1);
  const t=makeDrive(()=>0);t.remaining=.01;stepDrive(t,.05);assert.equal(t.remaining,0);assert.equal(t.ended,true);
});
test('one drop clears two rows simultaneously and preserves the next piece',()=>{
  const s=makeBlocks(()=>.2);for(let y=10;y<12;y++)s.board[y]=[1,1,1,0,0,1,1,1];s.active={cells:[[1,1],[1,1]],color:2,x:3,y:0};const next=s.next;dropBlock(s,true);
  assert.equal(s.lines,2);assert.equal(s.score,260);assert.ok(s.board.every(row=>row.every(v=>v===0)));assert.equal(s.active,next);
});
test('rotation kicks near the wall, movement cannot overlap occupied cells',()=>{
  const s=makeBlocks(()=>0);s.active={cells:[[1],[1],[1],[1]],x:6,y:2,color:1};assert.equal(rotateBlock(s),true);assert.equal(s.active.x,4);assert.equal(moveBlock(s,1),false);s.board[2][3]=2;assert.equal(moveBlock(s,-1),false);
});
test('blocked spawn ends a round and timeout prevents further placement',()=>{
  const s=makeBlocks(()=>.2);s.board[0][3]=1;s.active={cells:[[1]],x:0,y:11,color:1};dropBlock(s,true);assert.equal(s.ended,true);
  const t=makeBlocks();stepBlocks(t,60);const snapshot=JSON.stringify(t);dropBlock(t,true);assert.equal(JSON.stringify(t),snapshot);
});
test('records preserve each game, never downgrade, and tolerate denied or malformed storage',()=>{
  const values=new Map(),store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  saveRecord(store,'drive',300);saveRecord(store,'blocks',500);saveRecord(store,'drive',100);assert.deepEqual(readRecords(store),{drive:300,blocks:500});
  values.set(RECORD_KEY,'{"drive":-4,"blocks":"999"}');assert.deepEqual(readRecords(store),{drive:0,blocks:0});assert.equal(saveRecord(undefined,'drive',12).saved,false);assert.equal(saveRecord(store,'bad',12).saved,false);
});
