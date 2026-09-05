# 리센느스토리 수직 슬라이스 (M0~M4) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재의 단일 파일 Phaser 프로토타입을 Vite+TypeScript 프로젝트로 옮기고, 챕터 0(프롤로그)~챕터 1(연습생, 월말평가 보스)을 처음부터 끝까지 플레이·저장·재개할 수 있는 수직 슬라이스를 만든다.

**Architecture:** 전투·성장·이동·퀘스트·대화·저장 로직은 Phaser를 import하지 않는 순수 TS 모듈(`src/systems/`)로 만들고 Vitest로 검증한다. Phaser 씬(`src/scenes/`)은 입력을 시스템에 넘기고 결과를 그리는 얇은 계층이다. 콘텐츠(멤버·스킬·적·아이템·유행어·퀘스트·대사·맵)는 전부 `src/data/`와 `maps/`의 데이터이며 zod로 검증한다. 맵은 ASCII 텍스트를 Tiled 호환 JSON으로 변환하는 자체 도구로 만든다(나중에 Tiled로 교체 가능).

**Tech Stack:** Phaser 3.80+, TypeScript 5 (strict), Vite 5, Vitest 2, zod 3, tsx (도구 실행), Playwright (부트 스모크), ESLint 9 + typescript-eslint.

**Spec:** `docs/superpowers/specs/2026-09-04-rescene-story-design.md` (특히 3절 챕터 1 퀘스트, 4절 클래스/스탯, 6절 시스템, 8절 아키텍처·인터페이스·스키마)

## Global Constraints

- 해상도 960×540, Arcade 물리, 중력 `{ y: 800 }`, 타일 32px, `pixelArt: true`.
- `src/systems/**`와 `src/data/**`는 `phaser`를 import하지 않는다. (`tests/no-phaser-in-systems.test.ts`가 검사)
- 모든 데이터는 로딩 시 zod 스키마를 통과해야 하며, id 참조(퀘스트→NPC/맵/아이템/유행어)는 `tests/data-schema.test.ts`가 전수 검사한다.
- 실존 인물은 멤버 5인(활동명)과 역할 NPC만. 사진·음원·가사 미사용. 플레이스홀더 그래픽은 색 사각형 + 라벨 텍스트.
- 스탯 이름: hp 체력 · mp 기력 · atk 끼 · def 멘탈 · spd 스피드 · luk 기회. 레벨업당 SP 3. 경험치 곡선 `floor(50 × lv^1.8)`.
- 데미지 = `max(1, atk×배율 − def×0.5) × (크리 1.5) × (0.9~1.1)`. 크리 확률 `min(0.5, 0.05 + luk×0.01)`.
- 커밋 메시지는 `feat:`/`test:`/`chore:`/`docs:` 접두어. 모든 커밋 끝에 아래 두 줄을 트레일러로 붙인다.
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC
  ```
- 작업 브랜치: `rescene-rpg-prototype-5645721870396219010` (현재 브랜치). `main`에 직접 커밋하지 않는다.
- 각 태스크의 마지막에 `npm test`가 전부 통과해야 한다.

---

## 파일 구조 (이 계획이 만드는 것)

| 경로 | 책임 |
|---|---|
| `index.html`, `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.js`, `.gitignore` | 툴체인 |
| `src/main.ts` | `Phaser.Game` 생성, 씬 등록 |
| `src/config.ts` | 해상도·물리·타일 상수 |
| `src/core/EventBus.ts` | 타입 있는 on/off/emit (Phaser 비의존) |
| `src/core/GameState.ts` | 런타임 상태 단일 소스 + 스냅샷 |
| `src/core/AssetKeys.ts` | 텍스처/맵 키 상수 |
| `src/systems/types.ts` | Stats, PlayerState, MemberId 등 공용 타입 |
| `src/systems/progression.ts` | 경험치 곡선, 레벨업, 레벨별 스탯 |
| `src/systems/combat.ts` | 데미지 계산 |
| `src/systems/skills.ts` | 스킬 시전 가능 여부, 기력·쿨다운 |
| `src/systems/movement.ts` | 이동/점프/2단 점프/사다리 순수 로직 |
| `src/systems/inventory.ts` | 아이템 수량, 장비 슬롯 |
| `src/systems/memes.ts` | 유행어 해금·장착·패시브 합산 |
| `src/systems/quest.ts` | `QuestEngine` 상태 기계 |
| `src/systems/dialogue.ts` | `DialogueRunner` |
| `src/systems/save.ts` | 직렬화/역직렬화/마이그레이션, 저장소 어댑터 |
| `src/data/schema.ts` | 모든 데이터의 zod 스키마 + 타입 |
| `src/data/members.ts` `skills.ts` `enemies.ts` `items.ts` `memes.ts` `maps.ts` | 콘텐츠 데이터 |
| `src/data/chapters/ch0/*.ts`, `ch1/*.ts` | 챕터별 퀘스트·대사·NPC |
| `src/data/index.ts` | 데이터 전체를 모아 검증·내보내기 |
| `src/scenes/BootScene.ts` `PreloadScene.ts` `TitleScene.ts` `CharacterSelectScene.ts` | 시작 흐름 |
| `src/scenes/WorldScene.ts` | 맵 로드·엔티티 스폰·물리·카메라·입력 |
| `src/scenes/HudScene.ts` `DialogueScene.ts` `CutsceneScene.ts` | 오버레이 |
| `src/entities/Player.ts` `Enemy.ts` `Npc.ts` `Projectile.ts` `Portal.ts` `DropItem.ts` `ScentSavePoint.ts` | 월드 오브젝트 |
| `src/entities/Boss.ts` | 월말평가 심사위원단 페이즈 스크립트 |
| `src/ui/DamagePopup.ts` `Bar.ts` | HUD/월드 위젯 |
| `tools/ascii-map.ts` `tools/build-maps.ts` | ASCII 맵 → Tiled JSON 변환 |
| `maps/*.txt` → `public/assets/maps/*.json` | 맵 원본과 산출물 |
| `tests/**/*.test.ts`, `tests/e2e/boot.spec.ts` | Vitest 단위·데이터 테스트, Playwright 스모크 |

---

### Task 1: 툴체인 세팅과 프로토타입 이식

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.js`, `.gitignore`
- Modify: `index.html` (CDN 스크립트 제거, Vite 엔트리)
- Create: `src/main.ts`, `src/config.ts`, `src/scenes/WorldScene.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces: `GAME_WIDTH = 960`, `GAME_HEIGHT = 540`, `GRAVITY_Y = 800`, `TILE = 32` (`src/config.ts`); `WorldScene` 클래스(key `'World'`).

- [ ] **Step 1: package.json과 설정 파일 작성**

`package.json`:
```json
{
  "name": "rescene-story",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src tests tools",
    "maps": "tsx tools/build-maps.ts",
    "e2e": "playwright test"
  },
  "dependencies": {
    "phaser": "^3.80.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.0",
    "@playwright/test": "^1.46.0",
    "eslint": "^9.9.0",
    "tsx": "^4.17.0",
    "typescript": "^5.5.4",
    "typescript-eslint": "^8.2.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src", "tests", "tools"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173 },
});
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

`eslint.config.js`:
```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
```

`.gitignore`:
```
node_modules
dist
test-results
playwright-report
```

- [ ] **Step 2: index.html을 Vite 엔트리로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>리센느스토리 (RESCENE STORY)</title>
  <style>
    body { margin: 0; background: #1a1a2e; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { display: block; image-rendering: pixelated; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 3: 실패하는 테스트 작성**

`tests/config.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY_Y, TILE } from '../src/config';

describe('config', () => {
  it('uses the spec resolution and physics constants', () => {
    expect(GAME_WIDTH).toBe(960);
    expect(GAME_HEIGHT).toBe(540);
    expect(GRAVITY_Y).toBe(800);
    expect(TILE).toBe(32);
  });
});
```

- [ ] **Step 4: 의존성 설치 후 테스트가 실패하는지 확인**

Run: `npm install && npm test`
Expected: FAIL — `Cannot find module '../src/config'`

- [ ] **Step 5: config.ts, main.ts, WorldScene.ts 작성 (프로토타입 동작 그대로 이식)**

`src/config.ts`:
```ts
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const GRAVITY_Y = 800;
export const TILE = 32;
export const PLAYER_SPEED = 200;
export const PLAYER_JUMP_VELOCITY = -550;
```

`src/scenes/WorldScene.ts` (Task 13에서 전면 교체됨. 지금은 기존 프로토타입 동작만 유지):
```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_SPEED, PLAYER_JUMP_VELOCITY } from '../config';

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('World');
  }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x800080, 1).fillRect(0, 0, GAME_WIDTH, 40).generateTexture('ground', GAME_WIDTH, 40);
    g.clear().fillStyle(0xffc0cb, 1).fillRect(0, 0, 40, 60).generateTexture('playerTexture', 40, 60);
    g.destroy();

    const platforms = this.physics.add.staticGroup();
    platforms.create(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'ground');

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 120, 'playerTexture');
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, platforms);
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(): void {
    if (this.cursors.left.isDown) this.player.setVelocityX(-PLAYER_SPEED);
    else if (this.cursors.right.isDown) this.player.setVelocityX(PLAYER_SPEED);
    else this.player.setVelocityX(0);

    const onGround = this.player.body!.touching.down || this.player.body!.blocked.down;
    if ((this.cursors.up.isDown || this.cursors.space.isDown) && onGround) {
      this.player.setVelocityY(PLAYER_JUMP_VELOCITY);
    }
  }
}
```

`src/main.ts`:
```ts
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY_Y } from './config';
import { WorldScene } from './scenes/WorldScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: '#1a1a2e',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: GRAVITY_Y }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [WorldScene],
});
```

- [ ] **Step 6: 테스트·타입체크·개발 서버 확인**

Run: `npm test && npx tsc --noEmit && npm run dev -- --open`
Expected: 테스트 PASS, 타입 에러 0, 브라우저에 보라색 바닥 위 분홍 사각형이 좌우 이동·점프.

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json vite.config.ts vitest.config.ts tsconfig.json eslint.config.js .gitignore index.html src tests
git commit -m "chore: Vite+TypeScript+Vitest 툴체인으로 프로토타입 이식" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 2: 공용 타입과 성장 시스템 (progression)

**Files:**
- Create: `src/systems/types.ts`, `src/systems/progression.ts`
- Test: `tests/progression.test.ts`, `tests/no-phaser-in-systems.test.ts`

**Interfaces:**
- Produces:
  - `type StatKey = 'hp'|'mp'|'atk'|'def'|'spd'|'luk'`, `type Stats = Record<StatKey, number>`
  - `type MemberId = 'woni'|'liv'|'minami'|'may'|'zena'`
  - `interface PlayerState { member: MemberId; level: number; xp: number; sp: number; hp: number; mp: number; skillLevels: Record<string, number> }`
  - `MAX_LEVEL = 60`, `SP_PER_LEVEL = 3`
  - `xpForLevel(level: number): number` — 그 레벨에서 다음 레벨까지 필요한 경험치
  - `statsForLevel(base: Stats, growth: Stats, level: number): Stats`
  - `applyXp(state: PlayerState, xp: number): { state: PlayerState; levelsGained: number }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/progression.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { xpForLevel, statsForLevel, applyXp, MAX_LEVEL, SP_PER_LEVEL } from '../src/systems/progression';
import type { PlayerState, Stats } from '../src/systems/types';

const base: Stats = { hp: 120, mp: 40, atk: 8, def: 8, spd: 5, luk: 3 };
const growth: Stats = { hp: 12, mp: 3, atk: 1.2, def: 1.4, spd: 0.2, luk: 0.2 };

function player(level = 1, xp = 0): PlayerState {
  return { member: 'woni', level, xp, sp: 0, hp: 120, mp: 40, skillLevels: {} };
}

describe('xpForLevel', () => {
  it('follows floor(50 * lv^1.8)', () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(2)).toBe(Math.floor(50 * Math.pow(2, 1.8)));
    expect(xpForLevel(10)).toBe(Math.floor(50 * Math.pow(10, 1.8)));
  });
  it('is strictly increasing below max level', () => {
    for (let lv = 1; lv < MAX_LEVEL; lv++) expect(xpForLevel(lv + 1)).toBeGreaterThan(xpForLevel(lv));
  });
  it('is Infinity at max level', () => {
    expect(xpForLevel(MAX_LEVEL)).toBe(Infinity);
  });
});

describe('statsForLevel', () => {
  it('returns base stats at level 1', () => {
    expect(statsForLevel(base, growth, 1)).toEqual(base);
  });
  it('adds floor(growth * (level-1)) per stat', () => {
    const s = statsForLevel(base, growth, 11);
    expect(s.hp).toBe(120 + 120);
    expect(s.atk).toBe(8 + 12);
    expect(s.spd).toBe(5 + 2);
  });
});

describe('applyXp', () => {
  it('accumulates xp without leveling', () => {
    const r = applyXp(player(), 30);
    expect(r.state.level).toBe(1);
    expect(r.state.xp).toBe(30);
    expect(r.levelsGained).toBe(0);
  });
  it('levels up once, carries remainder, grants SP', () => {
    const r = applyXp(player(), 60);
    expect(r.state.level).toBe(2);
    expect(r.state.xp).toBe(10);
    expect(r.state.sp).toBe(SP_PER_LEVEL);
    expect(r.levelsGained).toBe(1);
  });
  it('levels up multiple times in one call', () => {
    const r = applyXp(player(), xpForLevel(1) + xpForLevel(2) + 5);
    expect(r.state.level).toBe(3);
    expect(r.state.xp).toBe(5);
    expect(r.state.sp).toBe(SP_PER_LEVEL * 2);
    expect(r.levelsGained).toBe(2);
  });
  it('caps at MAX_LEVEL and discards overflow', () => {
    const r = applyXp(player(MAX_LEVEL - 1, 0), 10_000_000);
    expect(r.state.level).toBe(MAX_LEVEL);
    expect(r.state.xp).toBe(0);
  });
  it('does not mutate input', () => {
    const p = player();
    applyXp(p, 500);
    expect(p.level).toBe(1);
    expect(p.xp).toBe(0);
  });
});
```

`tests/no-phaser-in-systems.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('systems and data stay engine-independent', () => {
  it('never import phaser', () => {
    const files = [...walk('src/systems'), ...walk('src/data')].filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/from ['"]phaser['"]/);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/systems/progression'` 및 `src/systems` 디렉터리 없음(ENOENT)

- [ ] **Step 3: 구현**

`src/systems/types.ts`:
```ts
export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'spd' | 'luk';
export type Stats = Record<StatKey, number>;
export const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'def', 'spd', 'luk'];

export type MemberId = 'woni' | 'liv' | 'minami' | 'may' | 'zena';
export const MEMBER_IDS: MemberId[] = ['woni', 'liv', 'minami', 'may', 'zena'];

export interface PlayerState {
  member: MemberId;
  level: number;
  xp: number;
  sp: number;
  hp: number;
  mp: number;
  skillLevels: Record<string, number>;
}
```

`src/systems/progression.ts`:
```ts
import { STAT_KEYS, type PlayerState, type Stats } from './types';

export const MAX_LEVEL = 60;
export const SP_PER_LEVEL = 3;

export function xpForLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(50 * Math.pow(level, 1.8));
}

export function statsForLevel(base: Stats, growth: Stats, level: number): Stats {
  const out = { ...base };
  for (const k of STAT_KEYS) out[k] = base[k] + Math.floor(growth[k] * (level - 1));
  return out;
}

export function applyXp(state: PlayerState, xp: number): { state: PlayerState; levelsGained: number } {
  let level = state.level;
  let pool = state.xp + xp;
  let sp = state.sp;
  let gained = 0;
  while (level < MAX_LEVEL && pool >= xpForLevel(level)) {
    pool -= xpForLevel(level);
    level += 1;
    sp += SP_PER_LEVEL;
    gained += 1;
  }
  if (level >= MAX_LEVEL) pool = 0;
  return { state: { ...state, level, xp: pool, sp }, levelsGained: gained };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS (config 1, progression 9, no-phaser 1)

- [ ] **Step 5: 커밋**

```bash
git add src/systems tests/progression.test.ts tests/no-phaser-in-systems.test.ts
git commit -m "feat: 공용 타입과 경험치/레벨 성장 시스템" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 3: 전투 계산 (combat)

**Files:**
- Create: `src/systems/combat.ts`
- Test: `tests/combat.test.ts`

**Interfaces:**
- Consumes: `Stats` (Task 2)
- Produces:
  - `interface DamageResult { amount: number; crit: boolean }`
  - `critChance(luk: number): number` — `min(0.5, 0.05 + luk × 0.01)`
  - `calculateDamage(attacker: Stats, defender: Stats, multiplier: number, rng: () => number): DamageResult` — `rng`는 두 번 호출된다: 1회차 크리 판정, 2회차 0.9~1.1 편차.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/combat.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { calculateDamage, critChance } from '../src/systems/combat';
import type { Stats } from '../src/systems/types';

const atk10: Stats = { hp: 100, mp: 10, atk: 10, def: 0, spd: 0, luk: 0 };
const def4: Stats = { hp: 100, mp: 10, atk: 0, def: 4, spd: 0, luk: 0 };

function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('critChance', () => {
  it('starts at 5% and adds 1% per luk, capped at 50%', () => {
    expect(critChance(0)).toBeCloseTo(0.05);
    expect(critChance(10)).toBeCloseTo(0.15);
    expect(critChance(100)).toBe(0.5);
  });
});

describe('calculateDamage', () => {
  it('applies atk*mult - def*0.5 with no crit and neutral variance', () => {
    // rng: 0.99 -> no crit, 0.5 -> variance 1.0
    const r = calculateDamage(atk10, def4, 1.0, seq(0.99, 0.5));
    expect(r).toEqual({ amount: 8, crit: false });
  });
  it('multiplies by 1.5 on crit', () => {
    const r = calculateDamage(atk10, def4, 1.0, seq(0.0, 0.5));
    expect(r).toEqual({ amount: 12, crit: true });
  });
  it('applies skill multiplier before defense', () => {
    const r = calculateDamage(atk10, def4, 2.0, seq(0.99, 0.5));
    expect(r.amount).toBe(18);
  });
  it('never goes below 1', () => {
    const tank: Stats = { ...def4, def: 999 };
    expect(calculateDamage(atk10, tank, 1.0, seq(0.99, 0.0)).amount).toBe(1);
  });
  it('varies between 0.9x and 1.1x', () => {
    const low = calculateDamage(atk10, def4, 1.0, seq(0.99, 0.0)).amount;
    const high = calculateDamage(atk10, def4, 1.0, seq(0.99, 0.999)).amount;
    expect(low).toBe(Math.round(8 * 0.9));
    expect(high).toBe(Math.round(8 * 1.1));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- combat`
Expected: FAIL — `Cannot find module '../src/systems/combat'`

- [ ] **Step 3: 구현**

`src/systems/combat.ts`:
```ts
import type { Stats } from './types';

export interface DamageResult {
  amount: number;
  crit: boolean;
}

export function critChance(luk: number): number {
  return Math.min(0.5, 0.05 + luk * 0.01);
}

export function calculateDamage(
  attacker: Stats,
  defender: Stats,
  multiplier: number,
  rng: () => number,
): DamageResult {
  const base = Math.max(1, attacker.atk * multiplier - defender.def * 0.5);
  const crit = rng() < critChance(attacker.luk);
  const variance = 0.9 + rng() * 0.2;
  const amount = Math.max(1, Math.round(base * (crit ? 1.5 : 1) * variance));
  return { amount, crit };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- combat`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/systems/combat.ts tests/combat.test.ts
git commit -m "feat: 데미지 계산 시스템" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 4: 데이터 스키마와 멤버·스킬 데이터

**Files:**
- Create: `src/data/schema.ts`, `src/data/members.ts`, `src/data/skills.ts`, `src/data/index.ts`
- Test: `tests/data-schema.test.ts`

**Interfaces:**
- Consumes: `Stats`, `MemberId` (Task 2)
- Produces (모두 `src/data/schema.ts`에서 export):
  - `MemberDef { id: MemberId; name; role; hometown; color; baseStats: Stats; growth: Stats; attack: 'melee'|'ranged'; weapon; skills: string[]; prologueMap: string }`
  - `SkillEffect` = `{kind:'melee'; width; height; knockback; centered?}` | `{kind:'projectile'; speed; range; pierce}` | `{kind:'dot'; ticks; intervalMs}` | `{kind:'buff'; stat: StatKey; ratio; durationMs}` | `{kind:'debuff'; stat: StatKey; ratio; durationMs}` | `{kind:'stun'; width; height; durationMs}` | `{kind:'counter'; windowMs; multiplier}` | `{kind:'heal'; ratio}`
  - `SkillDef { id; name; member: MemberId; level: number; mpCost; cooldownMs; multiplier; origin; effects: SkillEffect[] }`
  - `MEMBERS: MemberDef[]`, `SKILLS: SkillDef[]` (`src/data/members.ts`, `src/data/skills.ts`)
  - `getMember(id: MemberId): MemberDef`, `getSkill(id: string): SkillDef` (`src/data/index.ts`; 없는 id면 throw)
  - `validateAllData(): void` — 모든 데이터 스키마·참조 검사, 실패 시 throw (`src/data/index.ts`; 이후 태스크에서 검사 항목을 추가)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/data-schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { MEMBERS } from '../src/data/members';
import { SKILLS } from '../src/data/skills';
import { MemberDefSchema, SkillDefSchema } from '../src/data/schema';
import { getMember, getSkill, validateAllData } from '../src/data/index';
import { MEMBER_IDS } from '../src/systems/types';

describe('members', () => {
  it('has exactly the five members', () => {
    expect(MEMBERS.map((m) => m.id).sort()).toEqual([...MEMBER_IDS].sort());
  });
  it('every member passes the schema', () => {
    for (const m of MEMBERS) expect(() => MemberDefSchema.parse(m), m.id).not.toThrow();
  });
  it('every member references existing skills including a *_basic skill', () => {
    for (const m of MEMBERS) {
      expect(m.skills).toContain(`${m.id}_basic`);
      for (const s of m.skills) expect(() => getSkill(s), `${m.id} -> ${s}`).not.toThrow();
    }
  });
});

describe('skills', () => {
  it('every skill passes the schema and belongs to a member', () => {
    for (const s of SKILLS) {
      expect(() => SkillDefSchema.parse(s), s.id).not.toThrow();
      expect(getMember(s.member).skills, s.id).toContain(s.id);
    }
  });
  it('ids are unique', () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('basic skills cost no MP and have no cooldown longer than 500ms', () => {
    for (const s of SKILLS.filter((s) => s.id.endsWith('_basic'))) {
      expect(s.mpCost).toBe(0);
      expect(s.cooldownMs).toBeLessThanOrEqual(500);
      expect(s.level).toBe(1);
    }
  });
});

describe('validateAllData', () => {
  it('passes on shipped data', () => {
    expect(() => validateAllData()).not.toThrow();
  });
  it('getSkill throws on unknown id', () => {
    expect(() => getSkill('nope')).toThrow(/nope/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- data-schema`
Expected: FAIL — `Cannot find module '../src/data/members'`

- [ ] **Step 3: 스키마 작성**

`src/data/schema.ts`:
```ts
import { z } from 'zod';

export const StatKeySchema = z.enum(['hp', 'mp', 'atk', 'def', 'spd', 'luk']);
export const StatsSchema = z.object({
  hp: z.number(), mp: z.number(), atk: z.number(), def: z.number(), spd: z.number(), luk: z.number(),
});
export const MemberIdSchema = z.enum(['woni', 'liv', 'minami', 'may', 'zena']);

export const MemberDefSchema = z.object({
  id: MemberIdSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  hometown: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  baseStats: StatsSchema,
  growth: StatsSchema,
  attack: z.enum(['melee', 'ranged']),
  weapon: z.string().min(1),
  skills: z.array(z.string().min(1)).min(1),
  prologueMap: z.string().min(1),
});
export type MemberDef = z.infer<typeof MemberDefSchema>;

export const SkillEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('melee'), width: z.number().positive(), height: z.number().positive(), knockback: z.number().min(0), centered: z.boolean().optional() }),
  z.object({ kind: z.literal('projectile'), speed: z.number().positive(), range: z.number().positive(), pierce: z.boolean() }),
  z.object({ kind: z.literal('dot'), ticks: z.number().int().positive(), intervalMs: z.number().positive() }),
  z.object({ kind: z.literal('buff'), stat: StatKeySchema, ratio: z.number(), durationMs: z.number().positive() }),
  z.object({ kind: z.literal('debuff'), stat: StatKeySchema, ratio: z.number(), durationMs: z.number().positive() }),
  z.object({ kind: z.literal('stun'), width: z.number().positive(), height: z.number().positive(), durationMs: z.number().positive() }),
  z.object({ kind: z.literal('counter'), windowMs: z.number().positive(), multiplier: z.number().positive() }),
  z.object({ kind: z.literal('heal'), ratio: z.number().positive() }),
]);
export type SkillEffect = z.infer<typeof SkillEffectSchema>;

export const SkillDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  member: MemberIdSchema,
  level: z.number().int().min(1),
  mpCost: z.number().min(0),
  cooldownMs: z.number().min(0),
  multiplier: z.number().min(0),
  origin: z.string(),
  effects: z.array(SkillEffectSchema).min(1),
});
export type SkillDef = z.infer<typeof SkillDefSchema>;
```

- [ ] **Step 4: 멤버·스킬 데이터 작성**

`src/data/members.ts` (원이 외 공식 컬러는 미확인이라 임시값. 스탯은 스펙 4절 역할에 맞춘 초기 밸런스):
```ts
import type { MemberDef } from './schema';

export const MEMBERS: MemberDef[] = [
  {
    id: 'woni', name: '원이', role: '리더 · 서브보컬', hometown: '거제', color: '#045a42',
    baseStats: { hp: 120, mp: 40, atk: 8, def: 8, spd: 5, luk: 3 },
    growth: { hp: 12, mp: 3, atk: 1.2, def: 1.4, spd: 0.2, luk: 0.2 },
    attack: 'melee', weapon: '마이크 스탠드',
    skills: ['woni_basic', 'woni_ui', 'woni_ma'], prologueMap: 'ch0_geoje',
  },
  {
    id: 'liv', name: '리브', role: '메인보컬', hometown: '수원', color: '#ffb3c6',
    baseStats: { hp: 90, mp: 60, atk: 11, def: 5, spd: 5, luk: 4 },
    growth: { hp: 8, mp: 5, atk: 1.6, def: 0.8, spd: 0.2, luk: 0.3 },
    attack: 'ranged', weapon: '핸드 마이크',
    skills: ['liv_basic', 'liv_pitch', 'liv_thumb'], prologueMap: 'ch0_suwon',
  },
  {
    id: 'minami', name: '미나미', role: '메인보컬 · 메인댄서', hometown: '치바', color: '#ffd166',
    baseStats: { hp: 100, mp: 80, atk: 10, def: 6, spd: 6, luk: 3 },
    growth: { hp: 9, mp: 7, atk: 1.4, def: 1.0, spd: 0.3, luk: 0.2 },
    attack: 'ranged', weapon: '붓',
    skills: ['minami_basic', 'minami_brush', 'minami_gal'], prologueMap: 'ch0_chiba',
  },
  {
    id: 'may', name: '메이', role: '서브보컬 · 킬링파트', hometown: '고양', color: '#ffe08a',
    baseStats: { hp: 95, mp: 70, atk: 8, def: 6, spd: 7, luk: 6 },
    growth: { hp: 9, mp: 6, atk: 1.1, def: 1.0, spd: 0.4, luk: 0.5 },
    attack: 'ranged', weapon: '스티커',
    skills: ['may_basic', 'may_chatter', 'may_focus'], prologueMap: 'ch0_goyang',
  },
  {
    id: 'zena', name: '제나', role: '메인댄서 · 리드보컬', hometown: '경주', color: '#c77dff',
    baseStats: { hp: 100, mp: 50, atk: 10, def: 5, spd: 8, luk: 4 },
    growth: { hp: 10, mp: 4, atk: 1.5, def: 0.8, spd: 0.5, luk: 0.3 },
    attack: 'melee', weapon: '헤어핀',
    skills: ['zena_basic', 'zena_turn', 'zena_ani'], prologueMap: 'ch0_gyeongju',
  },
];
```

`src/data/skills.ts` (수직 슬라이스: 기본 공격 + Lv1 + Lv5. Lv10 이상은 M5 계획에서 추가):
```ts
import type { SkillDef } from './schema';

export const SKILLS: SkillDef[] = [
  // 기본 공격
  { id: 'woni_basic', name: '스탠드 휘두르기', member: 'woni', level: 1, mpCost: 0, cooldownMs: 400, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'melee', width: 48, height: 40, knockback: 120 }] },
  { id: 'liv_basic', name: '음파', member: 'liv', level: 1, mpCost: 0, cooldownMs: 450, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 500, range: 320, pierce: false }] },
  { id: 'minami_basic', name: '먹물 튀기기', member: 'minami', level: 1, mpCost: 0, cooldownMs: 450, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 480, range: 280, pierce: false }] },
  { id: 'may_basic', name: '스티커 던지기', member: 'may', level: 1, mpCost: 0, cooldownMs: 400, multiplier: 0.9, origin: '기본 공격',
    effects: [{ kind: 'projectile', speed: 450, range: 260, pierce: false }] },
  { id: 'zena_basic', name: '헤어핀 베기', member: 'zena', level: 1, mpCost: 0, cooldownMs: 350, multiplier: 1.0, origin: '기본 공격',
    effects: [{ kind: 'melee', width: 44, height: 44, knockback: 100 }] },

  // Lv1 시그니처
  { id: 'woni_ui', name: '우이!', member: 'woni', level: 1, mpCost: 8, cooldownMs: 4000, multiplier: 1.4, origin: '시그니처 감탄사',
    effects: [{ kind: 'melee', width: 96, height: 48, knockback: 200 }, { kind: 'buff', stat: 'atk', ratio: 0.10, durationMs: 8000 }] },
  { id: 'liv_pitch', name: '고음 안정', member: 'liv', level: 1, mpCost: 8, cooldownMs: 3000, multiplier: 1.3, origin: '라이브 음정이 흔들리지 않는 메인보컬',
    effects: [{ kind: 'projectile', speed: 520, range: 400, pierce: true }] },
  { id: 'minami_brush', name: '일필휘지', member: 'minami', level: 1, mpCost: 10, cooldownMs: 3500, multiplier: 1.5, origin: '서예 8년, 치바현 대회 1등',
    effects: [{ kind: 'projectile', speed: 700, range: 300, pierce: true }] },
  { id: 'may_chatter', name: '쫑알쫑알', member: 'may', level: 1, mpCost: 8, cooldownMs: 3000, multiplier: 0.5, origin: '별명 쫑알메이 · 메찬호',
    effects: [{ kind: 'projectile', speed: 400, range: 240, pierce: false }, { kind: 'dot', ticks: 5, intervalMs: 500 }] },
  { id: 'zena_turn', name: '까엉턴', member: 'zena', level: 1, mpCost: 8, cooldownMs: 3000, multiplier: 1.3, origin: '시그니처 딥 턴',
    effects: [{ kind: 'melee', width: 72, height: 56, knockback: 150, centered: true }] },

  // Lv5
  { id: 'woni_ma', name: '마! 니 뭐!', member: 'woni', level: 5, mpCost: 12, cooldownMs: 8000, multiplier: 1.0, origin: '경상도 사투리 경고',
    effects: [{ kind: 'stun', width: 80, height: 48, durationMs: 1500 }] },
  { id: 'liv_thumb', name: '왕따봉', member: 'liv', level: 5, mpCost: 10, cooldownMs: 5000, multiplier: 1.6, origin: '수원 왕발가락 개인기',
    effects: [{ kind: 'melee', width: 56, height: 48, knockback: 320 }] },
  { id: 'minami_gal', name: '쵸베리구', member: 'minami', level: 5, mpCost: 15, cooldownMs: 12000, multiplier: 0, origin: '갸루 표현 "완전 좋다"',
    effects: [{ kind: 'buff', stat: 'atk', ratio: 0.15, durationMs: 10000 }] },
  { id: 'may_focus', name: '집쭝!', member: 'may', level: 5, mpCost: 10, cooldownMs: 6000, multiplier: 0.8, origin: '라이브 시청자 집중 요청',
    effects: [{ kind: 'projectile', speed: 450, range: 260, pierce: false }, { kind: 'debuff', stat: 'def', ratio: -0.20, durationMs: 6000 }] },
  { id: 'zena_ani', name: '아뉘이이이!', member: 'zena', level: 5, mpCost: 12, cooldownMs: 7000, multiplier: 3.0, origin: '시그니처 투정',
    effects: [{ kind: 'counter', windowMs: 1000, multiplier: 3.0 }] },
];
```

`src/data/index.ts`:
```ts
import type { MemberId } from '../systems/types';
import { MemberDefSchema, SkillDefSchema, type MemberDef, type SkillDef } from './schema';
import { MEMBERS } from './members';
import { SKILLS } from './skills';

export { MEMBERS, SKILLS };

const memberById = new Map(MEMBERS.map((m) => [m.id, m]));
const skillById = new Map(SKILLS.map((s) => [s.id, s]));

export function getMember(id: MemberId): MemberDef {
  const m = memberById.get(id);
  if (!m) throw new Error(`unknown member: ${id}`);
  return m;
}

export function getSkill(id: string): SkillDef {
  const s = skillById.get(id);
  if (!s) throw new Error(`unknown skill: ${id}`);
  return s;
}

function assertUnique(label: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

/** 모든 데이터의 스키마와 id 참조를 검사한다. 이후 태스크가 검사 항목을 여기에 추가한다. */
export function validateAllData(): void {
  MEMBERS.forEach((m) => MemberDefSchema.parse(m));
  SKILLS.forEach((s) => SkillDefSchema.parse(s));
  assertUnique('member', MEMBERS.map((m) => m.id));
  assertUnique('skill', SKILLS.map((s) => s.id));
  for (const m of MEMBERS) {
    for (const sid of m.skills) {
      const s = getSkill(sid);
      if (s.member !== m.id) throw new Error(`skill ${sid} belongs to ${s.member}, listed under ${m.id}`);
    }
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- data-schema`
Expected: PASS (8 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/data tests/data-schema.test.ts
git commit -m "feat: zod 데이터 스키마와 멤버 5인·스킬 15종 데이터" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 5: 스킬 시전 시스템 (skills)

**Files:**
- Create: `src/systems/skills.ts`
- Test: `tests/skills.test.ts`

**Interfaces:**
- Consumes: `SkillDef` (Task 4), `PlayerState` (Task 2)
- Produces:
  - `interface SkillRuntime { cooldownUntil: Record<string, number> }`
  - `emptySkillRuntime(): SkillRuntime`
  - `type CastCheck = { ok: true } | { ok: false; reason: 'member'|'level'|'mp'|'cooldown' }`
  - `canCast(skill, player, rt, now): CastCheck` — `now`는 ms
  - `cast(skill, player, rt, now): { player: PlayerState; rt: SkillRuntime }` — 기력 차감, 쿨다운 설정. `canCast`가 false면 throw
  - `skillLevelOf(player, skillId): number` — 미설정이면 1
  - `skillMultiplier(skill, skillLevel): number` — `skill.multiplier × (1 + 0.05 × (skillLevel − 1))`
  - `raiseSkill(player, skillId): PlayerState` — SP 1 소모, 최대 10. SP 없거나 최대면 그대로 반환

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/skills.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { canCast, cast, emptySkillRuntime, raiseSkill, skillLevelOf, skillMultiplier } from '../src/systems/skills';
import { getSkill } from '../src/data/index';
import type { PlayerState } from '../src/systems/types';

function woni(over: Partial<PlayerState> = {}): PlayerState {
  return { member: 'woni', level: 1, xp: 0, sp: 0, hp: 120, mp: 40, skillLevels: {}, ...over };
}

describe('canCast', () => {
  it('allows a level-1 skill with enough mp', () => {
    expect(canCast(getSkill('woni_ui'), woni(), emptySkillRuntime(), 0)).toEqual({ ok: true });
  });
  it('rejects another member skill', () => {
    expect(canCast(getSkill('liv_pitch'), woni(), emptySkillRuntime(), 0)).toEqual({ ok: false, reason: 'member' });
  });
  it('rejects a skill above player level', () => {
    expect(canCast(getSkill('woni_ma'), woni({ level: 4 }), emptySkillRuntime(), 0)).toEqual({ ok: false, reason: 'level' });
    expect(canCast(getSkill('woni_ma'), woni({ level: 5 }), emptySkillRuntime(), 0)).toEqual({ ok: true });
  });
  it('rejects when mp is short', () => {
    expect(canCast(getSkill('woni_ui'), woni({ mp: 7 }), emptySkillRuntime(), 0)).toEqual({ ok: false, reason: 'mp' });
  });
  it('rejects during cooldown', () => {
    const rt = { cooldownUntil: { woni_ui: 5000 } };
    expect(canCast(getSkill('woni_ui'), woni(), rt, 4999)).toEqual({ ok: false, reason: 'cooldown' });
    expect(canCast(getSkill('woni_ui'), woni(), rt, 5000)).toEqual({ ok: true });
  });
});

describe('cast', () => {
  it('deducts mp and sets cooldown', () => {
    const r = cast(getSkill('woni_ui'), woni(), emptySkillRuntime(), 1000);
    expect(r.player.mp).toBe(32);
    expect(r.rt.cooldownUntil.woni_ui).toBe(5000);
  });
  it('throws when not castable', () => {
    expect(() => cast(getSkill('woni_ui'), woni({ mp: 0 }), emptySkillRuntime(), 0)).toThrow(/mp/);
  });
});

describe('skill levels', () => {
  it('defaults to level 1 and scales multiplier 5% per level', () => {
    const s = getSkill('woni_ui');
    expect(skillLevelOf(woni(), 'woni_ui')).toBe(1);
    expect(skillMultiplier(s, 1)).toBeCloseTo(1.4);
    expect(skillMultiplier(s, 3)).toBeCloseTo(1.4 * 1.1);
  });
  it('raiseSkill spends one SP up to level 10', () => {
    let p = woni({ sp: 2 });
    p = raiseSkill(p, 'woni_ui');
    expect(p.skillLevels.woni_ui).toBe(2);
    expect(p.sp).toBe(1);
    p = raiseSkill(raiseSkill(p, 'woni_ui'), 'woni_ui');
    expect(p.skillLevels.woni_ui).toBe(3);
    expect(p.sp).toBe(0);
  });
  it('raiseSkill refuses at max level', () => {
    const p = woni({ sp: 5, skillLevels: { woni_ui: 10 } });
    expect(raiseSkill(p, 'woni_ui')).toEqual(p);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- skills`
Expected: FAIL — `Cannot find module '../src/systems/skills'`

- [ ] **Step 3: 구현**

`src/systems/skills.ts`:
```ts
import type { SkillDef } from '../data/schema';
import type { PlayerState } from './types';

export const MAX_SKILL_LEVEL = 10;

export interface SkillRuntime {
  cooldownUntil: Record<string, number>;
}

export function emptySkillRuntime(): SkillRuntime {
  return { cooldownUntil: {} };
}

export type CastCheck = { ok: true } | { ok: false; reason: 'member' | 'level' | 'mp' | 'cooldown' };

export function canCast(skill: SkillDef, player: PlayerState, rt: SkillRuntime, now: number): CastCheck {
  if (skill.member !== player.member) return { ok: false, reason: 'member' };
  if (player.level < skill.level) return { ok: false, reason: 'level' };
  if (player.mp < skill.mpCost) return { ok: false, reason: 'mp' };
  if ((rt.cooldownUntil[skill.id] ?? 0) > now) return { ok: false, reason: 'cooldown' };
  return { ok: true };
}

export function cast(
  skill: SkillDef,
  player: PlayerState,
  rt: SkillRuntime,
  now: number,
): { player: PlayerState; rt: SkillRuntime } {
  const check = canCast(skill, player, rt, now);
  if (!check.ok) throw new Error(`cannot cast ${skill.id}: ${check.reason}`);
  return {
    player: { ...player, mp: player.mp - skill.mpCost },
    rt: { cooldownUntil: { ...rt.cooldownUntil, [skill.id]: now + skill.cooldownMs } },
  };
}

export function skillLevelOf(player: PlayerState, skillId: string): number {
  return player.skillLevels[skillId] ?? 1;
}

export function skillMultiplier(skill: SkillDef, skillLevel: number): number {
  return skill.multiplier * (1 + 0.05 * (skillLevel - 1));
}

export function raiseSkill(player: PlayerState, skillId: string): PlayerState {
  const current = skillLevelOf(player, skillId);
  if (player.sp <= 0 || current >= MAX_SKILL_LEVEL) return player;
  return { ...player, sp: player.sp - 1, skillLevels: { ...player.skillLevels, [skillId]: current + 1 } };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- skills`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/systems/skills.ts tests/skills.test.ts
git commit -m "feat: 스킬 시전 판정·기력·쿨다운·강화 시스템" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 6: 적·아이템·유행어 데이터와 인벤토리·유행어 시스템

**Files:**
- Modify: `src/data/schema.ts` (Enemy/Item/Meme 스키마 추가), `src/data/index.ts` (getter·검증 추가)
- Create: `src/data/enemies.ts`, `src/data/items.ts`, `src/data/memes.ts`, `src/systems/inventory.ts`, `src/systems/memes.ts`
- Test: `tests/inventory.test.ts`, `tests/memes.test.ts`, `tests/data-schema.test.ts` (케이스 추가)

**Interfaces:**
- Produces (schema.ts):
  - `EnemyDef { id; name; chapter; hp; atk; def; spd; xp; hearts: [min, max]; ai: 'patrol'|'chase'|'boss'; width; height; color; drops: {itemId; chance}[] }`
  - `ItemDef` = `{type:'consumable'; id; name; description; price; heal:{hp?; mp?}}` | `{type:'equip'; …; slot: EquipSlot; stats: Partial<Stats>}` | `{type:'etc'; …}` | `{type:'photocard'; …; member}`
  - `type EquipSlot = 'inear'|'outfit'|'mic'|'shoes'`
  - `type PassiveKey = StatKey | 'aoeRange'|'foodHeal'|'fameGain'|'statusDuration'`
  - `MemeDef { id; member; text; origin; note; passive?: { key: PassiveKey; value: number } }`
- Produces (index.ts): `ENEMIES`, `ITEMS`, `MEMES` 재export, `getEnemy(id)`, `getItem(id)`, `getMeme(id)` (없으면 throw)
- Produces (inventory.ts): `InventoryState { items: Record<string, number>; equipment: Record<EquipSlot, string|null> }`, `emptyInventory()`, `addItem(inv, id, n=1)`, `removeItem(inv, id, n=1)` (부족하면 throw), `countOf(inv, id)`, `equipItem(inv, item: ItemDef)` (equip 타입 아니면 throw, 기존 장비는 가방으로), `equipmentStats(inv, getItem): Partial<Stats>`
- Produces (memes.ts): `MemeState { unlocked: string[]; equipped: (string|null)[] }`, `emptyMemeState(slots=1)`, `unlockMeme(s, id)` (멱등), `equipMeme(s, slot, id)` (미해금/슬롯 범위 밖이면 throw), `openMemeSlot(s)`, `passiveTotals(s, getMeme): Partial<Record<PassiveKey, number>>`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/inventory.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { addItem, countOf, emptyInventory, equipItem, equipmentStats, removeItem } from '../src/systems/inventory';
import { getItem } from '../src/data/index';

describe('inventory items', () => {
  it('adds and counts', () => {
    const inv = addItem(addItem(emptyInventory(), 'food_mulhoe'), 'food_mulhoe', 2);
    expect(countOf(inv, 'food_mulhoe')).toBe(3);
    expect(countOf(inv, 'nothing')).toBe(0);
  });
  it('removes and deletes the key at zero', () => {
    const inv = removeItem(addItem(emptyInventory(), 'food_mulhoe', 2), 'food_mulhoe', 2);
    expect(inv.items).toEqual({});
  });
  it('throws when removing more than owned', () => {
    expect(() => removeItem(emptyInventory(), 'food_mulhoe')).toThrow(/food_mulhoe/);
  });
});

describe('equipment', () => {
  it('moves an equip item from bag to slot and back', () => {
    let inv = addItem(emptyInventory(), 'equip_inear_basic');
    inv = equipItem(inv, getItem('equip_inear_basic'));
    expect(inv.equipment.inear).toBe('equip_inear_basic');
    expect(countOf(inv, 'equip_inear_basic')).toBe(0);
    inv = addItem(inv, 'equip_inear_basic');
    inv = equipItem(inv, getItem('equip_inear_basic'));
    expect(countOf(inv, 'equip_inear_basic')).toBe(1);
  });
  it('refuses non-equip items', () => {
    expect(() => equipItem(addItem(emptyInventory(), 'food_mulhoe'), getItem('food_mulhoe'))).toThrow(/equip/);
  });
  it('sums equipment stats', () => {
    const inv = equipItem(addItem(emptyInventory(), 'equip_inear_basic'), getItem('equip_inear_basic'));
    expect(equipmentStats(inv, getItem)).toEqual({ def: 2 });
  });
});
```

`tests/memes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { emptyMemeState, equipMeme, openMemeSlot, passiveTotals, unlockMeme } from '../src/systems/memes';
import { getMeme } from '../src/data/index';

describe('meme codex', () => {
  it('unlocks idempotently', () => {
    const s = unlockMeme(unlockMeme(emptyMemeState(), 'may_grip'), 'may_grip');
    expect(s.unlocked).toEqual(['may_grip']);
  });
  it('equips only unlocked memes into existing slots', () => {
    const s = unlockMeme(emptyMemeState(1), 'may_grip');
    expect(equipMeme(s, 0, 'may_grip').equipped).toEqual(['may_grip']);
    expect(() => equipMeme(s, 1, 'may_grip')).toThrow(/slot/);
    expect(() => equipMeme(s, 0, 'woni_ui')).toThrow(/unlocked/);
  });
  it('opens new slots', () => {
    expect(openMemeSlot(emptyMemeState(1)).equipped).toEqual([null, null]);
  });
  it('sums passives of equipped memes', () => {
    let s = unlockMeme(unlockMeme(emptyMemeState(2), 'may_grip'), 'minami_yaho');
    s = equipMeme(equipMeme(s, 0, 'may_grip'), 1, 'minami_yaho');
    expect(passiveTotals(s, getMeme)).toEqual({ luk: 5, aoeRange: 0.1 });
  });
});
```

`tests/data-schema.test.ts`에 추가:
```ts
import { ENEMIES, ITEMS, MEMES, getEnemy, getItem, getMeme } from '../src/data/index';
import { EnemyDefSchema, ItemDefSchema, MemeDefSchema } from '../src/data/schema';

describe('enemies, items, memes', () => {
  it('pass their schemas', () => {
    ENEMIES.forEach((e) => expect(() => EnemyDefSchema.parse(e), e.id).not.toThrow());
    ITEMS.forEach((i) => expect(() => ItemDefSchema.parse(i), i.id).not.toThrow());
    MEMES.forEach((m) => expect(() => MemeDefSchema.parse(m), m.id).not.toThrow());
  });
  it('enemy drops reference existing items', () => {
    for (const e of ENEMIES) for (const d of e.drops) expect(() => getItem(d.itemId), `${e.id} -> ${d.itemId}`).not.toThrow();
  });
  it('has one signature food per member', () => {
    const foods = ITEMS.filter((i) => i.type === 'consumable');
    expect(foods.map((f) => f.id).sort()).toEqual(['food_malatang', 'food_mulhoe', 'food_seolleongtang', 'food_tteokguk', 'food_yeopddeok']);
  });
  it('getters throw on unknown ids', () => {
    expect(() => getEnemy('x')).toThrow(/x/);
    expect(() => getMeme('x')).toThrow(/x/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `inventory`, `memes` 모듈 없음, `ENEMIES` export 없음

- [ ] **Step 3: 스키마 추가**

`src/data/schema.ts` 끝에 추가:
```ts
export const EnemyDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chapter: z.number().int().min(0),
  hp: z.number().positive(),
  atk: z.number().min(0),
  def: z.number().min(0),
  spd: z.number().min(0),
  xp: z.number().int().min(0),
  hearts: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  ai: z.enum(['patrol', 'chase', 'boss']),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  drops: z.array(z.object({ itemId: z.string().min(1), chance: z.number().min(0).max(1) })),
});
export type EnemyDef = z.infer<typeof EnemyDefSchema>;

export const EquipSlotSchema = z.enum(['inear', 'outfit', 'mic', 'shoes']);
export type EquipSlot = z.infer<typeof EquipSlotSchema>;

const ItemBase = { id: z.string().min(1), name: z.string().min(1), description: z.string(), price: z.number().int().min(0) };
export const ItemDefSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('consumable'), ...ItemBase, heal: z.object({ hp: z.number().optional(), mp: z.number().optional() }) }),
  z.object({ type: z.literal('equip'), ...ItemBase, slot: EquipSlotSchema, stats: StatsSchema.partial() }),
  z.object({ type: z.literal('etc'), ...ItemBase }),
  z.object({ type: z.literal('photocard'), ...ItemBase, member: MemberIdSchema }),
]);
export type ItemDef = z.infer<typeof ItemDefSchema>;

export const PassiveKeySchema = z.enum(['hp', 'mp', 'atk', 'def', 'spd', 'luk', 'aoeRange', 'foodHeal', 'fameGain', 'statusDuration']);
export type PassiveKey = z.infer<typeof PassiveKeySchema>;

export const MemeDefSchema = z.object({
  id: z.string().min(1),
  member: MemberIdSchema,
  text: z.string().min(1),
  origin: z.string().min(1),
  note: z.string(),
  passive: z.object({ key: PassiveKeySchema, value: z.number() }).optional(),
});
export type MemeDef = z.infer<typeof MemeDefSchema>;
```

- [ ] **Step 4: 데이터 작성**

`src/data/enemies.ts` (챕터 1 잡몹 4종 + 보스. 보스 수치는 Task 22에서 페이즈로 나눠 쓴다):
```ts
import type { EnemyDef } from './schema';

export const ENEMIES: EnemyDef[] = [
  { id: 'enemy_sleep_slime', name: '졸음 슬라임', chapter: 1, hp: 30, atk: 4, def: 1, spd: 40, xp: 12, hearts: [3, 6],
    ai: 'patrol', width: 36, height: 28, color: '#7aa2f7', drops: [{ itemId: 'food_mulhoe', chance: 0.05 }] },
  { id: 'enemy_sore_mushroom', name: '근육통 버섯', chapter: 1, hp: 45, atk: 6, def: 3, spd: 30, xp: 18, hearts: [4, 8],
    ai: 'patrol', width: 32, height: 36, color: '#e0af68', drops: [{ itemId: 'food_yeopddeok', chance: 0.05 }, { itemId: 'etc_snack_ingredient', chance: 0.5 }] },
  { id: 'enemy_offbeat_metronome', name: '박자이탈 메트로놈', chapter: 1, hp: 40, atk: 7, def: 2, spd: 90, xp: 22, hearts: [5, 9],
    ai: 'chase', width: 28, height: 40, color: '#f7768e', drops: [{ itemId: 'food_tteokguk', chance: 0.05 }] },
  { id: 'enemy_selfdoubt', name: '자기의심 그림자', chapter: 1, hp: 70, atk: 9, def: 4, spd: 70, xp: 35, hearts: [8, 14],
    ai: 'chase', width: 40, height: 56, color: '#565f89', drops: [{ itemId: 'food_seolleongtang', chance: 0.08 }, { itemId: 'photocard_may_rescene', chance: 0.03 }] },
  { id: 'boss_monthly_judges', name: '월말평가 심사위원단', chapter: 1, hp: 600, atk: 12, def: 6, spd: 60, xp: 400, hearts: [120, 160],
    ai: 'boss', width: 96, height: 96, color: '#bb9af7', drops: [{ itemId: 'equip_inear_basic', chance: 1 }] },
];
```

`src/data/items.ts`:
```ts
import type { ItemDef } from './schema';

export const ITEMS: ItemDef[] = [
  { type: 'consumable', id: 'food_mulhoe', name: '물회', description: '원이의 최애. 체력 40 회복.', price: 30, heal: { hp: 40 } },
  { type: 'consumable', id: 'food_yeopddeok', name: '엽떡', description: '리브의 최애. 체력 50 회복.', price: 35, heal: { hp: 50 } },
  { type: 'consumable', id: 'food_seolleongtang', name: '설렁탕', description: '미나미의 최애. 체력 30, 기력 20 회복.', price: 40, heal: { hp: 30, mp: 20 } },
  { type: 'consumable', id: 'food_tteokguk', name: '떡국', description: '메이의 최애. 기력 30 회복.', price: 30, heal: { mp: 30 } },
  { type: 'consumable', id: 'food_malatang', name: '마라탕', description: '제나의 최애. 체력 60 회복.', price: 45, heal: { hp: 60 } },
  { type: 'etc', id: 'etc_snack_ingredient', name: '야식 재료', description: '편의점 심부름용.', price: 1 },
  { type: 'equip', id: 'equip_inear_basic', name: '연습용 인이어', description: '멘탈 +2.', price: 120, slot: 'inear', stats: { def: 2 } },
  { type: 'photocard', id: 'photocard_woni_rescene', name: '원이 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'woni' },
  { type: 'photocard', id: 'photocard_liv_rescene', name: '리브 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'liv' },
  { type: 'photocard', id: 'photocard_minami_rescene', name: '미나미 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'minami' },
  { type: 'photocard', id: 'photocard_may_rescene', name: '메이 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'may' },
  { type: 'photocard', id: 'photocard_zena_rescene', name: '제나 Re:Scene 포카', description: '데뷔 앨범 컨셉 포카.', price: 0, member: 'zena' },
];
```

`src/data/memes.ts` (멤버당 2장. 나머지 19장은 M5 계획에서 추가):
```ts
import type { MemeDef } from './schema';

export const MEMES: MemeDef[] = [
  { id: 'woni_ui', member: 'woni', text: '우이!', origin: '원이의 시그니처 감탄사', note: '감정이 북받칠 때 나오는 소리. 팬들이 인사처럼 따라 한다.', passive: { key: 'atk', value: 2 } },
  { id: 'woni_doyouknow', member: 'woni', text: '리센느 아세요?', origin: '무명기 홍보 멘트', note: '알려지지 않았던 시절 어디서든 물어보던 말. 지금은 반전의 상징.', passive: { key: 'fameGain', value: 0.1 } },
  { id: 'liv_youtoo', member: 'liv', text: '너도? 나도!', origin: '안녕하세요원이입니다잘부탁드립니다 첫 출연', note: '리브의 대표 유행어.', passive: { key: 'spd', value: 1 } },
  { id: 'liv_motto', member: 'liv', text: '천천히 가도 멈추지 말자', origin: '리브의 좌우명', note: '연습생 시절부터 지켜온 말.', passive: { key: 'hp', value: 10 } },
  { id: 'minami_yaho', member: 'minami', text: '거제, 야호~!', origin: '2026년 봄, 원이 유튜브 갸루 일본어 강의 편', note: "'야호'가 한국어 감탄사이자 일본어 인사말이라 생긴 반전. 2026 올해의 유행어로 꼽히며 거제시 홍보대사 위촉으로 이어졌다.", passive: { key: 'aoeRange', value: 0.1 } },
  { id: 'minami_sorry', member: 'minami', text: '죄송합니다', origin: '미나미가 처음 배운 한국어', note: '방과후 설렘 참가 3일 전 한국어 공부를 시작했다.', passive: { key: 'def', value: 2 } },
  { id: 'may_grip', member: 'may', text: '기회는 그립감이 좋다', origin: '메이의 대표 유행어', note: '양손을 모으는 포즈와 함께.', passive: { key: 'luk', value: 5 } },
  { id: 'may_chance', member: 'may', text: '기회를 잡는 것도 기회가 와야 잡을 수 있는 거야', origin: '메이의 인생 명언', note: '연습생 시절을 버티게 한 말.', passive: { key: 'foodHeal', value: 0.2 } },
  { id: 'zena_whatisit', member: 'zena', text: '그게 뭔데요?', origin: '제나의 대표 유행어', note: '모르는 개념을 들었을 때의 반응.', passive: { key: 'statusDuration', value: -0.2 } },
  { id: 'zena_ani', member: 'zena', text: '아뉘이이이!', origin: '제나의 시그니처 투정', note: '억울할 때 나오는 소리.', passive: { key: 'mp', value: 10 } },
];
```

- [ ] **Step 5: index.ts 확장**

`src/data/index.ts`의 import 아래에 추가하고 `validateAllData`를 확장:
```ts
import { EnemyDefSchema, ItemDefSchema, MemeDefSchema, type EnemyDef, type ItemDef, type MemeDef } from './schema';
import { ENEMIES } from './enemies';
import { ITEMS } from './items';
import { MEMES } from './memes';
export { ENEMIES, ITEMS, MEMES };

const enemyById = new Map(ENEMIES.map((e) => [e.id, e]));
const itemById = new Map(ITEMS.map((i) => [i.id, i]));
const memeById = new Map(MEMES.map((m) => [m.id, m]));

export function getEnemy(id: string): EnemyDef {
  const e = enemyById.get(id);
  if (!e) throw new Error(`unknown enemy: ${id}`);
  return e;
}
export function getItem(id: string): ItemDef {
  const i = itemById.get(id);
  if (!i) throw new Error(`unknown item: ${id}`);
  return i;
}
export function getMeme(id: string): MemeDef {
  const m = memeById.get(id);
  if (!m) throw new Error(`unknown meme: ${id}`);
  return m;
}
```
`validateAllData()` 본문 끝에 추가:
```ts
  ENEMIES.forEach((e) => EnemyDefSchema.parse(e));
  ITEMS.forEach((i) => ItemDefSchema.parse(i));
  MEMES.forEach((m) => MemeDefSchema.parse(m));
  assertUnique('enemy', ENEMIES.map((e) => e.id));
  assertUnique('item', ITEMS.map((i) => i.id));
  assertUnique('meme', MEMES.map((m) => m.id));
  for (const e of ENEMIES) for (const d of e.drops) getItem(d.itemId);
```

- [ ] **Step 6: 시스템 구현**

`src/systems/inventory.ts`:
```ts
import type { EquipSlot, ItemDef } from '../data/schema';
import { STAT_KEYS, type Stats } from './types';

export interface InventoryState {
  items: Record<string, number>;
  equipment: Record<EquipSlot, string | null>;
}

export function emptyInventory(): InventoryState {
  return { items: {}, equipment: { inear: null, outfit: null, mic: null, shoes: null } };
}

export function countOf(inv: InventoryState, itemId: string): number {
  return inv.items[itemId] ?? 0;
}

export function addItem(inv: InventoryState, itemId: string, count = 1): InventoryState {
  return { ...inv, items: { ...inv.items, [itemId]: countOf(inv, itemId) + count } };
}

export function removeItem(inv: InventoryState, itemId: string, count = 1): InventoryState {
  const have = countOf(inv, itemId);
  if (have < count) throw new Error(`not enough ${itemId}: have ${have}, need ${count}`);
  const items = { ...inv.items };
  if (have === count) delete items[itemId];
  else items[itemId] = have - count;
  return { ...inv, items };
}

export function equipItem(inv: InventoryState, item: ItemDef): InventoryState {
  if (item.type !== 'equip') throw new Error(`${item.id} is not an equip item`);
  let next = removeItem(inv, item.id);
  const previous = next.equipment[item.slot];
  if (previous) next = addItem(next, previous);
  return { ...next, equipment: { ...next.equipment, [item.slot]: item.id } };
}

export function equipmentStats(inv: InventoryState, getItem: (id: string) => ItemDef): Partial<Stats> {
  const total: Partial<Stats> = {};
  for (const id of Object.values(inv.equipment)) {
    if (!id) continue;
    const item = getItem(id);
    if (item.type !== 'equip') continue;
    for (const k of STAT_KEYS) {
      const v = item.stats[k];
      if (v !== undefined) total[k] = (total[k] ?? 0) + v;
    }
  }
  return total;
}
```

`src/systems/memes.ts`:
```ts
import type { MemeDef, PassiveKey } from '../data/schema';

export interface MemeState {
  unlocked: string[];
  equipped: (string | null)[];
}

export function emptyMemeState(slots = 1): MemeState {
  return { unlocked: [], equipped: Array.from({ length: slots }, () => null) };
}

export function unlockMeme(s: MemeState, id: string): MemeState {
  if (s.unlocked.includes(id)) return s;
  return { ...s, unlocked: [...s.unlocked, id] };
}

export function equipMeme(s: MemeState, slot: number, id: string): MemeState {
  if (slot < 0 || slot >= s.equipped.length) throw new Error(`meme slot ${slot} out of range`);
  if (!s.unlocked.includes(id)) throw new Error(`meme ${id} is not unlocked`);
  const equipped = s.equipped.map((e) => (e === id ? null : e));
  equipped[slot] = id;
  return { ...s, equipped };
}

export function openMemeSlot(s: MemeState): MemeState {
  return { ...s, equipped: [...s.equipped, null] };
}

export function passiveTotals(s: MemeState, getMeme: (id: string) => MemeDef): Partial<Record<PassiveKey, number>> {
  const total: Partial<Record<PassiveKey, number>> = {};
  for (const id of s.equipped) {
    if (!id) continue;
    const p = getMeme(id).passive;
    if (!p) continue;
    total[p.key] = (total[p.key] ?? 0) + p.value;
  }
  return total;
}
```

- [ ] **Step 7: 통과 확인**

Run: `npm test`
Expected: PASS (inventory 6, memes 4, data-schema 12 등 전부)

- [ ] **Step 8: 커밋**

```bash
git add src/data src/systems/inventory.ts src/systems/memes.ts tests
git commit -m "feat: 적·아이템·유행어 데이터와 인벤토리·유행어 사전 시스템" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 7: 이동 로직 (movement)

**Files:**
- Create: `src/systems/movement.ts`
- Test: `tests/movement.test.ts`

**Interfaces:**
- Produces:
  - `MoveInput { left; right; up; down; jumpPressed: boolean }` — `jumpPressed`는 "이번 프레임에 눌림"(JustDown)
  - `MoveState { onGround: boolean; onLadder: boolean; climbing: boolean; jumpsLeft: number; facing: 1|-1 }`
  - `MoveConfig { speed; jumpVelocity; climbSpeed; maxJumps }`
  - `MoveResult { vx: number; vy: number|null; climbing: boolean; jumpsLeft: number; facing: 1|-1; dropThrough: boolean; gravity: boolean }` — `vy: null`은 "속도 유지"
  - `stepMovement(input, state, cfg): MoveResult`
  - `DEFAULT_MOVE_CONFIG: MoveConfig = { speed: 200, jumpVelocity: -550, climbSpeed: 140, maxJumps: 1 }` (2단 점프는 레벨 10에서 `maxJumps: 2`)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/movement.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_MOVE_CONFIG, stepMovement, type MoveInput, type MoveState } from '../src/systems/movement';

const idle: MoveInput = { left: false, right: false, up: false, down: false, jumpPressed: false };
const ground: MoveState = { onGround: true, onLadder: false, climbing: false, jumpsLeft: 0, facing: 1 };
const air: MoveState = { ...ground, onGround: false, jumpsLeft: 1 };
const cfg = DEFAULT_MOVE_CONFIG;
const dbl = { ...cfg, maxJumps: 2 };

describe('running', () => {
  it('moves left/right and faces that way', () => {
    const r = stepMovement({ ...idle, left: true }, ground, cfg);
    expect(r.vx).toBe(-cfg.speed);
    expect(r.facing).toBe(-1);
    expect(r.gravity).toBe(true);
  });
  it('stops when no input and keeps facing', () => {
    const r = stepMovement(idle, { ...ground, facing: -1 }, cfg);
    expect(r.vx).toBe(0);
    expect(r.vy).toBeNull();
    expect(r.facing).toBe(-1);
  });
});

describe('jumping', () => {
  it('refills jumps on ground and jumps once', () => {
    const r = stepMovement({ ...idle, jumpPressed: true }, ground, cfg);
    expect(r.vy).toBe(cfg.jumpVelocity);
    expect(r.jumpsLeft).toBe(0);
  });
  it('cannot jump in air with maxJumps 1', () => {
    const r = stepMovement({ ...idle, jumpPressed: true }, { ...air, jumpsLeft: 0 }, cfg);
    expect(r.vy).toBeNull();
  });
  it('double jumps once with maxJumps 2, not twice', () => {
    const first = stepMovement({ ...idle, jumpPressed: true }, { ...ground }, dbl);
    expect(first.jumpsLeft).toBe(1);
    const second = stepMovement({ ...idle, jumpPressed: true }, { ...air, jumpsLeft: first.jumpsLeft }, dbl);
    expect(second.vy).toBe(dbl.jumpVelocity);
    expect(second.jumpsLeft).toBe(0);
    const third = stepMovement({ ...idle, jumpPressed: true }, { ...air, jumpsLeft: 0 }, dbl);
    expect(third.vy).toBeNull();
  });
  it('down+jump on ground drops through instead of jumping', () => {
    const r = stepMovement({ ...idle, down: true, jumpPressed: true }, ground, cfg);
    expect(r.dropThrough).toBe(true);
    expect(r.vy).toBeNull();
  });
});

describe('ladders', () => {
  const ladder: MoveState = { ...air, onLadder: true };
  it('starts climbing on up while on a ladder and disables gravity', () => {
    const r = stepMovement({ ...idle, up: true }, ladder, cfg);
    expect(r.climbing).toBe(true);
    expect(r.gravity).toBe(false);
    expect(r.vy).toBe(-cfg.climbSpeed);
    expect(r.vx).toBe(0);
  });
  it('holds still on a ladder with no vertical input', () => {
    const r = stepMovement(idle, { ...ladder, climbing: true }, cfg);
    expect(r.vy).toBe(0);
    expect(r.climbing).toBe(true);
  });
  it('leaves the ladder by jumping', () => {
    const r = stepMovement({ ...idle, jumpPressed: true }, { ...ladder, climbing: true }, cfg);
    expect(r.climbing).toBe(false);
    expect(r.vy).toBe(cfg.jumpVelocity);
    expect(r.gravity).toBe(true);
  });
  it('stops climbing when the ladder ends', () => {
    const r = stepMovement({ ...idle, up: true }, { ...air, climbing: true, onLadder: false }, cfg);
    expect(r.climbing).toBe(false);
    expect(r.gravity).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- movement`
Expected: FAIL — `Cannot find module '../src/systems/movement'`

- [ ] **Step 3: 구현**

`src/systems/movement.ts`:
```ts
export interface MoveInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpPressed: boolean;
}

export interface MoveState {
  onGround: boolean;
  onLadder: boolean;
  climbing: boolean;
  jumpsLeft: number;
  facing: 1 | -1;
}

export interface MoveConfig {
  speed: number;
  jumpVelocity: number;
  climbSpeed: number;
  maxJumps: number;
}

export interface MoveResult {
  vx: number;
  vy: number | null;
  climbing: boolean;
  jumpsLeft: number;
  facing: 1 | -1;
  dropThrough: boolean;
  gravity: boolean;
}

export const DEFAULT_MOVE_CONFIG: MoveConfig = { speed: 200, jumpVelocity: -550, climbSpeed: 140, maxJumps: 1 };

export function stepMovement(input: MoveInput, state: MoveState, cfg: MoveConfig): MoveResult {
  let jumpsLeft = state.onGround ? cfg.maxJumps : state.jumpsLeft;
  let facing = state.facing;
  if (input.left) facing = -1;
  else if (input.right) facing = 1;

  const wantsClimb = state.onLadder && (input.up || input.down);
  const climbing = state.onLadder && (state.climbing || wantsClimb);

  if (climbing) {
    if (input.jumpPressed) {
      return { vx: 0, vy: cfg.jumpVelocity, climbing: false, jumpsLeft: Math.max(0, cfg.maxJumps - 1), facing, dropThrough: false, gravity: true };
    }
    const vy = input.up ? -cfg.climbSpeed : input.down ? cfg.climbSpeed : 0;
    return { vx: 0, vy, climbing: true, jumpsLeft: cfg.maxJumps, facing, dropThrough: false, gravity: false };
  }

  const vx = input.left ? -cfg.speed : input.right ? cfg.speed : 0;
  let vy: number | null = null;
  let dropThrough = false;

  if (input.jumpPressed) {
    if (input.down && state.onGround) {
      dropThrough = true;
    } else if (jumpsLeft > 0) {
      vy = cfg.jumpVelocity;
      jumpsLeft -= 1;
    }
  }

  return { vx, vy, climbing: false, jumpsLeft, facing, dropThrough, gravity: true };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- movement`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/systems/movement.ts tests/movement.test.ts
git commit -m "feat: 이동·점프·2단 점프·사다리 순수 로직" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 8: 퀘스트 엔진 (quest)

**Files:**
- Modify: `src/data/schema.ts` (Objective/Reward/QuestDef 스키마 추가)
- Create: `src/systems/quest.ts`
- Test: `tests/quest.test.ts`

**Interfaces:**
- Produces (schema.ts):
  - `Objective` = `{kind:'kill'; target; count}` | `{kind:'collect'; target; count}` | `{kind:'talk'; target; dialogue?}` | `{kind:'reach'; target}` | `{kind:'minigame'; target; score}` | `{kind:'emote'; target; map}`
  - `Reward { xp?; hearts?; items?: {id; count}[]; meme?: string; fame?: number; flags?: string[]; openMemeSlot?: boolean }`
  - `QuestDef { id; chapter; type:'main'|'side'; title; description; giver: string; map: string; requires?: { level?; questsDone?: string[]; flags?: string[]; member?: MemberId }; objectives: Objective[]; rewards: Reward; dialogues: { offer: string; inProgress: string; complete: string } }`
- Produces (quest.ts):
  - `type GameEvent = {type:'enemy_killed'; enemyId} | {type:'item_collected'; itemId; count} | {type:'npc_talked'; npcId; dialogueId?} | {type:'map_entered'; mapId} | {type:'minigame_scored'; minigameId; score} | {type:'emote_used'; memeId; mapId}`
  - `type QuestStatus = 'locked'|'available'|'active'|'completable'|'done'`
  - `interface QuestState { active: Record<string, number[]>; done: string[] }` — active 값은 목표별 진행도
  - `interface QuestContext { level: number; member: MemberId }`
  - `class QuestEngine { constructor(defs: QuestDef[], state: QuestState, flags: Set<string>, ctx: QuestContext); getState(): QuestState; status(id): QuestStatus; available(): QuestDef[]; activeQuests(): QuestDef[]; progress(id): number[]; start(id): void; report(ev: GameEvent): string[]; complete(id): Reward; questsForNpc(npcId): QuestDef[] }`
  - `emptyQuestState(): QuestState`
  - 엔진은 `flags`와 `ctx`를 참조로 들고 있으며 `complete`가 보상 flags를 `flags`에 추가한다. xp/hearts/items/meme 지급은 호출자(GameState) 책임.

- [ ] **Step 1: 스키마 추가**

`src/data/schema.ts` 끝에 추가:
```ts
export const ObjectiveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('kill'), target: z.string().min(1), count: z.number().int().positive() }),
  z.object({ kind: z.literal('collect'), target: z.string().min(1), count: z.number().int().positive() }),
  z.object({ kind: z.literal('talk'), target: z.string().min(1), dialogue: z.string().optional() }),
  z.object({ kind: z.literal('reach'), target: z.string().min(1) }),
  z.object({ kind: z.literal('minigame'), target: z.string().min(1), score: z.number() }),
  z.object({ kind: z.literal('emote'), target: z.string().min(1), map: z.string().min(1) }),
]);
export type Objective = z.infer<typeof ObjectiveSchema>;

export const RewardSchema = z.object({
  xp: z.number().int().min(0).optional(),
  hearts: z.number().int().min(0).optional(),
  items: z.array(z.object({ id: z.string().min(1), count: z.number().int().positive() })).optional(),
  meme: z.string().optional(),
  fame: z.number().min(0).optional(),
  flags: z.array(z.string()).optional(),
  openMemeSlot: z.boolean().optional(),
});
export type Reward = z.infer<typeof RewardSchema>;

export const QuestDefSchema = z.object({
  id: z.string().min(1),
  chapter: z.number().int().min(0),
  type: z.enum(['main', 'side']),
  title: z.string().min(1),
  description: z.string(),
  giver: z.string().min(1),
  map: z.string().min(1),
  requires: z.object({
    level: z.number().int().optional(),
    questsDone: z.array(z.string()).optional(),
    flags: z.array(z.string()).optional(),
    member: MemberIdSchema.optional(),
  }).optional(),
  objectives: z.array(ObjectiveSchema).min(1),
  rewards: RewardSchema,
  dialogues: z.object({ offer: z.string().min(1), inProgress: z.string().min(1), complete: z.string().min(1) }),
});
export type QuestDef = z.infer<typeof QuestDefSchema>;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/quest.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { QuestEngine, emptyQuestState, type GameEvent } from '../src/systems/quest';
import type { QuestDef } from '../src/data/schema';

const dlg = { offer: 'd_offer', inProgress: 'd_prog', complete: 'd_done' };
const DEFS: QuestDef[] = [
  { id: 'q_a', chapter: 1, type: 'main', title: 'A', description: '', giver: 'npc_woni', map: 'm1',
    objectives: [{ kind: 'kill', target: 'slime', count: 2 }], rewards: { xp: 10, flags: ['a_done'] }, dialogues: dlg },
  { id: 'q_b', chapter: 1, type: 'main', title: 'B', description: '', giver: 'npc_woni', map: 'm1',
    requires: { questsDone: ['q_a'] },
    objectives: [{ kind: 'collect', target: 'snack', count: 3 }, { kind: 'talk', target: 'npc_may' }], rewards: { hearts: 5 }, dialogues: dlg },
  { id: 'q_c', chapter: 1, type: 'side', title: 'C', description: '', giver: 'npc_zena', map: 'm1',
    requires: { level: 5, member: 'zena' },
    objectives: [{ kind: 'reach', target: 'm2' }], rewards: {}, dialogues: dlg },
];

let flags: Set<string>;
let engine: QuestEngine;
const ev = (e: GameEvent) => engine.report(e);

beforeEach(() => {
  flags = new Set();
  engine = new QuestEngine(DEFS, emptyQuestState(), flags, { level: 1, member: 'woni' });
});

describe('status and requirements', () => {
  it('unlocks quests without requirements, locks the rest', () => {
    expect(engine.status('q_a')).toBe('available');
    expect(engine.status('q_b')).toBe('locked');
    expect(engine.status('q_c')).toBe('locked');
    expect(engine.available().map((q) => q.id)).toEqual(['q_a']);
  });
  it('checks level and member requirements', () => {
    const zena = new QuestEngine(DEFS, emptyQuestState(), new Set(), { level: 5, member: 'zena' });
    expect(zena.status('q_c')).toBe('available');
    const lowZena = new QuestEngine(DEFS, emptyQuestState(), new Set(), { level: 4, member: 'zena' });
    expect(lowZena.status('q_c')).toBe('locked');
  });
  it('lists quests by giver', () => {
    expect(engine.questsForNpc('npc_woni').map((q) => q.id)).toEqual(['q_a']);
  });
});

describe('progress', () => {
  it('counts kills and becomes completable at the target', () => {
    engine.start('q_a');
    expect(engine.status('q_a')).toBe('active');
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual([]);
    expect(engine.progress('q_a')).toEqual([1]);
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual(['q_a']);
    expect(engine.status('q_a')).toBe('completable');
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual([]);
    expect(engine.progress('q_a')).toEqual([2]);
  });
  it('ignores events for other targets and inactive quests', () => {
    expect(ev({ type: 'enemy_killed', enemyId: 'slime' })).toEqual([]);
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'mushroom' });
    expect(engine.progress('q_a')).toEqual([0]);
  });
  it('tracks multiple objectives including talk', () => {
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    engine.complete('q_a');
    engine.start('q_b');
    ev({ type: 'item_collected', itemId: 'snack', count: 2 });
    ev({ type: 'npc_talked', npcId: 'npc_may' });
    expect(engine.progress('q_b')).toEqual([2, 1]);
    expect(engine.status('q_b')).toBe('active');
    expect(ev({ type: 'item_collected', itemId: 'snack', count: 1 })).toEqual(['q_b']);
  });
});

describe('completion', () => {
  it('returns rewards, sets flags, moves to done, unlocks dependents', () => {
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    const reward = engine.complete('q_a');
    expect(reward).toEqual({ xp: 10, flags: ['a_done'] });
    expect(flags.has('a_done')).toBe(true);
    expect(engine.status('q_a')).toBe('done');
    expect(engine.status('q_b')).toBe('available');
    expect(engine.getState().done).toEqual(['q_a']);
  });
  it('throws when starting a locked quest or completing an unfinished one', () => {
    expect(() => engine.start('q_b')).toThrow(/q_b/);
    engine.start('q_a');
    expect(() => engine.complete('q_a')).toThrow(/q_a/);
  });
  it('restores from state', () => {
    engine.start('q_a');
    ev({ type: 'enemy_killed', enemyId: 'slime' });
    const restored = new QuestEngine(DEFS, engine.getState(), flags, { level: 1, member: 'woni' });
    expect(restored.progress('q_a')).toEqual([1]);
    expect(restored.status('q_a')).toBe('active');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- quest`
Expected: FAIL — `Cannot find module '../src/systems/quest'`

- [ ] **Step 4: 구현**

`src/systems/quest.ts`:
```ts
import type { Objective, QuestDef, Reward } from '../data/schema';
import type { MemberId } from './types';

export type GameEvent =
  | { type: 'enemy_killed'; enemyId: string }
  | { type: 'item_collected'; itemId: string; count: number }
  | { type: 'npc_talked'; npcId: string; dialogueId?: string }
  | { type: 'map_entered'; mapId: string }
  | { type: 'minigame_scored'; minigameId: string; score: number }
  | { type: 'emote_used'; memeId: string; mapId: string };

export type QuestStatus = 'locked' | 'available' | 'active' | 'completable' | 'done';

export interface QuestState {
  active: Record<string, number[]>;
  done: string[];
}

export interface QuestContext {
  level: number;
  member: MemberId;
}

export function emptyQuestState(): QuestState {
  return { active: {}, done: [] };
}

function objectiveTarget(o: Objective): number {
  switch (o.kind) {
    case 'kill':
    case 'collect':
      return o.count;
    case 'minigame':
      return o.score;
    default:
      return 1;
  }
}

function objectiveDelta(o: Objective, ev: GameEvent): number {
  switch (o.kind) {
    case 'kill':
      return ev.type === 'enemy_killed' && ev.enemyId === o.target ? 1 : 0;
    case 'collect':
      return ev.type === 'item_collected' && ev.itemId === o.target ? ev.count : 0;
    case 'talk':
      return ev.type === 'npc_talked' && ev.npcId === o.target && (!o.dialogue || ev.dialogueId === o.dialogue) ? 1 : 0;
    case 'reach':
      return ev.type === 'map_entered' && ev.mapId === o.target ? 1 : 0;
    case 'minigame':
      return ev.type === 'minigame_scored' && ev.minigameId === o.target ? ev.score : 0;
    case 'emote':
      return ev.type === 'emote_used' && ev.memeId === o.target && ev.mapId === o.map ? 1 : 0;
  }
}

export class QuestEngine {
  private readonly byId: Map<string, QuestDef>;

  constructor(
    private readonly defs: QuestDef[],
    private state: QuestState,
    private readonly flags: Set<string>,
    private readonly ctx: QuestContext,
  ) {
    this.byId = new Map(defs.map((q) => [q.id, q]));
  }

  getState(): QuestState {
    return { active: { ...this.state.active }, done: [...this.state.done] };
  }

  private def(id: string): QuestDef {
    const q = this.byId.get(id);
    if (!q) throw new Error(`unknown quest: ${id}`);
    return q;
  }

  private requirementsMet(q: QuestDef): boolean {
    const r = q.requires;
    if (!r) return true;
    if (r.level !== undefined && this.ctx.level < r.level) return false;
    if (r.member !== undefined && this.ctx.member !== r.member) return false;
    if (r.questsDone?.some((id) => !this.state.done.includes(id))) return false;
    if (r.flags?.some((f) => !this.flags.has(f))) return false;
    return true;
  }

  private isComplete(q: QuestDef, progress: number[]): boolean {
    return q.objectives.every((o, i) => (progress[i] ?? 0) >= objectiveTarget(o));
  }

  status(id: string): QuestStatus {
    const q = this.def(id);
    if (this.state.done.includes(id)) return 'done';
    const progress = this.state.active[id];
    if (progress) return this.isComplete(q, progress) ? 'completable' : 'active';
    return this.requirementsMet(q) ? 'available' : 'locked';
  }

  available(): QuestDef[] {
    return this.defs.filter((q) => this.status(q.id) === 'available');
  }

  activeQuests(): QuestDef[] {
    return this.defs.filter((q) => this.state.active[q.id] !== undefined);
  }

  questsForNpc(npcId: string): QuestDef[] {
    return this.defs.filter((q) => q.giver === npcId && this.status(q.id) !== 'done' && this.status(q.id) !== 'locked');
  }

  progress(id: string): number[] {
    return [...(this.state.active[id] ?? this.def(id).objectives.map(() => 0))];
  }

  start(id: string): void {
    if (this.status(id) !== 'available') throw new Error(`quest ${id} is not available`);
    this.state = { ...this.state, active: { ...this.state.active, [id]: this.def(id).objectives.map(() => 0) } };
  }

  report(ev: GameEvent): string[] {
    const newlyCompletable: string[] = [];
    const active = { ...this.state.active };
    for (const [id, progress] of Object.entries(active)) {
      const q = this.def(id);
      const wasComplete = this.isComplete(q, progress);
      const next = q.objectives.map((o, i) => Math.min(objectiveTarget(o), (progress[i] ?? 0) + objectiveDelta(o, ev)));
      active[id] = next;
      if (!wasComplete && this.isComplete(q, next)) newlyCompletable.push(id);
    }
    this.state = { ...this.state, active };
    return newlyCompletable;
  }

  complete(id: string): Reward {
    if (this.status(id) !== 'completable') throw new Error(`quest ${id} is not completable`);
    const q = this.def(id);
    const active = { ...this.state.active };
    delete active[id];
    this.state = { active, done: [...this.state.done, id] };
    for (const f of q.rewards.flags ?? []) this.flags.add(f);
    return q.rewards;
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- quest`
Expected: PASS (9 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/data/schema.ts src/systems/quest.ts tests/quest.test.ts
git commit -m "feat: 퀘스트 엔진 상태 기계" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 9: 대화 러너 (dialogue)

**Files:**
- Modify: `src/data/schema.ts` (Dialogue 스키마 추가)
- Create: `src/systems/dialogue.ts`
- Test: `tests/dialogue.test.ts`

**Interfaces:**
- Produces (schema.ts):
  - `type Face = 'neutral'|'happy'|'sad'|'surprised'`
  - `DialogueChoice { text; next: string; setFlags?: string[]; requiresFlags?: string[] }`
  - `DialogueNode { id; speaker: string; face?: Face; text; next?: string; choices?: DialogueChoice[]; setFlags?: string[]; end?: boolean }` — `speaker`는 멤버 id, NPC id, 또는 `'narrator'`
  - `DialogueScript { id; nodes: DialogueNode[] }` — 스키마 refine으로 `next`/`choice.next`가 존재하는 노드를 가리키는지 검사
- Produces (dialogue.ts):
  - `class DialogueRunner { constructor(script, flags: Set<string>); current(): DialogueNode; choices(): DialogueChoice[]; awaitingChoice(): boolean; next(): boolean; choose(index): void; isFinished(): boolean }`
  - 노드에 **진입할 때** `setFlags`를 적용한다(첫 노드 포함). `next()`는 선택지 대기 중이거나 끝났으면 false.

- [ ] **Step 1: 스키마 추가**

`src/data/schema.ts` 끝에 추가:
```ts
export const FaceSchema = z.enum(['neutral', 'happy', 'sad', 'surprised']);
export type Face = z.infer<typeof FaceSchema>;

export const DialogueChoiceSchema = z.object({
  text: z.string().min(1),
  next: z.string().min(1),
  setFlags: z.array(z.string()).optional(),
  requiresFlags: z.array(z.string()).optional(),
});
export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;

export const DialogueNodeSchema = z.object({
  id: z.string().min(1),
  speaker: z.string().min(1),
  face: FaceSchema.optional(),
  text: z.string().min(1),
  next: z.string().optional(),
  choices: z.array(DialogueChoiceSchema).min(1).optional(),
  setFlags: z.array(z.string()).optional(),
  end: z.boolean().optional(),
});
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;

export const DialogueScriptSchema = z
  .object({ id: z.string().min(1), nodes: z.array(DialogueNodeSchema).min(1) })
  .superRefine((script, ctx) => {
    const ids = new Set(script.nodes.map((n) => n.id));
    for (const n of script.nodes) {
      if (n.next && !ids.has(n.next)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${script.id}/${n.id}: next '${n.next}' not found` });
      for (const c of n.choices ?? []) {
        if (!ids.has(c.next)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${script.id}/${n.id}: choice next '${c.next}' not found` });
      }
      if (!n.next && !n.choices && !n.end) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${script.id}/${n.id}: needs next, choices, or end` });
    }
  });
export type DialogueScript = z.infer<typeof DialogueScriptSchema>;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/dialogue.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DialogueRunner } from '../src/systems/dialogue';
import { DialogueScriptSchema, type DialogueScript } from '../src/data/schema';

const script: DialogueScript = {
  id: 'd_test',
  nodes: [
    { id: 'n0', speaker: 'may', face: 'sad', text: '못 하겠어요.', next: 'n1', setFlags: ['seen_n0'] },
    { id: 'n1', speaker: 'woni', text: '기회는 와야 잡는 거다.',
      choices: [
        { text: '같이 남자.', next: 'n2', setFlags: ['may_stayed'] },
        { text: '네 마음이 중요해.', next: 'n3' },
        { text: '(비밀 선택지)', next: 'n3', requiresFlags: ['secret'] },
      ] },
    { id: 'n2', speaker: 'may', face: 'happy', text: '그립감, 좋네요.', end: true },
    { id: 'n3', speaker: 'may', text: '생각해 볼게요.', end: true },
  ],
};

describe('DialogueScriptSchema', () => {
  it('accepts a well-formed script', () => {
    expect(() => DialogueScriptSchema.parse(script)).not.toThrow();
  });
  it('rejects dangling next references', () => {
    const bad = { id: 'x', nodes: [{ id: 'a', speaker: 'may', text: 'hi', next: 'zzz' }] };
    expect(() => DialogueScriptSchema.parse(bad)).toThrow(/zzz/);
  });
  it('rejects a node with no way forward', () => {
    const bad = { id: 'x', nodes: [{ id: 'a', speaker: 'may', text: 'hi' }] };
    expect(() => DialogueScriptSchema.parse(bad)).toThrow(/needs next/);
  });
});

describe('DialogueRunner', () => {
  it('starts at the first node and applies its flags', () => {
    const flags = new Set<string>();
    const r = new DialogueRunner(script, flags);
    expect(r.current().id).toBe('n0');
    expect(flags.has('seen_n0')).toBe(true);
    expect(r.isFinished()).toBe(false);
  });
  it('advances with next() until a choice is required', () => {
    const r = new DialogueRunner(script, new Set());
    expect(r.next()).toBe(true);
    expect(r.current().id).toBe('n1');
    expect(r.awaitingChoice()).toBe(true);
    expect(r.next()).toBe(false);
    expect(r.current().id).toBe('n1');
  });
  it('filters choices by requiresFlags', () => {
    const r = new DialogueRunner(script, new Set());
    r.next();
    expect(r.choices().map((c) => c.text)).toEqual(['같이 남자.', '네 마음이 중요해.']);
    const r2 = new DialogueRunner(script, new Set(['secret']));
    r2.next();
    expect(r2.choices()).toHaveLength(3);
  });
  it('choose() applies flags, jumps, and end nodes finish', () => {
    const flags = new Set<string>();
    const r = new DialogueRunner(script, flags);
    r.next();
    r.choose(0);
    expect(flags.has('may_stayed')).toBe(true);
    expect(r.current().id).toBe('n2');
    expect(r.isFinished()).toBe(false);
    expect(r.next()).toBe(false);
    expect(r.isFinished()).toBe(true);
  });
  it('choose() throws when not awaiting a choice or index is out of range', () => {
    const r = new DialogueRunner(script, new Set());
    expect(() => r.choose(0)).toThrow(/choice/);
    r.next();
    expect(() => r.choose(5)).toThrow(/choice/);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- dialogue`
Expected: FAIL — `Cannot find module '../src/systems/dialogue'`

- [ ] **Step 4: 구현**

`src/systems/dialogue.ts`:
```ts
import type { DialogueChoice, DialogueNode, DialogueScript } from '../data/schema';

export class DialogueRunner {
  private readonly byId: Map<string, DialogueNode>;
  private node: DialogueNode;
  private finished = false;

  constructor(private readonly script: DialogueScript, private readonly flags: Set<string>) {
    this.byId = new Map(script.nodes.map((n) => [n.id, n]));
    this.node = script.nodes[0]!;
    this.enter(this.node);
  }

  private enter(node: DialogueNode): void {
    this.node = node;
    for (const f of node.setFlags ?? []) this.flags.add(f);
  }

  private jump(id: string): void {
    const n = this.byId.get(id);
    if (!n) throw new Error(`${this.script.id}: node ${id} not found`);
    this.enter(n);
  }

  current(): DialogueNode {
    return this.node;
  }

  isFinished(): boolean {
    return this.finished;
  }

  choices(): DialogueChoice[] {
    return (this.node.choices ?? []).filter((c) => (c.requiresFlags ?? []).every((f) => this.flags.has(f)));
  }

  awaitingChoice(): boolean {
    return !this.finished && this.choices().length > 0;
  }

  next(): boolean {
    if (this.finished || this.awaitingChoice()) return false;
    if (this.node.end || !this.node.next) {
      this.finished = true;
      return false;
    }
    this.jump(this.node.next);
    return true;
  }

  choose(index: number): void {
    const options = this.choices();
    const choice = options[index];
    if (!this.awaitingChoice() || !choice) throw new Error(`${this.script.id}: no choice at index ${index}`);
    for (const f of choice.setFlags ?? []) this.flags.add(f);
    this.jump(choice.next);
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- dialogue`
Expected: PASS (8 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/data/schema.ts src/systems/dialogue.ts tests/dialogue.test.ts
git commit -m "feat: 대화 스크립트 스키마와 러너" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 10: 게임 상태와 저장 (GameState, save)

**Files:**
- Create: `src/core/EventBus.ts`, `src/core/GameState.ts`, `src/systems/save.ts`
- Test: `tests/game-state.test.ts`, `tests/save.test.ts`

**Interfaces:**
- Produces (EventBus.ts): `class EventBus<E extends Record<string, unknown>> { on<K extends keyof E>(k, h: (p: E[K]) => void): () => void; off(k, h); emit<K>(k, p: E[K]) }`
- Produces (GameState.ts):
  - `interface GameStateSnapshot { version: number; player: PlayerState; inventory: InventoryState; hearts: number; memes: MemeState; quests: QuestState; flags: string[]; fame: number; location: { mapId: string; spawnId: string }; chapter: number; playTimeMs: number; savedAt: number }`
  - `interface GameEvents { changed: undefined; levelup: { level: number }; died: undefined; questCompletable: { questId: string }; questCompleted: { questId: string; reward: Reward }; memeUnlocked: { memeId: string } }`
  - `class GameState` 필드: `player`, `inventory`, `hearts`, `memes`, `flags: Set<string>`, `fame`, `location`, `chapter`, `playTimeMs`, `quests: QuestEngine`, `bus: EventBus<GameEvents>`, `skillRuntime: SkillRuntime`
  - `static newGame(member: MemberId, questDefs: QuestDef[]): GameState` — 레벨 1, 체력·기력 만땅, `location = { mapId: member.prologueMap, spawnId: 'start' }`, `chapter: 0`
  - `static fromSnapshot(snap, questDefs): GameState`
  - `snapshot(): GameStateSnapshot`
  - `maxStats(): Stats` — 레벨 스탯 + 장비 + 유행어 패시브(StatKey만)
  - `gainXp(xp): number` — 레벨업 시 체력·기력 회복, `levelup`·`changed` emit
  - `addHearts(n)`, `heal(hp, mp)`, `takeDamage(n): boolean`(사망 시 true, `died` emit)
  - `applyReward(r: Reward)` — xp·hearts·items·meme·fame·openMemeSlot 지급 (flags는 QuestEngine이 처리)
  - `report(ev: GameEvent): string[]` — 퀘스트 엔진에 전달, 새로 완료 가능해진 id마다 `questCompletable` emit
  - `completeQuest(id): Reward` — 엔진 complete + applyReward + `questCompleted` emit
- Produces (save.ts): `SAVE_VERSION = 1`, `serialize(snap): string`, `deserialize(json): GameStateSnapshot`(스키마·버전 검사, 실패 시 throw), `interface SaveStore { read(slot): string|null; write(slot, data): void; clear(slot): void }`, `createMemoryStore()`, `createLocalStorageStore(storage: Storage)`, `SLOT_COUNT = 3`, `saveGame(store, slot, snap)`, `loadGame(store, slot): GameStateSnapshot|null`, `listSlots(store): (SlotSummary|null)[]` with `SlotSummary { member: MemberId; level: number; chapter: number; savedAt: number; playTimeMs: number }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/game-state.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';
import { xpForLevel } from '../src/systems/progression';
import { addItem, equipItem } from '../src/systems/inventory';
import { equipMeme, unlockMeme } from '../src/systems/memes';
import { getItem } from '../src/data/index';
import type { QuestDef } from '../src/data/schema';

const dlg = { offer: 'o', inProgress: 'p', complete: 'c' };
const QUESTS: QuestDef[] = [
  { id: 'q1', chapter: 1, type: 'main', title: 't', description: '', giver: 'npc_woni', map: 'm',
    objectives: [{ kind: 'kill', target: 'slime', count: 1 }],
    rewards: { xp: 20, hearts: 5, items: [{ id: 'food_mulhoe', count: 2 }], meme: 'may_grip', fame: 1, flags: ['f1'], openMemeSlot: true }, dialogues: dlg },
];

describe('newGame', () => {
  it('starts a level-1 member at the prologue map with full hp/mp', () => {
    const gs = GameState.newGame('woni', QUESTS);
    expect(gs.player).toMatchObject({ member: 'woni', level: 1, xp: 0, sp: 0, hp: 120, mp: 40 });
    expect(gs.location).toEqual({ mapId: 'ch0_geoje', spawnId: 'start' });
    expect(gs.chapter).toBe(0);
    expect(gs.hearts).toBe(0);
    expect(gs.memes.equipped).toEqual([null]);
  });
});

describe('stats', () => {
  it('adds equipment and meme passives to level stats', () => {
    const gs = GameState.newGame('woni', QUESTS);
    gs.inventory = equipItem(addItem(gs.inventory, 'equip_inear_basic'), getItem('equip_inear_basic'));
    gs.memes = equipMeme(unlockMeme(gs.memes, 'may_grip'), 0, 'may_grip');
    const s = gs.maxStats();
    expect(s.def).toBe(8 + 2);
    expect(s.luk).toBe(3 + 5);
    expect(s.hp).toBe(120);
  });
});

describe('xp and damage', () => {
  it('levels up, refills hp/mp and emits levelup', () => {
    const gs = GameState.newGame('woni', QUESTS);
    const seen: number[] = [];
    gs.bus.on('levelup', (p) => seen.push(p.level));
    gs.takeDamage(50);
    expect(gs.player.hp).toBe(70);
    expect(gs.gainXp(xpForLevel(1))).toBe(1);
    expect(gs.player.level).toBe(2);
    expect(gs.player.hp).toBe(gs.maxStats().hp);
    expect(seen).toEqual([2]);
  });
  it('reports death at zero hp', () => {
    const gs = GameState.newGame('woni', QUESTS);
    let died = false;
    gs.bus.on('died', () => (died = true));
    expect(gs.takeDamage(119)).toBe(false);
    expect(gs.takeDamage(1)).toBe(true);
    expect(gs.player.hp).toBe(0);
    expect(died).toBe(true);
  });
  it('heal clamps to max', () => {
    const gs = GameState.newGame('woni', QUESTS);
    gs.takeDamage(10);
    gs.heal(999, 999);
    expect(gs.player.hp).toBe(120);
    expect(gs.player.mp).toBe(40);
  });
});

describe('quests through GameState', () => {
  it('forwards events, completes, and applies every reward field', () => {
    const gs = GameState.newGame('woni', QUESTS);
    const completable: string[] = [];
    gs.bus.on('questCompletable', (p) => completable.push(p.questId));
    gs.quests.start('q1');
    expect(gs.report({ type: 'enemy_killed', enemyId: 'slime' })).toEqual(['q1']);
    expect(completable).toEqual(['q1']);
    const reward = gs.completeQuest('q1');
    expect(reward.xp).toBe(20);
    expect(gs.player.xp).toBe(20);
    expect(gs.hearts).toBe(5);
    expect(gs.inventory.items.food_mulhoe).toBe(2);
    expect(gs.memes.unlocked).toEqual(['may_grip']);
    expect(gs.memes.equipped).toEqual([null, null]);
    expect(gs.fame).toBe(1);
    expect(gs.flags.has('f1')).toBe(true);
    expect(gs.quests.status('q1')).toBe('done');
  });
});

describe('snapshot round trip', () => {
  it('restores player, quests, flags and location', () => {
    const gs = GameState.newGame('zena', QUESTS);
    gs.quests.start('q1');
    gs.addHearts(30);
    gs.flags.add('x');
    gs.location = { mapId: 'ch1_practice', spawnId: 'from_alley' };
    gs.playTimeMs = 1234;
    const snap = gs.snapshot();
    const back = GameState.fromSnapshot(snap, QUESTS);
    expect(back.snapshot()).toEqual(snap);
    expect(back.quests.status('q1')).toBe('active');
    expect(back.flags.has('x')).toBe(true);
    expect(back.player.member).toBe('zena');
  });
});
```

`tests/save.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';
import { SAVE_VERSION, SLOT_COUNT, createLocalStorageStore, createMemoryStore, deserialize, listSlots, loadGame, saveGame, serialize } from '../src/systems/save';

describe('serialize/deserialize', () => {
  it('round-trips a snapshot', () => {
    const snap = GameState.newGame('may', []).snapshot();
    expect(deserialize(serialize(snap))).toEqual(snap);
  });
  it('rejects malformed json and wrong shapes', () => {
    expect(() => deserialize('not json')).toThrow();
    expect(() => deserialize('{"version":1}')).toThrow();
  });
  it('rejects a newer version than it knows', () => {
    const snap = { ...GameState.newGame('may', []).snapshot(), version: SAVE_VERSION + 1 };
    expect(() => deserialize(JSON.stringify(snap))).toThrow(/version/);
  });
});

describe('stores', () => {
  it('memory store saves, lists and loads three slots', () => {
    const store = createMemoryStore();
    expect(listSlots(store)).toEqual([null, null, null]);
    expect(SLOT_COUNT).toBe(3);
    const snap = GameState.newGame('liv', []).snapshot();
    saveGame(store, 1, snap);
    expect(loadGame(store, 1)).toEqual(snap);
    expect(loadGame(store, 0)).toBeNull();
    expect(listSlots(store)[1]).toEqual({ member: 'liv', level: 1, chapter: 0, savedAt: snap.savedAt, playTimeMs: 0 });
  });
  it('localStorage store uses namespaced keys', () => {
    const backing = new Map<string, string>();
    const fake = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    } as unknown as Storage;
    const store = createLocalStorageStore(fake);
    saveGame(store, 2, GameState.newGame('minami', []).snapshot());
    expect([...backing.keys()]).toEqual(['rescene.save.2']);
    store.clear(2);
    expect(backing.size).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- game-state save`
Expected: FAIL — `Cannot find module '../src/core/GameState'`

- [ ] **Step 3: EventBus 구현**

`src/core/EventBus.ts`:
```ts
type Handler<T> = (payload: T) => void;

export class EventBus<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(key: K, handler: Handler<E[K]>): () => void {
    if (!this.handlers.has(key)) this.handlers.set(key, new Set());
    this.handlers.get(key)!.add(handler as Handler<never>);
    return () => this.off(key, handler);
  }

  off<K extends keyof E>(key: K, handler: Handler<E[K]>): void {
    this.handlers.get(key)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(key: K, payload: E[K]): void {
    for (const h of [...(this.handlers.get(key) ?? [])]) (h as Handler<E[K]>)(payload);
  }
}
```

- [ ] **Step 4: GameState 구현**

`src/core/GameState.ts`:
```ts
import { EventBus } from './EventBus';
import { getItem, getMeme, getMember } from '../data/index';
import type { QuestDef, Reward } from '../data/schema';
import { addItem, emptyInventory, equipmentStats, type InventoryState } from '../systems/inventory';
import { emptyMemeState, openMemeSlot, passiveTotals, unlockMeme, type MemeState } from '../systems/memes';
import { applyXp, statsForLevel } from '../systems/progression';
import { QuestEngine, emptyQuestState, type GameEvent, type QuestContext, type QuestState } from '../systems/quest';
import { emptySkillRuntime, type SkillRuntime } from '../systems/skills';
import { STAT_KEYS, type MemberId, type PlayerState, type Stats } from '../systems/types';

export const SAVE_VERSION = 1;

export interface GameStateSnapshot {
  version: number;
  player: PlayerState;
  inventory: InventoryState;
  hearts: number;
  memes: MemeState;
  quests: QuestState;
  flags: string[];
  fame: number;
  location: { mapId: string; spawnId: string };
  chapter: number;
  playTimeMs: number;
  savedAt: number;
}

export interface GameEvents {
  changed: undefined;
  levelup: { level: number };
  died: undefined;
  questCompletable: { questId: string };
  questCompleted: { questId: string; reward: Reward };
  memeUnlocked: { memeId: string };
}

export class GameState {
  player: PlayerState;
  inventory: InventoryState;
  hearts: number;
  memes: MemeState;
  readonly flags: Set<string>;
  fame: number;
  location: { mapId: string; spawnId: string };
  chapter: number;
  playTimeMs: number;
  savedAt: number;
  readonly quests: QuestEngine;
  readonly bus = new EventBus<GameEvents>();
  skillRuntime: SkillRuntime = emptySkillRuntime();
  private readonly questCtx: QuestContext;

  private constructor(snap: GameStateSnapshot, questDefs: QuestDef[]) {
    this.player = { ...snap.player, skillLevels: { ...snap.player.skillLevels } };
    this.inventory = { items: { ...snap.inventory.items }, equipment: { ...snap.inventory.equipment } };
    this.hearts = snap.hearts;
    this.memes = { unlocked: [...snap.memes.unlocked], equipped: [...snap.memes.equipped] };
    this.flags = new Set(snap.flags);
    this.fame = snap.fame;
    this.location = { ...snap.location };
    this.chapter = snap.chapter;
    this.playTimeMs = snap.playTimeMs;
    this.savedAt = snap.savedAt;
    this.questCtx = { level: snap.player.level, member: snap.player.member };
    this.quests = new QuestEngine(questDefs, snap.quests, this.flags, this.questCtx);
  }

  static newGame(member: MemberId, questDefs: QuestDef[]): GameState {
    const def = getMember(member);
    return new GameState(
      {
        version: SAVE_VERSION,
        player: { member, level: 1, xp: 0, sp: 0, hp: def.baseStats.hp, mp: def.baseStats.mp, skillLevels: {} },
        inventory: emptyInventory(),
        hearts: 0,
        memes: emptyMemeState(1),
        quests: emptyQuestState(),
        flags: [],
        fame: 0,
        location: { mapId: def.prologueMap, spawnId: 'start' },
        chapter: 0,
        playTimeMs: 0,
        savedAt: 0,
      },
      questDefs,
    );
  }

  static fromSnapshot(snap: GameStateSnapshot, questDefs: QuestDef[]): GameState {
    return new GameState(snap, questDefs);
  }

  snapshot(): GameStateSnapshot {
    return {
      version: SAVE_VERSION,
      player: { ...this.player, skillLevels: { ...this.player.skillLevels } },
      inventory: { items: { ...this.inventory.items }, equipment: { ...this.inventory.equipment } },
      hearts: this.hearts,
      memes: { unlocked: [...this.memes.unlocked], equipped: [...this.memes.equipped] },
      quests: this.quests.getState(),
      flags: [...this.flags],
      fame: this.fame,
      location: { ...this.location },
      chapter: this.chapter,
      playTimeMs: this.playTimeMs,
      savedAt: this.savedAt,
    };
  }

  maxStats(): Stats {
    const def = getMember(this.player.member);
    const stats = statsForLevel(def.baseStats, def.growth, this.player.level);
    const equip = equipmentStats(this.inventory, getItem);
    const passives = passiveTotals(this.memes, getMeme);
    for (const k of STAT_KEYS) stats[k] += (equip[k] ?? 0) + (passives[k] ?? 0);
    return stats;
  }

  private changed(): void {
    this.bus.emit('changed', undefined);
  }

  gainXp(xp: number): number {
    const r = applyXp(this.player, xp);
    this.player = r.state;
    if (r.levelsGained > 0) {
      this.questCtx.level = this.player.level;
      const max = this.maxStats();
      this.player = { ...this.player, hp: max.hp, mp: max.mp };
      this.bus.emit('levelup', { level: this.player.level });
    }
    this.changed();
    return r.levelsGained;
  }

  addHearts(n: number): void {
    this.hearts += n;
    this.changed();
  }

  heal(hp: number, mp: number): void {
    const max = this.maxStats();
    this.player = { ...this.player, hp: Math.min(max.hp, this.player.hp + hp), mp: Math.min(max.mp, this.player.mp + mp) };
    this.changed();
  }

  takeDamage(n: number): boolean {
    this.player = { ...this.player, hp: Math.max(0, this.player.hp - n) };
    this.changed();
    if (this.player.hp === 0) {
      this.bus.emit('died', undefined);
      return true;
    }
    return false;
  }

  applyReward(r: Reward): void {
    if (r.hearts) this.hearts += r.hearts;
    for (const it of r.items ?? []) this.inventory = addItem(this.inventory, it.id, it.count);
    if (r.fame) this.fame += r.fame;
    if (r.openMemeSlot) this.memes = openMemeSlot(this.memes);
    if (r.meme) {
      this.memes = unlockMeme(this.memes, r.meme);
      this.bus.emit('memeUnlocked', { memeId: r.meme });
    }
    if (r.xp) this.gainXp(r.xp);
    else this.changed();
  }

  report(ev: GameEvent): string[] {
    const ids = this.quests.report(ev);
    for (const questId of ids) this.bus.emit('questCompletable', { questId });
    if (ids.length) this.changed();
    return ids;
  }

  completeQuest(id: string): Reward {
    const reward = this.quests.complete(id);
    this.applyReward(reward);
    this.bus.emit('questCompleted', { questId: id, reward });
    return reward;
  }
}
```

- [ ] **Step 5: save 구현**

`src/systems/save.ts`:
```ts
import { z } from 'zod';
import { SAVE_VERSION, type GameStateSnapshot } from '../core/GameState';
import { MemberIdSchema, EquipSlotSchema } from '../data/schema';
import type { MemberId } from './types';

export { SAVE_VERSION };
export const SLOT_COUNT = 3;

const SnapshotSchema = z.object({
  version: z.number().int(),
  player: z.object({
    member: MemberIdSchema, level: z.number().int().min(1), xp: z.number().min(0), sp: z.number().int().min(0),
    hp: z.number().min(0), mp: z.number().min(0), skillLevels: z.record(z.number().int()),
  }),
  inventory: z.object({ items: z.record(z.number().int()), equipment: z.record(EquipSlotSchema, z.string().nullable()) }),
  hearts: z.number().int().min(0),
  memes: z.object({ unlocked: z.array(z.string()), equipped: z.array(z.string().nullable()) }),
  quests: z.object({ active: z.record(z.array(z.number())), done: z.array(z.string()) }),
  flags: z.array(z.string()),
  fame: z.number().min(0),
  location: z.object({ mapId: z.string(), spawnId: z.string() }),
  chapter: z.number().int().min(0),
  playTimeMs: z.number().min(0),
  savedAt: z.number(),
});

/** 버전별 마이그레이션. 키 n은 "버전 n → n+1". */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

export function serialize(snap: GameStateSnapshot): string {
  return JSON.stringify(snap);
}

export function deserialize(json: string): GameStateSnapshot {
  let raw = JSON.parse(json) as Record<string, unknown>;
  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version > SAVE_VERSION) throw new Error(`save version ${version} is newer than supported ${SAVE_VERSION}`);
  for (let v = version; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`no migration from save version ${v}`);
    raw = { ...step(raw), version: v + 1 };
  }
  return SnapshotSchema.parse(raw) as GameStateSnapshot;
}

export interface SaveStore {
  read(slot: number): string | null;
  write(slot: number, data: string): void;
  clear(slot: number): void;
}

export function createMemoryStore(): SaveStore {
  const m = new Map<number, string>();
  return { read: (s) => m.get(s) ?? null, write: (s, d) => void m.set(s, d), clear: (s) => void m.delete(s) };
}

export function createLocalStorageStore(storage: Storage): SaveStore {
  const key = (slot: number) => `rescene.save.${slot}`;
  return {
    read: (s) => storage.getItem(key(s)),
    write: (s, d) => storage.setItem(key(s), d),
    clear: (s) => storage.removeItem(key(s)),
  };
}

export interface SlotSummary {
  member: MemberId;
  level: number;
  chapter: number;
  savedAt: number;
  playTimeMs: number;
}

function assertSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) throw new Error(`invalid slot ${slot}`);
}

export function saveGame(store: SaveStore, slot: number, snap: GameStateSnapshot): void {
  assertSlot(slot);
  store.write(slot, serialize(snap));
}

export function loadGame(store: SaveStore, slot: number): GameStateSnapshot | null {
  assertSlot(slot);
  const raw = store.read(slot);
  return raw === null ? null : deserialize(raw);
}

export function listSlots(store: SaveStore): (SlotSummary | null)[] {
  return Array.from({ length: SLOT_COUNT }, (_, slot) => {
    const raw = store.read(slot);
    if (raw === null) return null;
    try {
      const s = deserialize(raw);
      return { member: s.player.member, level: s.player.level, chapter: s.chapter, savedAt: s.savedAt, playTimeMs: s.playTimeMs };
    } catch {
      return null;
    }
  });
}
```

- [ ] **Step 6: 통과 확인**

Run: `npm test`
Expected: PASS (game-state 7, save 5 포함 전부). `no-phaser-in-systems`도 통과(`core/`는 검사 대상이 아니지만 Phaser를 import하지 않는다).

- [ ] **Step 7: 커밋**

```bash
git add src/core src/systems/save.ts tests/game-state.test.ts tests/save.test.ts
git commit -m "feat: GameState 단일 상태와 저장/불러오기" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 11: 맵 파이프라인 (ASCII → Tiled JSON)

**Files:**
- Create: `tools/ascii-map.ts`, `tools/build-maps.ts`, `maps/ch1_practice.txt`, `src/data/maps.ts`
- Generate: `public/assets/maps/ch1_practice.json` (커밋한다)
- Test: `tests/ascii-map.test.ts`, `tests/maps.test.ts`

**Interfaces:**
- ASCII 포맷 (`maps/<id>.txt`):
  ```
  # 첫 줄은 주석
  @meta id=ch1_practice chapter=1 name="더뮤즈 연습실 (야간)"
  @tiles
  ....   ← '.' 빈칸, '#' 바닥(gid 1), '=' 원웨이 발판(gid 2), 'H' 사다리(gid 3)
  @objects
  <type> <name> <tx> <ty> [key=value ...]
  ```
  `type`은 `spawn|portal|npc|enemy|savepoint|boss`. `tx`,`ty`는 오브젝트의 **발이 놓인 빈 칸**(바닥/발판 타일 바로 위 칸)의 열/행. 픽셀 변환: `x = tx*32+16`, `y = (ty+1)*32` (발 위치 = 아래 타일의 윗변, 엔티티 origin은 (0.5, 1)).
- Produces (ascii-map.ts): `interface AsciiObject { type; name; tx; ty; props: Record<string,string> }`, `interface ParsedAsciiMap { id; meta: Record<string,string>; rows: string[]; objects: AsciiObject[] }`, `parseAsciiMap(text): ParsedAsciiMap` (ragged rows·모르는 문자·잘못된 오브젝트 줄이면 throw), `toTiled(parsed): TiledMap` (Tiled 1.10 JSON 호환. tilelayer `ground`/`platforms`/`ladders`, objectgroup `spawns_player`/`portals`/`spawns_npc`/`spawns_enemy`/`savepoints`/`bosses`), `TILE_GIDS = { '#': 1, '=': 2, 'H': 3 }`
- Produces (maps.ts): `MapDef { id; name; chapter; file }`, `MAPS: MapDef[]`, `getMap(id)`
- 포탈 오브젝트는 `target=<mapId> spawn=<spawnName>` props 필수. Tiled 오브젝트로는 32×64 사각형(발 위치에서 위로).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/ascii-map.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseAsciiMap, toTiled } from '../tools/ascii-map';

const SRC = `# test map
@meta id=t chapter=1 name="테스트"
@tiles
......
..==..
H.....
######
@objects
spawn start 1 2
portal exit 4 2 target=other spawn=in
enemy enemy_sleep_slime 3 2
npc npc_woni 2 2 dialogue=d1
savepoint scent_t 0 2
`;

describe('parseAsciiMap', () => {
  it('parses meta, rows and objects', () => {
    const p = parseAsciiMap(SRC);
    expect(p.id).toBe('t');
    expect(p.meta).toEqual({ id: 't', chapter: '1', name: '테스트' });
    expect(p.rows).toHaveLength(4);
    expect(p.objects).toHaveLength(5);
    expect(p.objects[1]).toEqual({ type: 'portal', name: 'exit', tx: 4, ty: 2, props: { target: 'other', spawn: 'in' } });
  });
  it('rejects ragged rows', () => {
    expect(() => parseAsciiMap(SRC.replace('..==..', '..==.'))).toThrow(/row 1/);
  });
  it('rejects unknown tile characters', () => {
    expect(() => parseAsciiMap(SRC.replace('H.....', 'H..X..'))).toThrow(/'X'/);
  });
  it('rejects portals without target/spawn and unknown object types', () => {
    expect(() => parseAsciiMap(SRC.replace(' target=other spawn=in', ''))).toThrow(/portal exit/);
    expect(() => parseAsciiMap(SRC.replace('savepoint scent_t', 'tree scent_t'))).toThrow(/tree/);
  });
});

describe('toTiled', () => {
  const t = toTiled(parseAsciiMap(SRC));
  const layer = (name: string) => t.layers.find((l) => l.name === name)!;
  it('emits map size, tileset and properties', () => {
    expect(t.width).toBe(6);
    expect(t.height).toBe(4);
    expect(t.tilewidth).toBe(32);
    expect(t.tilesets[0]).toMatchObject({ firstgid: 1, name: 'tiles', tilecount: 3 });
    expect(t.properties).toEqual([
      { name: 'chapter', type: 'int', value: 1 },
      { name: 'name', type: 'string', value: '테스트' },
    ]);
  });
  it('splits tiles into ground/platforms/ladders layers with gids', () => {
    const ground = layer('ground');
    expect(ground.type).toBe('tilelayer');
    expect(ground.data!.slice(18, 24)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(layer('platforms').data![8]).toBe(2);
    expect(layer('platforms').data![0]).toBe(0);
    expect(layer('ladders').data![12]).toBe(3);
  });
  it('converts objects to pixel coordinates by type', () => {
    const spawn = layer('spawns_player').objects![0]!;
    expect(spawn).toMatchObject({ name: 'start', x: 48, y: 96, point: true });
    const portal = layer('portals').objects![0]!;
    expect(portal).toMatchObject({ name: 'exit', x: 128, y: 32, width: 32, height: 64 });
    expect(portal.properties).toEqual([
      { name: 'spawn', type: 'string', value: 'in' },
      { name: 'target', type: 'string', value: 'other' },
    ]);
    expect(layer('spawns_enemy').objects![0]).toMatchObject({ name: 'enemy_sleep_slime', x: 112, y: 96 });
    expect(layer('spawns_npc').objects![0]!.properties).toEqual([{ name: 'dialogue', type: 'string', value: 'd1' }]);
    expect(layer('savepoints').objects![0]).toMatchObject({ name: 'scent_t' });
  });
});
```

`tests/maps.test.ts` (실제 맵 파일 전수 검사. 이후 태스크가 NPC 검사를 추가한다):
```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseAsciiMap } from '../tools/ascii-map';
import { MAPS, getMap } from '../src/data/maps';
import { getEnemy } from '../src/data/index';

const files = readdirSync('maps').filter((f) => f.endsWith('.txt'));
const parsed = files.map((f) => parseAsciiMap(readFileSync(join('maps', f), 'utf8')));
const byId = new Map(parsed.map((p) => [p.id, p]));

describe('map sources', () => {
  it('every source is registered and every registry entry has a source and a generated json', () => {
    expect([...byId.keys()].sort()).toEqual(MAPS.map((m) => m.id).sort());
    for (const m of MAPS) expect(existsSync(join('public/assets/maps', m.file)), m.id).toBe(true);
  });
  it('every map has a start spawn', () => {
    for (const p of parsed) expect(p.objects.some((o) => o.type === 'spawn' && o.name === 'start'), p.id).toBe(true);
  });
  it('portals point at existing maps and spawns', () => {
    for (const p of parsed) {
      for (const o of p.objects.filter((o) => o.type === 'portal')) {
        const target = byId.get(o.props.target!);
        expect(target, `${p.id}/${o.name} -> ${o.props.target}`).toBeDefined();
        expect(target!.objects.some((s) => s.type === 'spawn' && s.name === o.props.spawn), `${p.id}/${o.name} spawn ${o.props.spawn}`).toBe(true);
        getMap(o.props.target!);
      }
    }
  });
  it('enemy and boss spawns reference existing enemies', () => {
    for (const p of parsed) for (const o of p.objects.filter((o) => o.type === 'enemy' || o.type === 'boss')) expect(() => getEnemy(o.name), `${p.id}/${o.name}`).not.toThrow();
  });
  it('generated json matches sources (run npm run maps)', () => {
    for (const m of MAPS) {
      const json = JSON.parse(readFileSync(join('public/assets/maps', m.file), 'utf8'));
      expect(json.width, m.id).toBe(byId.get(m.id)!.rows[0]!.length);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- ascii-map maps`
Expected: FAIL — `Cannot find module '../tools/ascii-map'`

- [ ] **Step 3: 변환기 구현**

`tools/ascii-map.ts`:
```ts
export const TILE = 32;
export const TILE_GIDS: Record<string, number> = { '#': 1, '=': 2, 'H': 3 };
const EMPTY = '.';
const OBJECT_TYPES = ['spawn', 'portal', 'npc', 'enemy', 'savepoint', 'boss'] as const;
export type AsciiObjectType = (typeof OBJECT_TYPES)[number];

export interface AsciiObject {
  type: AsciiObjectType;
  name: string;
  tx: number;
  ty: number;
  props: Record<string, string>;
}

export interface ParsedAsciiMap {
  id: string;
  meta: Record<string, string>;
  rows: string[];
  objects: AsciiObject[];
}

function parseKeyValues(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const eq = t.indexOf('=');
    if (eq <= 0) throw new Error(`bad key=value token '${t}'`);
    out[t.slice(0, eq)] = t.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return out;
}

function tokenize(line: string): string[] {
  // key="값에 공백 포함" 토큰을 하나로 유지한다
  return line.match(/[^\s"]+="[^"]*"|"[^"]*"|\S+/g) ?? [];
}

export function parseAsciiMap(text: string): ParsedAsciiMap {
  const lines = text.split(/\r?\n/);
  let section: 'none' | 'tiles' | 'objects' = 'none';
  const meta: Record<string, string> = {};
  const rows: string[] = [];
  const objects: AsciiObject[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (section !== 'tiles' && (line === '' || line.startsWith('#'))) continue;
    if (line.startsWith('@meta')) { Object.assign(meta, parseKeyValues(tokenize(line).slice(1))); continue; }
    if (line === '@tiles') { section = 'tiles'; continue; }
    if (line === '@objects') { section = 'objects'; continue; }
    if (section === 'tiles') {
      if (line === '') continue;
      for (const ch of line) if (ch !== EMPTY && !(ch in TILE_GIDS)) throw new Error(`unknown tile char '${ch}' in row ${rows.length}`);
      rows.push(line);
    } else if (section === 'objects') {
      const [type, name, tx, ty, ...rest] = tokenize(line);
      if (!type || !name || tx === undefined || ty === undefined) throw new Error(`bad object line '${line}'`);
      if (!(OBJECT_TYPES as readonly string[]).includes(type)) throw new Error(`unknown object type '${type}'`);
      const props = parseKeyValues(rest);
      if (type === 'portal' && (!props.target || !props.spawn)) throw new Error(`portal ${name} needs target= and spawn=`);
      objects.push({ type: type as AsciiObjectType, name, tx: Number(tx), ty: Number(ty), props });
    }
  }

  if (!meta.id) throw new Error('@meta id= is required');
  if (rows.length === 0) throw new Error('@tiles section is empty');
  const width = rows[0]!.length;
  rows.forEach((r, i) => { if (r.length !== width) throw new Error(`row ${i} has length ${r.length}, expected ${width}`); });
  return { id: meta.id, meta, rows, objects };
}

export interface TiledProperty { name: string; type: 'string' | 'int' | 'bool'; value: string | number | boolean }
export interface TiledObject {
  id: number; name: string; type: string; x: number; y: number; width: number; height: number;
  rotation: 0; visible: true; point?: true; properties: TiledProperty[];
}
export interface TiledLayer {
  id: number; name: string; type: 'tilelayer' | 'objectgroup'; x: 0; y: 0; opacity: 1; visible: true;
  width?: number; height?: number; data?: number[]; objects?: TiledObject[];
}
export interface TiledMap {
  type: 'map'; version: string; tiledversion: string; orientation: 'orthogonal'; renderorder: 'right-down'; infinite: false;
  width: number; height: number; tilewidth: number; tileheight: number; nextlayerid: number; nextobjectid: number;
  properties: TiledProperty[];
  tilesets: { firstgid: number; name: string; tilewidth: number; tileheight: number; tilecount: number; columns: number; image: string; imagewidth: number; imageheight: number; margin: 0; spacing: 0 }[];
  layers: TiledLayer[];
}

const OBJECT_LAYER: Record<AsciiObjectType, string> = {
  spawn: 'spawns_player', portal: 'portals', npc: 'spawns_npc', enemy: 'spawns_enemy', savepoint: 'savepoints', boss: 'bosses',
};

export function toTiled(p: ParsedAsciiMap): TiledMap {
  const width = p.rows[0]!.length;
  const height = p.rows.length;
  const tileLayer = (name: string, chars: string[]): TiledLayer => ({
    id: 0, name, type: 'tilelayer', x: 0, y: 0, opacity: 1, visible: true, width, height,
    data: p.rows.flatMap((row) => [...row].map((ch) => (chars.includes(ch) ? TILE_GIDS[ch]! : 0))),
  });
  const layers: TiledLayer[] = [tileLayer('ground', ['#']), tileLayer('platforms', ['=']), tileLayer('ladders', ['H'])];

  let nextObjectId = 1;
  for (const layerName of Object.values(OBJECT_LAYER)) {
    const objects = p.objects
      .filter((o) => OBJECT_LAYER[o.type] === layerName)
      .map((o): TiledObject => {
        const footX = o.tx * TILE + TILE / 2;
        const footY = (o.ty + 1) * TILE;
        const properties = Object.entries(o.props).sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]): TiledProperty => ({ name, type: 'string', value }));
        const base = { id: nextObjectId++, name: o.name, type: o.type, rotation: 0 as const, visible: true as const, properties };
        if (o.type === 'portal') return { ...base, x: footX - TILE / 2, y: footY - 2 * TILE, width: TILE, height: 2 * TILE };
        return { ...base, x: footX, y: footY, width: 0, height: 0, point: true };
      });
    layers.push({ id: 0, name: layerName, type: 'objectgroup', x: 0, y: 0, opacity: 1, visible: true, objects });
  }
  layers.forEach((l, i) => (l.id = i + 1));

  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down', infinite: false,
    width, height, tilewidth: TILE, tileheight: TILE, nextlayerid: layers.length + 1, nextobjectid: nextObjectId,
    properties: [
      { name: 'chapter', type: 'int', value: Number(p.meta.chapter ?? 0) },
      { name: 'name', type: 'string', value: p.meta.name ?? p.id },
    ],
    tilesets: [{ firstgid: 1, name: 'tiles', tilewidth: TILE, tileheight: TILE, tilecount: 3, columns: 3, image: 'tiles.png', imagewidth: 96, imageheight: 32, margin: 0, spacing: 0 }],
    layers,
  };
}
```

`tools/build-maps.ts`:
```ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAsciiMap, toTiled } from './ascii-map';

const SRC = 'maps';
const OUT = 'public/assets/maps';
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.txt'))) {
  const parsed = parseAsciiMap(readFileSync(join(SRC, file), 'utf8'));
  const out = join(OUT, `${parsed.id}.json`);
  writeFileSync(out, JSON.stringify(toTiled(parsed)));
  console.log(`${file} -> ${out} (${parsed.rows[0]!.length}x${parsed.rows.length}, ${parsed.objects.length} objects)`);
}
```

- [ ] **Step 4: 첫 맵과 레지스트리 작성**

`maps/ch1_practice.txt` (40×15. 바닥, 발판 2단, 사다리 1개, 슬라임 4마리, 원이 NPC, 향기 저장 지점, 오른쪽 끝 골목 포탈):
```
# 챕터 1 — 더뮤즈 연습실 (야간)
@meta id=ch1_practice chapter=1 name="더뮤즈 연습실 (야간)"
@tiles
........................................
........................................
........................................
........................................
..........=====.........=====...........
........................................
........................................
....=====...........H........=====......
....................H...................
....................H...................
....................H...................
....................H...................
........................................
........................................
########################################
@objects
spawn start 2 13
spawn from_alley 37 13
savepoint scent_practice 4 13
npc npc_woni 7 13
enemy enemy_sleep_slime 14 13
enemy enemy_sleep_slime 22 13
enemy enemy_sleep_slime 30 13
enemy enemy_sleep_slime 12 6
portal to_alley 38 13 target=ch1_alley spawn=from_practice
```

`src/data/maps.ts`:
```ts
export interface MapDef {
  id: string;
  name: string;
  chapter: number;
  file: string;
}

export const MAPS: MapDef[] = [
  { id: 'ch1_practice', name: '더뮤즈 연습실 (야간)', chapter: 1, file: 'ch1_practice.json' },
];

const byId = new Map(MAPS.map((m) => [m.id, m]));
export function getMap(id: string): MapDef {
  const m = byId.get(id);
  if (!m) throw new Error(`unknown map: ${id}`);
  return m;
}
```

- [ ] **Step 5: 맵 생성 후 테스트**

Run: `npm run maps && npm test -- ascii-map maps`
Expected: `ch1_practice.txt -> public/assets/maps/ch1_practice.json (40x15, 9 objects)`. ascii-map 7 PASS. maps 테스트는 **portals 케이스가 FAIL**한다: `to_alley -> ch1_alley` 맵이 아직 없다.

- [ ] **Step 6: 골목 맵 스텁 추가로 참조를 닫는다**

`maps/ch1_alley.txt` (Task 21에서 내용을 채운다. 지금은 왕복 포탈만):
```
# 챕터 1 — 편의점 골목 (Task 21에서 확장)
@meta id=ch1_alley chapter=1 name="편의점 골목"
@tiles
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
........................................
########################################
@objects
spawn start 2 13
spawn from_practice 2 13
portal to_practice 1 13 target=ch1_practice spawn=from_alley
```
`src/data/maps.ts`의 `MAPS`에 추가: `{ id: 'ch1_alley', name: '편의점 골목', chapter: 1, file: 'ch1_alley.json' },`

Run: `npm run maps && npm test`
Expected: 전부 PASS

- [ ] **Step 7: 커밋**

```bash
git add tools maps public/assets/maps src/data/maps.ts tests/ascii-map.test.ts tests/maps.test.ts
git commit -m "feat: ASCII 맵을 Tiled JSON으로 변환하는 파이프라인과 첫 맵" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 12: 챕터 0 콘텐츠 — NPC 스키마, 컷신, 프롤로그 5맵·대사

**Files:**
- Modify: `src/data/schema.ts` (NpcDef, CutsceneDef), `src/data/enemies.ts` (챕터 0 적 추가), `src/data/index.ts` (NPC·대사·퀘스트·컷신 getter와 참조 검사), `src/data/maps.ts`
- Create: `src/data/chapters/index.ts`, `src/data/chapters/ch0/npcs.ts`, `src/data/chapters/ch0/dialogues.ts`, `src/data/chapters/ch0/cutscenes.ts`, `maps/ch0_geoje.txt`, `maps/ch0_suwon.txt`, `maps/ch0_chiba.txt`, `maps/ch0_goyang.txt`, `maps/ch0_gyeongju.txt`
- Test: `tests/data-schema.test.ts`(케이스 추가), `tests/maps.test.ts`(NPC 검사 추가)

**Interfaces:**
- Produces (schema.ts): `NpcDef { id; name; color; dialogue: string; member?: MemberId }` — `member`가 있으면 그 멤버가 플레이어일 때 스폰하지 않는다. `CutsceneDef { id; title; lines: string[] }`
- Produces (chapters/index.ts): `NPCS: NpcDef[]`, `DIALOGUES: DialogueScript[]`, `QUESTS: QuestDef[]`, `CUTSCENES: CutsceneDef[]` — 챕터 모듈을 모두 합친 배열. Task 13이 ch1을 여기에 추가한다.
- Produces (index.ts): `getNpc(id)`, `getDialogue(id)`, `getQuest(id)`, `getCutscene(id)`, `speakerName(id): string` (멤버 id → 이름, NPC id → 이름, `'narrator'` → `''`). `validateAllData()`가 퀘스트→NPC/대사/맵/아이템/유행어, NPC→대사, 대사 speaker 참조를 검사한다.
- 프롤로그 맵 id는 `MEMBERS[].prologueMap`과 일치: `ch0_geoje`(원이) `ch0_suwon`(리브) `ch0_chiba`(미나미) `ch0_goyang`(메이) `ch0_gyeongju`(제나). 각 맵의 포탈 `to_muze`는 `ch1_practice`의 `start`로 간다.
- 컷신 id 규약: `ch0_intro_<member>`, `ch1_intro`, `ch1_clear`.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/data-schema.test.ts`에 추가:
```ts
import { NPCS, DIALOGUES, CUTSCENES } from '../src/data/chapters/index';
import { NpcDefSchema, CutsceneDefSchema, DialogueScriptSchema } from '../src/data/schema';
import { getDialogue, getNpc, speakerName } from '../src/data/index';
import { MAPS } from '../src/data/maps';

describe('chapter 0 content', () => {
  it('npcs, dialogues and cutscenes pass their schemas', () => {
    NPCS.forEach((n) => expect(() => NpcDefSchema.parse(n), n.id).not.toThrow());
    DIALOGUES.forEach((d) => expect(() => DialogueScriptSchema.parse(d), d.id).not.toThrow());
    CUTSCENES.forEach((c) => expect(() => CutsceneDefSchema.parse(c), c.id).not.toThrow());
  });
  it('every npc default dialogue exists and every speaker resolves to a name', () => {
    for (const n of NPCS) expect(() => getDialogue(n.dialogue), n.id).not.toThrow();
    for (const d of DIALOGUES) for (const node of d.nodes) {
      if (node.speaker === 'narrator') continue;
      expect(speakerName(node.speaker), `${d.id}/${node.id}`).not.toBe('');
    }
  });
  it('every member has a prologue map, intro cutscene and audition dialogue', () => {
    for (const m of MEMBERS) {
      expect(MAPS.some((map) => map.id === m.prologueMap), m.id).toBe(true);
      expect(CUTSCENES.some((c) => c.id === `ch0_intro_${m.id}`), m.id).toBe(true);
      expect(() => getDialogue(`d0_${m.id}_audition`), m.id).not.toThrow();
    }
  });
  it('member npcs are tagged with their member', () => {
    for (const m of MEMBERS) expect(getNpc(`npc_${m.id}`).member).toBe(m.id);
  });
});
```

`tests/maps.test.ts`에 추가:
```ts
import { getNpc } from '../src/data/index';

  it('npc spawns reference existing npcs', () => {
    for (const p of parsed) for (const o of p.objects.filter((o) => o.type === 'npc')) expect(() => getNpc(o.name), `${p.id}/${o.name}`).not.toThrow();
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- data-schema maps`
Expected: FAIL — `Cannot find module '../src/data/chapters/index'`

- [ ] **Step 3: 스키마·적 추가**

`src/data/schema.ts` 끝에 추가:
```ts
export const NpcDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  dialogue: z.string().min(1),
  member: MemberIdSchema.optional(),
});
export type NpcDef = z.infer<typeof NpcDefSchema>;

export const CutsceneDefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lines: z.array(z.string().min(1)).min(1),
});
export type CutsceneDef = z.infer<typeof CutsceneDefSchema>;
```

`src/data/enemies.ts`의 `ENEMIES` 맨 앞에 추가 (프롤로그 튜토리얼용):
```ts
  { id: 'enemy_nerves', name: '떨림', chapter: 0, hp: 15, atk: 2, def: 0, spd: 30, xp: 8, hearts: [1, 3],
    ai: 'patrol', width: 28, height: 28, color: '#a9b1d6', drops: [] },
```

- [ ] **Step 4: 챕터 0 데이터 작성**

`src/data/chapters/ch0/npcs.ts`:
```ts
import type { NpcDef } from '../../schema';

export const CH0_NPCS: NpcDef[] = [
  { id: 'npc_woni', name: '원이', color: '#045a42', dialogue: 'd_woni_idle', member: 'woni' },
  { id: 'npc_liv', name: '리브', color: '#ffb3c6', dialogue: 'd_liv_idle', member: 'liv' },
  { id: 'npc_minami', name: '미나미', color: '#ffd166', dialogue: 'd_minami_idle', member: 'minami' },
  { id: 'npc_may', name: '메이', color: '#ffe08a', dialogue: 'd_may_idle', member: 'may' },
  { id: 'npc_zena', name: '제나', color: '#c77dff', dialogue: 'd_zena_idle', member: 'zena' },
  { id: 'npc_audition_judge', name: '오디션 심사위원', color: '#c0caf5', dialogue: 'd0_judge_idle' },
];
```

`src/data/chapters/ch0/dialogues.ts`:
```ts
import type { DialogueScript } from '../../schema';

const line = (id: string, speaker: string, text: string, next?: string): DialogueScript['nodes'][number] =>
  next ? { id, speaker, text, next } : { id, speaker, text, end: true };

export const CH0_DIALOGUES: DialogueScript[] = [
  { id: 'd_woni_idle', nodes: [line('n0', 'woni', '우이! 오늘도 연습 가자.')] },
  { id: 'd_liv_idle', nodes: [line('n0', 'liv', '천천히 가도 멈추지 말자. 내 좌우명이야.')] },
  { id: 'd_minami_idle', nodes: [line('n0', 'minami', '한국어 아직 어렵지만... 죄송합니다, 는 제일 먼저 배웠어요.')] },
  { id: 'd_may_idle', nodes: [line('n0', 'may', '기회는 그립감이 좋다! ...라고 하면 좀 멋있죠?')] },
  { id: 'd_zena_idle', nodes: [line('n0', 'zena', '...')] },
  { id: 'd0_judge_idle', nodes: [line('n0', 'npc_audition_judge', '준비되면 오른쪽 문으로. 더뮤즈는 저 너머야.')] },

  { id: 'd0_woni_audition', nodes: [
    line('n0', 'npc_audition_judge', '거제에서 부산까지 매주 다녔다고? 뮤닥터 아카데미 원이 맞지?', 'n1'),
    line('n1', 'woni', '예. 중학교 때 댄스부 "성지뱀장어"도 제가 만들었습니다.', 'n2'),
    line('n2', 'npc_audition_judge', '뱀장어... 강하고 유연해서? 좋네. 더뮤즈로 가자.', 'n3'),
    line('n3', 'woni', '우이!'),
  ] },
  { id: 'd0_liv_audition', nodes: [
    line('n0', 'npc_audition_judge', 'JYP, SM, 더블랙레이블... 붙은 데가 이렇게 많은데 왜 여길?', 'n1'),
    line('n1', 'liv', '출구 없는 매력을 가진 진경은입니다. 여기서 시작하고 싶어요.', 'n2'),
    line('n2', 'npc_audition_judge', '그 자신감, 무대에서 보자.'),
  ] },
  { id: 'd0_minami_audition', nodes: [
    line('n0', 'npc_audition_judge', '방과후 설렘 파이널까지 갔다가 일본으로 돌아갔었지.', 'n1'),
    line('n1', 'minami', '네. 그래도 다시 왔어요. 한국어는 참가 3일 전에 시작했는데, 지금은 꽤 해요.', 'n2'),
    line('n2', 'npc_audition_judge', '끈기 하나는 확실하네. 환영해.'),
  ] },
  { id: 'd0_may_audition', nodes: [
    line('n0', 'npc_audition_judge', '픽플래닛 홍대점 오디션에서 왔구나. 긴장했어?', 'n1'),
    line('n1', 'may', '조금요... 아니 많이요. 그래도 기회는 와야 잡을 수 있는 거니까요.', 'n2'),
    line('n2', 'npc_audition_judge', '좋은 말이네. 잡아 봐.'),
  ] },
  { id: 'd0_zena_audition', nodes: [
    line('n0', 'npc_audition_judge', '청춘스타 2라운드에서 봤어. 경주에서 이미 유명하던데?', 'n1'),
    line('n1', 'zena', '...', 'n2'),
    line('n2', 'npc_audition_judge', '말수는 적어도 무대에선 다르다는 거 알아. 더뮤즈로 가자.', 'n3'),
    line('n3', 'zena', '...그게 뭔데요?'),
  ] },
];
```

`src/data/chapters/ch0/cutscenes.ts`:
```ts
import type { CutsceneDef } from '../../schema';

export const CH0_CUTSCENES: CutsceneDef[] = [
  { id: 'ch0_intro_woni', title: '장면 0 — 거제, 2022년', lines: ['거제 바닷가에서 자란 소녀는 매주 부산의 아카데미로 향했다.', '오늘은 더뮤즈엔터테인먼트 오디션 날이다.'] },
  { id: 'ch0_intro_liv', title: '장면 0 — 수원, 2023년', lines: ['여러 기획사의 합격 통보가 쌓였다.', '하지만 진경은은 아직 시작할 곳을 고르지 못했다.'] },
  { id: 'ch0_intro_minami', title: '장면 0 — 치바, 2021년', lines: ['1048대 1을 뚫고 방과후 설렘 파이널까지 갔지만 데뷔조에 들지 못했다.', '일본으로 돌아간 미나미는 다시 짐을 쌌다.'] },
  { id: 'ch0_intro_may', title: '장면 0 — 고양, 2023년', lines: ['픽플래닛 아카데미 홍대점.', '오디션 순서를 기다리는 예빈의 손이 떨렸다.'] },
  { id: 'ch0_intro_zena', title: '장면 0 — 경주, 2022년', lines: ['청춘스타 2라운드 탈락.', '경주의 유명한 춤꾼은 한 마디도 없이 짐을 쌌다.'] },
];
```

`src/data/chapters/index.ts`:
```ts
import type { CutsceneDef, DialogueScript, NpcDef, QuestDef } from '../schema';
import { CH0_NPCS } from './ch0/npcs';
import { CH0_DIALOGUES } from './ch0/dialogues';
import { CH0_CUTSCENES } from './ch0/cutscenes';

export const NPCS: NpcDef[] = [...CH0_NPCS];
export const DIALOGUES: DialogueScript[] = [...CH0_DIALOGUES];
export const QUESTS: QuestDef[] = [];
export const CUTSCENES: CutsceneDef[] = [...CH0_CUTSCENES];
```

- [ ] **Step 5: index.ts에 getter와 참조 검사 추가**

`src/data/index.ts`에 추가:
```ts
import { CutsceneDefSchema, DialogueScriptSchema, NpcDefSchema, QuestDefSchema, type CutsceneDef, type DialogueScript, type NpcDef, type QuestDef } from './schema';
import { CUTSCENES, DIALOGUES, NPCS, QUESTS } from './chapters/index';
import { MAPS, getMap } from './maps';
import { MEMBER_IDS } from '../systems/types';
export { CUTSCENES, DIALOGUES, NPCS, QUESTS, MAPS, getMap };

const npcById = new Map(NPCS.map((n) => [n.id, n]));
const dialogueById = new Map(DIALOGUES.map((d) => [d.id, d]));
const questById = new Map(QUESTS.map((q) => [q.id, q]));
const cutsceneById = new Map(CUTSCENES.map((c) => [c.id, c]));

export function getNpc(id: string): NpcDef {
  const n = npcById.get(id);
  if (!n) throw new Error(`unknown npc: ${id}`);
  return n;
}
export function getDialogue(id: string): DialogueScript {
  const d = dialogueById.get(id);
  if (!d) throw new Error(`unknown dialogue: ${id}`);
  return d;
}
export function getQuest(id: string): QuestDef {
  const q = questById.get(id);
  if (!q) throw new Error(`unknown quest: ${id}`);
  return q;
}
export function getCutscene(id: string): CutsceneDef {
  const c = cutsceneById.get(id);
  if (!c) throw new Error(`unknown cutscene: ${id}`);
  return c;
}
export function speakerName(id: string): string {
  if (id === 'narrator') return '';
  if ((MEMBER_IDS as string[]).includes(id)) return getMember(id as MemberId).name;
  return npcById.get(id)?.name ?? '';
}
```
`validateAllData()` 본문 끝에 추가:
```ts
  NPCS.forEach((n) => NpcDefSchema.parse(n));
  DIALOGUES.forEach((d) => DialogueScriptSchema.parse(d));
  QUESTS.forEach((q) => QuestDefSchema.parse(q));
  CUTSCENES.forEach((c) => CutsceneDefSchema.parse(c));
  assertUnique('npc', NPCS.map((n) => n.id));
  assertUnique('dialogue', DIALOGUES.map((d) => d.id));
  assertUnique('quest', QUESTS.map((q) => q.id));
  assertUnique('cutscene', CUTSCENES.map((c) => c.id));
  for (const n of NPCS) getDialogue(n.dialogue);
  for (const d of DIALOGUES) for (const node of d.nodes) {
    if (node.speaker !== 'narrator' && speakerName(node.speaker) === '') throw new Error(`dialogue ${d.id}/${node.id}: unknown speaker ${node.speaker}`);
  }
  for (const q of QUESTS) {
    getNpc(q.giver);
    getMap(q.map);
    getDialogue(q.dialogues.offer); getDialogue(q.dialogues.inProgress); getDialogue(q.dialogues.complete);
    for (const o of q.objectives) {
      if (o.kind === 'kill') getEnemy(o.target);
      if (o.kind === 'collect') getItem(o.target);
      if (o.kind === 'talk') { getNpc(o.target); if (o.dialogue) getDialogue(o.dialogue); }
      if (o.kind === 'reach') getMap(o.target);
      if (o.kind === 'emote') { getMeme(o.target); getMap(o.map); }
    }
    for (const it of q.rewards.items ?? []) getItem(it.id);
    if (q.rewards.meme) getMeme(q.rewards.meme);
    for (const id of q.requires?.questsDone ?? []) getQuest(id);
  }
  for (const m of MEMBERS) { getMap(m.prologueMap); getCutscene(`ch0_intro_${m.id}`); }
```

- [ ] **Step 6: 프롤로그 맵 5개 작성**

다섯 맵은 같은 레이아웃(30×12)을 쓰고 NPC 대사와 이름만 다르다. `maps/ch0_geoje.txt`:
```
# 챕터 0 — 거제 바닷가 (원이 프롤로그)
@meta id=ch0_geoje chapter=0 name="거제 바닷가"
@tiles
..............................
..............................
..............................
..............................
..........=====...............
..............................
..............................
....=====..........=====......
..............................
..............................
..............................
##############################
@objects
spawn start 2 10
savepoint scent_home 4 10
npc npc_audition_judge 24 10 dialogue=d0_woni_audition
enemy enemy_nerves 12 10
enemy enemy_nerves 17 10
portal to_muze 28 10 target=ch1_practice spawn=start
```
나머지 네 파일은 `@meta`의 `id`/`name`과 NPC 줄의 `dialogue=`만 바꾼다:

| 파일 | id | name | dialogue |
|---|---|---|---|
| `maps/ch0_suwon.txt` | `ch0_suwon` | `"수원 오디션 복도"` | `d0_liv_audition` |
| `maps/ch0_chiba.txt` | `ch0_chiba` | `"치바 야치요 골목"` | `d0_minami_audition` |
| `maps/ch0_goyang.txt` | `ch0_goyang` | `"픽플래닛 아카데미"` | `d0_may_audition` |
| `maps/ch0_gyeongju.txt` | `ch0_gyeongju` | `"청춘스타 대기실"` | `d0_zena_audition` |

`src/data/maps.ts`의 `MAPS`에 추가:
```ts
  { id: 'ch0_geoje', name: '거제 바닷가', chapter: 0, file: 'ch0_geoje.json' },
  { id: 'ch0_suwon', name: '수원 오디션 복도', chapter: 0, file: 'ch0_suwon.json' },
  { id: 'ch0_chiba', name: '치바 야치요 골목', chapter: 0, file: 'ch0_chiba.json' },
  { id: 'ch0_goyang', name: '픽플래닛 아카데미', chapter: 0, file: 'ch0_goyang.json' },
  { id: 'ch0_gyeongju', name: '청춘스타 대기실', chapter: 0, file: 'ch0_gyeongju.json' },
```

NPC 오브젝트의 `dialogue=` prop은 NPC 기본 대사를 **그 맵에서만** 덮어쓴다(WorldScene이 Task 20에서 사용).

- [ ] **Step 7: 맵 생성과 테스트**

Run: `npm run maps && npm test`
Expected: 전부 PASS

- [ ] **Step 8: 커밋**

```bash
git add src/data maps public/assets/maps tests
git commit -m "feat: 챕터 0 프롤로그 콘텐츠 (NPC·대사·컷신·맵 5개)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 13: 챕터 1 콘텐츠 — 퀘스트 5개, 대사, NPC, 맵 4개

**Files:**
- Create: `src/data/chapters/ch1/npcs.ts`, `src/data/chapters/ch1/quests.ts`, `src/data/chapters/ch1/dialogues.ts`, `src/data/chapters/ch1/cutscenes.ts`, `maps/ch1_rooftop.txt`, `maps/ch1_exam.txt`
- Modify: `src/data/chapters/index.ts`, `src/data/maps.ts`, `maps/ch1_practice.txt`, `maps/ch1_alley.txt`, `src/systems/quest.ts` (자기 멤버 talk 자동 완료)
- Test: `tests/data-schema.test.ts`, `tests/quest.test.ts` (케이스 추가)

**Interfaces:**
- 퀘스트 체인: `q1_01 첫 연습` → `q1_02 편의점 심부름` → `q1_03 막내의 한 마디` → `q1_04 메이를 붙잡아` → `q1_05 월말평가`. 모든 giver는 역할 NPC(`npc_dance_teacher`, `npc_manager`).
- 규칙 추가 (quest.ts): `start()` 시 `talk` 목표의 target이 `npc_<플레이어 멤버>`면 진행도를 1로 시작한다(자기 자신과는 대화할 수 없으므로). 수직 슬라이스 한정 단순화.
- 맵: `ch1_practice`(허브) ↔ `ch1_alley` ↔ `ch1_rooftop`, `ch1_practice` → `ch1_exam`(보스, 포탈은 `requiresFlag=q1_04_done`).
- 포탈 prop 확장: `requiresFlag=<flag>`가 있으면 플래그가 없을 때 포탈이 잠긴다(WorldScene이 Task 16에서 처리).

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/quest.test.ts`에 추가:
```ts
describe('self-talk objectives', () => {
  it('auto-completes talk objectives targeting the player\'s own member npc', () => {
    const defs: QuestDef[] = [{ id: 'q_self', chapter: 1, type: 'main', title: 's', description: '', giver: 'npc_manager', map: 'm',
      objectives: [{ kind: 'talk', target: 'npc_may' }, { kind: 'talk', target: 'npc_zena' }], rewards: {}, dialogues: dlg }];
    const asMay = new QuestEngine(defs, emptyQuestState(), new Set(), { level: 1, member: 'may' });
    asMay.start('q_self');
    expect(asMay.progress('q_self')).toEqual([1, 0]);
  });
});
```

`tests/data-schema.test.ts`에 추가:
```ts
import { QUESTS } from '../src/data/chapters/index';
import { QuestDefSchema } from '../src/data/schema';

describe('chapter 1 quests', () => {
  it('pass the schema and validateAllData resolves every reference', () => {
    QUESTS.forEach((q) => expect(() => QuestDefSchema.parse(q), q.id).not.toThrow());
    expect(() => validateAllData()).not.toThrow();
  });
  it('form an unbroken main chain q1_01..q1_05', () => {
    const main = QUESTS.filter((q) => q.chapter === 1 && q.type === 'main').map((q) => q.id);
    expect(main).toEqual(['q1_01', 'q1_02', 'q1_03', 'q1_04', 'q1_05']);
    for (let i = 1; i < main.length; i++) expect(QUESTS.find((q) => q.id === main[i])!.requires?.questsDone).toEqual([main[i - 1]]);
  });
  it('q1_05 kills the boss and opens a meme slot', () => {
    const q = QUESTS.find((q) => q.id === 'q1_05')!;
    expect(q.objectives).toEqual([{ kind: 'kill', target: 'boss_monthly_judges', count: 1 }]);
    expect(q.rewards.openMemeSlot).toBe(true);
    expect(q.rewards.flags).toContain('ch1_clear');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- quest data-schema`
Expected: FAIL — self-talk 진행도 `[0, 0]`; `QUESTS`가 비어 있어 체인 테스트 실패

- [ ] **Step 3: quest.ts 수정**

`src/systems/quest.ts`의 `start()`를 교체:
```ts
  start(id: string): void {
    if (this.status(id) !== 'available') throw new Error(`quest ${id} is not available`);
    const self = `npc_${this.ctx.member}`;
    const initial = this.def(id).objectives.map((o) => (o.kind === 'talk' && o.target === self ? 1 : 0));
    this.state = { ...this.state, active: { ...this.state.active, [id]: initial } };
  }
```

- [ ] **Step 4: 챕터 1 데이터 작성**

`src/data/chapters/ch1/npcs.ts`:
```ts
import type { NpcDef } from '../../schema';

export const CH1_NPCS: NpcDef[] = [
  { id: 'npc_dance_teacher', name: '안무 선생님', color: '#9ece6a', dialogue: 'd1_dance_teacher_idle' },
  { id: 'npc_manager', name: '매니저', color: '#7dcfff', dialogue: 'd1_manager_idle' },
  { id: 'npc_clerk', name: '편의점 알바', color: '#e0af68', dialogue: 'd1_clerk_idle' },
];
```

`src/data/chapters/ch1/quests.ts`:
```ts
import type { QuestDef } from '../../schema';

export const CH1_QUESTS: QuestDef[] = [
  { id: 'q1_01', chapter: 1, type: 'main', title: '첫 연습', description: '연습실의 졸음 슬라임 5마리를 쫓아내자.',
    giver: 'npc_dance_teacher', map: 'ch1_practice',
    objectives: [{ kind: 'kill', target: 'enemy_sleep_slime', count: 5 }],
    rewards: { xp: 60, hearts: 20, fame: 1 },
    dialogues: { offer: 'd1_q01_offer', inProgress: 'd1_q01_progress', complete: 'd1_q01_complete' } },
  { id: 'q1_02', chapter: 1, type: 'main', title: '편의점 심부름', description: '골목의 근육통 버섯이 떨어뜨리는 야식 재료 3개를 모으자.',
    giver: 'npc_manager', map: 'ch1_practice', requires: { questsDone: ['q1_01'] },
    objectives: [{ kind: 'collect', target: 'etc_snack_ingredient', count: 3 }],
    rewards: { xp: 80, hearts: 30, items: [{ id: 'food_yeopddeok', count: 2 }] },
    dialogues: { offer: 'd1_q02_offer', inProgress: 'd1_q02_progress', complete: 'd1_q02_complete' } },
  { id: 'q1_03', chapter: 1, type: 'main', title: '막내의 한 마디', description: '숙소 대신 연습실에 남은 멤버들과 이야기하자. 제나는 한 시간에 한 마디만 한다.',
    giver: 'npc_manager', map: 'ch1_practice', requires: { questsDone: ['q1_02'] },
    objectives: [
      { kind: 'talk', target: 'npc_zena', dialogue: 'd1_zena_word' },
      { kind: 'talk', target: 'npc_minami', dialogue: 'd1_minami_korean' },
      { kind: 'talk', target: 'npc_liv', dialogue: 'd1_liv_motto' },
    ],
    rewards: { xp: 100, hearts: 30, meme: 'liv_motto', fame: 1 },
    dialogues: { offer: 'd1_q03_offer', inProgress: 'd1_q03_progress', complete: 'd1_q03_complete' } },
  { id: 'q1_04', chapter: 1, type: 'main', title: '메이를 붙잡아', description: '옥상의 자기의심 그림자를 물리치고 메이와 이야기하자.',
    giver: 'npc_manager', map: 'ch1_practice', requires: { questsDone: ['q1_03'] },
    objectives: [
      { kind: 'kill', target: 'enemy_selfdoubt', count: 3 },
      { kind: 'talk', target: 'npc_may', dialogue: 'd1_may_stay' },
    ],
    rewards: { xp: 150, hearts: 50, meme: 'may_grip', fame: 2, flags: ['q1_04_done'] },
    dialogues: { offer: 'd1_q04_offer', inProgress: 'd1_q04_progress', complete: 'd1_q04_complete' } },
  { id: 'q1_05', chapter: 1, type: 'main', title: '월말평가', description: '평가장의 심사위원단 앞에서 한 달의 연습을 증명하자.',
    giver: 'npc_dance_teacher', map: 'ch1_practice', requires: { questsDone: ['q1_04'] },
    objectives: [{ kind: 'kill', target: 'boss_monthly_judges', count: 1 }],
    rewards: { xp: 400, hearts: 150, meme: 'woni_ui', openMemeSlot: true, fame: 5, flags: ['ch1_clear'] },
    dialogues: { offer: 'd1_q05_offer', inProgress: 'd1_q05_progress', complete: 'd1_q05_complete' } },
];
```

`src/data/chapters/ch1/dialogues.ts`:
```ts
import type { DialogueScript } from '../../schema';

type Node = DialogueScript['nodes'][number];
const line = (id: string, speaker: string, text: string, next?: string): Node =>
  next ? { id, speaker, text, next } : { id, speaker, text, end: true };
const one = (id: string, speaker: string, text: string): DialogueScript => ({ id, nodes: [line('n0', speaker, text)] });

export const CH1_DIALOGUES: DialogueScript[] = [
  one('d1_dance_teacher_idle', 'npc_dance_teacher', '자세 낮추고, 시선은 앞. 다시!'),
  one('d1_manager_idle', 'npc_manager', '스케줄표 확인했지? 오늘도 연습실 마감이야.'),
  one('d1_clerk_idle', 'npc_clerk', '또 야식이에요? 근육통 버섯 조심하세요, 골목에 많아요.'),

  { id: 'd1_q01_offer', nodes: [
    line('n0', 'npc_dance_teacher', '연습실에 졸음 슬라임이 잔뜩이네. 야간 연습이 이래서 힘들어.', 'n1'),
    line('n1', 'npc_dance_teacher', '다섯 마리만 쫓아내 봐. 몸 풀기 삼아. (A: 공격, S: 스킬)'),
  ] },
  one('d1_q01_progress', 'npc_dance_teacher', '아직 졸음이 남아 있는데? 다섯 마리야.'),
  one('d1_q01_complete', 'npc_dance_teacher', '좋아, 이제 잠은 깼지? 매니저가 찾더라.'),

  { id: 'd1_q02_offer', nodes: [
    line('n0', 'npc_manager', '배고프지? 골목 편의점에서 야식 재료 좀 구해 와.', 'n1'),
    line('n1', 'npc_manager', '골목에 근육통 버섯이 있는데, 걔들이 재료를 떨어뜨려. 세 개면 돼.'),
  ] },
  one('d1_q02_progress', 'npc_manager', '재료 세 개. 골목이야, 골목.'),
  one('d1_q02_complete', 'npc_manager', '엽떡 두 개 챙겨 줄게. 리브가 좋아하는 거.'),

  { id: 'd1_q03_offer', nodes: [
    line('n0', 'npc_manager', '막내 제나가 들어온 지 한 달인데 한 시간에 한 마디밖에 안 해.', 'n1'),
    line('n1', 'npc_manager', '연습실에 남은 애들이랑 한 번씩 얘기해 봐. 제나, 미나미, 리브.'),
  ] },
  one('d1_q03_progress', 'npc_manager', '세 명 다 얘기해 봤어?'),
  one('d1_q03_complete', 'npc_manager', '리브 좌우명 들었지? 천천히 가도 멈추지 말자. 그거 기억해 둬.'),
  { id: 'd1_zena_word', nodes: [
    line('n0', 'zena', '...', 'n1'),
    line('n1', 'narrator', '(한참 뒤)', 'n2'),
    line('n2', 'zena', '...엄마 보고 싶어요.', 'n3'),
    line('n3', 'narrator', '(한 시간의 한 마디였다.)'),
  ] },
  { id: 'd1_minami_korean', nodes: [
    line('n0', 'minami', '오늘 배운 말: "박자 놓쳤다". 제가 제일 많이 듣는 말이에요.', 'n1'),
    line('n1', 'minami', '...농담이에요. 저 박자 안 놓쳐요.'),
  ] },
  { id: 'd1_liv_motto', nodes: [
    line('n0', 'liv', '힘들지? 나도. 근데 내 좌우명이 뭔지 알아?', 'n1'),
    line('n1', 'liv', '천천히 가도 멈추지 말자. 그러니까 오늘도 한 번만 더.'),
  ] },

  { id: 'd1_q04_offer', nodes: [
    line('n0', 'npc_manager', '메이가 옥상에 올라갔어. 요즘 자꾸 그만두겠다고 해.', 'n1'),
    line('n1', 'npc_manager', '옥상에 자기의심 그림자가 붙어 있을 거야. 걷어내고 얘기 좀 해 줘.'),
  ] },
  one('d1_q04_progress', 'npc_manager', '옥상이야. 그림자 셋, 그리고 메이.'),
  one('d1_q04_complete', 'npc_manager', '메이가 남기로 했다며. 고마워. 이제 월말평가만 남았네.'),
  { id: 'd1_may_stay', nodes: [
    { id: 'n0', speaker: 'may', face: 'sad', text: '언니... 저 진짜 못 하겠어요. 그만둘까 봐요.', next: 'n1' },
    { id: 'n1', speaker: 'narrator', text: '(원이라면 이렇게 말했을 것이다. "기회는 잡는 것도 기회가 와야 잡을 수 있는 거다.")',
      choices: [
        { text: '같이 남자. 기회는 와야 잡는 거야.', next: 'n2', setFlags: ['may_stayed'] },
        { text: '네 마음이 제일 중요해.', next: 'n3' },
      ] },
    { id: 'n2', speaker: 'may', face: 'happy', text: '...그립감, 좋네요. 남을게요.', end: true },
    { id: 'n3', speaker: 'may', text: '...조금만 더 생각해 볼게요. 그래도 고마워요.', next: 'n2' },
  ] },

  { id: 'd1_q05_offer', nodes: [
    line('n0', 'npc_dance_teacher', '월말평가다. 보컬, 댄스, 랩 순서로 본다.', 'n1'),
    line('n1', 'npc_dance_teacher', '평가장 문은 오른쪽 위. 준비되면 들어가. 한 달 동안 한 거, 다 보여 줘.'),
  ] },
  one('d1_q05_progress', 'npc_dance_teacher', '평가장은 오른쪽 위 문이야. 심사위원단이 기다려.'),
  { id: 'd1_q05_complete', nodes: [
    line('n0', 'npc_dance_teacher', '통과. 데뷔조야.', 'n1'),
    line('n1', 'narrator', '2024년 2월, 더뮤즈엔터테인먼트는 새 걸그룹의 COMING SOON을 띄웠다.', 'n2'),
    line('n2', 'narrator', '이름은 RESCENE. 향기로 장면을 다시 떠올린다는 뜻이었다.'),
  ] },
];
```

`src/data/chapters/ch1/cutscenes.ts`:
```ts
import type { CutsceneDef } from '../../schema';

export const CH1_CUTSCENES: CutsceneDef[] = [
  { id: 'ch1_intro', title: '장면 1 — 연습생', lines: ['더뮤즈엔터테인먼트 연습실.', '원이와 미나미는 2022년에, 리브·제나·메이는 2023년에 이곳에 왔다.', '데뷔조는 아직 정해지지 않았다.'] },
  { id: 'ch1_clear', title: '장면 1 — 끝', lines: ['월말평가를 통과했다.', '다섯 명의 이름이 데뷔조 명단에 올랐다.', '(장면 2 "데뷔"는 다음 업데이트에서.)'] },
];
```

`src/data/chapters/index.ts` 교체:
```ts
import type { CutsceneDef, DialogueScript, NpcDef, QuestDef } from '../schema';
import { CH0_NPCS } from './ch0/npcs';
import { CH0_DIALOGUES } from './ch0/dialogues';
import { CH0_CUTSCENES } from './ch0/cutscenes';
import { CH1_NPCS } from './ch1/npcs';
import { CH1_DIALOGUES } from './ch1/dialogues';
import { CH1_QUESTS } from './ch1/quests';
import { CH1_CUTSCENES } from './ch1/cutscenes';

export const NPCS: NpcDef[] = [...CH0_NPCS, ...CH1_NPCS];
export const DIALOGUES: DialogueScript[] = [...CH0_DIALOGUES, ...CH1_DIALOGUES];
export const QUESTS: QuestDef[] = [...CH1_QUESTS];
export const CUTSCENES: CutsceneDef[] = [...CH0_CUTSCENES, ...CH1_CUTSCENES];
```

- [ ] **Step 5: 맵 수정·추가**

`maps/ch1_practice.txt`의 `@tiles` 4번째 줄(0-based 3행)을 `..............................=====.....`로 바꿔 우상단 발판(30~34열)을 만들고, `@objects`를 아래로 교체한다 (멤버 NPC 5명, 선생님·매니저, 슬라임 6마리, 평가장 포탈):
```
@objects
spawn start 2 13
spawn from_alley 37 13
spawn from_exam 31 2
savepoint scent_practice 4 13
npc npc_dance_teacher 7 13
npc npc_manager 10 13
npc npc_woni 16 13
npc npc_may 22 13
npc npc_minami 6 6
npc npc_liv 31 6
npc npc_zena 26 3
enemy enemy_sleep_slime 14 13
enemy enemy_sleep_slime 19 13
enemy enemy_sleep_slime 25 13
enemy enemy_sleep_slime 30 13
enemy enemy_sleep_slime 12 3
enemy enemy_sleep_slime 34 13
portal to_alley 38 13 target=ch1_alley spawn=from_practice
portal to_exam 33 2 target=ch1_exam spawn=start requiresFlag=q1_04_done
```
발판 위 오브젝트는 발판 행보다 1 작은 `ty`를 쓴다 (4행 발판 10~14열 → `12 3`, 7행 발판 4~8열 → `6 6`).

`maps/ch1_alley.txt` 전체 교체 (40×15, 버섯 5, 메트로놈 2, 알바 NPC, 옥상 포탈):
```
# 챕터 1 — 편의점 골목
@meta id=ch1_alley chapter=1 name="편의점 골목"
@tiles
........................................
........................................
........................................
.................................=====..
........................................
........................................
......=====.........=====...............
........................................
........................................
..............H.........................
..............H.........................
..............H.........................
.........=====..........=====...........
........................................
########################################
@objects
spawn start 2 13
spawn from_practice 2 13
spawn from_rooftop 36 2
savepoint scent_alley 4 13
npc npc_clerk 8 13
enemy enemy_sore_mushroom 15 13
enemy enemy_sore_mushroom 21 13
enemy enemy_sore_mushroom 28 13
enemy enemy_sore_mushroom 11 11
enemy enemy_sore_mushroom 26 11
enemy enemy_offbeat_metronome 33 13
enemy enemy_offbeat_metronome 22 5
portal to_practice 1 13 target=ch1_practice spawn=from_alley
portal to_rooftop 37 2 target=ch1_rooftop spawn=start
```

`maps/ch1_rooftop.txt` (30×12, 그림자 3, 메이 NPC):
```
# 챕터 1 — 옥상
@meta id=ch1_rooftop chapter=1 name="옥상"
@tiles
..............................
..............................
..............................
..............................
........=====.....=====.......
..............................
..............................
..............................
...=====............=====.....
..............................
..............................
##############################
@objects
spawn start 2 10
savepoint scent_rooftop 4 10
npc npc_may 27 10
enemy enemy_selfdoubt 10 10
enemy enemy_selfdoubt 18 10
enemy enemy_selfdoubt 21 7
portal to_alley 1 10 target=ch1_alley spawn=from_rooftop
```

`maps/ch1_exam.txt` (24×12, 보스 1):
```
# 챕터 1 — 월말평가장
@meta id=ch1_exam chapter=1 name="월말평가장"
@tiles
........................
........................
........................
........................
....=====......=====....
........................
........................
........................
........................
........................
........................
########################
@objects
spawn start 2 10
boss boss_monthly_judges 18 10
portal to_practice 1 10 target=ch1_practice spawn=from_exam
```

`src/data/maps.ts`의 `MAPS`에 추가:
```ts
  { id: 'ch1_rooftop', name: '옥상', chapter: 1, file: 'ch1_rooftop.json' },
  { id: 'ch1_exam', name: '월말평가장', chapter: 1, file: 'ch1_exam.json' },
```

- [ ] **Step 6: 맵 생성과 테스트**

Run: `npm run maps && npm test`
Expected: 전부 PASS (maps 테스트가 `npc_may`가 옥상과 연습실 두 곳에 있어도 통과 — NPC는 여러 맵에 있을 수 있다)

- [ ] **Step 7: 커밋**

```bash
git add src maps public/assets/maps tests
git commit -m "feat: 챕터 1 콘텐츠 (퀘스트 5개·대사·NPC·맵 4개)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 14: 시작 흐름 씬 — Boot, Preload(플레이스홀더 텍스처), Title, CharacterSelect

**Files:**
- Create: `src/core/AssetKeys.ts`, `src/core/session.ts`, `src/ui/placeholders.ts`, `src/ui/textStyles.ts`, `src/scenes/BootScene.ts`, `src/scenes/PreloadScene.ts`, `src/scenes/TitleScene.ts`, `src/scenes/CharacterSelectScene.ts`
- Modify: `src/main.ts` (씬 등록 순서), `src/scenes/WorldScene.ts` (`init(data)`로 mapId/spawnId 수신만 추가)
- Test: 수동 확인 (씬은 자동 테스트 대상 아님). `npx tsc --noEmit` 통과 필수.

**Interfaces:**
- Produces (AssetKeys.ts): `SCENE = { boot:'Boot', preload:'Preload', title:'Title', select:'CharacterSelect', world:'World', hud:'Hud', dialogue:'Dialogue', cutscene:'Cutscene' }`, `TEX = { tiles:'tiles', portal:'portal', portalLocked:'portal_locked', savepoint:'savepoint', heart:'drop_heart', item:'drop_item', projectile:'projectile', hit:'hit' }`, `playerTex(member)`, `enemyTex(enemyId)`, `npcTex(npcId)`, `mapKey(mapId)`
- Produces (session.ts): `interface Session { gs: GameState; slot: number; store: SaveStore }`, `setSession(scene, s)`, `getSession(scene): Session` (없으면 throw), `hasSession(scene)`
- Produces (placeholders.ts): `rectTexture(scene, key, w, h, fillHex: string, borderHex?: string)`, `makePlaceholderTextures(scene)` — 타일셋 96×32(바닥·발판·사다리), 멤버 5인 32×48, 모든 적 `width×height`, 모든 NPC 32×48, 포탈 32×64, 잠긴 포탈, 향기 24×40, 하트 12×12, 아이템 16×16, 투사체 14×8, 히트 이펙트 8×8
- Produces (textStyles.ts): `FONT = 'sans-serif'`, `style(size, color?, extra?)`, `UI_TEXT`, `TITLE_TEXT`, `SMALL_TEXT`
- `WorldScene.init(data: { mapId: string; spawnId: string })` — Task 15에서 본격 사용
- 키: Title ↑↓ 슬롯 선택, Enter 결정, N 새 게임(선택 슬롯 덮어씀). CharacterSelect ←→ 멤버, Enter 결정, Esc 뒤로.

- [ ] **Step 1: 공용 모듈 작성**

`src/core/AssetKeys.ts`:
```ts
import type { MemberId } from '../systems/types';

export const SCENE = {
  boot: 'Boot', preload: 'Preload', title: 'Title', select: 'CharacterSelect',
  world: 'World', hud: 'Hud', dialogue: 'Dialogue', cutscene: 'Cutscene',
} as const;

export const TEX = {
  tiles: 'tiles', portal: 'portal', portalLocked: 'portal_locked', savepoint: 'savepoint',
  heart: 'drop_heart', item: 'drop_item', projectile: 'projectile', hit: 'hit',
} as const;

export const playerTex = (member: MemberId): string => `player_${member}`;
export const enemyTex = (enemyId: string): string => `enemy_${enemyId}`;
export const npcTex = (npcId: string): string => `npc_${npcId}`;
export const mapKey = (mapId: string): string => `map_${mapId}`;
```

`src/core/session.ts`:
```ts
import type Phaser from 'phaser';
import type { GameState } from './GameState';
import type { SaveStore } from '../systems/save';

export interface Session {
  gs: GameState;
  slot: number;
  store: SaveStore;
}

const KEY = 'session';

export function setSession(scene: Phaser.Scene, s: Session): void {
  scene.registry.set(KEY, s);
}

export function hasSession(scene: Phaser.Scene): boolean {
  return scene.registry.has(KEY);
}

export function getSession(scene: Phaser.Scene): Session {
  const s = scene.registry.get(KEY) as Session | undefined;
  if (!s) throw new Error('no active session: start from Title');
  return s;
}
```

`src/ui/textStyles.ts`:
```ts
export const FONT = 'sans-serif';

export function style(size: number, color = '#c0caf5', extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color, ...extra };
}

export const TITLE_TEXT = style(40, '#ffffff', { fontStyle: 'bold' });
export const UI_TEXT = style(16);
export const SMALL_TEXT = style(12, '#a9b1d6');
```

`src/ui/placeholders.ts`:
```ts
import Phaser from 'phaser';
import { ENEMIES, MEMBERS, NPCS } from '../data/index';
import { TEX, enemyTex, npcTex, playerTex } from '../core/AssetKeys';

const hex = (h: string): number => Phaser.Display.Color.HexStringToColor(h).color;

export function rectTexture(scene: Phaser.Scene, key: string, w: number, h: number, fillHex: string, borderHex = '#1a1b26'): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(hex(fillHex), 1).fillRect(0, 0, w, h);
  g.lineStyle(2, hex(borderHex), 1).strokeRect(1, 1, w - 2, h - 2);
  g.generateTexture(key, w, h);
  g.destroy();
}

function tilesetTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.tiles)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // gid 1 바닥
  g.fillStyle(hex('#3b4261'), 1).fillRect(0, 0, 32, 32).lineStyle(1, hex('#565f89'), 1).strokeRect(0.5, 0.5, 31, 31);
  // gid 2 원웨이 발판 (윗면만 두껍게)
  g.fillStyle(hex('#9ece6a'), 1).fillRect(32, 0, 32, 8).fillStyle(hex('#4f6b2f'), 1).fillRect(32, 8, 32, 6);
  // gid 3 사다리
  g.fillStyle(hex('#e0af68'), 1).fillRect(64 + 6, 0, 4, 32).fillRect(64 + 22, 0, 4, 32);
  for (let y = 4; y < 32; y += 8) g.fillRect(64 + 6, y, 20, 3);
  g.generateTexture(TEX.tiles, 96, 32);
  g.destroy();
}

export function makePlaceholderTextures(scene: Phaser.Scene): void {
  tilesetTexture(scene);
  for (const m of MEMBERS) rectTexture(scene, playerTex(m.id), 32, 48, m.color, '#ffffff');
  for (const e of ENEMIES) rectTexture(scene, enemyTex(e.id), e.width, e.height, e.color);
  for (const n of NPCS) rectTexture(scene, npcTex(n.id), 32, 48, n.color);
  rectTexture(scene, TEX.portal, 32, 64, '#7dcfff', '#ffffff');
  rectTexture(scene, TEX.portalLocked, 32, 64, '#414868', '#565f89');
  rectTexture(scene, TEX.savepoint, 24, 40, '#ff9e64', '#ffffff');
  rectTexture(scene, TEX.heart, 12, 12, '#f7768e');
  rectTexture(scene, TEX.item, 16, 16, '#e0af68');
  rectTexture(scene, TEX.projectile, 14, 8, '#ffffff');
  rectTexture(scene, TEX.hit, 8, 8, '#ffffff');
}
```

- [ ] **Step 2: 씬 작성**

`src/scenes/BootScene.ts`:
```ts
import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE.boot);
  }
  create(): void {
    this.input.keyboard?.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    this.scene.start(SCENE.preload);
  }
}
```

`src/scenes/PreloadScene.ts`:
```ts
import Phaser from 'phaser';
import { MAPS } from '../data/index';
import { SCENE, mapKey } from '../core/AssetKeys';
import { makePlaceholderTextures } from '../ui/placeholders';
import { UI_TEXT } from '../ui/textStyles';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE.preload);
  }
  preload(): void {
    const label = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '불러오는 중...', UI_TEXT).setOrigin(0.5);
    this.load.on('progress', (v: number) => label.setText(`불러오는 중... ${Math.round(v * 100)}%`));
    for (const m of MAPS) this.load.tilemapTiledJSON(mapKey(m.id), `assets/maps/${m.file}`);
  }
  create(): void {
    makePlaceholderTextures(this);
    this.scene.start(SCENE.title);
  }
}
```

`src/scenes/TitleScene.ts`:
```ts
import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { GameState } from '../core/GameState';
import { setSession } from '../core/session';
import { QUESTS, getMember } from '../data/index';
import { SLOT_COUNT, createLocalStorageStore, listSlots, loadGame, type SlotSummary } from '../systems/save';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private rows: Phaser.GameObjects.Text[] = [];
  private summaries: (SlotSummary | null)[] = [];
  private readonly store = createLocalStorageStore(window.localStorage);

  constructor() {
    super(SCENE.title);
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 90, '리센느스토리', TITLE_TEXT).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 135, 'RESCENE STORY — 팬메이드 비영리', SMALL_TEXT).setOrigin(0.5);
    this.summaries = listSlots(this.store);
    this.rows = this.summaries.map((s, i) => this.add.text(GAME_WIDTH / 2, 230 + i * 44, this.label(i, s), UI_TEXT).setOrigin(0.5));
    this.add.text(GAME_WIDTH / 2, 420, '↑↓ 슬롯 선택   Enter 시작/이어하기   N 새로 시작(덮어쓰기)', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm(false));
    kb.on('keydown-N', () => this.confirm(true));
  }

  private label(i: number, s: SlotSummary | null): string {
    if (!s) return `슬롯 ${i + 1}  —  비어 있음`;
    const minutes = Math.floor(s.playTimeMs / 60000);
    return `슬롯 ${i + 1}  —  ${getMember(s.member).name} Lv.${s.level} · 장면 ${s.chapter} · ${minutes}분`;
  }

  private move(delta: number): void {
    this.selected = (this.selected + delta + SLOT_COUNT) % SLOT_COUNT;
    this.render();
  }

  private render(): void {
    this.rows.forEach((r, i) => r.setStyle(i === this.selected ? style(16, '#ffffff', { fontStyle: 'bold' }) : UI_TEXT).setText(`${i === this.selected ? '▶ ' : '   '}${this.label(i, this.summaries[i] ?? null)}`));
  }

  private confirm(forceNew: boolean): void {
    const slot = this.selected;
    const snap = forceNew ? null : loadGame(this.store, slot);
    if (!snap) {
      this.scene.start(SCENE.select, { slot });
      return;
    }
    const gs = GameState.fromSnapshot(snap, QUESTS);
    setSession(this, { gs, slot, store: this.store });
    this.scene.start(SCENE.world, { mapId: gs.location.mapId, spawnId: gs.location.spawnId });
  }
}
```

`src/scenes/CharacterSelectScene.ts`:
```ts
import Phaser from 'phaser';
import { SCENE, playerTex } from '../core/AssetKeys';
import { GameState } from '../core/GameState';
import { setSession } from '../core/session';
import { MEMBERS, QUESTS, getSkill } from '../data/index';
import { createLocalStorageStore } from '../systems/save';
import { SMALL_TEXT, TITLE_TEXT, UI_TEXT, style } from '../ui/textStyles';
import { GAME_WIDTH } from '../config';

export class CharacterSelectScene extends Phaser.Scene {
  private index = 0;
  private slot = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private detail!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE.select);
  }

  init(data: { slot: number }): void {
    this.slot = data.slot ?? 0;
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 60, '누구로 걸을까?', TITLE_TEXT).setOrigin(0.5);
    const gap = 170;
    const startX = GAME_WIDTH / 2 - gap * 2;
    this.cards = MEMBERS.map((m, i) => {
      const c = this.add.container(startX + i * gap, 230);
      c.add(this.add.image(0, 0, playerTex(m.id)).setScale(2));
      c.add(this.add.text(0, 70, m.name, UI_TEXT).setOrigin(0.5));
      c.add(this.add.text(0, 92, m.role, SMALL_TEXT).setOrigin(0.5));
      return c;
    });
    this.detail = this.add.text(GAME_WIDTH / 2, 380, '', style(14, '#c0caf5', { align: 'center' })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 470, '←→ 선택   Enter 결정   Esc 뒤로', SMALL_TEXT).setOrigin(0.5);
    this.render();

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-ESC', () => this.scene.start(SCENE.title));
  }

  private move(delta: number): void {
    this.index = (this.index + delta + MEMBERS.length) % MEMBERS.length;
    this.render();
  }

  private render(): void {
    this.cards.forEach((c, i) => c.setScale(i === this.index ? 1.15 : 1).setAlpha(i === this.index ? 1 : 0.6));
    const m = MEMBERS[this.index]!;
    const sig = getSkill(m.skills[1]!);
    this.detail.setText([`${m.name} · ${m.hometown} · 무기: ${m.weapon}`, `시그니처 스킬 "${sig.name}" — ${sig.origin}`, `체력 ${m.baseStats.hp} 기력 ${m.baseStats.mp} 끼 ${m.baseStats.atk} 멘탈 ${m.baseStats.def} 스피드 ${m.baseStats.spd} 기회 ${m.baseStats.luk}`]);
  }

  private confirm(): void {
    const m = MEMBERS[this.index]!;
    const gs = GameState.newGame(m.id, QUESTS);
    setSession(this, { gs, slot: this.slot, store: createLocalStorageStore(window.localStorage) });
    this.scene.start(SCENE.world, { mapId: gs.location.mapId, spawnId: gs.location.spawnId });
  }
}
```

- [ ] **Step 3: main.ts와 WorldScene.init 갱신**

`src/main.ts`의 `scene:` 배열을 교체:
```ts
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
// ...
  scene: [BootScene, PreloadScene, TitleScene, CharacterSelectScene, WorldScene],
```
`src/scenes/WorldScene.ts`에 추가:
```ts
  private mapId = '';
  private spawnId = 'start';

  init(data: { mapId: string; spawnId: string }): void {
    this.mapId = data.mapId;
    this.spawnId = data.spawnId ?? 'start';
  }
```
그리고 `create()` 첫 줄에 `this.add.text(8, 8, \`map: ${this.mapId}\`, { fontSize: '12px', color: '#fff' });`를 넣어 전달을 확인한다.

- [ ] **Step 4: 타입체크와 수동 확인**

Run: `npx tsc --noEmit && npm test && npm run dev`
Expected: 타입 에러 0, 테스트 PASS. 브라우저: 타이틀 → 슬롯 3개(모두 "비어 있음") → Enter → 멤버 5인 카드, ←→로 이동하면 상세 텍스트가 바뀜 → Enter → 기존 프로토타입 화면 좌상단에 `map: ch0_<hometown>` 표시.

- [ ] **Step 5: 커밋**

```bash
git add src
git commit -m "feat: 부트·프리로드·타이틀·캐릭터 선택 씬과 플레이스홀더 텍스처" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 15: WorldScene 맵 로딩과 Player 이동 (원웨이 발판·사다리·카메라)

**Files:**
- Create: `src/entities/Player.ts`, `src/scenes/worldObjects.ts`
- Modify: `src/scenes/WorldScene.ts` (전면 교체)
- Test: 수동 확인 + `npx tsc --noEmit`

**Interfaces:**
- Produces (worldObjects.ts): `interface MapObject { name: string; type: string; x: number; y: number; width: number; height: number; props: Record<string, string> }`, `objectsOf(map: Phaser.Tilemaps.Tilemap, layer: string): MapObject[]`, `findSpawn(map, name): { x: number; y: number }` (없으면 `start`, 그것도 없으면 throw)
- Produces (Player.ts): `class Player extends Phaser.Physics.Arcade.Sprite` — `moveState: MoveState`, `dropThroughUntil`, `invulnerableUntil`, `applyMovement(input: MoveInput, onLadder: boolean, ladderCenterX: number|null, cfg: MoveConfig)`, `facing` getter, `body` 크기 28×46, origin (0.5, 1)
- WorldScene: `init({ mapId, spawnId })`, 레이어 `ground`(충돌) · `platforms`(위에서만 충돌, ↓+Space로 통과) · `ladders`(겹침 검사). 키: ←→ 이동, Space 점프, ↑↓ 사다리. 2단 점프는 `gs.player.level >= 10`.
- WorldScene은 `create()`에서 `gs.location`을 갱신하고 `gs.report({ type: 'map_entered', mapId })`를 호출하며, `gs.chapter = max(gs.chapter, 맵 chapter)`.

- [ ] **Step 1: worldObjects.ts 작성**

`src/scenes/worldObjects.ts`:
```ts
import type Phaser from 'phaser';

export interface MapObject {
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  props: Record<string, string>;
}

export function objectsOf(map: Phaser.Tilemaps.Tilemap, layer: string): MapObject[] {
  const objs = map.getObjectLayer(layer)?.objects ?? [];
  return objs.map((o) => {
    const props: Record<string, string> = {};
    for (const p of (o.properties ?? []) as { name: string; value: string }[]) props[p.name] = String(p.value);
    return { name: o.name ?? '', type: o.type ?? '', x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? 0, height: o.height ?? 0, props };
  });
}

export function findSpawn(map: Phaser.Tilemaps.Tilemap, name: string): { x: number; y: number } {
  const spawns = objectsOf(map, 'spawns_player');
  const saves = objectsOf(map, 'savepoints');
  const hit = spawns.find((s) => s.name === name) ?? saves.find((s) => s.name === name) ?? spawns.find((s) => s.name === 'start');
  if (!hit) throw new Error(`map has no spawn '${name}' and no 'start'`);
  return { x: hit.x, y: hit.y };
}
```

- [ ] **Step 2: Player.ts 작성**

`src/entities/Player.ts`:
```ts
import Phaser from 'phaser';
import { playerTex } from '../core/AssetKeys';
import { stepMovement, type MoveConfig, type MoveInput, type MoveState } from '../systems/movement';
import type { MemberId } from '../systems/types';

export class Player extends Phaser.Physics.Arcade.Sprite {
  moveState: MoveState = { onGround: false, onLadder: false, climbing: false, jumpsLeft: 0, facing: 1 };
  dropThroughUntil = 0;
  invulnerableUntil = 0;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, member: MemberId) {
    super(scene, x, y, playerTex(member));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(28, 46).setOffset(2, 2);
    this.setCollideWorldBounds(true);
    this.setDepth(10);
  }

  get facing(): 1 | -1 {
    return this.moveState.facing;
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  applyMovement(input: MoveInput, onLadder: boolean, ladderCenterX: number | null, cfg: MoveConfig): void {
    const r = stepMovement(input, { ...this.moveState, onGround: this.onGround, onLadder }, cfg);
    this.moveState = { onGround: this.onGround, onLadder, climbing: r.climbing, jumpsLeft: r.jumpsLeft, facing: r.facing };
    this.body.setAllowGravity(r.gravity);
    this.setVelocityX(r.vx);
    if (r.vy !== null) this.setVelocityY(r.vy);
    if (r.climbing && ladderCenterX !== null) this.x = ladderCenterX;
    if (r.dropThrough) this.dropThroughUntil = this.scene.time.now + 250;
    this.setFlipX(r.facing === -1);
  }
}
```

- [ ] **Step 3: WorldScene 교체**

`src/scenes/WorldScene.ts`:
```ts
import Phaser from 'phaser';
import { SCENE, TEX, mapKey } from '../core/AssetKeys';
import { getSession, type Session } from '../core/session';
import { getMap } from '../data/index';
import { Player } from '../entities/Player';
import { DEFAULT_MOVE_CONFIG, type MoveConfig } from '../systems/movement';
import { SMALL_TEXT } from '../ui/textStyles';
import { findSpawn } from './worldObjects';

export interface WorldData {
  mapId: string;
  spawnId: string;
}

export class WorldScene extends Phaser.Scene {
  private mapId = '';
  private spawnId = 'start';
  private session!: Session;
  private map!: Phaser.Tilemaps.Tilemap;
  private ladders!: Phaser.Tilemaps.TilemapLayer;
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super(SCENE.world);
  }

  init(data: WorldData): void {
    this.mapId = data.mapId;
    this.spawnId = data.spawnId ?? 'start';
  }

  create(): void {
    this.session = getSession(this);
    const gs = this.session.gs;

    this.map = this.make.tilemap({ key: mapKey(this.mapId) });
    const tiles = this.map.addTilesetImage('tiles', TEX.tiles)!;
    const ground = this.map.createLayer('ground', tiles, 0, 0)!;
    ground.setCollisionByExclusion([-1, 0]);
    const platforms = this.map.createLayer('platforms', tiles, 0, 0)!;
    platforms.setCollisionByExclusion([-1, 0]);
    platforms.forEachTile((t) => { if (t.index > 0) t.setCollision(false, false, true, false); });
    this.ladders = this.map.createLayer('ladders', tiles, 0, 0)!;

    const spawn = findSpawn(this.map, this.spawnId);
    this.player = new Player(this, spawn.x, spawn.y, gs.player.member);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms, undefined, () =>
      this.time.now > this.player.dropThroughUntil && this.player.body.velocity.y >= 0 && !this.player.moveState.climbing);

    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor('#1f2335');

    this.cursors = this.input.keyboard!.createCursorKeys();

    const def = getMap(this.mapId);
    gs.location = { mapId: this.mapId, spawnId: this.spawnId };
    gs.chapter = Math.max(gs.chapter, def.chapter);
    gs.report({ type: 'map_entered', mapId: this.mapId });
    this.add.text(8, 8, def.name, SMALL_TEXT).setScrollFactor(0).setDepth(100);
  }

  private moveConfig(): MoveConfig {
    return { ...DEFAULT_MOVE_CONFIG, maxJumps: this.session.gs.player.level >= 10 ? 2 : 1 };
  }

  update(_time: number, delta: number): void {
    this.session.gs.playTimeMs += delta;
    const probe = this.ladders.getTileAtWorldXY(this.player.x, this.player.y - 20);
    const onLadder = !!probe && probe.index > 0;
    this.player.applyMovement(
      {
        left: this.cursors.left.isDown,
        right: this.cursors.right.isDown,
        up: this.cursors.up.isDown,
        down: this.cursors.down.isDown,
        jumpPressed: Phaser.Input.Keyboard.JustDown(this.cursors.space),
      },
      onLadder,
      onLadder ? probe!.getCenterX() : null,
      this.moveConfig(),
    );
  }
}
```

- [ ] **Step 4: 타입체크와 수동 확인**

Run: `npx tsc --noEmit && npm run dev`
Expected: 새 게임 시작 → 프롤로그 맵(30×12)이 보이고 카메라가 플레이어를 따라감. 확인 항목: (1) ←→ 이동, Space 점프 (2) 발판 아래에서 점프하면 발판을 통과해 올라감 (3) 발판 위에서 ↓+Space로 내려감 (4) 연습실(`ch1_practice`)로는 아직 못 가므로 `TitleScene.confirm`을 임시로 `ch1_practice`로 바꿔 사다리 확인: 사다리 앞에서 ↑ 누르면 오르고 Space로 이탈. 확인 후 원복.

- [ ] **Step 5: 커밋**

```bash
git add src
git commit -m "feat: Tiled 맵 로딩·원웨이 발판·사다리·카메라가 있는 WorldScene과 Player" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 16: 포탈·향기 저장 지점·맵 이동

**Files:**
- Create: `src/entities/Portal.ts`, `src/entities/ScentSavePoint.ts`, `src/ui/FloatText.ts`
- Modify: `src/scenes/WorldScene.ts`
- Test: 수동 확인 + `npx tsc --noEmit`

**Interfaces:**
- Produces (FloatText.ts): `floatText(scene, x, y, text, color = '#ffffff', size = 14)`, `damagePopup(scene, x, y, amount, crit, hostile = false)`
- Produces (Portal.ts): `class Portal extends Phaser.Physics.Arcade.Image` — `target`, `spawn`, `requiresFlag?`, `locked` (생성 시 결정). Tiled 사각형(좌상단 x,y·w·h)을 받아 bottom-center에 배치.
- Produces (ScentSavePoint.ts): `class ScentSavePoint extends Phaser.Physics.Arcade.Image` — `saveName` (오브젝트 이름. `findSpawn`이 저장 지점 이름을 스폰으로도 인정하므로 재개 위치로 쓴다)
- WorldScene: ↑(JustDown, 사다리 위가 아닐 때) = 상호작용. 포탈 겹침 → 잠김이면 안내, 아니면 페이드 후 `scene.restart({ mapId: target, spawnId })`. 향기 겹침 → 체력·기력 전회복, `gs.location = { mapId, spawnId: saveName }`, `gs.savedAt = Date.now()`, `saveGame(store, slot, gs.snapshot())`.
- `WorldScene.interact()`는 Task 20에서 NPC 분기를 추가한다.

- [ ] **Step 1: FloatText·Portal·SavePoint 작성**

`src/ui/FloatText.ts`:
```ts
import type Phaser from 'phaser';
import { style } from './textStyles';

export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff', size = 14): void {
  const t = scene.add.text(x, y, text, style(size, color, { stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(50);
  scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

export function damagePopup(scene: Phaser.Scene, x: number, y: number, amount: number, crit: boolean, hostile = false): void {
  const color = hostile ? '#f7768e' : crit ? '#ffd166' : '#ffffff';
  floatText(scene, x + jitter(-8, 8), y, crit ? `${amount}!` : String(amount), color, crit ? 18 : 14);
}

function jitter(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
```

`src/entities/Portal.ts`:
```ts
import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { MapObject } from '../scenes/worldObjects';

export class Portal extends Phaser.Physics.Arcade.Image {
  readonly target: string;
  readonly spawn: string;
  readonly requiresFlag: string | undefined;
  readonly locked: boolean;

  constructor(scene: Phaser.Scene, obj: MapObject, flags: Set<string>) {
    const requiresFlag = obj.props.requiresFlag;
    const locked = !!requiresFlag && !flags.has(requiresFlag);
    super(scene, obj.x + obj.width / 2, obj.y + obj.height, locked ? TEX.portalLocked : TEX.portal);
    this.target = obj.props.target!;
    this.spawn = obj.props.spawn!;
    this.requiresFlag = requiresFlag;
    this.locked = locked;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1).setAlpha(0.85).setDepth(5);
  }
}
```

`src/entities/ScentSavePoint.ts`:
```ts
import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { MapObject } from '../scenes/worldObjects';

export class ScentSavePoint extends Phaser.Physics.Arcade.Image {
  readonly saveName: string;

  constructor(scene: Phaser.Scene, obj: MapObject) {
    super(scene, obj.x, obj.y, TEX.savepoint);
    this.saveName = obj.name;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1).setDepth(5);
    scene.tweens.add({ targets: this, alpha: 0.6, yoyo: true, repeat: -1, duration: 900 });
  }
}
```

- [ ] **Step 2: WorldScene에 오브젝트 스폰과 상호작용 추가**

`src/scenes/WorldScene.ts` import 추가:
```ts
import { Portal } from '../entities/Portal';
import { ScentSavePoint } from '../entities/ScentSavePoint';
import { saveGame } from '../systems/save';
import { floatText } from '../ui/FloatText';
import { findSpawn, objectsOf } from './worldObjects';
```
필드 추가:
```ts
  private portals: Portal[] = [];
  private savepoints: ScentSavePoint[] = [];
  private transitioning = false;
```
`create()`에서 카메라 설정 다음에 추가:
```ts
    this.portals = objectsOf(this.map, 'portals').map((o) => new Portal(this, o, gs.flags));
    this.savepoints = objectsOf(this.map, 'savepoints').map((o) => new ScentSavePoint(this, o));
    for (const p of this.portals) this.add.text(p.x, p.y - 70, p.locked ? '잠김' : getMap(p.target).name, SMALL_TEXT).setOrigin(0.5).setDepth(6);
    for (const s of this.savepoints) this.add.text(s.x, s.y - 46, '향기', SMALL_TEXT).setOrigin(0.5).setDepth(6);
    this.cameras.main.fadeIn(200, 0, 0, 0);
```
메서드 추가:
```ts
  private overlapsPlayer(obj: Phaser.GameObjects.Components.GetBounds): boolean {
    return Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), obj.getBounds());
  }

  /** ↑ 키 상호작용. 우선순위: 포탈 → 향기 (Task 20에서 NPC가 앞에 추가된다) */
  private interact(): void {
    const portal = this.portals.find((p) => this.overlapsPlayer(p));
    if (portal) {
      if (portal.locked) floatText(this, this.player.x, this.player.y - 60, '아직 열리지 않은 문이다', '#a9b1d6');
      else this.transitionTo(portal.target, portal.spawn);
      return;
    }
    const scent = this.savepoints.find((s) => this.overlapsPlayer(s));
    if (scent) this.saveAt(scent.saveName);
  }

  private transitionTo(mapId: string, spawnId: string): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ mapId, spawnId } satisfies WorldData));
  }

  private saveAt(saveName: string): void {
    const gs = this.session.gs;
    const max = gs.maxStats();
    gs.heal(max.hp, max.mp);
    gs.location = { mapId: this.mapId, spawnId: saveName };
    gs.savedAt = Date.now();
    saveGame(this.session.store, this.session.slot, gs.snapshot());
    floatText(this, this.player.x, this.player.y - 60, '향기를 남겼다 (저장됨)', '#ff9e64');
  }
```
`update()` 맨 앞(`playTimeMs` 다음)에 추가:
```ts
    if (this.transitioning) return;
```
`update()`에서 `applyMovement` 호출 **전에** 추가:
```ts
    if (!onLadder && Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.interact();
```
(주의: `JustDown(cursors.up)`은 `probe`/`onLadder` 계산 뒤에 호출해야 하므로 `onLadder` 선언 다음 줄에 둔다.)

- [ ] **Step 3: 타입체크와 수동 확인**

Run: `npx tsc --noEmit && npm run dev`
Expected: (1) 프롤로그 맵 오른쪽 끝 포탈에서 ↑ → 페이드 후 연습실(`ch1_practice`) 도착, 좌상단 맵 이름이 바뀜 (2) 연습실 왼쪽 향기에서 ↑ → "향기를 남겼다" (3) 브라우저 새로고침 → 타이틀 슬롯에 `원이 Lv.1 · 장면 1` 표시 → Enter → 연습실 향기 옆에서 시작 (4) 연습실 우상단 발판의 평가장 포탈은 "잠김" 라벨, ↑ 누르면 "아직 열리지 않은 문이다" (5) 골목 ↔ 옥상 왕복.

- [ ] **Step 4: 커밋**

```bash
git add src
git commit -m "feat: 포탈 맵 이동과 향기 저장 지점" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 17: 적·전투 컨트롤러·드롭·경험치

**Files:**
- Create: `src/entities/Enemy.ts`, `src/entities/Projectile.ts`, `src/entities/DropItem.ts`, `src/scenes/CombatController.ts`
- Modify: `src/scenes/WorldScene.ts`
- Test: 수동 확인 + `npx tsc --noEmit`. (데미지·경험치 수치는 Task 2·3의 단위 테스트가 보장한다.)

**Interfaces:**
- Produces (Enemy.ts): `class Enemy extends Phaser.Physics.Arcade.Sprite` — `def: EnemyDef`, `hp`, `stunnedUntil`, `statMods`, `dots`, `stats(): Stats`, `takeHit(amount, knockbackX): boolean`(사망 시 true), `applyStun(until)`, `applyDebuff(stat, ratio, until)`, `applyDot(amountPerTick, ticks, intervalMs, now)`, `updateAi(player, now, hasFloor: (x, y) => boolean)`, `tickDots(now): number[]`
- Produces (Projectile.ts): `class Projectile extends Phaser.Physics.Arcade.Image` — `skill: SkillDef`, `pierce`, `hitSet: Set<Enemy>`, `startX`, `range`; `update()`가 사거리 초과 시 destroy
- Produces (DropItem.ts): `class DropItem extends Phaser.Physics.Arcade.Image` — `kind: 'hearts'|'item'`, `amount`, `itemId?`
- Produces (CombatController.ts): `class CombatController { constructor(scene: Phaser.Scene, player: Player, gs: GameState, solids: TilemapLayer[]); enemies: Phaser.Physics.Arcade.Group; spawnEnemy(id, x, y, respawnMs = 8000): Enemy; castSkill(skill: SkillDef): boolean; effectiveStats(): Stats; buffs; counterUntil; update(now) }`
- 효과 실행 규칙: 전달(delivery) = `melee`·`projectile`·`stun` (히트박스/투사체를 만들어 맞은 적에게 스킬 배율 데미지) · 부착(attached) = `dot`·`debuff` (같은 스킬의 전달에 맞은 적에게 적용; `stun`이 전달이면 그 지속시간을 적용) · 자기(self) = `buff`·`heal`·`counter`.
- 키: A = 기본 공격(`<member>_basic`). S/D는 Task 19.
- 적 사망: 경험치 `gs.gainXp(def.xp)`, 하트 드롭 `randInt(hearts)`, 드롭 테이블 확률 판정, `gs.report({ type: 'enemy_killed', enemyId })`, 8초 후 원래 위치에 리스폰(보스 제외).
- 접촉 데미지: 적과 겹치면 `calculateDamage(enemy.stats(), effectiveStats(), 1, Math.random)`, 무적 600ms, 넉백. 카운터 창이 열려 있으면 피해를 무효화하고 반격.
- 플레이어 사망(수직 슬라이스 임시 처리, Task 23에서 교체): 체력 50%로 `gs.location`에서 재시작.

- [ ] **Step 1: Enemy·Projectile·DropItem 작성**

`src/entities/Enemy.ts`:
```ts
import Phaser from 'phaser';
import { enemyTex } from '../core/AssetKeys';
import type { EnemyDef } from '../data/schema';
import type { StatKey, Stats } from '../systems/types';
import type { Player } from './Player';

interface Dot { amount: number; ticksLeft: number; intervalMs: number; nextAt: number }

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly def: EnemyDef;
  hp: number;
  stunnedUntil = 0;
  statMods: Partial<Record<StatKey, { ratio: number; until: number }>> = {};
  dots: Dot[] = [];
  dir: 1 | -1 = -1;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef) {
    super(scene, x, y, enemyTex(def.id));
    this.def = def;
    this.hp = def.hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(8);
    this.body.setSize(Math.max(8, def.width - 4), Math.max(8, def.height - 2));
    this.setCollideWorldBounds(true);
  }

  stats(): Stats {
    const now = this.scene.time.now;
    const mod = (k: StatKey, base: number): number => {
      const m = this.statMods[k];
      return m && m.until > now ? Math.max(0, Math.round(base * (1 + m.ratio))) : base;
    };
    return { hp: this.def.hp, mp: 0, atk: mod('atk', this.def.atk), def: mod('def', this.def.def), spd: mod('spd', this.def.spd), luk: 0 };
  }

  takeHit(amount: number, knockbackX: number): boolean {
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());
    if (knockbackX !== 0) this.setVelocity(knockbackX, -120);
    return this.hp <= 0;
  }

  applyStun(until: number): void {
    this.stunnedUntil = Math.max(this.stunnedUntil, until);
  }

  applyDebuff(stat: StatKey, ratio: number, until: number): void {
    this.statMods[stat] = { ratio, until };
  }

  applyDot(amountPerTick: number, ticks: number, intervalMs: number, now: number): void {
    this.dots.push({ amount: amountPerTick, ticksLeft: ticks, intervalMs, nextAt: now + intervalMs });
  }

  /** 이번 프레임에 터진 도트 데미지 목록 */
  tickDots(now: number): number[] {
    const out: number[] = [];
    for (const d of this.dots) {
      if (now >= d.nextAt && d.ticksLeft > 0) {
        d.ticksLeft -= 1;
        d.nextAt = now + d.intervalMs;
        out.push(d.amount);
      }
    }
    this.dots = this.dots.filter((d) => d.ticksLeft > 0);
    return out;
  }

  updateAi(player: Player, now: number, hasFloor: (x: number, y: number) => boolean): void {
    if (now < this.stunnedUntil) {
      this.setVelocityX(0);
      return;
    }
    const spd = this.stats().spd;
    const dx = player.x - this.x;
    if (this.def.ai === 'chase' && Math.abs(dx) < 280 && Math.abs(player.y - this.y) < 80) {
      this.dir = dx < 0 ? -1 : 1;
    } else if (this.body.blocked.down) {
      if (this.body.blocked.left) this.dir = 1;
      else if (this.body.blocked.right) this.dir = -1;
      else if (!hasFloor(this.x + this.dir * (this.def.width / 2 + 6), this.y + 4)) this.dir = this.dir === 1 ? -1 : 1;
    }
    this.setVelocityX(this.dir * spd);
    this.setFlipX(this.dir === 1);
  }
}
```

`src/entities/Projectile.ts`:
```ts
import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { SkillDef } from '../data/schema';
import type { Enemy } from './Enemy';

export class Projectile extends Phaser.Physics.Arcade.Image {
  readonly skill: SkillDef;
  readonly pierce: boolean;
  readonly range: number;
  readonly startX: number;
  readonly hitSet = new Set<Enemy>();
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1, skill: SkillDef, speed: number, range: number, pierce: boolean) {
    super(scene, x, y, TEX.projectile);
    this.skill = skill;
    this.pierce = pierce;
    this.range = range;
    this.startX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setVelocityX(dir * speed).setFlipX(dir === -1).setDepth(9);
  }

  /** Image에는 preUpdate가 없지만 add.existing()이 updateList에 등록하므로 매 프레임 호출된다 */
  preUpdate(): void {
    if (Math.abs(this.x - this.startX) > this.range) this.destroy();
  }
}
```

`src/entities/DropItem.ts`:
```ts
import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';

export class DropItem extends Phaser.Physics.Arcade.Image {
  readonly kind: 'hearts' | 'item';
  readonly amount: number;
  readonly itemId: string | undefined;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: 'hearts' | 'item', amount: number, itemId?: string) {
    super(scene, x, y, kind === 'hearts' ? TEX.heart : TEX.item);
    this.kind = kind;
    this.amount = amount;
    this.itemId = itemId;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(7);
    this.body.setBounce(0.4, 0.4).setDrag(200, 0);
    this.setVelocity(Phaser.Math.Between(-80, 80), -220);
  }
}
```

- [ ] **Step 2: CombatController 작성**

`src/scenes/CombatController.ts`:
```ts
import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { GameState } from '../core/GameState';
import { getEnemy, getItem } from '../data/index';
import type { SkillDef, SkillEffect } from '../data/schema';
import { DropItem } from '../entities/DropItem';
import { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { calculateDamage } from '../systems/combat';
import { addItem } from '../systems/inventory';
import { canCast, cast, skillLevelOf, skillMultiplier } from '../systems/skills';
import { STAT_KEYS, type StatKey, type Stats } from '../systems/types';
import { damagePopup, floatText } from '../ui/FloatText';

interface Buff { stat: StatKey; ratio: number; until: number }
interface SpawnRecord { id: string; x: number; y: number; respawnMs: number }

const CONTACT_IFRAMES_MS = 600;

export class CombatController {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly drops: Phaser.Physics.Arcade.Group;
  buffs: Buff[] = [];
  counterUntil = 0;
  counterMultiplier = 1;
  onPlayerDied: () => void = () => {};

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly gs: GameState,
    private readonly solids: Phaser.Tilemaps.TilemapLayer[],
  ) {
    this.enemies = scene.physics.add.group();
    this.projectiles = scene.physics.add.group();
    this.drops = scene.physics.add.group();
    for (const layer of solids) {
      scene.physics.add.collider(this.enemies, layer);
      scene.physics.add.collider(this.drops, layer);
    }
    scene.physics.add.overlap(player, this.enemies, (_p, e) => this.onContact(e as Enemy));
    scene.physics.add.overlap(this.projectiles, this.enemies, (p, e) => this.onProjectileHit(p as Projectile, e as Enemy));
    scene.physics.add.overlap(player, this.drops, (_p, d) => this.collect(d as DropItem));
  }

  // ---------- 스탯 ----------

  effectiveStats(): Stats {
    const now = this.scene.time.now;
    this.buffs = this.buffs.filter((b) => b.until > now);
    const s = this.gs.maxStats();
    for (const k of STAT_KEYS) {
      const ratio = this.buffs.filter((b) => b.stat === k).reduce((acc, b) => acc + b.ratio, 0);
      if (ratio !== 0) s[k] = Math.round(s[k] * (1 + ratio));
    }
    return s;
  }

  // ---------- 스폰 ----------

  spawnEnemy(id: string, x: number, y: number, respawnMs = 8000): Enemy {
    const enemy = new Enemy(this.scene, x, y, getEnemy(id));
    enemy.setData('spawn', { id, x, y, respawnMs } satisfies SpawnRecord);
    this.enemies.add(enemy);
    return enemy;
  }

  private hasFloor = (x: number, y: number): boolean =>
    this.solids.some((layer) => { const t = layer.getTileAtWorldXY(x, y); return !!t && t.index > 0; });

  // ---------- 스킬 ----------

  castSkill(skill: SkillDef): boolean {
    const now = this.scene.time.now;
    const check = canCast(skill, this.gs.player, this.gs.skillRuntime, now);
    if (!check.ok) {
      if (check.reason === 'mp') floatText(this.scene, this.player.x, this.player.y - 60, '기력 부족', '#7aa2f7');
      return false;
    }
    const r = cast(skill, this.gs.player, this.gs.skillRuntime, now);
    this.gs.player = r.player;
    this.gs.skillRuntime = r.rt;
    this.gs.bus.emit('changed', undefined);

    const attached = skill.effects.filter((e): e is Extract<SkillEffect, { kind: 'dot' | 'debuff' }> => e.kind === 'dot' || e.kind === 'debuff');
    for (const effect of skill.effects) {
      switch (effect.kind) {
        case 'melee':
          this.meleeHit(skill, effect.width, effect.height, effect.knockback, !!effect.centered, attached, null);
          break;
        case 'stun':
          this.meleeHit(skill, effect.width, effect.height, 0, false, attached, now + effect.durationMs);
          break;
        case 'projectile':
          this.projectiles.add(new Projectile(this.scene, this.player.x + this.player.facing * 18, this.player.y - 28, this.player.facing, skill, effect.speed, effect.range, effect.pierce));
          break;
        case 'buff':
          this.buffs.push({ stat: effect.stat, ratio: effect.ratio, until: now + effect.durationMs });
          floatText(this.scene, this.player.x, this.player.y - 60, skill.name, '#9ece6a');
          break;
        case 'heal': {
          const max = this.gs.maxStats();
          this.gs.heal(Math.floor(max.hp * effect.ratio), 0);
          floatText(this.scene, this.player.x, this.player.y - 60, `+${Math.floor(max.hp * effect.ratio)}`, '#9ece6a');
          break;
        }
        case 'counter':
          this.counterUntil = now + effect.windowMs;
          this.counterMultiplier = effect.multiplier;
          floatText(this.scene, this.player.x, this.player.y - 60, skill.name, '#bb9af7');
          break;
        case 'dot':
        case 'debuff':
          break; // 전달 효과에 부착되어 적용된다
      }
    }
    return true;
  }

  private meleeHit(skill: SkillDef, width: number, height: number, knockback: number, centered: boolean, attached: Extract<SkillEffect, { kind: 'dot' | 'debuff' }>[], stunUntil: number | null): void {
    const f = this.player.facing;
    const left = centered ? this.player.x - width / 2 : f === 1 ? this.player.x : this.player.x - width;
    const rect = new Phaser.Geom.Rectangle(left, this.player.y - height, width, height);
    const flash = this.scene.add.rectangle(rect.centerX, rect.centerY, width, height, 0xffffff, 0.25).setDepth(9);
    this.scene.time.delayedCall(100, () => flash.destroy());
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active || !Phaser.Geom.Intersects.RectangleToRectangle(rect, enemy.getBounds())) continue;
      const dir = enemy.x >= this.player.x ? 1 : -1;
      this.hitEnemy(enemy, skill, dir * knockback, attached, stunUntil);
    }
  }

  private onProjectileHit(p: Projectile, enemy: Enemy): void {
    if (!p.active || !enemy.active || p.hitSet.has(enemy)) return;
    p.hitSet.add(enemy);
    const attached = p.skill.effects.filter((e): e is Extract<SkillEffect, { kind: 'dot' | 'debuff' }> => e.kind === 'dot' || e.kind === 'debuff');
    this.hitEnemy(enemy, p.skill, Math.sign(p.body.velocity.x) * 60, attached, null);
    if (!p.pierce) p.destroy();
  }

  private hitEnemy(enemy: Enemy, skill: SkillDef, knockbackX: number, attached: Extract<SkillEffect, { kind: 'dot' | 'debuff' }>[], stunUntil: number | null): void {
    const now = this.scene.time.now;
    const mult = skillMultiplier(skill, skillLevelOf(this.gs.player, skill.id));
    const dmg = calculateDamage(this.effectiveStats(), enemy.stats(), mult, Math.random);
    damagePopup(this.scene, enemy.x, enemy.y - enemy.def.height, dmg.amount, dmg.crit);
    if (stunUntil !== null) enemy.applyStun(stunUntil);
    for (const a of attached) {
      if (a.kind === 'debuff') enemy.applyDebuff(a.stat, a.ratio, now + a.durationMs);
      if (a.kind === 'dot') enemy.applyDot(dmg.amount, a.ticks, a.intervalMs, now);
    }
    if (enemy.takeHit(dmg.amount, knockbackX)) this.killEnemy(enemy);
  }

  // ---------- 적 처리 ----------

  private killEnemy(enemy: Enemy): void {
    const def = enemy.def;
    const spawn = enemy.getData('spawn') as SpawnRecord;
    const x = enemy.x, y = enemy.y - def.height / 2;
    this.enemies.remove(enemy, true, true);

    const hearts = Phaser.Math.Between(def.hearts[0], def.hearts[1]);
    if (hearts > 0) this.drops.add(new DropItem(this.scene, x, y, 'hearts', hearts));
    for (const d of def.drops) if (Math.random() < d.chance) this.drops.add(new DropItem(this.scene, x + Phaser.Math.Between(-10, 10), y, 'item', 1, d.itemId));

    const levels = this.gs.gainXp(def.xp);
    floatText(this.scene, x, y - 20, `+${def.xp} EXP`, '#7dcfff', 12);
    if (levels > 0) floatText(this.scene, this.player.x, this.player.y - 80, `LEVEL UP! Lv.${this.gs.player.level}`, '#ffd166', 20);
    this.gs.report({ type: 'enemy_killed', enemyId: def.id });

    if (def.ai !== 'boss' && spawn.respawnMs > 0) {
      this.scene.time.delayedCall(spawn.respawnMs, () => { if (this.scene.scene.isActive()) this.spawnEnemy(spawn.id, spawn.x, spawn.y, spawn.respawnMs); });
    }
  }

  private collect(d: DropItem): void {
    if (!d.active) return;
    this.drops.remove(d, true, true);
    if (d.kind === 'hearts') {
      this.gs.addHearts(d.amount);
      floatText(this.scene, this.player.x, this.player.y - 60, `+${d.amount} ♥`, '#f7768e', 12);
    } else if (d.itemId) {
      this.gs.inventory = addItem(this.gs.inventory, d.itemId, d.amount);
      this.gs.report({ type: 'item_collected', itemId: d.itemId, count: d.amount });
      this.gs.bus.emit('changed', undefined);
      floatText(this.scene, this.player.x, this.player.y - 60, getItem(d.itemId).name, '#e0af68', 12);
    }
  }

  private onContact(enemy: Enemy): void {
    const now = this.scene.time.now;
    if (!enemy.active || now < this.player.invulnerableUntil || now < enemy.stunnedUntil) return;
    const dir = this.player.x < enemy.x ? -1 : 1;

    if (now < this.counterUntil) {
      this.counterUntil = 0;
      const dmg = calculateDamage(this.effectiveStats(), enemy.stats(), this.counterMultiplier, Math.random);
      damagePopup(this.scene, enemy.x, enemy.y - enemy.def.height, dmg.amount, true);
      floatText(this.scene, this.player.x, this.player.y - 70, '카운터!', '#bb9af7', 16);
      if (enemy.takeHit(dmg.amount, -dir * 300)) this.killEnemy(enemy);
      this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
      return;
    }

    const dmg = calculateDamage(enemy.stats(), this.effectiveStats(), 1, Math.random);
    damagePopup(this.scene, this.player.x, this.player.y - 56, dmg.amount, dmg.crit, true);
    this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
    this.player.setVelocity(dir * 220, -200);
    this.scene.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 3, duration: 75, onComplete: () => this.player.setAlpha(1) });
    if (this.gs.takeDamage(dmg.amount)) this.onPlayerDied();
  }

  // ---------- 프레임 ----------

  update(now: number): void {
    for (const obj of this.enemies.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;
      enemy.updateAi(this.player, now, this.hasFloor);
      for (const amount of enemy.tickDots(now)) {
        damagePopup(this.scene, enemy.x, enemy.y - enemy.def.height, amount, false);
        if (enemy.takeHit(amount, 0)) { this.killEnemy(enemy); break; }
      }
    }
  }
}
```

- [ ] **Step 3: WorldScene 연결**

import 추가:
```ts
import { getSkill } from '../data/index';
import { CombatController } from './CombatController';
```
필드 추가:
```ts
  private combat!: CombatController;
  private keyA!: Phaser.Input.Keyboard.Key;
```
`create()`에서 포탈/향기 스폰 다음에 추가:
```ts
    this.combat = new CombatController(this, this.player, gs, [ground, platforms]);
    for (const o of objectsOf(this.map, 'spawns_enemy')) this.combat.spawnEnemy(o.name, o.x, o.y);
    this.combat.onPlayerDied = () => this.onPlayerDied();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
```
`update()`에서 `interact` 호출 다음에 추가:
```ts
    if (Phaser.Input.Keyboard.JustDown(this.keyA)) this.combat.castSkill(getSkill(`${this.session.gs.player.member}_basic`));
    this.combat.update(this.time.now);
```
메서드 추가 (Task 23에서 컷·메시지 포함 버전으로 교체):
```ts
  private onPlayerDied(): void {
    const gs = this.session.gs;
    const max = gs.maxStats();
    gs.heal(Math.floor(max.hp / 2), Math.floor(max.mp / 2));
    this.transitionTo(gs.location.mapId, gs.location.spawnId);
  }
```

- [ ] **Step 4: 타입체크와 수동 확인**

Run: `npx tsc --noEmit && npm run dev`
Expected: 프롤로그 맵에 "떨림" 2마리가 순찰. A로 공격하면 흰 히트박스 플래시와 데미지 숫자, 2~3방에 사망 → `+8 EXP`와 하트 드롭, 주워지면 `+n ♥`. 8초 뒤 리스폰. 연습실에서 슬라임에 닿으면 빨간 데미지·넉백·깜빡임. 원거리 멤버(리브·미나미·메이)는 투사체가 날아가 맞으면 사라짐. 골목의 메트로놈은 가까이 가면 쫓아옴. 체력이 0이 되면 마지막 향기 위치에서 체력 절반으로 재시작.

- [ ] **Step 5: 커밋**

```bash
git add src
git commit -m "feat: 적 AI·전투 컨트롤러·드롭·경험치·접촉 데미지" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 18: HUD, 스킬 키(S/D), 기력 재생

**Files:**
- Create: `src/systems/questText.ts`, `src/ui/Bar.ts`, `src/scenes/HudScene.ts`
- Modify: `src/scenes/WorldScene.ts`, `src/main.ts`
- Test: `tests/quest-text.test.ts` (순수 텍스트 함수), 나머지는 수동 확인

**Interfaces:**
- Produces (questText.ts): `describeObjective(o: Objective, progress: number): string` — 예: `졸음 슬라임 2/5`, `야식 재료 0/3`, `제나와 대화 0/1`, `옥상 도착 0/1`. 이름은 `getEnemy/getItem/getNpc/getMap/getMeme`로 해석.
- Produces (Bar.ts): `class Bar { constructor(scene, x, y, w, h, fillHex: string, label?: boolean); set(ratio: number, text?: string): void; setVisible(v) }`
- Produces (HudScene.ts): key `'Hud'`. `WorldScene`이 `create()`마다 HUD를 stop 후 launch한다(맵 이동·새 게임마다 새 GameState를 바라보도록). HUD는 `getSession(this).gs`를 읽고 `gs.bus.on('changed')`로 갱신하며 `update()`마다 쿨다운을 다시 그린다. 표시: 하단 바(체력·기력·레벨·경험치·하트·인지도·스킬 슬롯 A/S/D와 남은 쿨다운), 좌상단 맵 이름(`getMap(gs.location.mapId).name`), 우상단 퀘스트 트래커, 하단 조작 힌트.
- WorldScene 키: S = `member.skills[1]`, D = `member.skills[2]`. 레벨 미달이면 `Lv.N에 해금` 안내. F = 가방의 첫 소모품 사용(유행어 `foodHeal` 패시브 적용). 기력은 1초마다 1 회복.
- WorldScene은 맵 이름 텍스트를 직접 그리지 않는다(HUD가 `gs.location`에서 읽는다).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/quest-text.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { describeObjective } from '../src/systems/questText';

describe('describeObjective', () => {
  it('formats each objective kind with resolved names', () => {
    expect(describeObjective({ kind: 'kill', target: 'enemy_sleep_slime', count: 5 }, 2)).toBe('졸음 슬라임 2/5');
    expect(describeObjective({ kind: 'collect', target: 'etc_snack_ingredient', count: 3 }, 0)).toBe('야식 재료 0/3');
    expect(describeObjective({ kind: 'talk', target: 'npc_zena' }, 1)).toBe('제나와 대화 1/1');
    expect(describeObjective({ kind: 'reach', target: 'ch1_rooftop' }, 0)).toBe('옥상 도착 0/1');
    expect(describeObjective({ kind: 'minigame', target: 'rhythm_uhuh', score: 80 }, 40)).toBe('rhythm_uhuh 40/80점');
    expect(describeObjective({ kind: 'emote', target: 'minami_yaho', map: 'ch1_practice' }, 0)).toBe('더뮤즈 연습실 (야간)에서 "거제, 야호~!" 0/1');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- quest-text`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: questText.ts와 Bar.ts 작성**

`src/systems/questText.ts`:
```ts
import { getEnemy, getItem, getMap, getMeme, getNpc } from '../data/index';
import type { Objective } from '../data/schema';

export function describeObjective(o: Objective, progress: number): string {
  switch (o.kind) {
    case 'kill': return `${getEnemy(o.target).name} ${progress}/${o.count}`;
    case 'collect': return `${getItem(o.target).name} ${progress}/${o.count}`;
    case 'talk': return `${getNpc(o.target).name}와 대화 ${progress}/1`;
    case 'reach': return `${getMap(o.target).name} 도착 ${progress}/1`;
    case 'minigame': return `${o.target} ${progress}/${o.score}점`;
    case 'emote': return `${getMap(o.map).name}에서 "${getMeme(o.target).text}" ${progress}/1`;
  }
}
```

`src/ui/Bar.ts`:
```ts
import Phaser from 'phaser';
import { style } from './textStyles';

export class Bar {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text | null;
  private readonly w: number;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fillHex: string, label = true) {
    this.w = w;
    this.bg = scene.add.rectangle(x, y, w, h, 0x1a1b26, 0.9).setOrigin(0, 0.5).setStrokeStyle(1, 0x565f89);
    this.fill = scene.add.rectangle(x + 1, y, w - 2, h - 2, Phaser.Display.Color.HexStringToColor(fillHex).color).setOrigin(0, 0.5);
    this.text = label ? scene.add.text(x + w / 2, y, '', style(11, '#ffffff', { stroke: '#000000', strokeThickness: 2 })).setOrigin(0.5) : null;
  }

  set(ratio: number, text = ''): void {
    this.fill.width = Math.max(0, Math.min(1, ratio)) * (this.w - 2);
    this.text?.setText(text);
  }

  setVisible(v: boolean): void {
    this.bg.setVisible(v); this.fill.setVisible(v); this.text?.setVisible(v);
  }
}
```

- [ ] **Step 4: HudScene 작성**

`src/scenes/HudScene.ts`:
```ts
import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getSession } from '../core/session';
import { getMap, getMember, getSkill } from '../data/index';
import { describeObjective } from '../systems/questText';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Bar } from '../ui/Bar';
import { SMALL_TEXT, style } from '../ui/textStyles';

const SLOT_KEYS = ['A', 'S', 'D'] as const;

export class HudScene extends Phaser.Scene {
  private hp!: Bar;
  private mp!: Bar;
  private xp!: Bar;
  private level!: Phaser.GameObjects.Text;
  private hearts!: Phaser.GameObjects.Text;
  private fame!: Phaser.GameObjects.Text;
  private mapName!: Phaser.GameObjects.Text;
  private tracker!: Phaser.GameObjects.Text;
  private slots: { box: Phaser.GameObjects.Rectangle; name: Phaser.GameObjects.Text; cd: Phaser.GameObjects.Text }[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super(SCENE.hud);
  }

  create(): void {
    const gs = getSession(this).gs;
    const barY = GAME_HEIGHT - 64;
    this.add.rectangle(0, barY, GAME_WIDTH, 64, 0x16161e, 0.85).setOrigin(0, 0);

    this.level = this.add.text(12, barY + 8, '', style(14, '#ffffff', { fontStyle: 'bold' }));
    this.hp = new Bar(this, 12, barY + 36, 180, 14, '#f7768e');
    this.mp = new Bar(this, 12, barY + 52, 180, 10, '#7aa2f7');
    this.xp = new Bar(this, 0, GAME_HEIGHT - 3, GAME_WIDTH, 4, '#ffd166', false);
    this.hearts = this.add.text(210, barY + 8, '', style(14, '#f7768e'));
    this.fame = this.add.text(210, barY + 28, '', SMALL_TEXT);

    this.slots = SLOT_KEYS.map((k, i) => {
      const x = 340 + i * 96;
      const box = this.add.rectangle(x, barY + 32, 84, 44, 0x24283b).setStrokeStyle(1, 0x565f89);
      this.add.text(x - 38, barY + 12, k, style(11, '#ffd166', { fontStyle: 'bold' }));
      const name = this.add.text(x, barY + 30, '', style(11, '#c0caf5', { align: 'center', wordWrap: { width: 80 } })).setOrigin(0.5);
      const cd = this.add.text(x, barY + 46, '', style(10, '#a9b1d6')).setOrigin(0.5);
      return { box, name, cd };
    });

    this.add.text(GAME_WIDTH - 12, barY + 48, '←→ 이동  Space 점프  ↑ 상호작용/사다리  ↓+Space 내려가기  A 공격  S/D 스킬  F 회복', SMALL_TEXT).setOrigin(1, 0.5);
    this.mapName = this.add.text(8, 8, '', style(14, '#ffffff', { stroke: '#000000', strokeThickness: 3 }));
    this.tracker = this.add.text(GAME_WIDTH - 8, 8, '', style(12, '#c0caf5', { align: 'right', stroke: '#000000', strokeThickness: 3 })).setOrigin(1, 0);

    this.unsubscribe = gs.bus.on('changed', () => this.refresh());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
    this.refresh();
  }

  private refresh(): void {
    const gs = getSession(this).gs;
    const max = gs.maxStats();
    const p = gs.player;
    const member = getMember(p.member);
    this.mapName.setText(getMap(gs.location.mapId).name);
    this.level.setText(`${member.name}  Lv.${p.level}  SP ${p.sp}`);
    this.hp.set(p.hp / max.hp, `체력 ${p.hp}/${max.hp}`);
    this.mp.set(p.mp / max.mp, `기력 ${p.mp}/${max.mp}`);
    const need = Number.isFinite(gs.xpNeeded()) ? gs.xpNeeded() : 1;
    this.xp.set(p.xp / need);
    this.hearts.setText(`♥ ${gs.hearts}`);
    this.fame.setText(`인지도 ${gs.fame}`);
    member.skills.slice(0, 3).forEach((sid, i) => {
      const s = getSkill(sid);
      const slot = this.slots[i]!;
      slot.name.setText(p.level >= s.level ? s.name : `${s.name}\n(Lv.${s.level})`).setAlpha(p.level >= s.level ? 1 : 0.4);
    });
    const lines = gs.quests.activeQuests().map((q) => {
      const prog = gs.quests.progress(q.id);
      const done = gs.quests.status(q.id) === 'completable';
      return [`${done ? '✔ ' : ''}${q.title}`, ...q.objectives.map((o, i) => `  ${describeObjective(o, prog[i] ?? 0)}`)].join('\n');
    });
    this.tracker.setText(lines.join('\n\n'));
  }

  update(): void {
    const gs = getSession(this).gs;
    const now = this.time.now;
    getMember(gs.player.member).skills.slice(0, 3).forEach((sid, i) => {
      const until = gs.skillRuntime.cooldownUntil[sid] ?? 0;
      const left = Math.max(0, until - now);
      this.slots[i]!.cd.setText(left > 0 ? `${(left / 1000).toFixed(1)}s` : '');
      this.slots[i]!.box.setFillStyle(left > 0 ? 0x1a1b26 : 0x24283b);
    });
  }
}
```

`src/core/GameState.ts`에 메서드 추가 (HUD가 쓰는 경험치 필요량):
```ts
  xpNeeded(): number {
    return xpForLevel(this.player.level);
  }
```
(`import { applyXp, statsForLevel, xpForLevel } from '../systems/progression';`로 import를 확장한다.)

- [ ] **Step 5: WorldScene·main.ts 연결**

`src/main.ts`의 씬 배열에 `HudScene`을 `WorldScene` 뒤에 추가한다.

`src/scenes/WorldScene.ts`:
- 필드 추가: `private keyS!: Phaser.Input.Keyboard.Key; private keyD!: Phaser.Input.Keyboard.Key; private keyF!: Phaser.Input.Keyboard.Key; private mpRegenAcc = 0;`
- `create()`의 맵 이름 텍스트 줄을 삭제하고 다음으로 교체:
  ```ts
      if (this.scene.isActive(SCENE.hud)) this.scene.stop(SCENE.hud);
      this.scene.launch(SCENE.hud);
      this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyF = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
  ```
- `update()`에서 A 키 처리 다음에 추가:
  ```ts
      const member = getMember(this.session.gs.player.member);
      if (Phaser.Input.Keyboard.JustDown(this.keyS)) this.castSlot(member.skills[1]!);
      if (Phaser.Input.Keyboard.JustDown(this.keyD)) this.castSlot(member.skills[2]!);
      if (Phaser.Input.Keyboard.JustDown(this.keyF)) this.useFirstConsumable();
      this.mpRegenAcc += delta;
      if (this.mpRegenAcc >= 1000) {
        this.mpRegenAcc -= 1000;
        if (this.session.gs.player.mp < this.session.gs.maxStats().mp) this.session.gs.heal(0, 1);
      }
  ```
- 메서드 추가:
  ```ts
    private castSlot(skillId: string): void {
      const skill = getSkill(skillId);
      if (this.session.gs.player.level < skill.level) {
        floatText(this, this.player.x, this.player.y - 60, `${skill.name}: Lv.${skill.level}에 해금`, '#a9b1d6');
        return;
      }
      this.combat.castSkill(skill);
    }

    private useFirstConsumable(): void {
      const gs = this.session.gs;
      const food = Object.keys(gs.inventory.items).map((id) => getItem(id)).find((it) => it.type === 'consumable');
      if (!food || food.type !== 'consumable') {
        floatText(this, this.player.x, this.player.y - 60, '먹을 게 없다', '#a9b1d6');
        return;
      }
      const bonus = 1 + (passiveTotals(gs.memes, getMeme).foodHeal ?? 0);
      gs.inventory = removeItem(gs.inventory, food.id);
      gs.heal(Math.floor((food.heal.hp ?? 0) * bonus), Math.floor((food.heal.mp ?? 0) * bonus));
      floatText(this, this.player.x, this.player.y - 60, `${food.name} 냠`, '#9ece6a');
    }
  ```
- import 추가: `getMember, getItem, getMeme`(`../data/index`), `removeItem`(`../systems/inventory`), `passiveTotals`(`../systems/memes`).

- [ ] **Step 6: 테스트·타입체크·수동 확인**

Run: `npm test && npx tsc --noEmit && npm run dev`
Expected: 테스트 PASS. 하단 바에 체력/기력/경험치/하트/인지도, 슬롯 A/S/D. S로 시그니처 스킬(원이: "우이!" 넉백 + 버프 텍스트, 리브: 관통 음파, 미나미: 빠른 참격, 메이: 투사체 + 도트 틱, 제나: 양방향 회전 베기)이 나가고 기력이 줄며 슬롯에 쿨다운 초가 표시됨. D는 Lv.5 전엔 "해금" 안내. 기력은 1초에 1씩 참. 슬라임이 떨어뜨린 물회를 줍고 F를 누르면 체력 40 회복, 없으면 "먹을 게 없다". 우상단에 활성 퀘스트가 없어 비어 있음(Task 20에서 채워짐).

- [ ] **Step 7: 커밋**

```bash
git add src tests/quest-text.test.ts
git commit -m "feat: HUD 씬, 스킬 슬롯 S/D, 기력 재생" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 19: NPC와 대화 씬

**Files:**
- Create: `src/entities/Npc.ts`, `src/scenes/DialogueScene.ts`
- Modify: `src/scenes/WorldScene.ts`, `src/main.ts`
- Test: 수동 확인 + `npx tsc --noEmit` (DialogueRunner 로직은 Task 9 테스트가 보장)

**Interfaces:**
- Produces (Npc.ts): `class Npc extends Phaser.Physics.Arcade.Image` — `def: NpcDef`, `dialogueOverride: string | undefined`(맵 오브젝트 `dialogue=` prop), `marker: Phaser.GameObjects.Text`(머리 위 `!`/`?` 표시. Task 20이 사용), `setMarker(text: string, color: string)`
- Produces (DialogueScene.ts): key `'Dialogue'`. `init(data: DialogueData)`, `DialogueData { scriptId: string; onDone?: (flags: Set<string>) => void }`. World는 `scene.pause()` 후 `scene.launch(SCENE.dialogue, data)`; Dialogue는 끝나면 `onDone` 호출 → `scene.stop()` → `scene.resume(SCENE.world)`.
- 키(대화 중): Enter/Space = 타자 효과 건너뛰기 → 다음, 선택지에서는 ↑↓ 이동 + Enter 결정.
- WorldScene: `spawns_npc` 오브젝트를 스폰하되 `def.member === gs.player.member`면 건너뜀. `interact()` 우선순위: NPC → 포탈 → 향기. NPC 대화는 이번 태스크에선 기본 대사(오버라이드 또는 `def.dialogue`)만 연다. 대화가 끝나면 `gs.report({ type: 'npc_talked', npcId, dialogueId })`.
- `WorldScene.openDialogue(scriptId, onDone?)` 메서드 — Task 20이 퀘스트 분기에 재사용한다.

- [ ] **Step 1: Npc.ts 작성**

`src/entities/Npc.ts`:
```ts
import Phaser from 'phaser';
import { npcTex } from '../core/AssetKeys';
import type { NpcDef } from '../data/schema';
import { style } from '../ui/textStyles';

export class Npc extends Phaser.Physics.Arcade.Image {
  readonly def: NpcDef;
  readonly dialogueOverride: string | undefined;
  readonly marker: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, def: NpcDef, dialogueOverride?: string) {
    super(scene, x, y, npcTex(def.id));
    this.def = def;
    this.dialogueOverride = dialogueOverride;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setOrigin(0.5, 1).setDepth(6);
    this.label = scene.add.text(x, y - 54, def.name, style(11, '#ffffff', { stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(6);
    this.marker = scene.add.text(x, y - 74, '', style(18, '#ffd166', { fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setDepth(6);
  }

  setMarker(text: string, color: string): void {
    this.marker.setText(text).setColor(color);
  }

  destroy(fromScene?: boolean): void {
    this.label.destroy();
    this.marker.destroy();
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 2: DialogueScene 작성**

`src/scenes/DialogueScene.ts`:
```ts
import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getSession } from '../core/session';
import { getDialogue, getMember, speakerName } from '../data/index';
import { DialogueRunner } from '../systems/dialogue';
import { MEMBER_IDS, type MemberId } from '../systems/types';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { style } from '../ui/textStyles';

export interface DialogueData {
  scriptId: string;
  onDone?: (flags: Set<string>) => void;
}

const BOX_H = 150;
const CHARS_PER_TICK = 1;
const TICK_MS = 22;

export class DialogueScene extends Phaser.Scene {
  private args!: DialogueData; // Scene.data(DataManager)와 이름이 겹치지 않게
  private runner!: DialogueRunner;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private choiceIndex = 0;
  private fullText = '';
  private shown = 0;
  private typing: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super(SCENE.dialogue);
  }

  init(data: DialogueData): void {
    this.args = data;
  }

  create(): void {
    const gs = getSession(this).gs;
    this.runner = new DialogueRunner(getDialogue(this.args.scriptId), gs.flags);
    const top = GAME_HEIGHT - BOX_H - 70;
    this.add.rectangle(0, top, GAME_WIDTH, BOX_H, 0x16161e, 0.95).setOrigin(0, 0).setStrokeStyle(2, 0x565f89);
    this.nameText = this.add.text(24, top + 12, '', style(15, '#ffd166', { fontStyle: 'bold' }));
    this.bodyText = this.add.text(24, top + 40, '', style(16, '#ffffff', { wordWrap: { width: GAME_WIDTH - 300 }, lineSpacing: 6 }));
    this.add.text(GAME_WIDTH - 24, top + BOX_H - 18, 'Enter ▶', style(11, '#a9b1d6')).setOrigin(1, 0.5);

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-SPACE', () => this.advance());
    kb.on('keydown-UP', () => this.moveChoice(-1));
    kb.on('keydown-DOWN', () => this.moveChoice(1));
    this.showNode();
  }

  private speakerColor(id: string): string {
    return (MEMBER_IDS as string[]).includes(id) ? getMember(id as MemberId).color : id === 'narrator' ? '#a9b1d6' : '#7dcfff';
  }

  private showNode(): void {
    const node = this.runner.current();
    const name = speakerName(node.speaker);
    this.nameText.setText(name).setColor(this.speakerColor(node.speaker));
    this.bodyText.setStyle(node.speaker === 'narrator' ? style(16, '#c0caf5', { fontStyle: 'italic', wordWrap: { width: GAME_WIDTH - 300 }, lineSpacing: 6 }) : style(16, '#ffffff', { wordWrap: { width: GAME_WIDTH - 300 }, lineSpacing: 6 }));
    this.fullText = node.text;
    this.shown = 0;
    this.bodyText.setText('');
    this.clearChoices();
    this.typing?.remove();
    this.typing = this.time.addEvent({
      delay: TICK_MS, loop: true,
      callback: () => {
        this.shown = Math.min(this.fullText.length, this.shown + CHARS_PER_TICK);
        this.bodyText.setText(this.fullText.slice(0, this.shown));
        if (this.shown >= this.fullText.length) this.finishTyping();
      },
    });
  }

  private finishTyping(): void {
    this.typing?.remove();
    this.typing = null;
    this.shown = this.fullText.length;
    this.bodyText.setText(this.fullText);
    if (this.runner.awaitingChoice()) this.renderChoices();
  }

  private renderChoices(): void {
    this.clearChoices();
    this.choiceIndex = 0;
    const top = GAME_HEIGHT - BOX_H - 70;
    this.choiceTexts = this.runner.choices().map((c, i) =>
      this.add.text(GAME_WIDTH - 260, top + 40 + i * 26, c.text, style(14, '#ffffff')).setInteractive(),
    );
    this.highlightChoice();
  }

  private highlightChoice(): void {
    this.choiceTexts.forEach((t, i) => t.setText(`${i === this.choiceIndex ? '▶ ' : '   '}${this.runner.choices()[i]!.text}`).setColor(i === this.choiceIndex ? '#ffd166' : '#ffffff'));
  }

  private clearChoices(): void {
    this.choiceTexts.forEach((t) => t.destroy());
    this.choiceTexts = [];
  }

  private moveChoice(delta: number): void {
    if (!this.choiceTexts.length) return;
    this.choiceIndex = (this.choiceIndex + delta + this.choiceTexts.length) % this.choiceTexts.length;
    this.highlightChoice();
  }

  private advance(): void {
    if (this.typing) { this.finishTyping(); return; }
    if (this.runner.awaitingChoice()) {
      this.runner.choose(this.choiceIndex);
      this.showNode();
      return;
    }
    if (this.runner.next()) this.showNode();
    else this.close();
  }

  private close(): void {
    const gs = getSession(this).gs;
    this.args.onDone?.(gs.flags);
    this.scene.stop();
    this.scene.resume(SCENE.world);
  }
}
```

- [ ] **Step 3: WorldScene 연결**

import 추가:
```ts
import { getNpc } from '../data/index';
import { Npc } from '../entities/Npc';
import type { DialogueData } from './DialogueScene';
```
필드 추가: `private npcs: Npc[] = [];`

`create()`에서 향기 스폰 다음에 추가:
```ts
    this.npcs = objectsOf(this.map, 'spawns_npc')
      .map((o) => ({ o, def: getNpc(o.name) }))
      .filter(({ def }) => def.member !== gs.player.member)
      .map(({ o, def }) => new Npc(this, o.x, o.y, def, o.props.dialogue));
```

`interact()`의 맨 앞에 추가:
```ts
    const npc = this.npcs.find((n) => this.overlapsPlayer(n));
    if (npc) { this.talkTo(npc); return; }
```

메서드 추가 (Task 20에서 `talkTo`를 퀘스트 분기 버전으로 교체):
```ts
  openDialogue(scriptId: string, onDone?: (flags: Set<string>) => void): void {
    this.scene.pause();
    this.scene.launch(SCENE.dialogue, { scriptId, onDone } satisfies DialogueData);
  }

  private talkTo(npc: Npc): void {
    const scriptId = npc.dialogueOverride ?? npc.def.dialogue;
    this.openDialogue(scriptId, () => {
      this.session.gs.report({ type: 'npc_talked', npcId: npc.def.id, dialogueId: scriptId });
    });
  }
```
`src/main.ts` 씬 배열에 `DialogueScene` 추가 (HUD 뒤).

- [ ] **Step 4: 타입체크와 수동 확인**

Run: `npx tsc --noEmit && npm run dev`
Expected: 프롤로그 맵의 "오디션 심사위원" 앞에서 ↑ → 하단 대화창, 이름이 파랑, 타자 효과, Enter로 진행, 마지막 줄 후 닫히고 월드 재개. 연습실에서는 자기 멤버 NPC가 없고 나머지 4명·선생님·매니저가 보임. 옥상 메이는 `d_may_idle`을 말함(퀘스트 대사는 Task 20). 대화 중에는 플레이어가 움직이지 않음.

- [ ] **Step 5: 커밋**

```bash
git add src
git commit -m "feat: NPC 엔티티와 타자 효과·선택지 대화 씬" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 20: 퀘스트 통합 — NPC 분기, 마커, 토스트, 포탈 해금

**Files:**
- Create: `src/systems/npcInteraction.ts`, `src/ui/Toast.ts`
- Modify: `src/core/GameState.ts` (`questStarted` 이벤트·`startQuest`), `src/entities/Portal.ts` (`unlock()`), `src/scenes/WorldScene.ts`, `src/scenes/HudScene.ts`
- Test: `tests/npc-interaction.test.ts`, `tests/game-state.test.ts` (케이스 추가)

**Interfaces:**
- Produces (npcInteraction.ts):
  - `type NpcAction = {kind:'complete'; questId; scriptId} | {kind:'objective'; questId; scriptId} | {kind:'progress'; questId; scriptId} | {kind:'offer'; questId; scriptId} | {kind:'idle'; scriptId}`
  - `pickNpcAction(quests: QuestEngine, npcId: string, defaultScript: string): NpcAction` — 우선순위: 완료 가능한 자기 퀘스트 → 진행 중 퀘스트의 미완 `talk` 목표(이 NPC 대상) → 진행 중인 자기 퀘스트 → 수락 가능한 자기 퀘스트 → 기본 대사
  - `markerFor(quests, npcId): { text: string; color: string } | null` — 완료 가능 `?` 금색, 미완 talk 목표 `…` 하늘색, 수락 가능 `!` 금색, 진행 중 `?` 회색, 없으면 null
- Produces (GameState.ts): `GameEvents.questStarted: { questId }`, `startQuest(id): void` (엔진 start + emit + changed)
- Produces (Toast.ts): `class ToastQueue { constructor(scene, x, y); push(text, color = '#ffffff'): void }` — 최대 4줄, 각 2.2초
- Produces (Portal.ts): `locked`를 mutable로, `unlock(): void` (텍스처 교체)
- HUD: `questStarted`/`questCompleted`/`memeUnlocked`/`levelup`을 토스트로 표시
- WorldScene: `talkTo`를 퀘스트 분기 버전으로 교체, `refreshMarkers()`, `refreshPortals()`를 `changed`마다 호출

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/npc-interaction.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { markerFor, pickNpcAction } from '../src/systems/npcInteraction';
import { QuestEngine, emptyQuestState } from '../src/systems/quest';
import type { QuestDef } from '../src/data/schema';

const dlg = (p: string) => ({ offer: `${p}_offer`, inProgress: `${p}_prog`, complete: `${p}_done` });
const DEFS: QuestDef[] = [
  { id: 'q1', chapter: 1, type: 'main', title: '1', description: '', giver: 'npc_manager', map: 'm',
    objectives: [{ kind: 'kill', target: 'slime', count: 1 }], rewards: {}, dialogues: dlg('q1') },
  { id: 'q2', chapter: 1, type: 'main', title: '2', description: '', giver: 'npc_manager', map: 'm', requires: { questsDone: ['q1'] },
    objectives: [{ kind: 'talk', target: 'npc_zena', dialogue: 'd_zena' }], rewards: {}, dialogues: dlg('q2') },
];
const engine = () => new QuestEngine(DEFS, emptyQuestState(), new Set(), { level: 1, member: 'woni' });

describe('pickNpcAction', () => {
  it('offers an available quest from its giver', () => {
    expect(pickNpcAction(engine(), 'npc_manager', 'idle')).toEqual({ kind: 'offer', questId: 'q1', scriptId: 'q1_offer' });
    expect(markerFor(engine(), 'npc_manager')).toEqual({ text: '!', color: '#ffd166' });
  });
  it('shows progress while active and completion when done', () => {
    const e = engine();
    e.start('q1');
    expect(pickNpcAction(e, 'npc_manager', 'idle')).toEqual({ kind: 'progress', questId: 'q1', scriptId: 'q1_prog' });
    expect(markerFor(e, 'npc_manager')).toEqual({ text: '?', color: '#a9b1d6' });
    e.report({ type: 'enemy_killed', enemyId: 'slime' });
    expect(pickNpcAction(e, 'npc_manager', 'idle')).toEqual({ kind: 'complete', questId: 'q1', scriptId: 'q1_done' });
    expect(markerFor(e, 'npc_manager')).toEqual({ text: '?', color: '#ffd166' });
  });
  it('routes talk objectives to the objective dialogue and falls back to idle', () => {
    const e = engine();
    expect(pickNpcAction(e, 'npc_zena', 'zena_idle')).toEqual({ kind: 'idle', scriptId: 'zena_idle' });
    expect(markerFor(e, 'npc_zena')).toBeNull();
    e.start('q1'); e.report({ type: 'enemy_killed', enemyId: 'slime' }); e.complete('q1'); e.start('q2');
    expect(pickNpcAction(e, 'npc_zena', 'zena_idle')).toEqual({ kind: 'objective', questId: 'q2', scriptId: 'd_zena' });
    expect(markerFor(e, 'npc_zena')).toEqual({ text: '…', color: '#7dcfff' });
    e.report({ type: 'npc_talked', npcId: 'npc_zena', dialogueId: 'd_zena' });
    expect(pickNpcAction(e, 'npc_zena', 'zena_idle')).toEqual({ kind: 'idle', scriptId: 'zena_idle' });
  });
});
```

`tests/game-state.test.ts`에 추가:
```ts
  it('startQuest emits questStarted', () => {
    const gs = GameState.newGame('woni', QUESTS);
    const started: string[] = [];
    gs.bus.on('questStarted', (p) => started.push(p.questId));
    gs.startQuest('q1');
    expect(started).toEqual(['q1']);
    expect(gs.quests.status('q1')).toBe('active');
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- npc-interaction game-state`
Expected: FAIL — 모듈 없음, `startQuest` 없음

- [ ] **Step 3: 구현**

`src/systems/npcInteraction.ts`:
```ts
import type { QuestEngine } from './quest';

export type NpcAction =
  | { kind: 'complete'; questId: string; scriptId: string }
  | { kind: 'objective'; questId: string; scriptId: string }
  | { kind: 'progress'; questId: string; scriptId: string }
  | { kind: 'offer'; questId: string; scriptId: string }
  | { kind: 'idle'; scriptId: string };

function pendingTalk(quests: QuestEngine, npcId: string): { questId: string; dialogue?: string } | null {
  for (const q of quests.activeQuests()) {
    const prog = quests.progress(q.id);
    const i = q.objectives.findIndex((o, idx) => o.kind === 'talk' && o.target === npcId && (prog[idx] ?? 0) < 1);
    if (i >= 0) {
      const o = q.objectives[i]!;
      return { questId: q.id, dialogue: o.kind === 'talk' ? o.dialogue : undefined };
    }
  }
  return null;
}

export function pickNpcAction(quests: QuestEngine, npcId: string, defaultScript: string): NpcAction {
  const mine = quests.questsForNpc(npcId);
  const completable = mine.find((q) => quests.status(q.id) === 'completable');
  if (completable) return { kind: 'complete', questId: completable.id, scriptId: completable.dialogues.complete };
  const talk = pendingTalk(quests, npcId);
  if (talk) return { kind: 'objective', questId: talk.questId, scriptId: talk.dialogue ?? defaultScript };
  const active = mine.find((q) => quests.status(q.id) === 'active');
  if (active) return { kind: 'progress', questId: active.id, scriptId: active.dialogues.inProgress };
  const available = mine.find((q) => quests.status(q.id) === 'available');
  if (available) return { kind: 'offer', questId: available.id, scriptId: available.dialogues.offer };
  return { kind: 'idle', scriptId: defaultScript };
}

export function markerFor(quests: QuestEngine, npcId: string): { text: string; color: string } | null {
  const action = pickNpcAction(quests, npcId, '');
  switch (action.kind) {
    case 'complete': return { text: '?', color: '#ffd166' };
    case 'objective': return { text: '…', color: '#7dcfff' };
    case 'offer': return { text: '!', color: '#ffd166' };
    case 'progress': return { text: '?', color: '#a9b1d6' };
    case 'idle': return null;
  }
}
```

`src/core/GameState.ts`: `GameEvents`에 `questStarted: { questId: string };` 추가, 메서드 추가:
```ts
  startQuest(id: string): void {
    this.quests.start(id);
    this.bus.emit('questStarted', { questId: id });
    this.changed();
  }
```

`src/ui/Toast.ts`:
```ts
import type Phaser from 'phaser';
import { style } from './textStyles';

export class ToastQueue {
  private items: Phaser.GameObjects.Text[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly x: number, private readonly y: number) {}

  push(text: string, color = '#ffffff'): void {
    const t = this.scene.add.text(this.x, this.y, text, style(15, color, { stroke: '#000000', strokeThickness: 3, fontStyle: 'bold' })).setOrigin(0.5, 0).setDepth(200);
    this.items.push(t);
    if (this.items.length > 4) this.items.shift()?.destroy();
    this.layout();
    this.scene.time.delayedCall(2200, () => {
      this.items = this.items.filter((i) => i !== t);
      this.scene.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() });
      this.layout();
    });
  }

  private layout(): void {
    this.items.forEach((t, i) => t.setY(this.y + i * 22));
  }
}
```

`src/entities/Portal.ts`: `readonly locked` → `locked: boolean;`로 바꾸고 메서드 추가:
```ts
  unlock(): void {
    this.locked = false;
    this.setTexture(TEX.portal);
  }
```

- [ ] **Step 4: HUD 토스트 연결**

`src/scenes/HudScene.ts`:
- import 추가: `import { ToastQueue } from '../ui/Toast';`, `import { getMeme, getQuest } from '../data/index';`
- 필드: `private toasts!: ToastQueue; private unsubs: (() => void)[] = [];`
- `create()`에서 `this.unsubscribe = ...` 줄을 다음으로 교체:
  ```ts
      this.toasts = new ToastQueue(this, GAME_WIDTH / 2, 40);
      this.unsubs = [
        gs.bus.on('changed', () => this.refresh()),
        gs.bus.on('questStarted', ({ questId }) => this.toasts.push(`퀘스트 수락: ${getQuest(questId).title}`, '#7dcfff')),
        gs.bus.on('questCompleted', ({ questId, reward }) => this.toasts.push(`퀘스트 완료: ${getQuest(questId).title}  +${reward.xp ?? 0} EXP  +${reward.hearts ?? 0} ♥`, '#ffd166')),
        gs.bus.on('memeUnlocked', ({ memeId }) => this.toasts.push(`유행어 획득: "${getMeme(memeId).text}"`, '#bb9af7')),
        gs.bus.on('levelup', ({ level }) => this.toasts.push(`LEVEL UP! Lv.${level}`, '#9ece6a')),
      ];
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  ```
  (기존 `unsubscribe` 필드와 SHUTDOWN 핸들러는 삭제)

- [ ] **Step 5: WorldScene 연결**

import 추가:
```ts
import { markerFor, pickNpcAction } from '../systems/npcInteraction';
import type { Reward } from '../data/schema';
```
필드 추가: `private portalLabels = new Map<Portal, Phaser.GameObjects.Text>(); private unsubChanged: (() => void) | null = null;`

`create()`의 포탈 라벨 루프를 교체:
```ts
    for (const p of this.portals) this.portalLabels.set(p, this.add.text(p.x, p.y - 70, '', SMALL_TEXT).setOrigin(0.5).setDepth(6));
    this.refreshPortals();
```
`create()` 끝(NPC 스폰 뒤)에 추가:
```ts
    this.refreshMarkers();
    this.unsubChanged = gs.bus.on('changed', () => { this.refreshMarkers(); this.refreshPortals(); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubChanged?.());
```
`talkTo`를 교체하고 메서드 추가:
```ts
  private talkTo(npc: Npc): void {
    const gs = this.session.gs;
    const action = pickNpcAction(gs.quests, npc.def.id, npc.dialogueOverride ?? npc.def.dialogue);
    this.openDialogue(action.scriptId, () => {
      gs.report({ type: 'npc_talked', npcId: npc.def.id, dialogueId: action.scriptId });
      if (action.kind === 'offer') gs.startQuest(action.questId);
      if (action.kind === 'complete') this.afterQuestComplete(action.questId, gs.completeQuest(action.questId));
      this.refreshMarkers();
    });
  }

  /** Task 22에서 챕터 클리어 컷신·자동 저장을 추가한다 */
  private afterQuestComplete(_questId: string, _reward: Reward): void {
    this.refreshPortals();
  }

  private refreshMarkers(): void {
    for (const n of this.npcs) {
      const m = markerFor(this.session.gs.quests, n.def.id);
      n.setMarker(m?.text ?? '', m?.color ?? '#ffffff');
    }
  }

  private refreshPortals(): void {
    const flags = this.session.gs.flags;
    for (const p of this.portals) {
      if (p.locked && p.requiresFlag && flags.has(p.requiresFlag)) p.unlock();
      this.portalLabels.get(p)?.setText(p.locked ? '잠김' : getMap(p.target).name);
    }
  }
```

- [ ] **Step 6: 테스트·타입체크·수동 확인**

Run: `npm test && npx tsc --noEmit && npm run dev`
Expected: 테스트 PASS. 연습실 안무 선생님 머리 위 `!` → 대화 후 "퀘스트 수락: 첫 연습" 토스트, 우상단 트래커에 `졸음 슬라임 0/5` → 5마리 처치 후 선생님 `?` 금색 → 완료 토스트(+60 EXP +20 ♥) → 매니저 `!`. q1_03에서 제나·미나미·리브 머리 위 `…`, 각각 대화하면 사라짐. q1_04 완료 시 우상단 평가장 포탈 라벨이 "잠김"에서 "월말평가장"으로 바뀜(포탈 텍스처도 파랑). 유행어 획득 토스트 확인.

- [ ] **Step 7: 커밋**

```bash
git add src tests
git commit -m "feat: NPC 퀘스트 분기·머리 위 마커·토스트·포탈 해금" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 21: 보스 — 월말평가 심사위원단 (3페이즈)

**Files:**
- Create: `src/entities/EnemyProjectile.ts`, `src/entities/Boss.ts`
- Modify: `src/entities/Enemy.ts` (`invulnerableUntil`), `src/scenes/CombatController.ts` (적 투사체 그룹, `spawnBoss`, 무적 처리, 보스 처치 플래그), `src/scenes/WorldScene.ts` (`bosses` 레이어 스폰, `activeBoss()`), `src/scenes/HudScene.ts` (보스 체력 바)
- Test: 수동 확인 + `npx tsc --noEmit`

**Interfaces:**
- Produces (EnemyProjectile.ts): `class EnemyProjectile extends Phaser.Physics.Arcade.Image` — `attacker: Stats`, `multiplier`, `range`, `startX`; 사거리 초과 시 destroy
- Produces (Boss.ts): `class Boss extends Enemy` — `phase: 1|2|3`, `onPhaseChange: (phase) => void`, `fire: (x, y, dir, speed, range, multiplier) => void`. 페이즈: 체력 66% 초과 = 1 보컬(느린 추적 + 2초마다 "고음" 투사체), 33~66% = 2 댄스(2.5초마다 0.6초 돌진), 33% 미만 = 3 랩(1.8초마다 양쪽으로 지면 충격파 2발). 페이즈 전환 시 0.8초 무적. 넉백 무시.
- CombatController: `enemyProjectiles` 그룹(플레이어와 겹치면 접촉 데미지와 같은 규칙, 카운터 가능), `spawnBoss(id, x, y): Boss`, `boss: Boss | null`. `hitEnemy`는 `now < enemy.invulnerableUntil`이면 `MISS`. 보스 사망 시 `gs.flags.add(\`boss_${id}_defeated\`)`, 리스폰 없음.
- WorldScene: `bosses` 오브젝트 레이어를 스폰하되 `gs.flags.has('boss_<id>_defeated')`면 건너뜀. `activeBoss(): Boss | null`.
- HUD: 상단 중앙에 보스 이름과 체력 바. `update()`에서 `(this.scene.get(SCENE.world) as WorldScene).activeBoss()`를 읽어 표시/숨김.

- [ ] **Step 1: Enemy에 무적 필드 추가**

`src/entities/Enemy.ts` 필드에 `invulnerableUntil = 0;` 추가.

- [ ] **Step 2: EnemyProjectile·Boss 작성**

`src/entities/EnemyProjectile.ts`:
```ts
import Phaser from 'phaser';
import { TEX } from '../core/AssetKeys';
import type { Stats } from '../systems/types';

export class EnemyProjectile extends Phaser.Physics.Arcade.Image {
  readonly attacker: Stats;
  readonly multiplier: number;
  readonly range: number;
  readonly startX: number;
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 1 | -1, speed: number, range: number, attacker: Stats, multiplier: number) {
    super(scene, x, y, TEX.projectile);
    this.attacker = attacker;
    this.multiplier = multiplier;
    this.range = range;
    this.startX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setTint(0xbb9af7).setVelocityX(dir * speed).setDepth(9);
  }

  preUpdate(): void {
    if (Math.abs(this.x - this.startX) > this.range) this.destroy();
  }
}
```

`src/entities/Boss.ts`:
```ts
import { Enemy } from './Enemy';
import type { Player } from './Player';

const PHASE_NAMES = ['', '1라운드: 보컬', '2라운드: 댄스', '3라운드: 랩'];

export class Boss extends Enemy {
  phase: 1 | 2 | 3 = 1;
  onPhaseChange: (phase: number, name: string) => void = () => {};
  fire: (x: number, y: number, dir: 1 | -1, speed: number, range: number, multiplier: number) => void = () => {};
  private nextActionAt = 0;
  private dashUntil = 0;

  override takeHit(amount: number): boolean {
    return super.takeHit(amount, 0);
  }

  override updateAi(player: Player, now: number): void {
    const ratio = this.hp / this.def.hp;
    const target: 1 | 2 | 3 = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (target !== this.phase) {
      this.phase = target;
      this.invulnerableUntil = now + 800;
      this.nextActionAt = now + 800;
      this.setVelocityX(0);
      this.onPhaseChange(target, PHASE_NAMES[target]!);
      return;
    }
    if (now < this.stunnedUntil) { this.setVelocityX(0); return; }
    const dx = player.x - this.x;
    const dir: 1 | -1 = dx < 0 ? -1 : 1;
    this.setFlipX(dir === 1);

    if (this.phase === 1) {
      this.setVelocityX(Math.abs(dx) > 40 ? dir * this.stats().spd : 0);
      if (now >= this.nextActionAt) {
        this.fire(this.x + dir * 40, this.y - this.def.height / 2, dir, 260, 480, 1.2);
        this.nextActionAt = now + 2000;
      }
    } else if (this.phase === 2) {
      if (now < this.dashUntil) return;
      if (now >= this.nextActionAt) {
        this.setVelocityX(dir * 420);
        this.dashUntil = now + 600;
        this.nextActionAt = now + 2500;
      } else {
        this.setVelocityX(0);
      }
    } else {
      this.setVelocityX(0);
      if (now >= this.nextActionAt) {
        this.fire(this.x - 40, this.y - 8, -1, 300, 420, 1.0);
        this.fire(this.x + 40, this.y - 8, 1, 300, 420, 1.0);
        this.nextActionAt = now + 1800;
      }
    }
  }
}
```

- [ ] **Step 3: CombatController 확장**

import 추가: `import { Boss } from '../entities/Boss';`, `import { EnemyProjectile } from '../entities/EnemyProjectile';`
필드 추가: `readonly enemyProjectiles: Phaser.Physics.Arcade.Group; boss: Boss | null = null;`
생성자에서 `this.drops = ...` 다음에 추가:
```ts
    this.enemyProjectiles = scene.physics.add.group();
    scene.physics.add.overlap(player, this.enemyProjectiles, (_p, ep) => this.onEnemyProjectile(ep as EnemyProjectile));
```
메서드 추가:
```ts
  spawnBoss(id: string, x: number, y: number): Boss {
    const boss = new Boss(this.scene, x, y, getEnemy(id));
    boss.setData('spawn', { id, x, y, respawnMs: 0 } satisfies SpawnRecord);
    boss.fire = (fx, fy, dir, speed, range, mult) => this.enemyProjectiles.add(new EnemyProjectile(this.scene, fx, fy, dir, speed, range, boss.stats(), mult));
    boss.onPhaseChange = (_phase, name) => floatText(this.scene, boss.x, boss.y - boss.def.height - 20, name, '#bb9af7', 18);
    this.enemies.add(boss);
    this.boss = boss;
    floatText(this.scene, boss.x, boss.y - boss.def.height - 20, '1라운드: 보컬', '#bb9af7', 18);
    return boss;
  }

  private onEnemyProjectile(ep: EnemyProjectile): void {
    if (!ep.active) return;
    const now = this.scene.time.now;
    if (now < this.player.invulnerableUntil) return;
    ep.destroy();
    if (now < this.counterUntil && this.boss) {
      this.counterUntil = 0;
      const dmg = calculateDamage(this.effectiveStats(), this.boss.stats(), this.counterMultiplier, Math.random);
      damagePopup(this.scene, this.boss.x, this.boss.y - this.boss.def.height, dmg.amount, true);
      floatText(this.scene, this.player.x, this.player.y - 70, '카운터!', '#bb9af7', 16);
      if (this.boss.takeHit(dmg.amount)) this.killEnemy(this.boss);
      this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
      return;
    }
    const dmg = calculateDamage(ep.attacker, this.effectiveStats(), ep.multiplier, Math.random);
    damagePopup(this.scene, this.player.x, this.player.y - 56, dmg.amount, dmg.crit, true);
    this.player.invulnerableUntil = now + CONTACT_IFRAMES_MS;
    this.player.setVelocity(Math.sign(ep.body.velocity.x) * 200, -160);
    if (this.gs.takeDamage(dmg.amount)) this.onPlayerDied();
  }
```
`hitEnemy` 맨 앞에 추가:
```ts
    if (this.scene.time.now < enemy.invulnerableUntil) {
      floatText(this.scene, enemy.x, enemy.y - enemy.def.height, 'MISS', '#a9b1d6', 12);
      return;
    }
```
`killEnemy`에서 `this.gs.report(...)` 다음에 추가:
```ts
    if (def.ai === 'boss') {
      this.gs.flags.add(`boss_${def.id}_defeated`);
      this.boss = null;
      for (const ep of this.enemyProjectiles.getChildren()) ep.destroy();
    }
```

- [ ] **Step 4: WorldScene·HUD 연결**

`src/scenes/WorldScene.ts`: 적 스폰 루프 다음에 추가:
```ts
    for (const o of objectsOf(this.map, 'bosses')) {
      if (!gs.flags.has(`boss_${o.name}_defeated`)) this.combat.spawnBoss(o.name, o.x, o.y);
    }
```
메서드 추가:
```ts
  activeBoss(): Boss | null {
    return this.combat?.boss ?? null;
  }
```
(`import type { Boss } from '../entities/Boss';`)

`src/scenes/HudScene.ts`:
- import: `import type { WorldScene } from './WorldScene';`
- 필드: `private bossBar!: Bar; private bossName!: Phaser.GameObjects.Text;`
- `create()`에 추가:
  ```ts
      this.bossName = this.add.text(GAME_WIDTH / 2, 70, '', style(14, '#bb9af7', { fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 })).setOrigin(0.5).setVisible(false);
      this.bossBar = new Bar(this, GAME_WIDTH / 2 - 200, 92, 400, 12, '#bb9af7');
      this.bossBar.setVisible(false);
  ```
- `update()` 끝에 추가:
  ```ts
      const boss = (this.scene.get(SCENE.world) as WorldScene).activeBoss();
      this.bossName.setVisible(!!boss);
      this.bossBar.setVisible(!!boss);
      if (boss) {
        this.bossName.setText(`${boss.def.name} — ${['', '보컬', '댄스', '랩'][boss.phase]}`);
        this.bossBar.set(boss.hp / boss.def.hp, `${Math.max(0, boss.hp)}/${boss.def.hp}`);
      }
  ```

- [ ] **Step 5: 타입체크와 수동 확인**

Run: `npx tsc --noEmit && npm run dev`
Expected: q1_04 완료 후 평가장 입장 → 상단에 "월말평가 심사위원단 — 보컬" 체력 바. 1페이즈: 느리게 다가오며 2초마다 보라색 투사체. 66% 이하에서 "2라운드: 댄스" 표시 + 0.8초 MISS + 돌진. 33% 이하 "3라운드: 랩" + 양쪽 충격파. 처치 시 큰 경험치·하트 120+·인이어 드롭, 다시 입장해도 보스 없음. 제나로 `아뉘이이이!`(Lv.5) 후 투사체를 맞으면 "카운터!". 보스전 중 사망하면 연습실 향기에서 재시작.

- [ ] **Step 6: 커밋**

```bash
git add src
git commit -m "feat: 월말평가 심사위원단 3페이즈 보스와 적 투사체" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 22: 컷신 씬, 챕터 흐름, 사망 연출, 클리어 자동 저장

**Files:**
- Create: `src/scenes/CutsceneScene.ts`
- Modify: `src/scenes/CharacterSelectScene.ts`, `src/scenes/WorldScene.ts`, `src/main.ts`, `src/data/index.ts` (클리어 컷신 참조 검사)
- Test: `tests/data-schema.test.ts` (케이스 추가), 나머지 수동 확인

**Interfaces:**
- Produces (CutsceneScene.ts): key `'Cutscene'`. `CutsceneData { cutsceneId: string; next: { start: string; data?: object } | { resume: string } }`. 검은 화면에 제목 + 줄을 Enter마다 하나씩 페이드인, 마지막 Enter에 `next` 실행.
- 흐름: 캐릭터 선택 → `ch0_intro_<member>` → World(프롤로그). 챕터 1 맵에 처음 들어가면(`seen_ch1_intro` 플래그 없음) `ch1_intro`를 오버레이로 재생. 퀘스트 보상 flags에 `ch<N>_clear`가 있으면 자동 저장 후 `ch<N>_clear` 컷신을 오버레이로 재생.
- `validateAllData()`: 보상 flags의 `ch<N>_clear`마다 `getCutscene('ch<N>_clear')`가 존재해야 한다.
- 사망: 입력 정지 → 회색 틴트 + "무대 실수..." → 0.9초 페이드 → 체력·기력 50%로 `gs.location`(마지막 향기)에서 재시작.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/data-schema.test.ts`에 추가:
```ts
import { getCutscene } from '../src/data/index';

describe('chapter clear cutscenes', () => {
  it('exist for every ch<N>_clear reward flag', () => {
    for (const q of QUESTS) for (const f of q.rewards.flags ?? []) {
      const m = /^ch(\d+)_clear$/.exec(f);
      if (m) expect(() => getCutscene(`ch${m[1]}_clear`), `${q.id}: ${f}`).not.toThrow();
    }
    expect(() => getCutscene('ch1_clear')).not.toThrow();
  });
});
```
그리고 `src/data/index.ts`의 `validateAllData()` 퀘스트 루프 안에 추가:
```ts
    for (const f of q.rewards.flags ?? []) {
      const m = /^ch(\d+)_clear$/.exec(f);
      if (m) getCutscene(`ch${m[1]}_clear`);
    }
```

Run: `npm test -- data-schema`
Expected: PASS (데이터가 이미 갖춰져 있어 바로 통과한다. 이 테스트는 이후 챕터 추가 시 회귀를 막는다.)

- [ ] **Step 2: CutsceneScene 작성**

`src/scenes/CutsceneScene.ts`:
```ts
import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getCutscene } from '../data/index';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { style } from '../ui/textStyles';

export interface CutsceneData {
  cutsceneId: string;
  next: { start: string; data?: object } | { resume: string };
}

export class CutsceneScene extends Phaser.Scene {
  private args!: CutsceneData;
  private lines: string[] = [];
  private index = 0;

  constructor() {
    super(SCENE.cutscene);
  }

  init(data: CutsceneData): void {
    this.args = data;
    this.index = 0;
  }

  create(): void {
    const c = getCutscene(this.args.cutsceneId);
    this.lines = c.lines;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0, 0);
    const title = this.add.text(GAME_WIDTH / 2, 120, c.title, style(26, '#ffd166', { fontStyle: 'bold' })).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 600 });
    this.add.text(GAME_WIDTH - 24, GAME_HEIGHT - 24, 'Enter ▶', style(11, '#a9b1d6')).setOrigin(1, 0.5);
    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-SPACE', () => this.advance());
    this.advance();
  }

  private advance(): void {
    if (this.index >= this.lines.length) {
      this.finish();
      return;
    }
    const t = this.add.text(GAME_WIDTH / 2, 210 + this.index * 44, this.lines[this.index]!, style(18, '#ffffff', { align: 'center', wordWrap: { width: GAME_WIDTH - 200 } })).setOrigin(0.5, 0).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 500 });
    this.index += 1;
  }

  private finish(): void {
    const next = this.args.next;
    if ('resume' in next) {
      this.scene.stop();
      this.scene.resume(next.resume);
    } else {
      this.scene.start(next.start, next.data);
    }
  }
}
```
`src/main.ts` 씬 배열에 `CutsceneScene` 추가 (Dialogue 뒤).

- [ ] **Step 3: 흐름 연결**

`src/scenes/CharacterSelectScene.ts`의 `confirm()` 마지막 줄을 교체:
```ts
    this.scene.start(SCENE.cutscene, {
      cutsceneId: `ch0_intro_${m.id}`,
      next: { start: SCENE.world, data: { mapId: gs.location.mapId, spawnId: gs.location.spawnId } },
    } satisfies CutsceneData);
```
(`import type { CutsceneData } from './CutsceneScene';`)

`src/scenes/WorldScene.ts`:
- import: `import type { CutsceneData } from './CutsceneScene';`
- `create()` 마지막에 추가:
  ```ts
      if (def.chapter >= 1 && !gs.flags.has(`seen_ch${def.chapter}_intro`)) {
        gs.flags.add(`seen_ch${def.chapter}_intro`);
        this.playCutscene(`ch${def.chapter}_intro`);
      }
  ```
- `afterQuestComplete`를 교체:
  ```ts
    private afterQuestComplete(_questId: string, reward: Reward): void {
      this.refreshPortals();
      for (const f of reward.flags ?? []) {
        const m = /^ch(\d+)_clear$/.exec(f);
        if (!m) continue;
        const gs = this.session.gs;
        gs.savedAt = Date.now();
        saveGame(this.session.store, this.session.slot, gs.snapshot());
        this.playCutscene(`ch${m[1]}_clear`);
      }
    }

    private playCutscene(cutsceneId: string): void {
      this.scene.pause();
      this.scene.launch(SCENE.cutscene, { cutsceneId, next: { resume: SCENE.world } } satisfies CutsceneData);
    }
  ```
- `onPlayerDied`를 교체:
  ```ts
    private onPlayerDied(): void {
      if (this.transitioning) return;
      this.transitioning = true;
      this.player.setVelocity(0, 0).setTint(0x565f89);
      floatText(this, this.player.x, this.player.y - 60, '무대 실수...', '#f7768e', 18);
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        const gs = this.session.gs;
        const max = gs.maxStats();
        gs.heal(Math.floor(max.hp / 2), Math.floor(max.mp / 2));
        this.scene.restart({ mapId: gs.location.mapId, spawnId: gs.location.spawnId } satisfies WorldData);
      });
    }
  ```

- [ ] **Step 4: 타입체크와 수동 확인**

Run: `npm test && npx tsc --noEmit && npm run dev`
Expected: 새 게임 → 검은 컷신 "장면 0 — 거제, 2022년" 두 줄 → 프롤로그. 포탈로 연습실 진입 시 "장면 1 — 연습생" 컷신 후 월드 재개(한 번만). 보스 처치 → 선생님 `?` → 완료 대사(내레이션 포함) → "장면 1 — 끝" 컷신 → 월드. 새로고침 후 이어하기하면 연습실, 평가장에 보스 없음, 트래커 비어 있음. 체력 0 → 회색 + "무대 실수..." + 페이드 → 향기 위치에서 체력 절반.

- [ ] **Step 5: 커밋**

```bash
git add src tests
git commit -m "feat: 컷신 씬과 챕터 인트로·클리어 흐름, 사망 연출" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

### Task 23: Playwright 부트 스모크, README, 플레이테스트 체크리스트

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/boot.spec.ts`, `docs/playtest-checklist.md`
- Modify: `README.md`, `.gitignore`(이미 `test-results` 포함)
- Test: `npm run e2e`

**Interfaces:**
- Playwright는 `tests/e2e/*.spec.ts`만 실행하고 Vitest는 `tests/**/*.test.ts`만 실행한다(겹치지 않음).
- 스모크 기준: 타이틀 → 캐릭터 선택 → 컷신 → 프롤로그 맵에서 이동·공격까지 콘솔 `error`와 `pageerror`가 0건.

- [ ] **Step 1: Playwright 설정과 테스트 작성**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', headless: true, viewport: { width: 1024, height: 600 } },
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 30_000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

`tests/e2e/boot.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

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
  await page.waitForTimeout(1200);                       // World create + fadeIn

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await page.keyboard.press('KeyA');
  await page.keyboard.press('KeyS');
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'test-results/boot.png' });
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: 브라우저 설치 후 실행**

Run: `npx playwright install chromium && npm run e2e`
Expected: 1 passed. `test-results/boot.png`에 프롤로그 맵과 HUD가 찍혀 있음(수동으로 열어 확인).

- [ ] **Step 3: README와 플레이테스트 체크리스트 작성**

`README.md`:
```markdown
# 리센느스토리 (RESCENE STORY)

리센느(RESCENE) 다섯 멤버 중 한 명이 되어 연습생 시절부터 데뷔, 2026년 첫 1위까지의 실제 서사를 걷는
메이플스토리 스타일 2D 횡스크롤 액션 RPG. **팬메이드 · 비영리** 프로젝트이며 실명·사진·음원을 쓰지 않는다.

## 실행

```bash
npm install
npm run maps     # maps/*.txt → public/assets/maps/*.json
npm run dev      # http://localhost:5173
npm test         # Vitest (순수 로직·데이터 검증)
npm run e2e      # Playwright 부트 스모크 (최초 1회 npx playwright install chromium)
```

## 조작

| 키 | 동작 |
|---|---|
| ← → | 이동 |
| Space | 점프 (Lv.10부터 2단 점프) · ↓+Space 발판 내려가기 |
| ↑ | 사다리 오르기 · NPC/포탈/향기 상호작용 |
| A | 기본 공격 |
| S / D | 시그니처 스킬 (Lv.1) / Lv.5 스킬 |
| F | 가방의 첫 소모품 먹기 |
| Enter | 대화·컷신 진행 |

## 현재 범위 (수직 슬라이스 M0~M4)

장면 0(프롤로그, 멤버별 오디션)과 장면 1(연습생 → 월말평가 보스)을 플레이·저장·재개할 수 있다.
인벤토리/스킬/유행어 장착 메뉴, 장면 2 이후, 미니게임, 도트 아트는 다음 계획에서.

## 구조

- `src/systems/` 전투·성장·이동·퀘스트·대화·저장 — Phaser 비의존 순수 TS (Vitest)
- `src/data/` 멤버·스킬·적·아이템·유행어·챕터 콘텐츠 — zod로 검증
- `src/scenes/`, `src/entities/`, `src/ui/` Phaser 표현 계층
- `maps/` ASCII 맵 원본 → `tools/build-maps.ts` → Tiled 호환 JSON

설계: `docs/superpowers/specs/2026-09-04-rescene-story-design.md`
계획: `docs/superpowers/plans/2026-09-04-vertical-slice-m0-m4.md`
```

`docs/playtest-checklist.md`:
```markdown
# 플레이테스트 체크리스트 — 수직 슬라이스 (장면 0~1)

멤버 5인으로 각각 1회, 처음부터 장면 1 클리어까지. 항목마다 ✅/❌와 메모.

## 흐름
- [ ] 새 게임 → 컷신 → 프롤로그 → 심사위원 대화 → 포탈 → 연습실 (장면 1 인트로 1회만)
- [ ] q1_01 → q1_05까지 막힘 없이 진행 (마커 `!`/`?`/`…`가 다음 행동을 안내하는가)
- [ ] 평가장 포탈이 q1_04 전엔 잠기고 후엔 열리는가
- [ ] 보스 3페이즈 전환·처치 → 완료 대사 → 클리어 컷신 → 자동 저장
- [ ] 새로고침 후 이어하기: 위치·레벨·퀘스트·유행어·하트 복원, 보스 재등장 없음

## 전투·성장
- [ ] 각 멤버 기본 공격/S 스킬/D 스킬(Lv.5) 체감 차이가 있는가
- [ ] 장면 1 클리어 시점 레벨 (목표 6~8) — 실제: ____
- [ ] 보스 소요 시간 (목표 60~120초) — 실제: ____
- [ ] 사망 횟수 — 실제: ____ (0회면 너무 쉬움, 5회 이상이면 너무 어려움)
- [ ] 접촉 데미지·투사체 데미지가 이해 가능한 수준인가

## 조작감
- [ ] 발판 통과 점프 / ↓+Space 내려가기 / 사다리 진입·이탈이 의도대로 되는가
- [ ] 대화·컷신 중 캐릭터가 움직이지 않는가
- [ ] HUD가 가려서 안 보이는 것이 있는가

## 서사·텍스트
- [ ] 유행어 표기가 팬 기준으로 맞는가 (data/memes.ts, 대사)
- [ ] 자기 멤버로 플레이할 때 어색한 대사가 있는가 (예: 원이로 q1_04)
- [ ] 오타·어색한 문장

## 버그 메모
- 
```

- [ ] **Step 4: 전체 검증**

Run: `npm run lint && npm test && npx tsc --noEmit && npm run build && npm run e2e`
Expected: lint 경고 0(또는 자동 수정), 테스트 전부 PASS, 빌드 성공(`dist/`), e2e 1 passed.

- [ ] **Step 5: 커밋**

```bash
git add playwright.config.ts tests/e2e README.md docs/playtest-checklist.md
git commit -m "test: Playwright 부트 스모크와 README·플레이테스트 체크리스트" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013cZs7paiaRw6qcifT9SNXC"
```

---

## 범위 밖 (다음 계획: M5~M8)

- 인벤토리·장비·스킬 강화(SP 사용)·유행어 장착·포카 도감 메뉴 (I/K/E/C 키)
- 유행어 이모트 키와 `emote_used` 이벤트, 인지도 게이트
- 장면 2~6 콘텐츠, 동행 어시스트, 리듬 무대·러닝·챌린지 미니게임
- 도트 아트·칩튠·모바일 터치·배포

## 실행 순서 요약

| 태스크 | 산출물 | 검증 |
|---|---|---|
| 1 | 툴체인 + 프로토타입 이식 | Vitest 1 |
| 2~10 | 순수 시스템 9개 (types/progression/combat/schema+data/skills/inventory+memes/movement/quest/dialogue/GameState+save) | Vitest |
| 11 | 맵 파이프라인 | Vitest |
| 12~13 | 장면 0~1 콘텐츠 데이터 | Vitest 데이터 검증 |
| 14~16 | 시작 씬, 월드·이동, 포탈·저장 | 수동 |
| 17~18 | 전투, HUD·스킬 키 | 수동 + Vitest(questText) |
| 19~20 | NPC·대화, 퀘스트 통합 | 수동 + Vitest(npcInteraction) |
| 21~22 | 보스, 컷신·흐름 | 수동 |
| 23 | e2e 스모크, 문서 | Playwright |
