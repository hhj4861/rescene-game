import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,gameAction,swapBread,availableSwap} from '../../src/arcade-room/model.js';
test('whack hits once, gold doubles the base reward, misses cost lives',()=>{
 const s=createGame('drive',{seed:7});s.holes[0]={ttl:1,total:1,gold:true,flash:0};gameAction(s,0);assert.equal(s.hits,1);assert.equal(s.score,210);gameAction(s,0);assert.equal(s.hits,1);s.holes[1]={ttl:.01,total:1,gold:false,flash:0};stepGame(s,.02);assert.equal(s.hearts,2);
});
test('May jumps onto a platform and bubbles trap then pop enemies',()=>{
 const s=createGame('blocks',{seed:7});s.enemies=[];gameAction(s,'jump');stepGame(s,.6);assert.equal(s.player.y,422);assert.equal(s.player.vy,0);
 s.enemies=[{x:130,y:422,home:1,dir:1,trapped:0}];gameAction(s,'bubble');stepGame(s,.1);assert.equal(s.enemies[0].trapped>0,true);stepGame(s,.2);gameAction(s,'bubble');assert.equal(s.popped,1);assert.ok(s.score>0);
});
test('bread swaps require an adjacent match and charge a move only on success',()=>{
 const s=createGame('photo',{seed:7}),before=[...s.board];assert.equal(swapBread(s,0,35),false);assert.deepEqual(s.board,before);assert.equal(s.moves,18);
 const pair=availableSwap(s.board);assert.ok(pair);assert.equal(swapBread(s,...pair),true);assert.equal(s.moves,17);assert.ok(s.collected>=3);assert.ok(availableSwap(s.board));
});
test('bread four-match creates a special bread and shuffle has limited charges',()=>{
 const s=createGame('photo',{seed:1});s.board=[1,1,2,1,3,4,2,3,1,4,5,2,3,4,5,2,1,3,4,5,2,3,4,1,5,2,3,4,1,2,2,3,4,1,2,3];assert.equal(swapBread(s,2,8),true);assert.ok(s.board.some(x=>x>10));
 s.flash=0;gameAction(s,'shuffle');gameAction(s,'shuffle');const board=[...s.board];gameAction(s,'shuffle');assert.deepEqual(s.board,board);assert.equal(s.shuffles,0);
});
test('pump uses all five lanes and accepts a simultaneous chord',()=>{
 const s=createGame('rhythm',{stage:3});assert.equal(new Set(s.notes.map(n=>n.lane)).size,5);const chord=s.notes.find((n,i)=>i>0&&n.at===s.notes[i-1].at);assert.ok(chord);const pair=s.notes.filter(n=>n.at===chord.at);s.elapsed=chord.at;for(const n of pair)gameAction(s,n.lane);assert.equal(s.hits,2);assert.equal(s.hearts,3);
});
test('defense spends stars, caps upgrades and projectile kills earn resources',()=>{
 const s=createGame('catch',{seed:7});gameAction(s,0);assert.equal(s.energy,4);gameAction(s,0);assert.equal(s.towers[0].level,2);gameAction(s,0);assert.equal(s.towers[0].level,2);
 s.enemies=[{id:0,lane:0,x:280,hp:2,maxHp:2}];s.spawn=10;stepGame(s,1);assert.equal(s.defeated,1);assert.ok(s.score>0);
});

test('May can reach every raised platform with ordinary held movement and jumps',()=>{const s=createGame('blocks',{seed:7});s.enemies=[];s.spawn=10;s.player.x=180;gameAction(s,'jump');stepGame(s,.65);assert.equal(s.player.y,422);gameAction(s,'jump');for(let i=0;i<14;i++){gameAction(s,'right');stepGame(s,.05);}gameAction(s,'stop');assert.equal(s.player.y,330);gameAction(s,'jump');for(let i=0;i<14;i++){gameAction(s,'left');stepGame(s,.05);}assert.equal(s.player.y,224);});
