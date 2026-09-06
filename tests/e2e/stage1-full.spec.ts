import { test, expect, type Page } from '@playwright/test';

// 스테이지 1 전 구간 주파: 개발용 훅으로 웨이브를 전멸시키고 잠금선을 넘어 보스까지 간다.
// 엘리트 카드 드랍·상자·응원 NPC·보스 페이즈·사망 재시작·스테이지 클리어 전환에서 콘솔 오류가 없어야 한다.

type RunLike = { state: { gauge: number; score: number; hearts: number; lives: number; cards: string[]; stageIndex: number; maxHearts: number } };
type GameLike = { scene: { isActive(key: string): boolean }; registry: { get(key: string): RunLike | undefined } };
type Hooks = {
  killAllEnemies(): void; enemyCount(): number; sectionIndex(): number; sectionPhase(): string;
  warp(x: number): void; hurt(n: number): void; openChests(): void; pickupAll(): void; bossHp(): number | null;
};
type Win = Window & { __game: GameLike; __rescene?: Hooks };

const isActive = (page: Page, key: string): Promise<boolean> =>
  page.evaluate((k) => (window as unknown as Win).__game.scene.isActive(k), key);
// fn 은 페이지 안에서 문자열로 다시 만들어지므로 바깥 변수를 잡을 수 없다 — 값은 arg 로 넘긴다.
const hook = <T, A = undefined>(page: Page, fn: (h: Hooks, arg: A) => T, arg?: A): Promise<T> =>
  page.evaluate(
    ({ src, a }) => (new Function('h', 'a', `return (${src})(h, a)`) as (h: Hooks, a: unknown) => T)((window as unknown as Win).__rescene!, a),
    { src: fn.toString(), a: arg as unknown },
  );
const runState = (page: Page) => page.evaluate(() => (window as unknown as Win).__game.registry.get('run')!.state);

async function enterStage(page: Page): Promise<void> {
  await page.goto('/');
  await expect.poll(() => isActive(page, 'Title'), { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await expect.poll(() => isActive(page, 'CharacterSelect'), { timeout: 5_000 }).toBe(true);
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');                               // 리브(원거리) 경로도 태운다
  await page.keyboard.press('Enter');
  await expect.poll(() => isActive(page, 'Cutscene'), { timeout: 5_000 }).toBe(true);
  for (let i = 0; i < 6 && !(await isActive(page, 'World')); i++) {
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
  }
  await expect.poll(() => isActive(page, 'World'), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => !!(window as unknown as Win).__rescene)).toBe(true);
  await page.waitForTimeout(400);
}

/** 현재 구간의 웨이브를 전부 전멸시켜 'open' 으로 만든다. */
async function clearSection(page: Page): Promise<void> {
  for (let i = 0; i < 20 && (await hook(page, (h) => h.sectionPhase())) !== 'open'; i++) {
    await expect.poll(() => hook(page, (h) => h.enemyCount()), { timeout: 10_000 }).toBeGreaterThan(0);
    await hook(page, (h) => h.killAllEnemies());
    await page.waitForTimeout(50);
  }
  expect(await hook(page, (h) => h.sectionPhase())).toBe('open');
}

test('stage 1: full walkthrough to the boss, a death restart, and the clear transition', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await enterStage(page);

  // 잠금선 x(타일 24열 × 32px 단위): A 768 · B 1536 · C 2304 · D 3072 · 보스 3840
  const lockLines = [768, 1536, 2304, 3072];
  for (let i = 0; i < lockLines.length; i++) {
    expect(await hook(page, (h) => h.sectionIndex())).toBe(i);
    await clearSection(page);
    await page.waitForTimeout(700);                                     // 상자·드랍이 바닥에 닿을 시간
    await hook(page, (h) => h.openChests());
    await page.waitForTimeout(600);                                     // 상자 열림 → 아이템 튀어나옴
    await hook(page, (h) => h.pickupAll());
    await hook(page, (h, x: number) => h.warp(x), lockLines[i]! + 40);
    await page.waitForTimeout(250);
  }
  const afterD = await runState(page);
  expect(afterD.cards.length).toBeGreaterThanOrEqual(2);                // B·D 의 엘리트 카드 확정 드랍
  expect(afterD.score).toBeGreaterThan(0);

  // 보스 구간: 등장 확인 → 사망 → 같은 구간에서 재시작(목숨 -1) → 보스 다시 등장
  expect(await hook(page, (h) => h.sectionIndex())).toBe(4);
  await expect.poll(() => hook(page, (h) => h.bossHp()), { timeout: 5_000 }).not.toBeNull();
  await hook(page, (h) => h.hurt(99));
  await expect.poll(async () => (await runState(page)).lives, { timeout: 5_000 }).toBe(2);
  await expect.poll(() => hook(page, (h) => h.sectionIndex()), { timeout: 5_000 }).toBe(4);
  await expect.poll(() => hook(page, (h) => h.bossHp()), { timeout: 5_000 }).not.toBeNull();
  expect((await runState(page)).hearts).toBe(afterD.maxHearts);

  // 보스 처치 → 점수 보너스 반영 → World 종료(Result 로 전환 큐잉)
  const before = await runState(page);
  await hook(page, (h) => h.killAllEnemies());
  const after = await runState(page);
  expect(after.stageIndex).toBe(before.stageIndex + 1);
  expect(after.score).toBeGreaterThan(before.score + 3000);
  await expect.poll(() => isActive(page, 'World'), { timeout: 5_000 }).toBe(false);
  await expect.poll(() => isActive(page, 'Hud'), { timeout: 5_000 }).toBe(false);

  await page.screenshot({ path: 'test-results/stage1-full.png' });
  expect(errors).toEqual([]);
});
