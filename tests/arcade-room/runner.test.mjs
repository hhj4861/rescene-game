import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound,readProgress,emptyProgress} from '../../src/arcade-room/progress.js';
test('gates increase the squad once, moving never buys units, and negative gates cost a life',()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates[0].y=479;gameAction(s,0);s.x=95;stepGame(s,.05);assert.equal(s.squad,7);assert.equal(s.gatesTaken,1);
 for(let i=0;i<20;i++)gameAction(s,i%3);assert.equal(s.squad,7);stepGame(s,.05);assert.equal(s.gatesTaken,1);
 s.squad=1;s.lane=2;s.x=385;s.gates=[{y:479,options:Array.from({length:3},()=>({op:'add',value:-2}))}];stepGame(s,.05);assert.equal(s.hearts,2);assert.equal(s.squad,3);
});
test('automatic shots earn support, which cannot fire before five kills or fire twice',()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[];gameAction(s,'burst');assert.equal(s.burst,0);
 for(let i=0;i<5;i++){s.enemies=[{id:i,lane:1,y:400,hp:1,maxHp:1,boss:false}];stepGame(s,.4);}
 assert.equal(s.defeated,5);assert.equal(s.charge,5);gameAction(s,'burst');assert.equal(s.charge,0);assert.ok(s.burst>0);stepGame(s,.4);gameAction(s,'burst');assert.equal(s.burst,0);
});
test('escaped enemies cost lives and runner snapshots preserve units, gates and projectiles',()=>{
 const s=createGame('catch',{seed:7});s.enemies=[{id:0,lane:0,y:479,hp:50,maxHp:50,boss:true}];stepGame(s,.1);assert.equal(s.hearts,2);
 const restored=restoreRound(snapshotRound(s));assert.ok(restored);assert.deepEqual(snapshotRound(restored),snapshotRound(s));
 const p=emptyProgress();p.games.catch.stage=p.games.catch.highest=7;p.games.catch.hearts=2;p.games.catch.snapshot={...snapshotRound(s),stage:7,runnerVersion:undefined,towers:[]};
 const legacy=readProgress({getItem:()=>JSON.stringify(p)});assert.equal(legacy.games.catch.stage,7);assert.equal(legacy.games.catch.hearts,2);assert.equal(legacy.games.catch.snapshot,null);
});
