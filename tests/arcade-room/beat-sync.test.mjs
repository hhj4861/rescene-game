import test from 'node:test';
import assert from 'node:assert/strict';
import {MediaClock,beatShift} from '../../src/arcade-room/beat-sync.js';
import {createGame} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';
test('sparse playing time is interpolated for at most 250 ms and freezes on buffering',()=>{
 const c=new MediaClock();assert.equal(c.read(5,true,0),5);assert.equal(c.read(5,true,100),5.1);assert.equal(c.read(5,true,900),5.25);assert.equal(c.read(5,false,1000),5);assert.equal(c.read(5,false,1100),5);assert.equal(c.read(5.5,true,1200),5.5);c.reset();assert.equal(c.read(3,true,2000),3);
});
test('six consistent music taps find the video beat phase, irregular taps do not save a guess',()=>{
 for(const bpm of [100,105,112,135,170])for(const shift of [-.15,.12]){const taps=Array.from({length:6},(_,i)=>shift+(i+4)*60/bpm);assert.ok(Math.abs(beatShift(taps,bpm)-shift)<.002);}
 assert.equal(beatShift([0,.1,.2,.3,.4,.5],120),null);assert.equal(beatShift([1,2],120),null);
});
test('custom beat phases survive save/resume while legacy charts keep their original phase',()=>{
 const a=createGame('rhythm',{songId:'love-attack',beatShift:.12});const base=createGame('rhythm',{songId:'love-attack'});assert.ok(Math.abs(a.notes[0].at-base.notes[0].at-.12)<1e-9);assert.deepEqual(restoreRound(snapshotRound(a)).notes,a.notes);const old=snapshotRound(base);delete old.beatShift;assert.equal(restoreRound(old).beatShift,0);const bad=snapshotRound(a);bad.beatShift=Infinity;assert.equal(restoreRound(bad),null);
});
