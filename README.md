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
