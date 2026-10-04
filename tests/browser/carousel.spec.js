import {enterPump} from './pump-helpers.js';
/* global document */
import {test,expect} from '@playwright/test';

async function expectCentered(page,id){
 await expect(page.locator(`[data-slide="${id}"]`)).toHaveAttribute('aria-current','true');
 await expect.poll(()=>page.locator(`#machine-${id}`).evaluate(card=>{
  const r=card.getBoundingClientRect(),track=card.parentElement.getBoundingClientRect();
  return Math.abs(r.left+r.width/2-(track.left+track.width/2));
 })).toBeLessThan(2);
}

test('member tabs center the actual cabinet at wide, narrow and mobile widths',async({page},info)=>{
 await page.goto('./');await expect(page.locator('[data-start="drive"].start')).toBeEnabled();
 for(const width of [2200,1440,1065,700,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const id of ['blocks','catch','photo','rhythm','drive']){
   await page.locator(`[data-slide="${id}"]`).click();await expectCentered(page,id);
  }
 }
 await page.setViewportSize({width:2200,height:1000});await page.locator('[data-slide="blocks"]').click();await expectCentered(page,'blocks');
 await page.screenshot({path:info.outputPath('may-centered-wide.png')});
});

test('cabinet picker supports buttons, keyboard and remembers the game on return',async({page},info)=>{
 await page.goto('./');await expect(page.locator('[data-start="drive"].start')).toBeEnabled();
 await expect(page.locator('[data-slide-status]')).toHaveText('1 / 5 · 원이');await expect(page.getByRole('button',{name:'이전 게임',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'다음 게임',exact:true}).click();await expect(page.locator('[data-slide="blocks"]')).toHaveAttribute('aria-current','true');
 await page.locator('.machines').focus();await page.keyboard.press('End');await expect(page.locator('[data-slide-status]')).toHaveText('5 / 5 · 리브');await expect(page.getByRole('button',{name:'다음 게임',exact:true})).toBeDisabled();
 await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(page.locator('[data-slide-status]')).toHaveText('2 / 5 · 메이');
 await page.locator('[data-slide="photo"]').click();await page.screenshot({path:info.outputPath('carousel.png')});await page.locator('[data-start="photo"].start').click();
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.getByRole('button',{name:'오락실로 돌아가기'}).click();await expect(page.locator('[data-slide-status]')).toHaveText('3 / 5 · 제나');
 const fits=await page.locator('#machine-photo').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=document.documentElement.clientWidth;});expect(fits).toBe(true);
});
test('horizontal scrolling selects a cabinet without launching it or overflowing the page',async({page},info)=>{
 await page.setViewportSize({width:320,height:720});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await expect(page.locator('[data-start="drive"].start')).toBeEnabled();
 await page.locator('.machines').evaluate(e=>e.scrollBy({left:e.querySelector('.machine').clientWidth+14,behavior:'instant'}));
 await expect(page.locator('[data-slide-status]')).toHaveText('2 / 5 · 메이');await expect(page.locator('#app')).toHaveAttribute('data-state','home');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);await page.screenshot({path:info.outputPath('carousel-small.png')});
});
test('native mobile swipe changes the selected cabinet',async({page,context,isMobile,browserName})=>{
 test.skip(!isMobile||browserName!=='chromium','CDP touch injection is Chromium-only');await page.goto('./');await expect(page.locator('[data-start="drive"].start')).toBeEnabled();
 const box=await page.locator('.cabinet-screen').first().boundingBox(),y=box.y+box.height/2,session=await context.newCDPSession(page);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y}]});
 for(let x=290;x>=60;x-=23){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});await page.waitForTimeout(25);}
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('[data-slide="drive"]')).toHaveAttribute('aria-current','false');await expect(page.locator('#app')).toHaveAttribute('data-state','home');
});

test('resizing and leaving the picker preserve selection without observer errors',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await expect(page.locator('[data-start="rhythm"].start')).toBeEnabled();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-slide="rhythm"]').click();
 for(const [width,height] of [[390,844],[844,390],[320,568]]){
  await page.setViewportSize({width,height});await page.clock.runFor(100);await expect(page.locator('[data-slide-status]')).toHaveText('4 / 5 · 미나미');
  await page.locator('[data-start="rhythm"].start').click();await enterPump(page);if(await page.locator('#app').getAttribute('data-state')!=='paused')await page.locator('[data-pause]').click();await page.locator('[data-leave]').click();await page.clock.runFor(100);await expect(page.locator('[data-slide-status]')).toHaveText('4 / 5 · 미나미');
 }
 expect(errors).toEqual([]);
});
