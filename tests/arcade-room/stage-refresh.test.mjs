import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame,stageSpeed} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound,finishStage,emptyProgress} from '../../src/arcade-room/progress.js';
import {stageItemSong,songItemSeconds} from '../../src/arcade-room/stage-songs.js';
import {collectSongTime} from '../../src/arcade-room/song-time.js';
import {walkDifficulty} from '../../src/arcade-room/walk.js';
import {mayDifficulty} from '../../src/arcade-room/may.js';
import {runnerDifficulty} from '../../src/arcade-room/runner.js';
test('each item-song game changes songs by stage without loops and uses actual clip duration',()=>{
 for(const kind of ['drive','blocks','photo']){let previous;for(let stage=1;stage<=14;stage++){const song=stageItemSong(kind,stage);assert.notEqual(song.title,previous);previous=song.title;assert.equal(song.loop,false);assert.ok(song.itemSeconds>=41);const s=createGame(kind,{stage});assert.ok(collectSongTime(s));assert.equal(s.songItemTime,songItemSeconds(s));assert.ok(restoreRound(snapshotRound(s)));assert.equal(collectSongTime(s),false);}}
 assert.equal(stageItemSong('blocks',1).end-stageItemSong('blocks',1).start,60);assert.equal(stageItemSong('rhythm'),null);
});
test('Byeol pickup attacks another lane, survives save, coexists with fire and stops when expired',()=>{
 const s=createGame('drive',{seed:7});s.spawn=15;s.objects=[{id:0,lane:1,y:455,kind:'byeol'}];stepGame(s,.025);assert.equal(s.byeolTime,20);assert.equal(s.lastReward,'byeol');s.objects=[{id:1,lane:0,y:300,kind:'monster',hp:2},{id:2,lane:2,y:260,kind:'monster',hp:2}];stepGame(s,.1);assert.ok(s.shots.some(b=>b.kind==='paw'));const r=restoreRound(snapshotRound(s));assert.ok(r);stepGame(s,.7);stepGame(r,.7);assert.deepEqual(snapshotRound(s),snapshotRound(r));assert.ok(s.defeated>=1);assert.equal(s.hearts,3);
 s.transformTime=2;s.attackCooldown=0;gameAction(s,'attack');assert.ok(s.shots.some(b=>b.kind==='fire'));s.byeolTime=.01;s.shots=[];s.transformTime=0;stepGame(s,.025);assert.equal(s.byeolTime,0);assert.equal(s.shots.length,0);
 const old=snapshotRound(createGame('drive'));delete old.byeolTime;delete old.byeolCooldown;assert.equal(restoreRound(old).byeolTime,0);assert.equal(restoreRound({...old,byeolTime:21}),null);
});
test('stage three has two-lane armored waves and later stages increase pressure within bounds',()=>{
 const early=walkDifficulty(1,stageSpeed({stage:1})),late=walkDifficulty(5,stageSpeed({stage:5}));assert.ok(late.speed>early.speed*1.3);assert.ok(late.spawn<early.spawn*.75);assert.ok(late.hp>early.hp);
 const s=createGame('drive',{stage:3,seed:7});s.spawn=0;s.nextObject=1;stepGame(s,.025);assert.equal(s.objects.length,2);assert.equal(new Set(s.objects.map(o=>o.lane)).size,2);assert.ok(restoreRound(snapshotRound(s)));
 assert.ok(mayDifficulty(5).speed>mayDifficulty(1).speed*1.5);assert.ok(runnerDifficulty(5).hp>runnerDifficulty(1).hp*2);assert.ok(stageSpeed({stage:1e6})<2.4);
});
test('Liv next stage starts on another song while retries retain their earned rotation',()=>{
 const p=emptyProgress(),s=createGame('catch');s.itemSongIndex=4;s.defeated=99;s.bossDefeated=1;assert.ok(finishStage(p,s));assert.equal(p.games.catch.itemSongIndex,1);
 const retry=createGame('catch',{stage:2,itemSongIndex:3});retry.ended=true;retry.endReason='timeout';finishStage(p,retry);assert.equal(p.games.catch.itemSongIndex,3);
});
