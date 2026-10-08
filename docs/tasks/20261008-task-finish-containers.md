# 완료 검사기의 중첩 worktree 관찰 복구

- 목표: 배포 완료 이후 남은 legacy `unsupported` 디렉터리 관찰 오류를 근거 기반으로 처리한다.
- 범위/담당: 현재 Codex 세션. 복구 패치 생성기와 격리 회귀 테스트만 구현. 게임·운영 배포 변경 없음.
- 기준: main `eb38f92`. 별도 `fix/task-finish-worktree-containers-20261008` worktree.
- 완료 기준: 정상/실패 사례 검증, 본인 파일 커밋·push, 검토 가능한 PR. 전역 훅 설치와 실제 reconcile 성공은 별도 단계로 보고.
- 원인: `dirty()`가 중첩 worktree를 `unsupported` 디렉터리로 반환하고 `reconcile_calls()`가 파일 비교 단계에서 중단한다.
- 설계: 기존 snapshot에 이미 있던 등록 linked worktree만 허용. Git 공통 디렉터리, 경로, clean 상태(미추적 포함), HEAD/브랜치/upstream 및 실제 원격 포함 여부를 검사하고 재확인한다. 통과 근거는 기존 종료 영수증에 추가하며 파일 소유권·커밋·원격 검사와 실패 기록은 유지한다.
- 비대상: 임의 디렉터리, 별도 중첩 저장소, symlink, 새로 생긴 디렉터리, dirty/unpushed 작업 폴더, 증거 없는 도구 종료.
- 성능: 원격 근거를 호출 간 캐시하지 않는다. 과거 호출이 많으면 reconcile 시간이 길 수 있다.
- 현재: 검토용 구현과 회귀 검증 완료. 설치 스크립트는 제공하지 않으며 전역 훅/신뢰 설정/상태 DB는 변경하지 않음.
- 다음: 검토용 PR을 준비한다. 사용자 승인 전 PR 머지·전역 훅 설치를 하지 않는다. 실제 reconcile은 아직 성공하지 않았으며 완료로 보고하지 않는다.

- 첫 검사: 21개 중 12개 실패. iCloud의 NFD 한글 부모 경로와 Git이 기록한 NFC linked worktree 경로가 달라 기존 `registered_worktrees()`가 빈 목록을 반환함. 실제 영문 프로젝트 경로의 복구와 별개인 fixture 문제로 확인했으며, 격리 저장소에만 `core.precomposeUnicode=false`를 설정해 동일 경로 표기를 보장한다.

## 검증과 남은 조건

- 격리 회귀 테스트 21개 통과: 정상 published worktree, 수정/staged/미추적/삭제/미푸시/원격 실패, detached HEAD, 검사 중 변경, 소유 파일 보존, 종료 증거 누락, 상위 저장소 소유 미확인 변경 보존 등.
- 패치 생성/컴파일 및 `git diff --check` 통과.
- 기준 전역 훅 SHA-256: `bfb482d404fa693490ce47232ce4c9f688acccde752738b1bdfe1df4d36f3926`.
- 후보 SHA-256: `31c9d1127c480f53f02f05fa99ed16260fed57c2387916d6752feec851c6226f`.
- 실제 기존 worktree 22개 읽기 전용 점검: 18개는 clean 상태와 실제 upstream 반영 확인. 4개는 미추적 `node_modules` symlink 때문에 의도적으로 거부. 링크나 작업 폴더를 삭제/이동하지 않음.
- 해당 4개: `.worktrees/liv-difficulty`, `.worktrees/may-bubble-difficulty`, `.worktrees/pump-rescene-songs`, `.worktrees/pump-score-only`. 모두 `.worktrees/member-reactions/node_modules`를 가리킨다.
- 이 후보만 설치해도 4개 폴더의 관찰은 계속 막힌다. 해당 링크의 기존 소유·사용 상태 확인과 정상 파일 단위 관찰 처리가 선행돼야 한다. 자동 무시/성공 처리로 해결하지 않는다.
- 로그/증거: 사용자 iCloud 작업 루트의 `rescene-game/task-finish-containers-20261008/tests.log`, `container-probe.json`. Git/검사 상태 DB에는 복구 성공을 기록하지 않았다.
- 게임은 PR #28과 운영 Pages에 이미 반영됨. 이 작업은 게임 코드·배포를 변경하지 않는다.
