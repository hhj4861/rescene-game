import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,gameAction} from '../../src/arcade-room/model.js';
import {PUMP_SONGS} from '../../src/arcade-room/music.js';
import {emptyProgress,readProgress,restoreRound,snapshotRound,isStageClear,finishStage} from '../../src/arcade-room/progress.js';
for(const songId of Object.keys(PUMP_SONGS))test(`${songId}: five misses exhaust the gauge and stop the round`,()=>{
 const s=createGame('rhythm',{songId,stage:6});stepGame(s,60);assert.equal(s.misses,5);assert.equal(s.gauge,0);assert.equal(s.hearts,0);assert.equal(s.endReason,'gauge');assert.ok(s.elapsed<60);assert.equal(isStageClear(s),false);const p=emptyProgress();p.games.rhythm.stage=6;finishStage(p,s);assert.equal(p.games.rhythm.stage,6);
});
test('misses break a combo but keep earned points and allow another scoring hit',()=>{
 const s=createGame('rhythm');stepGame(s,2);gameAction(s,0);assert.equal(s.score,105);stepGame(s,4);assert.equal(s.combo,0);assert.equal(s.score,105);const n=s.notes.find(n=>n.status==='waiting'&&n.at>s.elapsed);stepGame(s,n.at-s.elapsed);gameAction(s,n.lane);assert.equal(s.score,210);assert.equal(s.ended,false);
});
test('old pump saves with depleted lives retain scores, misses and stages; other games retain lives',()=>{
 const s=createGame('rhythm',{stage:7});stepGame(s,1);s.hearts=1;const snapshot=snapshotRound(s),restored=restoreRound(snapshot);assert.ok(restored);assert.equal(restored.hearts,3);assert.equal(restored.misses,s.misses);const p=emptyProgress();p.games.rhythm={stage:7,highest:9,hearts:1,snapshot};p.games.blocks.hearts=1;const read=()=>readProgress({getItem:()=>JSON.stringify(p)});assert.ok(read().games.rhythm.snapshot);assert.equal(read().games.blocks.hearts,1);p.games.rhythm.hearts=0;p.games.rhythm.snapshot=null;assert.equal(read().games.rhythm.stage,7);assert.equal(read().games.rhythm.highest,9);assert.equal(read().games.rhythm.hearts,3);
});
