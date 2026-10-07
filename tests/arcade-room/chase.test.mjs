/* global structuredClone */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {chasePosition} from '../../src/arcade-room/chase.js';
import {snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';
const target=(s,i=0)=>{s.holes[i]={ttl:3,total:4,gold:false,flash:0};};
test('runners move in both directions, jump and remain inside separated tap lanes',()=>{
 for(let i=0;i<9;i++){const directions=new Set();let last;for(let n=0;n<100;n++){const p=chasePosition({ttl:4-n*.04,total:4},i);assert.ok(p.x-52>=0&&p.x+52<=480);assert.ok(p.y-62>=123&&p.y+42<=568);if(last&&Math.abs(p.x-last.x)>.01){directions.add(Math.sign(p.x-last.x));assert.equal(p.direction,Math.sign(p.x-last.x));}last=p;}
  assert.deepEqual([...directions].sort(),[-1,1]);
  const a=chasePosition({ttl:3.9,total:4},i),b=chasePosition({ttl:3,total:4},i);assert.notEqual(a.y,b.y);
 }
 // Maximum jump in the lower lane still leaves the entire 104px target separate.
 assert.ok(148-42>=104);
});
test('five catches start fever, double scores, protect lives and do not extend it on more hits',()=>{
 const s=createGame('drive',{seed:7});for(let i=0;i<5;i++){target(s);gameAction(s,0);}assert.equal(s.fever,6);assert.equal(s.heat,0);assert.equal(s.event,'whack-fever');
 const before=s.score;target(s);gameAction(s,0);assert.equal(s.score-before,320);assert.equal(s.fever,6);gameAction(s,0);assert.equal(s.combo,6);
 target(s,3);s.holes[3].ttl=.01;stepGame(s,.02);assert.equal(s.hearts,3);assert.ok(s.fever<6);
 for(const h of s.holes)h.ttl=0;s.fever=.01;s.spawn=10;stepGame(s,.02);target(s,3);s.holes[3].ttl=.01;stepGame(s,.02);assert.equal(s.hearts,2);assert.equal(s.combo,0);assert.equal(s.heat,0);
});
test('spawning respects one runner per lane and difficulty increases without unreachable targets',()=>{
 for(const stage of [1,8,1000]){const s=createGame('drive',{stage,seed:7});let count=0;for(let n=0;n<300;n++){stepGame(s,.02);const active=s.holes.map((h,i)=>h.ttl?i:-1).filter(i=>i>=0);assert.equal(new Set(active.map(i=>Math.floor(i/3))).size,active.length);for(const i of active){assert.ok(s.holes[i].total>=1.6&&s.holes[i].total<=4.8);if(s.holes[i].ttl<.3){gameAction(s,i);count++;}}}assert.ok(count>0);}
 const slow=createGame('drive',{seed:7}),fast=createGame('drive',{stage:30,seed:7});stepGame(slow,.4);stepGame(fast,.4);assert.ok(slow.holes.find(h=>h.ttl).total>fast.holes.find(h=>h.ttl).total);
});
test('fever and moving positions resume deterministically; legacy saves keep progress',()=>{
 const s=createGame('drive',{seed:7});for(let i=0;i<5;i++){target(s);gameAction(s,0);}stepGame(s,.5);const restored=restoreRound(snapshotRound(s));assert.ok(restored);stepGame(s,.25);stepGame(restored,.25);assert.deepEqual(snapshotRound(restored),snapshotRound(s));
 const old=snapshotRound(createGame('drive',{stage:4,hearts:2,seed:9}));delete old.chaseVersion;delete old.heat;delete old.fever;old.score=430;old.hits=4;old.holes[1]={ttl:1,total:1.7,gold:true,flash:0};const migrated=restoreRound(old);assert.ok(migrated);assert.equal(migrated.score,430);assert.equal(migrated.stage,4);assert.equal(migrated.hearts,2);assert.equal(migrated.holes[1].ttl,1);assert.equal(migrated.fever,0);old.holes[0]={ttl:1.2,total:1.7,gold:false,flash:0};const two=restoreRound(old);assert.ok(two);const lanes=two.holes.map((h,i)=>h.ttl?Math.floor(i/3):-1).filter(i=>i>=0);assert.equal(new Set(lanes).size,2);assert.equal(two.score,430);
 const broken=snapshotRound(s);broken.fever=100;assert.equal(restoreRound(broken),null);delete broken.fever;assert.equal(restoreRound(broken),null);
});

test('decoys deduct once, reset the chain, never clear a stage and clamp at zero even in fever',()=>{
 for(const fever of [0,4])for(const score of [400,80,0]){
  const s=createGame('drive',{seed:7});Object.assign(s,{score,fever,hits:11,combo:4,bestCombo:4,heat:4});target(s);s.holes[0].fake=true;
  gameAction(s,0);assert.equal(s.score,Math.max(0,score-150));assert.equal(s.hits,11);assert.equal(s.hearts,3);assert.equal(s.combo,0);assert.equal(s.heat,0);assert.equal(s.bestCombo,4);assert.equal(s.fever,fever);assert.equal(s.event,'whack-fake');
  const saved=snapshotRound(s);assert.ok(restoreRound(saved));gameAction(s,0);assert.equal(s.score,saved.score);assert.equal(s.hits,11);
 }
});
test('letting a decoy escape is harmless and saved decoys retain their identity',()=>{
 const s=createGame('drive',{seed:7});Object.assign(s,{score:400,hits:4,combo:4,bestCombo:4,heat:4,spawn:10});target(s);Object.assign(s.holes[0],{ttl:.1,fake:true});
 const restored=restoreRound(snapshotRound(s));assert.ok(restored.holes[0].fake);stepGame(s,.2);stepGame(restored,.2);assert.deepEqual(snapshotRound(restored),snapshotRound(s));assert.equal(s.hearts,3);assert.equal(s.score,400);assert.equal(s.combo,4);assert.equal(s.heat,4);assert.equal(s.misses,0);
 target(s,3);gameAction(s,3);assert.equal(s.fever,6);
 const old=snapshotRound(createGame('drive'));old.holes.forEach(h=>delete h.fake);assert.ok(restoreRound(old));
 for(const invalid of ['yes',1,null]){const bad=structuredClone(old);bad.holes[0].fake=invalid;assert.equal(restoreRound(bad),null);}
 const bad=snapshotRound(s);Object.assign(bad.holes[0],{fake:true,gold:true});assert.equal(restoreRound(bad),null);
});
test('natural spawns introduce decoys after two catches, stage-bounded decoys alongside genuine targets',()=>{
 for(const stage of [1,8,1000]){
  const s=createGame('drive',{stage,seed:17});let decoys=0;
  for(let n=0;n<350;n++){
   stepGame(s,.05);const active=s.holes.filter(h=>h.ttl>0),fakes=active.filter(h=>h.fake);assert.ok(fakes.length<=(stage>=8?2:1));if(s.hits<2)assert.equal(fakes.length,0);
   for(const h of fakes){assert.equal(h.gold,false);if(h.ttl===h.total)decoys++;}
   s.holes.forEach((h,i)=>{if(h.ttl&&!h.fake)gameAction(s,i);});
  }
  assert.ok(decoys>0);assert.equal(s.hearts,3);assert.ok(s.hits>=12);
 }
});

test('new spawns add bounded turns with stage difficulty and preserve them on reload',()=>{
 for(const [stage,legs] of [[1,2],[5,3],[9,4],[1000,4]]){const s=createGame('drive',{stage,seed:7});stepGame(s,.4);const i=s.holes.findIndex(h=>h.ttl>0),h=s.holes[i];assert.equal(h.legs,legs);assert.ok(h.total/h.legs>=.8);assert.ok([-1,1].includes(h.direction));const r=restoreRound(snapshotRound(s));assert.deepEqual(chasePosition(r.holes[i],i),chasePosition(h,i));}
});
