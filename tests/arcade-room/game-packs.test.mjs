import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,RECORD_KEY,GAME_IDS} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY,saveRound,newRun,finishStage,stageGoal} from '../../src/arcade-room/progress.js';
import {GAME_PACKS,PACKS_KEY,readGamePacks,packProgress,packRecords,activePack,selectPack,saveGamePacks,savePackRecord} from '../../src/arcade-room/game-packs.js';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
test('every member has a default pack; IDs and snapshots identify a compatible engine',()=>{
 const library=readGamePacks();assert.equal(new Set(GAME_PACKS.map(p=>p.id)).size,7);
 for(const kind of GAME_IDS){const pack=activePack(library,kind);assert.equal(pack.kind,kind);assert.equal(createGame(kind,pack.options).kind,kind);}
 assert.equal(activePack(library,'blocks').id,'may-survival');
 assert.equal(selectPack(library,'blocks','liv-shooter'),false);assert.equal(selectPack(library,'blocks','__proto__'),false);
});
test('switching packs preserves independent snapshots, lives, songs and high scores across reload',()=>{
 const storage=memory(),library=readGamePacks(storage),s=createGame('blocks',{survival:true,stage:7,hearts:2,seed:7});
 saveRound(packProgress(library),s);packProgress(library).games.blocks.songs.points=41;savePackRecord(storage,library,'blocks',1234);
 selectPack(library,'blocks','may-bubbles');const b=createGame('blocks',{stage:3,seed:8});saveRound(packProgress(library),b);savePackRecord(storage,library,'blocks',250);
 assert.equal(packProgress(library).games.blocks.songs.points,0);
 const loaded=readGamePacks(storage);assert.equal(activePack(loaded,'blocks').id,'may-bubbles');assert.equal(packRecords(loaded).blocks,250);assert.equal(packProgress(loaded).games.blocks.snapshot.mayVersion,2);
 selectPack(loaded,'blocks','may-survival');const entry=packProgress(loaded).games.blocks;
 assert.equal(entry.stage,7);assert.equal(entry.hearts,2);assert.equal(entry.snapshot.mayVersion,3);assert.equal(entry.songs.points,41);assert.equal(packRecords(loaded).blocks,1234);
 newRun(packProgress(loaded),'blocks');assert.equal(packProgress(loaded).games.blocks.highest,7);assert.equal(loaded.packs['may-bubbles'].journey.stage,3);
});
test('stage completion and records update only the selected pack, including the compatibility view',()=>{
 const storage=memory(),library=readGamePacks(storage);selectPack(library,'blocks','may-bubbles');
 const s=createGame('blocks',{seed:7});s.popped=stageGoal('blocks',1).target;s.ended=true;s.score=990;
 assert.equal(finishStage(packProgress(library),s),true);savePackRecord(storage,library,'blocks',s.score);
 assert.equal(library.packs['may-bubbles'].journey.stage,2);assert.equal(library.packs['may-survival'].journey.stage,1);
 assert.equal(JSON.parse(storage.getItem(PROGRESS_KEY)).games.blocks.stage,2);assert.equal(JSON.parse(storage.getItem(RECORD_KEY)).blocks,990);
 selectPack(library,'blocks','may-survival');saveGamePacks(storage,library);
 assert.equal(JSON.parse(storage.getItem(RECORD_KEY)).blocks,0);assert.equal(readGamePacks(storage).packs['may-bubbles'].record,990);
});
for(const survival of [true,false])test(`legacy May ${survival?'survival':'bubble'} progress migrates once without duplicating it`,()=>{
 const storage=memory(),progress=emptyProgress(),s=createGame('blocks',{survival,stage:4,hearts:2,seed:7});saveRound(progress,s);
 progress.games.drive.highest=8;storage.setItem(PROGRESS_KEY,JSON.stringify(progress));storage.setItem(RECORD_KEY,JSON.stringify({blocks:1500,drive:310}));
 const library=readGamePacks(storage),id=survival?'may-survival':'may-bubbles',other=survival?'may-bubbles':'may-survival';
 assert.equal(library.packs[id].journey.stage,4);assert.equal(library.packs[id].record,1500);assert.equal(library.packs[other].record,0);assert.equal(library.packs[other].journey.snapshot,null);
 selectPack(library,'blocks',other);saveGamePacks(storage,library);
 const reloaded=readGamePacks(storage);assert.equal(activePack(reloaded,'blocks').id,other);assert.equal(reloaded.packs[id].journey.hearts,2);assert.equal(reloaded.packs['woni-walk'].journey.highest,8);assert.equal(reloaded.packs['woni-walk'].record,310);
});
test('classic links migrate legacy progress without a snapshot and do not copy saved survival progress',()=>{
 const storage=memory();storage.setItem(PROGRESS_KEY,JSON.stringify({version:1,games:{blocks:{cleared:[1,2,3,4,5]}}}));
 const library=readGamePacks(storage,{classicMay:true});assert.equal(packProgress(library).games.blocks.stage,6);
 saveGamePacks(storage,library);selectPack(library,'blocks','may-survival');packProgress(library).games.blocks.stage=2;packProgress(library).games.blocks.highest=2;saveGamePacks(storage,library);
 const linked=readGamePacks(storage,{classicMay:true});assert.equal(packProgress(linked).games.blocks.stage,6);assert.equal(linked.packs['may-survival'].journey.stage,2);
});
test('malformed storage, foreign selections and cross-variant snapshots cannot break the pack picker',()=>{
 const storage=memory();storage.setItem(PACKS_KEY,'{broken');assert.equal(activePack(readGamePacks(storage),'blocks').id,'may-survival');
 const library=readGamePacks(storage);library.selected.blocks='liv-shooter';library.packs['may-survival'].journey.snapshot=snapshotRound(createGame('blocks'));library.packs['may-bubbles'].record=-4;
 storage.setItem(PACKS_KEY,JSON.stringify(library));const loaded=readGamePacks(storage);assert.equal(activePack(loaded,'blocks').id,'may-survival');assert.equal(packProgress(loaded).games.blocks.snapshot,null);assert.equal(loaded.packs['may-bubbles'].record,0);
});
test('unavailable storage keeps both packs in memory and reports the failed save',()=>{
 const storage={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}},library=readGamePacks(storage);
 assert.equal(savePackRecord(storage,library,'blocks',100).saved,false);selectPack(library,'blocks','may-bubbles');assert.equal(packRecords(library).blocks,0);selectPack(library,'blocks','may-survival');assert.equal(packRecords(library).blocks,100);
});
