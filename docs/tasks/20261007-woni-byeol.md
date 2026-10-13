# 원이와 별이의 산책 — 2026-10-07

- Goal: 원이와 화이트 말티즈 별이를 공동 주인공으로 원이 게임 재구성. 노래 아이템 60초 재생 및 시간 연장.
- Owner: invoking Codex session; worker / Claude OFF. Only Woni flow and shared timer/save integration.
- Base: feat/arcade-game-rules-refresh, bdd8e759b479fe39d460c21d90c1bc534e122ad4.
- Design: 기존 멤버 인형 + 직접 그린 흰 말티즈, 녹색 공원 길, 산책·간식·시계·음표. 팔레트 잔디 #b9d5b0, 길 #f3dfbd, 잉크 #244655, 별이 #fffefa, 목걸이 #ed9db2, 물 #87cbd6. 기존 서체와 오락기 레이아웃 유지. 중앙 길에서 두 주인공이 함께 이동하고 하단에 간식/노래/시간 범례.
- Rules: 좌우 이동, 통나무 점프, 물웅덩이 회피, 5연속 간식 = 8초 보호. 시계 +10초 (한 판 최대 +60초). 노래는 기존 여름아 부탁해 클립을 60초 반복, 중복 획득은 재시작하지 않음. 멈춤/다음 스테이지 재생 유지, 새로고침은 소비한 노래 재시작 안 함.
- Saves: 새 walkVersion 스냅샷 저장; 이전 불꽃/추격전 스냅샷만 초기화, stage/lives/records 보존. 시간 보너스·점프·아이템은 저장/복원.
- Done: unit/lint/build + desktop/mobile browser checks, visual review, own commit and normal upstream push. No merge/deploy authorized in this request.
- Status: implementation and local verification complete; ready for commit/upstream push and draft PR. Main merge / deployment require a separate user instruction.

## Verification progress
- Unit suite 140 / 140, lint and build passed.
- First browser run 41 passed / 1 failed. Trace shows original Woni clip paused correctly at 60 seconds; a new stage-2 song pickup legitimately started a second clip during fastForward. Corrected the assertion to inspect the original clip, added explicit active-song exit coverage.
- Mobile screenshot reviewed: Woni + white Maltese, song/clock icons and controls are visible without horizontal overflow.

- Final-build broader browser run: 134/135 passed. WebKit exposed an existing pending `Audio.play()` → immediate pause → AbortError race that discarded the timed song. Fixed shared timed-song handling to retain the clip on deliberate play interruption and to ignore stale resume failures. Added two audio unit regression cases; rerunning all affected browser stories with the fix.

## Final verification
- Node 22.23.3 unit suite: 142 passed, 0 failed.
- ESLint: passed. Vite production build: passed (app-Qkg1xSqb.js).
- Built-app browser suite: **135 passed**, 0 failed, 1.7m. Projects: desktop-chromium, mobile-chromium, mobile-webkit. Files: walk, item-songs, score-songs, arcade, progress, game-revision.
- Actual bundled singing audio loads/plays, 60-second timer stops the original clip, pause/resume/next-stage continuation, duplicate gifts, mute, exit and reload checked. Original clip ends even when another item later starts a new clip.
- Clock pickup checked at 89.9s: game continues beyond original deadline; extra time survives reload; new deadline ends the round. Base 90s + maximum 60s bonus.
- Desktop and mobile screenshots visually inspected. No horizontal overflow or page errors in Woni flow.
- Artifacts: `/Users/admin/Library/Mobile Documents/com~apple~CloudDocs/gpt 작업/rescene-game/woni-byeol-20261007/` (`build-verified/`, `tests-verified/`, `browser-verified.log`).
- No backend/API changes. Songs remain existing short bundled clips, looped; no new full-length source audio. Existing old Woni snapshots restart their current round while keeping stage, lives and records.
