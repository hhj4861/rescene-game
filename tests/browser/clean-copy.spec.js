/* global window, document, Storage, CanvasRenderingContext2D */
import {test,expect} from '@playwright/test';
import {GAME_PACKS} from '../../src/arcade-room/game-packs.js';
import {fakeApi} from './youtube-helpers.js';

for(const pack of GAME_PACKS)test(`${pack.id}: concise UI keeps progress, controls and pause usable`,async({page},info)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await fakeApi(page);
 await page.addInitScript(()=>{
  window.canvasText=[];const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.canvasText.push(String(text));return fill.call(this,text,...args);};
 });
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
 await page.locator(`[data-slide="${pack.kind}"]`).click();const pick=page.locator(`[data-pack="${pack.id}"]`);if(await pick.count())await pick.click();
 await page.locator(`[data-start="${pack.kind}"].start`).click();if(pack.kind==='rhythm')await page.locator('[data-song-start]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
 await expect(page.locator('.short-guide,.key-guide,.game-info-toggle,.tap-instruction')).toHaveCount(0);
 await expect(page.locator('#save-state')).toBeEmpty();await expect(page.locator('#save-state')).toBeHidden();
 const body=await page.locator('body').innerText();expect(body).not.toMatch(/자동 저장|노래 아이템은 플레이 중|획득 시 남은 시간 최소|매 스테이지 리브의 하트|이번 무대 ♪/);
 await expect(page.locator('#goal')).not.toBeEmpty();await expect(page.locator('#time')).toContainText('초');await expect(page.locator('#score')).toHaveText('0');
 await page.clock.runFor(250);await page.locator('[data-help]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await expect(page.locator('.dialog-keys')).not.toBeEmpty();
 expect((await page.locator('.pause-paper').innerText()).length).toBeLessThan(240);const before=await page.locator('#time').innerText();await page.clock.runFor(1000);await expect(page.locator('#time')).toHaveText(before);
 await page.locator('[data-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.clock.runFor(1000);await expect(page.locator('#time')).not.toHaveText(before);
 expect(await page.evaluate(()=>window.canvasText.join('\n'))).not.toMatch(/방울을 모아서 연쇄로|빈 방울 위로 착지하면|테두리 안 모든 칸을|판정선에 겹친 화살표를 직접 톡|같은 음식 두 개 · 빈 길/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:info.outputPath(`${pack.id}-clean.png`),fullPage:true});
});

test('storage failures remain visible after removing routine save notices',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('storage unavailable');};});await page.goto('./');
 await page.locator('[data-start="drive"].start').click();await expect(page.locator('#save-state')).toBeVisible();await expect(page.locator('#save-state')).toContainText('저장할 수 없어');
 await page.locator('[data-pause]').click();await expect(page.locator('.pause-paper')).toContainText('저장할 수 없어');await page.locator('[data-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
});
