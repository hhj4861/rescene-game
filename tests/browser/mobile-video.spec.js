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
for(const kind of ['catch','rhythm'])test(`${kind}: mobile guide popover preserves the game-specific video placement and playback`,async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await open(page,kind);
 const toggle=page.getByRole('button',{name:'게임 안내 ⓘ'}),panel=page.locator('#game-info'),frame=page.locator('#pump-video iframe');
 await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(panel).toBeHidden();await expect(frame).toBeVisible();await expect(page.locator('.short-guide')).toBeHidden();await expect(page.locator('#save-state')).toBeHidden();
 const before=await page.evaluate(()=>({count:window.ytPlayers.length,time:window.ytPlayers.at(-1).getCurrentTime()}));
 const video=await frame.boundingBox();if(kind==='rhythm'){const gauge=await page.locator('#pump-gauge').boundingBox();expect(video.y+video.height).toBeLessThan(gauge.y);}else{const lives=await page.locator('#lives').boundingBox(),field=await page.locator('.playfield').boundingBox();expect(video.y).toBeGreaterThan(lives.y+lives.height);expect(video.y+video.height).toBeLessThan(field.y);}expect(video.width).toBeGreaterThanOrEqual(200);expect(video.height).toBeGreaterThanOrEqual(200);expect((await page.locator('.playfield').boundingBox()).width).toBeGreaterThanOrEqual(240);expect((await toggle.boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.screenshot({path:info.outputPath(`${kind}-video-below.png`),fullPage:true});await toggle.click();await expect(panel).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(panel).toHaveAttribute('role','dialog');await expect(panel.locator('#save-state')).toContainText('자동 저장');await expect(panel.locator('.music-credit')).toContainText('BPM');await expect(panel.locator('.short-guide')).not.toBeEmpty();
 const popup=await panel.boundingBox();expect(popup.x).toBeGreaterThanOrEqual(0);expect(popup.x+popup.width).toBeLessThanOrEqual(320);expect(popup.y+popup.height).toBeLessThanOrEqual(568);
 await page.screenshot({path:info.outputPath(`${kind}-guide.png`),fullPage:true});await page.getByRole('button',{name:'게임 안내 닫기'}).click();await expect(panel).toBeHidden();await expect(toggle).toBeFocused();
 await toggle.click();await page.keyboard.press('Escape');await expect(panel).toBeHidden();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
 await toggle.click();await page.mouse.click(2,2);await expect(panel).toBeHidden();
 await page.clock.runFor(300);expect(await page.evaluate(()=>window.ytPlayers.length)).toBe(before.count);expect(await page.evaluate(()=>window.ytPlayers.at(-1).getCurrentTime())).toBeGreaterThan(before.time);
 await toggle.click();await page.setViewportSize({width:1280,height:900});await expect(toggle).toBeHidden();await expect(panel).toBeVisible();await expect(panel).not.toHaveAttribute('popover');await expect(page.locator('.short-guide')).toBeVisible();const left=await frame.boundingBox(),right=await page.locator('.game-cabinet').boundingBox();expect(left.x+left.width).toBeLessThan(right.x);
 await page.setViewportSize({width:390,height:844});await expect(toggle).toBeVisible();await expect(panel).toBeHidden();await expect(frame).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(await page.evaluate(()=>window.ytPlayers.length)).toBe(before.count);
});


test('Liv desktop pause stays inside the playfield and leaves video/settings unobscured',async({page},info)=>{
 await page.setViewportSize({width:1280,height:900});await open(page,'catch');await page.locator('[data-pause]').click();
 const overlay=await page.locator('#overlay').boundingBox(),field=await page.locator('.playfield').boundingBox(),video=await page.locator('#pump-video').boundingBox();expect(overlay.x).toBeGreaterThanOrEqual(field.x);expect(overlay.y).toBeGreaterThanOrEqual(field.y);expect(overlay.width).toBeLessThanOrEqual(field.width);expect(overlay.height).toBeLessThanOrEqual(field.height);expect(overlay.x).toBeGreaterThan(video.x+video.width);
 await page.screenshot({path:info.outputPath('liv-desktop-pause.png'),fullPage:true});await page.locator('[data-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
});
