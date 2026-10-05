/* global window,localStorage,performance */
import {test,expect} from '@playwright/test';
import {fakeApi} from './youtube-helpers.js';
import {PROGRESS_KEY} from '../../src/arcade-room/progress.js';
test('six music taps save a per-song phase for new charts without changing other songs',async({page})=>{
 await fakeApi(page);await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="rhythm"].start').click();await page.locator('[data-song-preview]').click();await expect(page.locator('#song-preview-status')).toContainText('재생 중');
 for(let i=0;i<6;i++){await page.evaluate(time=>{const p=window.ytPlayers.at(-1);p.position=time;p.anchor=performance.now();},.12+(i+4)*60/112);await page.locator('[data-beat-tap]').click();}
 await expect(page.locator('#beat-status')).toContainText('120ms 저장');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('rescene.rhythm.beats'))['love-attack'])).toBe(.12);
 await page.locator('[data-song="pinball"]').click();await expect(page.locator('#beat-status')).toContainText('0ms');await page.locator('[data-song="love-attack"]').click();await expect(page.locator('#beat-status')).toContainText('120ms');await page.locator('[data-song-start]').click();await expect(page.locator('#music-status')).toContainText('재생 중');await page.clock.runFor(200);await page.locator('[data-pause]').click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.rhythm.snapshot,PROGRESS_KEY);expect(saved.beatShift).toBe(.12);expect(saved.notes[0].at).toBeCloseTo(.12+4*60/112,8);
 await page.reload();await page.locator('[data-start="rhythm"].start').click();await expect(page.locator('#beat-status')).toContainText('120ms');await page.locator('[data-beat-reset]').click();await expect(page.locator('#beat-status')).toContainText('0ms');await page.locator('[data-song-resume]').click();const restored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.rhythm.snapshot,PROGRESS_KEY);expect(restored.beatShift).toBe(.12);
});
