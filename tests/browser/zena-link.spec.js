/* global localStorage, document */
import {test,expect} from '@playwright/test';
import {createGame,gameAction,stepGame} from '../../src/arcade-room/model.js';
import {linkPair} from '../../src/arcade-room/zena-link.js';
import {snapshotRound} from '../../src/arcade-room/progress.js';
import {readGamePacks,PACKS_KEY} from '../../src/arcade-room/game-packs.js';
async function open(page,s){
 if(s){const data=readGamePacks();data.selected.photo='zena-link';Object.assign(data.packs['zena-link'].journey,{stage:s.stage,highest:s.stage,snapshot:snapshotRound(s)});await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PACKS_KEY,value:JSON.stringify(data)});}
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-slide="photo"]').click();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PACKS_KEY);
const tile=(page,i)=>page.locator(`.field-controls [data-act="${i}"]`);
test('Zena icon tools fit a single 320px row, have accessible names and keep bakery controls working',async({page},info)=>{
 await page.setViewportSize({width:320,height:720});await open(page);await page.locator('[data-start="photo"].start').click();
 const tools=page.locator('.game-controls .zena-tool');await expect(tools).toHaveCount(4);const boxes=[];
 for(let i=0;i<4;i++){const b=tools.nth(i);await expect(b.locator('svg')).toBeVisible();await expect(b).toHaveAttribute('aria-label',/.+/);const box=await b.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);boxes.push(box);}
 expect(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))).toBeLessThan(1);
 await page.getByRole('button',{name:'판 확대',exact:true}).click();await expect(page.locator('[data-bread-zoom]')).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'판 축소',exact:true}).click();
 await page.getByRole('button',{name:'빵 섞기 · 2회',exact:true}).click();await expect(page.getByRole('button',{name:'빵 섞기 · 1회',exact:true})).toBeVisible();
 await page.locator('.item-button').click();await expect(page.locator('.item-button')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.item-button svg')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);await page.screenshot({path:info.outputPath('zena-icon-toolbar.png'),fullPage:true});
});
test('link pack matches by touch or keyboard, draws a route and resumes independently of bakery',async({page,isMobile},info)=>{
 const s=createGame('photo',{link:true,seed:11}),[a,b]=linkPair(s.board);await open(page,s);await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();
 await expect(page.locator('#app')).toHaveAttribute('data-pack','zena-link');await expect(page.locator('.field-controls button')).toHaveCount(36);await expect(page.locator('[data-act="rolling-pin"]')).toHaveCount(0);
 await page.getByRole('button',{name:'짝 힌트',exact:true}).click();await expect(page.locator('#interaction-hint')).toContainText('반짝이는');
 if(isMobile){await tile(page,a).tap();await tile(page,b).tap();}else{await tile(page,a).focus();await page.keyboard.press('Enter');await tile(page,b).focus();await page.keyboard.press('Enter');}
 await expect(page.locator('#goal')).toHaveText('1 / 18 짝');await expect(tile(page,a)).toHaveAttribute('aria-label',/빈칸/);await expect(page.locator('#extra')).toHaveText('17');await page.screenshot({path:info.outputPath('zena-link-route.png'),fullPage:true});await page.clock.runFor(500);await page.locator('[data-exit-game]').click();
 const before=(await saved(page)).packs['zena-link'].journey.snapshot;await page.locator('button[data-pack="zena-bakery"]').click();await page.locator('[data-start="photo"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-pack','zena-bakery');await expect(page.locator('[data-act="rolling-pin"]')).toBeVisible();await page.locator('[data-exit-game]').click();await page.locator('button[data-pack="zena-link"]').click();
 await page.reload();await page.locator('[data-slide="photo"]').click();await expect(page.locator('button[data-pack="zena-link"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-start="photo"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');expect((await saved(page)).packs['zena-link'].journey.snapshot.board).toEqual(before.board);await expect(page.locator('#goal')).toHaveText('1 / 18 짝');
});
test('all pairs clear the link stage; next stage and song reward belong to this pack',async({page})=>{
 const s=createGame('photo',{link:true,seed:5});await open(page,s);await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();
 while(s.board.some(Boolean)){
  const [a,b]=linkPair(s.board);await tile(page,a).click();await tile(page,b).click();gameAction(s,a);gameAction(s,b);stepGame(s,.4);await page.clock.runFor(400);
  if(s.pairs===4){await expect(page.locator('.song-pickup')).toBeEnabled();await expect(page.locator('.song-pickup')).toHaveAttribute('aria-label','노래 아이템 줍기 · 1개');}
 }
 await expect(page.locator('#result-title')).toHaveText('스테이지 1 클리어!');await expect(page.locator('.result-paper')).toContainText('빵 18쌍');
 const data=await saved(page);expect(data.packs['zena-link'].journey.stage).toBe(2);expect(data.packs['zena-bakery'].journey.stage).toBe(1);expect(data.packs['zena-link'].record).toBeGreaterThan(0);
 await page.locator('.result-paper [data-start="photo"]').click();await expect(page.locator('#app')).toHaveAttribute('data-pack','zena-link');await expect(page.locator('.stage-goal b')).toHaveText('STAGE 2');
});
test('late-stage link board remains capped at 8 by 8 on mobile and incorrect pairs stay on the board',async({page},info)=>{
 const s=createGame('photo',{link:true,stage:16,seed:3});await page.setViewportSize({width:390,height:844});await open(page,s);await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();await expect(page.locator('.field-controls button')).toHaveCount(64);
 const b=s.board.findIndex(v=>v!==s.board[0]);await tile(page,0).click();await tile(page,b).click();await expect(page.locator('#score')).toHaveText('0');await expect(page.locator('#extra')).toHaveText('32');await expect(page.locator('#interaction-hint')).toContainText('최대 두 번');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:info.outputPath('zena-link-stage16.png'),fullPage:true});
});
