import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACKS,PUMP_BEAT,musicStep} from '../../src/arcade-room/music.js';
import {ArcadeAudio} from '../../src/arcade-room/audio.js';
import {makeRhythmNotes} from '../../src/arcade-room/model.js';

test('five original scores differ and every pump step lies on the musical beat grid',()=>{
 assert.equal(new Set(Object.keys(TRACKS).map(k=>JSON.stringify(musicStep(k,0)))).size,5);
 for(const kind of Object.keys(TRACKS))for(let i=0;i<64;i++)assert.deepEqual(musicStep(kind,i).map(n=>({...n,at:0})),musicStep(kind,i+64).map(n=>({...n,at:0})));
 for(const stage of [1,2,3,4,8,100]){
  const notes=makeRhythmNotes(stage);assert.equal(notes[0].at,4*PUMP_BEAT);
  for(const n of notes)assert.equal(n.at/(PUMP_BEAT/2)%1,0);
 }
 assert.ok(makeRhythmNotes(4).length>makeRhythmNotes(1).length);
});
function fixture(){
 const a=new ArcadeAudio(),calls=[];a.context={state:'running',currentTime:10};
 a.musicNote=(note,at)=>calls.push({...note,scheduledAt:at});return {a,calls};
}
test('music uses one clock anchor, avoids duplicate notes and resumes at the saved beat',()=>{
 const {a,calls}=fixture(),s={kind:'rhythm',elapsed:0};a.tick(s);const first=calls.length;a.tick(s);assert.equal(calls.length,first);
 a.context.currentTime=10.1;s.elapsed=.1;a.tick(s);assert.equal(a.transport.origin,10);
 for(const n of calls)assert.ok(Math.abs(n.scheduledAt-(10+n.at))<1e-8);
 a.stop();a.context.currentTime=40;s.elapsed=8;a.tick(s);
 assert.equal(a.transport.origin,32);assert.ok(calls.at(-1).at>=8);assert.ok(calls.at(-1).scheduledAt>=40);
});
test('music mute, pause and a long stalled frame discard queued notes',()=>{
 const {a,calls}=fixture(),s={kind:'blocks',elapsed:0};a.tick(s);let stopped=0;a.musicNodes.add({stop(){stopped++;}});
 a.setMusic(false);assert.equal(stopped,1);const count=calls.length;s.elapsed=2;a.tick(s);assert.equal(calls.length,count);
 a.setMusic(true);a.context.currentTime=15;a.tick(s);assert.equal(a.transport.origin,13);
 a.context.currentTime=30;s.elapsed=15;a.tick(s);assert.equal(a.transport.origin,15);assert.ok(calls.at(-1).at>=14.975);
 a.stop();assert.equal(a.transport,null);assert.equal(a.musicNodes.size,0);
});
