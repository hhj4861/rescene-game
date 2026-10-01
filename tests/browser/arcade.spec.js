/* global document, window */
import {test,expect} from '@playwright/test';
const games={drive:'원이의 바닷길 드라이브 시작',blocks:'메이의 조각 공방 시작',photo:'제나의 깜짝 포토부스 시작',rhythm:'미나미의 댄스 타임 시작',catch:'리브의 별빛 산책 시작'};
test.beforeEach(async({page})=>{
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  await page.goto('./');await expect(page.getByRole('button',{name:games.drive,exact:true})).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
});
for(const [kind,name] of Object.entries(games))test(`${kind}: start, input, pause, result, continue and saved record`,async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(kind==='drive')await page.screenshot({path:testInfo.outputPath('home.png'),fullPage:true});
  await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('#app')).toHaveAttribute('data-state','playing');
  if(kind==='photo'){await page.getByRole('button',{name:'사진 찍기',exact:true}).click();await expect(page.locator('#score')).not.toHaveText('0');}
  else if(kind==='rhythm'){await page.clock.runFor(2000);await page.getByRole('button',{name:'왼쪽 박자',exact:true}).click();await expect(page.locator('#score')).not.toHaveText('0');}
  else{await page.getByRole('button',{name:'왼쪽으로 이동',exact:true}).click();if(kind==='blocks'){await expect(page.locator('#next')).toBeVisible();await page.getByRole('button',{name:'조각 회전'}).click();await page.getByRole('button',{name:'내려놓기 ↓'}).click();await expect(page.locator('#score')).not.toHaveText('0');}}
  await page.screenshot({path:testInfo.outputPath('game.png'),fullPage:true});
  await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();const time=await page.locator('#time').innerText();await page.clock.fastForward(65000);await expect(page.locator('#time')).toHaveText(time);
  await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.clock.fastForward(61000);await expect(page.locator('#app')).toHaveAttribute('data-state','result');
  const score=await page.locator('#score').innerText();await expect(page.locator('#best')).toHaveText(score);await expect(page.getByText('진행 상황과 최고 기록은 이 기기에 저장했어요.',{exact:true})).toBeVisible();
  const cleared=await page.locator('#app').getAttribute('data-cleared')==='true',hearts=(await page.locator('#lives').innerText()).split('♥').length-1;
  await page.getByRole('button',{name:cleared?'다음 스테이지 ▶':hearts?'다시 도전 ▶':'새 도전 ▶',exact:true}).click();await expect(page.locator('#score')).toHaveText('0');
  await expect(page.locator('.stage-goal b')).toHaveText(`STAGE ${cleared?2:1}`);await expect(page.locator('#lives')).toHaveAttribute('aria-label',`남은 목숨 ${hearts||3}개`);
  await page.getByRole('button',{name:'잠깐 쉬기 Ⅱ'}).click();await page.getByRole('button',{name:'오락실로 돌아가기'}).click();
  await page.reload();await expect(page.locator(`#machine-${kind} .cabinet-bottom b`)).toHaveText(score);expect(errors).toEqual([]);
});
test('small viewport exposes next piece and all controls without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.getByRole('button',{name:games.blocks}).click();await expect(page.locator('#next')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const bounds=await page.locator('.game-controls').boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(568);
});
test('held movement repeats and stops after release',async({page})=>{
  await page.getByRole('button',{name:games.blocks}).click();const button=page.getByRole('button',{name:'왼쪽으로 이동',exact:true}),box=await button.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.clock.runFor(16);const first=await page.locator('#game').screenshot();
  await page.clock.runFor(400);const held=await page.locator('#game').screenshot();expect(first.equals(held)).toBe(false);await page.mouse.up();await page.clock.runFor(200);expect((await page.locator('#game').screenshot()).equals(held)).toBe(true);
});
test('rhythm correction persists and help returns keyboard focus to the game',async({page})=>{
  await page.getByRole('button',{name:games.rhythm}).click();await page.getByRole('button',{name:'하는 방법'}).click();await page.locator('#offset').fill('100');await expect(page.locator('#offset-value')).toHaveText('100ms');
  await page.getByRole('button',{name:'계속하기 ▶'}).click();await expect(page.locator('#game')).toBeFocused();await page.reload();await page.getByRole('button',{name:games.rhythm}).click();await page.getByRole('button',{name:'계속하기 ▶'}).click();await page.getByRole('button',{name:'하는 방법'}).click();await expect(page.locator('#offset')).toHaveValue('100');
});
