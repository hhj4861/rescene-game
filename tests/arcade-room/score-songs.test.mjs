import test from 'node:test';
import assert from 'node:assert/strict';
import {creditSongPoints,songLedger,SONG_GAMES,nextSongScore} from '../../src/arcade-room/score-songs.js';
import {emptyProgress,newRun,readProgress,saveProgress,PROGRESS_KEY,snapshotRound} from '../../src/arcade-room/progress.js';
import {createGame} from '../../src/arcade-room/model.js';
test('milestones use earned cumulative points, coalesce jumps and exclude Pump and Zena',()=>{
 const e={songs:songLedger()};assert.equal(creditSongPoints(e,4999),0);assert.equal(creditSongPoints(e,5000),5000);assert.equal(creditSongPoints(e,5000),0);assert.equal(creditSongPoints(e,16300),15000);assert.equal(nextSongScore(e),20000);assert.deepEqual(SONG_GAMES,['drive','blocks','catch']);
});
test('penalty recovery does not count twice and a new run keeps song progress',()=>{
 const p=emptyProgress(),e=p.games.drive;creditSongPoints(e,4990);creditSongPoints(e,4800);assert.equal(creditSongPoints(e,4990),0);assert.equal(e.songs.points,4990);newRun(p,'drive');assert.equal(creditSongPoints(e,110),5000);assert.equal(e.songs.points,5100);
});
test('reload preserves consumed rewards and the active round high',()=>{
 const p=emptyProgress(),data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)};creditSongPoints(p.games.blocks,5300);saveProgress(storage,p);const e=readProgress(storage).games.blocks;assert.equal(creditSongPoints(e,5300),0);assert.equal(creditSongPoints(e,10000),10000);
});
test('legacy snapshots start a new ledger without retroactive credit',()=>{
 const p=emptyProgress(),s=createGame('drive',{seed:7});s.score=8000;p.games.drive.snapshot=snapshotRound(s);delete p.games.drive.songs;const e=readProgress({getItem:k=>k===PROGRESS_KEY?JSON.stringify(p):null}).games.drive;assert.equal(e.songs.roundHigh,8000);assert.equal(creditSongPoints(e,8110),0);assert.equal(e.songs.points,110);
});
test('invalid scores and saved fields cannot poison the ledger',()=>{
 const e={songs:songLedger({points:NaN,claimed:-1,roundHigh:Infinity})};for(const n of [-1,NaN,Infinity,'5000',.5])assert.equal(creditSongPoints(e,n),0);assert.deepEqual(e.songs,{points:0,claimed:0,roundHigh:0});
});
