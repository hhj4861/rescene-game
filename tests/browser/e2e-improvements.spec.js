/* global localStorage, document */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
import {fakeApi} from './youtube-helpers.js';
async function open(page,kind,stage=1){
 await fakeApi(page);const s=createGame(kind,{stage,seed:7,survival:true,songId:'heart-drop'});if(kind==='blocks')s.spawn=10;
 const p=emptyProgress();p.games[kind]={...p.games[kind],stage,highest:stage,snapshot:snapshotRound(s)};
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
 await page.locator(`[data-start="${kind}"].start`).click();if(kind==='rhythm')await page.locator('[data-song-resume]').click();await page.locator('[data-resume]').click();
}
async function saved(page,kind){return page.evaluate(({key,kind})=>JSON.parse(localStorage.getItem(key)).games[kind].snapshot,{key:PROGRESS_KEY,kind});}
for(const keys of [['ArrowLeft','ArrowUp'],['KeyA','KeyW']])test(`May resumes held ${keys[0]} after releasing ${keys[1]} and clears holds on pause`,async({page})=>{
 await open(page,'blocks');await page.keyboard.down(keys[0]);await page.clock.runFor(400);await page.keyboard.down(keys[1]);await page.clock.runFor(400);await page.keyboard.up(keys[1]);await page.clock.runFor(400);await page.locator('[data-pause]').click();const before=await saved(page,'blocks');expect(before.player.x).toBeLessThan(130);expect(before.player.y).toBeLessThan(310);
 await page.locator('[data-resume]').click();await page.clock.runFor(400);await page.keyboard.up(keys[0]);await page.locator('[data-pause]').click();const after=await saved(page,'blocks');expect(after.player.x).toBe(before.player.x);expect(after.player.y).toBe(before.player.y);
});
test('May resumes a held pointer when a keyboard direction ends',async({page})=>{
 await open(page,'blocks');const left=await page.locator('[data-act=left]').boundingBox();await page.mouse.move(left.x+left.width/2,left.y+left.height/2);await page.mouse.down();await page.clock.runFor(400);await page.keyboard.down('ArrowUp');await page.clock.runFor(400);await page.keyboard.up('ArrowUp');await page.clock.runFor(400);await page.mouse.up();await page.locator('[data-pause]').click();expect((await saved(page,'blocks')).player.x).toBeLessThan(130);
});
for(const viewport of [{width:844,height:390},{width:1280,height:720}])for(const kind of ['rhythm','drive','blocks','photo','catch'])test(`${kind} field and controls fit ${viewport.width}x${viewport.height}`,async({page},info)=>{
 await page.setViewportSize(viewport);await open(page,kind,kind==='photo'?11:1);
 for(const selector of ['.playfield','.game-controls']){const b=await page.locator(selector).boundingBox();expect(b.y).toBeGreaterThanOrEqual(0);expect(b.y+b.height).toBeLessThanOrEqual(viewport.height);}
 for(const button of await page.locator('.game-controls button').all()){const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
 if(['catch','rhythm'].includes(kind)){const video=await page.locator('.pump-video-card').boundingBox(),field=await page.locator('.playfield').boundingBox();expect(video.x+video.width).toBeLessThanOrEqual(field.x);}
 await page.screenshot({path:info.outputPath(`${kind}-${viewport.width}.png`)});
 await page.locator('[data-pause]').click();await expect(page.locator('#overlay')).toHaveCSS('position','fixed');const dialog=await page.locator('.pause-paper').boundingBox();expect(dialog.y).toBeGreaterThanOrEqual(0);expect(dialog.y+dialog.height).toBeLessThanOrEqual(viewport.height);await page.locator('[data-resume]').click();
});
for(const width of [768,844,1024])test(`Woni omits verbose guides at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1180});await open(page,'drive');await expect(page.locator('.short-guide,.key-guide')).toHaveCount(0);await expect(page.locator('#powerup-status')).toBeEmpty();await expect(page.locator('[data-lane-stamp]')).toHaveCount(3);
});
test('small Zena has reachable tools above the board and preserves large zoom targets',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await open(page,'photo',11);const field=await page.locator('.playfield').boundingBox(),tools=await page.locator('.game-controls').boundingBox();expect(tools.y+tools.height).toBeLessThanOrEqual(field.y);for(const button of await page.locator('.game-controls button').all()){const box=await button.boundingBox();expect(field.y-box.y-box.height).toBeGreaterThanOrEqual(8);}expect(field.y+field.height).toBeLessThanOrEqual(568);
 await page.locator('[data-bread-zoom]').click();await expect(page.locator('[data-bread-zoom]')).toHaveAttribute('aria-pressed','true');const tile=await page.locator('.field-controls button').first().boundingBox();expect(tile.width).toBeGreaterThanOrEqual(48);
 await page.locator('[data-act=rolling-pin]').click();await expect(page.locator('#interaction-hint')).toContainText('밀대로 지울');await page.screenshot({path:info.outputPath('zena-tools-320.png')});
});

test('Pump intermediate stage remains selected when changing songs and starts the matching chart',async({page})=>{
 await fakeApi(page);await page.goto('./');await page.locator('[data-start="rhythm"].start').click();await page.locator('[data-song-level="2"]').click();await expect(page.locator('[data-song-level="2"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-song="pinball"]').click();await expect(page.locator('[data-song-level="2"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-song-start]').click();await expect(page.locator('.stage-goal')).toContainText('STAGE 2');await page.locator('[data-pause]').click();const s=await saved(page,'rhythm');expect(s.chartVersion).toBe(2);expect(s.notes.length).toBe(createGame('rhythm',{stage:2,songId:'pinball'}).notes.length);
});
