import { test, expect, type Page } from '@playwright/test';

// 스테이지 1 전 구간 주파: 개발용 훅으로 웨이브를 전멸시키고 잠금선을 넘어 보스까지 간다.
// 엘리트 카드 드랍·상자·응원 NPC·보스 페이즈·사망 재시작·스테이지 클리어 전환에서 콘솔 오류가 없어야 한다.

type RunState = { gauge: number; score: number; hearts: number; lives: number; cards: string[]; stageIndex: number; maxHearts: number };
type GameLike = { scene: { isActive(key: string): boolean }; registry: { get(key: string): { state: RunState } | undefined } };
type Hooks = {
  killAllEnemies(): void; enemyCount(): number; sectionIndex(): number; sectionPhase(): string;
  warp(x: number): void; hurt(n: number): void; openChests(): void; pickupAll(): void; dropCount(): number;
  lockLines(): number[]; bossHp(): number | null;
};
type Win = Window & { __game?: GameLike; __rescene?: Hooks };

// 헬퍼는 __game/__rescene/run 이 아직 없을 때 예외 대신 안전값(false/null)을 돌려준다 — expect.poll 은
// 콜백 예외를 재시도하지 않고 바로 실패시키므로(page.goto 직후 __game 할당 전 평가되는 플레이키).
const isActive = (page: Page, key: string): Promise<boolean> =>
  page.evaluate((k) => (window as unknown as Win).__game?.scene.isActive(k) ?? false, key);
// fn 은 페이지 안에서 문자열로 다시 만들어지므로 바깥 변수를 잡을 수 없다 — 값은 arg 로 넘긴다.
const hook = <T, A = undefined>(page: Page, fn: (h: Hooks, arg: A) => T, arg?: A): Promise<T | null> =>
  page.evaluate(
    ({ src, a }) => {
      const h = (window as unknown as Win).__rescene;
      return h ? (new Function('h', 'a', `return (${src})(h, a)`) as (h: Hooks, a: unknown) => T)(h, a) : null;
    },
    { src: fn.toString(), a: arg as unknown },
  );
const runState = (page: Page): Promise<RunState | null> =>
  page.evaluate(() => (window as unknown as Win).__game?.registry.get('run')?.state ?? null);
/** run 이 등록된 뒤(World 진입 후)에만 쓴다. */
const state = async (page: Page): Promise<RunState> => {
  const s = await runState(page);
  if (!s) throw new Error('run is not registered yet — call after World is active');
  return s;
};

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

  // 잠금선 x 는 맵에서 읽는다(스테이지 1: 구간 4개 + 보스). 구간마다 전멸 → 상자 → 줍기 → 잠금선 넘기.
  const lockLines = (await hook(page, (h) => h.lockLines())) ?? [];
  expect(lockLines.length).toBe(5);
  const chestSections = [1, 3];                                         // stage1 데이터: B·D 에 chest·엘리트
  for (let i = 0; i < lockLines.length - 1; i++) {
    expect(await hook(page, (h) => h.sectionIndex())).toBe(i);
    await clearSection(page);
    const cardsBefore = (await state(page)).cards.length;
    if (chestSections.includes(i)) {
      const dropsBefore = (await hook(page, (h) => h.dropCount())) ?? 0;
      await hook(page, (h) => h.openChests());                          // 상자는 구간 클리어 즉시 생긴다
      await expect.poll(() => hook(page, (h) => h.dropCount()), { timeout: 3_000 }).toBeGreaterThan(dropsBefore);
    }
    await hook(page, (h) => h.pickupAll());
    if (chestSections.includes(i)) expect((await state(page)).cards.length).toBeGreaterThan(cardsBefore); // 엘리트 카드 확정
    await hook(page, (h, x: number) => h.warp(x), lockLines[i]! + 40);
    await expect.poll(() => hook(page, (h) => h.sectionIndex()), { timeout: 3_000 }).toBe(i + 1);
  }
  const afterD = await state(page);
  expect(afterD.cards.length).toBeGreaterThanOrEqual(2);
  expect(afterD.score).toBeGreaterThan(0);

  // 보스 구간: 등장 확인 → 사망 → 같은 구간에서 재시작(목숨 -1) → 보스 다시 등장
  expect(await hook(page, (h) => h.sectionIndex())).toBe(4);
  await expect.poll(() => hook(page, (h) => h.bossHp()), { timeout: 5_000 }).not.toBeNull();
  await hook(page, (h) => h.hurt(99));
  await expect.poll(async () => (await runState(page))?.lives, { timeout: 5_000 }).toBe(2);
  await expect.poll(() => hook(page, (h) => h.sectionIndex()), { timeout: 5_000 }).toBe(4);
  await expect.poll(() => hook(page, (h) => h.bossHp()), { timeout: 5_000 }).not.toBeNull();
  expect((await state(page)).hearts).toBe(afterD.maxHearts);

  // 보스 처치 → 점수 보너스 반영 → World 종료(Result 로 전환 큐잉)
  const before = await state(page);
  await hook(page, (h) => h.killAllEnemies());
  const after = await state(page);
  expect(after.stageIndex).toBe(before.stageIndex + 1);
  expect(after.score).toBeGreaterThan(before.score + 3000);
  await expect.poll(() => isActive(page, 'World'), { timeout: 5_000 }).toBe(false);
  await expect.poll(() => isActive(page, 'Hud'), { timeout: 5_000 }).toBe(false);

  await page.screenshot({ path: 'test-results/stage1-full.png' });
  expect(errors).toEqual([]);
});
