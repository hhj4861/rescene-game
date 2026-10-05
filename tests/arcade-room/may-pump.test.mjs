import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {mayDifficulty} from '../../src/arcade-room/may.js';
import {PUMP_SONGS} from '../../src/arcade-room/music.js';
import {snapshotRound,restoreRound,isStageClear} from '../../src/arcade-room/progress.js';
test('May needs to approach trapped enemies and can chain connected bubbles only',()=>{
 const s=createGame('blocks',{seed:7});s.spawn=10;s.enemies=[150,220,290,420].map(x=>({x,y:536,home:0,dir:1,trapped:4}));gameAction(s,'bubble');assert.equal(s.popped,3);assert.equal(s.enemies[0].x,420);assert.equal(s.event,'bubble-chain');assert.ok(s.score>900);
 const far=createGame('blocks',{seed:7});far.enemies=[{x:200,y:536,home:0,dir:1,trapped:4}];gameAction(far,'bubble');assert.equal(far.popped,0);assert.equal(far.bubbles.length,1);
});
test('May enemies pursue across platforms, escaped enemies get angry, and snapshots retain that state',()=>{
 const s=createGame('blocks',{seed:7});s.spawn=10;s.player={...s.player,x:160,y:422};s.enemies=[{x:140,y:536,home:0,dir:1,trapped:0,vy:0,think:0,angry:false}];stepGame(s,.3);assert.ok(s.enemies[0].y<450);assert.ok(restoreRound(snapshotRound(s)));
 s.player.x=400;s.player.y=536;s.enemies=[{x:110,y:422,home:1,dir:1,trapped:.01}];stepGame(s,.025);assert.equal(s.enemies[0].angry,true);assert.equal(s.enemies[0].trapped,0);const r=restoreRound(snapshotRound(s));assert.ok(r);assert.equal(r.enemies[0].angry,true);
 const early=mayDifficulty(1),late=mayDifficulty(50);assert.ok(late.speed>early.speed);assert.ok(late.trap<early.trap);assert.ok(late.limit>early.limit);assert.ok(late.spawn<early.spawn);
});
test('May mirrored stages remain reachable and old saves migrate without losing lives',()=>{
 const s=createGame('blocks',{stage:2,seed:7});s.enemies=[];s.spawn=10;s.player.x=300;gameAction(s,'jump');stepGame(s,.65);assert.equal(s.player.y,422);gameAction(s,'jump');for(let i=0;i<14;i++){gameAction(s,'left');stepGame(s,.05);}gameAction(s,'stop');assert.equal(s.player.y,330);gameAction(s,'jump');for(let i=0;i<14;i++){gameAction(s,'right');stepGame(s,.05);}assert.equal(s.player.y,224);
 const old=snapshotRound(createGame('blocks',{stage:4,hearts:2,seed:7}));old.mayVersion=1;delete old.mayLayout;old.score=650;for(const e of old.enemies){delete e.vy;delete e.think;delete e.angry;}const r=restoreRound(old);assert.ok(r);assert.equal(r.mayVersion,2);assert.equal(r.mayLayout,1);assert.equal(r.hearts,2);assert.equal(r.score,650);assert.equal(r.stage,4);
 old.enemies[0].vy=Infinity;assert.equal(restoreRound(old),null);
});
for(const song of Object.values(PUMP_SONGS))for(const stage of [1,3,6])test(`Pump ${song.id} level ${stage} shares the song beat and clears only after the full track`,()=>{
 const s=createGame('rhythm',{stage,songId:song.id,seed:7});assert.equal(s.songId,song.id);assert.ok(restoreRound(snapshotRound(s)));
 for(const note of s.notes){assert.ok(Math.abs(note.at/(30/song.bpm)-Math.round(note.at/(30/song.bpm)))<1e-8);stepGame(s,note.at-s.elapsed);gameAction(s,note.lane);assert.equal(s.hearts,3);assert.equal(isStageClear(s),false);}
 stepGame(s,60-s.elapsed);assert.equal(s.ended,true);assert.equal(s.endReason,undefined);assert.equal(isStageClear(s),true);
});
test('legacy pump saves default to Five Steps; unknown song IDs do not restore',()=>{
 const old=snapshotRound(createGame('rhythm',{seed:7}));delete old.songId;assert.equal(restoreRound(old).songId,'five-steps');old.songId='unknown';assert.equal(restoreRound(old),null);
});

test('May pursuit reaches upper ledges and drops down even when the player stands directly below',()=>{
 for(const [home,x,playerX,playerY,target] of [[1,185,310,330,2],[2,285,140,224,3],[1,100,90,536,0]]){
  const s=createGame('blocks',{seed:7});s.spawn=10;s.player.x=playerX;s.player.y=playerY;s.enemies=[{x,y:home===1?422:330,home,dir:1,trapped:0,vy:0,think:0,angry:false}];let arrived=false;
  for(let i=0;i<100;i++){stepGame(s,.025);if(s.enemies[0].home===target)arrived=true;}
  assert.ok(arrived,`enemy must get from platform ${home} to ${target}`);
 }
});

test('May bounces only when landing on an empty bubble from above and can resume mid-bounce',()=>{
 const s=createGame('blocks',{seed:7});s.enemies=[];s.spawn=10;s.player.x=240;s.player.y=449;s.player.vy=150;s.bubbles=[{x:240,y:475,vx:260,ttl:2,radius:21}];
 stepGame(s,.05);assert.ok(s.player.vy<0);assert.equal(s.bubbles.length,0);assert.equal(s.event,'bubble-jump');assert.ok(restoreRound(snapshotRound(s)));
 const before=s.player.vy;gameAction(s,'jump');assert.equal(s.player.vy,before);
 for(const [x,y,vy] of [[240,485,-300],[360,449,150]]){const a=createGame('blocks',{seed:7});a.enemies=[];a.spawn=10;a.player={...a.player,x,y,vy};a.bubbles=[{x:240,y:475,vx:260,ttl:2,radius:21}];stepGame(a,.05);assert.equal(a.bubbles.length,1);assert.notEqual(a.event,'bubble-jump');}
 s.player.y=400;s.player.vy=0;gameAction(s,'jump');assert.equal(s.player.vy,0);
});
