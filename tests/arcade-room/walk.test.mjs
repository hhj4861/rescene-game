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
 for(let i=0;i<28;i++){s.objects=[];s.spawn=0;stepGame(s,.025);seen.push(s.objects[0].kind);}
 assert.equal(seen.filter(k=>k==='song').length,2);assert.equal(seen.filter(k=>k==='clock').length,2);assert.equal(seen.filter(k=>k==='treat').length,8);assert.equal(seen.filter(k=>k==='monster').length,8);assert.equal(seen.filter(k=>k==='charmander').length,2);
});

test('star attacks hit the nearest monster once, respect cooldown, and leave gifts intact',()=>{
 const s=createGame('drive',{seed:7});s.spawn=10;s.objects=[{id:0,lane:1,y:420,kind:'monster',hp:1},{id:1,lane:1,y:300,kind:'monster',hp:2},{id:2,lane:1,y:400,kind:'song'}];
 gameAction(s,'attack');gameAction(s,'attack');assert.equal(s.shots.length,1);stepGame(s,.1);assert.equal(s.defeated,1);assert.equal(s.score,150);assert.equal(s.objects.find(o=>o.id===1).hp,2);assert.ok(s.objects.some(o=>o.kind==='song'));stepGame(s,.1);assert.equal(s.defeated,1);
});
test('unblocked monsters damage Woni even while jumping; wrong-lane shots miss',()=>{
 const s=createGame('drive',{seed:7});s.spawn=10;s.objects=[{id:0,lane:0,y:420,kind:'monster',hp:1},{id:1,lane:1,y:455,kind:'monster',hp:1}];gameAction(s,'jump');s.shots=[{x:380,y:465,kind:'star'}];stepGame(s,.025);assert.equal(s.hearts,2);assert.equal(s.defeated,0);assert.ok(s.objects.some(o=>o.id===0));
});
test('Charmander grants 20 seconds of automatic fire, defeats armored monsters, and expires to star attacks',()=>{
 const s=createGame('drive',{stage:9,seed:7});pickup(s,'charmander');assert.equal(s.transformTime,20);assert.equal(s.lastReward,'charmander');s.objects=[{id:1,lane:1,y:380,kind:'monster',hp:3}];stepGame(s,.15);assert.equal(s.defeated,1);assert.equal(s.score,200);assert.equal(s.hearts,3);assert.ok(restoreRound(snapshotRound(s)));
 pickup(s,'charmander');assert.equal(s.transformTime,20,'a second pickup refreshes, never stacks beyond 20 seconds');s.transformTime=.01;s.shots=[];s.attackCooldown=0;s.objects=[];stepGame(s,.025);assert.equal(s.transformTime,0);gameAction(s,'attack');assert.equal(s.shots.at(-1).kind,'star');
});
test('combat snapshots restore deterministic projectiles and reject malformed combat state',()=>{
 const s=createGame('drive',{seed:7});pickup(s,'charmander');s.objects=[{id:1,lane:1,y:180,kind:'monster',hp:3}];stepGame(s,.1);const saved=snapshotRound(s),r=restoreRound(saved);assert.ok(r);stepGame(s,.2);stepGame(r,.2);assert.deepEqual(snapshotRound(r),snapshotRound(s));
 for(const patch of [{transformTime:21},{attackCooldown:1},{defeated:-1},{shots:[{x:240,y:300,kind:'unknown'}]},{objects:[{id:1,lane:1,y:180,kind:'monster',hp:0}]}])assert.equal(restoreRound({...saved,...patch}),null);
 const legacy=snapshotRound(createGame('drive',{seed:7}));for(const key of ['transformTime','attackCooldown','shots','effects','defeated'])delete legacy[key];assert.equal(restoreRound(legacy).transformTime,0);
});


test('three extra Charmanders evolve the active transformation, expire cleanly and restore old saves',()=>{
 const s=createGame('drive',{seed:7});pickup(s,'charmander');assert.equal(s.firePickups,0);
 for(let i=1;i<=3;i++){pickup(s,'charmander');assert.equal(s.firePickups,i);assert.equal(s.fireLevel,i===3?2:1);}
 s.shots=[];s.attackCooldown=0;gameAction(s,'attack');assert.equal(s.shots.length,3);assert.ok(s.shots.every(b=>b.kind==='blaze'));
 s.objects=[0,1,2].map(lane=>({id:lane,lane,y:400,kind:'monster',hp:5}));stepGame(s,.1);assert.equal(s.defeated,3);assert.ok(restoreRound(snapshotRound(s)));
 s.transformTime=.01;stepGame(s,.025);assert.equal(s.fireLevel,1);assert.equal(s.firePickups,0);
 const legacy=snapshotRound(createGame('drive'));for(const key of ['firePickups','fireLevel','byeolTreats','byeolPower','allyShotCooldown','allyClearCooldown'])delete legacy[key];assert.equal(restoreRound(legacy).fireLevel,1);
 for(const patch of [{fireLevel:3},{fireLevel:2,firePickups:0},{firePickups:4},{byeolTreats:3},{byeolPower:7},{allyClearCooldown:5}])assert.equal(restoreRound({...legacy,...patch}),null);
});
test('every three treats triggers six seconds of powerful Byeol homing without needing a carry item',()=>{
 const s=createGame('drive',{seed:7});pickup(s,'treat');pickup(s,'treat');assert.equal(s.byeolPower,0);pickup(s,'treat');assert.equal(s.byeolTreats,0);assert.equal(s.byeolPower,6);
 s.objects=[{id:5,lane:0,y:360,kind:'monster',hp:4}];s.spawn=10;stepGame(s,.4);assert.equal(s.defeated,1);assert.ok(restoreRound(snapshotRound(s)));s.objects=[];s.byeolPower=.01;stepGame(s,.025);assert.equal(s.byeolPower,0);
});
test('song helpers attack, clear obstacles, accelerate movement, attract treats and stop with the song',()=>{
 const s=createGame('drive',{seed:7});pickup(s,'song');s.objects=[{id:1,lane:0,y:340,kind:'monster',hp:2},{id:2,lane:2,y:200,kind:'log'},{id:3,lane:2,y:380,kind:'treat'}];s.spawn=10;stepGame(s,.025);
 assert.ok(s.shots.some(b=>b.kind==='heart'));assert.equal(s.objects.some(o=>o.kind==='log'),false);assert.equal(s.objects.find(o=>o.kind==='treat').lane,s.lane);assert.ok(restoreRound(snapshotRound(s)));
 gameAction(s,'left');const x=s.x;stepGame(s,.025);assert.ok(x-s.x>21.25);s.objects=[];s.shots=[];s.songItemTime=.01;stepGame(s,.025);assert.equal(s.songItemTime,0);s.objects=[{id:4,lane:2,y:200,kind:'log'},{id:5,lane:2,y:380,kind:'treat'}];stepGame(s,.025);assert.equal(s.objects.length,2);assert.equal(s.objects.find(o=>o.kind==='treat').lane,2);assert.equal(s.shots.length,0);
});
