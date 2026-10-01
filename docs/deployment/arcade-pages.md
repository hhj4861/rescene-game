# 작은 오락실 — 기존 Cloudflare Pages 연결

2026-09-30 사용자 승인으로 기존 Cloudflare 계정에 게임 전용 `rescene-arcade` Pages 프로젝트를 생성했다. 운영 브랜치는 `main`, 할당 도메인은 `rescene-arcade.pages.dev`다. 2026-10-01 첫 운영 배포를 완료했다. 공개 주소는 https://rescene-arcade.pages.dev/ 이다.

## 스테이지·자동 저장 운영 배포 — 2026-10-01

- 사용자 명시 승인 후 [PR #9](https://github.com/hhj4861/rescene-game/pull/9)를 머지했다. 배포 소스: `main`의 `403388bc96df14c1821b97f5375400ba78463cc8`.
- [main 검증 36833167782](https://github.com/hhj4861/rescene-game/actions/runs/36833167782): Node 26개, 브라우저 48개, lint, build 통과. 이 실행의 `arcade-static-site` 산출물을 그대로 기존 Wrangler 로그인으로 배포했다.
- Pages: `af3f7586-f852-4f51-921f-f466c0d9302d`, Production / main / source `403388b`. [공개 게임](https://rescene-arcade.pages.dev/), [고정 배포 주소](https://af3f7586.rescene-arcade.pages.dev).
- [공개 주소 검증 36833799540](https://github.com/hhj4861/rescene-game/actions/runs/36833799540): **51개 통과**. 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 저장 복원, 스테이지 클리어/해금, 메이 윙크, 게임 조작과 결과·재도전을 확인했다. 합성 음성은 API 스텁 호출 검증이며 실제 멤버 녹음 또는 실기기 청음 검증이 아니다.
- 세 브라우저 모두 공개 HTML·JS·CSS·원본 캐릭터·새 반응 이미지의 SHA-256이 기대 빌드와 일치했다. 증적은 iCloud 작업 루트의 `rescene-game/arcade-progression-merge-20261001/live-36833799540/`에 보관했다.
- 공개 검증은 기존 PR #8 작업 브랜치에 승인된 main을 통합하고 최신 자산 검사를 추가해 실행했다(`9dbeb58`). [해당 브랜치 정적 검증 36833801796](https://github.com/hhj4861/rescene-game/actions/runs/36833801796)도 통과. PR #8 자체는 별도 머지 승인이 없어 열어 둔다.
- [멤버 유행어 조사](../research/member-catchphrases-youtube.md)는 출처 수집 문서이며, 조사한 표현으로 게임을 바꾸거나 유튜브 음성을 게임에 넣은 상태는 아니다.

## 난이도 조정 운영 배포 — 2026-10-01

- 사용자 승인 후 PR #7을 머지했다. 배포 소스는 `main`의 `fefef8dd44e26f75c0c3a7a60286941f8a02c515`이다.
- [main CI 36823221116](https://github.com/hhj4861/rescene-game/actions/runs/36823221116)에서 Node 17건·브라우저 36건·린트·빌드 통과 후, 동일 `arcade-static-site` 산출물을 기존 Wrangler 로그인으로 배포했다. CI 배포 인증은 추가하지 않았다.
- Pages 배포 ID: `282bbad8-e4c5-4728-89e0-f1a84536bd03`; Environment: `Production`; Branch: `main`; Source: `fefef8d`. 배포 후 운영 목록에서 확인했다.
- [공개 게임](https://rescene-arcade.pages.dev/), [해당 배포](https://282bbad8.rescene-arcade.pages.dev).
- 다섯 게임의 시작 속도를 높이고 10초 이후 점진적으로 가속한다. 사진·리듬 판정도 후반에 더 정밀해진다. 캐릭터 아틀라스는 기존 SHA-256과 일치하며 조작·기존 최고 기록은 유지한다.
- 공개 브라우저 검증은 도구 시간 초과 후 연결된 브라우저가 없어 완료하지 못했다. 공개 주소 HTTP 비교도 403 응답으로 중단했다. 운영 배포 등록과 CI 동작은 확인했지만, 이번 배포 후 공개 화면에서의 직접 플레이와 CDN 전체 파일 일치는 미확인이다.
- 산출물: 공용 iCloud 작업 루트의 `rescene-game/arcade-difficulty-publish-20261001/site/`.

## 첫 운영 배포 결과 — 2026-10-01

- PR #6를 사용자 승인 후 머지했다. 배포 소스는 `main`의 `2a7de6d11206ebbf9a2646e18a5ecc60bc8330d6`이다.
- [main CI 36815975048](https://github.com/hhj4861/rescene-game/actions/runs/36815975048)의 성공한 `arcade-static-site` 산출물을 그대로 배포했다. 이 실행은 단위 12건·브라우저 36건·린트·빌드를 통과했다.
- 사용자가 “별도 토큰 없음 — 이번에는 기존 로그인으로 배포”를 선택하여 기존 Wrangler 로그인으로 업로드했다. GitHub Actions 배포 인증을 연결한 것은 아니다.
- Pages 배포 ID: `822f5d47-f012-4fd3-8eaf-c496426337e1`; Environment: `Production`; Branch: `main`; Source: `2a7de6d`.
- [공개 게임](https://rescene-arcade.pages.dev/), [해당 배포](https://822f5d47.rescene-arcade.pages.dev).
- Chrome의 공개 주소에서 다섯 멤버의 첫 화면, 포토부스 시작·입력 반응·60초 종료·저장 안내·재도전·일시정지·오락실 복귀를 확인했다. 공개 주소에서 나머지 네 게임을 모두 한 판씩 완료하거나 실제 휴대폰으로 검증한 것은 아니다.
- 별도 Python HTTP 파일 비교 요청은 403 응답으로 중단됐다. CDN 파일 전체의 해시 일치 검증은 완료하지 못했다. 브라우저에서는 공개 페이지에 정상 접속했고 게임이 동작했다.
- 로컬 배포 산출물은 공용 iCloud 작업 루트의 `rescene-game/arcade-publish-20261001/site/`에 보관했다. 캐릭터 아틀라스 SHA-256은 기존 승인 파일과 동일하다.

## 이후 CI 배포 경로

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
2. PR #6는 승인 후 머지됐다. 이후 변경 PR도 명시적 승인 후 머지하고, CI 연결 값은 승인된 경로로 설정한다.
3. 이후 CI 배포는 인증 연결과 해당 배포 승인 후 `Publish arcade to Cloudflare Pages`를 `main`에서 실행한다. 첫 배포는 위에 기록한 기존 로그인 방식으로 완료했다.
4. 배포 결과의 실제 URL에서 첫 화면, 다섯 게임 시작, 결과·재도전·기록 복원을 확인하고 커밋·실행 번호·실제 URL을 기록한다. 예상 주소를 배포 완료 링크로 안내하지 않는다.
5. iPhone Safari와 Android Chrome에서 [실제 기기 체크리스트](../design/arcade-playtest.md)를 진행한다. localhost 기록은 공개 주소로 자동 이동하지 않는다.

오류가 있으면 새 배포를 중단한다. 이미 공개한 변경을 되돌려야 하면 마지막 정상 버전으로 되돌리는 PR을 만들고 별도 머지 승인 후 같은 검증/배포 절차를 따른다.

## 현재 검증과 남은 단계 — 2026-10-01

- 복구 커밋 `e48c3e6` 기준 [CI 실행 36809734700](https://github.com/hhj4861/rescene-game/actions/runs/36809734700)에서 Node 12건, 브라우저 36건, 린트·정적 빌드가 통과했다. 동일 커밋의 브랜치 검사 36809732162도 통과했다.
- 기존 iCloud 저장소의 미전송 정적 배포 검사·Cloudflare workflow 변경과 배포 메모를 새 로컬 worktree로 복구했다. 기존 PR #6 브랜치에 정상 push했으며, 추가된 브라우저 검사 12건을 포함한 총 36건을 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 통과했다.
- 코드 기준은 `/Users/admin/workSpace/rescene-game`, 구현 worktree는 `.worktrees/arcade-complete`다. 이전 iCloud checkout은 보존하며 새 저장소의 Git·패키지 파일은 정상적으로 읽힌다. 테스트·빌드 산출물은 공용 iCloud 작업 루트 아래 `rescene-game/arcade-release-20261001/`에 둔다.
- PR #6 머지와 첫 공개 배포는 완료했다. CI용 인증 연결, 실제 휴대폰·이용자 확인은 남아 있다. 기존 로그인 배포와 CI 배포 인증 완료를 구분한다.

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
