/* global localStorage, document */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,s){
 const p=emptyProgress();p.games[s.kind]={...p.games[s.kind],stage:s.stage,highest:s.stage,snapshot:snapshotRound(s)};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator(`[data-start="${s.kind}"].start`).click();await page.locator('[data-resume]').click();
}
test('Woni lane stamps identify missing treats and survive pause and reload',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});const s=createGame('drive',{seed:7});s.spawn=10;s.treatLanes=2;s.objects=[{id:0,lane:0,y:420,kind:'treat'}];await open(page,s);
 await expect(page.locator('#interaction-hint')).toHaveText('왼쪽·오른쪽 길의 간식을 모아요.');await expect(page.locator('[data-lane-stamp="1"]')).toHaveAttribute('data-collected','true');
 await page.locator('.field-controls [data-act="0"]').click();await page.clock.runFor(300);await expect(page.locator('[data-lane-stamp="0"]')).toHaveText('왼쪽 ✓');await expect(page.locator('#interaction-hint')).toHaveText('오른쪽 길의 간식을 모아요.');
 await page.locator('[data-pause]').click();await page.reload();await page.locator('[data-start="drive"].start').click();await page.locator('[data-resume]').click();await expect(page.locator('#interaction-hint')).toHaveText('오른쪽 길의 간식을 모아요.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);await page.screenshot({path:info.outputPath('woni-stamps-320.png'),fullPage:true});
});
test('Zena selection and occupied neighbors stay clear after zooming in and back out',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});const s=createGame('photo',{stage:11,seed:7});s.board[0]=2;s.board[1]=0;await open(page,s);const cells=page.locator('.field-controls button');
 await expect(cells.nth(0)).toHaveAttribute('aria-label','1행 1열 도넛');await cells.nth(0).click();await expect(page.locator('#interaction-hint')).toContainText('1행 1열 도넛 선택');await expect(cells.nth(8)).toHaveAttribute('data-swap-target','true');await expect(cells.nth(1)).toHaveAttribute('data-swap-target','false');await expect(page.locator('[data-swap-target="true"]')).toHaveCount(1);
 await page.locator('[data-bread-zoom]').click();await expect(page.locator('#interaction-hint')).toContainText('밀어서 이동');await expect(cells.nth(0)).toHaveCSS('outline-style','solid');expect((await cells.nth(0).boundingBox()).width).toBeGreaterThanOrEqual(48);
 await page.locator('[data-bread-zoom]').click();await expect(cells.nth(0)).toHaveCSS('outline-style','solid');await expect(cells.nth(8)).toHaveCSS('outline-style','dashed');await expect(page.locator('#interaction-hint')).toContainText('1행 1열 도넛 선택');
 await page.screenshot({path:info.outputPath('zena-selected-neighbors-320.png'),fullPage:true});await cells.nth(8).focus();await page.keyboard.press('Enter');await page.clock.runFor(700);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);await page.screenshot({path:info.outputPath('zena-selection-320.png'),fullPage:true});
});
test('Zena matching clears the previous selection and rolling pin has its own instruction',async({page})=>{
 const s=createGame('photo',{seed:7});s.board=[1,1,2,3,4,5,1,2,1,4,5,3,2,3,4,5,3,1,3,4,5,2,1,2,4,5,2,1,2,3,5,2,3,4,3,4];await open(page,s);const cells=page.locator('.field-controls button');
 await cells.nth(7).click();await expect(page.locator('[data-swap-target="true"]')).toHaveCount(4);await cells.nth(8).click();await page.clock.runFor(700);await expect(page.locator('[data-swap-target="true"]')).toHaveCount(0);await expect(page.locator('#interaction-hint')).toHaveText('빵 하나를 고른 뒤 이웃한 빵을 눌러요.');
 await page.locator('.item-button').click();await expect(page.locator('#interaction-hint')).toHaveText('밀대로 지울 가로줄을 골라요.');await page.locator('.item-button').click();await expect(page.locator('#interaction-hint')).toHaveText('빵 하나를 고른 뒤 이웃한 빵을 눌러요.');
});

test('Zena isolated tiles explain the next action even while zoomed',async({page})=>{
 const s=createGame('photo',{stage:11,seed:7});s.board[1]=0;s.board[8]=0;await open(page,s);await page.locator('.field-controls button').nth(0).click();await expect(page.locator('#interaction-hint')).toContainText('이 빵은 이웃이 없어요.');await expect(page.locator('[data-swap-target="true"]')).toHaveCount(0);await page.locator('[data-bread-zoom]').click();await expect(page.locator('#interaction-hint')).toContainText('이 빵은 이웃이 없어요.');await page.locator('.item-button').click();await expect(page.locator('#interaction-hint')).toHaveText('밀대로 지울 가로줄을 골라요.');
});
