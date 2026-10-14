/* global document, window, getComputedStyle */
import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
import {test,expect} from '@playwright/test';
import {fakeApi} from './youtube-helpers.js';

const font=readFileSync(new URL('../fixtures/fonts/noto-sans-kr-119.woff2',import.meta.url));
async function delayedFont(page){
 let release;const gate=new Promise(resolve=>{release=resolve;});
 await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:'@font-face{font-family:"Noto Sans KR";font-style:normal;font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/regression.woff2) format("woff2")}'}));
 await page.route('https://fonts.gstatic.com/**',async route=>{await gate;await route.fulfill({contentType:'font/woff2',body:font});});
 await fakeApi(page);
 return release;
}
async function select(page){
 await page.goto('./',{waitUntil:'domcontentloaded'});
 await page.locator('[data-start="rhythm"].start').click();
 await page.locator('[data-song-level="2"]').click();
 await page.locator('[data-song="pinball"]').click();
 await expect(page.locator('[data-song-level="2"]')).toHaveAttribute('aria-pressed','true');
}
for(const width of [320,390,700,701,768,1280])test(`Pump start survives a font arriving during press at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:844});const release=await delayedFont(page);
 try{
  await select(page);const button=page.locator('[data-song-start]');await button.evaluate(el=>el.scrollIntoView({block:'center'}));
  const layout=()=>page.evaluate(()=>({scroll:window.scrollY,elements:[...document.querySelectorAll('.topbar,.song-room,.song-host,.song-console,.song-now,.song-list,.song-levels,.song-actions,.song-note,#song-preview-status,footer')].map(el=>({class:el.className,y:el.getBoundingClientRect().y,h:el.getBoundingClientRect().height,line:getComputedStyle(el).lineHeight}))}));
  const beforeLayout=await layout();
  const before=await button.boundingBox();await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>document.fonts.status)).toBe('loading');
  release();await page.evaluate(()=>document.fonts.ready);
  const after=await button.boundingBox();
  // Only the existing 2px pressed feedback may move the button, not font metrics.
  const afterLayout=await layout();
  await info.attach('font-layout',{body:JSON.stringify({width,before,after,beforeLayout,afterLayout}),contentType:'application/json'});
  expect(afterLayout.scroll).toBe(beforeLayout.scroll);
  expect(Math.abs(after.y-before.y)).toBeLessThanOrEqual(3);
  await page.mouse.up();await expect(page.locator('.stage-goal')).toContainText('STAGE 2');
  await expect(page.locator('#music-status')).toContainText('Pinball');
 }finally{release();}
});
for(const key of ['Enter','Space'])test(`Pump starts with ${key} while the webfont is still pending`,async({page})=>{
 const release=await delayedFont(page);
 try{await select(page);await page.locator('[data-song-start]').focus();await page.keyboard.press(key);await expect(page.locator('.stage-goal')).toContainText('STAGE 2');}
 finally{release();}
});
test('Pump accepts a mobile tap before the webfont is ready',async({page,isMobile})=>{
 test.skip(!isMobile,'Touch input is covered by the two mobile projects.');
 const release=await delayedFont(page);
 try{await select(page);await page.locator('[data-song-start]').tap();await expect(page.locator('.stage-goal')).toContainText('STAGE 2');}
 finally{release();}
});
