/* global window, document, localStorage, URL */
import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {GAME_PACKS,PACKS_KEY} from '../../src/arcade-room/game-packs.js';
import {fakeApi} from './youtube-helpers.js';
const bridge=readFileSync(new URL('../../apps/mobile/assets/host_bridge.js',import.meta.url),'utf8');
for(const pack of GAME_PACKS)test(`${pack.id}: native background and back preserve the web game's save`,async({page})=>{
 await fakeApi(page);await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
 await page.evaluate(bridge);await page.evaluate(bridge);expect(await page.evaluate(()=>window.resceneNativeApp.back())).toBe(false);
 await page.locator(`[data-slide="${pack.kind}"]`).click();const picker=page.locator(`[data-pack="${pack.id}"]`);if(await picker.count())await picker.click();
 await page.locator(`[data-start="${pack.kind}"].start`).click();if(pack.kind==='rhythm')await page.locator('[data-song-start]').click();await page.clock.runFor(300);await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
 if(pack.kind==='rhythm'){
  const toggle=page.locator('[data-video-toggle]');if(await toggle.isVisible())await toggle.click();
  await page.locator('#pump-video iframe').evaluate(el=>el.focus());expect(await page.evaluate(()=>document.activeElement?.tagName)).toBe('IFRAME');
 }
 await page.evaluate(()=>window.resceneNativeApp.pause());await page.clock.runFor(50);await expect(page.locator('#app')).toHaveAttribute('data-state','paused');
 const time=await page.locator('#time').innerText();await page.clock.runFor(3000);await expect(page.locator('#time')).toHaveText(time);
 await page.evaluate(()=>window.resceneNativeApp.resumeMedia());await page.clock.runFor(100);await expect(page.locator('#app')).toHaveAttribute('data-state','paused');
 expect(await page.evaluate(()=>window.resceneNativeApp.back())).toBe(true);await expect(page.locator('#app')).toHaveAttribute('data-state','home');
 const saved=await page.evaluate(({key,id})=>JSON.parse(localStorage.getItem(key)).packs[id].journey.snapshot,{key:PACKS_KEY,id:pack.id});expect(saved).toBeTruthy();expect(saved.remaining).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.resceneNativeApp.back())).toBe(false);
 await page.locator(`[data-start="${pack.kind}"].start`).click();if(pack.kind==='rhythm')await page.locator('[data-song-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await expect(page.locator('#time')).toHaveText(time);
});
