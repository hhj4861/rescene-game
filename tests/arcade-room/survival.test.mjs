import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,gameAction} from '../../src/arcade-room/model.js';
import {restoreRound,snapshotRound,isStageClear} from '../../src/arcade-room/progress.js';
import {survivalDifficulty} from '../../src/arcade-room/may-survival.js';
const game=()=>createGame('blocks',{survival:true,seed:7});
test('survival attacks automatically, drops XP and freezes both combat and time during upgrade choice',()=>{
 const s=game();s.spawn=10;s.enemies=[{id:0,x:240,y:310,kind:'blob',hp:1,flash:0}];stepGame(s,.2);assert.equal(s.popped,1);assert.ok(s.items.length||s.xp);s.items=Array.from({length:5},()=>({x:s.player.x,y:s.player.y,kind:'xp',ttl:45}));stepGame(s,.025);assert.equal(s.level,2);assert.equal(s.upgradeChoices.length,3);const before=snapshotRound(s);stepGame(s,10);assert.deepEqual(snapshotRound(s),before);gameAction(s,'upgrade:bogus');assert.equal(s.upgradeChoices.length,3);gameAction(s,'upgrade:'+s.upgradeChoices[0]);assert.equal(s.upgradeChoices.length,0);stepGame(s,.025);assert.ok(s.elapsed>before.elapsed);assert.ok(restoreRound(snapshotRound(s)));
});
test('weapon combinations change projectiles and four-way movement and dash are bounded',()=>{
 const s=game();s.upgrades.star=3;s.upgrades.orbit=2;s.enemies=[{id:0,x:240,y:120,kind:'boss',hp:100,flash:0}];s.spawn=10;stepGame(s,.025);assert.equal(s.shots.length,3);assert.ok(s.shots.every(b=>b.comet));gameAction(s,'up');gameAction(s,'dash');stepGame(s,.3);assert.ok(s.player.y<250);assert.ok(s.player.y>=112);assert.ok(s.dashCooldown>3);gameAction(s,'stop');assert.equal(s.player.walk,0);assert.ok(restoreRound(snapshotRound(s)));
});
test('survival boss appears at 45 seconds, is required to clear, and stage difficulty rises',()=>{
 const s=game();s.popped=200;assert.equal(isStageClear(s),false);s.elapsed=44.99;s.remaining=180-s.elapsed;s.spawn=10;stepGame(s,.025);assert.ok(s.bossSpawned);const boss=s.enemies.find(e=>e.kind==='boss');assert.ok(boss);boss.hp=0;stepGame(s,.025);assert.equal(isStageClear(s),true);assert.ok(survivalDifficulty(10).hp>survivalDifficulty(1).hp);assert.ok(survivalDifficulty(10).spawn<survivalDifficulty(1).spawn);
});
test('survival snapshots resume deterministically and reject malformed growth or projectiles',()=>{
 const s=game();stepGame(s,1);const saved=snapshotRound(s),r=restoreRound(saved);assert.ok(r);stepGame(s,.1);stepGame(r,.1);assert.deepEqual(snapshotRound(s),snapshotRound(r));for(const patch of [{upgrades:{star:99,orbit:0,boots:0,magnet:0}},{upgradeChoices:['hack']},{dashCooldown:5},{player:null}])assert.equal(restoreRound({...saved,...patch}),null);
});
test('survival song item preserves the 60-second minimum and hides duplicate drops',()=>{
 const s=game();s.elapsed=160;s.remaining=20;s.spawn=10;s.items=[{x:240,y:360,kind:'honey',ttl:25},{x:260,y:360,kind:'honey',ttl:25}];stepGame(s,.025);assert.equal(s.songPickups,1);assert.ok(s.remaining>=59.9);assert.equal(s.songItemTime,60);assert.equal(s.items.some(i=>i.kind==='honey'),false);assert.ok(restoreRound(snapshotRound(s)));
});
