# 리센느 작은 오락실

심시티풍 멤버 캐릭터와 함께하는 60초 브라우저 게임. 원이의 바닷길 드라이브, 메이의 조각 공방, 제나의 깜짝 포토부스, 미나미의 댄스 타임, 리브의 별빛 산책을 제공합니다.

Node.js 22에서 `npm ci` 후 `npm run dev`로 실행합니다. 시작 주소는 `http://127.0.0.1:4325/`이며 `/arcade-room.html`도 지원합니다.

- 검사: `npm test`와 `npm run lint`
- 정적 빌드: `npm run build -- --outDir "$ARCADE_BUILD_OUTPUT"` (출력 경로를 먼저 지정)
- 빌드 확인: `npm run preview -- --outDir "$ARCADE_BUILD_OUTPUT"` 후 `/`
- 브라우저 회귀 검사: 빌드 후 `ARCADE_BUILD_OUTPUT="$ARCADE_BUILD_OUTPUT" ARCADE_TEST_OUTPUT="$ARCADE_ARTIFACTS/browser" ARCADE_BASE_PATH=/ npm run e2e` (Chromium·WebKit 설치 필요)
- 최고 기록은 현재 브라우저에만 저장됩니다. AI 호출·로그인이 필요하지 않습니다.

[다섯 게임 규칙과 구현 범위](docs/design/arcade-five-games.md), [플레이테스트와 남은 작업](docs/design/arcade-playtest.md), [첫 두 게임의 기록](docs/design/member-arcade.md). 비공식 팬 게임이며 공개 취향에서 출발한 창작입니다.

이 Mac에서는 `ARCADE_ARTIFACTS`를 공용 iCloud 작업 루트의 `rescene-game/<작업 ID>`로, `ARCADE_BUILD_OUTPUT`을 그 아래 `build`로 지정합니다. CI는 러너의 작업별 출력 폴더를 사용하며 정적 사이트와 실패 증거를 7일간 보관합니다. CI의 브라우저 에뮬레이션은 실제 휴대폰 확인을 대신하지 않습니다.

2026-09-30: 기존 개발 브랜치의 아케이드 파일을 독립 구성으로 분리했습니다. 이전 RPG·서바이벌·3D 실험은 각 기존 브랜치에 보존되어 있습니다. [기존 Cloudflare Pages 연결 구성](docs/deployment/arcade-pages.md)을 준비했으며 `rescene-arcade` 프로젝트와 GitHub 배포 변수는 연결했습니다. 2026-10-01 기존 Wrangler 로그인으로 [공개 게임](https://rescene-arcade.pages.dev/)을 배포했습니다. CI 배포용 인증 연결은 아직 남아 있습니다.
