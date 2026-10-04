/* global window,localStorage */
import {test,expect} from '@playwright/test';
import {createGame,availableSwap} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,stageGoal,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
import {SCORE_SONGS,REACTION_VOICES} from '../../src/arcade-room/voices.js';
import {fakeApi} from './youtube-helpers.js';
const members={drive:'woni',blocks:'may',catch:'liv'};
async function setup(page,kind,{points=4990,clear=false}={}){
 if(kind==='catch')await fakeApi(page);
 const s=createGame(kind,{seed:7,stage:1}),p=emptyProgress();s.spawn=10;
 if(kind==='drive'){s.holes[0]={ttl:4,total:4,gold:false,fake:false,flash:0};if(clear)s.hits=stageGoal(kind,1).target-1;}
 if(kind==='blocks'){s.enemies=[{x:90,y:520,home:0,dir:1,trapped:4,vy:0,think:.8,angry:false}];}
 if(kind==='catch'){s.enemies=[{id:0,lane:1,y:190,hp:1,maxHp:1,boss:false}];s.charge=5;s.gates=[];s.pickups=[{lane:1,y:440,kind:'love-attack'}];}
 p.games[kind].songs={points,claimed:Math.floor(points/5000)*5000,roundHigh:0};p.games[kind].snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);const Native=window.Audio;window.songClips=[];window.Audio=class extends Native{constructor(src){super(src);window.songClips.push({src,audio:this});}};},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.locator(`[data-start="${kind}"].start`).click();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-resume]').click();return s;
}
async function score(page,s){
 if(s.kind==='drive')await page.keyboard.press('1');
 else if(s.kind==='catch')await page.keyboard.press('Space');
 else if(s.kind==='photo'){const pair=availableSwap(s.board);for(const i of pair)await page.locator(`.field-controls [data-act="${i}"]`).click();}
 await page.clock.runFor(100);
}
test('Zena restores rotating match reactions and leaves old song rewards inactive',async({page})=>{
 const s=await setup(page,'photo',{points:9990});await score(page,s);
 await expect(page.locator('#song-progress')).toHaveCount(0);await expect(page.locator('[data-song-replay]')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>window.songClips.at(-1)?.audio.currentTime||0)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.songClips.map(c=>c.src))).toEqual([REACTION_VOICES.zena[0].file]);
 for(let turn=1;turn<3;turn++){
  await page.locator('[data-pause]').click();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.photo,PROGRESS_KEY);
  expect(saved.songs.points).toBe(9990);expect(saved.songs.claimed).toBe(5000);
  await page.clock.runFor(4100);await page.locator('[data-resume]').click();
  // Pausing saves the settled board and cancels the previous native voice.
  await page.clock.runFor(1500);await score(page,{kind:'photo',board:saved.snapshot.board});
  await expect.poll(()=>page.evaluate(()=>window.songClips.at(-1)?.audio.currentTime||0)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.songClips.map(c=>c.src))).toEqual(REACTION_VOICES.zena.slice(0,turn+1).map(c=>c.file));
 }
});
for(const toggle of ['voice','sound'])test(`Zena match reactions respect ${toggle} mute`,async({page})=>{
 const s=await setup(page,'photo');await page.locator(`[data-${toggle}]`).click();await score(page,s);
 expect(await page.evaluate(()=>window.songClips)).toEqual([]);
});
for(const [kind,member] of Object.entries(members))test(`${member} earns own singing reward at cumulative 5000 and persists without replay`,async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const s=await setup(page,kind);await score(page,s);
 await expect(page.locator('#song-progress')).toContainText('다음 노래 10,000점');
 await expect.poll(()=>page.evaluate(()=>window.songClips.at(-1)?.audio.currentTime||0)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.songClips.map(c=>c.src))).toEqual([SCORE_SONGS[member].file]);await expect(page.locator('[data-song-replay]')).toBeEnabled();await page.screenshot({path:info.outputPath(`${member}-song-reward.png`),fullPage:true});
 if(kind==='catch')expect(await page.evaluate(()=>window.ytPlayers.at(-1).volume)).toBe(0);
 await page.locator('[data-pause]').click();expect(await page.evaluate(()=>window.songClips.every(c=>c.audio.paused))).toBe(true);if(kind==='catch')expect(await page.evaluate(()=>window.ytPlayers.at(-1).volume)).toBe(75);
 const ledger=await page.evaluate(({key,kind})=>JSON.parse(localStorage.getItem(key)).games[kind].songs,{key:PROGRESS_KEY,kind});expect(ledger.claimed).toBe(5000);
 await page.reload();await page.locator(`[data-start="${kind}"].start`).click();expect(await page.evaluate(()=>window.songClips)).toEqual([]);await expect(page.locator('#song-progress')).toContainText(ledger.points.toLocaleString());await page.locator('[data-resume]').click();await page.clock.runFor(100);expect(await page.evaluate(()=>window.songClips)).toEqual([]);expect(errors).toEqual([]);
});
test('10000 reward takes priority over simultaneous clear speech and can replay',async({page})=>{
 const s=await setup(page,'drive',{points:9990,clear:true});await score(page,s);await expect(page.locator('#app')).toHaveAttribute('data-cleared','true');expect(await page.evaluate(()=>window.songClips.map(c=>c.src))).toEqual([SCORE_SONGS.woni.file]);await expect(page.locator('#song-progress')).toContainText('15,000점');
 await page.locator('[data-song-replay]').click();expect(await page.evaluate(()=>window.songClips.length)).toBe(2);
});
test('muted milestones stay claimed and enabling voices does not replay old speech',async({page})=>{
 const s=await setup(page,'drive');await page.locator('[data-voice]').click();await score(page,s);await page.locator('[data-voice]').click();await page.clock.runFor(50);expect(await page.evaluate(()=>window.songClips)).toEqual([]);await page.locator('[data-song-replay]').click();expect(await page.evaluate(()=>window.songClips.map(c=>c.src))).toEqual([SCORE_SONGS.woni.file]);
});
test('failed reward keeps score saved and manual retry works',async({page})=>{
 await page.route('**/voices/woni-song.mp3',r=>r.abort());const s=await setup(page,'drive');await score(page,s);await expect(page.locator('#voice-preview-status')).toContainText('다시 듣기');await expect(page.locator('#song-progress')).toContainText('10,000점');await page.unroute('**/voices/woni-song.mp3');await page.locator('[data-song-replay]').click();await expect.poll(()=>page.evaluate(()=>window.songClips.at(-1)?.audio.currentTime||0)).toBeGreaterThan(0);
});
test('each score-song recording is audible, short and distinct',async({page})=>{
 await page.goto('./');const signals=await page.evaluate(async clips=>{
 const c=new (window.AudioContext||window.webkitAudioContext)();try{return await Promise.all(clips.map(async clip=>{const r=await window.fetch(clip.file);if(!r.ok)throw Error(clip.file);const bytes=await r.arrayBuffer(),hash=Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes))).join(','),b=await c.decodeAudioData(bytes);let power=0;for(const x of b.getChannelData(0))power+=x*x;return {duration:b.duration,rms:Math.sqrt(power/b.length),hash};}));}finally{await c.close();}
 },Object.values(SCORE_SONGS));expect(new Set(signals.map(s=>s.hash)).size).toBe(4);for(const s of signals){expect(s.duration).toBeGreaterThan(1);expect(s.duration).toBeLessThan(6);expect(s.rms).toBeGreaterThan(.003);}
});

test('master mute suppresses both milestone and simultaneous automatic clear voice',async({page})=>{
 const s=await setup(page,'drive',{points:4990,clear:true});await page.locator('[data-sound]').click();await page.locator('#game').focus();await score(page,s);await expect(page.locator('#app')).toHaveAttribute('data-cleared','true');expect(await page.evaluate(()=>window.songClips)).toEqual([]);await expect(page.locator('#song-progress')).toContainText('10,000점');
});
