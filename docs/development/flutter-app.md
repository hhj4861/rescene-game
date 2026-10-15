# Android·iOS 앱과 웹을 함께 유지하기

`apps/mobile`은 Flutter WebView 앱이다. 게임 로직·화면·음악은 기존 웹을 사용하고, 앱 기본 주소는 `https://rescene-arcade.pages.dev/`다. 운영 웹을 배포하면 앱을 새로 열거나 페이지를 다시 불러올 때 반영된다. 이미 실행 중인 게임은 강제 새로고침하지 않는다. 앱 셸·권한·아이콘을 바꾸면 앱을 다시 빌드해야 한다.

인터넷 연결이 필요하다. 브라우저와 앱 WebView의 게임 저장소는 별개이며, 기기 간 동기화는 하지 않는다. 앱 안에서 최고 기록과 이어하기는 기존 웹의 localStorage를 사용한다.

## 개발

Flutter **3.47.7 / Dart 3.13.5**, Android SDK와 Java 21, iOS는 Xcode를 준비한다. 앱의 최소 버전은 Android API 24, iOS 15.0이다. 앱 식별자는 Android·iOS 모두 `com.hhj4861.rescenearcade`다. 의존성은 `pubspec.lock`으로 고정한다. 공식 플러그인은 [webview_flutter](https://pub.dev/packages/webview_flutter), [url_launcher](https://pub.dev/packages/url_launcher)를 사용한다.

저장소 루트에서 실행한다. 이 Mac의 `ARCADE_ARTIFACTS`는 사용자 지정 iCloud 작업 루트 아래 작업별 폴더를 사용한다.

```sh
export ARCADE_ARTIFACTS='/Users/admin/Library/Mobile Documents/com~apple~CloudDocs/gpt 작업/rescene-game/mobile-dev'
# Flutter가 PATH에 없을 때만 SDK 절대 경로 지정
export FLUTTER_BIN='/path/to/flutter/bin/flutter'
npm run app:check
npm run app:android
npm run app:ios
npm run app:run -- -d DEVICE_ID
```

검증 스크립트는 소스를 `ARCADE_ARTIFACTS/flutter/workspaces/<source-hash>`로 복사하고 캐시·빌드·로그를 작업 폴더에 둔다. 저장소에는 SDK와 빌드 결과를 커밋하지 않는다. Android 테스트 APK는 `ARCADE_ARTIFACTS/flutter/rescene-arcade-debug.apk`, iOS Simulator 앱은 해당 workspace의 `build/ios/iphonesimulator/Runner.app`에 생성된다. Flutter 3.47의 분석 클라이언트가 한글 경로에서 UTF-8 메시지 길이를 잘못 계산하므로 `app:check`는 동일 SDK의 `dart analyze --fatal-infos`와 `flutter test`를 사용한다.

Java 프로세스는 UTF-8 로케일(`LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`)을 사용한다. 이 Mac의 iCloud 경로에서는 Gradle Kotlin 스크립트 해석 실패도 관찰되어 Android 설치 파일의 빌드 검증은 CI 결과와 구분해 기록한다. CI 산출물은 작업 iCloud 폴더로 내려받을 수 있다.

웹 로컬 서버를 실행하고 다음처럼 앱 주소를 바꿀 수 있다. Android Emulator에서는 호스트 접근 주소 `10.0.2.2`, iOS Simulator에서는 `localhost`를 사용한다. Android 디버그 빌드만 로컬 HTTP를 허용한다. 실기기에서는 기기가 접근 가능한 HTTPS 미리보기 주소를 사용한다.

```sh
npm run dev
npm run app:run -- -d DEVICE_ID --dart-define=ARCADE_URL=http://10.0.2.2:4325/
# iOS Simulator
npm run app:run -- -d DEVICE_ID --dart-define=ARCADE_URL=http://localhost:4325/
```

패키지 변경 시 복사된 workspace에서 의존성을 먼저 해석하고 확인한 `pubspec.lock`을 소스에 반영한다. 소스 lock이 있으면 스크립트는 `--enforce-lockfile`을 사용한다.

iOS 빌드는 실행 권한과 번들 내부 링크를 보존하는 `ARCADE_ARTIFACTS/flutter/rescene-ios-simulator.tar.gz`도 만든다. CI에서는 이 파일을 내려받아 압축을 푼 다음 Simulator에 설치한다.

## 앱 동작

- 게임 화면은 SafeArea 안에 표시한다. 로딩 진행 표시, 네트워크 오류와 재시도만 네이티브 UI로 제공한다.
- Android 뒤로가기: 게임에서 저장 후 게임 선택 화면으로, 선택 화면에서는 앱 종료. 웹의 홈 버튼도 그대로 쓴다.
- 백그라운드로 이동하면 게임·음악을 일시정지한다. 복귀 후 게임은 사용자가 이어하기를 눌러 재개한다.
- 운영 사이트와 같은 origin은 앱 내부, 외부 HTTPS 링크는 시스템 브라우저로 연다. iframe 영상은 WebView 안에서 재생한다.
- `assets/host_bridge.js`는 승인된 게임 origin의 로드 완료 후만 주입한다. 별도 JavaScript 네이티브 권한 채널은 만들지 않는다.

서비스 → 저장소 → ChangeNotifier ViewModel → 화면으로 나누어 WebView 플러그인 없이도 오류·탐색·생명주기를 검증한다. 실제 네이티브 WebView의 영상 재생 정책과 터치 동작은 별도 실기기 확인이 필요하다.

## 검증과 배포 범위

`Flutter app checks` CI는 Android 테스트 APK와 iOS Simulator 앱을 빌드하고 7일간 보관한다. 기존 웹 CI는 7개 게임팩에 앱의 같은 bridge 파일을 주입해 저장·일시정지·뒤로가기를 Chromium·WebKit에서 검증한다. 브라우저 에뮬레이션과 위젯 테스트를 실제 휴대폰 실행으로 표기하지 않는다.

현재 APK는 테스트용이다. Android release 서명, iOS 배포 서명/프로비저닝, App Store·Google Play 등록은 포함하지 않는다. Simulator 앱은 iPhone에 설치하는 배포 파일이 아니다. 운영 웹 반영은 기존 PR 머지·Pages 배포 절차를 따른다.
