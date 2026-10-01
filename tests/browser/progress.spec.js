/* global window, localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
const blocks='메이의 조각 공방 시작';
async function fixture(page,rows=1,stage=1){
 const s=createGame('blocks',{stage,seed:7});s.active={cells:[[1,1],[1,1]],color:2,x:3,y:0};
 for(let i=0;i<rows;i++)s.board[11-i]=[1,1,1,0,0,1,1,1];
 const p=emptyProgress();p.games.blocks.stage=stage;p.games.blocks.highest=stage;p.games.blocks.snapshot=snapshotRound(s);
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROGRESS_KEY,value:JSON.stringify(p)});
 await open(page);await page.getByRole('button',{name:blocks}).click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await page.getByRole('button',{name:'계속하기 ▶'}).click();
}
async function open(page){await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await expect(page.getByRole('button',{name:blocks})).toBeEnabled();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));}
test('May winks on a line, then returns to idle without blocking input',async({page},info)=>{
 await fixture(page);await page.getByRole('button',{name:'내려놓기 ↓'}).click();await expect(page.locator('#goal')).toHaveText('1 / 2 줄');await expect(page.locator('.signature-toast')).toHaveAttribute('data-pose','wink');await expect(page.locator('.signature-toast')).toBeVisible();
 await page.clock.runFor(650);await page.screenshot({path:info.outputPath('may-wink.png'),fullPage:true});await page.clock.runFor(700);await expect(page.locator('.signature-toast')).toBeHidden();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
});
test('clear unlocks next stage, shows member line and plays optional labeled voice',async({page},info)=>{
 await page.addInitScript(()=>{window.played=[];window.Audio=class{constructor(src){this.src=src;}play(){window.played.push(this.src);this.onplaying?.();return Promise.resolve();}pause(){}load(){}removeAttribute(){}};});
 await fixture(page,2);await page.getByRole('button',{name:'멤버 음성 켜기',exact:true}).click();await page.getByRole('button',{name:'내려놓기 ↓'}).click();await expect(page.locator('#app')).toHaveAttribute('data-cleared','true');await expect(page.getByText('클리어는 그립감이 좋다',{exact:true})).toBeVisible();expect(await page.evaluate(()=>window.played)).toEqual(['./voices/may.mp3?v=2','./voices/may.mp3?v=2']);
 await expect(page.locator('.member-voice')).toContainText('게임용 각색');await expect(page.locator('#voice-status')).toContainText('실제 멤버 음성 재생 중');
 await expect(page.locator('#result-title')).toBeInViewport();await expect(page.locator('.clear-portrait')).toBeInViewport();await page.clock.runFor(750);await page.screenshot({path:info.outputPath('may-stage-clear.png'),fullPage:true});const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS_KEY);expect(saved.games.blocks.stage).toBe(2);expect(saved.games.blocks.snapshot).toBeNull();
 await page.getByRole('button',{name:'다음 스테이지 ▶'}).click();await expect(page.locator('.stage-goal')).toContainText('STAGE 2');await expect(page.locator('#goal')).toHaveText('0 / 3 줄');
});
test('reload restores time, score and board only after explicit resume',async({page})=>{
 await open(page);await page.getByRole('button',{name:blocks}).click();await page.getByRole('button',{name:'내려놓기 ↓'}).click();await page.clock.runFor(2000);await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.blocks.snapshot,PROGRESS_KEY);await page.reload();await page.getByRole('button',{name:blocks}).click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');await expect(page.locator('#score')).toHaveText(String(before.score));const time=await page.locator('#time').innerText();await page.clock.fastForward(65000);await expect(page.locator('#time')).toHaveText(time);
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.blocks.snapshot,PROGRESS_KEY);expect(after.board).toEqual(before.board);expect(after.remaining).toBe(before.remaining);await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.clock.runFor(1000);await expect(page.locator('#time')).not.toHaveText(time);
});
test('timeout does not unlock stages and home keeps unfinished rounds for each member',async({page})=>{
 await open(page);await page.getByRole('button',{name:blocks}).click();await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.getByRole('button',{name:'오락실로 돌아가기'}).click();await expect(page.getByRole('button',{name:blocks})).toHaveText('이어서 하기 ▶');
 await page.getByRole('button',{name:'제나의 깜짝 포토부스 시작'}).click();await page.clock.fastForward(61000);await expect(page.locator('#app')).toHaveAttribute('data-cleared','false');const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROGRESS_KEY);expect(saved.games.photo.stage).toBe(1);expect(saved.games.blocks.snapshot).not.toBeNull();
});
