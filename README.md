# 리센느 작은 오락실

심시티풍 멤버 캐릭터와 함께하는 60초 브라우저 게임. 원이의 바닷길 드라이브와 메이의 조각 공방을 제공합니다.

Node.js 20 이상에서 `npm ci` 후 `npm run dev`로 실행합니다. 시작 주소는 `http://127.0.0.1:4325/arcade-room.html`입니다.

- 검사: `npm test`와 `npm run lint`
- 정적 빌드: `npm run build` → `dist-arcade-room/`
- 빌드 확인: `npm run preview` 후 `/arcade-room.html`
- 최고 기록은 현재 브라우저에만 저장됩니다. AI 호출·로그인이 필요하지 않습니다.

[게임 규칙과 기존 검증](docs/design/member-arcade.md). 비공식 팬 게임이며 공개 취향에서 출발한 창작입니다.

2026-09-30: 기존 개발 브랜치의 아케이드 파일을 독립 구성으로 분리했습니다. 이전 RPG·서바이벌·3D 실험은 각 기존 브랜치에 보존되어 있습니다. 운영 배포 설정은 아직 없습니다.
