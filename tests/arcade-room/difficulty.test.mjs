import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_IDS,createGame,stageSpeed,stageTarget,stepGame,gameAction,availableSwap} from '../../src/arcade-room/model.js';
import {isStageClear} from '../../src/arcade-room/progress.js';
test('targets grow beyond stage five and late-game speed stays bounded',()=>{for(const kind of GAME_IDS){assert.ok(stageTarget(kind,30)>stageTarget(kind,5));assert.ok(stageTarget(kind,10000)>=stageTarget(kind,30));}assert.ok(stageSpeed({stage:10000})<2.4);});
test('responsive play can clear Woni and Byeol walk, bread, pump and defense stage one',()=>{
 for(const kind of ['drive','photo','rhythm','catch']){const s=createGame(kind,{seed:7});
 for(let i=0;i<6000&&!s.ended&&!isStageClear(s);i++){if(kind==='drive'){const gift=s.objects.find(o=>['treat','song','clock'].includes(o.kind)&&o.y>200);if(gift)gameAction(s,gift.lane);const danger=s.objects.find(o=>['log','puddle'].includes(o.kind)&&o.lane===s.lane&&o.y>390);if(danger)gameAction(s,(s.lane+1)%3);}if(kind==='photo'&&!s.flash){const p=availableSwap(s.board);gameAction(s,p[0]);gameAction(s,p[1]);}if(kind==='rhythm')for(const n of s.notes)if(n.status==='waiting'&&Math.abs(n.at-s.elapsed)<.04)gameAction(s,n.lane);if(kind==='catch'){const threat=[...s.enemies].sort((a,b)=>b.y-a.y)[0];const item=s.pickups.find(i=>i.y>410&&i.y<485),gate=s.gates.find(g=>g.y>450);if(item)gameAction(s,item.lane);else if(threat)gameAction(s,threat.lane);if(gate)gameAction(s,gate.options.reduce((best,o,i)=>(o.op==='multiply'?s.squad*o.value:s.squad+o.value)>(gate.options[best].op==='multiply'?s.squad*gate.options[best].value:s.squad+gate.options[best].value)?i:best,0));if(s.charge===5)gameAction(s,'burst');}stepGame(s,.05);}assert.ok(isStageClear(s),kind+' must be beatable');}
});
