/* global localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
test('Liv strengthened boss and escorts persist through pause and reload, with working lane controls',async({page,isMobile},info)=>{
 const s=createGame('catch',{stage:5,seed:7});s.defeated=13;s.gatesTaken=2;s.spawn=0;s.gates=[];s.squad=12;s.volley=2;
 const p=emptyProgress();p.games.catch={stage:5,highest:5,hearts:3,snapshot:snapshotRound(s)};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.locator('[data-start="catch"].start').click();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-resume]').click();
 await page.clock.runFor(1000);await expect(page.locator('#powerup-status')).toContainText('보스를 물리쳐요');await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
 const left=page.locator('.field-controls button').nth(0);if(isMobile)await left.tap();else await page.keyboard.press('ArrowLeft');await page.clock.runFor(250);await expect(left).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:info.outputPath('liv-stage-5-boss.png'),fullPage:true});
 await page.locator('[data-pause]').click();const read=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.catch.snapshot,PROGRESS_KEY);const before=await read(),boss=before.enemies.find(e=>e.boss);expect(boss.hp).toBeGreaterThan(100);expect(before.enemies.some(e=>!e.boss&&e.lane!==1)).toBe(true);expect(before.hearts).toBe(3);
 await page.reload();await page.locator('[data-start="catch"].start').click();await expect(page.locator('.stage-goal b')).toContainText('5');await expect(page.locator('#app')).toHaveAttribute('data-state','paused');const after=await read();expect(after.enemies.find(e=>e.boss).hp).toBe(boss.hp);expect(after.gatesTaken).toBe(2);expect(after.hearts).toBe(3);expect(after.lane).toBe(0);await page.locator('[data-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.clock.runFor(100);await page.locator('[data-pause]').click();expect((await read()).enemies.find(e=>e.boss).y).toBeGreaterThan(boss.y);
});
