import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {stepPranks,PRANK_MEMBERS,prankActive} from '../../src/arcade-room/walk-pranks.js';
import {snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';
function cameo(member){const s=createGame('drive',{seed:7}),index=PRANK_MEMBERS.indexOf(member);s.prankIndex=index+1;s.prank={member,warning:0,time:4,lane:0};s.spawn=15;return s;}
test('each member visits once per stage, with warning, no overlap and expiry',()=>{
 for(const stage of [1,2,4,99]){const s=createGame('drive',{stage,seed:7}),seen=[];let last=0;for(let t=0;t<100;t+=.025){s.elapsed=t;stepPranks(s,.025);if(s.prankIndex!==last){last=s.prankIndex;seen.push(s.prank.member);assert.equal(s.prank.warning,1.5);for(const member of PRANK_MEMBERS)assert.equal(prankActive(s,member),false);}}
 assert.equal(seen.length,4);assert.equal(new Set(seen).size,4);assert.equal(s.prank,null);assert.equal(s.objects.filter(o=>o.kind==='bread').length,1);}
});
test('May slows movement only while active and Minami reverses both arrows and lane taps',()=>{
 const slow=cameo('may'),normal=createGame('drive',{seed:7});normal.spawn=15;gameAction(slow,'right');gameAction(normal,'right');stepGame(slow,.1);stepGame(normal,.1);assert.ok(slow.x<normal.x);slow.prank.time=.01;stepGame(slow,.025);assert.equal(slow.prank,null);
 const reverse=cameo('minami');gameAction(reverse,'left');assert.equal(reverse.lane,2);gameAction(reverse,2);assert.equal(reverse.lane,0);reverse.prank.warning=1;gameAction(reverse,'right');assert.equal(reverse.lane,1);reverse.prank=null;gameAction(reverse,'right');assert.equal(reverse.lane,2);
});
test('Zena bread can be jumped or shot, while a collision costs one life without counting a monster',()=>{
 for(const action of ['jump','attack',null]){const s=createGame('drive',{seed:7});s.spawn=15;s.objects=[{id:99,lane:1,y:action==='attack'?420:455,kind:'bread',hp:1}];if(action)gameAction(s,action);stepGame(s,.1);assert.equal(s.objects.length,0);assert.equal(s.hearts,action?3:2);assert.equal(s.defeated,0);if(action)assert.equal(s.score,20);}
});
test('active warnings/effects resume without repeating cameos and invalid prank state is rejected',()=>{
 for(const member of PRANK_MEMBERS){const s=cameo(member),copy=snapshotRound(s),r=restoreRound(copy);assert.ok(r);assert.deepEqual(r.prank,s.prank);assert.equal(r.prankIndex,s.prankIndex);r.prank.time=.02;stepGame(r,.025);assert.equal(r.prank,null);assert.equal(r.prankIndex,s.prankIndex);}
 const old=snapshotRound(createGame('drive'));delete old.prank;delete old.prankIndex;old.elapsed=40;old.remaining=50;const r=restoreRound(old);assert.ok(r);assert.equal(r.prank,null);assert.equal(r.prankIndex,2);
 for(const patch of [{prankIndex:5},{prank:{member:'woni',time:4,warning:0,lane:0}},{prank:{member:'liv',time:99,warning:0,lane:0}}])assert.equal(restoreRound({...snapshotRound(cameo('liv')),...patch}),null);
});

test('Zena bread uses a distinct object ID from paired monsters',()=>{
 const s=cameo('zena');s.nextObject=1;s.prank.warning=.01;s.objects=[{id:100001,lane:2,y:100,kind:'monster',hp:1}];stepPranks(s,.025);
 assert.equal(s.objects.length,2);assert.equal(new Set(s.objects.map(o=>o.id)).size,2);
});
