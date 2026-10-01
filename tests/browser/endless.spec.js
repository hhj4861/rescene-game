/* global localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
const name='메이의 보글보글 공방 시작';
async function open(page,progress){
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(progress)});
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await expect(page.getByRole('button',{name})).toBeEnabled();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
test('stage five clears into six with the same lives, including a reload before continuing',async({page},info)=>{
  const p=emptyProgress(),s=createGame('blocks',{stage:5,hearts:2,seed:7});s.popped=6;s.enemies=[{x:150,y:536,home:0,dir:1,trapped:4}];p.games.blocks={stage:5,highest:5,hearts:2,snapshot:snapshotRound(s)};
  await open(page,p);await page.getByRole('button',{name}).click();await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.getByRole('button',{name:'방울 ○'}).click();
  await expect(page.locator('#result-title')).toHaveText('스테이지 5 클리어!');await expect(page.getByRole('button',{name:'다음 스테이지 ▶'})).toBeVisible();await expect(page.locator('.result-lives')).toContainText('♥♥♡');
  await page.reload();await page.getByRole('button',{name}).click();await expect(page.locator('.stage-goal')).toContainText('STAGE 6');await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 2개');
  await page.screenshot({path:info.outputPath('stage-six.png'),fullPage:true});
});
test('three failed rounds end the run; retries and reloads never refill lives',async({page})=>{
  await open(page,emptyProgress());await page.getByRole('button',{name:'제나의 신라빵 시작'}).click();
  for(let remaining=2;remaining>=0;remaining--){
    await page.clock.fastForward(61000);await expect(page.locator('#app')).toHaveAttribute('data-state','result');
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.photo.hearts,PROGRESS_KEY)).toBe(remaining);
    if(remaining){await page.getByRole('button',{name:'다시 도전 ▶'}).click();await expect(page.locator('#lives')).toHaveAttribute('aria-label',`남은 목숨 ${remaining}개`);}
  }
  await expect(page.locator('#result-title')).toHaveText('GAME OVER');await page.reload();await expect(page.locator('#machine-photo')).toContainText('도전 종료');await page.getByRole('button',{name:'제나의 신라빵 시작'}).click();await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');await expect(page.locator('.stage-goal')).toContainText('STAGE 1');
});
test('legacy all-five-cleared save continues at six and explicit new run keeps highest stage',async({page})=>{
  await open(page,{version:1,games:{blocks:{cleared:[1,2,3,4,5],unlocked:5,best:[100,200,300,400,500],snapshot:null}}});
  await expect(page.locator('#machine-blocks')).toContainText('STAGE 6');await page.getByRole('button',{name}).click();await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.getByRole('button',{name:'스테이지 1부터 새 도전'}).click();await expect(page.locator('.stage-goal')).toContainText('STAGE 1');
  await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.getByRole('button',{name:'오락실로 돌아가기'}).click();await expect(page.locator('#machine-blocks')).toContainText('최고 STAGE 6');
});
