/* global localStorage, document, window */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {PRANK_MEMBERS,PRANK_NAMES} from '../../src/arcade-room/walk-pranks.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
for(const member of PRANK_MEMBERS)test(`Woni sees ${member}, its warning, controls and saved remaining effect`,async({page},info)=>{
 const s=createGame('drive',{seed:7});s.spawn=15;s.prankIndex=PRANK_MEMBERS.indexOf(member)+1;s.prank={member,warning:1.5,time:4,lane:0};const p=emptyProgress();p.games.drive.snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="drive"].start').click();await page.locator('[data-resume]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-prank-phase','warning');await expect(page.locator('#powerup-status')).toContainText(PRANK_NAMES[member]+' 등장!');await page.clock.runFor(1600);await expect(page.locator('#app')).toHaveAttribute('data-prank-phase','active');
 if(member==='minami'){await page.locator('[data-act="left"]').click();await expect(page.locator('.field-controls [data-act="2"]')).toHaveAttribute('aria-pressed','true');}
 await page.screenshot({path:info.outputPath(`woni-${member}-prank.png`),fullPage:true});await page.locator('[data-pause]').click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.drive.snapshot,PROGRESS_KEY);expect(saved.prank.time).toBeGreaterThan(3);expect(saved.prankIndex).toBe(s.prankIndex);
 await page.reload();await page.locator('[data-start="drive"].start').click();await page.locator('[data-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-prank',member);await page.clock.runFor(4100);await expect(page.locator('#app')).toHaveAttribute('data-prank','');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
