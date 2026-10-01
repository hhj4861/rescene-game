import test from 'node:test';
import assert from 'node:assert/strict';
import {DURATION,createGame,stepGame,makeBlocks,stepBlocks,makePhoto,photoPosition,snapPhoto,makeRhythm,stepRhythm,tapRhythm} from '../../src/arcade-room/model.js';

for(const kind of ['drive','catch'])test(`${kind} ramps speed and spawn density after the opening without adding blocked lanes`,()=>{
  function sample(elapsed){
    let draws=0;
    const s=createGame(kind,{random:()=>{draws++;return .9;}});
    s.elapsed=elapsed;s.remaining=DURATION-elapsed;s.spawn=0;s.lane=0;
    const marker={lane:2,y:0,kind:'cone',blue:false};s.objects=[marker];
    for(let i=0;i<150;i++)stepGame(s,.01);
    return {distance:marker.y,spawns:draws/2,objects:s.objects};
  }
  const opening=sample(0),steady=sample(5),late=sample(50);
  assert.equal(opening.distance,steady.distance);
  assert.equal(opening.spawns,steady.spawns);
  assert.ok(late.distance>opening.distance*1.25);
  assert.ok(late.spawns>opening.spawns);
  assert.ok(late.objects.every(o=>o.lane===2));
  assert.equal(new Set(late.objects.map(o=>o.y)).size,late.objects.length);
});

test('blocks accelerate with elapsed time and cleared lines while retaining a minimum reaction interval',()=>{
  function fall(elapsed,lines,duration){
    const s=makeBlocks(()=>.2);s.remaining=DURATION-elapsed;s.lines=lines;
    for(let t=0;t<duration;t+=.01)stepBlocks(s,.01);
    return s.active.y;
  }
  assert.equal(fall(0,0,.7),0);
  assert.equal(fall(50,0,.7),1);
  assert.equal(fall(0,12,.7),1);
  assert.equal(fall(50,100,.3),0);
  assert.equal(fall(50,100,.5),1);
});

test('photo requires better centering late in the round, with a continuous cursor at the ramp boundary',()=>{
  function shot(start,offCenter){
    const s=makePhoto();
    for(let at=start;at<start+2;at+=.0005){
      s.elapsed=at;
      const distance=Math.abs(photoPosition(s)-.5);
      if(offCenter?distance>.115&&distance<.12:distance<.001){snapPhoto(s);return s.event;}
    }
    assert.fail('No matching cursor position found');
  }
  assert.equal(shot(0,true),'photo-good');
  assert.equal(shot(50,true),'photo-miss');
  assert.equal(shot(50,false),'photo-perfect');
  assert.ok(Math.abs(photoPosition({elapsed:10.00001})-photoPosition({elapsed:9.99999}))<.0001);
});

test('rhythm speeds up after the opening and tighter late judgments still allow every calibrated note',()=>{
  const notes=makeRhythm().notes,gaps=notes.slice(1).map((note,i)=>note.at-notes[i].at);
  assert.ok(Math.abs(gaps[0]-gaps[5])<.000001);
  assert.ok(gaps.at(-1)<gaps[0]*.8);
  assert.ok(gaps.every(gap=>gap>.5));
  for(const offsetMs of [-200,0,200]){
    const s=makeRhythm(offsetMs);
    for(const note of s.notes){
      stepRhythm(s,note.at+s.offset-s.elapsed);
      assert.equal(tapRhythm(s,note.lane),true);
    }
    assert.equal(s.hits,s.notes.length);
    assert.ok(s.elapsed+.2<DURATION);
    stepRhythm(s,DURATION-s.elapsed);
    assert.equal(s.ended,true);assert.equal(s.misses,0);
  }
  function delayedTap(late){
    const s=makeRhythm(),note=late?s.notes.at(-1):s.notes[0];
    stepRhythm(s,note.at+.175);
    return tapRhythm(s,note.lane);
  }
  assert.equal(delayedTap(false),true);
  assert.equal(delayedTap(true),false);
});
