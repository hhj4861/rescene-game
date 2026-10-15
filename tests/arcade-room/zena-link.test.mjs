import test from 'node:test';
import assert from 'node:assert/strict';
import {LINK_FOODS,linkMenu} from '../../src/arcade-room/zena-foods.js';
import {linkPath,linkPair,linkSize,shuffleLink,linkTotalPairs,linkFloorSeconds} from '../../src/arcade-room/zena-link.js';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {snapshotRound,restoreRound,saveRound,isStageClear,finishStage} from '../../src/arcade-room/progress.js';
import {readGamePacks,selectPack,packProgress,saveGamePacks,PACKS_KEY} from '../../src/arcade-room/game-packs.js';
function corners(path){let turns=0;for(let i=2;i<path.length;i++)if(path[i].x-path[i-1].x!==path[i-1].x-path[i-2].x||path[i].y-path[i-1].y!==path[i-1].y-path[i-2].y)turns++;return turns;}
test('link routes allow straight, one corner, two corners and the outer border, but never blocked or unlike tiles',()=>{
 const b=Array(16).fill(0);b[0]=b[3]=1;assert.equal(corners(linkPath(b,0,3)),0);
 b[3]=0;b[10]=1;assert.equal(corners(linkPath(b,0,10)),1);
 b[1]=b[8]=2;assert.equal(corners(linkPath(b,0,10)),2);
 const full=Array(16).fill(2);full[0]=full[3]=1;const outside=linkPath(full,0,3);assert.equal(corners(outside),2);assert.ok(outside.some(p=>p.y===-1));
 full[0]=full[3]=2;full[5]=full[10]=1;assert.equal(linkPath(full,5,10),null);assert.equal(linkPath(full,0,5),null);assert.equal(linkPath(full,0,0),null);assert.equal(linkPath(full,-1,0),null);
});
test('generated stages stay bounded, preserve pairs and can be played to completion even after manual shuffles',()=>{
 for(const stage of [1,3,5,6,11,1000])for(let seed=1;seed<=8;seed++){
  const s=createGame('photo',{link:true,stage,seed});assert.equal(s.board.length,linkSize(stage)**2);assert.ok(restoreRound(snapshotRound(s)));
  if(seed%2===0)gameAction(s,'shuffle');
  let pairs=0;
  while(!isStageClear(s)&&pairs<(stage===1000?s.board.length/2:linkTotalPairs(s))){
   const pair=linkPair(s.board);assert.ok(pair,`stage ${stage}, seed ${seed}, turn ${pairs}`);const path=linkPath(s.board,...pair);assert.ok(corners(path)<=2);
   gameAction(s,pair[0]);gameAction(s,pair[1]);assert.equal(s.board[pair[0]],0);assert.equal(s.board[pair[1]],0);assert.ok(s.flash>0);stepGame(s,.4);pairs++;
  }
  assert.equal(pairs,stage===1000?s.board.length/2:linkTotalPairs(s));assert.equal(isStageClear(s),stage!==1000);assert.ok(restoreRound(snapshotRound(s)));
 }
});
test('a blocked board reshuffles without consuming manual charges or reviving removed tiles',()=>{
 const s=createGame('photo',{link:true,seed:7});s.board.fill(0);s.board[7]=s.board[28]=1;s.board[8]=s.board[27]=2;
 const before=s.board.filter(Boolean).sort();shuffleLink(s,true);assert.deepEqual(s.board.filter(Boolean).sort(),before);assert.equal(s.board[0],0);assert.equal(s.shuffles,2);assert.ok(linkPair(s.board));
});
test('song pickups guarantee 60 seconds and do not appear again while a song is active',()=>{
 const s=createGame('photo',{link:true,seed:4});s.elapsed=160;s.remaining=20;
 for(let i=0;i<4;i++){const [a,b]=linkPair(s.board);gameAction(s,a);gameAction(s,b);stepGame(s,.4);}
 assert.equal(s.songDrops,1);gameAction(s,'song-pickup');assert.equal(s.remaining,60);assert.equal(s.songItemTime,60);assert.equal(s.songPickups,1);
 for(let i=0;i<4;i++){const [a,b]=linkPair(s.board);gameAction(s,a);gameAction(s,b);stepGame(s,.4);}
 assert.equal(s.songDrops,0);const remaining=s.remaining;gameAction(s,'song-pickup');assert.equal(s.remaining,remaining);
});
test('Zena pack snapshots, records and next stages stay independent and malformed snapshots are rejected',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},library=readGamePacks();
 const bakery=createGame('photo',{seed:7});saveRound(packProgress(library),bakery);selectPack(library,'photo','zena-link');
 const s=createGame('photo',{link:true,seed:7}),[a,b]=linkPair(s.board);gameAction(s,a);gameAction(s,b);stepGame(s,.4);saveRound(packProgress(library),s);saveGamePacks(storage,library);
 const loaded=readGamePacks(storage);assert.equal(loaded.selected.photo,'zena-link');assert.deepEqual(loaded.packs['zena-bakery'].journey.snapshot.board,bakery.board);assert.equal(loaded.packs['zena-link'].journey.snapshot.pairs,1);
 const restored=restoreRound(snapshotRound(s));assert.deepEqual(restored.board,s.board);
 for(const bad of [{linkVersion:2},{board:[1,2]},{pairs:99},{board:s.board.map((v,i)=>i===0?99:v)}])assert.equal(restoreRound({...snapshotRound(s),...bad}),null);
 const corrupt=JSON.parse(values.get(PACKS_KEY));corrupt.packs['zena-bakery'].journey.snapshot=snapshotRound(s);assert.equal(readGamePacks({getItem:k=>k===PACKS_KEY?JSON.stringify(corrupt):null}).packs['zena-bakery'].journey.snapshot,null);
 while(s.board.some(Boolean)){const pair=linkPair(s.board);gameAction(s,pair[0]);gameAction(s,pair[1]);stepGame(s,.4);}
 finishStage(packProgress(loaded),s);assert.equal(loaded.packs['zena-link'].journey.stage,2);assert.equal(loaded.packs['zena-bakery'].journey.stage,1);
});

test('food variety grows from six to twelve, includes ramen immediately and balances every pair',()=>{
 for(const [stage,types] of [[1,6],[3,6],[4,7],[6,7],[10,9],[19,12],[1000,12]])for(let seed=1;seed<=12;seed++){
  const s=createGame('photo',{link:true,stage,seed}),menu=linkMenu(stage);
  assert.equal(new Set(s.board).size,types);assert.ok(s.board.includes(6));
  const counts=menu.map(v=>s.board.filter(n=>n===v).length);
  assert.ok(counts.every(n=>n>=2&&n%2===0));assert.ok(Math.max(...counts)-Math.min(...counts)<=2);
  assert.deepEqual(restoreRound(snapshotRound(s)).board,s.board);
 }
 assert.equal(LINK_FOODS.length,13);
});
test('legacy bread saves retain their tile IDs and new food saves reject invalid or unpaired IDs',()=>{
 const s=createGame('photo',{link:true,stage:19,seed:7});
 const legacy=snapshotRound(s);legacy.board=legacy.board.map((_,i)=>1+Math.floor(i/2)%5);
 assert.deepEqual(restoreRound(legacy).board,legacy.board);
 const snapshot=snapshotRound(s);
 assert.ok(snapshot.board.includes(12));assert.deepEqual(restoreRound(snapshot).board,s.board);
 for(const value of [13,-1,6.5])assert.equal(restoreRound({...snapshot,board:snapshot.board.map((v,i)=>i<2?value:v)}),null);
 const odd=[...snapshot.board];odd[0]=odd[0]===6?7:6;assert.equal(restoreRound({...snapshot,board:odd}),null);
});

function lastPair(s){s.board.fill(0);s.board[0]=s.board[1]=6;s.pairs=(s.linkLayers-s.linkFloor+1)*s.board.length/2-1;s.selected=-1;s.flash=0;}
test('N stages have N floors and only the final floor clears; floor transition is saved deterministically',()=>{
 for(const stage of [1,2,3,6,1000]){
  const s=createGame('photo',{link:true,stage,seed:17});assert.equal(s.linkLayers,stage);assert.equal(s.linkFloor,stage);
  lastPair(s);s.elapsed=179.9;s.remaining=.1;gameAction(s,0);gameAction(s,1);
  assert.equal(isStageClear(s),stage===1);
  const pending=restoreRound(snapshotRound(s));assert.ok(pending);stepGame(s,.4);stepGame(pending,.4);
  assert.equal(s.linkFloor,Math.max(1,stage-1));assert.equal(s.ended,false);
  if(stage>1){assert.ok(s.remaining>=linkFloorSeconds(stage)-.4);assert.equal(s.board.filter(Boolean).length,s.board.length);assert.deepEqual(s.board,pending.board);assert.equal(isStageClear(s),false);}
  assert.ok(restoreRound(snapshotRound(s)));
 }
});
test('legacy single-floor saves keep progress, while malformed layers and time bonuses are rejected',()=>{
 const s=createGame('photo',{link:true,stage:3,seed:7}),old=snapshotRound(s);
 for(const key of ['linkLayers','linkFloor','linkTimeBonus'])delete old[key];
 const r=restoreRound(old);assert.ok(r);assert.equal(r.linkLayers,1);assert.equal(r.linkFloor,1);assert.deepEqual(r.board,s.board);
 for(const patch of [{linkFloor:0},{linkFloor:4},{linkLayers:2},{linkLayers:1.5},{linkTimeBonus:1},{linkTimeBonus:-1},{pairs:18}])assert.equal(restoreRound({...snapshotRound(s),...patch}),null);
 const partial=snapshotRound(s);delete partial.linkFloor;assert.equal(restoreRound(partial),null);
});
test('floor changes preserve song timers, unclaimed rewards and limited shuffle charges',()=>{
 const s=createGame('photo',{link:true,stage:3,seed:7});s.shuffles=0;s.songItemTime=40;s.songDrops=0;lastPair(s);gameAction(s,0);gameAction(s,1);stepGame(s,.4);
 assert.equal(s.linkFloor,2);assert.equal(s.shuffles,0);assert.equal(s.songDrops,0);assert.ok(s.songItemTime>39);
 s.songItemTime=0;s.songDrops=1;lastPair(s);gameAction(s,0);gameAction(s,1);stepGame(s,.4);assert.equal(s.linkFloor,1);assert.equal(s.songDrops,1);
 lastPair(s);gameAction(s,0);gameAction(s,1);assert.ok(isStageClear(s));
});
