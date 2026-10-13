# 모바일 펌프 시작 복구 — 2026-10-05

- 목표/담당: 현재 Codex 단독, workers/Claude OFF. 모바일에서 게임 화면이 열려도 음악·화살표가 멈추는 증상 수정.
- 기준: main `f4e6b94`, worktree `pump-mobile`, branch `fix/pump-mobile-playback-20261005`.
- 흐름: 곡 선택 → YouTube iframe 준비/재생 → 실제 미디어 시계 → 노트/점수 진행. 자체 서버·DB·인증 환경변수 없음.
- 재현: 운영 실제 YouTube LOVE ATTACK은 모바일 Chromium에서 재생됐으나 iPhone WebKit 에뮬레이션에서 자동 재생 차단, 영상 0초/게임 60초 정지. 콘솔 오류 없음. `live-probe.json`에 기록.
- 원인/범위: 비동기 플레이어 준비 뒤 유음 자동 재생 차단. 안내가 아래쪽에 있고 재시도 때 이미 준비된 iframe을 파기해 다시 비동기 재생 시도. 준비된 플레이어 재사용 및 영상 옆 직접 재생/상태 안내로 복구한다.
- 완료 기준: 차단/재시도/이어하기 회귀 테스트, 실제 WebKit 음악과 노트 진행, 관련 Liv/펌프 회귀, 단위·lint·build 후 본인 변경 커밋/정상 push/PR. 머지는 별도 승인.
- 증거 폴더: 공용 iCloud `rescene-game/pump-mobile-20261005/`.
- 현재: 수정·로컬 검증 완료. 커밋/정상 push 및 PR 준비. 운영에는 아직 미반영.

- 회귀 근거: 기존 운영 빌드에서 차단 후 다시 켜기 테스트 실패(계속 ▶ 안내, 새 iframe 생성). 첫 수정의 공용 안내가 리브 작은 화면의 발판을 밀어내는 회귀를 발견해 안내 UI는 곡 지정 카드(펌프)에만 추가하도록 범위를 제한했다.

- 최종 빌드 첫 검사: 77개 통과, 리브 Pinball 데스크톱 1개가 홈 카드 시작 클릭에서 시간 초과(플레이어 생성 전, trace `call@93`). 펌프 및 리브 작은 화면 회귀는 통과. 기존 가상 시계/카드 스크롤의 일시적 입력 대기로 의심하며 같은 최종 빌드에서 해당 항목만 재검증한다.

## 최종 검증

- 단위 121개, lint, 최종 정적 빌드, diff 검사 통과.
- 관련 브라우저 78개: 최종 빌드 77개 통과 + 위 홈 클릭 시간 초과 1개 동일 빌드 재실행 통과. Chromium 데스크톱/모바일·WebKit 모바일, 차단 후 재시도·직접 터치·동일 iframe 유지·저장/복구·리브 화면 포함.
- 실제 YouTube LOVE ATTACK / iPhone WebKit 에뮬레이션: 차단 상태(영상 0초/게임 60초) → `음악 시작` 터치 → 실제 영상 약 3.76초, paused=false/muted=false/volume>0, 게임 57초 및 노트 진행 확인. 일시정지 중 시계 동결, 이어하기 진행, 저장 존재, 오락실 이탈 시 플레이어 제거 통과(`live-final.json`, `live-final-playing.png`).
- 검증 스크립트의 첫 저장 조회는 잘못된 키를 사용해 false였으며, 실제 `rescene.arcade.journey.v1`로 수정 후 저장 진행값을 assert해 통과했다. 실제 물리 iPhone 검증이나 5곡 전 구간 청감 검수는 아니다.
- [YouTube 공식 API 문서](https://developers.google.com/youtube/iframe_api_reference#onAutoplayBlocked)의 모바일/브라우저 유음 자동 재생 차단 처리와 일치하며 제한을 우회하지 않고 사용자 재생 탭을 받는다.
- 다음: PR 명시 승인 후 머지·운영 배포.

## 최신 main 통합 — 2026-10-13

- 기준 main 947f8b1, 기존 PR #26 head 4b03990. Codex 단독, workers/Claude OFF.
- 목표: 최신 모바일 영상 접기·설정 그룹·게이지와 함께 자동재생 차단 복구를 보존한다. 준비된 iframe은 재사용하고 실제 오류 때만 재생성한다.
- 디자인: Jua/Noto Sans KR, 잉크 #234454·민트 #92bfb3·종이 #fff9e9·노랑 #f5d77e 유지. [영상 → 상태/음악 시작] 한 줄, 44px 버튼, 리브 배치 유지.
- 검토: 차단될 때 기존 영상 펼침 유지, 음악 시작 버튼은 펌프 카드에 한정해 리브 게임 영역을 밀지 않는다.
- 검증 계획: 최신 운영 빌드 재현 → 차단 후 버튼·터치·키보드·미리듣기·오류 복구·저장 회귀, 단위·린트·빌드, PR 정상 push. 머지/운영은 별도 승인.
- 산출물: iCloud 작업 루트 rescene-game/pump-mobile-refresh-20261013/.

- 최신 운영 빌드 재현: 모바일 WebKit에서 재시도 뒤 계속 ‘영상의 ▶ 버튼’ 안내, 음악 시작 기대 실패. baseline.log/trace 보존.

### 최신 통합 검증 결과

- main 947f8b1과 충돌한 app/pump-video/style만 최신 UI 기준으로 정리했다. 최종 main 대비 변경은 기존 PR 범위 5개 파일뿐이다.
- 단위 213개, lint/build/diff check 통과. 관련 E2E 131개 통과·PC 모바일 탭 1개 조건부 생략(4.0분). 펌프 차단 후 동일 iframe 복구, 터치·Enter 미리듣기, 오류 난 플레이어 재생성/위치 보존, 모바일 접기·안내·리브 회귀 포함.
- 실제 YouTube LOVE ATTACK / iPhone WebKit 에뮬레이션: 차단 시 60초 정지 → 음악 시작 탭 → 동일 iframe에서 실제 영상 1.10초/게임 59초, paused=false·muted=false·volume>0. 정지/이어하기·저장·오락실 이탈 검증 통과. 물리 기기 청음과 다섯 곡 전 구간 박자 검수는 포함하지 않는다.
- 실제 영상 재생 화면과 차단 상태 모바일 버튼 캡처를 시각 확인했다. 기존 게임/설정 배치와 44px 버튼 유지.
- 검증 빌드 app-Xy1xgYBf.js / app-JWkNGb3f.css. 근거: unit.log, build.log, browser.log/browser/, live.log, live-final.json, live-final-playing.png.
- 현재: PR #26 최신 통합·로컬 검증 완료. 작업 브랜치에 커밋·push하며 원격 전체 CI 확인 후 별도 머지 승인을 받는다. main·운영 미반영.
