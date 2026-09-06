import { test, expect, type Page } from '@playwright/test';

// 스테이지 2~5 전 구간 주파: 개발용 훅으로 웨이브를 전멸시키고 잠금선을 넘어 각 스테이지 보스까지 간다.
// S3 구간 C 의 중간보스(TOP100 문지기)·S4 구간 D 의 점프대·보스 기믹(불사)까지 훑되, slayBoss 로
// 기믹을 무시하고 처치한다. 스테이지 5 뒤에는 결과 화면에서 Enter 로 엔딩까지 확인한다. 콘솔 오류는 0이어야 한다.

type SceneObject = { visible: boolean; texture?: { key: string } };
type GameLike = { scene: { isActive(key: string): boolean; getScene(key: string): { children: { list: SceneObject[] } } | null } };
type Hooks = {
  killAllEnemies(): void; enemyCount(): number; sectionIndex(): number; sectionPhase(): string;
  warp(x: number): void; lockLines(): number[]; bossHp(): number | null; bossName(): string | null; slayBoss(): void;
};
type Win = Window & { __game?: GameLike; __rescene?: Hooks };

// 헬퍼는 __game/__rescene 이 아직 없을 때 예외 대신 안전값(false/null)을 돌려준다 — expect.poll 은
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

const SAVE = { version: 2, highscores: [], unlockedStages: 5, codex: [], settings: { muted: true } };

/** 타이틀 → 메뉴 ↓ 한 칸(스테이지 셀렉트) → 스테이지 stageNumber 선택 → 캐릭터 선택 → 인트로 → World. */
async function enterStage(page: Page, stageNumber: number): Promise<void> {
  await page.addInitScript((save) => window.localStorage.setItem('rescene.arcade', JSON.stringify(save)), SAVE);
  await page.goto('/');
  await expect.poll(() => isActive(page, 'Title'), { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown');                                // 게임 시작 → 스테이지 셀렉트
  await page.waitForTimeout(150);                                        // Phaser 키 큐가 다음 프레임에 처리되므로 한 틱 준다
  await page.keyboard.press('Enter');
  await expect.poll(() => isActive(page, 'StageSelect'), { timeout: 5_000 }).toBe(true);
  await page.waitForTimeout(300);
  for (let i = 1; i < stageNumber; i++) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
  }
  await page.keyboard.press('Enter');
  await expect.poll(() => isActive(page, 'CharacterSelect'), { timeout: 5_000 }).toBe(true);
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await expect.poll(() => isActive(page, 'Cutscene'), { timeout: 5_000 }).toBe(true);
  for (let i = 0; i < 8 && !(await isActive(page, 'World')); i++) {      // 인트로 줄 넘김(스테이지 3줄) → World
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
  }
  await expect.poll(() => isActive(page, 'World'), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => !!(window as unknown as Win).__rescene)).toBe(true);
  await page.waitForTimeout(400);
}

/**
 * 현재 구간의 웨이브를 전부 전멸시켜 'open' 으로 만든다. `midBossName` 이 있으면(S3 구간 C) 웨이브 안에서
 * 나오는 중간보스가 그 이름이 되는 순간을 확인하고 slayBoss 로 처치한다(기믹·불사 무시).
 */
async function clearSection(page: Page, midBossName?: string): Promise<void> {
  let sawMidBoss = false;
  for (let i = 0; i < 20 && (await hook(page, (h) => h.sectionPhase())) !== 'open'; i++) {
    await expect.poll(() => hook(page, (h) => h.enemyCount()), { timeout: 10_000 }).toBeGreaterThan(0);
    // 이름 확인과 처치(또는 일반 전멸)를 한 번의 page.evaluate 안에서 원자적으로 한다 — 별도 왕복이면 그 사이
    // 게임 루프가 한 틱 더 돌아 중간보스가 나타났다가 killAllEnemies 에 같이 쓸려나가 이름을 못 볼 수 있다.
    const name = await hook(
      page,
      (h, mb: string | undefined) => {
        const n = h.bossName();
        if (mb && n === mb) { h.slayBoss(); return n; }
        h.killAllEnemies();
        return null;
      },
      midBossName,
    );
    if (midBossName && name === midBossName) sawMidBoss = true;
    await page.waitForTimeout(50);
  }
  expect(await hook(page, (h) => h.sectionPhase())).toBe('open');
  if (midBossName) expect(sawMidBoss).toBe(true);
}

/** 구간 A~D 를 전부 파훼하고 잠금선을 넘어 보스 앞(sectionIndex === 4)까지 간다. */
async function clearAllSections(page: Page, midBoss?: { sectionIndex: number; name: string }): Promise<void> {
  const lockLines = (await hook(page, (h) => h.lockLines())) ?? [];
  expect(lockLines.length).toBe(5);
  for (let i = 0; i < lockLines.length - 1; i++) {
    expect(await hook(page, (h) => h.sectionIndex())).toBe(i);
    await clearSection(page, midBoss?.sectionIndex === i ? midBoss.name : undefined);
    await hook(page, (h, x: number) => h.warp(x), lockLines[i]! + 40);   // 점프대(S4 구간 D)가 있어도 warp 로 통과
    await expect.poll(() => hook(page, (h) => h.sectionIndex()), { timeout: 3_000 }).toBe(i + 1);
  }
}

/** 스테이지 보스 등장 확인(bossName) → slayBoss(기믹 무시) → World/Hud 종료 → Result 활성. */
async function slayStageBoss(page: Page, name: string): Promise<void> {
  expect(await hook(page, (h) => h.sectionIndex())).toBe(4);
  await expect.poll(() => hook(page, (h) => h.bossHp()), { timeout: 5_000 }).not.toBeNull();
  expect(await hook(page, (h) => h.bossName())).toBe(name);
  await hook(page, (h) => h.slayBoss());
  await expect.poll(() => isActive(page, 'World'), { timeout: 5_000 }).toBe(false);
  await expect.poll(() => isActive(page, 'Hud'), { timeout: 5_000 }).toBe(false);
  await expect.poll(() => isActive(page, 'Result'), { timeout: 3_000 }).toBe(true);
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test('stage 2: 데뷔 — 구간 4개 주파 후 첫 카메라(렌즈 기믹) 처치', async ({ page }) => {
  const errors = trackErrors(page);
  await enterStage(page, 2);
  // 캐릭터 v2: 스테이지 2 는 데뷔 의상 시트(player_<m>_debut)로 플레이어를 만든다(첫 멤버 = 원이).
  const worldTextures = (): Promise<string[]> =>
    page.evaluate(() => ((window as unknown as Win).__game?.scene.getScene('World')?.children.list ?? []).map((o) => o.texture?.key ?? ''));
  expect(await worldTextures()).toContain('player_woni_debut');
  await page.screenshot({ path: 'test-results/stage2-world.png' });
  await clearAllSections(page);
  await slayStageBoss(page, '첫 카메라');
  await page.screenshot({ path: 'test-results/stage2.png' });
  expect(errors).toEqual([]);
});

test('stage 3: 신인의 길과 무명의 터널 — 구간 C 중간보스(TOP100 문지기) 포함 주파 후 침묵 처치', async ({ page }) => {
  const errors = trackErrors(page);
  await enterStage(page, 3);
  await clearAllSections(page, { sectionIndex: 2, name: 'TOP100 문지기' });
  await slayStageBoss(page, '침묵');
  await page.screenshot({ path: 'test-results/stage3.png' });
  expect(errors).toEqual([]);
});

test('stage 4: 역주행 — 점프대가 있는 구간 D도 warp 로 통과 후 카피캣 대장 처치', async ({ page }) => {
  const errors = trackErrors(page);
  await enterStage(page, 4);
  await clearAllSections(page);
  await slayStageBoss(page, '카피캣 대장');
  await page.screenshot({ path: 'test-results/stage4.png' });
  expect(errors).toEqual([]);
});

test('stage 5: 첫 1위 — 트로피 수호자 처치 후 결과 화면에서 Enter 로 엔딩까지', async ({ page }) => {
  const errors = trackErrors(page);
  await enterStage(page, 5);
  await clearAllSections(page);
  await slayStageBoss(page, '트로피 수호자');

  // ResultScene: 행 4개(500ms 간격) 다 뜬 뒤에야 Enter 가 먹는다(ROW_DELAY_MS*(rows+1) = 2500ms).
  await page.waitForTimeout(3_000);
  await page.keyboard.press('Enter');
  await expect.poll(() => isActive(page, 'Ending'), { timeout: 5_000 }).toBe(true);

  await page.screenshot({ path: 'test-results/stage5-ending.png' });
  expect(errors).toEqual([]);
});
