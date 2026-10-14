/* global window, localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
import {fakeApi} from './youtube-helpers.js';
async function open(page,kind,{clear=false,classic=false}={}){
 await fakeApi(page);const s=createGame(kind,{seed:7,survival:!classic});s.spawn=15;
 if(kind==='drive'){s.heat=4;s.objects=[{id:0,lane:1,y:455,kind:'song'},{id:1,lane:1,y:350,kind:'treat'}];}
 if(kind==='blocks'){s.enemies=[];s.items=[{x:classic?90:240,y:classic?514:360,kind:'honey',ttl:12}];}
 if(kind==='photo'){s.songDrops=1;for(const i of [6,12,13])s.breadCover[i]=true;if(clear){s.breadCover.fill(true);s.breadCover[7]=false;}}
 if(kind==='catch'){s.enemies=[];s.gates=[];s.charge=5;s.pickups=[{lane:1,y:440,kind:'love-attack'}];}
 const p=emptyProgress();p.games[kind].snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>{
  localStorage.setItem(key,value);window.audioClips=[];window.effectTones=0;
  window.Audio=class{constructor(src){this.src=src;this.paused=true;window.audioClips.push(this);}play(){this.paused=false;this.onplaying?.();return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}};
  const ramp=window.AudioParam.prototype.linearRampToValueAtTime;window.AudioParam.prototype.linearRampToValueAtTime=function(value,time){if(value===.045)window.effectTones++;return ramp.call(this,value,time);};
 },{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto(classic?'./?may=classic':'./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator(`[data-start="${kind}"].start`).click();await page.locator('[data-resume]').click();
 if(kind==='photo')await page.locator('[data-act="song-pickup"]').click();else await page.clock.runFor(100);
}
for(const [kind,classic] of [['drive',false],['blocks',false],['blocks',true],['photo',false],['catch',false]])test(`${kind}${classic?' classic':''}: song playback suppresses member and synthesized effects`,async({page})=>{
 await open(page,kind,{classic});
 if(kind==='catch')await expect(page.locator('#music-status')).toContainText('재생 중');else expect(await page.evaluate(()=>window.audioClips.some(c=>c.src.includes('-song')&&!c.paused))).toBe(true);
 const before=await page.evaluate(()=>({clips:window.audioClips.length,tones:window.effectTones}));
 if(kind==='photo'){await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="7"]').click();await expect(page.locator('#goal')).toContainText('1 / 2');}
 if(kind==='catch'){await page.evaluate(()=>window.ytPlayers.at(-1).state(3));await page.locator('[data-act="burst"]').click();await page.evaluate(()=>window.ytPlayers.at(-1).state(1));}
 if(kind==='blocks'&&classic)await page.locator('[data-act="bubble"]').click();
 await page.clock.runFor(1200);expect(await page.evaluate(()=>({clips:window.audioClips.length,tones:window.effectTones}))).toEqual(before);
 if(kind==='drive')await expect(page.locator('#app')).toHaveAttribute('data-fever','true');
 if(kind==='catch'){await page.locator('[data-sound]').click();await page.locator('[data-sound]').click();expect(await page.evaluate(()=>window.effectTones)).toBe(before.tones);}
});
test('a song continues through Zena clear; the voice button cannot interrupt it and works after it ends',async({page})=>{
 await open(page,'photo',{clear:true});await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="7"]').click();await page.clock.runFor(1200);await expect(page.locator('#app')).toHaveAttribute('data-cleared','true');
 expect(await page.evaluate(()=>window.audioClips.length)).toBe(1);await page.locator('[data-speak]').click();await expect(page.locator('#voice-status')).toContainText('노래가 끝난 뒤');expect(await page.evaluate(()=>window.audioClips[0].paused)).toBe(false);expect(await page.evaluate(()=>window.audioClips.length)).toBe(1);
 await page.evaluate(()=>window.audioClips[0].onended());await page.locator('[data-speak]').click();expect(await page.evaluate(()=>window.audioClips.at(-1).src)).toContain('voices/zena.mp3');
});
