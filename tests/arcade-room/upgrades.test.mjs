import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame,availableSwap} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound,isStageClear,stageGoal} from '../../src/arcade-room/progress.js';
import {LIV_ITEMS} from '../../src/arcade-room/runner.js';
test('damage protection groups a breach, expires, persists and never replenishes lives',()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[];
 const breach=()=>{s.enemies=[0,1,2].map(id=>({id,lane:0,y:479,hp:50,maxHp:50,boss:false}));stepGame(s,.1);};
 breach();assert.equal(s.hearts,2);const resumed=restoreRound(snapshotRound(s));assert.equal(resumed.damageCooldown,s.damageCooldown);breach();assert.equal(s.hearts,2);stepGame(s,1.5);breach();assert.equal(s.hearts,1);
});
test('May contact plus timeout consumes one life; a missed pump chord keeps playing without damage',()=>{
 const s=createGame('blocks',{seed:7});s.elapsed=179.95;s.remaining=.05;s.invincible=0;s.enemies=[{x:90,y:536,home:0,dir:1,trapped:0}];stepGame(s,.1);assert.equal(s.hearts,2);assert.equal(s.endReason,'timeout');
 const r=createGame('rhythm',{stage:3});const at=r.notes.find((n,i)=>i&&n.at===r.notes[i-1].at).at;r.notes.filter(n=>n.at<at).forEach(n=>n.status='hit');r.elapsed=at;r.remaining=60-at;stepGame(r,.3);assert.equal(r.misses,2);assert.equal(r.hearts,3);assert.equal(r.ended,false);
});
test('May drops reachable alternating items; speed and bubble hitboxes improve then expire',()=>{
 const s=createGame('blocks',{stage:4,seed:7});s.spawn=10;s.enemies=[{x:145,y:536,home:0,dir:1,trapped:4}];gameAction(s,'bubble');assert.equal(s.items[0].kind,'speed');s.player.x=145;stepGame(s,.03);assert.equal(s.itemPickups,1);const x=s.player.x;gameAction(s,'right');stepGame(s,.1);assert.ok(s.player.x-x>28);
 s.items=[{x:s.player.x,y:514,kind:'size',ttl:12}];gameAction(s,'stop');stepGame(s,.3);gameAction(s,'bubble');assert.equal(s.bubbles[0].radius,34);assert.ok(restoreRound(snapshotRound(s)));s.enemies=[{x:s.bubbles[0].x+39,y:536,home:0,dir:1,trapped:0}];stepGame(s,.025);assert.ok(s.enemies[0].trapped);
 s.enemies=[];s.popped=99;stepGame(s,10.1);assert.equal(s.speedBoost,0);assert.equal(s.sizeBoost,0);
});
test('positive gates strengthen distinct firing stats with caps and no repeat rewards',()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;
 for(let i=0;i<10;i++){s.gates=[{y:479,options:Array(3).fill({op:'add',value:4})}];stepGame(s,.05);s.gates=[{y:479,options:Array(3).fill({op:'multiply',value:2})}];stepGame(s,.05);}
 assert.equal(s.fireLevel,5);assert.equal(s.volley,5);assert.equal(s.squad,48);assert.ok(s.shots.length>5);assert.ok(restoreRound(snapshotRound(s)));assert.equal(s.gatesTaken,20);
});
for(const kind of LIV_ITEMS)test(`Liv ${kind} has a real combat effect and persists`,()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[];s.pickups=[{lane:1,y:440,kind}];s.enemies=[{id:0,lane:0,y:150,hp:50,maxHp:50,boss:false}];stepGame(s,.025);
 assert.equal(s.item,kind);assert.equal(s.itemPickups,1);assert.ok(restoreRound(snapshotRound(s)));
 assert.ok(s.shots.every(b=>b.kind===kind));
 if(kind==='love-attack'){assert.equal(s.shots[0].power,3);assert.equal(s.shots.length,2);}
 if(kind==='heart-drop')assert.equal(s.enemies[0].hp,45);
 if(kind==='new-world')assert.deepEqual(s.shots.map(b=>b.x).sort((a,b)=>a-b),[95,240,385]);
 s.itemTime=.01;stepGame(s,.025);assert.equal(s.item,'');
});
test('Liv must beat the final boss; boss escape ends only this round with one life lost',()=>{
 const s=createGame('catch',{seed:7});s.defeated=stageGoal('catch',1).target;s.elapsed=120;s.remaining=180;s.firstItemAt=0;s.enemies=[];stepGame(s,.025);assert.equal(isStageClear(s),false);const boss=s.enemies.find(e=>e.boss);assert.ok(boss);assert.ok(restoreRound(snapshotRound(s)));boss.hp=0;stepGame(s,.025);assert.equal(isStageClear(s),true);
 const loss=createGame('catch');loss.bossSpawned=true;loss.enemies=[{id:0,lane:0,y:479.9,hp:50,maxHp:50,boss:true}];stepGame(loss,.1);assert.equal(loss.hearts,2);assert.equal(loss.endReason,'boss');
});
test('rolling pin clears the selected row with falling frames, no move charge and no free refills',()=>{
 const s=createGame('photo',{seed:7});gameAction(s,'rolling-pin');gameAction(s,42);assert.equal(s.rollingPins,0);assert.equal(s.itemArmed,false);assert.equal(s.moves,36);assert.ok(s.collected>=20);assert.deepEqual(s.breadFrames[0].removed,Array.from({length:20},(_,i)=>40+i));assert.ok(s.breadFrames.some(f=>f.kind==='fall'));assert.equal(s.breadCharge,0);stepGame(s,5);gameAction(s,'rolling-pin');assert.equal(s.itemArmed,false);assert.ok(restoreRound(snapshotRound(s)));
});
test('normal cascades earn a capped rolling pin and an item voice cue',()=>{
 let found=false;for(let seed=1;seed<100&&!found;seed++){const s=createGame('photo',{seed});s.breadCharge=2;s.rollingPins=0;gameAction(s,{from:availableSwap(s.board)[0],to:availableSwap(s.board)[1]});if(s.combo>1){assert.ok(s.rollingPins>0);assert.ok(s.itemPickups>0);found=true;}}assert.ok(found);
});
test('old active saves migrate upgrades without changing score, stage or lives',()=>{
 const fields={blocks:['mayVersion','items','speedBoost','sizeBoost'],photo:['bakeryVersion','rollingPins','breadCharge','itemArmed'],catch:['upgradeVersion','fireLevel','volley','bossSpawned','bossDefeated','pickups','item','itemTime','itemClock','itemCount']};
 for(const [kind,keys] of Object.entries(fields)){const old=snapshotRound(createGame(kind,{stage:8,hearts:2,seed:7}));old.score=800;for(const k of [...keys,'damageCooldown','itemPickups'])delete old[k];const r=restoreRound(old);assert.ok(r,kind);assert.equal(r.score,800);assert.equal(r.hearts,2);assert.equal(r.stage,8);}
 for(const [kind,key,value] of [['blocks','speedBoost',Infinity],['catch','volley',50],['catch','pickups',[{kind:'tank',lane:0,y:100}]],['photo','rollingPins',999]]){const s=snapshotRound(createGame(kind));s[key]=value;assert.equal(restoreRound(s),null);}
});
