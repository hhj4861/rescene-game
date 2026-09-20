# Claude 상시 수신과 Codex 작업 전달

수신기는 이 프로젝트의 공식 `orch.mjs peer-inbox --for codex-lead --json`을 10초마다 조회한다. Claude의 미확인 `survival-*` ask/reply를 저장하고 공식 `codex queue` 명령으로 지정한 기존 Codex 대화에 전달한다. 전달 메시지는 내용을 확인하고 현재 사용자 승인 범위에서 검토·수정·검증·회신까지 처리하도록 요청한다.

수신기가 임의 셸을 실행하거나 직접 Git 커밋·push·PR 머지·배포를 하지 않는다. 실제 조치는 원래 Codex 대화의 도구 승인과 완료 훅 안에서 처리한다. 원문은 동료 자료이며 새 사용자 권한으로 취급하지 않는다. 공식 우편함에서 이미 처리된 ID는 반복 작업하지 않도록 지시한다.

## 설치와 상태

```sh
node tools/peer-monitor/install.mjs /Users/admin/workSpace/rescene-game --session <실제-Codex-thread-UUID>
```

뒤에 트랙을 나열하면 해당 트랙만 전달한다. 생략하면 이 프로젝트의 `survival-*`를 전달한다. 저장소 경로는 Git common-dir의 영구 main checkout으로 해석하며 프로그램을 설치 위치로 복사한다.

- 화면: http://127.0.0.1:4318
- 설치/수신/전달 상태: `~/Library/Application Support/RescenePeerReceiver/`
- 로그인 설정: `~/Library/LaunchAgents/local.rescene.claude-receiver.plist`
- 상태 확인: `launchctl print gui/$(id -u)/local.rescene.claude-receiver`
- 중지: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/local.rescene.claude-receiver.plist`

로그인 시 실행하고 비정상 종료 뒤 launchd가 재시작한다. 잠자기·로그아웃 중에는 동작하지 않는다. Node/Codex 경로가 바뀌면 재설치한다. 연결 대화를 바꾸려면 해당 대화의 실제 ID로 재설치한다. 기존 전달 기록은 유지하므로 대화 변경만으로 과거 메시지를 중복 전달하지 않는다.

## 실제 처리와 전달의 구분

`session-delivery.json`과 화면에 다음을 구분한다.

- `pendingDelivery`: 전달 대기
- `dispatching`: 공식 CLI 호출 중
- `awaitingAgent`: Codex 대기열 등록 성공. 실제 읽음·실행·완료는 아직 증명하지 않음
- `peerResolved`: 공식 미확인 우편함에서 사라짐. 누가 어떤 조치를 했는지는 공식 회신을 확인해야 함
- `deliveryUncertain`: CLI 오류/전달 중 재시작. 중복 실행을 막기 위해 무조건 재전송하지 않음

**`codex queue` 성공은 대기열 등록 증거다. 현재 앱이 해당 대화를 자동 재개해 끝까지 조치했다는 증거와 다르다.** 실제 자동 재개와 회신은 후속 대화/공식 peer 기록으로 별도 확인해야 한다. 수신기가 자동 ACK를 보내지 않는다. 알림 명령 성공 또한 macOS 알림 화면 표시를 보증하지 않는다.

수신 화면은 localhost 전용이며 외부 Host/Origin을 거부하고 메시지를 textContent로 표시한다. 메시지 내용은 셸 문자열에 삽입하지 않고 CLI 인자로 전달한다. 수신 기록은 최근 2,000개, 전달 중복 방지 기록은 별도로 보존한다.

## 검증 기록 — 2026-09-20

- 수신·전달 단위시험 9개 및 ESLint 통과: 재시작 중복 방지, 조회 실패 복구, 알림 재시도, 직렬 전달, 불확실한 전달 보존, 채널/트랙 필터, 화면 JavaScript 구문.
- 기존 실제 Claude 회신 `20260920043531445-36d8ab`의 자동 감지·저장, 수신 화면 표시, 외부 Origin 403, launchd 재시작 후 기록 보존을 확인했다.
- 공식 `codex queue`가 현재 대화에 시험 메시지 `01a0be22-e61c-7d43-8f56-62aff280c8b0`를 등록했다. 이 기록만으로 자동 조치 완료라고 하지 않는다.
- 별도 CLI 워커가 직접 수정하는 초기 실험은 전역 완료 훅의 사전 도구 기록/DB 접근 문제로 끝까지 통과하지 못했다. 해당 실행기와 검증 부트스트랩은 최종 구현에서 제거했다. 실패 기록은 보존하며 최종 방식은 기존 Codex 대화의 공식 대기열 전달이다.
