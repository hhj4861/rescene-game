/* global localStorage, document */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,s,classic=false){
 const p=emptyProgress();p.games[s.kind].snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto(classic?'./?may=classic':'./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator(`[data-start="${s.kind}"].start`).click();await page.locator('[data-resume]').click();
}
for(const kind of ['drive','blocks'])for(const viewport of [{width:320,height:568},{width:390,height:844}])test(`${kind} mobile ${viewport.width} shows the whole field and working controls`,async({page},info)=>{
 await page.setViewportSize(viewport);const s=createGame(kind,{seed:7,survival:true});s.spawn=10;await open(page,s);
 const field=await page.locator('.playfield').boundingBox(),controls=await page.locator('.game-controls').boundingBox();expect(field.y).toBeGreaterThanOrEqual(0);expect(field.y+field.height).toBeLessThanOrEqual(viewport.height);expect(controls.y+controls.height).toBeLessThanOrEqual(viewport.height);
 for(const button of await page.locator('.game-controls button').all()){const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);await page.screenshot({path:info.outputPath(`${kind}-${viewport.width}.png`),fullPage:false});
 const right=await page.locator('[data-act="right"]').boundingBox();await page.mouse.move(right.x+right.width/2,right.y+right.height/2);await page.mouse.down();await page.clock.runFor(150);await page.mouse.up();await page.locator('[data-pause]').click();await expect(page.locator('#overlay')).toHaveCSS('position','fixed');const time=await page.locator('#time').textContent();await page.clock.runFor(3000);await expect(page.locator('#time')).toHaveText(time);
 const saved=await page.evaluate(({key,kind})=>JSON.parse(localStorage.getItem(key)).games[kind].snapshot,{key:PROGRESS_KEY,kind});expect(kind==='drive'?saved.lane:saved.player.x).toBeGreaterThan(kind==='drive'?1:240);
 await page.locator('[data-resume]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.setViewportSize({width:1280,height:900});expect((await page.locator('.playfield').boundingBox()).width).toBeGreaterThan(300);await expect(page.locator('.host-name')).toBeVisible();
});
test('May growth choices fit a small screen and resume the game after picking',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});const s=createGame('blocks',{seed:7,survival:true});s.level=2;s.upgradeChoices=['star','orbit','heal'];await open(page,s);await page.clock.runFor(50);await expect(page.locator('#app')).toHaveAttribute('data-state','upgrading');await expect(page.locator('#overlay')).toHaveCSS('position','fixed');
 for(const button of await page.locator('[data-upgrade]').all()){const box=await button.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(568);}
 await page.screenshot({path:info.outputPath('may-upgrade-320.png'),fullPage:false});await page.locator('[data-upgrade="star"]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await expect(page.locator('#powerup-status')).toContainText('별빛 2');
});
