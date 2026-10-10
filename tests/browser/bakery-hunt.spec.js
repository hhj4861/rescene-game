/* global localStorage,document,window */
import {test,expect} from '@playwright/test';
import {createGame,stageBoardSize} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,s){const p=emptyProgress();p.games.photo={...p.games.photo,stage:s.stage,highest:s.stage,snapshot:snapshotRound(s)};await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();}
test('an 8x8 wrapper must be completely removed before stage clear',async({page},info)=>{const s=createGame('photo',{stage:11,seed:7});s.collected=999;s.breadCover.fill(true);for(let i=56;i<64;i++)s.breadCover[i]=false;await open(page,s);await expect(page.locator('#goal')).toHaveText('0 / 1 십원빵');await expect(page.locator('#app')).toHaveAttribute('data-state','playing');await page.screenshot({path:info.outputPath('hidden-bread.png'),fullPage:true});await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="63"]').click();await page.clock.runFor(12000);await expect(page.locator('#result-title')).toHaveText('스테이지 11 클리어!');await page.locator('.result-paper [data-start="photo"]').click();await expect(page.locator('#goal')).toHaveText('0 / 1 십원빵');await expect(page.locator('.field-controls button')).toHaveCount(64);});
for(const stage of [16,36])test(`stage ${stage} at the 8x8 cap supports zoom, last cell, keyboard and saved progress`,async({page},info)=>{const size=stageBoardSize(stage),total=size*size,s=createGame('photo',{stage,seed:7});s.breadCover[0]=true;s.breadCover[1]=true;await open(page,s);await expect(page.locator('.field-controls button')).toHaveCount(total);await page.locator('[data-bread-zoom]').click();await expect(page.locator('[data-bread-zoom]')).toHaveAttribute('aria-pressed','true');const last=page.locator(`.field-controls [data-act="${total-1}"]`);await last.click();await expect(last).toHaveAttribute('aria-pressed','true');await last.focus();await page.keyboard.press('ArrowLeft');await expect(page.locator(`.field-controls [data-act="${total-2}"]`)).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`${size}x${size}-zoom.png`),fullPage:true});await page.locator('[data-bread-zoom]').click();await page.locator('[data-pause]').click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.photo.snapshot,PROGRESS_KEY);expect(saved.breadCover.slice(0,3)).toEqual([true,true,false]);await page.reload();await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();await expect(page.locator('.field-controls [data-act="0"]')).toHaveAttribute('aria-label',/빈칸.*제거된 퍼즐/);await expect(page.locator('.field-controls button')).toHaveCount(total);});

test('an older 10x10 late-stage save shrinks to 8x8 and persists',async({page})=>{const s=createGame('photo',{stage:5,seed:7});s.stage=12;s.board=Array.from({length:100},(_,i)=>s.board[i%s.board.length]);s.hint=[];s.bakeryVersion=1;delete s.breadCover;s.elapsed=15;s.remaining=45;s.moves=12;await open(page,s);await expect(page.locator('.field-controls button')).toHaveCount(64);await expect(page.locator('#time')).toHaveText('165초');await page.locator('[data-pause]').click();const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.photo.snapshot,PROGRESS_KEY);expect(saved.stage).toBe(12);expect(saved.bakeryVersion).toBe(3);expect(saved.breadCover).toHaveLength(64);await page.reload();await page.locator('[data-start="photo"].start').click();await expect(page.locator('.field-controls button')).toHaveCount(64);});

test('clearing stages 15 and 16 keeps the maximum board at 8x8',async({page})=>{
 const s=createGame('photo',{stage:15,seed:7});s.breadCover.fill(true);s.breadCover[0]=false;await open(page,s);
 await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="0"]').click();await page.clock.runFor(12000);
 await expect(page.locator('#result-title')).toHaveText('스테이지 15 클리어!');await page.locator('.result-paper [data-start="photo"]').click();await expect(page.locator('.field-controls button')).toHaveCount(64);
 await page.locator('[data-pause]').click();await page.addInitScript(key=>{const p=JSON.parse(localStorage.getItem(key));p.games.photo.snapshot.breadCover.fill(true);p.games.photo.snapshot.breadCover[0]=false;localStorage.setItem(key,JSON.stringify(p));},PROGRESS_KEY);
 await page.reload();await page.locator('[data-start="photo"].start').click();await page.locator('[data-resume]').click();await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="0"]').click();await page.clock.runFor(12000);
 await expect(page.locator('#result-title')).toHaveText('스테이지 16 클리어!');await page.locator('.result-paper [data-start="photo"]').click();await expect(page.locator('.field-controls button')).toHaveCount(64);
});
test('a formerly fixed 20x20 stage-one save resumes at 6x6 with its earned bread',async({page})=>{
 const s=createGame('photo',{stage:1,seed:7});s.board=Array.from({length:400},(_,i)=>s.board[i%s.board.length]);s.breadCover=Array(400).fill(false);for(const i of [20,21,40,41])s.breadCover[i]=true;s.score=900;s.elapsed=30;s.remaining=150;s.hint=[];
 await open(page,s);await expect(page.locator('.field-controls button')).toHaveCount(36);await expect(page.locator('#goal')).toHaveText('1 / 2 십원빵');await expect(page.locator('#score')).toHaveText('900');await expect(page.locator('#time')).toHaveText('150초');
 await page.locator('[data-pause]').click();await page.reload();await page.locator('[data-start="photo"].start').click();await expect(page.locator('.field-controls button')).toHaveCount(36);await expect(page.locator('#goal')).toHaveText('1 / 2 십원빵');
});

test('a new first stage and stage two both stay at 6x6',async({page})=>{
 const s=createGame('photo',{seed:7});s.breadCover.fill(true);s.breadCover[6]=false;await open(page,s);await expect(page.locator('.field-controls button')).toHaveCount(36);
 await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="6"]').click();await page.clock.runFor(12000);await expect(page.locator('#result-title')).toHaveText('스테이지 1 클리어!');
 await page.locator('.result-paper [data-start="photo"]').click();await expect(page.locator('.field-controls button')).toHaveCount(36);await expect(page.locator('#goal')).toHaveText('0 / 3 십원빵');
});

for(const [stage,nextSize] of [[5,7],[10,8]])test(`clearing stage ${stage} grows the board once after five stages`,async({page})=>{
 const s=createGame('photo',{stage,seed:7});s.breadCover.fill(true);s.breadCover[0]=false;await open(page,s);
 await expect(page.locator('.field-controls button')).toHaveCount((nextSize-1)**2);
 await page.locator('[data-act="rolling-pin"]').click();await page.locator('.field-controls [data-act="0"]').click();await page.clock.runFor(12000);
 await expect(page.locator('#result-title')).toHaveText(`스테이지 ${stage} 클리어!`);await page.locator('.result-paper [data-start="photo"]').click();await expect(page.locator('.field-controls button')).toHaveCount(nextSize**2);
});

for(const [stage,size] of [[5,6],[6,7],[10,7],[11,8],[100,8]])test(`compact stage ${stage} fits a 320px screen with usable cells`,async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await open(page,createGame('photo',{stage,seed:7}));
 const cells=page.locator('.field-controls button');await expect(cells).toHaveCount(size*size);
 const cell=await cells.last().boundingBox();expect(cell.width).toBeGreaterThanOrEqual(28);expect(cell.height).toBeGreaterThanOrEqual(28);
 expect(await page.locator('.bread-viewport').evaluate(el=>el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await cells.last().click();await expect(cells.last()).toHaveAttribute('aria-pressed','true');
 if(stage===11)await page.screenshot({path:info.outputPath('compact-8x8-320px.png'),fullPage:true});
});
