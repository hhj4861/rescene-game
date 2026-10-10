/* global window, document, localStorage, Event */
import {test,expect} from '@playwright/test';
import {fakeApi} from './youtube-helpers.js';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,kind,blocked=false){
 await fakeApi(page,blocked);const p=emptyProgress();
 if(kind==='catch'){const s=createGame(kind,{seed:7});s.spawn=15;s.pickups=[{lane:1,y:440,kind:'pinball'}];p.games.catch.snapshot=snapshotRound(s);}
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator(`[data-start="${kind}"].start`).click();await page.locator(kind==='catch'?'[data-resume]':'[data-song-start]').click();await page.clock.runFor(150);
}
for(const kind of ['catch','rhythm'])for(const viewport of [{width:320,height:568},{width:390,height:844}])test(`${kind} fits the first mobile viewport ${viewport.width} with an expandable same-player video`,async({page},info)=>{
 await page.setViewportSize(viewport);await open(page,kind);await page.evaluate(()=>window.scrollTo(0,0));
 const field=await page.locator('.playfield').boundingBox(),controls=await page.locator('.game-controls').boundingBox();
 expect(field.y).toBeGreaterThanOrEqual(0);expect(field.y+field.height).toBeLessThanOrEqual(viewport.height);expect(controls.y+controls.height).toBeLessThanOrEqual(viewport.height);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
 await page.screenshot({path:info.outputPath(`${kind}-${viewport.width}-folded.png`),fullPage:true});
 const count=await page.evaluate(()=>window.ytPlayers.length);await page.locator('[data-video-toggle]').click();await expect(page.locator('#pump-video iframe')).toBeVisible();await expect(page.locator('[data-video-toggle]')).toHaveAttribute('aria-expanded','true');
 await page.locator('[data-video-toggle]').click();await expect(page.locator('#pump-video iframe')).toBeHidden();expect(await page.evaluate(()=>window.ytPlayers.length)).toBe(count);
 await page.setViewportSize({width:1280,height:900});await expect(page.locator('#pump-video iframe')).toBeVisible();await expect(page.locator('[data-video-toggle]')).toBeHidden();
});
for(const kind of ['catch','rhythm'])test(`${kind} guide freezes time and media, resumes on close, and respects an external pause`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,kind);const toggle=page.getByRole('button',{name:'게임 안내 ⓘ'});
 await toggle.click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');const time=await page.locator('#time').textContent(),media=await page.evaluate(()=>window.ytPlayers.at(-1).getCurrentTime());
 await page.clock.runFor(30000);await expect(page.locator('#time')).toHaveText(time);expect(await page.evaluate(()=>window.ytPlayers.at(-1).getCurrentTime())).toBe(media);
 await page.getByRole('button',{name:'게임 안내 닫기'}).click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.clock.runFor(250);expect(await page.evaluate(()=>window.ytPlayers.at(-1).getCurrentTime())).toBeGreaterThan(media);
 await toggle.click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(100);await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await expect(page.locator('#overlay')).toBeVisible();
 await page.locator('[data-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
});

test('blocked mobile autoplay reveals the native player and retry starts the frozen round',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,'rhythm',true);
 await expect(page.locator('[data-video-toggle]')).toHaveAttribute('aria-expanded','true');await expect(page.locator('#pump-video iframe')).toBeVisible();
 await page.clock.runFor(3000);await expect(page.locator('#time')).toHaveText('60초');await expect(page.locator('#pump-gauge')).toHaveAttribute('aria-valuenow','50');
 await page.evaluate(()=>window.ytBlocked=false);await page.locator('[data-retry-music]').click();await page.clock.runFor(200);await expect(page.locator('#music-status')).toContainText('재생 중');
});
