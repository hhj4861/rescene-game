import test from 'node:test';
import assert from 'node:assert/strict';
import {RESCENE_SONGS,DEFAULT_PUMP_SONG,musicStep} from '../../src/arcade-room/music.js';
import {mediaAdvance,PumpVideo} from '../../src/arcade-room/pump-video.js';
import {createGame} from '../../src/arcade-room/model.js';
import {restoreRound,snapshotRound} from '../../src/arcade-room/progress.js';
test('five official videos have distinct verified IDs, beat grids and restorable rounds',()=>{
 const songs=Object.values(RESCENE_SONGS);assert.equal(songs.length,5);assert.equal(new Set(songs.map(s=>s.videoId)).size,5);assert.ok(RESCENE_SONGS[DEFAULT_PUMP_SONG]);
 for(const song of songs){assert.match(song.videoId,/^[\w-]{11}$/);assert.equal(song.file,undefined);assert.deepEqual(musicStep('rhythm',1,song.id),[]);const s=createGame('rhythm',{songId:song.id});assert.equal(restoreRound(snapshotRound(s)).songId,song.id);assert.ok(s.notes.every(n=>Math.abs(n.at/(30/song.bpm)-Math.round(n.at/(30/song.bpm)))<1e-8));}
});
test('video time freezes on buffering, ignores jitter and stops unexpected seek jumps',()=>{
 assert.deepEqual(mediaAdvance(2,5,false),{dt:0,jump:false});assert.deepEqual(mediaAdvance(2,2.25,true),{dt:.25,jump:false});assert.deepEqual(mediaAdvance(2,1.9,true),{dt:0,jump:false});
 assert.deepEqual(mediaAdvance(2,20,true),{dt:0,jump:true});assert.deepEqual(mediaAdvance(20,2,true),{dt:0,jump:true});assert.deepEqual(mediaAdvance(59.9,60.2,true),{dt:60-59.9,jump:false});assert.deepEqual(mediaAdvance(2,NaN,true),{dt:0,jump:false});
});

test('a native video end slightly before 60 seconds still completes the round clock',()=>{
 const player=new PumpVideo({},{});player.ready=true;player.wanted=true;player.syncing=false;player.player={getPlayerState:()=>0,getCurrentTime:()=>59.98};assert.ok(Math.abs(player.sample(59.8).dt-.2)<1e-8);
});
