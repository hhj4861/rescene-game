# 기본 AI: 공용 LiteLLM 연결

2026-09-28. 게임은 계정 연결 없이 기본 Gemini를 사용한다. 개인 Claude/Codex 연결 화면은 이번 범위에 포함하지 않는다. 기존 CLI 시즌은 해당 런타임으로 계속 플레이하며, 새 시즌부터 기본 AI를 선택한다. 승인된 장면 이미지·레이아웃·CSS는 변경하지 않는다.

## 실제 연결과 저장 위치

| 항목 | 설정 |
|---|---|
| 공용 서버 | GCP `replay-live-508202` / `shared-ai` / `us-central1-a` |
| 공개 추론 주소 | `https://shared-ai-d5cy7m6i7q-uc.a.run.app/llm/v1` |
| 게임 팀 / 키 별칭 | `rescene-game` / `rescene-game-server` |
| 허용 모델 별칭 | `festa-travel` 한 개 |
| 서버에서 확인한 연결 모델 | `gemini/gemini-3.5-flash-lite` |
| 요청 제한 | 게임 팀·키 각각 RPM 30, 게임 실행 동시 요청 최대 2 |
| 서버의 게임 키 파일 | `/opt/shared-ai/repo/services/ai-gateway/.runtime/rescene-game.env` (0600) |
| 로컬 게임 설정 | `~/Library/Application Support/ResceneSurvival/litellm.json` (0600, Git 밖) |

기존에 등록된 Gemini 경로를 재사용한다. `festa-travel`은 서버의 모델 별칭이며, **Festa 앱 키나 사용자 대화를 공유하는 것이 아니다.** 게임 키·팀·집계는 따로 생성했다. 서버의 모델 경로·기존 앱 키·컨테이너·Dify는 변경하지 않았다. 별칭을 독립 운영해야 할 때는 공용 서버에 게임 모델 경로를 추가하고 새 시즌 설정을 변경한다.

사용자가 Google AI Studio의 **Free tier** 표시를 확인했다. LiteLLM 자체 이용료와 공급자 모델 과금은 구분하며, 이번 작업에서는 유료 전환·달러 예산 설정을 하지 않았다. 공급자 무료 쿼터는 같은 프로젝트의 다른 앱과 공유할 수 있다. 게임 키의 RPM 제한이 공급자별 무료 한도를 늘리지는 않는다. 무료 등급 여부를 애플리케이션이 조회·보장하는 구현은 아니다. 공급자 등급을 나중에 바꾸면 해당 요금이 적용될 수 있다.

공개 모델 목록 200, 미인증 401, 게임 키로 다른 모델(`hanmadi-chat`) 접근 403을 확인했다. 기존 Festa 키로 프로젝트 결제 상태를 조회하는 시도는 자동 승인 검토에서 거부되어 실행하지 않았다. 대신 사용자가 무료 등급을 확인했고, 신규 게임 키만 발급·사용했다.

## 실행·설정

Node 20 이상. 서버는 `SURVIVAL_DATA_DIR/litellm.json`을 읽는다. 별도 경로는 `SURVIVAL_LITELLM_CONFIG`로 지정한다. 파일은 `baseUrl`, `apiKey`, `model` 세 필드의 JSON이며 반드시 서버 비공개 파일로 관리한다. `SURVIVAL_LITELLM_BASE_URL`, `SURVIVAL_LITELLM_API_KEY`, `SURVIVAL_LITELLM_MODEL` 환경변수로 주입할 수도 있다. 실제 키를 소스·명령줄 인자·스크린샷·로그에 넣지 않는다.

```sh
SURVIVAL_DATA_DIR="$HOME/Library/Application Support/ResceneSurvival" \
  node server/survival/server.mjs
```

신규 시즌 기본값은 `litellm`이다. 시작 화면에서 모델·계정 선택을 요구하지 않는다. 설정이 없는 환경에서는 연결 준비 안내와 비활성 시작 버튼을 보여주며, API에서도 기본 시즌 생성을 거부한다. 기존 CLI 저장은 유지하지만 연결 누락을 이유로 CLI로 자동 전환하지 않는다. 설정이 불완전하면 오류로 중단하며 다른 모델로 자동 전환하지 않는다. 기존 시즌의 provider를 바꾸거나 현재 저장 파일을 덮어쓰지 않는다. 다른 서버가 동일 저장 폴더를 사용 중이면 중복 실행을 거부한다.

키 회전은 공용 서버에서 게임 키만 새로 발급하고 비공개 설정을 교체한 뒤, 진행 중 호출이 없을 때 게임 서버를 재시작한다. 회수는 게임 키만 폐기한다. 모델 별칭 또는 배포가 변경되면 진행 중 시즌은 기존 경로 복원을 요구한다. 마스터 키와 공급자 키는 VM 밖으로 복사하지 않았다.

## 런타임 계약

- 게임 서버 → LiteLLM Chat Completions → Gemini. Dify를 경유하지 않는다.
- 서버 측 Fetch로 JSON Schema 응답을 요청하고 기존 게임 규칙으로 다시 검증한다. 멤버 ID, 연습 합계, 자료·기억 참조, 투표 계획 hash, 심사 증거 hash 검증은 유지한다.
- 공통 세마포어에서 최대 2개 호출. 요청·본문 수신까지 120초 제한, 출력 2MB 제한, 취소 지원. 공용 서버 기본 30초 대신 **게임 요청에만** `timeout: 120`을 전달한다.
- 자동 재시도·모델 대체는 하지 않는다. 실패 요청은 기존 게임의 명시적 재시도 흐름에서만 실행한다. 성공 응답은 재호출하지 않는다. 오류 본문·인증 헤더·비공개 주소를 화면에 노출하지 않는다.
- 시즌 생성 시 모델 별칭을 저장한다. 첫 성공의 응답 `model`과 `x-litellm-model-id`를 함께 고정한다. LiteLLM이 응답 `model`에 별칭을 반환하므로 배포 식별자도 비교한다. 식별자가 없거나 변경되면 거부한다. 서버 관리자가 동일 배포 ID를 강제로 재사용하거나 공급자 내부 버전을 바꾸는 것까지 증명하는 장치는 아니다.
- LiteLLM 호출은 무상태다. 게임이 멤버별로 검수한 자료·유효한 기억·현재 회의 입력만 전달한다. 별도 원격 대화 이력을 누적하지 않는다. 로컬 문맥 ID는 시즌·멤버·세대에서 분리하며 다른 멤버의 ID로 재개할 수 없다. 심사위원은 개인 기억 없이 해당 무대 증거만 받는다.
- 기존 `LocalRuntime` 인터페이스 뒤에 연결해, 향후 계정별 모델을 추가할 때 게임 규칙과 화면을 다시 만들 필요가 없도록 한다. 현재 별도 SDK 의존성을 추가하지 않았다. 게임에서 필요한 usage·배포 식별자·본문 크기 검증을 함께 처리한다.

## 검토용 실행 화면

기본 AI 전용 흐름 보완 후 작업 브랜치의 검토용 서버를 `http://127.0.0.1:4320/survival.html`에 실행했다. 저장 폴더는 `/tmp/rescene-gemini-review-20260928`이며 기존 4317 게임과 분리돼 있다. 실제 게임 키 설정을 읽지만 시작 화면 확인만으로 모델을 호출하지 않는다. 이 화면의 플레이 기록은 검토용 임시 기록이며 기존 사용자 시즌으로 자동 합쳐지지 않는다.

## 검증

- 기본 AI 전용 흐름 보완 후 Node 회귀 41개·ESLint 통과. 신규 HTTP 모의 서버 검증 6개: 구조화 출력, 인증·모델 격리, 취소·시간 초과, 리다이렉트 차단, 출력 제한, 세션·배포 고정, 재시작 후 기억·자료 철회, 비밀 미노출, 기존 저장 유지.
- 기존 승인 디자인 Chromium/WebKit·모바일·10라운드 300회 **모의 응답** 검증 통과.
- LiteLLM 기본 시작 화면에서도 Chromium/WebKit·모바일·10라운드 300회 모의 응답 검증 통과. 계정/모델 선택 없이 시작하며 모든 요청의 provider가 LiteLLM으로 유지됨을 확인했다.
- 실제 공개 HTTPS → LiteLLM → Gemini로 제안·토론·투표·수행·20팀 심사·회고 저장까지 1라운드 완료 (`learned`). 초기 30초 제한에서 2건이 408로 실패했고, 성공 응답은 보존한 채 해당 요청만 재시도했다. 총 32회 시도, 30개 논리 응답 완료. 요청별 120초 지정 후 투표 재개·공연·회고가 완료됐다. 기존 사용자 시즌과 별도 임시 저장 폴더에서 검사했다.
- 실검증 저장: `/var/folders/04/8rm5pwr52f12x6zmvdwsdcjr0000gn/T/rescene-litellm-live-mNgjyG`. 브라우저 증적: 같은 임시 루트의 `rescene-approved-ui-ai9GU4`. 임시 증적이며 운영 저장 파일이 아니다.
- 기존 4317 서버는 재시작하지 않았다. 클라우드의 게임 전용 키와 로컬 비공개 연결 설정은 적용됐고, 게임 코드의 기본 브랜치 반영·서버 전환은 PR 머지 후 진행한다.

- 추가 브라우저 검증: 계정·모델 선택 없음, 연결 미설정 시 시작 차단, 기본 API 요청도 CLI로 전환하지 않음, 기존 CLI 시즌 보존, 한도 오류 후 실패 멤버만 재시도, 모바일 시작 화면. 모의 네트워크 응답으로 확인해 추가 모델 사용량은 발생하지 않았다.
- 최종 보완본에서 10라운드 300회·Chromium/WebKit 검증과 자료 관리·회복·성장·이력의 2라운드 검증 재통과. 검토용 서버에서도 실제 설정 인식과 모바일 시작 화면을 확인했다(모델 호출 0회).

```sh
node --test tests/survival/*.test.mjs
SURVIVAL_DEPENDENCIES=/path/to/installed/project node tools/survival/verify-default-ai.mjs
SURVIVAL_DEPENDENCIES=/path/to/installed/project \
  node tools/survival/verify-approved-ui.mjs
```

참고: [LiteLLM JSON Schema](https://docs.litellm.ai/docs/completion/json_mode), [요청별 시간 제한](https://docs.litellm.ai/docs/proxy/timeout), [응답 배포 식별자](https://docs.litellm.ai/docs/proxy/logging), [Gemini 무료·유료 등급](https://ai.google.dev/gemini-api/docs/pricing).
