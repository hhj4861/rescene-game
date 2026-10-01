import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,gameAction,stageSpeed,photoWindows,GAME_IDS} from '../../src/arcade-room/model.js';
import {emptyProgress,readProgress,saveProgress,saveRound,restoreRound,snapshotRound,finishStage,newRun,stageGoal,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
function store(data){let value=JSON.stringify(data);return {getItem:()=>value,setItem:(key,next)=>{assert.equal(key,PROGRESS_KEY);value=next;}};}

test('stages beyond five keep growing without negative windows or unbounded note lists',()=>{
  let previous=0;
  for(const stage of [1,5,6,20,100,10000]){
    const speed=stageSpeed({stage});assert.ok(speed>previous&&speed<3);previous=speed;
    for(const kind of GAME_IDS){const state=createGame(kind,{stage});assert.equal(state.stage,stage);assert.ok(Number.isFinite(stageGoal(kind,stage).target));}
    const rhythm=createGame('rhythm',{stage});assert.ok(rhythm.notes.length<400);
    for(const note of rhythm.notes){stepGame(rhythm,note.at-rhythm.elapsed);gameAction(rhythm,note.lane?'right':'left');}
    assert.equal(rhythm.hearts,3);assert.equal(rhythm.hits,rhythm.notes.length);
    assert.ok(photoWindows(createGame('photo',{stage})).perfect>.01);
  }
});
test('each game loses lives for its own mistakes and cannot lose lives after game over',()=>{
  const drive=createGame('drive',{stage:1});drive.objects=[{lane:1,y:.72,kind:'cone',hit:false}];stepGame(drive,.1);assert.equal(drive.hearts,2);
  const photo=createGame('photo',{stage:1});for(let i=2;i>=0;i--){photo.elapsed=.7;photo.cooldown=0;gameAction(photo,'snap');assert.equal(photo.hearts,i);}assert.equal(photo.endReason,'lives');
  const rhythm=createGame('rhythm',{stage:1});stepGame(rhythm,5);assert.equal(rhythm.hearts,0);assert.equal(rhythm.endReason,'lives');
  const basket=createGame('catch',{stage:1});basket.objects=[{lane:0,y:.99,blue:false,hit:false}];stepGame(basket,.1);assert.equal(basket.hearts,2);
  const blocks=createGame('blocks',{stage:1});blocks.active={cells:[[1,1],[1,1]],x:3,y:10,color:2};blocks.next={cells:[[1,1,1,1]],x:2,y:0,color:1};blocks.board[0]=[1,1,1,0,0,1,1,1];gameAction(blocks,'drop');assert.equal(blocks.hearts,2);assert.equal(blocks.endReason,'blocked');
  for(const state of [photo,rhythm,blocks]){const hearts=state.hearts;stepGame(state,60);gameAction(state,'drop');assert.equal(state.hearts,hearts);}
});
for(const kind of GAME_IDS)test(`${kind}: timeout costs exactly one life and the same stage can continue`,()=>{
  const p=emptyProgress(),s=createGame(kind,{stage:1});s.remaining=.01;if(kind!=='blocks')s.elapsed=59.99;if(kind==='rhythm')s.notes.forEach(n=>n.status='hit');
  stepGame(s,.02);assert.equal(s.hearts,2);assert.equal(s.endReason,'timeout');assert.equal(finishStage(p,s),false);finishStage(p,s);
  assert.equal(p.games[kind].hearts,2);assert.equal(p.games[kind].stage,1);
  assert.equal(createGame(kind,{stage:p.games[kind].stage,hearts:p.games[kind].hearts}).hearts,2);
});
test('v1 completed saves migrate to stage six, and partially played rounds retain health',()=>{
  const snapshot=snapshotRound(createGame('drive',{stage:5,hearts:1}));
  const p=readProgress(store({version:1,games:{blocks:{cleared:[1,2,3,4,5],unlocked:5},drive:{cleared:[1,2,3,4],snapshot}}}));
  assert.equal(p.version,2);assert.equal(p.games.blocks.stage,6);assert.equal(p.games.blocks.highest,6);assert.equal(p.games.drive.hearts,1);assert.equal(restoreRound(p.games.drive.snapshot).hearts,1);
  const legacy=snapshotRound(createGame('photo',{stage:2}));delete legacy.hearts;
  assert.equal(readProgress(store({version:1,games:{photo:{cleared:[1],snapshot:legacy}}})).games.photo.snapshot.hearts,3);
});
test('save/reload preserves life loss, completed-stage continuation and game-over state',()=>{
  const p=emptyProgress(),storage=store(null),state=createGame('blocks',{stage:1,hearts:1});saveRound(p,state);saveProgress(storage,p);
  assert.equal(readProgress(storage).games.blocks.snapshot.hearts,1);
  state.lines=2;state.ended=true;finishStage(p,state);saveProgress(storage,p);let entry=readProgress(storage).games.blocks;
  assert.equal(entry.stage,2);assert.equal(entry.hearts,1);assert.equal(entry.snapshot,null);
  const next=createGame('blocks',{stage:2,hearts:1});next.remaining=.01;stepGame(next,.02);finishStage(p,next);saveProgress(storage,p);entry=readProgress(storage).games.blocks;
  assert.equal(entry.hearts,0);assert.equal(entry.stage,2);newRun(p,'blocks');assert.equal(p.games.blocks.stage,1);assert.equal(p.games.blocks.hearts,3);assert.equal(p.games.blocks.highest,2);
});
test('mismatched snapshots and invalid life counts cannot refill a surviving run',()=>{
  const p=emptyProgress();p.games.catch.hearts=1;p.games.catch.snapshot=snapshotRound(createGame('catch',{stage:1,hearts:3}));
  const read=readProgress(store(p));assert.equal(read.games.catch.hearts,1);assert.equal(read.games.catch.snapshot,null);
  for(const hearts of [-1,4,2.5]){p.games.catch.hearts=hearts;assert.equal(readProgress(store(p)).games.catch.hearts,3);}
});
