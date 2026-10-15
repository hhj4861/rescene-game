/* global localStorage, window */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,state){
 if(state){const p=emptyProgress();p.games.blocks={...p.games.blocks,stage:state.stage,highest:state.stage,snapshot:snapshotRound(state)};await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});}
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="blocks"].start').click();if(state)await page.locator('[data-resume]').click();
}
test('May defaults to survival, auto-attacks, moves in four directions and retains the classic backup',async({page},info)=>{
 const s=createGame('blocks',{survival:true,seed:7});s.spawn=10;s.enemies=[{id:0,x:240,y:300,kind:'blob',hp:1,flash:0}];await open(page,s);await expect(page.locator('#app')).toHaveAttribute('data-may-mode','survival');await page.clock.runFor(300);await expect(page.locator('#score')).toHaveText('100');await page.keyboard.down('ArrowUp');await page.clock.runFor(300);await page.keyboard.up('ArrowUp');await page.locator('[data-act="dash"]').click();await page.clock.runFor(150);await page.screenshot({path:info.outputPath('may-survival.png'),fullPage:true});await page.locator('[data-pause]').click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.blocks.snapshot,PROGRESS_KEY);expect(saved.player.y).toBeLessThan(300);expect(saved.dashCooldown).toBeGreaterThan(3);await page.reload();await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-may-mode','survival');await page.locator('#overlay [data-leave]').click();await page.locator('button[data-pack="may-bubbles"]').click();await page.locator('[data-start="blocks"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-may-mode','classic');await expect(page.locator('[data-act="bubble"]')).toBeVisible();
});
test('growth selection pauses the clock, resumes safely and produces a visible weapon combination',async({page},info)=>{
 const s=createGame('blocks',{survival:true,seed:7});s.spawn=10;s.upgrades.star=2;s.upgrades.orbit=2;s.enemies=[{id:0,x:240,y:180,kind:'tank',hp:20,flash:0}];s.items=Array.from({length:5},()=>({x:240,y:360,kind:'xp',ttl:45}));await open(page,s);await page.clock.runFor(100);await expect(page.locator('#app')).toHaveAttribute('data-state','upgrading');const time=await page.locator('#time').textContent();await page.clock.runFor(3000);await expect(page.locator('#time')).toHaveText(time);await page.screenshot({path:info.outputPath('may-growth.png'),fullPage:true});await page.locator('[data-upgrade="star"]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await expect(page.locator('#app')).toHaveAttribute('data-may-combo','comet');await expect(page.locator('#powerup-status')).toContainText('혜성탄');await page.clock.runFor(700);await page.screenshot({path:info.outputPath('may-comet.png'),fullPage:true});
});
test('defeating the survival boss clears the stage and the next stage starts survival again',async({page})=>{
 const s=createGame('blocks',{survival:true,seed:7});s.bossSpawned=true;s.spawn=10;s.enemies=[{id:0,x:240,y:300,kind:'boss',hp:1,flash:0}];await open(page,s);await page.clock.runFor(300);await expect(page.locator('#result-title')).toHaveText('스테이지 1 클리어!');await page.locator('.result-paper [data-start="blocks"]').click();await expect(page.locator('#app')).toHaveAttribute('data-may-mode','survival');await expect(page.locator('.stage-goal')).toContainText('STAGE 2');
});

test('May item song continues during growth selection and still pauses on an explicit break',async({page})=>{
 await page.addInitScript(()=>{
  const Audio=window.Audio;window.itemSongs=[];
  window.Audio=class extends Audio{constructor(src){super(src);if(src.includes('may-song'))window.itemSongs.push(this);}};
 });
 const s=createGame('blocks',{survival:true,seed:7});s.spawn=15;s.enemies=[];
 s.items=[{x:240,y:360,kind:'honey',ttl:45},...Array.from({length:5},()=>({x:240,y:360,kind:'xp',ttl:45}))];
 await open(page,s);await page.clock.runFor(150);
 await expect(page.locator('#app')).toHaveAttribute('data-state','upgrading');
 await expect.poll(()=>page.evaluate(()=>window.itemSongs[0]?.paused)).toBe(false);
 const time=await page.locator('#time').textContent(),position=await page.evaluate(()=>window.itemSongs[0].currentTime);
 await expect.poll(()=>page.evaluate(()=>window.itemSongs[0].currentTime)).toBeGreaterThan(position+.2);
 await page.clock.runFor(3000);await expect(page.locator('#time')).toHaveText(time);
 await page.locator('[data-upgrade]').first().click();
 await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
 expect(await page.evaluate(()=>window.itemSongs.length)).toBe(1);
 expect(await page.evaluate(()=>window.itemSongs[0].currentTime)).toBeGreaterThan(position);
 await page.locator('[data-pause]').click();expect(await page.evaluate(()=>window.itemSongs[0].paused)).toBe(true);
 await page.locator('[data-resume]').click();await page.clock.runFor(150);
 await expect.poll(()=>page.evaluate(()=>window.itemSongs[0].paused)).toBe(false);
 await page.evaluate(()=>window.dispatchEvent(new window.Event('blur')));
 await expect(page.locator('#app')).toHaveAttribute('data-state','paused');
 expect(await page.evaluate(()=>window.itemSongs[0].paused)).toBe(true);
});
