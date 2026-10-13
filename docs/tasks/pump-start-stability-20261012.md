# 펌프 시작 안정성 조사 · 2026-10-12

- 목표/담당: Codex 단독. PR #35 운영 검증의 모바일 WebKit 시작 실패 1건을 조사하고 재현되는 원인만 수정한다.
- 기준: main 55f0ff5 (운영 코드 13234ea), 브랜치 fix/pump-start-stability-20261012.
- 범위: 곡·난이도 선택 뒤 시작 입력, 지연 웹폰트와 레이아웃 변화. CI 인증은 별도 범위.
- 완료 기준: 실패 근거 분석, 제어된 재현/대조, 수정 시 관련 브라우저 회귀·린트·빌드, 본인 변경 커밋·push·PR. 새 PR 머지/배포는 별도 승인.
- 근거: pr35-deploy-20261012/public-browser의 WebKit 추적. 시작 클릭 48922–49145ms 중 다수 웹폰트 응답이 도착했고 버튼 안정성 대기가 한 번 재시도됨. 곡 선택 화면 유지, JS 오류 없음. 후속 지연 폰트 실험에서 위치 변화로 입력 대상이 달라지는 것을 재현했다.
- 현재: PR #36 커밋·push·CI 완료 후 사용자 승인으로 2026-10-13 main 머지·운영 배포 완료. 운영 파일 41개 일치, 공개 E2E 110개 통과·1개 조건부 생략. [배포 기록](../deployment/arcade-pages.md).
- 산출물: iCloud 작업 루트 rescene-game/pump-start-stability-20261012/.

## 재현과 수정

- 공개 운영에서 실제 웹폰트 로딩을 pointerdown 이후로 지연: 3/3 시작 실패. 버튼이 54~56px 이동하고 pointerup은 다른 난이도 버튼, click은 상위 DIV에 전달됨. 로딩 완료 대조군 3/3 정상.
- 실제 Noto Sans KR 119번 subset(16,568B, OFL 포함)을 테스트 fixture로 고정. 수정 전 WebKit 390px 회귀가 36.5625px 이동으로 실패함을 확인. Google/YouTube 요청은 테스트 대역이며 외부 폰트 속도에 의존하지 않는다.
- 곡 선택 화면의 본문·제목·시작 버튼 줄 높이를 명시. 난이도는 PC 4열, 모바일 2×2로 고정해 글꼴 변경으로 버튼 높이/행 구성이 바뀌지 않게 함. 기존 폰트와 색상·선택 기능·키보드 시작 유지.
- 후보 CSS를 공개 브라우저에만 주입한 대조: 지연 3/3, 사전 로딩 3/3 정상. 세로 이동은 기존 눌림 효과 2px뿐.
- 검증: 단위 213개, 린트·빌드 통과. 관련 E2E 102개 통과(2.6분), 701/768px 경계 추가 6개 통과, 모바일 탭 2개 통과/PC 1개 조건부 생략. 동일 CSS 최종본에서 총 110개 통과. 새 회귀는 320/390/700/701/768/1280px 입력 유지, Enter/Space, 모바일 탭을 확인한다.
- 모바일 WebKit 320px의 2×2, PC Chromium 1280px의 4열 캡처 시각 확인. 테스트 폰트는 tests/fixtures에만 있으며 배포 빌드에 포함되지 않는다.
- 최종 빌드: app-CaUjSiZ1.js / app-B9W7Z6fQ.css. 게임 모델·음악 재생·클릭 처리 코드는 변경하지 않았다.
- 근거 로그: investigation.json(실제 폰트 6회), fixture-baseline.json(고정 폰트 6회), candidate.json(후보 6회), baseline-browser.log, unit.log, build.log, final-browser.log, boundary-browser.log, touch-browser.log. 원래 실패 추적과 새 실패 추적을 보존했다.

## 통합·운영 확인 — 2026-10-13

- CI 38254619206: 단위 213개, E2E 630개 통과·6개 조건부 생략, 린트·빌드 통과.
- 승인된 PR #36 머지 소스 d43ad8a와 검증 head 0852512의 Git 트리 동일. CI 빌드 그대로 Pages Production/main 배포 02d68ef3.
- 운영 관련 E2E 110개 통과·PC 모바일 탭 1개 생략(2.7분), 공개 파일 41개 모두 SHA-256 일치. 게임 코드 추가 변경 없음.
- 운영 증적: iCloud 작업 루트 rescene-game/pr36-deploy-20261013/.
