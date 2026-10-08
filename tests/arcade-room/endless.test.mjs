import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame} from '../../src/arcade-room/model.js';
import {emptyProgress,finishStage,newRun} from '../../src/arcade-room/progress.js';
test('stage five continues to six and repeated timeout eventually ends the run',()=>{const p=emptyProgress();p.games.photo.stage=p.games.photo.highest=5;const s=createGame('photo',{stage:5,hearts:2});s.breadCover.fill(true);finishStage(p,s);assert.equal(p.games.photo.stage,6);for(const hearts of [2,1]){const round=createGame('photo',{stage:6,hearts});stepGame(round,180);finishStage(p,round);assert.equal(p.games.photo.hearts,hearts-1);assert.equal(p.games.photo.stage,6);}newRun(p,'photo');assert.equal(p.games.photo.stage,1);assert.equal(p.games.photo.highest,6);});
test('fatal walk collisions stop substeps at zero lives',()=>{const s=createGame('drive',{hearts:1});s.objects=[{id:0,lane:1,y:455,kind:'puddle'}];stepGame(s,60);assert.equal(s.hearts,0);assert.equal(s.endReason,'lives');assert.ok(s.remaining>89);});
