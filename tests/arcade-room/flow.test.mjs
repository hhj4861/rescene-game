import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,gameAction,makePhoto,snapPhoto,stepPhoto,makeRhythm,tapRhythm,stepRhythm,makeCatch,stepCatch,readRecords,saveRecord,RECORD_KEY,GAME_IDS} from '../../src/arcade-room/model.js';
test('camera timing, cooldown and a missed shot cannot farm points',()=>{
 const s=makePhoto();assert.equal(snapPhoto(s),true);assert.equal(s.perfect,1);const score=s.score;assert.equal(snapPhoto(s),false);assert.equal(s.score,score);
 stepPhoto(s,.8);snapPhoto(s);assert.equal(s.event,'photo-miss');assert.equal(s.score,score);assert.equal(s.combo,0);
 stepPhoto(s,60);assert.equal(s.ended,true);assert.equal(s.remaining,0);assert.equal(snapPhoto(s),false);
});
test('rhythm requires the correct lane and each note can score only once',()=>{
 const s=makeRhythm();stepRhythm(s,2);assert.equal(tapRhythm(s,1),false);stepRhythm(s,.11);assert.equal(tapRhythm(s,0),true);const score=s.score;
 stepRhythm(s,.11);assert.equal(tapRhythm(s,0),false);assert.equal(s.score,score);
 stepRhythm(s,1);assert.equal(s.misses,1);assert.equal(s.combo,0);
});
test('rhythm correction shifts judgment and is bounded',()=>{
 const s=makeRhythm(150);stepRhythm(s,2.15);assert.equal(tapRhythm(s,0),true);assert.equal(s.event,'rhythm-perfect');assert.equal(makeRhythm(999).offset,.2);assert.equal(makeRhythm(NaN).offset,0);
 const t=makeRhythm(-200);stepRhythm(t,1.8);assert.equal(tapRhythm(t,0),true);
});
test('star catch scores only once in the selected lane, blue stars double',()=>{
 const s=makeCatch(()=>0);s.objects=[{lane:1,y:.75,blue:true},{lane:0,y:.76,blue:false}];stepCatch(s,.01);assert.equal(s.score,200);assert.equal(s.stars,1);stepCatch(s,.01);assert.equal(s.score,200);
 gameAction(s,'left');stepCatch(s,.01);assert.equal(s.score,300);s.objects=[{lane:2,y:.99,blue:false}];stepCatch(s,.1);assert.equal(s.misses,1);assert.equal(s.ended,false);
});
test('all five game loops terminate and ignore actions after completion',()=>{
 for(const kind of GAME_IDS){const s=createGame(kind,{random:()=>0});for(let i=0;i<1300&&!s.ended;i++)stepGame(s,.05);assert.equal(s.ended,true,kind);const before=JSON.stringify(s);for(const action of ['left','right','snap','drop','rotate'])gameAction(s,action);assert.equal(JSON.stringify(s),before,kind);}
});
test('existing two-game saves migrate without loss; five records stay independent',()=>{
 let data='{"drive":123,"blocks":456}';const storage={getItem:key=>key===RECORD_KEY?data:null,setItem:(key,value)=>{assert.equal(key,RECORD_KEY);data=value;}};
 for(const [i,kind] of ['photo','rhythm','catch'].entries())saveRecord(storage,kind,(i+1)*100);
 assert.deepEqual(readRecords(storage),{drive:123,blocks:456,photo:100,rhythm:200,catch:300});saveRecord(storage,'rhythm',2);assert.equal(readRecords(storage).rhythm,200);
 const denied={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(saveRecord(denied,'catch',30).saved,false);
});
