import test from 'node:test';
import assert from 'node:assert/strict';
import { characterPose, GREETING_DURATION } from '../../src/survival/three/character-motion.js';

test('greeting raises, waves and returns the same arm continuously',()=>{
  const start=2, before=characterPose(start-1e-6,0,start), first=characterPose(start,0,start);
  assert.equal(first.lift,0);assert.equal(before.active,false);assert.equal(first.active,true);
  const raised=characterPose(start+1.1,0,start);
  assert.ok(raised.lift>.99);assert.ok(raised.elbowZ>1);assert.ok(raised.smile>.9);
  const end=characterPose(start+GREETING_DURATION,0,start);
  assert.equal(end.active,false);assert.equal(end.lift,0);
  assert.ok(Math.abs(characterPose(start+GREETING_DURATION-1e-6,0,start).shoulderZ-end.shoulderZ)<1e-8);
  assert.ok(Math.abs(characterPose(start+1.1,0,start).wristZ-characterPose(start+1.3,0,start).wristZ)>.1);
});

test('frozen clock freezes joints and expression without resetting the gesture',()=>{
  const a=characterPose(3,2,2);assert.deepEqual(a,characterPose(3,2,2));assert.ok(a.lift>.9);
});

test('greeting belongs to its member, with no transfer on selection',()=>{
  assert.equal(characterPose(2,0,1).active,true);
  assert.equal(characterPose(2,1,null).active,false);
  assert.equal(characterPose(2,1,1.5).active,true);
  assert.equal(characterPose(8,0,1).active,false);
});

test('every pose stays finite and bounded across idle and greeting cycles',()=>{
  for(let index=0;index<5;index++)for(let time=0;time<15;time+=.013){
    const pose=characterPose(time,index,2);
    for(const [key,value] of Object.entries(pose))if(key!=='active')assert.ok(Number.isFinite(value),key);
    assert.ok(pose.lift>=0&&pose.lift<=1);assert.ok(pose.smile>=0&&pose.smile<=1);assert.ok(pose.blink>=.079&&pose.blink<=1);
  }
});
