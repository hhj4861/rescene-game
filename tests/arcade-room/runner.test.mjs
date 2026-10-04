import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {runnerDifficulty} from '../../src/arcade-room/runner.js';
import {snapshotRound,restoreRound,readProgress,emptyProgress,isStageClear} from '../../src/arcade-room/progress.js';
test('gates increase the squad once, moving never buys units, and negative gates cost a life',()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates[0].y=479;gameAction(s,0);s.x=95;stepGame(s,.05);assert.equal(s.squad,6);assert.equal(s.gatesTaken,1);
 for(let i=0;i<20;i++)gameAction(s,i%3);assert.equal(s.squad,6);stepGame(s,.05);assert.equal(s.gatesTaken,1);
 s.squad=1;s.lane=2;s.x=385;s.gates=[{y:479,options:Array.from({length:3},()=>({op:'add',value:-2}))}];stepGame(s,.05);assert.equal(s.hearts,2);assert.equal(s.squad,3);
});
test('automatic shots earn support, which cannot fire before five kills or fire twice',()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[];gameAction(s,'burst');assert.equal(s.burst,0);
 for(let i=0;i<5;i++){s.enemies=[{id:i,lane:1,y:400,hp:1,maxHp:1,boss:false}];stepGame(s,.4);}
 assert.equal(s.defeated,5);assert.equal(s.charge,5);gameAction(s,'burst');assert.equal(s.charge,0);assert.ok(s.burst>0);stepGame(s,.4);gameAction(s,'burst');assert.equal(s.burst,0);
});
test('escaped enemies cost lives and runner snapshots preserve units, gates and projectiles',()=>{
 const s=createGame('catch',{seed:7});s.enemies=[{id:0,lane:0,y:479,hp:50,maxHp:50,boss:false}];stepGame(s,.1);assert.equal(s.hearts,2);
 const restored=restoreRound(snapshotRound(s));assert.ok(restored);assert.deepEqual(snapshotRound(restored),snapshotRound(s));
 const p=emptyProgress();p.games.catch.stage=p.games.catch.highest=7;p.games.catch.hearts=2;p.games.catch.snapshot={...snapshotRound(s),stage:7,runnerVersion:undefined,towers:[]};
 const legacy=readProgress({getItem:()=>JSON.stringify(p)});assert.equal(legacy.games.catch.stage,7);assert.equal(legacy.games.catch.hearts,2);assert.equal(legacy.games.catch.snapshot,null);
});

// A deterministic, imperfect player: decisions every 180 ms, not per frame.
function playRunner(stage,seed,active=true){
 const s=createGame('catch',{stage,seed});let decision=0;
 while(!s.ended&&!isStageClear(s)){
  if(active&&s.elapsed>=decision){
   decision+=.18;
   const urgent=s.enemies.filter(e=>!e.boss&&e.y>310).sort((a,b)=>b.y-a.y)[0],boss=s.enemies.find(e=>e.boss),enemy=s.enemies.filter(e=>!e.boss).sort((a,b)=>b.y-a.y)[0],gate=s.gates.find(g=>g.y>450),item=s.pickups.find(i=>i.y>410&&i.y<485);
   let lane=urgent?.lane??item?.lane??boss?.lane??enemy?.lane??s.lane;
   if(gate){const value=o=>o.op==='multiply'?s.squad*o.value+6*(6-s.volley):s.squad+o.value+3*(5-s.fireLevel);lane=gate.options.reduce((best,o,i)=>value(o)>value(gate.options[best])?i:best,0);}
   gameAction(s,lane);if(s.charge===5&&(boss||s.enemies.length>1))gameAction(s,'burst');
  }
  stepGame(s,.025);
 }
 return s;
}
test('Liv stage pressure is monotonic and bounded; fresh squads get four buildup gates',()=>{
 const levels=[1,3,5,10,20,50,1000,Number.MAX_SAFE_INTEGER].map(runnerDifficulty);
 for(let i=1;i<levels.length;i++){
  for(const k of ['hp','bossHp','enemySpeed','bossSpeed','penalty'])assert.ok(levels[i][k]>=levels[i-1][k],k);
  assert.ok(levels[i].spawn<=levels[i-1].spawn);
 }
 assert.ok(levels.at(-1).bossHp<=900);assert.ok(levels.at(-1).spawn>=.7);assert.ok(levels.at(-1).enemySpeed<=86);
 const fresh=createGame('catch',{stage:50,seed:7});fresh.spawn=0;stepGame(fresh,.025);assert.equal(fresh.enemies[0].maxHp,12);
 const ready=createGame('catch',{stage:50,seed:7});ready.gatesTaken=2;ready.spawn=0;stepGame(ready,.025);assert.ok(ready.enemies[0].maxHp>fresh.enemies[0].maxHp);assert.ok(ready.spawn<fresh.spawn);assert.ok(restoreRound(snapshotRound(ready)));
});
test('Liv boss survives opening fire and brings side escorts; an escort kill cannot clear the stage',()=>{
 const s=createGame('catch',{stage:5,seed:7});s.defeated=13;s.gatesTaken=2;s.squad=12;s.volley=2;s.spawn=0;s.gates=[];
 stepGame(s,1);const boss=s.enemies.find(e=>e.boss);assert.ok(boss);assert.ok(boss.hp>100);assert.ok(s.enemies.some(e=>!e.boss&&e.lane!==1));assert.ok(restoreRound(snapshotRound(s)));
 const escort=s.enemies.find(e=>!e.boss);escort.hp=0;stepGame(s,.025);assert.equal(isStageClear(s),false);assert.equal(s.bossDefeated,0);
 boss.hp=0;stepGame(s,.025);assert.equal(isStageClear(s),true);
});
test('movement and song pickups keep harder stages beatable, while idling is unreliable',t=>{
 for(const stage of [1,5,10,20,50]){
  const games=Array.from({length:20},(_,i)=>playRunner(stage,i+1));
  const wins=games.filter(isStageClear).length;
  t.diagnostic(`stage ${stage}: ${wins}/20 active clears`);assert.ok(wins>=12,`stage ${stage}: only ${wins}/20 active clears`);
  for(const s of games.filter(isStageClear)){assert.ok(s.elapsed<60);assert.ok(s.hearts>0);}
 }
 const idle=Array.from({length:20},(_,i)=>playRunner(1,i+1,false));assert.ok(idle.filter(isStageClear).length<=4);
});
