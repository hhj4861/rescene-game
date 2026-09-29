# 캐릭터 v2 구현 플랜 (초상화 · 3등신 스프라이트 · 시그니처 동작 · 말투)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **orch-flow 실행 모드:** 트랙 4개, 웨이브 2개. 웨이브 1(C1·C2·C3)은 동시에, 웨이브 2(C4)는 1이 전부 머지된 뒤. 소유권 glob 밖은 수정 금지. 트랙끼리는 아래 **Interfaces**와 **웨이브 0 상수**로만 맞춘다.

**Goal:** 멤버가 "누구인지"뿐 아니라 "그 멤버답게" 보이고 들리게 한다 — 64×64 초상화(표정 3종), 3등신 32×64 스프라이트(의상 5벌·시그니처 포즈), 멤버별 억양·말버릇.

**Architecture:** 기존 ASCII→PNG 파이프라인을 그대로 쓰되 부품 합성(얼굴·머리·눈·입·손)으로 초상화를 만들고, 스프라이트 템플릿을 32×64로 새로 그린다. 프레임·의상·초상화 규격은 `src/core/spriteFrames.ts`(웨이브 0) 하나가 원본이다. 음색·말버릇은 데이터(`members.ts`)와 순수 함수(`voice.ts`)에 있고, 씬 통합은 웨이브 2가 한다.

**Spec:** `docs/superpowers/specs/2026-09-06-rescene-character-v2-design.md`(이하 "부록"). 기반: `2026-09-06-rescene-arcade-v0.2-design.md`.

## Global Constraints

- 1·2차 플랜의 제약 전부(no-phaser 순수 시스템, 실명·사진·음원·닮은꼴 금지, 커밋 트레일러, push·머지·PR 금지, 게이트, `E2E_PORT` 사용).
- 말버릇 대사는 창작이며 유행어 사전(v0.1 §5) 표현만 쓴다. 실제 발언·인터뷰 인용 금지, 실명 금지.
- 아트 트랙(C1·C2)은 저장소 밖(`/tmp`)에 미리보기 PNG를 렌더해 **직접 보고** 다듬는다(1차 플랜의 `preview` 방식: 시트를 2~4배로 키워 PNG로 쓰고 Read로 확인). "그려졌다"가 아니라 "알아볼 수 있다"가 완료 기준이다.

## 웨이브 0 — 리드가 먼저 커밋 (워커는 반영된 상태에서 시작)

`src/core/spriteFrames.ts`:

```ts
export const OUTFITS = ['training', 'debut', 'road', 'comeback', 'pretty'] as const;
export type Outfit = (typeof OUTFITS)[number];
/** 프레임 좌표계의 물리 몸. C2가 프레임 크기와 함께 갱신한다. Player는 이 값만 쓴다. */
export const PLAYER_BODY = { width: 28, height: 46, offsetX: 2, offsetY: 2 } as const;
export const playerSheetUrl = (member: MemberId, outfit: Outfit = 'training'): string =>
  outfit === 'training' ? `assets/sprites/player_${member}.png` : `assets/sprites/player_${member}_${outfit}.png`;
export const PORTRAIT_FRAME = { width: 64, height: 64 } as const;
export const PORTRAIT_FRAME_COUNT = 3;             // 0 기본 · 1 시그니처 · 2 피격
export const portraitSheetUrl = (member: MemberId): string => `assets/portraits/portrait_${member}.png`;
```

`src/core/AssetKeys.ts`: `playerTex(member, outfit: Outfit = 'training')` → `player_<m>` 또는 `player_<m>_<outfit>`; `portraitTex(member) = 'portrait_<m>'`.
`src/entities/Player.ts`: `setSize(PLAYER_BODY.width, PLAYER_BODY.height).setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY)`.
`src/data/schema.ts`: `StageDefSchema.outfit: z.enum(OUTFITS).optional()`.

## 트랙 구성과 파일 소유권

| 웨이브 | 트랙 | 소유권 glob | 모델 | 태스크 |
|---|---|---|---|---|
| 1 | **C1 portraits** | `tools/sprites/portraits.ts`, `tools/sprites/portraitParts.ts`, `tools/build-portraits.ts`, `public/assets/portraits/**`, `tests/portraits.test.ts`, `package.json`, `src/scenes/PreloadScene.ts` | fable(사용자 품질 요구) | 1~2 |
| 1 | **C2 sprites-v2** | `tools/sprites/templates.ts`, `tools/sprites/npcs.ts`, `tools/sprites/ui.ts`, `tools/sprites/outfits.ts`, `tools/sprites/poses.ts`, `tools/build-sprites-lib.ts`, `tools/build-sprites.ts`, `tools/pixel-art.ts`, `public/assets/sprites/player_*.png`, `public/assets/sprites/npc_*.png`, `public/assets/sprites/life_*.png`, `src/core/spriteFrames.ts`, `tests/sprites.test.ts`, `tests/sprites-world.test.ts`, `tests/pixel-art.test.ts`, `tests/assets-v2.test.ts` | fable(사용자 품질 요구) | 3~5 |
| 1 | **C3 voice-lines** | `src/systems/voice.ts`, `src/data/schema.ts`, `src/data/members.ts`, `src/data/voice.ts`, `tests/voice.test.ts`, `tests/data-schema.test.ts` | sonnet | 6~7 |
| 2 | **C4 integrate** | `src/entities/Player.ts`, `src/entities/CheerNpc.ts`, `src/scenes/**`, `src/data/stages/**`, `src/core/AssetKeys.ts`, `tests/e2e/**` | fable(complex) | 8~11 |

### Interfaces (트랙 간 계약)

```ts
// C2 → spriteFrames.ts (C4·Preload가 읽는다)
export const PLAYER_FRAME = { width: 40, height: 64 } as const;
export const PLAYER_BODY  = { width: 24, height: 56, offsetX: 8, offsetY: 8 } as const;
export const PLAYER_ANIMS = {
  idle:     { frames: [0, 1], frameRate: 2, repeat: -1 },
  flourish: { frames: [2], frameRate: 1, repeat: 0 },
  walk:     { frames: [3, 4, 5, 6], frameRate: 8, repeat: -1 },
  jump:     { frames: [7], frameRate: 1, repeat: 0 },
  attack:   { frames: [8, 9, 10], frameRate: 12, repeat: 0 },   // 웨이브 1 호환(옛 Player가 통째로 재생)
  attack1:  { frames: [8], frameRate: 1, repeat: 0 },
  attack2:  { frames: [9], frameRate: 1, repeat: 0 },
  attack3:  { frames: [10], frameRate: 1, repeat: 0 },
  hurt:     { frames: [11], frameRate: 1, repeat: 0 },
  super:    { frames: [12, 13], frameRate: 6, repeat: -1 },
  win:      { frames: [14], frameRate: 1, repeat: 0 },
} as const;
export const PLAYER_FRAME_COUNT = 15;
export const NPC_FRAME = { width: 40, height: 64 } as const;   // NPC도 같은 템플릿
// C1 → PreloadScene: this.load.spritesheet(portraitTex(m), portraitSheetUrl(m), PORTRAIT_FRAME)  (5인)
// C3 → schema/members
VoiceProfile { baseHz; syllableMs; wave; vibrato?; accent?: 'fall'|'rise'|'flat'|'bounce'; spread?: number }
MemberDef.lines: { cheer: string[]; win: string[]; hurt: string[]; card: string[] }   // 각 3개 이상
// C3 → voice.ts: speakNotes 가 accent·spread 를 적용한다(아래 Task 6)
```

- C2의 `life_<m>` 16×16 크롭은 새 머리(행 2~17, 열 12~27)에서 자른다.
- C2는 `player_<m>.png`(= training)와 `player_<m>_<outfit>.png` 4벌, `npc_*.png`, `life_*.png`를 다시 만든다. **Preload는 건드리지 않는다**(기존 코드가 `PLAYER_FRAME`으로 `player_<m>.png`를 로드하므로 자동 반영; 의상 시트 로드는 C4).

---

# 웨이브 1

## C1 portraits

### Task 1: 초상화 부품과 5인 시트

**Files:** Create `tools/sprites/portraitParts.ts`(부품 그리드), `tools/sprites/portraits.ts`(`PORTRAITS: Record<MemberId, PortraitSpec>`, `buildPortraitSheet(member)`), `tools/build-portraits.ts`(`npm run portraits` → `public/assets/portraits/portrait_<m>.png`), `tests/portraits.test.ts`; Modify `package.json`(`"portraits": "tsx tools/build-portraits.ts"`)

**Interfaces:**

```ts
export interface PortraitSpec { hair: 'long'|'bob'|'wavy'|'short'|'twin'; hairColor: [string, string]; accent: string;
  accessory: 'earring'|'choker'|'galHighlight'|'hairclip'|'ribbon'; signature: 'ui'|'thumb'|'peace'|'grip'|'pout' }
export function buildPortraitSheet(member: MemberId): { width: 192; height: 64; rgba: Uint8Array; png: Uint8Array };
```

- 부품(64×64 그리드, `composeLayers`/`pasteGrid` 재사용): `FACE`(피부 타원 + 목 + 어깨 상의 색 T), `HAIR_BACK[style]`, `HAIR_FRONT[style]`, `EYES[open|closed|wink|sparkle|squint]`, `MOUTH[smile|open|tongue|pout|puff]`, `BLUSH`, `HANDS[none|up|thumb|peace|clasp]`, `ACCESSORY[...]`. 프레임 0 = open+smile, 1 = 시그니처 조합(부록 §1), 2 = squint + wave mouth.
- 눈은 최소 6×6(하이라이트 2px), 입은 표정별로 확실히 다르게. 색은 `tools/sprites/templates.ts`의 `LOOKS` 머리색·포인트색을 그대로 import(수정 금지).
- [ ] **Step 1: 실패 테스트** — `tests/portraits.test.ts`: 5인 시트 192×64, 프레임 3개가 서로 다름, 파일 일치, 프레임 0의 눈 영역에 하이라이트 흰 픽셀 존재.
- [ ] **Step 2~4**: 구현 → `/tmp/rescene-portraits/preview.png`(3배)를 렌더해 Read로 확인 → 어색한 부품 수정(최소 2회 반복) → 통과.
- [ ] **Step 5: 커밋** `feat(art): 멤버 초상화 64×64 표정 3종`.

### Task 2: Preload가 초상화를 로드

**Files:** Modify `src/scenes/PreloadScene.ts` — `for (const m of MEMBERS) this.load.spritesheet(portraitTex(m.id), portraitSheetUrl(m.id), { frameWidth: PORTRAIT_FRAME.width, frameHeight: PORTRAIT_FRAME.height })`.
- [ ] 구현 → tsc·lint·`E2E_PORT=<포트> npm run e2e` 6/6 → 커밋 `feat(art): 초상화 시트 로드`.

## C2 sprites-v2

### Task 3: 32×64 템플릿·의상·포즈

**Files:** Modify `tools/sprites/templates.ts`(SPRITE_W 32, SPRITE_H 64, BODY, HAIR 5종, PROPS 5종, LOOKS), Create `tools/sprites/outfits.ts`(`OUTFIT_PALETTES: Record<Outfit, {T,t,B,b,O,A, skirt: 'pants'|'skirt'|'shorts', jacket: boolean}>`), `tools/sprites/poses.ts`(LEGS 걷기 4·점프, ARMS attack1/2/3, SUPER[member] 2프레임, WIN[member], FLOURISH[member], HURT_EYES)

- 부록 §2 규격. 머리 24행: 뒷머리(H 어두운 톤) → 얼굴 → 앞머리 순으로 합성. 눈 2×2 + 하이라이트 1px, 입 2px, 볼터치. 액세서리 픽셀: 귀걸이 1px 금색, 초커 1행 검정, 갸루 하이라이트(눈 밑 흰 1px 2개), 헤어클립 2px, 리본 3×3.
- [ ] **Step 1: 실패 테스트** — `tests/sprites.test.ts`: `PLAYER_FRAME_COUNT === 15`, 애니 인덱스 0~14 빈틈 없음, 시트 600×64(40×15), 프레임별 차이(idle0≠idle1, attack1≠attack2≠attack3, super0≠super1, win≠idle), 5인×5벌 파일 존재·일치, 발이 맨 아래 행.
- [ ] **Step 2~4**: `src/core/spriteFrames.ts`를 Interfaces대로 갱신 → 템플릿·포즈 구현 → `npm run sprites` → `/tmp/rescene-sprites/preview.png`(3배, 5인 × training + 원이 5벌)를 Read로 확인하고 다듬기(최소 2회) → 통과.
- [ ] **Step 5: 커밋** `feat(art): 3등신 32×64 멤버 스프라이트·의상 5벌·시그니처 포즈`.

### Task 4: NPC·life 아이콘 재생성

**Files:** Modify `tools/sprites/npcs.ts`(오버레이 좌표를 새 템플릿에 맞춤), `tools/sprites/ui.ts`(life 크롭 행 2~17·열 12~27), `tests/sprites-world.test.ts`, `tests/assets-v2.test.ts`
- [ ] NPC 9종 40×64 × 2프레임, `NPC_FRAME` 갱신, life 16×16 → 통과 → 커밋 `feat(art): NPC·얼굴 아이콘 재생성`.

### Task 5: 게이트
- [ ] `npx vitest run` · tsc · lint · `npm run sprites` 후 `git status` 깨끗 · `E2E_PORT=<포트> npm run e2e` 6/6(옛 Player는 `attack` 3프레임을 통째로 재생 — 정상).

## C3 voice-lines

### Task 6: 억양·폭 (`voice.ts`)

**Files:** Modify `src/systems/voice.ts`, `src/data/schema.ts`(VoiceProfileSchema에 `accent`·`spread` 선택), `tests/voice.test.ts`
- 규칙: `spread`(기본 1) — 음절 semitone × spread(반올림). `accent`: `fall` 마지막 노트 −3 · `rise` +3 · `bounce` 노트 인덱스 짝수 +1/홀수 −1 · `flat`/없음 변화 없음. `!`·`?` 규칙은 accent 뒤에 적용.
- [ ] **Step 1: 실패 테스트** — fall/rise/bounce/spread 각 1개, 기존 테스트 유지 → **Step 2~5** 구현·통과·커밋 `feat(voice): 억양·음폭`.

### Task 7: 음색 v2·말버릇 데이터

**Files:** Modify `src/data/schema.ts`(`MemberDef.lines` 필수), `src/data/members.ts`(부록 §4 표의 음색 + `lines` 4종 × 3문장 이상), `src/data/voice.ts`(NPC 음색 유지), `tests/data-schema.test.ts`
- [ ] **Step 1: 실패 테스트** — 5인 `lines` 4종 각 3개 이상, 문장에 실명(진경은·예빈 등 v0.1 §12 금칙) 없음, `accent` 값이 표와 일치 → **Step 2~5** 구현·통과·커밋 `feat(data): 멤버 음색 v2·말버릇 대사`.

---

# 웨이브 2 (1 머지 후)

## C4 integrate (complex)

### Task 8: Player — 몸·체인 프레임·개인기·필살기·승리
**Files:** `src/entities/Player.ts`, `src/scenes/CombatController.ts`
- 체인 단계별 `attack1/2/3`, 3타 히트스톱 60ms(`scene.time.timeScale` 대신 물리 일시정지 60ms), 대기 6초 → `flourish`, `playSuper()`/`playWin()`. `PLAYER_BODY` 사용은 웨이브 0으로 이미 반영.
- [ ] 구현 → e2e 통과 → 커밋.

### Task 9: 컷인·선택·결과·엔딩·컨티뉴에 초상화
**Files:** `src/scenes/SuperFx.ts`(초상화 프레임 1, 3배), `CharacterSelectScene.ts`(초상화 3배 + 스프라이트), `ResultScene.ts`(win 포즈 3배 + 초상화 + `lines.win` 무작위 블립), `EndingScene.ts`, `ContinueScene.ts`(피격 초상화), `HudScene.ts`(카드 획득 자막 옆 1배)
- [ ] 구현 → 커밋.

### Task 10: 의상·응원·피격 대사
**Files:** `src/scenes/PreloadScene.ts`(5인 × 5벌 로드 + 애니 등록은 의상별 텍스처 키로), `src/scenes/WorldScene.ts`(`stage.outfit ?? 'training'`으로 Player 텍스처 선택), `src/data/stages/stage2..5.ts`(`outfit: 'debut'|'road'|'comeback'|'pretty'`), `src/entities/CheerNpc.ts`·`WorldScene`(응원 대사 = 멤버 `lines.cheer` 무작위 + 그 멤버 음색), `CombatController`(피격 20% `lines.hurt` 말풍선 + 블립), 카드 획득 `lines.card`
- [ ] 구현 → 커밋.

### Task 11: e2e·게이트
**Files:** `tests/e2e/boot.spec.ts`(필살기 뒤 컷인이 `portrait_<m>` 텍스처를 썼는지 — `scene.children`에 텍스처 키 확인), `stage1-full.spec.ts`(결과 화면에서 win 프레임)
- [ ] `E2E_PORT=<포트> npm run e2e` 6/6 · vitest · tsc · lint · build → 커밋.

## Self-Review 메모
- 부록 §1(C1·C4 Task 9) §2(C2·웨이브 0·C4 Task 8·10) §3(C4 Task 8·9) §4(C3·C4 Task 10) §5(웨이브 0·C1·C2) §6(각 트랙 테스트·C4 Task 11) 커버.
- 이름 원본: 프레임·의상·초상화 상수는 `spriteFrames.ts`, 텍스처 키는 `AssetKeys.ts`(playerTex/portraitTex), 음색·대사는 `members.ts`.
