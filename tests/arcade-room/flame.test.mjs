import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {restoreRound,snapshotRound} from '../../src/arcade-room/progress.js';
test('collecting berries builds fever; hazards damage once and fire destroys rocks but not water',()=>{
 const s=createGame('drive',{seed:7});s.spawn=10;
 for(let i=0;i<5;i++){s.objects=[{id:i,lane:1,y:455,kind:'berry'}];stepGame(s,.025);}
 assert.equal(s.hits,5);assert.equal(s.fever,8);s.objects=[{id:6,lane:1,y:455,kind:'water'}];stepGame(s,.025);assert.equal(s.hearts,3);
 s.fever=0;s.objects=[{id:7,lane:1,y:455,kind:'water'},{id:8,lane:1,y:455,kind:'rock'}];stepGame(s,.025);assert.equal(s.hearts,2);
 s.objects=[{id:9,lane:1,y:400,kind:'rock'}];gameAction(s,'fire');stepGame(s,.1);assert.equal(s.objects.length,0);assert.equal(s.event,'flame-break');
 s.objects=[{id:10,lane:1,y:400,kind:'water'}];s.fireCooldown=0;gameAction(s,'fire');stepGame(s,.1);assert.equal(s.objects[0].kind,'water');
});
test('lane movement, shots, fever and deterministic spawns survive reload',()=>{
 const s=createGame('drive',{stage:8,seed:7});gameAction(s,0);gameAction(s,'fire');stepGame(s,.6);const resumed=restoreRound(snapshotRound(s));assert.ok(resumed);stepGame(s,.3);stepGame(resumed,.3);assert.deepEqual(snapshotRound(s),snapshotRound(resumed));
 const old={...snapshotRound(s),flameVersion:undefined};assert.equal(restoreRound(old),null);
});
