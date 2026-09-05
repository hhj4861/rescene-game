import { test, expect } from '@playwright/test';

type GameLike = { scene: { isActive(key: string): boolean } };

test('boots into the prologue map and survives movement and an attack without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(1500);                       // Preload → Title

  await page.keyboard.press('Enter');                    // Title → CharacterSelect (빈 슬롯)
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');               // 리브 선택 (원거리 클래스 경로도 태운다)
  await page.keyboard.press('Enter');                    // → Cutscene
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); } // 줄 2개 + 종료

  await expect.poll(
    () => page.evaluate(() => (window as unknown as { __game: GameLike }).__game.scene.isActive('World')),
    { timeout: 10_000 },
  ).toBe(true);
  await page.waitForTimeout(400);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');

  await page.keyboard.down('Space');
  await page.waitForTimeout(80);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);

  await page.keyboard.down('KeyA');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyA');
  await page.waitForTimeout(150);

  await page.keyboard.down('KeyS');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'test-results/boot.png' });
  expect(errors).toEqual([]);
});
