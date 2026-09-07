# 리센느스토리 (RESCENE STORY) — 아케이드 v0.2

리센느(RESCENE) 다섯 멤버 중 한 명이 되어 연습생 시절부터 데뷔, 2026년 첫 1위까지의 실제 서사를 걷는
메이플스토리풍 옛날 오락실 스타일 횡스크롤 액션 게임. **팬메이드 · 비영리** 프로젝트이며 실명·사진·음원을 쓰지 않는다.

한 판 10~15분, 목숨 3 + 컨티뉴 1회, 버튼 3개(이동·점프·공격), 화면의 숫자는 점수와 하트뿐이다.
성장(레벨·경험치·장비)은 없다. 한 판 안에서만 유행어 카드로 일시 강화한다.

## 실행

```bash
npm install
npm run maps     # maps/*.txt → public/assets/maps/*.json
npm run sprites  # tools/sprites/*.ts → public/assets/sprites/*.png, public/assets/tiles/*.png
npm run voice    # public/assets/voice/*.ogg|mp3 → manifest.json (없어도 통과, 빈 목록)
npm run dev      # http://localhost:5173
npm test         # Vitest (순수 로직·데이터 검증)
npm run e2e      # Playwright. 다른 포트로 띄우려면 E2E_PORT=5177 npm run e2e
```

`npm run e2e`는 파일 3개를 돈다: `boot.spec.ts`(스테이지 1 스모크 — 첫 구간 전멸·GO·필살기 1회),
`stage1-full.spec.ts`(스테이지 1 전 구간·보스 페이즈·사망 재시작·클리어 전환 전체), `stages.spec.ts`
(스테이지 2~5를 각각 타이틀→스테이지 셀렉트→World로 진입시켜 구간 4개+보스를 개발 훅으로 주파하고,
스테이지 5는 결과 화면에서 Enter로 엔딩까지 확인). 모두 콘솔 오류 0을 단언한다.

`npm run build`는 `tsc --noEmit` 뒤 `vite build`를 실행한다. `npm run lint`는 `src tests tools`를 검사한다.
Playwright를 처음 쓰면 `npx playwright install chromium`이 필요할 수 있다.

## 조작

| 키 | 동작 |
|---|---|
| ← → | 이동 |
| Space | 점프(2단 점프), ↓+Space 발판 내려가기 |
| ↑ / ↓ | 사다리 오르내리기 |
| A | 공격. 0.6초 안에 연타하면 1타→2타→3타 체인(3타는 배율 1.6·넉백 2배) |
| S | 유행어 필살기(리센느 게이지 100%일 때) |
| M | 음소거 토글 |
| Enter | 확인 / 컷신·결과 화면 진행 |

## 한 판의 흐름

```
타이틀(하이스코어) → 캐릭터 선택
  → [스테이지 인트로 카드 → 스테이지(구간 4개 + 보스) → 결과 화면] × 5 → 엔딩 롤 → 이니셜 입력 → 타이틀
     └ 사망: 목숨 -1 → 구간 처음부터
     └ 목숨 0: 컨티뉴 → 점수 0으로 같은 스테이지 첫 구간부터, 또는 게임 오버 → 이니셜 입력
```

- 체력은 하트 5칸. 잡몹 접촉·탄 1칸, 보스 2칸. 하트 아이템은 1칸 회복, 스테이지 클리어 시 5칸으로 회복.
- 구간은 맵의 `lock` 오브젝트에서 카메라가 잠기고 웨이브가 시작된다. 웨이브를 전멸시키면 "GO →"가 뜨고 카메라가 풀린다.
- 리센느 게이지(0~100, 타격 +4·처치 +12·엘리트 +30)가 가득 차면 S로 유행어 필살기를 쓴다. 연출 중 전부 무적·적 정지.
- 엘리트를 처치하거나 구간 클리어 상자(30%)·보스(확정)에서 유행어 카드를 얻는다. 최대 3장 보유, 초과하면 가장 오래된 카드가 도감으로만 남는다.
- **점프대**(스테이지 4 구간 D "밈의 파도"): 밟으면 자동으로 위로 튕겨 오른다(별도 키 없음, 0.3초 재발동 금지).
- **중간보스**(스테이지 3 구간 C): 웨이브 안에서 `ai: 'boss'` 잡몹으로 등장한다. 처치해도 스테이지 클리어는
  아니고 그 구간의 웨이브가 이어진다(보스 바는 뜨지만 "중간보스" 라벨이 붙는다). 스테이지 보스는 `StageDef.boss`
  하나뿐이며, 그걸 처치해야 결과 화면으로 넘어간다.

### 스테이지

| # | 이름 | 시기 | 보스 | 기믹 한 줄 |
|---|---|---|---|---|
| 1 | 연습생 | 2022 ~ 2024.02 | 월말평가 심사위원단 | 페이즈 3개(보컬→댄스→랩), 별도 기믹 없음 |
| 2 | 데뷔 | 2024.02 ~ 2024.03 | 첫 카메라 | 렌즈가 닫혀 있으면 무적 — 3타 체인을 채우면 5초간 렌즈가 열려 그때만 피해가 들어간다 |
| 3 | 신인의 길과 무명의 터널 | 2024.06 ~ 2025.12 | 침묵 | 계속 무관심 안개를 소환하는 동안 무적 — 소환된 잡몹을 3마리 처치하면 8초간 약점(정적)이 열린다. 구간 C(음원차트 타워, 세로 오르막)에 중간보스 TOP100 문지기가 있다 |
| 4 | 역주행 | 2026.02 ~ 2026.06 | 카피캣 대장 | 플레이어의 공격(근접/원거리)을 그대로 따라 하다가, 필살기를 맞으면 3초 경직(받는 피해 2배). 구간 D(밈의 파도)에 점프대가 있다 |
| 5 | 첫 1위 | 2026.07 ~ 2026.09 | 트로피 수호자 | 페이즈마다 무대 배경색이 바뀐다(더쇼→음악중심→인기가요) — 잡몹 소환(스포트라이트 드론)·대시·양방향 탄막이 페이즈별로 늘어난다 |

## 구조

- `src/systems/` 런 상태·점수·구간(웨이브)·카드·하이스코어·이동·전투·음성 블립 — Phaser 비의존 순수 TS(Vitest로 검증)
  - `run.ts`(하트·목숨·컨티뉴·게이지), `score.ts`(콤보 배수·클리어 보너스), `waves.ts`(구간 상태 머신),
    `cards.ts`(카드 보유·버프 합산), `highscore.ts`(상위 10 저장), `voice.ts`(문장→음성 블립 노트),
    `movement.ts`, `combat.ts`(순수 데미지 계산)
- `src/data/` 멤버·적·스킬(필살기 포함)·유행어 카드·NPC·스테이지 — zod(`schema.ts`)로 검증(`validateAllData`)
- `src/scenes/` Phaser 씬: `Boot → Preload → Title → CharacterSelect → Cutscene(스테이지 인트로) → World(+Hud) → Result → 다음 Cutscene`,
  사망/컨티뉴는 `Continue`·`GameOver`·`NameEntry`로, `Codex`(리센느 사전)·`StageSelect`·`Ending`이 곁가지.
  `SectionController`가 구간(잠금·웨이브·GO)을, `CombatController`가 체인 공격·게이지·필살기·드랍을 맡는다.
- `src/entities/`, `src/ui/` Phaser 표현 계층. `src/entities/bosses/`(`LensBoss`·`SilenceBoss`·`CopycatBoss`·`TrophyBoss`)가
  스테이지 2~5 보스 기믹을, `src/entities/JumpPad.ts`가 점프대를 맡는다. `src/audio/`는 절차 합성 음성·효과음·BGM(Web Audio, `AudioBus.ts`).
- `maps/` ASCII 맵 원본 → `tools/build-maps.ts` → Tiled 호환 JSON(`public/assets/maps/`).
- `tools/sprites/` ASCII 픽셀 템플릿 → `tools/build-sprites.ts` → 스프라이트시트·타일셋 PNG(`public/assets/sprites/`, `public/assets/tiles/`).
- `public/assets/voice/` 권리를 확보한 유행어 음성 파일 슬롯. 자세한 규칙은 [`public/assets/voice/README.md`](public/assets/voice/README.md) 참고.

설계: `docs/superpowers/specs/2026-09-06-rescene-arcade-v0.2-design.md` (이전 RPG 설계는 `2026-09-04-rescene-story-design.md`, 연표·유행어·출처 참조용으로만 유지)
계획: `docs/superpowers/plans/2026-09-06-arcade-v0.2-a0-a2.md`(스테이지 1) · `2026-09-06-arcade-v0.2-a4-a5.md`(스테이지 2~5·보스 기믹·검증/밸런스)
플레이테스트: `docs/playtest-checklist.md`
