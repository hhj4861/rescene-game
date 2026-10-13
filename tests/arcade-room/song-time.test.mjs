import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame,roundDuration,roundBudget,GAME_IDS} from '../../src/arcade-room/model.js';
import {restoreRound,snapshotRound} from '../../src/arcade-room/progress.js';
import {songItemSeconds} from '../../src/arcade-room/stage-songs.js';
function gift(s){
 if(s.kind==='drive'){s.spawn=15;s.objects=[{id:s.nextObject++,lane:s.lane,y:455,kind:'song'},{id:s.nextObject++,lane:0,y:180,kind:'song'}];}
 if(s.kind==='blocks'){s.spawn=15;s.enemies=[];s.items=[{x:s.player.x,y:s.player.y-22,kind:'honey',ttl:12},{x:400,y:100,kind:'honey',ttl:12}];}
 if(s.kind==='catch'){s.spawn=15;s.gates=[];s.enemies=[];s.pickups=[{lane:s.lane,y:440,kind:'love-attack'},{lane:0,y:200,kind:'pinball'}];}
 if(s.kind==='photo'){s.songDrops=2;gameAction(s,'song-pickup');}else stepGame(s,.025);
}
const count=s=>s.kind==='catch'?s.itemPickups:s.songPickups;
for(const kind of ['drive','blocks','photo','catch']){
 test(`${kind}: a song pickup guarantees 60 seconds, removes other gifts and saves the extended deadline`,()=>{
  const s=createGame(kind,{seed:7});s.elapsed=roundDuration(kind)-20;s.remaining=20;gift(s);assert.ok(Math.abs(s.remaining-60)<1e-7);assert.equal(count(s),1);assert.equal(s.songItemTime,songItemSeconds(s));assert.ok(Math.abs(roundBudget(s)-s.elapsed-60)<1e-7);
  if(kind==='drive')assert.equal(s.objects.filter(o=>o.kind==='song').length,0);if(kind==='blocks')assert.equal(s.items.filter(o=>o.kind==='honey').length,0);if(kind==='catch')assert.equal(s.pickups.length,0);if(kind==='photo')assert.equal(s.songDrops,1);
  const r=restoreRound(snapshotRound(s));assert.ok(r);assert.deepEqual(snapshotRound(r),snapshotRound(s));const bonus=s.songTimeBonus;gift(s);assert.equal(count(s),1);assert.equal(s.songTimeBonus,bonus,'duplicates cannot extend time or restart the waiting period');
  for(let i=0;i<21;i++){s.spawn=15;if(kind==='drive')s.objects=[];if(kind==='blocks')s.enemies=[];if(kind==='catch'){s.enemies=[];s.gates=[];}stepGame(s,1);}assert.equal(s.ended,false,'the original deadline must no longer end the round');assert.ok(s.remaining>38&&s.remaining<40);assert.ok(restoreRound(snapshotRound(s)));
 });
 test(`${kind}: the last simulation tick can extend time instead of timing out`,()=>{const s=createGame(kind,{seed:7});s.remaining=.01;s.elapsed=roundDuration(kind)-.01;gift(s);assert.equal(s.ended,false);assert.ok(s.remaining>=59.99);assert.ok(restoreRound(snapshotRound(s)));});
 test(`${kind}: a finished song allows the next gift to extend time again`,()=>{const s=createGame(kind,{seed:7});s.elapsed=roundDuration(kind)-20;s.remaining=20;gift(s);s.songItemTime=0;if(kind==='catch'){s.itemCooldown=0;s.songTime=0;}s.elapsed+=10;s.remaining-=10;gift(s);assert.equal(count(s),2);assert.ok(s.remaining>=59.99);assert.ok(restoreRound(snapshotRound(s)));});
}
test('songs never shorten an already long deadline, and Woni clocks remain independent',()=>{
 for(const kind of ['drive','blocks','catch']){const s=createGame(kind,{seed:7}),before=s.remaining;gift(s);assert.ok(Math.abs(s.remaining-before+.025)<1e-7);assert.equal(s.songTimeBonus,0);}
 const s=createGame('drive',{seed:7});s.elapsed=80;s.remaining=10;gift(s);const before=s.remaining;s.objects=[{id:s.nextObject++,lane:1,y:455,kind:'clock'}];stepGame(s,.025);assert.ok(Math.abs(s.remaining-before-9.975)<1e-7);assert.equal(s.timeBonus,10);assert.ok(restoreRound(snapshotRound(s)));
});
test('waiting timers advance with game time and suppress natural Woni and May drops',()=>{
 const s=createGame('drive',{seed:7});s.songItemTime=2;s.nextObject=2;s.spawn=0;stepGame(s,.025);assert.equal(s.objects[0].kind,'treat');assert.ok(s.songItemTime<2);s.songItemTime=.01;s.nextObject=2;s.spawn=0;s.objects=[];stepGame(s,.025);assert.equal(s.objects[0].kind,'song');
 const m=createGame('blocks',{seed:7});m.songItemTime=20;m.popped=2;m.enemies=[{x:90,y:536,home:0,dir:1,trapped:2,vy:0,think:1,angry:false}];gameAction(m,'bubble');assert.ok(m.items.length);assert.ok(m.items.every(i=>i.kind!=='honey'));m.songItemTime=0;m.cooldown=0;m.popped=2;m.enemies=[{x:90,y:536,home:0,dir:1,trapped:2,vy:0,think:1,angry:false}];gameAction(m,'bubble');assert.ok(m.items.some(i=>i.kind==='honey'));
});
test('legacy saves default to zero bonus, malformed bonuses fail safely and pump duration stays unchanged',()=>{
 for(const kind of GAME_IDS){const old=snapshotRound(createGame(kind,{seed:7}));delete old.songTimeBonus;delete old.songItemTime;assert.equal(restoreRound(old).songTimeBonus,0);for(const patch of [{songTimeBonus:-1},{songTimeBonus:Infinity},{songItemTime:100},{songTimeBonus:10}])assert.equal(restoreRound({...old,...patch}),null);}
 const pump=createGame('rhythm',{seed:7});assert.equal(roundBudget(pump),60);assert.equal(pump.songItemTime,0);
});
