import {test,expect} from '@playwright/test';
import {enterPump,waitPump} from './pump-helpers.js';
import {fakeApi} from './youtube-helpers.js';
async function open(page,official=false){
 if(official)await fakeApi(page);
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="rhythm"].start').click();
 if(official){await page.locator('[data-song-start]').click();await waitPump(page);}else await enterPump(page);
}
async function tap(page,isMobile,x,y,height){const b=await page.locator('#game').boundingBox();const p={x:b.x+x/480*b.width,y:b.y+y/height*b.height};if(isMobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
for(const official of [false,true])test(`rising notes can be directly tapped with timing in ${official?'official':'practice'} mode`,async({page,isMobile},info)=>{
 await open(page,official);const height=official?360:600,beat=official?4*60/112:2,travel=height===600?205:(height-150)/2.2;
 await page.clock.runFor(Math.round((beat-.5)*1000));await tap(page,isMobile,75,136+.5*travel,height);await expect(page.locator('#score')).toHaveText('0');
 await page.clock.runFor(500);await tap(page,isMobile,240,136,height);await expect(page.locator('#score')).toHaveText('0');await tap(page,isMobile,75,136,height);await expect(page.locator('#score')).toHaveText('105');await tap(page,isMobile,75,136,height);await expect(page.locator('#score')).toHaveText('105');await expect(page.locator('.pump-pad')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('pump-direct.png'),fullPage:true});await page.locator('[data-pause]').click();await page.locator('#game').dispatchEvent('pointerdown',{clientX:75,clientY:136,pointerId:2,pointerType:'touch'});await expect(page.locator('#score')).toHaveText('105');
});
test('two pointers can hit a chord and keyboard remains available',async({page,isMobile})=>{
 await open(page);await page.locator('[data-pump-picker]').click();await page.locator('[data-song-level="3"]').click();await page.locator('[data-song-start]').click();await waitPump(page);await page.clock.runFor(2000);await page.keyboard.press('z');await expect(page.locator('#score')).toHaveText('105');for(const key of ['s','c','q','e','s','z']){await page.clock.runFor(500);await page.keyboard.press(key);}await page.clock.runFor(500);
 // Five Steps beat 11 has lanes 4 and 1. Secondary touch must not be discarded.
 const b=await page.locator('#game').boundingBox();for(const [i,x] of [403,157].entries())await page.locator('#game').dispatchEvent('pointerdown',{clientX:b.x+x/480*b.width,clientY:b.y+136/600*b.height,pointerId:i+5,pointerType:isMobile?'touch':'mouse',button:0,isPrimary:i===0});
 await expect(page.locator('#goal')).toContainText('성공 9');
});
