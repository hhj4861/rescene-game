import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {pumpNotePosition} from '../../src/arcade-room/pump-input.js';
for(const height of [360,600])test(`direct notes require both location and timing at height ${height}`,()=>{
 const s=createGame('rhythm');stepGame(s,1.5);const n=s.notes[0];
 gameAction(s,{...pumpNotePosition(s,n,height),height});assert.equal(s.hits,0);assert.equal(s.feedback[0],'WAIT');
 stepGame(s,.5);gameAction(s,{x:240,y:136,height});assert.equal(s.hits,0);
 gameAction(s,{...pumpNotePosition(s,n,height),height});assert.equal(s.score,105);
 gameAction(s,{x:75,y:136,height});assert.equal(s.hits,1);
 stepGame(s,1);gameAction(s,s.notes[1].lane);assert.equal(s.hits,2);
});
test('clicking a future same-lane note cannot hit the current note',()=>{
 const s=createGame('rhythm');s.notes=[{at:2,lane:0,status:'waiting'},{at:2.6,lane:0,status:'waiting'}];stepGame(s,2);
 gameAction(s,{...pumpNotePosition(s,s.notes[1],600),height:600});assert.equal(s.hits,0);assert.equal(s.notes[0].status,'waiting');
});
test('offsets, chords and expired notes keep their timing rules',()=>{
 const s=createGame('rhythm',{stage:3,offsetMs:100});const chord=s.notes.filter(n=>n.at===5.5);assert.equal(chord.length,2);s.notes.filter(n=>n.at<5.5).forEach(n=>n.status='hit');stepGame(s,5.6);
 for(const n of chord)gameAction(s,{...pumpNotePosition(s,n,360),height:360});assert.equal(s.hits,2);
 const n=s.notes.find(n=>n.status==='waiting');stepGame(s,n.at+.4-s.elapsed);gameAction(s,{...pumpNotePosition(s,n,600),height:600});assert.equal(s.hits,2);
 for(const action of [{x:NaN,y:136,height:600},{x:75,y:80,height:600},{x:75,y:136,height:0}])gameAction(s,action);assert.equal(s.hits,2);
});
