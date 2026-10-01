# 작은 오락실 — 기존 Cloudflare Pages 연결

2026-09-30 사용자 승인으로 기존 Cloudflare 계정에 게임 전용 `rescene-arcade` Pages 프로젝트를 생성했다. 운영 브랜치는 `main`, 할당 도메인은 `rescene-arcade.pages.dev`다. 프로젝트 목록에서 생성됨을 확인했고 배포 목록은 비어 있다. 아직 공개 게임은 없다.

## 준비한 경로

`main` → 수동 `Publish arcade to Cloudflare Pages` 실행 → 기존 프로젝트/운영 브랜치 확인 → 테스트·린트·정적 빌드 → Chromium/WebKit 검사 → 통과한 동일 빌드만 기존 프로젝트에 배포.

PR과 작업 브랜치는 배포하지 않는다. workflow는 수동 실행만 사용하며 `main` 이외의 실행은 건너뛴다. 원격 프로젝트 조회가 실패하거나 운영 브랜치가 다르면 배포 전에 중단한다. 새 Pages 프로젝트를 생성하거나 기존 도메인·접근 설정을 바꾸는 단계는 없다.

## 필요한 연결 값

| 종류 | 이름 | 용도 |
|---|---|---|
| Actions variable | `CLOUDFLARE_PAGES_PROJECT` | 사용자가 확인한 기존 게임용 Pages 프로젝트 이름 |
| Actions variable | `CLOUDFLARE_PAGES_BRANCH` | 해당 프로젝트의 실제 production branch |
| Actions secret | `CLOUDFLARE_ACCOUNT_ID` | 대상 프로젝트의 계정 |
| Actions secret | `CLOUDFLARE_API_TOKEN` | 해당 계정 Pages 조회·배포용 승인된 인증 |

GitHub Actions variables에 `CLOUDFLARE_PAGES_PROJECT=rescene-arcade`, `CLOUDFLARE_PAGES_BRANCH=main`을 설정했다. Actions secrets는 아직 비어 있어 CI용 계정·토큰 연결이 남아 있다. 로컬 Wrangler 로그인은 CI 인증 설정과 별개다. 다른 서비스의 인증정보를 임의로 복사하지 않는다. 실제 비밀 값은 소스·문서·일반 로그에 저장하지 않는다.

## 첫 공개 절차

1. 생성된 `rescene-arcade`와 운영 브랜치 `main`을 대상으로 사용한다. Git Provider는 No로 확인했으므로 현재 Pages 자체 Git 자동 배포는 연결되어 있지 않다.
2. 사용자에게 PR #6 머지 승인을 받은 뒤 머지한다. 연결 값은 승인된 경로로 설정한다.
3. 공개 배포 승인 후 `Publish arcade to Cloudflare Pages`를 `main`에서 실행한다.
4. 배포 결과의 실제 URL에서 첫 화면, 다섯 게임 시작, 결과·재도전·기록 복원을 확인하고 커밋·실행 번호·실제 URL을 기록한다. 예상 주소를 배포 완료 링크로 안내하지 않는다.
5. iPhone Safari와 Android Chrome에서 [실제 기기 체크리스트](../design/arcade-playtest.md)를 진행한다. localhost 기록은 공개 주소로 자동 이동하지 않는다.

오류가 있으면 새 배포를 중단한다. 이미 공개한 변경을 되돌려야 하면 마지막 정상 버전으로 되돌리는 PR을 만들고 별도 머지 승인 후 같은 검증/배포 절차를 따른다.

## 현재 검증과 남은 단계 — 2026-10-01

- 복구 커밋 `e48c3e6` 기준 [CI 실행 36809734700](https://github.com/hhj4861/rescene-game/actions/runs/36809734700)에서 Node 12건, 브라우저 36건, 린트·정적 빌드가 통과했다. 동일 커밋의 브랜치 검사 36809732162도 통과했다.
- 기존 iCloud 저장소의 미전송 정적 배포 검사·Cloudflare workflow 변경과 배포 메모를 새 로컬 worktree로 복구했다. 기존 PR #6 브랜치에 정상 push했으며, 추가된 브라우저 검사 12건을 포함한 총 36건을 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 통과했다.
- 코드 기준은 `/Users/admin/workSpace/rescene-game`, 구현 worktree는 `.worktrees/arcade-complete`다. 이전 iCloud checkout은 보존하며 새 저장소의 Git·패키지 파일은 정상적으로 읽힌다. 테스트·빌드 산출물은 공용 iCloud 작업 루트 아래 `rescene-game/arcade-release-20261001/`에 둔다.
- PR #6 머지 승인, CI용 인증 연결, 공개 배포 및 실제 기기 확인이 남아 있다. 프로젝트 생성 승인은 PR 머지 승인과 구분한다.

## 로컬 검사

`ARCADE_BUILD_OUTPUT`과 `ARCADE_TEST_OUTPUT`을 공용 iCloud 작업 루트의 작업별 `build`와 `browser` 경로로 export한다. 로컬 구현 worktree에서 실행하며 기존 iCloud checkout을 작업 기준으로 사용하지 않는다.

```sh
npm ci
npm test
npm run lint
npm run build -- --outDir "$ARCADE_BUILD_OUTPUT"
ARCADE_BASE_PATH=/ npm run e2e
```

Playwright 브라우저가 준비된 환경에서 사용한다. CI는 별도 러너에서 실행하므로 로컬 대용량 브라우저 다운로드를 요구하지 않는다. 기본 루트 외의 호스팅 검사는 `ARCADE_BASE_PATH`로 경로를 지정한다.

공식 근거: [Cloudflare Pages CI 배포](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/), [Pages deploy](https://developers.cloudflare.com/workers/wrangler/commands/pages/), [Playwright web server](https://playwright.dev/docs/test-webserver).
