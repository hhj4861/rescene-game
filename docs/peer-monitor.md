# Claude 상시 수신기

`tools/peer-monitor/monitor.mjs`는 이 프로젝트의 공식 `orch.mjs peer-inbox --for codex-lead --json`을 10초마다 조회한다. 새 ask/reply를 로컬에 저장하고 macOS 알림을 요청한다. 대화 턴 종료와 독립적으로 실행되며 로그인 시 실행, 비정상 종료 후 launchd 재시작을 사용한다. 잠자기·로그아웃 동안에는 동작하지 않으며 복귀 후 미확인 메시지를 다시 확인한다.

설치: `node tools/peer-monitor/install.mjs /Users/admin/workSpace/rescene-game`

- 수신함: http://127.0.0.1:4318
- 설치 파일/수신 상태: `~/Library/Application Support/RescenePeerReceiver/`
- 로그인 설정: `~/Library/LaunchAgents/local.rescene.claude-receiver.plist`
- 상태: `launchctl print gui/$(id -u)/local.rescene.claude-receiver`
- 중지: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/local.rescene.claude-receiver.plist`
- 다음 로그인 자동 실행까지 해제: 중지 후 위 프로젝트 전용 plist만 제거한다.

메시지 내용은 코드로 실행하지 않으며 수신기가 peer-ack/reply를 대신 보내지 않는다. 감지·보관과 리드의 실제 읽음 확인은 다르다. 알림 명령 성공도 macOS 알림 허용/집중 모드에 따른 화면 표시를 보증하지 않는다. 수신함은 localhost 전용이며 외부 사이트의 Origin/Host 요청을 거부한다.

**이 수신기는 대기 중인 Codex 대화를 자동으로 재개하지 않는다.** 현재 등록된 UserPromptSubmit의 peer-inbox-brief는 다음 사용자 입력 시 미확인 메시지를 컨텍스트에 제공하는 경로다. 상시 수신기는 그 사이 메시지를 감지·보관·알림 처리한다. 자동 작업 실행이나 새 Codex 세션 생성은 하지 않는다.

최대 최근 2,000개의 수신 기록을 로컬 보관한다. 원본 메시지는 공식 우편함에 남는다. 오래된 미확인 메시지가 이 한도를 넘는 대량 적체에서는 재알림될 수 있다. 프로그램 파일은 설치 위치로 복사하므로 임시 구현 worktree의 삭제와 무관하게 실행된다. Node 설치 경로가 변경되면 설치 명령을 다시 실행한다.

## 검증 (2026-09-20)

- 단위 시험 3개 및 변경 범위 ESLint 통과: 재시작 중복 방지, 조회 실패 후 복구, 다른 채널 거부, 메시지를 실행하지 않고 데이터로 보존.
- 공식 Claude 회신 `20260920043531445-36d8ab`: 발신 04:35:31.445 UTC, 실행 중 수신기가 04:35:34.860 UTC에 자동 감지·저장. 최초 설치 시 기존 B2 요청과 첫 테스트 회신도 수신했다.
- macOS 알림 명령 제출 성공. 알림 화면 표시 여부는 미확인이다.
- 실제 수신함 브라우저에서 두 테스트 회신과 B2 요청을 표시했고 콘솔 오류0, 외부 Origin 요청403을 확인했다.
- LaunchAgent의 실행 상태를 확인하고 수신기만 SIGTERM 종료한 뒤 자동 재시작과 기존 수신 기록 보존을 확인했다. 설치된 서비스는 작업 완료 후에도 켜 둔다.
