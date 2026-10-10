import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_IDS,createGame,stepGame,gameAction,swapBread,availableSwap,matches,boardSize,stageBoardSize,stageTarget} from '../../src/arcade-room/model.js';
import {restoreRound,snapshotRound,isStageClear,emptyProgress,finishStage,readProgress} from '../../src/arcade-room/progress.js';
import {stageTheme,targets} from '../../src/arcade-room/render.js';
import {LIV_ITEMS} from '../../src/arcade-room/runner.js';

test('Minami opens first and combo recovery grows, caps, persists and ends at zero',()=>{
 assert.equal(GAME_IDS[0],'rhythm');const s=createGame('rhythm');assert.equal(s.gauge,50);
 let gain;for(const n of s.notes.slice(0,20)){s.elapsed=n.at;s.remaining=60-n.at;const before=s.gauge;gameAction(s,n.lane);if(s.combo===1)gain=s.gauge-before;if(s.combo===12)assert.ok(s.gauge-before>gain);}
 assert.equal(s.gauge,100);assert.equal(restoreRound(snapshotRound(s)).gauge,100);
 s.gauge=12;s.notes.find(n=>n.status==='waiting').at=s.elapsed-.5;stepGame(s,.025);assert.equal(s.gauge,0);assert.equal(s.ended,true);assert.equal(s.hearts,0);assert.equal(isStageClear(s),false);
});
test('Liv boss waits 120 seconds after the first actual pickup; later items do not reset the clock',()=>{
 const s=createGame('catch',{seed:7});s.spawn=10;s.gates=[];s.defeated=100;stepGame(s,.025);assert.equal(s.bossSpawned,false);
 s.pickups=[{lane:1,y:440,kind:LIV_ITEMS[0]}];stepGame(s,.025);const first=s.firstItemAt;assert.equal(first,s.elapsed);
 s.elapsed=first+80;s.remaining=300-s.elapsed;s.itemCooldown=0;s.pickups=[{lane:1,y:440,kind:LIV_ITEMS[1]}];stepGame(s,.025);assert.equal(s.firstItemAt,first);
 const r=restoreRound(snapshotRound(s));assert.ok(r);r.enemies=[];r.elapsed=first+119.9;r.remaining=300-r.elapsed;stepGame(r,.05);assert.equal(r.bossSpawned,false);stepGame(r,.1);assert.equal(r.bossSpawned,true);assert.equal(r.enemies.filter(e=>e.boss).length,1);stepGame(r,.1);assert.equal(r.enemies.filter(e=>e.boss).length,1);
});
test('May has a longer round and target; only a collectible honey voice item awards a song',()=>{
 const s=createGame('blocks',{seed:7});assert.equal(s.remaining,180);assert.equal(stageTarget('blocks',1),18);s.enemies=[];s.spawn=10;
 for(const kind of ['speed','size']){s.items=[{x:90,y:514,kind,ttl:12}];stepGame(s,.025);assert.equal(s.songPickups,0);}
 s.items=[{x:90,y:514,kind:'honey',ttl:12}];stepGame(s,.025);assert.equal(s.songPickups,1);assert.equal(s.items.length,0);stepGame(s,.025);assert.equal(s.songPickups,1);assert.ok(restoreRound(snapshotRound(s)));
 const old=snapshotRound(s);old.remaining=60-old.elapsed;old.items=[{x:90,y:514,kind:'song',ttl:12}];const restored=restoreRound(old);assert.equal(restored.remaining,180-restored.elapsed);assert.equal(restored.items[0].kind,'honey');
});
for(const stage of [1,2,3,4,5,20])test(`Zena stage ${stage}: matching, gravity, touch targets, rolling pin and saves use the whole board`,()=>{
 const s=createGame('photo',{stage,seed:7}),size=stageBoardSize(stage);assert.equal(boardSize(s),size);assert.equal(s.board.length,size*size);assert.equal(matches(s.board).length,0);assert.equal(targets(s).length,s.board.length);
 assert.equal(swapBread(s,size-1,size),false);assert.ok(swapBread(s,...availableSwap(s.board)));assert.ok(s.collected>=3);
 for(const f of s.breadFrames.filter(f=>f.kind==='fall')){assert.equal(f.fromRows.length,size*size);for(let i=0;i<f.fromRows.length;i++)assert.ok(f.fromRows[i]<=Math.floor(i/size));}
 const resumed=restoreRound(snapshotRound(s));assert.ok(resumed);assert.deepEqual(resumed.board,s.board);gameAction(resumed,'rolling-pin');gameAction(resumed,resumed.board.length-1);assert.deepEqual(resumed.breadFrames[0].removed,Array.from({length:size},(_,i)=>(size-1)*size+i));
});
test('Zena song drops require an explicit pickup rather than a match or a normal rolling pin',()=>{
 const s=createGame('photo',{seed:7});gameAction(s,'rolling-pin');gameAction(s,0);assert.equal(s.songPickups,0);assert.equal(s.songDrops,0);s.flash=0;s.rollingPins=1;s.board[6]=11;gameAction(s,'rolling-pin');gameAction(s,6);assert.equal(s.songDrops,1);assert.equal(s.songPickups,0);const r=restoreRound(snapshotRound(s));gameAction(r,'song-pickup');assert.equal(r.songPickups,1);assert.equal(r.songDrops,0);gameAction(r,'song-pickup');assert.equal(r.songPickups,1);
});
test('stage backgrounds change for every game',()=>{for(const kind of GAME_IDS){const first=stageTheme({kind,stage:1});for(const stage of [2,3,4,5,6])assert.notDeepEqual(stageTheme({kind,stage}),first);}});

test('uncollected Zena song gifts survive a stage clear, reload and next stage',()=>{const p=emptyProgress(),s=createGame('photo');s.songDrops=2;s.breadCover.fill(true);finishStage(p,s);const saved=readProgress({getItem:()=>JSON.stringify(p)});assert.equal(saved.games.photo.songDrops,2);const next=createGame('photo',{stage:saved.games.photo.stage,songDrops:saved.games.photo.songDrops});assert.equal(next.songDrops,2);gameAction(next,'song-pickup');assert.equal(next.songDrops,1);assert.equal(next.songPickups,1);});
test('old Liv saves extend the round and remove bosses spawned under the former early trigger',()=>{const s=createGame('catch');s.elapsed=20;s.remaining=40;s.itemPickups=1;s.bossSpawned=true;s.enemies=[{id:0,lane:1,y:120,hp:240,maxHp:240,boss:true}];const old=snapshotRound(s);delete old.firstItemAt;const r=restoreRound(old);assert.ok(r);assert.equal(r.remaining,280);assert.equal(r.firstItemAt,20);assert.equal(r.bossSpawned,false);assert.equal(r.enemies.length,0);});

test('legacy Zena boards fit the current size and keep full-size controls after shuffle',()=>{const old=snapshotRound(createGame('photo',{seed:7}));old.stage=3;old.board=old.board.slice(0,36);old.breadCover=Array(36).fill(false);old.hint=[];const s=restoreRound(old);assert.ok(s);gameAction(s,'shuffle');assert.equal(s.board.length,36);assert.equal(targets(s).length,36);assert.ok(swapBread(s,...availableSwap(s.board)));for(const frame of s.breadFrames.filter(f=>f.kind==='fall'))assert.equal(frame.fromRows.length,36);assert.ok(restoreRound(snapshotRound(s)));assert.equal(createGame('photo',{stage:4}).board.length,36);});
