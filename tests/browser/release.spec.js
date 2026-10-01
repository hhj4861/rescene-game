/* global window, Event */
import {test,expect} from '@playwright/test';

const photo='제나의 깜짝 포토부스 시작';
async function openGame(page){
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  await page.goto('./');await expect(page.getByRole('button',{name:photo})).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}

test('static root and legacy entry load scripts and character assets under the deployment path',async({page})=>{
  const failures=[];page.on('pageerror',error=>failures.push(error.message));
  page.on('response',response=>{if(response.url().startsWith('http://127.0.0.1:4331')&&response.status()>=400)failures.push(response.url());});
  for(const entry of ['./','./arcade-room.html']){
    await page.goto(entry);await expect(page.locator('.control-deck>.start')).toHaveCount(5);
    await expect(page.getByRole('button',{name:photo})).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  expect(failures).toEqual([]);
});

test('touch or mouse input scores, then completes after viewport rotation',async({page,isMobile})=>{
  await openGame(page);const start=page.getByRole('button',{name:photo});
  if(isMobile)await start.tap();else await start.click();
  const snap=page.getByRole('button',{name:'사진 찍기',exact:true});
  if(isMobile)await snap.tap();else await snap.click();
  await expect(page.locator('#score')).toHaveText('110');
  await page.setViewportSize({width:844,height:390});
  await expect(snap).toBeVisible();await page.setViewportSize({width:390,height:844});
  await page.clock.fastForward(61000);await expect(page.locator('#app')).toHaveAttribute('data-state','result');
  await expect(page.getByRole('button',{name:'한 판 더 ▶'})).toBeInViewport();
});

test('denied storage still allows a round and explains the unsaved score',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage unavailable for this test');}}));
  await openGame(page);await page.getByRole('button',{name:photo}).click();
  await page.getByRole('button',{name:'사진 찍기',exact:true}).click();await page.clock.fastForward(61000);
  await expect(page.locator('#app')).toHaveAttribute('data-state','result');
  await expect(page.getByText('기기에 저장할 수 없어요. 이번 탭에서만 진행을 유지해요.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'한 판 더 ▶'}).click();await expect(page.locator('#score')).toHaveText('0');
});

test('focus loss pauses elapsed time and resume restores keyboard play',async({page})=>{
  await openGame(page);await page.getByRole('button',{name:photo}).click();
  await page.clock.runFor(1000);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#app')).toHaveAttribute('data-state','paused');
  const time=await page.locator('#time').innerText();await page.clock.fastForward(65000);
  await expect(page.locator('#time')).toHaveText(time);await page.getByRole('button',{name:'계속하기 ▶'}).click();
  await expect(page.locator('#game')).toBeFocused();await page.clock.runFor(1000);
  await expect(page.locator('#time')).not.toHaveText(time);
});
