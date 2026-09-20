import { TextDecoder } from 'node:util';
import test from 'node:test';
import assert from 'node:assert/strict';
import { composePerformance, renderPcm, encodeWav, stageFrame } from '../../src/survival/arrangement.js';
import { defaultPlan } from '../../server/survival/catalog.mjs';
const plan=defaultPlan();
const evidence={events:plan.leads.map((memberId,i)=>({memberId,second:i*12,quality:74,focus:'breath',beatErrorMs:46}))};
test('a saved agreement reproduces one 60-second arrangement without modifying evidence',()=>{
  const before=JSON.stringify({plan,evidence});
  const a=composePerformance(plan,evidence,'season:1'), b=composePerformance(plan,evidence,'season:1');
  assert.deepEqual(a,b);assert.equal(JSON.stringify({plan,evidence}),before);
  assert.equal(a.duration,60);assert.equal(a.bpm,96);assert.ok(a.notes.length>400);
  assert.deepEqual(a.parts.map(p=>p.memberId),plan.leads);
  for(const note of a.notes){assert.ok(note.time>=0&&note.time<60);assert.ok(note.length>0&&note.time+note.length<=60.00001);}
});
test('music, dance, risk and member order affect the audible score; prose remains a caption',()=>{
  const base=composePerformance(plan,evidence,'fixed');
  for(const change of [{music:'wave'},{music:'spark'},{dance:'power'},{risk:'adlib'},{risk:'danceBreak'},{risk:'unit'},{leads:[...plan.leads].reverse()}]) assert.notDeepEqual(composePerformance({...plan,...change},evidence,'fixed').notes,base.notes);
  assert.deepEqual(composePerformance({...plan,direction:'자유롭게 쓴 의견'},evidence,'fixed').notes,base.notes);
  const changed={events:evidence.events.map(e=>({...e,focus:'rhythm',quality:40,beatErrorMs:80}))};
  assert.notDeepEqual(composePerformance(plan,changed,'fixed').notes,base.notes);
});
test('all five stage centers follow the agreed 12-second parts, with distinct positions and reduced motion',()=>{
  const score=composePerformance({...plan,leads:[...plan.leads].reverse()},evidence,'fixed');
  for(let part=0;part<5;part++){
    const frame=stageFrame(score,part*12,true);
    assert.equal(frame.memberId,score.parts[part].memberId);
    assert.equal(frame.dancers.filter(d=>d.lead).length,1);
    assert.equal(new Set(frame.dancers.map(d=>d.x)).size,5);
    assert.ok(frame.dancers.every(d=>d.rotate===0));
  }
  assert.equal(stageFrame(score,60).part,4);
  assert.notDeepEqual(stageFrame(score,1).dancers,stageFrame(score,1.1).dancers);
});
test('the completed stereo WAV has 60 seconds of finite, non-silent, unclipped PCM with an ending fade',()=>{
  const pcm=renderPcm(composePerformance({...plan,risk:'unit',dance:'power'},evidence,'audio-proof'));
  assert.equal(pcm.channels.length,2);assert.equal(pcm.channels[0].length,60*22050);
  let peak=0,energy=0;
  for(const channel of pcm.channels) for(const sample of channel){assert.ok(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));energy+=sample*sample;}
  assert.ok(peak>.2&&peak<=.861);assert.ok(energy>100);
  assert.ok(Math.abs(pcm.channels[0].at(-1))<.001);
  const bytes=encodeWav(pcm),v=new DataView(bytes),header=new TextDecoder().decode(bytes.slice(0,4));
  assert.equal(header,'RIFF');assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),22050);
  assert.equal(v.getUint32(40,true),22050*60*4);assert.equal(bytes.byteLength,44+22050*60*4);
});
