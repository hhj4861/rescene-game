import { test, expect, type Page } from '@playwright/test';

// 스테이지 1 스모크: 부트 → 선택 → 인트로 → 첫 구간 웨이브 전멸 → GO → 필살기 1회 → 콘솔 오류 0.
// 게임 내부는 window.__game(Phaser.Game)과 개발용 훅 window.__rescene(WorldScene)으로만 들여다본다.

type GameLike = {
  scene: { isActive(key: string): boolean; getScene(key: string): { children: { list: { visible: boolean; texture?: { key: string } }[] } } | null };
  textures: { exists(key: string): boolean; get(key: string): { getFrameNames(): string[] } };
  registry: { get(key: string): { state: { gauge: number; score: number; hearts: number } } | undefined };
};
type Hooks = { killAllEnemies(): void; fillGauge(): void; enemyCount(): number; sectionIndex(): number; sectionPhase(): string };
type Win = Window & { __game?: GameLike; __rescene?: Hooks };

// 헬퍼는 __game/__rescene 이 아직 없을 때 예외 대신 안전값을 돌려준다 — expect.poll 은 콜백 예외를
// 재시도하지 않고 바로 실패시키므로(page.goto 직후 __game 할당 전 평가되는 플레이키).
const isActive = (page: Page, key: string): Promise<boolean> =>
  page.evaluate((k) => (window as unknown as Win).__game?.scene.isActive(k) ?? false, key);
const hook = <T>(page: Page, fn: (h: Hooks) => T): Promise<T | null> =>
  page.evaluate((src) => {
    const h = (window as unknown as Win).__rescene;
    return h ? (new Function('h', `return (${src})(h)`) as (h: Hooks) => T)(h) : null;
  }, fn.toString());
const gauge = (page: Page): Promise<number | null> =>
  page.evaluate(() => (window as unknown as Win).__game?.registry.get('run')?.state.gauge ?? null);
const tap = async (page: Page, key: string, hold = 80): Promise<void> => {
  await page.keyboard.down(key);
  await page.waitForTimeout(hold);
  await page.keyboard.up(key);
};

test('stage 1: clears the first section, shows GO and fires a super without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect.poll(() => isActive(page, 'Title'), { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(300);

  await page.keyboard.press('Enter');                                   // 타이틀 → 캐릭터 선택
  await expect.poll(() => isActive(page, 'CharacterSelect'), { timeout: 5_000 }).toBe(true);
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');                                   // 원이 선택 → 인트로
  await expect.poll(() => isActive(page, 'Cutscene'), { timeout: 5_000 }).toBe(true);
  for (let i = 0; i < 6 && !(await isActive(page, 'World')); i++) {    // 인트로 줄 넘김 → 스테이지
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
  }
  await expect.poll(() => isActive(page, 'World'), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => isActive(page, 'Hud'), { timeout: 5_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => !!(window as unknown as Win).__rescene)).toBe(true);
  await page.waitForTimeout(400);

  // 새 에셋이 실제로 로드됐는지(플레이스홀더 대체가 아닌지)
  const frameCount = (key: string): Promise<number> =>
    page.evaluate((k) => (window as unknown as Win).__game?.textures.get(k).getFrameNames().length ?? 0, key);
  expect(await frameCount('player_woni')).toBe(15);
  expect(await frameCount('heart_woni')).toBe(2);
  expect(await page.evaluate(() => (window as unknown as Win).__game?.textures.exists('tiles_stage1') ?? false)).toBe(true);

  // 구간 A: 시작 즉시 잠기고 웨이브가 돈다. 오른쪽으로 조금 이동 + 점프 + 공격도 한 번씩 태운다.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(800);
  await page.keyboard.up('ArrowRight');
  await tap(page, 'Space');
  await page.waitForTimeout(150);
  await tap(page, 'KeyA');
  expect(await hook(page, (h) => h.sectionIndex())).toBe(0);
  await expect.poll(() => hook(page, (h) => h.enemyCount()), { timeout: 10_000 }).toBeGreaterThan(0);

  // 웨이브 2개(4 + 3마리)를 전멸시킨다: 살아 있는 적이 생길 때마다 전부 처치.
  for (let i = 0; i < 12 && (await hook(page, (h) => h.sectionPhase())) !== 'open'; i++) {
    await expect.poll(() => hook(page, (h) => h.enemyCount()), { timeout: 10_000 }).toBeGreaterThan(0);
    await hook(page, (h) => h.killAllEnemies());
  }
  expect(await hook(page, (h) => h.sectionPhase())).toBe('open');
  const goVisible = (): Promise<boolean> => page.evaluate(() => {
    const hud = (window as unknown as Win).__game?.scene.getScene('Hud');
    return !!hud && hud.children.list.some((o) => o.visible && o.texture?.key === 'hud_go');
  });
  await expect.poll(goVisible, { timeout: 2_000 }).toBe(true);
  const scoreAfterKills = await page.evaluate(() => (window as unknown as Win).__game?.registry.get('run')?.state.score ?? 0);
  expect(scoreAfterKills).toBeGreaterThan(0);

  // 필살기: 게이지를 채우고 S. 연출(1.2초) 뒤 게이지 0, 씬은 그대로 살아 있다.
  await hook(page, (h) => h.fillGauge());
  expect(await gauge(page)).toBe(100);
  await tap(page, 'KeyS');
  await expect.poll(() => gauge(page), { timeout: 3_000 }).toBe(0);
  await page.waitForTimeout(1500);                                      // 연출 종료(physics.resume)까지
  expect(await isActive(page, 'World')).toBe(true);

  await page.screenshot({ path: 'test-results/stage1.png' });
  expect(errors).toEqual([]);
});
