/* global window,localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
const near=()=>{const s=createGame('photo',{seed:7});for(const i of [6,12,13])s.breadCover[i]=true;return s;};
async function open(page,s){
 const p=emptyProgress();p.games.photo.snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);const Native=window.Audio;window.tenwonClips=[];window.Audio=class extends Native{constructor(src){super(src);window.tenwonClips.push({src,audio:this});}};},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-slide="photo"]').click();await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();
}
const finds=page=>page.evaluate(()=>window.tenwonClips.filter(c=>c.src.includes('zena-tenwon')) .length);
async function dig(page){await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="7"]').click();}
test('buried tenwon bread appears through cleared cells and partial excavation never plays its voice',async({page},info)=>{
 await open(page,createGame('photo',{seed:7}));await expect(page.locator('.play-layout h1')).toHaveText('십원빵');await page.screenshot({path:info.outputPath('buried.png'),fullPage:true});await dig(page);await page.clock.runFor(1200);
 await expect(page.locator('#goal')).toHaveText('0 / 2 십원빵');expect(await finds(page)).toBe(0);await page.screenshot({path:info.outputPath('partly-revealed.png'),fullPage:true});
});
test('completing a buried bread plays the original phrase once and reload never replays an earned bread',async({page},info)=>{
 await open(page,near());expect(await finds(page)).toBe(0);await dig(page);await expect(page.locator('#goal')).toHaveText('1 / 2 십원빵');await expect(page.locator('#reaction')).toHaveText('십원빵 아이가!');
 await expect.poll(()=>page.evaluate(()=>window.tenwonClips.find(c=>c.src.includes('zena-tenwon'))?.audio.currentTime||0)).toBeGreaterThan(0);
 expect(await finds(page)).toBe(1);await page.clock.runFor(1000);await page.screenshot({path:info.outputPath('excavated.png'),fullPage:true});await page.locator('[data-pause]').click();expect(await page.evaluate(()=>window.tenwonClips.every(c=>c.audio.paused))).toBe(true);
 await page.reload();await page.locator('[data-slide="photo"]').click();await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();await expect(page.locator('#goal')).toHaveText('1 / 2 십원빵');expect(await finds(page)).toBe(0);await page.locator('[data-act="shuffle"]').click();expect(await finds(page)).toBe(0);
});
for(const toggle of ['sound','voice'])test(`tenwon discovery respects ${toggle} mute`,async({page})=>{
 await open(page,near());await page.locator(`[data-${toggle}]`).click();await dig(page);await expect(page.locator('#goal')).toHaveText('1 / 2 십원빵');expect(await finds(page)).toBe(0);
});
test('tenwon voice does not interrupt a one-minute item song and voice mute stops both',async({page})=>{
 const s=near();s.songDrops=1;await open(page,s);await page.locator('[data-act="song-pickup"]').click();await expect.poll(()=>page.evaluate(()=>window.tenwonClips.find(c=>c.src.includes('zena-song'))?.audio.currentTime||0)).toBeGreaterThan(0);
 await dig(page);await expect.poll(()=>finds(page)).toBe(1);expect(await page.evaluate(()=>window.tenwonClips.find(c=>c.src.includes('zena-song')).audio.paused)).toBe(false);await expect(page.locator('[data-act="song-pickup"]')).toBeHidden();
 await page.locator('[data-voice]').click();expect(await page.evaluate(()=>window.tenwonClips.every(c=>c.audio.paused))).toBe(true);
});
test('finding the final bread plays the pickup and clears the stage without duplicate finds',async({page})=>{
 const s=near();s.breadCover.fill(true);s.breadCover[7]=false;await open(page,s);await dig(page);await expect.poll(()=>finds(page)).toBe(1);await page.clock.runFor(1200);await expect(page.locator('#result-title')).toHaveText('스테이지 1 클리어!');expect(await finds(page)).toBe(1);
 await expect(page.locator('.result-paper')).toContainText('십원빵 2개');await page.locator('.result-paper [data-start="photo"]').click();await expect(page.locator('.field-controls button')).toHaveCount(49);expect(await finds(page)).toBe(1);
});
test('tenwon source clip decodes as an audible 1.65-second recording',async({page})=>{
 await page.goto('./');const signal=await page.evaluate(async()=>{const r=await window.fetch('./voices/zena-tenwon.mp3'),context=new window.AudioContext();try{const b=await context.decodeAudioData(await r.arrayBuffer());let power=0;for(const x of b.getChannelData(0))power+=x*x;return {ok:r.ok,duration:b.duration,rms:Math.sqrt(power/b.length)};}finally{await context.close();}});
 expect(signal.ok).toBe(true);expect(signal.duration).toBeGreaterThan(1.6);expect(signal.duration).toBeLessThan(1.72);expect(signal.rms).toBeGreaterThan(.005);
});
