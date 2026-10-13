import test from 'node:test';
import assert from 'node:assert/strict';
import {heldInput} from '../../src/arcade-room/held-input.js';
import {createGame,stepGame,makeRhythmNotes} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound,isStageClear} from '../../src/arcade-room/progress.js';
import {survivalDifficulty,survivalPower} from '../../src/arcade-room/may-survival.js';
import {walkLaneQuota} from '../../src/arcade-room/walk.js';

test('overlapping keys and pointers resume the last remaining direction without repeat stealing it',()=>{
 const m=heldInput();m.press('key:ArrowLeft','left');m.press('key:ArrowUp','up');
 assert.equal(m.press('key:ArrowLeft','left').action,'up');
 assert.equal(m.release('key:ArrowUp').action,'left');
 m.press('pointer:1','right');m.press('pointer:2','down');
 assert.equal(m.release('pointer:1').action,'down');
 assert.equal(m.has('pointer:2'),true);assert.equal(m.has('pointer:dash'),false);assert.equal(m.release('pointer:2').action,'left');m.clear();assert.equal(m.release('key:ArrowLeft'),null);
});
test('Woni cannot complete by parking on a single lane after collecting the first three stamps',()=>{
 const s=createGame('drive',{seed:7});s.laneTreats=[1,1,1];s.treatLanes=7;s.hits=3;s.spawn=10;
 for(let i=0;i<30;i++){s.objects=[{id:i,lane:1,y:455,kind:'treat'}];stepGame(s,.025);}
 assert.equal(isStageClear(s),false);assert.equal(s.laneTreats[0],1);
 for(const lane of [0,2])for(let i=1;i<walkLaneQuota(s);i++){s.lane=lane;s.x=[100,240,380][lane];s.objects=[{id:40+i,lane,y:455,kind:'treat'}];stepGame(s,.025);}
 assert.equal(isStageClear(s),true);assert.deepEqual(restoreRound(snapshotRound(s)).laneTreats,s.laneTreats);
 const legacy=snapshotRound(s);delete legacy.laneTreats;assert.ok(restoreRound(legacy));
});
test('intermediate pump chart adds notes gradually and v1 saved charts resume unchanged',()=>{
 const counts=[1,2,3].map(stage=>makeRhythmNotes(stage,'heart-drop').length);
 assert.ok(counts[1]>counts[0]&&counts[1]<counts[2]);assert.ok(counts[1]/counts[0]<=1.55);
 const old=createGame('rhythm',{stage:2,chartVersion:1,seed:7});stepGame(old,.5);
 const snap=snapshotRound(old);delete snap.chartVersion;const restored=restoreRound(snap);
 assert.equal(restored.chartVersion,1);assert.deepEqual(restored.notes,old.notes);
 assert.equal(restoreRound(snapshotRound(restored)).chartVersion,1);
 const fresh=createGame('rhythm',{stage:2});assert.equal(fresh.gauge,50);assert.equal(fresh.chartVersion,2);assert.ok(restoreRound(snapshotRound(fresh)));
});
test('May stage boundaries keep the same starting weapons and gradual combat ratios',()=>{
 for(let stage=1;stage<=30;stage++){
 const s=createGame('blocks',{stage,survival:true,seed:7});assert.deepEqual(s.upgrades,{star:1,orbit:0,boots:0,magnet:0});
 const d=survivalDifficulty(stage);assert.equal(d.hp/survivalPower(stage),1);
 if(stage>1){const before=survivalDifficulty(stage-1);assert.ok(d.speed>=before.speed&&d.spawn<=before.spawn);assert.ok(survivalPower(stage)/survivalPower(stage-1)<=1.101);}
 s.enemies=[{id:0,x:240,y:200,kind:'tank',hp:d.hp*3,flash:0}];s.spawn=10;stepGame(s,.025);assert.ok(restoreRound(snapshotRound(s)),`stage ${stage} fractional damage saves`);
 }
});
test('Liv waits for growth, summons with defeats, and has a bounded fallback without delaying on another pickup',()=>{
 for(const defeats of [0,12]){
 const s=createGame('catch',{seed:7});s.firstItemAt=5;s.defeated=defeats;s.spawn=10;s.gates=[];s.elapsed=49.9;s.remaining=300-s.elapsed;
 stepGame(s,.05);assert.equal(s.bossSpawned,false);stepGame(s,.1);assert.equal(s.bossSpawned,defeats===12);
 if(!defeats){s.elapsed=94.9;s.remaining=300-s.elapsed;stepGame(s,.05);assert.equal(s.bossSpawned,false);stepGame(s,.1);assert.equal(s.bossSpawned,true);}
 assert.equal(s.enemies.filter(e=>e.boss).length,1);assert.ok(restoreRound(snapshotRound(s)));
 }
});

test('three base hits defeat a tank at every stage without a floating-point fourth hit',()=>{
 for(let stage=1;stage<=30;stage++){
 const s=createGame('blocks',{stage,survival:true,seed:7}),power=survivalPower(stage);s.spawn=10;s.cooldown=.5;
 s.enemies=[{id:0,x:240,y:300,kind:'tank',hp:power*3,flash:0}];
 s.shots=Array.from({length:3},()=>({x:240,y:300,vx:0,vy:0,ttl:1,power,comet:false}));
 stepGame(s,.025);assert.equal(s.popped,1,`stage ${stage}`);
 }
});
