import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame,stageTarget,matches} from '../../src/arcade-room/model.js';
import {isStageClear,snapshotRound,restoreRound} from '../../src/arcade-room/progress.js';
import {breadHunt,hiddenBreadAreas} from '../../src/arcade-room/bakery-hunt.js';
import {playBreadTurn} from '../helpers/bakery-player.mjs';

test('a Woni stage needs treats from all three lanes, and old earned progress still restores',()=>{
 const s=createGame('drive',{seed:7});s.hits=stageTarget('drive',1);s.treatLanes=2;assert.equal(isStageClear(s),false);
 for(const lane of [0,2]){s.lane=lane;s.x=[100,240,380][lane];s.objects=[{id:0,lane,y:455,kind:'treat'}];stepGame(s,.025);}
 assert.equal(isStageClear(s),true);assert.equal(restoreRound(snapshotRound(s)).treatLanes,7);
 const old=snapshotRound(s);delete old.treatLanes;assert.equal(restoreRound(old).treatLanes,7);
});
test('ordinary late Zena stages contain several breads, milestone stages contain one large bread',()=>{
 for(let stage=5;stage<=50;stage++){const s=createGame('photo',{stage,seed:stage}),hunt=breadHunt(s);assert.equal(hunt.length===1,stage%5===0);if(stage%5)assert.ok(hunt.length>=3);}
 const old=snapshotRound(createGame('photo',{stage:11,seed:7}));delete old.breadLayout;
 const restored=restoreRound(old);assert.equal(breadHunt(restored).length,1);assert.deepEqual(breadHunt(restored).map(({x,y,w,h})=>({x,y,w,h})),hiddenBreadAreas(8,11,1));
 assert.equal(restoreRound(snapshotRound(restored)).breadLayout,1);
});
test('finite parcel boards put most excavation back into matches while retaining a way to finish',()=>{
 for(const stage of [1,2,5,6,10,11,15,30]){let pins=0,matched=0;
 for(let seed=1;seed<=20;seed++){
 const s=createGame('photo',{stage,seed});assert.equal(matches(s.board).length,0);
 for(let turn=0;turn<80&&!s.ended&&!isStageClear(s);turn++){
 const before=s.collected,moves=s.moves;playBreadTurn(s);if(moves===s.moves)pins+=s.collected-before;else matched+=s.collected-before;stepGame(s,1);
 }
 assert.ok(isStageClear(s),`stage ${stage}, seed ${seed}`);
 }
 assert.ok(pins/(pins+matched)<.55,`stage ${stage} uses too many rolling pins`);
 }
});
test('May late-stage starts offer growth time without awarding a stationary win',()=>{
 for(const stage of [10,20,30]){
 const s=createGame('blocks',{stage,seed:7,survival:true});assert.ok(s.upgrades.star>=2);
 for(let i=0;i<200&&!s.ended;i++){if(s.upgradeChoices.length)gameAction(s,'upgrade:'+s.upgradeChoices[0]);stepGame(s,.05);}
 assert.ok(!s.ended,`stage ${stage} should offer at least ten seconds to act`);assert.ok(restoreRound(snapshotRound(s)));
 }
});
