import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_IDS,createGame,stepGame,gameAction} from '../../src/arcade-room/model.js';
import {emptyProgress,saveRound,snapshotRound,restoreRound,finishStage,stageGoal} from '../../src/arcade-room/progress.js';
test('each game can save and resume deterministic simulation without resetting life or score',()=>{
 for(const kind of GAME_IDS){const s=createGame(kind,{stage:8,hearts:2,seed:7});stepGame(s,.5);const restored=restoreRound(snapshotRound(s));assert.ok(restored,kind);stepGame(s,.5);stepGame(restored,.5);assert.deepEqual(snapshotRound(restored),snapshotRound(s));}
});
test('all new goals settle exactly once and carry lives into the next stage',()=>{for(const kind of GAME_IDS){const p=emptyProgress(),s=createGame(kind,{hearts:2});s[{drive:'hits',blocks:'popped',photo:'collected',rhythm:'hits',catch:'defeated'}[kind]]=stageGoal(kind,1).target;if(kind==='drive')s.treatLanes=7;if(kind==='photo')s.breadCover.fill(true);if(kind==='rhythm'){s.elapsed=60;s.remaining=0;}if(kind==='catch')s.bossDefeated=1;assert.ok(finishStage(p,s));assert.ok(finishStage(p,s));assert.equal(p.games[kind].stage,2);assert.equal(p.games[kind].hearts,kind==='rhythm'?3:2);}});
test('ended rounds ignore additional actions, time and saving',()=>{const s=createGame('photo');stepGame(s,180);const p=emptyProgress();saveRound(p,s);assert.equal(p.games.photo.snapshot,null);const score=s.score;gameAction(s,'shuffle');stepGame(s,100);assert.equal(s.hearts,2);assert.equal(s.score,score);});

test('active simulation snapshots remain restorable across movement and cooldowns',()=>{for(const kind of GAME_IDS){const s=createGame(kind,{stage:8,seed:7});for(let i=0;i<100&&!s.ended;i++){if(kind==='blocks'){gameAction(s,i%2?'right':'left');if(i%15===0)gameAction(s,'jump');gameAction(s,'bubble');}if(kind==='catch'){gameAction(s,i%3);if(i%20===0)gameAction(s,'burst');}if(kind==='drive'){gameAction(s,i%3);gameAction(s,'fire');}stepGame(s,.05);if(!s.ended)assert.ok(restoreRound(snapshotRound(s)),kind+' frame '+i);}}});
