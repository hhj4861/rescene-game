# 완료 검사기의 중첩 worktree 관찰 복구

- 목표/담당: 현재 Codex 세션이 배포 후 남은 과거 `unsupported` 디렉터리 관찰 오류를 실제 Git·도구 종료 근거로 복구한다.
- 범위: 복구 패치 생성기, 격리 회귀 검사, 승인된 실제 검사기 적용과 연결 파일 네 개 정리. 게임 기능 변경은 없다.
- 구현 기준: main `eb38f92`, 작업 브랜치 `fix/task-finish-worktree-containers-20261008`, 최종 코드 `404c1c24b7c983ec117a3ca6d090bb149485f2ef`.
- 현재 결과: 사용자 명시 승인 후 [PR #29](https://github.com/hhj4861/rescene-game/pull/29)를 머지하고 실제 검사기에 적용했다. 운영도 재배포했다. 별개 승인 검토 실패 기록 한 건도 2026-10-09 승인된 PR #30을 적용해 정상 복구했다.

## 반영한 동작

`dirty()`가 중첩 worktree를 일반 파일로 비교하다 중단하던 문제를 수정했다. 같은 Git 공통 디렉터리의 등록 linked worktree만 대상으로 현재 경로, 미추적 파일을 포함한 clean 상태, HEAD·브랜치·upstream, 실제 원격의 HEAD 포함 여부를 확인하고 상태를 재검사한다. 과거 snapshot의 `unsupported` 또는 당시 생성 전으로 인한 snapshot 부재를 처리하며, snapshot 부재 자체를 완료 근거로 사용하지 않는다.

명시 편집 경로·소유 파일, 임의 디렉터리, 별도 저장소, symlink, dirty 또는 미푸시 worktree는 계속 거부한다. 종료 증거·소유권·커밋·원격 검사를 유지하고 검증 근거를 기존 종료 영수증에 추가한다. 원격 ref 조회는 한 파일 관찰 안에서만 실제 URL 기준으로 공유하며 상대 경로 원격은 저장소 경로까지 구분한다. 서로 다른 관찰 간에는 재사용하지 않는다.

## 실제 적용과 검증

- 사용자 승인 후 `liv-difficulty`, `may-bubble-difficulty`, `pump-rescene-songs`, `pump-score-only`의 미추적 `node_modules` symlink 네 개만 제거했다. 공통 대상 `.worktrees/member-reactions/node_modules`는 보존했다. 제거 전 정확한 링크 대상과 복원 정보를 저장했다.
- 전역 검사기 `/Users/admin/.codex/hooks/task-finish/gate.py`를 원본 백업 후 적용했다. 최종 SHA-256은 `4c958fce582601a6411caba9f058448fa9707f5664bc8ca96285037949c40e38`이다. 훅 정의·신뢰 설정을 바꾸거나 상태 DB를 직접 편집하지 않았다.
- 원본 SHA-256은 `bfb482d404fa693490ce47232ce4c9f688acccde752738b1bdfe1df4d36f3926`이며 같은 훅 디렉터리의 `backups/`에 원본과 첫 후보를 보존했다.
- 최종 격리 회귀 검사 **26개 통과**. 정상·dirty·staged·미추적·삭제·미푸시·원격 실패·detached HEAD·검사 중 변경·소유권·종료 증거 누락·snapshot 부재·원격 캐시 범위·상대 경로 원격을 검증했다. 패치 생성/컴파일과 `git diff --check`도 통과했다.
- [최종 CI 37782048124](https://github.com/hhj4861/rescene-game/actions/runs/37782048124): 단위 **184개**, 브라우저 **433개 통과·기존 환경 전용 5개 제외**, 린트·빌드 성공. 초기 CI의 브라우저 설치 지연은 취소 후 재실행했고 최종 head 검사가 성공했다.
- PR #29 머지 결과 `0ff29bcf752bef86ff82529c6135a5e8f6eefee3`와 검증 head의 Git 트리는 `fc1c5add1804a2e82ddf066a592a0318babf2288`로 동일하다.

## 운영 반영

최종 CI 산출물을 기존 Cloudflare Pages의 **Production / main / source `0ff29bc`**로 배포했다. 배포 ID는 `8538a4c1-85dd-40ef-a760-ef72fa3a34ac`이며 [공개 게임](https://rescene-arcade.pages.dev/)과 [고정 배포](https://8538a4c1.rescene-arcade.pages.dev)에서 제공한다. 배포 후 정적 파일 **40개 모두 최신 CI 산출물과 SHA-256이 일치**했다. 게임 파일은 PR #28 운영본과도 동일하다. 이전 운영 브라우저 120개 통과 증거는 동일 파일에 대한 기존 검증이며, 이번 재배포에서 새로 120개를 실행한 것은 아니다.

## 2026-10-08 관찰 복구 결과와 당시 남은 단계

- 설치된 검사기의 정상 `reconcile_calls` 및 CLI `reconcile`로 과거 592건을 점검하고, 동시 변경 때문에 남은 기록을 재검사했다. 실제 종료 기록을 대조했으며 가짜 종료·성공 영수증을 만들지 않았다.
- 최종 조회에서 소유 미확인 파일은 **0개**다. 실행 중인 조회 명령 자체를 제외하면 과거 미해결 기록은 **1개**다. 이전 미리보기 서버는 정상 종료 기록으로 복구했다.
- 남은 호출 `exec-83cb2d7b-3d55-4029-92f3-1c643f77e37d`는 과거 `yt-dlp` 메타데이터 조회가 자동 승인 검토 모델의 처리 용량 부족으로 **실행되지 않은** 기록이다. 현재 검사기가 해당 호스트 실패 응답을 인식하지 못한다. 게임 배포 실패가 아니다.
- [후속 PR #30](https://github.com/hhj4861/rescene-game/pull/30), head `e69032dcb263c0070f2c068df9802b0705a5700b`에 정확한 실패 응답만 `not_started`로 분류하는 복구안을 커밋·push했다. 회귀 검사 **15개**, 실제 인증된 원본 기록의 읽기 전용 대조, [CI 37788088159](https://github.com/hhj4861/rescene-game/actions/runs/37788088159)가 통과했다. 실제 상태 복구·머지·전역 설치는 아직 하지 않았다.
- 다음 단계: 해당 PR에 대한 명시적 사용자 승인 후 PR #30 머지·설치·정상 reconcile. 승인 전에는 자동 완료 기록까지 모두 해결됐다고 보고하지 않는다.

## 증거 위치

사용자 iCloud 작업 루트 `rescene-game/task-finish-containers-20261008/`의 `tests-final.log`, `container-probe.json`, `approved-link-cleanup.json`, `ci-watch.log`, `site/`, `wrangler.log`, `deployments-after-merge.txt`, `production-assets-after-deploy.json`, `capacity-readonly-proof.json`에 보관한다. 코드와 Git은 로컬 프로젝트 및 해당 작업 worktree에 유지한다.

## 후속 복구 완료 — 2026-10-09

사용자 승인 후 PR #30을 머지·설치하고 정상 reconcile을 실행했다. 위의 과거 미해결 호출 한 건은 원본 호스트 증거에 따른 `not_started` / `exit_code: null`로 복구됐다. 과거 미해결 호출·소유 미확인 파일은 0개이며 승인 대기 단계는 종료됐다. 운영도 source `4cd3806`, 배포 `c3f0925f-3bef-4f93-94c4-678698030567`로 갱신하고 공개 파일 40개 일치를 검증했다. [상세 적용·검증 결과](20261008-task-finish-review-capacity.md).
