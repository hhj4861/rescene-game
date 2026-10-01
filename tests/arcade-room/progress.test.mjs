import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,gameAction,GAME_IDS,stageSpeed,photoWindows,RECORD_KEY} from '../../src/arcade-room/model.js';
import {emptyProgress,finishStage,isStageClear,stageGoal,snapshotRound,restoreRound,readProgress,saveProgress,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
function store(){const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};}
function meetGoal(s){s[{drive:'stars',blocks:'lines',photo:'photos',rhythm:'hits',catch:'stars'}[s.kind]]=stageGoal(s.kind,s.stage).target;}
test('clears unlock one stage per member, retries are idempotent and final stage is capped',()=>{
 const p=emptyProgress();for(let stage=1;stage<=5;stage++){const s=createGame('blocks',{stage});assert.equal(isStageClear(s),false);assert.equal(finishStage(p,s),false);assert.equal(p.games.blocks.unlocked,stage);meetGoal(s);assert.equal(finishStage(p,s),true);finishStage(p,s);assert.equal(p.games.blocks.cleared.length,stage);assert.equal(p.games.blocks.unlocked,Math.min(5,stage+1));}assert.equal(p.games.drive.unlocked,1);
 const skipped=createGame('photo',{stage:5});meetGoal(skipped);finishStage(p,skipped);assert.deepEqual(p.games.photo.cleared,[]);
});
for(const kind of GAME_IDS)test(`${kind} roundtrip preserves playable state and subsequent random sequence`,()=>{
 const s=createGame(kind,{stage:3,seed:1234});for(let i=0;i<20;i++)stepGame(s,.05);
 const restored=restoreRound(snapshotRound(s));assert.ok(restored);assert.deepEqual(snapshotRound(restored),snapshotRound(s));
 for(let i=0;i<30;i++){stepGame(s,.05);stepGame(restored,.05);}
 for(const action of ['left','rotate','snap','drop']){gameAction(s,action);gameAction(restored,action);}
 assert.deepEqual(snapshotRound(restored),snapshotRound(s));
});
test('all stage goals and speed increase while stage one keeps original balance',()=>{
 for(const kind of GAME_IDS){const first=createGame(kind,{stage:1}),last=createGame(kind,{stage:5});assert.equal(stageSpeed(first),1);assert.ok(stageSpeed(last)>1);assert.ok(stageGoal(kind,5).target>stageGoal(kind,1).target);}
 const slow=createGame('blocks',{stage:1,seed:1}),fast=createGame('blocks',{stage:5,seed:1});stepGame(slow,.7);stepGame(fast,.7);assert.ok(fast.active.y>slow.active.y);
 assert.ok(photoWindows(createGame('photo',{stage:5})).good<photoWindows(createGame('photo',{stage:1})).good);
 assert.ok(createGame('rhythm',{stage:5}).notes.length>createGame('rhythm',{stage:1}).notes.length);
});
test('save retains old scores, rejects corrupt snapshots and does not trust unlocked fields',()=>{
 const storage=store(),p=emptyProgress();storage.setItem(RECORD_KEY,'{"photo":999}');p.games.blocks.snapshot=snapshotRound(createGame('blocks',{stage:1,seed:1}));assert.equal(saveProgress(storage,p),true);assert.deepEqual(readProgress(storage),p);assert.equal(storage.getItem(RECORD_KEY),'{"photo":999}');
 p.games.blocks.snapshot.board[0][0]='invalid';p.games.drive.unlocked=5;p.games.drive.cleared=[3,4];saveProgress(storage,p);const clean=readProgress(storage);assert.equal(clean.games.blocks.snapshot,null);assert.equal(clean.games.drive.unlocked,1);
 for(const data of ['broken','null','{"version":2}',JSON.stringify({version:1,games:{drive:{cleared:'bad'}}})]){storage.setItem(PROGRESS_KEY,data);assert.deepEqual(readProgress(storage),emptyProgress());}
 assert.equal(saveProgress({setItem(){throw Error('full');}},p),false);
});
test('ended, nonfinite, impossible and foreign-kind snapshots cannot resume',()=>{
 const s=snapshotRound(createGame('drive',{stage:1,seed:1}));for(const patch of [{ended:true},{remaining:NaN},{kind:'other'},{lane:4},{rngState:-1},{objects:[{lane:1,y:99,kind:'star',hit:false}]}])assert.equal(restoreRound({...s,...patch}),null);
});
