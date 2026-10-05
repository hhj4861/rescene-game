import {fakeApi} from './youtube-helpers.js';
/* global window, document, localStorage, Event */
import {test,expect} from '@playwright/test';
import {PROGRESS_KEY} from '../../src/arcade-room/progress.js';
const ids=['love-attack','pinball','heart-drop','yoyo','new-world'];
async function open(page){await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="rhythm"].start').click();}
async function begin(page){await page.locator('[data-song-start]').click();await expect(page.locator('#music-status')).toContainText('재생 중');await page.clock.runFor(50);}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.rhythm.snapshot,PROGRESS_KEY);
test('five official choices create one visible player and preserve keyboard song selection',async({page},info)=>{
 await fakeApi(page);await open(page);await expect(page.getByRole('group',{name:'리센느 공식 곡 선택'}).locator('button')).toHaveCount(5);
 for(const id of ids){await page.locator(`[data-song="${id}"]`).click();await page.locator('[data-song-preview]').click();await expect(page.locator('#song-preview-status')).toContainText('재생 중');const box=await page.locator('#pump-video iframe').boundingBox();expect(box.width).toBeGreaterThanOrEqual(200);expect(box.height).toBeGreaterThanOrEqual(200);expect(await page.evaluate(()=>window.ytPlayers.slice(0,-1).every(p=>p.destroyed))).toBe(true);}
 await page.locator('[data-song="love-attack"]').click();await page.locator('[data-song-level="3"]').click();await begin(page);await expect(page.locator('.music-credit')).toContainText('LOVE ATTACK');await expect(page.locator('.stage-goal b')).toHaveText('STAGE 3');await page.screenshot({path:info.outputPath('official-pump.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('media clock follows actual playback and buffering or native pause keep the score clock frozen',async({page})=>{
 await fakeApi(page);await open(page);await begin(page);await page.clock.runFor(1050);await page.evaluate(()=>window.ytPlayers.at(-1).state(3));await page.clock.runFor(5000);await expect(page.locator('#lives')).toHaveCount(0);await expect(page.locator('#time')).toHaveText('59초');
 await page.evaluate(()=>window.ytPlayers.at(-1).state(1));await page.clock.runFor(1043);await page.keyboard.press('z');await expect(page.locator('#goal')).toHaveText('성공 1 · MISS 0');await page.evaluate(()=>window.ytPlayers.at(-1).state(2));await page.clock.runFor(3000);await expect(page.locator('#lives')).toHaveCount(0);
 await page.locator('[data-pause]').click();const before=await saved(page);await page.reload();await page.locator('[data-start="rhythm"].start').click();await page.locator('[data-song-resume]').click();await page.locator('[data-resume]').click();await expect(page.locator('#music-status')).toContainText('재생 중');expect(await page.evaluate(()=>window.ytPlayers.at(-1).loaded.startSeconds)).toBeCloseTo(before.elapsed,2);expect((await saved(page)).hits).toBe(1);
});
test('seek jumps pause safely and mute, resume and leaving control the official player',async({page})=>{
 await fakeApi(page);await open(page);await begin(page);await page.clock.runFor(500);await page.locator('[data-music]').click();expect(await page.evaluate(()=>window.ytPlayers.at(-1).muted)).toBe(true);await page.locator('[data-music]').click();expect(await page.evaluate(()=>window.ytPlayers.at(-1).muted)).toBe(false);
 await page.evaluate(()=>window.ytPlayers.at(-1).seekTo(30));await page.clock.runFor(50);await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await expect(page.locator('#lives')).toHaveCount(0);await page.locator('[data-resume]').click();await page.clock.runFor(50);expect(await page.evaluate(()=>window.ytPlayers.at(-1).getCurrentTime())).toBeLessThan(1);await page.locator('[data-pause]').click();await page.locator('[data-leave]').click();expect(await page.evaluate(()=>window.ytPlayers.every(p=>p.destroyed))).toBe(true);
});
test('autoplay blocking waits for a user play without starting the game clock',async({page})=>{
 await fakeApi(page,true);await open(page);await page.locator('[data-song-start]').click();await expect(page.locator('#music-status')).toContainText('▶');await page.clock.runFor(20000);await expect(page.locator('#time')).toHaveText('60초');await expect(page.locator('#lives')).toHaveCount(0);await page.evaluate(()=>window.ytPlayers.at(-1).playVideo());await page.clock.runFor(500);await expect(page.locator('#music-status')).toContainText('재생 중');
});
test('API failure can recover without discarding the selected official song or score',async({page})=>{
 await page.route('https://www.youtube.com/iframe_api',r=>r.abort());await open(page);await page.locator('[data-song="heart-drop"]').click();await page.locator('[data-song-start]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await expect(page.locator('#lives')).toHaveCount(0);await page.unroute('https://www.youtube.com/iframe_api');await fakeApi(page);await page.locator('[data-retry-music]').click();await expect(page.locator('#music-status')).toContainText('재생 중 · Heart Drop');
});

test('focusing native video controls keeps the round active, but leaving the tab pauses it',async({page})=>{
 await fakeApi(page);await open(page);await begin(page);await page.locator('#pump-video iframe').click();await page.clock.runFor(100);await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.locator('#game').focus();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(50);await expect(page.locator('#app')).toHaveAttribute('data-state','paused');expect(await page.evaluate(()=>window.ytPlayers.at(-1).status)).toBe(2);
});

test('an official song reaches the result even if every note is missed',async({page})=>{
 await fakeApi(page);await open(page);await begin(page);await page.clock.runFor(15000);await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.locator('[data-pause]').click();expect((await saved(page)).misses).toBeGreaterThan(3);await page.locator('[data-resume]').click();await page.clock.runFor(45100);await expect(page.locator('#result-title')).toHaveText('무대 완주!');await expect(page.locator('.result-paper h2')).toHaveText('0점');await expect(page.locator('.pump-result-summary')).toContainText('노트 적중률 0%');expect(await page.evaluate(()=>window.ytPlayers.every(p=>p.destroyed))).toBe(true);await page.locator('.result-paper [data-pump-picker]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','songs');
});

// A blocked, already-ready player must be reused so a mobile tap can authorize it.
test('retrying blocked playback keeps the ready iframe and starts the score clock',async({page})=>{
 await fakeApi(page,true);await open(page);await page.locator('[data-song-start]').click();await expect(page.locator('#music-status')).toContainText('▶');await page.clock.runFor(6000);
 await page.locator('[data-retry-music]').click();await expect(page.locator('#music-status')).toContainText('재생 중');expect(await page.evaluate(()=>window.ytPlayers.length)).toBe(1);await page.clock.runFor(1200);await expect(page.locator('#time')).toHaveText('59초');
});
test('blocked playback has an adjacent touch start and preserves progress on resume',async({page},info)=>{
 await fakeApi(page,true);await open(page);await page.locator('[data-song-start]').click();const start=page.locator('[data-video-play]');await expect(start).toBeVisible();await expect(start).toBeEnabled();await page.clock.runFor(5000);await expect(page.locator('#time')).toHaveText('60초');
 await page.screenshot({path:info.outputPath('pump-tap-to-start.png'),fullPage:true});
 if(info.project.name==='desktop-chromium')await start.click();else await start.tap();await expect(page.locator('#music-status')).toContainText('재생 중');await expect(start).toBeHidden();await page.clock.runFor(1500);await expect(page.locator('#time')).toHaveText('59초');await page.locator('[data-pause]').click();const before=await saved(page);await page.locator('[data-resume]').click();await page.clock.runFor(500);await page.locator('[data-pause]').click();expect((await saved(page)).elapsed).toBeGreaterThan(before.elapsed);expect(await page.evaluate(()=>window.ytPlayers.length)).toBe(1);
});
