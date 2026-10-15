# Flutter 앱 동시 구현

- 요청: 현재 웹 게임을 기반으로 Flutter 앱도 함께 유지.
- 담당: 현재 세션 단독. 웹 정리 커밋 422c923 이후 같은 feat/arcade-clean-copy에서 진행.
- 기본 범위: Android·iOS, 운영 HTTPS 웹을 WebView로 공유. 웹 배포가 앱에 반영되는 인터넷 연결형 구조. 사용자가 Android·iOS 모두 및 기존 웹 게임 실행 방식을 명시적으로 선택함.
- 구조: WebView 플러그인 서비스 → 게임 저장소 → ChangeNotifier ViewModel → 화면. 새 게임 로직/도메인 모델은 만들지 않음.
- 완료 기준: Flutter analyze/단위·위젯 테스트, Android APK 빌드, iOS CI 빌드, 웹과 앱의 뒤로가기·백그라운드 계약 확인, 파일별 소유 확인 후 commit/push/PR.
- 환경: Flutter 3.47.7을 작업 전용 iCloud toolchain에 준비. Android SDK 35/36 존재. 로컬 Xcode와 iOS Simulator 없음. 실기기·스토어 배포는 별도 범위.
- 구현: Android·iOS WebView 셸, 홈 복귀/저장, 백그라운드 게임·음악 일시정지, 외부 링크 분리, 로딩 오류 재시도, 기존 r. 브랜드 아이콘. 앱의 소스와 웹은 같은 저장소에서 관리.
- 로컬 검증: Dart analyze 문제 없음, Flutter 단위·위젯 10/10, 웹 단위 237/237, lint 통과. 7팩 × 3브라우저 앱 브리지 E2E 21/21 통과. 초기 E2E에서 data-home이 홈 이동 대신 일시정지를 하는 것을 발견해 기존 data-exit-game/data-leave 경로로 수정.
- 로컬 도구 문제: Flutter 분석기 UTF-8 길이 오류는 Dart analyzer 직접 호출로 해결. Android Gradle는 UTF-8 로케일 적용 뒤에도 한글 iCloud 경로에서 Kotlin DSL unresolved reference로 실패. Xcode 없음. 네이티브 빌드는 CI에서 별도 확인 중이며 아직 완료로 보고하지 않음.
- 증거: iCloud `rescene-game/flutter-app-20261015/`의 check-verified.log, unit.log, workspace-test.log, lint-verified.log, browser-verified.log. 네이티브 실기기 검증/스토어 공개/운영 웹 배포는 수행하지 않음.
