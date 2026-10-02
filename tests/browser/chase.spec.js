/* global localStorage */
import {test,expect} from '@playwright/test';
import {createGame} from '../../src/arcade-room/model.js';
import {emptyProgress,snapshotRound,PROGRESS_KEY} from '../../src/arcade-room/progress.js';
async function open(page,fixture){if(fixture){const p=emptyProgress();p.games.drive.snapshot=snapshotRound(fixture);await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:PROGRESS_KEY,value:JSON.stringify(p)});}
 await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});await page.goto('./');await expect(page.locator('[data-start="drive"].start')).toBeEnabled();await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));await page.locator('[data-start="drive"].start').click();if(fixture)await page.getByRole('button',{name:'계속하기 ▶'}).click();}
const active=page=>page.locator('.field-controls button[data-active="true"][data-fake="false"]');
test('running targets carry their touch areas, combo opens fever, pause and reload preserve it',async({page,isMobile},info)=>{
 await open(page);await page.clock.runFor(700);const runner=active(page).first(),first=await runner.boundingBox();await page.clock.runFor(600);const moved=await runner.boundingBox();expect(Math.abs(moved.x-first.x)).toBeGreaterThan(10);
 for(let hit=1;hit<=5;hit++){for(let tick=0;tick<30&&await active(page).count()===0;tick++)await page.clock.runFor(100);const b=active(page).first();await expect(b).toBeVisible();if(isMobile)await b.tap();else await b.click();await expect(page.locator('#extra')).toHaveText(String(hit));}
 await expect(page.locator('#app')).toHaveAttribute('data-fever','true');await page.clock.runFor(600);await page.screenshot({path:info.outputPath('woni-fever.png')});
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.drive.snapshot,PROGRESS_KEY);expect(before.fever).toBeGreaterThan(0);await page.clock.runFor(5000);await page.reload();await page.locator('[data-start="drive"].start').click();await expect(page.locator('#app')).toHaveAttribute('data-state','paused');
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).games.drive.snapshot,PROGRESS_KEY);expect(after.fever).toBe(before.fever);expect(after.holes).toEqual(before.holes);await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.clock.runFor(250);await expect(page.locator('#app')).toHaveAttribute('data-fever','true');
});
test('a hit lands only once and its old position is no longer clickable',async({page})=>{
 await open(page);await page.clock.runFor(600);const target=active(page).first(),label=await target.getAttribute('data-act'),box=await target.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);const score=await page.locator('#score').innerText();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await expect(page.locator('#score')).toHaveText(score);await expect(page.locator(`.field-controls button[data-act="${label}"]`)).toBeHidden();await expect(page.locator('#extra')).toHaveText('1');
});
test('fever prevents an escape penalty, then normal play loses a life',async({page})=>{
 const s=createGame('drive',{seed:7});s.fever=.5;s.spawn=10;s.holes[0]={ttl:.1,total:4,gold:false,flash:0};s.holes[3]={ttl:.8,total:4,gold:false,flash:0};await open(page,s);await page.clock.runFor(200);await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');await page.clock.runFor(700);await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 2개');await expect(page.locator('#app')).toHaveAttribute('data-fever','false');
});

for(const fever of [0,4])test(`decoys survive reload and tapping one deducts once during fever=${fever}`,async({page,isMobile},info)=>{
 const s=createGame('drive',{seed:7});Object.assign(s,{score:400,hits:4,combo:4,bestCombo:4,heat:4,fever,spawn:10});s.holes[0]={ttl:3,total:4,gold:false,fake:true,flash:0};s.holes[3]={ttl:3,total:4,gold:false,fake:false,flash:0};await open(page,s);
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.reload();await page.locator('[data-start="drive"].start').click();await page.getByRole('button',{name:'계속하기 ▶'}).click();
 const fake=page.getByRole('button',{name:'1번 달리는 가짜 파이리 · 누르면 150점 감점',exact:true});await expect(fake).toBeVisible();await page.screenshot({path:info.outputPath('decoy-before.png')});const b=await fake.boundingBox();if(isMobile)await fake.tap();else await fake.click();
 await expect(page.locator('#score')).toHaveText('250');await expect(page.locator('#extra')).toHaveText('0');await expect(page.locator('#goal')).toHaveText('4 / 12 파이리');await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');await expect(page.locator('#reaction')).toContainText('가짜');await expect(page.locator('#app')).toHaveAttribute('data-fever',String(fever>0));await page.screenshot({path:info.outputPath('decoy-penalty.png')});
 await page.mouse.click(b.x+b.width/2,b.y+b.height/2);await expect(page.locator('#score')).toHaveText('250');await expect(fake).toBeHidden();await active(page).first().click();await expect(page.locator('#score')).toHaveText(fever?'470':'360');await expect(page.locator('#goal')).toHaveText('5 / 12 파이리');
 await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.reload();await page.locator('[data-start="drive"].start').click();await expect(page.locator('#score')).toHaveText(fever?'470':'360');
});
test('ignoring a fake keeps lives and the combo needed for fever',async({page})=>{
 const s=createGame('drive',{seed:7});Object.assign(s,{score:400,hits:4,combo:4,bestCombo:4,heat:4,spawn:10});s.holes[0]={ttl:.1,total:4,gold:false,fake:true,flash:0};s.holes[3]={ttl:3,total:4,gold:false,flash:0};await open(page,s);await page.clock.runFor(200);
 await expect(page.locator('#lives')).toHaveAttribute('aria-label','남은 목숨 3개');await expect(page.locator('#score')).toHaveText('400');await expect(page.locator('#extra')).toHaveText('4');await active(page).first().click();await expect(page.locator('#app')).toHaveAttribute('data-fever','true');
});
