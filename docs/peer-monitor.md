# Claude 상시 수신기

`tools/peer-monitor/monitor.mjs`는 이 프로젝트의 공식 `orch.mjs peer-inbox --for codex-lead --json`을 10초마다 조회한다. 새 ask/reply를 로컬에 저장하고 macOS 알림을 요청한다. 대화 턴 종료와 독립적으로 실행되며 로그인 시 실행, 비정상 종료 후 launchd 재시작을 사용한다. 잠자기·로그아웃 동안에는 동작하지 않으며 복귀 후 미확인 메시지를 다시 확인한다.

설치: `node tools/peer-monitor/install.mjs /Users/admin/workSpace/rescene-game`

- 수신함: http://127.0.0.1:4318
- 설치 파일/수신 상태: `~/Library/Application Support/RescenePeerReceiver/`
- 로그인 설정: `~/Library/LaunchAgents/local.rescene.claude-receiver.plist`
- 상태: `launchctl print gui/$(id -u)/local.rescene.claude-receiver`
- 중지: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/local.rescene.claude-receiver.plist`
- 다음 로그인 자동 실행까지 해제: 중지 후 위 프로젝트 전용 plist만 제거한다.

메시지 내용은 셸 코드로 실행하지 않는다. 자동조치가 활성화되면 독립 Codex 작업이 내용을 판단하고, 조정기가 실제 실행 결과에 따라 공식 peer-ack/reply를 보낸다. 감지·작업 시작·검증·회신 상태를 따로 보관한다. 알림 명령 성공도 macOS 알림 허용/집중 모드에 따른 화면 표시를 보증하지 않는다. 수신함은 localhost 전용이며 외부 사이트의 Origin/Host 요청을 거부한다.

**기존 앱 대화를 재개하는 대신 전용 로컬 Codex 작업을 실행한다.** 현재 사용자의 명시적 자동조치 지시에 따라 동작하며 engine-exchange 전역 ON/OFF는 변경하지 않는다. 다음 설치 명령으로 활성화한다. 마지막에 트랙을 나열하면 해당 트랙만 실행하며, 생략하면 `survival-` 트랙을 처리한다.

```sh
node tools/peer-monitor/install.mjs /Users/admin/workSpace/rescene-game /Users/admin/workSpace/rescene-game-auto-actions
```

공식 수신함 → 영속 순차 큐 → `codex-call.sh impl`(기존 workspace-write 샌드박스/훅) → 고정 검증 → 자기 파일만 커밋 → 별도 Codex 고정 커밋 검토 → 설정 upstream 정상 push → 공식 회신 순서다. 단순 확인 메시지는 검토 뒤 ack만 한다. 검증 명령은 모델이 돌려준 셸 문자열을 실행하지 않고 조정기에 정해진 시험만 사용한다. 코드 변경은 생존 시험 전체·ESLint·브라우저 fixture를 통과해야 한다. 이 명령들도 Codex의 `:workspace`를 상속한 일회성 샌드박스로 실행한다. 프록시를 실제 활성화하고 목적지는 127.0.0.1·localhost만 허용하며 로컬 시험 서버 binding을 켠다. 외부 네트워크와 작업 공간 밖 쓰기는 금지한다. Chromium은 OS 샌드박스를 유지한 단일 프로세스로 실행한다. 전역 권한 설정 파일은 변경하지 않는다. 문서만 변경하면 diff 검증과 독립 고정 커밋 검토를 한다. 독립 검토에는 구현 전에 Git 객체로 고정한 원문 요청, 변경 전 architecture 문서, 결과 노트를 함께 전달한다. 구현자의 결과 노트만으로 원래 요구를 대체하지 않는다.

샌드박스 워커는 전역 완료 검증 DB에 쓸 수 없으므로 리드 조정기가 실제 `thread.started` ID를 읽고 공식 `gate.py track --session`으로 변경 전 등록을 대행한다. 워커는 등록 성공과 자신의 ID, 경로를 확인한 뒤 수정한다. 기존 claim 안의 추적 파일과 해당 결과 노트만 등록하며 새 경로가 필요하면 보류한다. 등록 실패를 무시하거나 완료 훅을 끄지 않는다. 미변경 등록은 공식 cancel-empty-track으로 검증 후 정리하고 push 뒤 reconcile한다.

전용 브랜치는 `worktree-codex-survival-implementation-20260919`, 소유 범위는 기존 `survival-implementation-20260919` claim의 게임 코드·시험·implementation 문서뿐이다. 공유 checkout, 자동조치기, 전역 설정, 인증, PR 머지, 배포는 자동조치 범위에 없다. 다른 세션은 이 전용 슬롯을 동시에 수정하지 않는다. 한 모델 작업은 최대 570초이며 큰 작업은 분할 제안이나 미완료 사유를 회신한다.

`actions.json`과 수신함 화면에서 queued/running/validating/committing/reviewing/pushing/done/blocked, 실제 Codex 스레드, 검증, 커밋을 확인한다. 조회는 실행 중에도 계속된다. 실패·충돌·재시작 중단은 blocked로 보존하고 뒤 작업을 멈춘다. 재실행 전 실제 프로세스·미완료 변경·로컬 커밋을 사람이 점검해야 한다. 회신 실패는 실행을 되풀이하지 않고 회신만 재시도한다. 기존 실행 중에는 재설치를 거부한다. 전용 슬롯에서 커밋된 변경은 작업 브랜치에만 존재하며 기준 브랜치와 현재 게임 서비스는 자동으로 바뀌지 않는다.

최대 최근 2,000개의 수신 기록을 로컬 보관한다. 원본 메시지는 공식 우편함에 남는다. 오래된 미확인 메시지가 이 한도를 넘는 대량 적체에서는 재알림될 수 있다. 기본 저장소 경로는 Git common-dir에서 영구 main checkout으로 해석한다. 프로그램 파일은 설치 위치로 복사하므로 임시 구현 worktree의 삭제와 무관하게 실행된다. Node 설치 경로가 변경되면 설치 명령을 다시 실행한다.

## 검증 (2026-09-20)

- 단위 시험 3개 및 변경 범위 ESLint 통과: 재시작 중복 방지, 조회 실패 후 복구, 다른 채널 거부, 메시지를 실행하지 않고 데이터로 보존.
- 공식 Claude 회신 `20260920043531445-36d8ab`: 발신 04:35:31.445 UTC, 실행 중 수신기가 04:35:34.860 UTC에 자동 감지·저장. 최초 설치 시 기존 B2 요청과 첫 테스트 회신도 수신했다.
- macOS 알림 명령 제출 성공. 알림 화면 표시 여부는 미확인이다.
- 실제 수신함 브라우저에서 두 테스트 회신과 B2 요청을 표시했고 콘솔 오류0, 외부 Origin 요청403을 확인했다.
- LaunchAgent의 실행 상태를 확인하고 수신기만 SIGTERM 종료한 뒤 자동 재시작과 기존 수신 기록 보존을 확인했다. 설치된 서비스는 작업 완료 후에도 켜 둔다.

검증용 일회성 권한 프로필의 필드는 [공식 Codex 설정 스키마](https://learn.chatgpt.com/docs/config-schema.json)와 설치 CLI 도움말로 확인했다.
