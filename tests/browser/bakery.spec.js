/* global localStorage */
import {test,expect} from '@playwright/test';
import {createGame,availableSwap} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,overrides={}){const s=Object.assign(createGame('photo',{seed:7}),overrides),p=emptyProgress();p.games.photo.snapshot=snapshotRound(s);await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(p)});await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.locator('[data-start="photo"].start').click();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.getByRole('button',{name:'계속하기 ▶'}).click();return s;}
async function center(page,i){const b=await page.locator('.field-controls button').nth(i).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};}
test('drag swaps once, pops, falls and can save/reload the settled board',async({page},info)=>{
 const s=await open(page),pair=availableSwap(s.board),a=await center(page,pair[0]),b=await center(page,pair[1]);
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up();
 await expect(page.locator('#extra')).toHaveText('17');await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','swap');await page.clock.runFor(200);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','pop');await page.clock.runFor(240);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','fall');await page.screenshot({path:info.outputPath('bread-falling.png')});
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.photo.snapshot,PROGRESS_KEY);expect(saved.flash).toBe(0);expect(saved.moves).toBe(17);
 // The fixture initializer is removed by creating a fresh page in the same context.
 const resumed=await page.context().newPage();await resumed.goto('./');await resumed.locator('[data-start="photo"].start').click();await expect(resumed.locator('#app')).toHaveAttribute('data-state','paused');await expect(resumed.locator('#extra')).toHaveText('17');await resumed.close();
});
test('cancelled and outward edge drags never spend a move',async({page})=>{
 await open(page);const b=page.locator('.field-controls button').first(),a=await center(page,0);await page.mouse.move(a.x,a.y);await page.mouse.down();await b.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.move(a.x+50,a.y);await page.mouse.up();await expect(page.locator('#extra')).toHaveText('18');
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x-60,a.y);await page.mouse.up();await expect(page.locator('#extra')).toHaveText('18');await expect(page.locator('#score')).toHaveText('0');
});
test('native touch swipe exchanges adjacent bread',async({page,context,browserName,isMobile})=>{
 test.skip(!isMobile||browserName!=='chromium','CDP touch injection is Chromium-only');const s=await open(page),pair=availableSwap(s.board),a=await center(page,pair[0]),b=await center(page,pair[1]),session=await context.newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('#extra')).toHaveText('17');await expect(page.locator('#score')).not.toHaveText('0');
});

test('a winning last-second swap finishes falling before showing clear',async({page})=>{
 const s=await open(page,{collected:17,elapsed:59.95,remaining:.05}),pair=availableSwap(s.board);
 for(const i of pair)await page.locator('.field-controls button').nth(i).click();
 await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.clock.runFor(450);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','fall');await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
 await page.clock.runFor(2500);await expect(page.locator('#app')).toHaveAttribute('data-cleared','true');await expect(page.locator('.result-lives')).toContainText('♥♥♥');
});
