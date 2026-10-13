/* global localStorage */
import {test,expect} from '@playwright/test';
import {createGame,availableSwap,roundDuration} from '../../src/arcade-room/model.js';
import {breadMoves} from '../../src/arcade-room/bakery-hunt.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,overrides={}){const s=Object.assign(createGame('photo',{seed:7}),overrides),p=emptyProgress();p.games.photo.snapshot=snapshotRound(s);await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(p)});await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.locator('[data-start="photo"].start').click();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.getByRole('button',{name:'계속하기 ▶'}).click();return s;}
async function center(page,i){const b=await page.locator('.field-controls button').nth(i).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2};}
test('drag swaps once, removes tiles and can save/reload the finite board',async({page},info)=>{
 const s=await open(page),pair=availableSwap(s.board),a=await center(page,pair[0]),b=await center(page,pair[1]);
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await expect(page.locator('#extra')).toHaveText(String(breadMoves(1)-1));await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','swap');await page.mouse.up();
 await expect(page.locator('#extra')).toHaveText(String(breadMoves(1)-1));await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','swap');await page.clock.runFor(200);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','pop');await page.clock.runFor(240);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','idle');await page.screenshot({path:info.outputPath('bread-removed.png')});
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.photo.snapshot,PROGRESS_KEY);expect(saved.flash).toBe(0);expect(saved.moves).toBe(breadMoves(1)-1);
 // The fixture initializer is removed by creating a fresh page in the same context.
 const resumed=await page.context().newPage();await resumed.goto('./');await resumed.locator('[data-start="photo"].start').click();await expect(resumed.locator('#app')).toHaveAttribute('data-state','paused');await expect(resumed.locator('#extra')).toHaveText(String(breadMoves(1)-1));await resumed.close();
});
test('cancelled and outward edge drags never spend a move',async({page})=>{
 await open(page);const b=page.locator('.field-controls button').first(),a=await center(page,0);await page.mouse.move(a.x,a.y);await page.mouse.down();await b.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.move(a.x+50,a.y);await page.mouse.up();await expect(page.locator('#extra')).toHaveText(String(breadMoves(1)));
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(a.x-60,a.y);await page.mouse.up();await expect(page.locator('#extra')).toHaveText(String(breadMoves(1)));await expect(page.locator('#score')).toHaveText('0');
});
test('native touch swipe exchanges adjacent bread',async({page,context,browserName,isMobile})=>{
 test.skip(!isMobile||browserName!=='chromium','CDP touch injection is Chromium-only');const s=await open(page),pair=availableSwap(s.board),a=await center(page,pair[0]),b=await center(page,pair[1]),session=await context.newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[b]});await expect(page.locator('#extra')).toHaveText(String(breadMoves(1)-1));await expect(page.locator('#score')).not.toHaveText('0');await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('#extra')).toHaveText(String(breadMoves(1)-1));await expect(page.locator('#score')).not.toHaveText('0');
});

test('a winning last-second removal finishes before showing clear',async({page})=>{
 const ready=createGame('photo',{seed:7});ready.board.fill(0);ready.board[6]=1;ready.breadCover.fill(true);ready.breadCover[6]=false;
 await open(page,{...ready,elapsed:roundDuration('photo')-.05,remaining:.05});await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls button').nth(6).click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.clock.runFor(100);await expect(page.locator('#app')).toHaveAttribute('data-bread-phase','pop');await page.clock.runFor(200);await expect(page.locator('#app')).toHaveAttribute('data-cleared','true');await expect(page.locator('.result-lives')).toContainText('♥♥♥');
});
