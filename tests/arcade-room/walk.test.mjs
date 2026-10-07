import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {restoreRound,snapshotRound,readProgress,emptyProgress} from '../../src/arcade-room/progress.js';
function pickup(s,kind){s.objects=[{id:s.nextObject++,lane:s.lane,y:455,kind}];s.spawn=10;stepGame(s,.025);}
test('Woni and Byeol collect treats, gain protection, jump logs and must avoid puddles',()=>{
 const s=createGame('drive',{seed:7});
 for(let i=0;i<5;i++)pickup(s,'treat');assert.equal(s.hits,5);assert.equal(s.fever,8);assert.equal(s.songPickups,0);
 pickup(s,'puddle');assert.equal(s.hearts,3);s.fever=0;gameAction(s,'jump');pickup(s,'log');assert.equal(s.hearts,3);assert.equal(s.event,'walk-jump');
 pickup(s,'puddle');assert.equal(s.hearts,2);assert.equal(s.combo,0);pickup(s,'log');assert.equal(s.hearts,2);
});
test('song and clock rewards are distinct and consumed once',()=>{
 const s=createGame('drive',{seed:7});pickup(s,'song');assert.equal(s.songPickups,1);assert.equal(s.hits,0);assert.equal(s.timeBonus,0);stepGame(s,.1);assert.equal(s.songPickups,1);
 const before=s.remaining;pickup(s,'clock');assert.ok(Math.abs(s.remaining-before-9.975)<1e-7);assert.equal(s.songPickups,1);assert.equal(s.timeBonus,10);stepGame(s,.1);assert.equal(s.timeBonus,10);
 for(let i=0;i<7;i++)pickup(s,'clock');assert.equal(s.timeBonus,60);assert.equal(s.clockPickups,8);assert.equal(s.lastReward,'clock-max');assert.ok(restoreRound(snapshotRound(s)));
});
test('extra time remains after 90 seconds, survives reload and eventually times out',()=>{
 const s=createGame('drive',{seed:7});s.elapsed=89.95;s.remaining=.05;pickup(s,'clock');stepGame(s,.1);assert.equal(s.ended,false);assert.ok(s.elapsed>90);assert.ok(s.remaining>9);
 const r=restoreRound(snapshotRound(s));assert.ok(r);assert.equal(r.timeBonus,10);r.objects=[];r.spawn=15;stepGame(r,10);assert.equal(r.ended,true);assert.equal(r.endReason,'timeout');assert.equal(r.elapsed,100);assert.equal(r.hearts,2);
});
test('lane movement, jumps, gifts and deterministic spawns survive reload',()=>{
 const s=createGame('drive',{stage:8,seed:7});gameAction(s,0);gameAction(s,'jump');stepGame(s,.6);const resumed=restoreRound(snapshotRound(s));assert.ok(resumed);stepGame(s,.3);stepGame(resumed,.3);assert.deepEqual(snapshotRound(s),snapshotRound(resumed));
});
test('invalid bonuses are rejected; old games retain progress but restart only the active round',()=>{
 const s=snapshotRound(createGame('drive',{seed:7}));
 for(const patch of [{timeBonus:-10},{timeBonus:70},{timeBonus:10,clockPickups:0},{remaining:151},{songPickups:-1},{jumpTime:2}])assert.equal(restoreRound({...s,...patch}),null);
 const p=emptyProgress();p.games.drive={...p.games.drive,stage:8,highest:12,hearts:2,snapshot:{...s,stage:8,hearts:2,walkVersion:undefined,flameVersion:1}};
 const saved=readProgress({getItem:()=>JSON.stringify(p)});assert.equal(saved.games.drive.stage,8);assert.equal(saved.games.drive.highest,12);assert.equal(saved.games.drive.hearts,2);assert.equal(saved.games.drive.snapshot,null);
});
test('every route cycle offers song and clock gifts with a reproducible lane sequence',()=>{
 const s=createGame('drive',{seed:7}),seen=[];
 for(let i=0;i<20;i++){s.objects=[];s.spawn=0;stepGame(s,.025);seen.push(s.objects[0].kind);}
 assert.equal(seen.filter(k=>k==='song').length,2);assert.equal(seen.filter(k=>k==='clock').length,2);assert.equal(seen.filter(k=>k==='treat').length,8);
});
