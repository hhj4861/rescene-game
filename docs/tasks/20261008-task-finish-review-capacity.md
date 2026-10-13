# 자동 승인 검토 용량 부족의 미실행 기록 호환성

- 목표: 예전 yt-dlp 길이 조회가 호스트 승인 검토 용량 부족으로 실행되지 않은 한 건을 정상 증거로 인식한다.
- 범위/담당: 현재 Codex. 별도 worktree의 검토용 패치 생성기와 회귀 검사. PR #29 운영 반영은 이미 완료.
- 기준: main `0ff29bc`, 현재 검사기 `4c958fce582601a6411caba9f058448fa9707f5664bc8ca96285037949c40e38`.
- 설계: 기존 v19 첫 단계 바인딩, 원본 호출/턴/소스 해시, 유일한 준비 기록, 정확한 호스트 오류 문구를 모두 요구한다. 실제 실행 이벤트가 있으면 거부하며 결과는 `not_started`/`exit_code: null`로 보존한다.
- 완료 기준: 회귀 검사와 원본 호스트 기록의 읽기 전용 대조, 본인 변경 커밋·push·PR. 새 PR 머지는 별도 명시적 승인 후 진행한다.
- 현재: 사용자 승인 후 PR #30 머지, 실제 검사기 적용, 과거 기록 정상 복구와 운영 배포를 완료했다. 신뢰 설정·원본 transcript를 바꾸거나 상태 DB를 직접 편집하지 않았다.

## 승인 후 완료 — 2026-10-09

- 사용자의 “머지하고 배포 해줘” 승인에 따라 [PR #30](https://github.com/hhj4861/rescene-game/pull/30)을 머지했다. head `e69032dcb263c0070f2c068df9802b0705a5700b`, 머지 `4cd380615b9a08a346644b2677fd3ef5d6f52697`이다. head와 머지 결과의 차이는 이전 배포 기록 문서 두 개뿐이며 배포 소스는 동일하다.
- 설치 직전 회귀 검사 **15개를 재실행해 통과**했다. [전체 CI 37788088159](https://github.com/hhj4861/rescene-game/actions/runs/37788088159)도 성공했다.
- 원래 설치 해시 `4c958fce582601a6411caba9f058448fa9707f5664bc8ca96285037949c40e38`를 재확인한 뒤 백업·원자적 교체했다. 실제 `/Users/admin/.codex/hooks/task-finish/gate.py`의 새 SHA-256은 `1e13e36f6e4902e68f6ca365d02a10b0b58c7e5e5cd5f53bf95587683710dcf5`다. 백업은 같은 디렉터리 `backups/gate-before-review-capacity-4c958fce582601a6411caba9f058448fa9707f5664bc8ca96285037949c40e38.py`다.
- 설치된 CLI의 정상 `reconcile`로 과거 호출 `exec-83cb2d7b-3d55-4029-92f3-1c643f77e37d`를 복구했다. 실제 저장된 종료 근거는 `batch-dispatch-failure`, **`not_started` / `exit_code: null`**이다. 실행 성공으로 바꾸지 않았다. 과거 미해결 호출과 소유 미확인 파일은 모두 0개이며, 조회 당시 현재 실행 중인 reconcile 자체만 남아 있었다. 이전 승인 대기 hold도 새 사용자 요청으로 정상 해제됐다.
- 해당 CI 산출물을 기존 Pages에 배포했다. **Production / main / source `4cd3806`**, 배포 ID `c3f0925f-3bef-4f93-94c4-678698030567`. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://c3f0925f.rescene-arcade.pages.dev).
- 공개 파일 **40개 모두 CI 산출물과 SHA-256 일치**. 게임 파일은 이전 검증 배포와도 동일하다. 이번에는 CI 성공과 배포 후 전체 파일 대조를 확인했으며, 별도 공개 브라우저 검사를 새로 실행한 것은 아니다.
- 배포 증거는 사용자 iCloud 작업 루트 `rescene-game/review-capacity-deploy-20261009/`의 `site/`, `wrangler.log`, `deployments.txt`, `production-assets.json`에 보관한다. 인증·도메인·자동 배포·훅 신뢰 설정 변경은 없다.
