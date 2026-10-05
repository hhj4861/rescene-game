import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame} from '../../src/arcade-room/model.js';
import {LIV_ITEMS,LEGACY_LIV_ITEMS,runnerDifficulty} from '../../src/arcade-room/runner.js';
import {restoreRound,snapshotRound} from '../../src/arcade-room/progress.js';
function arena(item){const s=createGame('catch',{seed:7});s.spawn=10;s.gateSpawn=6;s.gates=[];s.item=item;s.itemTime=10;return s;}
function enemy(id,lane,y=300,hp=50){return {id,lane,y,hp,maxHp:hp,boss:false};}
test('Love Attack hearts deal extra damage and Pinball ricochets across three enemies',()=>{
 const love=arena('love-attack');love.enemies=[enemy(1,1,400)];stepGame(love,.15);assert.ok(love.enemies[0].hp<48);assert.ok(love.shots.every(b=>b.kind==='love-attack'));
 const pin=arena('pinball');pin.enemies=[enemy(1,1,400),enemy(2,0,380),enemy(3,2,370)];stepGame(pin,.15);assert.ok(pin.enemies.every(e=>e.hp<50));assert.equal(pin.effects.filter(e=>e.kind==='pinball').length,2);assert.ok(restoreRound(snapshotRound(pin)));
});
test('Heart Drop damages every lane; YoYo pierces and returns; New World fires on all lanes',()=>{
 const rain=arena('heart-drop');rain.enemies=[0,1,2].map(i=>enemy(i,i));stepGame(rain,.025);assert.ok(rain.enemies.every(e=>e.hp===45));assert.equal(rain.effects.length,3);
 const yoyo=arena('yoyo');yoyo.enemies=[enemy(1,1,250),enemy(2,1,350)];stepGame(yoyo,.65);assert.ok(yoyo.enemies.every(e=>e.hp<50));assert.ok(yoyo.shots.some(b=>b.returning));assert.ok(restoreRound(snapshotRound(yoyo)));
 const world=arena('new-world');stepGame(world,.025);assert.deepEqual(world.shots.map(b=>b.x),[240,95,385]);
});
test('old Liv items migrate to song attacks without replaying pickups or changing progress',()=>{
 for(const [old,kind] of Object.entries(LEGACY_LIV_ITEMS)){const s=arena('');s.item=old;s.itemTime=6;s.itemPickups=4;s.score=800;s.pickups=[{lane:0,y:200,kind:old}];const saved=snapshotRound(s);delete saved.songVersion;delete saved.effects;const r=restoreRound(saved);assert.ok(r);assert.equal(r.item,kind);assert.equal(r.itemTime,6);assert.equal(r.itemPickups,4);assert.equal(r.score,800);assert.equal(r.pickups[0].kind,kind);}
 const bad=snapshotRound(arena('pinball'));bad.effects=[{kind:'pinball',x:0,y:0,toX:10000,toY:0,ttl:1}];assert.equal(restoreRound(bad),null);
});
test('new gates grow slower and later waves include simultaneous enemies',()=>{
 const s=arena('');s.gates=createGame('catch').gates;s.gates[0].y=479;stepGame(s,.025);assert.equal(s.squad,4);assert.equal(s.lastGate,'×1.5');s.gates=[];s.gateSpawn=0;stepGame(s,.025);assert.ok(s.gates[0].options.every(o=>o.op==='multiply'?o.value===1.5:o.value<=3));
 const late=createGame('catch',{stage:10});late.nextEnemy=3;late.spawn=0;late.gatesTaken=2;stepGame(late,.025);assert.equal(late.enemies.length,2);assert.ok(restoreRound(snapshotRound(late)));assert.ok(runnerDifficulty(1).hp>8);assert.ok(runnerDifficulty(1).spawn<1.65);assert.equal(LIV_ITEMS.length,5);
});

test('song pickup protects a 20-second song and separates later drops by at least 24 seconds',()=>{
 const s=arena('');s.pickups=[{lane:1,y:440,kind:'love-attack'},{lane:1,y:450,kind:'pinball'}];
 stepGame(s,.025);assert.equal(s.itemPickups,1);assert.equal(s.item,'love-attack');assert.equal(s.songItem,'love-attack');assert.equal(s.songTime,20);assert.equal(s.itemCooldown,24);assert.equal(s.pickups.length,0);
 s.enemies=[enemy(8,1,200,0)];stepGame(s,.025);assert.equal(s.pickups.length,0);assert.equal(s.songItem,'love-attack');
 s.itemTime=.01;stepGame(s,.025);assert.equal(s.item,'');assert.equal(s.songItem,'love-attack');assert.ok(s.songTime>19);assert.ok(s.itemCooldown>23);
 const restored=restoreRound(snapshotRound(s));assert.ok(restored);assert.equal(restored.songTime,s.songTime);assert.equal(restored.itemCooldown,s.itemCooldown);
 restored.itemCooldown=.01;restored.songTime=0;restored.songItem='';restored.defeated=2;restored.enemies=[enemy(9,1,200,0)];stepGame(restored,.025);assert.equal(restored.pickups.length,1);
});
test('legacy song saves resume at the same media position and reject invalid timers',()=>{
 const old=snapshotRound(arena('pinball'));delete old.songItem;delete old.songTime;delete old.itemCooldown;old.itemTime=6;
 const s=restoreRound(old);assert.ok(s);assert.equal(s.songItem,'pinball');assert.equal(s.songTime,16);assert.equal(20-s.songTime,10-old.itemTime);
 for(const [key,value] of [['songTime',21],['itemCooldown',25],['songItem','unknown']]){const bad=snapshotRound(s);bad[key]=value;assert.equal(restoreRound(bad),null);}
});
