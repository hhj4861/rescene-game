import test from 'node:test';
import assert from 'node:assert/strict';
import {cast,castOrder,characterFor,characterArt,stagePose} from '../../src/survival/characters25/cast.js';
import {portrait,memberOrder} from '../../src/survival/art.js';
import {members} from '../../server/survival/catalog.mjs';

test('approved visual IDs bind to the user-specified members independently of game array order',()=>{
  assert.deepEqual(cast.map(({visual,id,name})=>[visual,id,name]),[
    ['01','woni','원이'],['02','may','메이'],['03','zena','제나'],['04','minami','미나미'],['05','liv','리브'],
  ]);
  assert.deepEqual(memberOrder,castOrder);
  assert.notDeepEqual(members.map(member=>member.id),castOrder);
  members.forEach(member=>{
    const selected=characterFor(member.id),markup=portrait(member.id,true);
    assert.match(markup,new RegExp(`data-visual="${selected.visual}"`));
    assert.match(markup,new RegExp(`aria-label="${member.name} 캐릭터"`));
    assert.ok(markup.includes(`viewBox="${selected.face.join(' ')}"`));
  });
  assert.equal(characterArt('unknown'),'');
  assert.equal(portrait('unknown'),'');
});
test('each portrait has unique clipping and every full body uses the same display scale',()=>{
  const ids=cast.flatMap(member=>[portrait(member.id),portrait(member.id)]).map(markup=>markup.match(/clipPath id="([^"]+)"/)[1]);
  assert.equal(new Set(ids).size,10);
  for(const member of cast){
    const art=characterArt(member.id,'body'),box=art.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    assert.deepEqual(box.slice(2),[354,887]);
    assert.ok(art.includes(`x="${member.body[0]}" y="0" width="${member.body[2]}" height="887"`));
  }
});
test('stage motion follows the member ID and audio lead even when dancer order changes',()=>{
  const frame={memberId:'may',dancers:[{id:'liv',x:15,y:60,rotate:5},{id:'may',x:50,y:72,rotate:2},{id:'woni',x:85,y:62,rotate:-3}]};
  assert.deepEqual(stagePose(frame,'may'),{lead:true,x:50,lift:3,tilt:.6});
  assert.deepEqual(stagePose(frame,'liv',true),{lead:false,x:15,lift:0,tilt:0});
  assert.equal(stagePose(frame,'woni').x,85);
  assert.deepEqual(stagePose(undefined,'zena'),{lead:false,x:50,lift:0,tilt:0});
});
