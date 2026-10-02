import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_IDS,createGame,stageSpeed,stageTarget,stepGame,gameAction,availableSwap} from '../../src/arcade-room/model.js';
import {isStageClear} from '../../src/arcade-room/progress.js';
test('targets grow beyond stage five and late-game speed stays bounded',()=>{for(const kind of GAME_IDS){assert.ok(stageTarget(kind,30)>stageTarget(kind,5));assert.ok(stageTarget(kind,10000)>=stageTarget(kind,30));}assert.ok(stageSpeed({stage:10000})<2.4);});
test('responsive play can clear whack, bread, pump and defense stage one',()=>{
 for(const kind of ['drive','photo','rhythm','catch']){const s=createGame(kind,{seed:7});if(kind==='catch')for(const i of [0,2,4])gameAction(s,i);
 for(let i=0;i<1200&&!s.ended&&!isStageClear(s);i++){if(kind==='drive')s.holes.forEach((h,j)=>{if(h.ttl>0)gameAction(s,j);});if(kind==='photo'&&!s.flash){const p=availableSwap(s.board);gameAction(s,p[0]);gameAction(s,p[1]);}if(kind==='rhythm')for(const n of s.notes)if(n.status==='waiting'&&Math.abs(n.at-s.elapsed)<.04)gameAction(s,n.lane);stepGame(s,.05);}assert.ok(isStageClear(s),kind+' must be beatable');}
});
