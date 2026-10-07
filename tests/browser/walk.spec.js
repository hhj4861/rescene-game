/* global localStorage, window, document */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,s){
 const p=emptyProgress();p.games.drive={...p.games.drive,stage:s.stage,highest:s.stage,snapshot:snapshotRound(s)};
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);const Native=window.Audio;window.walkClips=[];window.Audio=class extends Native{constructor(src){super(src);window.walkClips.push({src,audio:this});}};},{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="drive"].start').click();await page.locator('[data-resume]').click();
}
const singing=page=>page.evaluate(()=>window.walkClips.filter(c=>c.src.includes('woni-song')).map(c=>({paused:c.audio.paused,loop:c.audio.loop})));
test('Woni and Byeol move by touch and keyboard, collect treats, and fit mobile',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const s=createGame('drive',{seed:7});s.spawn=10;s.objects=[{id:0,lane:0,y:420,kind:'treat'},{id:1,lane:2,y:200,kind:'song'},{id:2,lane:1,y:150,kind:'clock'}];await open(page,s);
 await page.locator('.field-controls [data-act="0"]').click();await page.clock.runFor(300);await expect(page.locator('#score')).toHaveText('110');await expect(page.locator('#goal')).toHaveText('1 / 12 간식');await page.keyboard.press('3');await expect(page.locator('.field-controls [data-act="2"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#game')).toHaveAttribute('aria-label',/별이랑 산책/);await expect(page.locator('#powerup-status')).toContainText('원이와 별이');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect(errors).toEqual([]);await page.screenshot({path:info.outputPath('woni-byeol-walk.png'),fullPage:true});
});
test('touch jump clears logs but puddles still cost one life',async({page})=>{
 const s=createGame('drive',{seed:7});s.spawn=10;s.objects=[{id:0,lane:1,y:440,kind:'log'},{id:1,lane:1,y:360,kind:'puddle'}];await open(page,s);await page.locator('[data-act="jump"]').click();await page.clock.runFor(200);await expect(page.locator('#score')).toHaveText('20');await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');await page.clock.runFor(500);await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 2개');
});
test('clock collection extends the actual deadline and the saved round',async({page})=>{
 const s=createGame('drive',{seed:7});s.elapsed=89.9;s.remaining=.1;s.spawn=10;s.objects=[{id:0,lane:1,y:455,kind:'clock'}];await open(page,s);await page.clock.runFor(200);await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await expect(page.locator('#time')).toContainText('10');await expect(page.locator('#powerup-status')).toContainText('누적 +10초');await page.locator('[data-pause]').click();await page.reload();await page.locator('[data-start="drive"].start').click();await expect(page.locator('#time')).toContainText('10');await expect(page.locator('#powerup-status')).toContainText('누적 +10초');await page.locator('[data-resume]').click();await page.clock.runFor(10100);await expect(page.locator('#app')).toHaveAttribute('data-state','result');
});
test('Woni song plays for 60 active seconds, pauses, survives next stage, and duplicates do not restart it',async({page})=>{
 const s=createGame('drive',{seed:7});s.spawn=10;s.hits=11;s.objects=[{id:0,lane:1,y:455,kind:'song'},{id:1,lane:1,y:435,kind:'song'},{id:2,lane:1,y:405,kind:'treat'}];await open(page,s);await page.clock.runFor(50);await expect.poll(()=>singing(page)).toEqual([{paused:false,loop:true}]);
 await page.locator('[data-pause]').click();await expect.poll(()=>singing(page)).toEqual([{paused:true,loop:true}]);await page.clock.fastForward(61000);await page.locator('[data-resume]').click();await expect.poll(()=>singing(page)).toEqual([{paused:false,loop:true}]);await page.clock.runFor(400);await expect(page.locator('#result-title')).toHaveText('스테이지 1 클리어!');expect(await singing(page)).toEqual([{paused:false,loop:true}]);
 await page.locator('.result-paper [data-start="drive"]').click();await expect(page.locator('.stage-goal')).toContainText('STAGE 2');expect(await singing(page)).toEqual([{paused:false,loop:true}]);await page.clock.fastForward(61000);expect((await singing(page))[0].paused).toBe(true); // Later gifts may legitimately start a new clip during the next stage.
});
test('consumed Woni song does not replay on reload',async({page})=>{
 const s=createGame('drive',{seed:7});s.spawn=10;s.objects=[{id:0,lane:1,y:455,kind:'song'}];await open(page,s);await page.clock.runFor(50);await expect.poll(()=>singing(page)).toEqual([{paused:false,loop:true}]);await page.locator('[data-pause]').click();await page.reload();await page.locator('[data-start="drive"].start').click();await page.locator('[data-resume]').click();await page.clock.runFor(50);expect(await singing(page)).toEqual([]);await page.locator('[data-exit-game]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','home');
});

test('leaving the game immediately stops an active Woni song',async({page})=>{
 const s=createGame('drive',{seed:7});s.spawn=10;s.objects=[{id:0,lane:1,y:455,kind:'song'}];await open(page,s);await page.clock.runFor(50);await expect.poll(()=>singing(page)).toEqual([{paused:false,loop:true}]);await page.locator('[data-exit-game]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','home');expect((await singing(page))[0].paused).toBe(true);
});
