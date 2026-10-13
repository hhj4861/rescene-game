# 멤버별 게임팩

- 목표: 플레이어가 멤버별 게임팩을 선택하고 각 팩의 진행·최고 기록을 이어가기.
- 범위 / 담당: 현재 Codex 단독. 기본 5종과 메이 보글보글, 선택 UI·저장·호환성. 새 게임 제작·머지·배포 제외.
- 기준: PR #37, ad6433e5fcf944e3128c5953298547c157f1c4e3. 별도 feat/member-game-packs worktree.
- 완료 기준: 메이 팩 왕복 전환·새로고침·별도 진행/기록·기존 저장 이전·모바일/키보드 조작 검증 후 본인 변경 커밋 및 push.
- 디자인: 기존 오락실의 잉크 #234454, 민트 #92bfb3, 메이 복숭아 #eab19b, 종이 #fff9e9, 노랑 #f5d77e 유지. Jua 제목 / Noto Sans KR 설명. `멤버 → 오락기 미리보기 → [게임팩][게임팩] → 진행 → 시작` 순서. 새 화면 대신 실제 팩을 닮은 누름 버튼을 오락기 안에 배치, 선택 표식과 텍스트를 같이 사용. 공용 카드 대시보드로 재디자인하지 않고 기존 오락기 구조 유지.
- 저장 계약: 안정적인 팩 ID가 기록을 소유하고 kind가 기존 조작/렌더 엔진을 선택. packs.v1이 원본, journey.v1/기록 키는 현재 선택한 팩의 호환 뷰. 기존 메이 슬롯은 스냅샷의 버전으로 구분, 스냅샷이 없으면 classic URL 힌트 사용(없으면 생존전). 이미 덮어쓴 과거 기록은 복원할 수 없음.
- 조사: PR #37 CI 660 통과 / 3 실패 / 6 제외. 실패 3개는 동일 may-pump 테스트의 옛 '오디오 실패 시 일시정지' 기대값. 새 요청의 자동 시작 계약에 맞춰 회귀 테스트 갱신 필요.
- 현재: 게임팩 구현·로컬 검증 완료. 다음: 커밋·upstream push 및 PR 준비. 운영 미반영.

## 첫 검증 및 보정

- 단위 223 통과, lint(미사용 global 제거 후)·빌드 통과. 첫 관련 브라우저 검증 68 통과 / 5 실패 / 2 조건부 제외.
- 게임팩 저장·교체·마이그레이션은 3개 환경 통과. 모바일 WebKit에서 Tab이 버튼을 건너뛰어 순차 Tab 검증은 데스크톱에 적용, 모든 환경의 Enter 선택/포커스 유지·모바일 터치 검증은 유지.
- 펌프 실패 3개는 가상 시간 1000ms의 마지막 렌더 프레임이 1초에 조금 못 미쳐 ceil 표시가 60인 경계값. 1200ms 후 59초로 검증하도록 조정.
- 나머지 WebKit 1건은 기존 곡 시작의 media 준비 대기 timeout. 실제 음원/가상 시계 이벤트 경합 가능성으로, 영향 스위트 재검증 후 재발 시 trace 조사.

- WebKit 음원 대기는 단독 테스트에서도 재현했지만 Audio 이벤트 계측을 넣으면 같은 소스로 통과. 네트워크는 mp3 206 정상, 계측 실행은 metadata → 0초 seek → playing과 실제 currentTime 증가 확인. 테스트가 새 스테이지의 시계를 완전히 동결한 채 실제 미디어를 기다리던 조건을 바꿔, 이어하기 클릭 뒤 실제 게임 프레임 150ms를 진행한 다음 음악 재생을 확인한다. 미디어 기대값을 제거하거나 성공으로 간주하지 않음.

- 통합 207건 중 204 통과. 나머지 3건은 기존 survival 스위트가 제거한 `.classic-link`를 기다린 같은 실패. 실제 교체 버튼 `may-bubbles`로 갱신해 생존전 → 보글보글 전환을 다시 검증한다. 펌프 보정 후 모든 may-pump 시나리오는 세 환경에서 통과했다.

## 최종 로컬 검증

- 단위 223 통과. lint·프로덕션 빌드·git diff --check 통과.
- 관련 14개 E2E 스위트: 최종 버전 기준 서로 다른 262건 통과, Chromium 전용 터치 주입 2건은 다른 브라우저에서 조건부 제외. 전체 CI 스위트 결과와 혼동하지 않는다.
- 근거 결합: 첫 browser 실행의 carousel/endless/game-revision 40 통과+2 제외, integration 실행의 survival 제외 198 통과, final-packs의 game-packs/survival 24 통과. 이 사이 제품 코드는 변경하지 않았고 실패한 테스트 기대값·선택자만 수정했다.
- PC 1280px, Android Chromium, iPhone WebKit 캡처 검토 및 320px 가로 넘침·44px 이상 선택 버튼·Enter 선택·데스크톱 Tab 이동 확인. 실제 휴대전화 하드웨어 시험은 아님.
- 빌드: app-CA16j5l1.js / app-DuahnLc3.css.
- 산출물: iCloud 공용 작업 루트의 rescene-game/member-game-packs-20261014/{unit.log,browser.log,recheck.log,integration.log,final-packs.log,site/}. 화면은 final-packs/game-packs-switches-both-M-7b831-separate-saves-after-reload-{desktop-chromium,mobile-webkit}/may-packs.png.
- PR #37의 오래된 펌프 테스트 보정은 d7953e1로 별도 커밋. 게임팩 구현 커밋과 분리해 앞선 작업 브랜치에도 반영하며, 그 정확한 소스 빌드로 may-pump 검증 후 push한다.
- 잔여 범위: 새 게임 제작은 이번 요청에 포함하지 않음. 메이 외 4명은 현재 기본팩 1개, 메이만 2개. 머지·운영 배포는 별도 명시적 승인 후 수행한다.
