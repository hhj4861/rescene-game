/* global window, localStorage */
import {test,expect} from '@playwright/test';
import {REACTION_VOICES,LIV_SONG} from '../../src/arcade-room/voices.js';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';

test('all reaction recordings and the song are distinct, audible bundled media',async({page})=>{
 await page.goto('./');
 const clips=[...Object.values(REACTION_VOICES).flat(),LIV_SONG];
 for(const pool of Object.values(REACTION_VOICES)){expect(pool).toHaveLength(3);expect(new Set(pool.map(c=>c.file)).size).toBe(3);}
 const signals=await page.evaluate(async clips=>{
  const c=new (window.AudioContext||window.webkitAudioContext)();
  try{return await Promise.all(clips.map(async clip=>{
   const response=await window.fetch(clip.file);if(!response.ok)throw Error(clip.file);
   const bytes=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes))).join(','),b=await c.decodeAudioData(bytes),samples=b.getChannelData(0);let power=0,peak=0;
   for(const x of samples){power+=x*x;peak=Math.max(peak,Math.abs(x));}
   return {file:clip.file,duration:b.duration,rms:Math.sqrt(power/samples.length),peak,hash};
  }));}finally{await c.close();}
 },clips);
 expect(new Set(signals.map(s=>s.hash)).size).toBe(clips.length);
 for(const s of signals){expect(s.duration,s.file).toBeGreaterThan(.2);expect(s.duration,s.file).toBeLessThan(6);expect(s.rms,s.file).toBeGreaterThan(.003);expect(s.peak,s.file).toBeGreaterThan(.02);}
});

test('Liv note fairy sings, ducks BGM, stops on pause and never replays from a save',async({page})=>{
 const state=createGame('catch',{seed:7});state.spawn=10;state.gates=[];state.pickups=[{lane:1,y:440,kind:'fairy'}];const p=emptyProgress();p.games.catch.snapshot=snapshotRound(state);
 await page.addInitScript(({key,value})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,value);
  window.songs=[];const Audio=window.Audio;window.Audio=class extends Audio{constructor(src){super(src);window.songs.push(this);}};
  const Context=window.AudioContext||window.webkitAudioContext;window.AudioContext=class extends Context{createGain(){const gain=super.createGain();window.bgmBus??=gain;return gain;}};
 },{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
 await page.locator('[data-start="catch"].start').click();await page.locator('[data-resume]').click();await page.clock.runFor(100);
 await expect(page.locator('#powerup-status')).toContainText('음표 요정');await expect.poll(()=>page.evaluate(()=>window.songs.at(-1)?.currentTime||0)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.songs.at(-1).currentSrc)).toContain('liv-song');await expect.poll(()=>page.evaluate(()=>window.bgmBus.gain.value)).toBeLessThan(.21);
 await expect(page.getByRole('link',{name:'원본 커버 ↗'})).toHaveAttribute('href',LIV_SONG.source);
 await page.locator('[data-pause]').click();expect(await page.evaluate(()=>window.songs.every(a=>a.paused))).toBe(true);
 // WebKit may retain the last rendered AudioParam value while the graph is silent.
 // Verify restoration when the BGM graph renders again, not an idle cached value.
 await page.locator('[data-resume]').click();await page.clock.runFor(100);await expect.poll(()=>page.evaluate(()=>window.bgmBus.gain.value)).toBeGreaterThan(.99);expect(await page.evaluate(()=>window.songs.length)).toBe(1);
 await page.reload();await page.locator('[data-start="catch"].start').click();expect(await page.evaluate(()=>window.songs.length)).toBe(0);
});
