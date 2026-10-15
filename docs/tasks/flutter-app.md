# Flutter 앱 동시 구현

- 요청: 현재 웹 게임을 기반으로 Flutter 앱도 함께 유지.
- 담당: 현재 세션 단독. 웹 정리 커밋 422c923 이후 같은 feat/arcade-clean-copy에서 진행.
- 기본 범위: Android·iOS, 운영 HTTPS 웹을 WebView로 공유. 웹 배포가 앱에 반영되는 인터넷 연결형 구조. 사용자가 Android·iOS 모두 및 기존 웹 게임 실행 방식을 명시적으로 선택함.
- 구조: WebView 플러그인 서비스 → 게임 저장소 → ChangeNotifier ViewModel → 화면. 새 게임 로직/도메인 모델은 만들지 않음.
- 완료 기준: Flutter analyze/단위·위젯 테스트, Android APK 빌드, iOS CI 빌드, 웹과 앱의 뒤로가기·백그라운드 계약 확인, 파일별 소유 확인 후 commit/push/PR.
- 환경: Flutter 3.47.7을 작업 전용 iCloud toolchain에 준비. Android SDK 35/36 존재. 로컬 Xcode와 iOS Simulator 없음. 실기기·스토어 배포는 별도 범위.
- 구현: Android·iOS WebView 셸, 홈 복귀/저장, 백그라운드 게임·음악 일시정지, 외부 링크 분리, 로딩 오류 재시도, 기존 r. 브랜드 아이콘. 앱의 소스와 웹은 같은 저장소에서 관리.
- 로컬 검증: Dart analyze 문제 없음, Flutter 단위·위젯 10/10, 웹 단위 237/237, lint 통과. 7팩 × 3브라우저 앱 브리지 E2E 21/21 통과. 초기 E2E에서 data-home이 홈 이동 대신 일시정지를 하는 것을 발견해 기존 data-exit-game/data-leave 경로로 수정.
- 로컬 도구 제한: Flutter 분석기 UTF-8 길이 오류는 Dart analyzer 직접 호출로 해결. Android Gradle는 UTF-8 로케일 적용 뒤에도 한글 iCloud 경로에서 Kotlin DSL unresolved reference로 실패. 로컬 Xcode는 없음. 네이티브 빌드는 아래 CI에서 별도로 확인함.
- 증거: iCloud `rescene-game/flutter-app-20261015/`의 check-verified.log, unit.log, workspace-test.log, lint-verified.log, browser-verified.log. 네이티브 실기기 검증/스토어 공개/운영 웹 배포는 수행하지 않음.
- 네이티브 최종 코드 820a554: [Android APK·iOS Simulator CI 모두 성공](https://github.com/hhj4861/rescene-game/actions/runs/38753301724). Android 디버그 매니페스트 병합 충돌을 수정하고, iOS 번들은 실행 권한 보존을 위해 tar.gz로 보관. 두 플랫폼 모두 분석 및 단위/위젯 테스트 10개 통과.
- 다운로드 결과: 작업 iCloud 폴더의 `ci-820a554/android/rescene-arcade-debug.apk`, `ci-820a554/ios/rescene-ios-simulator.tar.gz`. APK 서명·앱 ID·최소 SDK 24, iOS Simulator 번들 ID·실행 권한 0755·최소 OS 15.0 확인. 두 앱에 포함된 host_bridge.js가 저장소 소스와 바이트 단위로 일치.
- 현재 운영 웹 호환 확인: 모바일 Chromium·WebKit에서 7팩 × 2 = 14개 브리지 시나리오 통과(`production-bridge-verified.log`). 영상 API는 모의 응답이며 네이티브 실기기/실제 YouTube 재생 검증과 구분함.
- 현재: 사용자 승인 후 [PR #42](https://github.com/hhj4861/rescene-game/pull/42) main 머지 및 운영 웹 배포 완료(2026-10-16). 앱 스토어 게시·네이티브 실기기 검증은 미실행. [배포·검증 기록](../deployment/arcade-pages.md).
- 전체 웹 CI 820a554: 761 통과·6 제외·1 시간 초과(28.6분). WebKit 캐러셀의 6개 너비·30개 선택 판정은 trace에서 통과했으나 마지막 캡처까지 누적 45초를 초과. 화면 너비별로 테스트를 분리하고 각 너비에서 다시 2200px로 돌아오는 검증도 유지함. 정렬 오차 2px 기준·개별 판정 제한 시간은 완화하지 않음.
- 수정 후 캐러셀 3브라우저 재검증: 28 통과·2 제외(Chromium 전용 터치 주입), `carousel-verified.log`. 최신 전체 CI 결과는 PR #42의 체크에서 확인한다. 이후 변경은 이 테스트와 검증 기록뿐이며 앱 산출물의 소스는 820a554와 동일하다.

- 배포 후 7팩 × 3브라우저의 앱 브리지 21개를 포함한 운영 회귀 103개 통과·2개 제외. 최종 head 8dfde7d의 네이티브 CI 38758535676도 두 플랫폼 모두 성공.
