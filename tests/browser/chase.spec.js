/* global localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,fixture){if(fixture){const p=emptyProgress();p.games.drive.snapshot=snapshotRound(fixture);await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});}
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await expect(page.locator('[data-start="drive"].start')).toBeEnabled();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="drive"].start').click();if(fixture)await page.getByRole('button',{name:'계속하기 ▶'}).click();}
const active=page=>page.locator('.field-controls button[data-active="true"]');
test('running targets carry their touch areas, combo opens fever, pause and reload preserve it',async({page,isMobile},info)=>{
 await open(page);await page.clock.runFor(700);const runner=active(page).first(),first=await runner.boundingBox();await page.clock.runFor(600);const moved=await runner.boundingBox();expect(Math.abs(moved.x-first.x)).toBeGreaterThan(10);
 for(let hit=1;hit<=5;hit++){if(await active(page).count()===0)await page.clock.runFor(900);const b=active(page).first();if(isMobile)await b.tap();else await b.click();await expect(page.locator('#extra')).toHaveText(String(hit));}
 await expect(page.locator('#app')).toHaveAttribute('data-fever','true');await page.clock.runFor(600);await page.screenshot({path:info.outputPath('woni-fever.png')});
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.drive.snapshot,PROGRESS_KEY);expect(before.fever).toBeGreaterThan(0);await page.clock.runFor(5000);await page.reload();await page.locator('[data-start="drive"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.drive.snapshot,PROGRESS_KEY);expect(after.fever).toBe(before.fever);expect(after.holes).toEqual(before.holes);await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.clock.runFor(250);await expect(page.locator('#app')).toHaveAttribute('data-fever','true');
});
test('a hit lands only once and its old position is no longer clickable',async({page})=>{
 await open(page);await page.clock.runFor(600);const target=active(page).first(),label=await target.getAttribute('data-act'),box=await target.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);const score=await page.locator('#score').innerText();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(page.locator('#score')).toHaveText(score);await expect(page.locator(`.field-controls button[data-act="${label}"]`)).toBeHidden();await expect(page.locator('#extra')).toHaveText('1');
});
test('fever prevents an escape penalty, then normal play loses a life',async({page})=>{
 const s=createGame('drive',{seed:7});s.fever=.5;s.spawn=10;s.holes[0]={ttl:.1,total:4,gold:false,flash:0};s.holes[3]={ttl:.8,total:4,gold:false,flash:0};await open(page,s);await page.clock.runFor(200);await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');await page.clock.runFor(700);await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 2개');await expect(page.locator('#app')).toHaveAttribute('data-fever','false');
});
