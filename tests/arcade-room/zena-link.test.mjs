import test from 'node:test';
import assert from 'node:assert/strict';
import {linkPath,linkPair,linkSize,shuffleLink} from '../../src/arcade-room/zena-link.js';
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
  while(s.board.some(Boolean)){
   const pair=linkPair(s.board);assert.ok(pair,`stage ${stage}, seed ${seed}, turn ${pairs}`);const path=linkPath(s.board,...pair);assert.ok(corners(path)<=2);
   gameAction(s,pair[0]);gameAction(s,pair[1]);assert.equal(s.board[pair[0]],0);assert.equal(s.board[pair[1]],0);assert.ok(s.flash>0);stepGame(s,.4);pairs++;
  }
  assert.equal(pairs,s.board.length/2);assert.equal(isStageClear(s),true);
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
