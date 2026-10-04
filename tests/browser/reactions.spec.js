/* global window */
import {test,expect} from '@playwright/test';
import {REACTION_VOICES,LIV_SONG} from '../../src/arcade-room/voices.js';

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
