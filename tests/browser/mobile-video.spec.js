/* global window, document, localStorage */
import {test,expect} from '@playwright/test';
import {fakeApi} from './youtube-helpers.js';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,kind){
 await fakeApi(page);const p=emptyProgress();
 if(kind==='catch'){const s=createGame(kind,{seed:7});s.spawn=15;s.gates=[];s.pickups=[{lane:1,y:440,kind:'pinball'}];p.games.catch.snapshot=snapshotRound(s);}
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator(`[data-start="${kind}"].start`).click();
 await page.locator(kind==='catch'?'[data-resume]':'[data-song-start]').click();await page.clock.runFor(150);await expect(page.locator('#music-status')).toContainText('재생 중');
}
for(const kind of ['catch','rhythm'])test(`${kind}: mobile video folds without recreating or restarting playback`,async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await open(page,kind);
 const toggle=page.locator('[data-video-toggle]'),frame=page.locator('#pump-video iframe');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(frame).toBeHidden();
 const before=await page.evaluate(()=>({count:window.ytPlayers.length,time:window.ytPlayers.at(-1).getCurrentTime()}));
 const bar=await toggle.boundingBox();expect(bar.height).toBeGreaterThanOrEqual(44);expect((await page.locator('.playfield').boundingBox()).width).toBeGreaterThanOrEqual(240);
 await page.screenshot({path:info.outputPath(`${kind}-folded.png`),fullPage:true});await toggle.click();await expect(frame).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');
 const video=await frame.boundingBox();expect(video.width).toBeGreaterThanOrEqual(200);expect(video.height).toBeGreaterThanOrEqual(200);
 await page.clock.runFor(300);await toggle.click();await expect(frame).toBeHidden();expect(await page.evaluate(()=>window.ytPlayers.length)).toBe(before.count);expect(await page.evaluate(()=>window.ytPlayers.at(-1).getCurrentTime())).toBeGreaterThan(before.time);
 expect(await page.evaluate(()=>window.ytPlayers.at(-1).status)).toBe(1);await expect(page.locator('#app')).toHaveAttribute('data-state','playing');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.setViewportSize({width:1280,height:900});await expect(toggle).toBeHidden();await expect(frame).toBeVisible();const left=await frame.boundingBox(),right=await page.locator('.game-cabinet').boundingBox();expect(left.x+left.width).toBeLessThan(right.x);
 await page.setViewportSize({width:390,height:844});await expect(toggle).toBeVisible();await expect(frame).toBeHidden();
});
