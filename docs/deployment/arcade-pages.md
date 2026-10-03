# 작은 오락실 — 기존 Cloudflare Pages 연결

2026-09-30 사용자 승인으로 기존 Cloudflare 계정에 게임 전용 `rescene-arcade` Pages 프로젝트를 생성했다. 운영 브랜치는 `main`, 할당 도메인은 `rescene-arcade.pages.dev`다. 2026-10-01 첫 운영 배포를 완료했다. 공개 주소는 https://rescene-arcade.pages.dev/ 이다.



## 메이 방울 전투·펌프 곡 선택 운영 배포 — 2026-10-04

- 사용자 운영 반영 승인 후 [PR #21](https://github.com/hhj4861/rescene-game/pull/21)을 머지했다. 운영 소스는 `ca5222a3f00b3dfa1f509cb7fbc251ff02f8c193`다.
- [PR CI 37126549457](https://github.com/hhj4861/rescene-game/actions/runs/37126549457)의 단위 76개·브라우저 196개(환경별 5개 제외)·린트·빌드가 통과했다. PR head `435e435`와 머지 결과의 차이는 이전 배포 기록뿐이며 게임 소스·자산·빌드 입력·검사는 동일함을 확인한 뒤 CI `arcade-static-site`를 그대로 배포했다.
- Pages 배포 `0ee52a0d-a594-44ec-b265-db42495a2d6c`: **Production / main / source `ca5222a`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://0ee52a0d.rescene-arcade.pages.dev).
- 메이는 발판 추격·근접/연쇄 팡·포획 탈출 강화·단계별 적 증가를 적용했다. 미나미는 자체 제작 연주곡 3곡과 난이도 선택·미리 듣기·60초 완주·저장 이어하기·재생 실패 복구를 적용했다. 기존 승인 캐릭터와 저장 호환을 유지한다. [동작 상세](../design/may-pump-arcade.md).
- 실제 운영 주소에서 **브라우저 196개 통과, 환경 전용 5개 제외**. Desktop Chromium·Mobile Chromium·Mobile WebKit에서 실제 MP3 출력 신호, 곡/난이도 선택·저장 복원·실패 복구, 메이 연쇄 및 기존 게임 회귀를 확인했다. 모바일 검사는 에뮬레이션이며 실기기 스피커 청음 검증은 아니다.
- 공개 **31개 파일 전체의 SHA-256이 CI 산출물과 일치**했다. [머지 후 main CI 37161818484](https://github.com/hhj4861/rescene-game/actions/runs/37161818484)도 성공했다.
- 증거는 사용자 지정 iCloud 작업 루트 `rescene-game/may-pump-deploy-20261004/`의 `site/`, `production-asset-hashes.json`, `public-browser/`, `public-browser.log`에 보관한다. 기존 Wrangler 로그인으로 배포했으며 CI 인증·자동 배포 설정은 변경하지 않았다.

## 리브 난이도 강화 운영 배포 — 2026-10-03

- 사용자 운영 반영 승인 후 [PR #20](https://github.com/hhj4861/rescene-game/pull/20)을 머지했다. 운영 소스는 `21e7fcb1bff9ccad12d94f106d69ebe65c54a63e`다.
- [PR CI 37123062439](https://github.com/hhj4861/rescene-game/actions/runs/37123062439)의 단위 62개·브라우저 184개(환경별 5개 제외)·린트·빌드가 통과했다. PR head `bc2f4ea`와 머지 결과의 차이는 이전 배포 기록 `docs/deployment/arcade-pages.md`뿐이며 실제 빌드 입력은 동일함을 확인한 뒤 CI `arcade-static-site`를 배포했다.
- Pages 배포 `62fb5ab0-185d-461e-b495-d516ceb608d9`: **Production / main / source `21e7fcb`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://62fb5ab0.rescene-arcade.pages.dev).
- 리브 적의 등장 빈도·체력·진격 속도, 강화 보스와 좌우 호위 적을 적용했다. 첫 두 게이트의 성장 구간과 기존 저장·목숨·음성을 유지한다. [난이도 기준](../design/liv-difficulty.md).
- 실제 운영 주소 **브라우저 184개 통과, 환경 전용 5개 제외**. 강화 보스와 호위·PC/모바일 조작·일시정지·새로고침 저장 복원을 포함한다. 공개 **28개 파일 SHA-256이 CI 산출물과 일치**했다. 모바일 검사는 에뮬레이션이다.
- [머지 후 main CI 37124048625](https://github.com/hhj4861/rescene-game/actions/runs/37124048625)도 성공했다. 증거는 사용자 지정 iCloud 작업 루트 `rescene-game/liv-difficulty-deploy-20261003/`에 보관한다. 기존 Wrangler 로그인으로 배포했으며 자동 배포 인증은 변경하지 않았다.
- 이후 요청된 메이·펌프 개선은 이 배포에 포함되지 않으며 별도 구현 브랜치에서 진행한다.

## 멤버 반응 음성·리브 노래·제나 드래그 운영 배포 — 2026-10-03

- 사용자 명시 승인 후 [PR #19](https://github.com/hhj4861/rescene-game/pull/19)를 머지했다. 운영 소스는 `070b0c6b6578ab3173aa25c2cf975c1953e43aa5`다.
- [PR CI 37119578385](https://github.com/hhj4861/rescene-game/actions/runs/37119578385)의 Node 59개·브라우저 181개(환경별 5개 제외)·린트·빌드가 통과했다. PR head `0636641`과 머지 커밋의 Git 트리 `8cfdeef905bffbf76e6d16879bd8710d6d57842a`가 같음을 확인하고 해당 `arcade-static-site`를 배포했다.
- Pages 배포 `b731e3f9-8fbe-41a5-b34a-f02862f43356`: **Production / main / source `070b0c6`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://b731e3f9.rescene-arcade.pages.dev).
- 일반 플레이에서는 멤버별 짧은 실제 반응 3개를 돌아가며 재생하고 유행어는 클리어에 사용한다. 리브의 음표 요정은 공식 커버 영상의 4.4초 노래를 재생하며 BGM을 낮춘다. 제나 드래그는 반 칸 이상 이동하면 누른 상태에서도 즉시 교환을 확정한다. [음원 출처·구간과 재생 정책](../design/member-reactions.md).
- 공개 전체 **28개 파일의 SHA-256이 CI 산출물과 일치**했다. 증거는 사용자 지정 iCloud 작업 루트 `rescene-game/member-reactions-deploy-20261003/`의 `site/`, `production-asset-hashes.json`, `public-browser/`, `public-browser.log`에 보관한다.
- **실제 운영 주소에서 브라우저 181개 통과, 환경 전용 5개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 음원 디코드·순환·간격·리브 노래와 BGM 복귀, 드래그 즉시 교환, 저장·목숨·기존 게임을 검증했다. 모바일은 에뮬레이션이며 실기기 청음 검증은 아니다.
- [머지 후 main CI 37122034949](https://github.com/hhj4861/rescene-game/actions/runs/37122034949)도 최종 성공했다. 기존 Wrangler 로그인으로 배포했으며 CI 인증·자동 배포 설정은 변경하지 않았다.
- 이후 요청된 리브 난이도 조정은 이 배포에 포함되지 않으며 별도 구현 브랜치에서 검증한다.

## 원이 보상 음성 반복 완화 운영 배포 — 2026-10-03

- 사용자 명시 승인 후 [PR #18](https://github.com/hhj4861/rescene-game/pull/18)을 머지했다. 운영 소스는 `424624f5c1f100de3c61eb24d75b3116409f24f6`다.
- [PR CI 37114027495](https://github.com/hhj4861/rescene-game/actions/runs/37114027495)에서 Node 55개·브라우저 175개(환경별 5개 제외)·린트·빌드가 통과했다. PR 커밋 `87d11af`과 머지 커밋의 Git 트리 `07757bd8ed413af177de413912146770d92c4d03`가 동일함을 확인하고 해당 `arcade-static-site` 산출물을 배포했다.
- Pages 배포 `cefa1897-dfc1-4777-ba83-d090d9a0a58d`: **Production / main / source `424624f`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://cefa1897.rescene-arcade.pages.dev).
- 금빛 파이리 보상 음성 “오이쉬에~”는 최소 15초 간격으로 재생한다. 연속 획득으로 현재 음성을 재시작하거나 생략된 음성을 대기열에 쌓지 않는다. 마지막 금빛으로 클리어하면 클리어 음성만 한 번 요청한다. 점수·획득 수·효과음·캐릭터 반응, 수동 다시 듣기와 다른 멤버 음성은 유지한다. [정책과 검증](../design/woni-voice-spacing.md).
- 공개 **전체 12개 파일의 SHA-256이 CI 산출물과 일치**했다. 증거는 사용자 지정 iCloud 작업 루트 `rescene-game/woni-voice-deploy-20261003/`의 `site/`, `production-asset-hashes.json`, `public-browser/`, `public-browser.log`에 보관한다.
- **실제 공개 주소에서 브라우저 175개 통과, 환경 전용 5개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 실제 MP3 재생, 보상 음성 15초 간격과 일시정지 후 간격 유지, 점수/획득 수 유지, 마지막 금빛 클리어의 단일 재생 및 수동 다시 듣기를 확인했다. 기존 게임·BGM·음소거·저장 회귀 검사도 통과했다. 모바일은 에뮬레이션이며 실기기 청음 검증은 아니다.
- [머지 후 main CI 37114525205](https://github.com/hhj4861/rescene-game/actions/runs/37114525205)도 최종 성공했다.
- 기존 Wrangler 로그인으로 배포했으며 CI 인증·자동 배포 설정은 변경하지 않았다.

## 아이템·보스·조작·획득 음성 운영 배포 — 2026-10-03

- 사용자 명시 승인 후 [PR #17](https://github.com/hhj4861/rescene-game/pull/17)을 머지했다. 운영 소스는 `6dc800e165f5eb6f0f083108a63927d6f2fce4b7`다.
- [PR CI 37083537376](https://github.com/hhj4861/rescene-game/actions/runs/37083537376)에서 Node 53개·브라우저 172개(환경별 5개 제외)·린트·빌드가 통과했다. PR 커밋 `fbd57140`과 머지 커밋의 Git 트리 `beb748e9e5964331d2247458c13369b49a227cf1`가 동일함을 확인하고 해당 `arcade-static-site` 산출물을 배포했다.
- Pages 배포 `b24ecb67-8e32-4c6c-b515-348fa42a1708`: **Production / main / source `6dc800e`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://b24ecb67.rescene-arcade.pages.dev).
- 메이 속도·방울 크기 강화, 리브 게이트 강화·구름왕 보스·네 종류 아이템, 원이 후기 가짜/속도 난이도, 제나 드래그 미리보기·밀대 아이템을 적용했다. 아이템 획득 시 해당 멤버의 기존 실제 녹음을 재생한다. 아이템이 없는 미나미는 기존 클리어 음성을 유지한다. 전 게임 키보드 조작 표시와 한글 입력 상태의 물리 키 처리, 1.4초 피해 보호로 동시 실패의 중복 목숨 차감도 수정했다. [동작 상세](../design/arcade-upgrades.md).
- **실제 공개 주소에서 브라우저 172개 통과, 환경별 5개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 아이템/음성·보스·드래그·키보드·목숨·저장/복원과 기존 다섯 게임을 검증했다. 데스크톱 리브 보스·제나 드래그 및 모바일 WebKit 메이 강화 화면도 확인했다. 모바일은 에뮬레이션이며 실기기 청음 검증은 아니다.
- 공개 HTML·JS·CSS·이미지·멤버 음성 등 **전체 12개 파일의 SHA-256이 CI 산출물과 일치**했다. 증거는 사용자 지정 iCloud 작업 루트 `rescene-game/arcade-upgrades-deploy-20261003/`의 `site/`, `production-asset-hashes.json`, `public-browser/`, `public-browser.log`에 보관한다.
- [머지 후 main CI 37093119273](https://github.com/hhj4861/rescene-game/actions/runs/37093119273)도 최종 성공했다.
- 기존 Wrangler 로그인으로 배포했으며 CI 인증·자동 배포 설정은 변경하지 않았다. 별도 PR #8은 머지하지 않았다.

## 가짜 파이리·감점 운영 배포 — 2026-10-03

- 사용자 명시 승인 후 [PR #16](https://github.com/hhj4861/rescene-game/pull/16)을 머지했다. 운영 소스는 `50c69559482e38ff15dca7fe61fdea28e986b67b`다.
- [PR CI 37022976748](https://github.com/hhj4861/rescene-game/actions/runs/37022976748)에서 Node 40개·브라우저 133개(환경별 5개 제외)·린트·빌드가 통과했다. PR 커밋 `3f0fc6b`와 머지 커밋의 Git 트리 `3e005ab193abd8120822019157f4c874e918a92a`가 동일함을 확인하고 해당 `arcade-static-site` 산출물을 기존 Wrangler 로그인으로 배포했다.
- Pages 배포 `56e5c52e-58ee-4c12-8249-fd5f1911de6a`: **Production / main / source `50c6955`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://56e5c52e.rescene-arcade.pages.dev).
- 진짜 두 마리를 잡은 뒤 회색 몸·보라색 ×의 가짜가 최대 한 마리씩 섞인다. 누르면 150점 감점(최저 0점)과 콤보/충전 초기화, 그냥 보내면 불이익이 없다. 피버 중에도 감점되지만 목숨·진짜 포획 수·피버 남은 시간은 유지한다. 이전 저장과 등장 중 가짜·감점 후 저장을 이어받는다. [규칙과 디자인](../design/woni-decoys.md).
- 공개 HTML·JS·CSS·캐릭터·파이리·멤버 음성 등 **전체 12개 파일의 SHA-256이 CI 산출물과 일치**했다. 증적은 사용자 지정 iCloud 작업 루트 `rescene-game/woni-decoys-deploy-20261003/`의 `site/`, `production-asset-hashes.json`, `public-browser/`에 보관한다.
- **실제 공개 주소에서 브라우저 133개 통과, 환경별 5개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 가짜 표시·일반/피버 감점·콤보 초기화·목숨 유지·가짜 무시·중복 감점 방지·저장 복원과 기존 네 게임·BGM·멤버 음성을 확인했다. 데스크톱 감점 화면과 모바일 WebKit 가짜 화면도 확인했다. 제외 항목은 환경별 CDP 터치 주입과 데스크톱 멀티터치이며 모바일은 에뮬레이션 검증이다.
- [머지 후 main CI 37073520190](https://github.com/hhj4861/rescene-game/actions/runs/37073520190)도 최종 성공했다.
- 기존 로그인 배포이며 CI 인증·자동 배포 설정은 변경하지 않았다. 별도 PR #8은 머지하지 않았다.

## 파이리 불꽃추격 운영 배포 — 2026-10-02

- 사용자 명시 승인 후 [PR #15](https://github.com/hhj4861/rescene-game/pull/15)를 머지했다. 운영 소스는 `82358d69c664f31263fc4f83d63cab3fcf43f3c4`다.
- [PR CI 37018460369](https://github.com/hhj4861/rescene-game/actions/runs/37018460369)에서 Node 37개·브라우저 124개(환경별 5개 제외)·린트·빌드가 통과했다. PR 커밋 `dcb6bf3`와 머지 커밋의 Git 트리 `c6c332e1ebff84daf6249666e733c15332ecca14`가 동일함을 확인하고 해당 `arcade-static-site` 산출물을 기존 Wrangler 로그인으로 배포했다.
- Pages 배포 `735b0139-25e7-4663-a66c-b93efb78df28`: **Production / main / source `82358d6`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://735b0139.rescene-arcade.pages.dev).
- 원이는 좌우로 달리고 점프하는 파이리를 직접 탭해 잡는다. 5연속 성공하면 6초 피버가 열려 점수가 두 배이고 출현이 빨라지며 놓쳐도 목숨을 잃지 않는다. 기존 캐릭터·BGM·멤버 음성·무한 스테이지·저장 기록을 유지한다. [규칙과 저장 호환](../design/woni-flame-chase.md).
- 공개 HTML·JS·CSS·캐릭터·파이리·멤버 음성 등 **전체 12개 파일의 SHA-256이 CI 산출물과 일치**했다. 증적은 사용자 지정 iCloud 작업 루트 `rescene-game/woni-chase-deploy-20261002/`의 `site/`, `production-asset-hashes.json`, `public-browser/`에 보관한다.
- **실제 공개 주소에서 브라우저 124개 통과, 환경별 5개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 이동하는 터치 영역·피버·중복 타격 방지·일시정지/저장/복원·목숨, 기존 네 게임·선택 슬라이드·다섯 BGM·멤버 음성을 확인했다. 데스크톱·모바일 WebKit 공개 피버 화면도 확인했다. 제외 항목은 환경별 CDP 터치 주입과 데스크톱 멀티터치이며, 모바일 에뮬레이션은 실기기 청음 검증이 아니다.
- [머지 후 main CI 37019813008](https://github.com/hhj4861/rescene-game/actions/runs/37019813008)도 최종 성공했다.
- 기존 로그인 배포이며 CI 인증·자동 배포 설정은 변경하지 않았다. 별도 PR #8은 머지하지 않았다.

## 게임 슬라이드·신라빵 드래그와 낙하 운영 배포 — 2026-10-02

- 사용자 명시 승인 후 [PR #14](https://github.com/hhj4861/rescene-game/pull/14)를 머지했다. 운영 소스는 `5d0b8f281302a027d1fa5768629f6bdabdf9ca5d`다.
- [PR CI 37010468337](https://github.com/hhj4861/rescene-game/actions/runs/37010468337)에서 Node 33개·브라우저 115개(환경별 5개 제외)·린트·빌드가 통과했다. PR 커밋 `399ac04`와 머지 커밋의 Git 트리 `e000743307a551c96a6a3b437b32c7fd84f6c7e5`가 동일함을 확인하고 해당 `arcade-static-site` 산출물을 기존 Wrangler 로그인으로 배포했다. [main CI 37011460166](https://github.com/hhj4861/rescene-game/actions/runs/37011460166)도 성공했다.
- Pages 배포 `0c1469f0-77f0-41f1-abda-e4fb55391eaa`: **Production / main / source `5d0b8f2`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://0c1469f0.rescene-arcade.pages.dev).
- 게임 선택은 좌우 스와이프·이전/다음·멤버 바로가기·방향키로 조작한다. 제나 신라빵은 드래그/두 번 터치 교환과 팡 터짐 → 위에서 낙하 → 연쇄 연출을 지원한다. 잘못된 교환은 되돌리고, 진행 중 저장 시 확정된 판과 점수를 보존한다. 기존 캐릭터·단계·목숨·기록·멤버 음성은 유지한다. [동작 상세](../design/arcade-carousel.md).
- 다섯 게임의 기존 오리지널 BGM은 기본 켜짐이며 게임을 시작하는 사용자 입력으로 활성화한다. 명시적인 음소거 설정을 유지하고 일시정지·홈 이동에서는 이전 음악을 정지한다.
- 공개 HTML·JS·CSS·캐릭터·파이리·멤버 음성 등 **전체 12개 파일의 SHA-256이 CI 산출물과 일치**했다. 증적은 사용자 지정 iCloud 작업 루트 `rescene-game/game-carousel-deploy-20261002/`의 `site/`, `production-asset-hashes.json`, `public-browser/`에 보관한다.
- **실제 공개 주소에서 브라우저 115개 통과, 환경별 5개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 선택 슬라이드·신라빵 드래그/낙하/연쇄·제한시간 직전 클리어·중간 저장/복원·다섯 BGM 실제 출력과 정지/재개·기존 목숨/단계/멤버 음성을 확인했다. 모바일 Chromium은 CDP 터치 입력도 검증했다. 제외 항목은 CDP 터치 주입을 지원하지 않는 환경과 데스크톱 멀티터치 검사이며, 모바일 에뮬레이션은 실제 휴대폰 청음 검증을 의미하지 않는다.
- 기존 로그인 배포이며 CI 인증·자동 배포 설정은 변경하지 않았다. 별도 PR #8은 머지하지 않았다.

## 메이 뒤돌기·자체 BGM·펌프 박자·리브 진격대 운영 배포 — 2026-10-02

- 사용자 명시 승인 후 [PR #13](https://github.com/hhj4861/rescene-game/pull/13)을 머지했다. 운영 소스는 `f8f4c4a3b08ee8b830a7359cbdff4a7b6f100b7c`다.
- [PR CI 36955711764](https://github.com/hhj4861/rescene-game/actions/runs/36955711764)의 단위 29개·브라우저 95개(데스크톱 터치 전용 1개 제외)·린트·빌드가 통과했다. PR 커밋 `0ef129e`와 머지 커밋의 전체 Git 트리가 `a181b95fa625b89bcf55237136c1f5dfb1fc9d71`로 동일함을 확인하고 해당 `arcade-static-site` 산출물을 기존 Wrangler 로그인으로 배포했다. [머지 후 main CI 36971748473](https://github.com/hhj4861/rescene-game/actions/runs/36971748473)도 최종 성공했다.
- Pages 배포 `c0ccc027-0f1d-47fb-8c97-80bcd6a88d77`: **Production / main / source `f8f4c4a`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://c0ccc027.rescene-arcade.pages.dev).
- 메이는 이동 방향에 맞춰 캐릭터를 반전하고 X키·뒤돌기 버튼으로 제자리 반대쪽 공격을 지원한다. 게임별 자체 연주곡 5개를 기본 재생하며, 펌프는 120 BPM 음악과 같은 박자에 채보가 나온다. 리브는 숫자 게이트·대원 증가·자동 사격의 별빛 진격대로 교체했다. 지원 공격은 적 다섯 팀 격파 후에만 사용할 수 있다. [게임·음악 상세](../design/arcade-music.md).
- 기존 캐릭터·멤버 음성·단계·목숨·최고 기록은 유지한다. 이전 리브 설치 보드와 펌프 채보는 새 규칙으로 현재 단계부터 시작한다. 이번 BGM에는 상용 음원이나 외부 음악 샘플을 추가하지 않았다.
- 공개 HTML·JS·CSS·캐릭터·파이리·음성 등 **전체 12개 파일의 SHA-256이 배포한 CI 산출물과 일치**했다. 증적은 사용자 지정 iCloud 작업 루트 `rescene-game/arcade-music-deploy-20261002/`의 `site/`, `production-asset-hashes.json`, `public-browser/`에 보관한다.
- **실제 공개 주소에서 브라우저 95개 통과, 데스크톱 터치 전용 1개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 메이 뒤돌기·양방향 발사, BGM 실제 출력 신호·정지·재개, 펌프 박자 판정, 리브 게이트·자동 사격·지원 제한, 320×568 조작부와 기존 저장·목숨·멤버 음성을 확인했다. 모바일은 에뮬레이션이며 실기기 청음 검증은 아니다.
- 기존 로그인 배포이며 CI 배포 인증·자동 배포 설정은 변경하지 않았다. 별도 PR #8은 머지하지 않았다.

## 다섯 게임 개편·소리 기본 켜짐 운영 배포 — 2026-10-02

- 사용자 명시 승인 후 [PR #12](https://github.com/hhj4861/rescene-game/pull/12)를 머지했다. 운영 소스는 `56c637393ee60b49a2fa00d583a07e4e06e4c55d`다.
- [PR CI 36873421239](https://github.com/hhj4861/rescene-game/actions/runs/36873421239)의 단위 테스트 22개·브라우저 86개(데스크톱 터치 전용 1개 제외)·린트·빌드가 통과했다. 해당 커밋 `b6c2c40`과 머지 커밋의 전체 Git 트리가 `233ab0c718e7b84cbcc57e6754fd4aa6471fc3fa`로 동일함을 확인하고, 이 실행의 `arcade-static-site` 산출물을 기존 Wrangler 로그인으로 배포했다. 배포 시 main의 중복 CI는 브라우저 의존성 설치가 지연되고 있었다.
- Pages 배포 `be9fb440-875c-40db-848b-de380aba5f0d`: **Production / main / source `56c6373`**. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://be9fb440.rescene-arcade.pages.dev).
- 기존 멤버 캐릭터를 유지하며 원이 파이리 팡팡·메이 보글보글 공방·제나 신라빵·미나미 펌프 댄스타임·리브 별빛 디펜스로 교체했다. 효과음·실제 멤버 음성은 기본 켜짐이며 게임 시작 입력으로 오디오를 활성화한다. 목숨 3개·무한 스테이지·단계별 난이도·저장 기록을 유지한다. [게임 규칙과 저장 이전](../design/arcade-refresh.md).
- **실제 공개 주소에서 브라우저 검증 86개 통과, 데스크톱 터치 전용 1개 제외.** 데스크톱 Chromium·모바일 Chromium·모바일 WebKit에서 다섯 게임 입력·저장 복원·5→6단계·목숨 소진·동시 이동/점프·320×568 조작부·기본 효과음·다섯 MP3 신호와 재생/정지를 확인했다. 모바일은 에뮬레이션이며 실기기 청음 검증은 아니다.
- 공개 HTML·JS·CSS·캐릭터·파이리·음성 등 **전체 12개 파일의 SHA-256이 CI 배포 산출물과 일치**했다. 증적은 사용자 지정 iCloud 작업 루트 `rescene-game/arcade-deploy-20261002/`의 `production-asset-hashes.json`, `public-browser/`, `site/`에 보관한다.
- 기존 로그인으로 배포했으며 CI 배포 인증·자동 배포 설정을 추가하지 않았다. 별도 PR #8은 머지하지 않았다.
- 머지 후 [main CI 36952001379](https://github.com/hhj4861/rescene-game/actions/runs/36952001379)도 최종 성공했다. 브라우저 의존성 설치 지연 후 단위 테스트·린트·빌드·브라우저 검증·산출물 업로드를 모두 완료했다.

## 무한 스테이지·목숨 저장·무음 수정 운영 배포 — 2026-10-01

- 사용자 명시 승인 후 [PR #11](https://github.com/hhj4861/rescene-game/pull/11)을 머지했다. 운영 소스는 `394a305a782510f7f46b23dee450f9de913689d6`이다.
- [main CI 36857833806](https://github.com/hhj4861/rescene-game/actions/runs/36857833806)의 단위 테스트 39개·브라우저 78개·린트·빌드 통과 후, 해당 `arcade-static-site` 산출물을 기존 Wrangler 로그인으로 배포했다. 내려받은 MP3 다섯 개가 머지된 소스의 수정 파일과 같은지도 SHA-256으로 확인했다.
- Pages 배포 `8d828705-8ece-46a7-8e57-749e62fe88c4`: Production / main / source `394a305`. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://8d828705.rescene-arcade.pages.dev).
- 멤버별 목숨 3개로 6단계 이후에도 진행한다. 단계별 난이도가 증가하고 현재 단계·남은 목숨·최고 도달 단계를 저장한다. 기존 5단계 완료 저장은 6단계로 이관하며, 새 도전은 1단계부터 시작한다. [게임 규칙](../design/endless-survival.md).
- 이전 `f7037308` 배포의 MP3 다섯 개는 무음이었다. 당시 디코딩·재생 시간·파일 해시 검사는 가청성을 검증하지 못했다. 원본 구간 추출 순서를 수정하고 캐시 버전을 올렸으며, 실제 디코딩 샘플의 peak·RMS·유효 샘플 검사를 추가했다. [원인과 수정](../design/member-voices.md).
- 최신 main을 기존 공개 검증 브랜치에 통합했다(`67cb32e`). [공개 검증 36858323059](https://github.com/hhj4861/rescene-game/actions/runs/36858323059) **81개가 모두 통과했다**. 세 브라우저에서 5→6단계, 목숨 소진·저장 복원, 다섯 MP3의 실제 디코딩 신호·재생·정지를 확인했다. HTML·JS·CSS·캐릭터 2개·음성 5개의 SHA-256을 내려받은 main CI 산출물과 대조해 모두 일치했다. 모바일 WebKit 캡처에서 6단계·목숨 2개 및 메이 클리어 화면을 확인했다. 실기기 스피커 청음은 미수행이다.
- [공개 검증 브랜치의 정적 CI 36858328688](https://github.com/hhj4861/rescene-game/actions/runs/36858328688)도 성공했다. PR #8 자체는 승인 전이므로 머지하지 않았다.
- 배포 산출물과 후속 검증 증적은 iCloud 작업 루트 `rescene-game/endless-deploy-20261001/`에 보관한다. CI 배포용 인증이나 자동 배포를 추가한 것은 아니다.

## 멤버 유행어·실제 음성 운영 배포 — 2026-10-01

- 사용자 명시 승인 후 [PR #10](https://github.com/hhj4861/rescene-game/pull/10)을 머지했다. 운영 코드: `93b2726b09df700d89b14ebf7a5878f59d887424`.
- [main CI 36840623288](https://github.com/hhj4861/rescene-game/actions/runs/36840623288): 단위 테스트 29개·브라우저 69개·린트·빌드 통과. 이 실행의 `arcade-static-site` 산출물을 그대로 기존 Wrangler 로그인으로 배포했다.
- Pages: `f7037308-48c8-4ca7-b1d8-d81aa2338069`, Production / main / source `93b2726`. [운영 게임](https://rescene-arcade.pages.dev/), [고정 배포](https://f7037308.rescene-arcade.pages.dev).
- 수집한 유행어·게임용 각색과 짧은 실제 음성 5개를 연결했다. 기본 무음이며 각 게임의 ‘멤버 음성 켜기’에서 미리 듣고 클리어 때 자동 재생한다. 결과 화면의 다시 듣기·정지·출처 확인도 지원한다. 녹음에는 원본 방송의 배경음·웃음이 포함된다.
- 기존 캐릭터·줄 완성 윙크·저장·단계별 난이도는 유지한다. 실제 멤버의 새 대사를 합성한 것이 아니며, 각색 자막과 녹음 원문은 구분해 표시한다. [원본 구간과 검수 한계](../design/member-voices.md).
- 공개 검증 **72개 통과**: [36841178739](https://github.com/hhj4861/rescene-game/actions/runs/36841178739). 승인된 main을 기존 공개 검증 브랜치에 통합하고 음성 파일의 해시 검사도 추가했다(`ca8c366`). PR #8 자체는 별도 승인 전이므로 머지하지 않았다.
- 세 브라우저(데스크톱 Chromium·모바일 Chromium·모바일 WebKit)에서 다섯 음성의 실제 디코딩·재생 시간 진행, 다시 듣기·정지·화면 이동 시 취소, 저장·스테이지 기능을 확인했다. HTML·JS·CSS·캐릭터 2개·음성 5개의 SHA-256을 배포한 CI 산출물과 대조했다. 실기기 스피커 청음 검증은 아니다.
- [공개 검증 브랜치의 정적 CI 36841185958](https://github.com/hhj4861/rescene-game/actions/runs/36841185958)도 성공했다.
- 배포 산출물과 검증 증적은 iCloud 작업 루트 `rescene-game/member-voices-deploy-20261001/`에 보관한다. CI 배포 자격 설정이나 자동 배포 연결을 추가한 것은 아니다.

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
