/* global window, localStorage, getComputedStyle, fetch */
import {test,expect} from '@playwright/test';
import {fakeApi} from './youtube-helpers.js';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
import {MINAMI_YAHO} from '../../src/arcade-room/voices.js';

test('only the Yaho cheer plays every ten PERFECT or GOOD hits; toggles do not preview a voice',async({page})=>{
 await fakeApi(page);const s=createGame('rhythm',{stage:6,songId:'heart-drop'}),p=emptyProgress();p.games.rhythm={...p.games.rhythm,stage:6,highest:6,snapshot:snapshotRound(s)};
 await page.addInitScript(({key,value})=>{localStorage.setItem(key,value);const Native=window.Audio;window.cheers=[];window.Audio=class extends Native{play(){if(this.src.includes('/voices/')){window.cheers.push(this.src);this.onplaying?.();return Promise.resolve();}return super.play();}};},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="rhythm"].start').click();await page.locator('[data-song-resume]').click();await page.locator('[data-resume]').click();
 const keys=['z','q','s','e','c'];let elapsed=0;
 for(let i=0;i<30;i++){
  const at=Math.round((s.notes[i].at+(i===9?.09:0))*1000);
  await page.clock.runFor(at-elapsed);elapsed=at;await page.keyboard.press(keys[s.notes[i].lane]);
  const clips=await page.evaluate(()=>window.cheers);expect(clips).toHaveLength(Math.floor((i+1)/10));expect(clips.every(src=>src.endsWith('/voices/minami-yaho.mp3'))).toBe(true);
 }
 await page.locator('[data-voice]').click();await page.locator('[data-voice]').click();expect(await page.evaluate(()=>window.cheers.length)).toBe(3);
 // An early input breaks the combo; a fresh ten earns another cheer.
 const earlyLane=keys.findIndex((_,lane)=>lane!==s.notes[29].lane&&!s.notes.slice(30).some(n=>n.lane===lane&&n.at*1000-elapsed<200));
 await page.keyboard.press(keys[earlyLane]);await expect(page.locator('#extra')).toHaveText('0');const next=30;
 for(let i=next;i<next+10;i++){const at=Math.round(s.notes[i].at*1000);await page.clock.runFor(at-elapsed);elapsed=at;await page.keyboard.press(keys[s.notes[i].lane]);}
 expect(await page.evaluate(()=>window.cheers.length)).toBe(4);
 await page.locator('[data-sound]').click();
 for(let i=next+10;i<next+20;i++){const at=Math.round(s.notes[i].at*1000);await page.clock.runFor(at-elapsed);elapsed=at;await page.keyboard.press(keys[s.notes[i].lane]);}
 expect(await page.evaluate(()=>window.cheers.length)).toBe(4);
});

test('pump settings are grouped, song change uses the start style, and Yaho is decodable original audio',async({page},info)=>{
 await fakeApi(page);await page.goto('./');await page.locator('[data-start="rhythm"].start').click();
 const startStyle=await page.locator('[data-song-start]').evaluate(el=>{const s=getComputedStyle(el);return [s.backgroundColor,s.fontFamily,s.borderRadius,s.boxShadow];});
 await page.locator('[data-song-start]').click();await expect(page.getByRole('group',{name:'도움말'})).toContainText('하는 방법');const sound=page.getByRole('group',{name:'소리 설정'});await expect(sound.locator('button')).toHaveCount(4);
 const change=page.getByRole('button',{name:'곡 변경하기 ▶'});expect(await change.evaluate(el=>{const s=getComputedStyle(el);return [s.backgroundColor,s.fontFamily,s.borderRadius,s.boxShadow];})).toEqual(startStyle);
 await sound.locator('[data-music]').click();await expect(sound.locator('[data-music]')).toHaveAttribute('aria-pressed','false');await sound.locator('[data-retry-music]').click();await expect(sound.locator('[data-music]')).toHaveAttribute('aria-pressed','true');
 const decoded=await page.evaluate(async file=>{const c=new (window.AudioContext||window.webkitAudioContext)();try{const response=await fetch(file),b=await c.decodeAudioData(await response.arrayBuffer());return {duration:b.duration,peak:Math.max(...b.getChannelData(0).filter((_,i)=>i%10===0).map(Math.abs))};}finally{await c.close();}},MINAMI_YAHO.file);expect(decoded.duration).toBeGreaterThan(2);expect(decoded.duration).toBeLessThan(3);expect(decoded.peak).toBeGreaterThan(.01);
 await page.screenshot({path:info.outputPath('pump-settings.png'),fullPage:true});await change.click();await expect(page.locator('#app')).toHaveAttribute('data-state','songs');await expect(page.locator('[data-song-start]')).toBeVisible();
});
