/* global localStorage, document, Storage */
import {test,expect} from '@playwright/test';
import {createGame,RECORD_KEY} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY,stageGoal} from '../../src/arcade-room/progress.js';
import {readGamePacks,PACKS_KEY} from '../../src/arcade-room/game-packs.js';
async function open(page,url='./'){
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto(url);await expect(page.locator('[data-start="blocks"].start')).toBeEnabled();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-slide="blocks"]').click();
}
const pack=(page,id)=>page.locator(`button[data-pack="may-${id}"]`);
const library=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PACKS_KEY);
test('switches both May packs in place, plays their controls, and resumes separate saves after reload',async({page},info)=>{
 await open(page);await expect(pack(page,'survival')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-pack','may-survival');await expect(page.locator('[data-act="dash"]')).toBeVisible();
 await page.clock.runFor(500);await page.locator('[data-exit-game]').click();const survival=(await library(page)).packs['may-survival'].journey.snapshot;
 await pack(page,'bubbles').click();await expect(page.locator('#machine-blocks h2')).toHaveText('보글보글 공방');await expect(pack(page,'bubbles')).toBeFocused();await expect(page.locator('#app')).toHaveAttribute('data-state','home');
 await page.screenshot({path:info.outputPath('may-packs.png'),fullPage:true});
 await page.locator('[data-start="blocks"].start').click();await expect(page.locator('[data-act="bubble"]')).toBeVisible();await expect(page.locator('[data-act="dash"]')).toHaveCount(0);await page.locator('[data-act="bubble"]').click();await page.clock.runFor(100);await page.locator('[data-exit-game]').click();
 let saved=await library(page);expect(saved.packs['may-bubbles'].journey.snapshot.mayVersion).toBe(2);expect(saved.packs['may-bubbles'].journey.snapshot.bubbles.length).toBeGreaterThan(0);expect(saved.packs['may-survival'].journey.snapshot).toEqual(survival);
 await page.reload();await page.locator('[data-slide="blocks"]').click();await expect(pack(page,'bubbles')).toHaveAttribute('aria-pressed','true');await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await page.locator('[data-leave]').click();
 await pack(page,'survival').click();await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await expect(page.locator('[data-act="dash"]')).toBeVisible();saved=await library(page);expect(saved.packs['may-survival'].journey.snapshot.elapsed).toBe(survival.elapsed);
});
test('a clear saves only that pack’s next stage and best record; switching restores the other record',async({page})=>{
 const data=readGamePacks(),s=createGame('blocks',{stage:3,seed:7});s.popped=stageGoal('blocks',3).target-1;s.spawn=10;s.enemies=[{x:150,y:536,home:0,dir:1,trapped:4,vy:0,think:1,angry:false}];
 data.selected.blocks='may-bubbles';data.packs['may-bubbles'].journey={...data.packs['may-bubbles'].journey,stage:3,highest:3,snapshot:snapshotRound(s)};data.packs['may-survival'].record=1200;data.packs['may-survival'].journey.stage=7;data.packs['may-survival'].journey.highest=7;
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PACKS_KEY,value:JSON.stringify(data)});
 await open(page);await page.locator('[data-start="blocks"].start').click();await page.locator('[data-resume]').click();await page.locator('[data-act="bubble"]').click();await expect(page.locator('#result-title')).toHaveText('스테이지 3 클리어!');await page.locator('[data-leave]').click();
 const saved=await library(page);expect(saved.packs['may-bubbles'].record).toBeGreaterThan(0);expect(saved.packs['may-bubbles'].journey.stage).toBe(4);await pack(page,'survival').click();await expect(page.locator('#machine-blocks .journey-card')).toContainText('STAGE 7');await expect(page.locator('#machine-blocks .cabinet-bottom b')).toHaveText('1,200');
 await page.reload();await page.locator('[data-slide="blocks"]').click();await pack(page,'bubbles').click();await expect(page.locator('#machine-blocks .journey-card')).toContainText('STAGE 4');await expect(page.locator('#machine-blocks .cabinet-bottom b')).toHaveText(saved.packs['may-bubbles'].record.toLocaleString());
});
test('legacy bubble progress migrates and explicit switching overrides the old classic URL',async({page})=>{
 const p=emptyProgress(),s=createGame('blocks',{stage:5,hearts:2,seed:7});p.games.blocks={...p.games.blocks,stage:5,highest:5,hearts:2,snapshot:snapshotRound(s)};
 await page.addInitScript(({key,value,recordKey})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,value);localStorage.setItem(recordKey,JSON.stringify({blocks:900}));}},{key:PROGRESS_KEY,value:JSON.stringify(p),recordKey:RECORD_KEY});
 await open(page,'./?may=classic&source=link#arcade');await expect(page.locator('#machine-blocks .journey-card')).toContainText('STAGE 5');await pack(page,'survival').click();expect(page.url()).not.toContain('may=classic');expect(page.url()).toContain('source=link#arcade');await expect(page.locator('#machine-blocks .journey-card')).toContainText('STAGE 1');
 await page.reload();await page.locator('[data-slide="blocks"]').click();await expect(pack(page,'survival')).toHaveAttribute('aria-pressed','true');await pack(page,'bubbles').click();await expect(page.locator('#machine-blocks .journey-card')).toContainText('STAGE 5');await expect(page.locator('#machine-blocks .cabinet-bottom b')).toHaveText('900');await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 2개');
});
test('pack buttons fit 320px, remain keyboard accessible, and never launch a game on selection',async({page,isMobile})=>{
 await page.setViewportSize({width:320,height:720});await open(page);await pack(page,'bubbles').focus();await page.keyboard.press('Enter');await expect(pack(page,'bubbles')).toHaveAttribute('aria-pressed','true');await expect(pack(page,'bubbles')).toBeFocused();if(!isMobile){await page.keyboard.press('Tab');await expect(page.locator('[data-start="blocks"].start')).toBeFocused();}await expect(page.locator('#app')).toHaveAttribute('data-state','home');
 for(const id of ['survival','bubbles']){const box=await pack(page,id).boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);
 for(const kind of ['drive','photo','rhythm','catch']){await page.locator(`[data-slide="${kind}"]`).click();await expect(page.locator(`#machine-${kind} .single-pack`)).toContainText('기본 게임팩');await expect(page.locator(`[data-start="${kind}"].start`)).toBeEnabled();}
});
test('storage failure explains the limit and keeps pack progress while the tab stays open',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw Error('quota');};});await open(page);await pack(page,'bubbles').click();await expect(page.locator('footer')).toContainText('이번 탭에서만');await page.locator('[data-start="blocks"].start').click();await page.clock.runFor(100);await page.locator('[data-exit-game]').click();await pack(page,'survival').click();await pack(page,'bubbles').click();await expect(page.locator('[data-start="blocks"].start')).toContainText('이어서 하기');await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');
});
