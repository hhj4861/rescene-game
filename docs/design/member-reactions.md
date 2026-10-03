# 멤버 반응과 리브 노래 아이템

2026-10-03 구현. 운영 반영 전 작업 브랜치에서 검증한다.

- 일반 성공·아이템 획득은 멤버별 서로 다른 짧은 반응 3개를 순환한다. 순환 위치와 4초 간격은 일시정지/스테이지 이동에도 유지한다. 재생 중인 반응은 끊거나 예약하지 않는다.
- 감탄사와 짧은 긍정 표현을 함께 사용한다. 모든 파일이 순수 의성어인 것은 아니다. 실패에 긍정 반응을 붙이지 않는다. 미나미는 음악을 가리지 않도록 8콤보마다 반응 후보를 요청한다.
- 기존 유행어는 자동 스테이지 클리어와 사용자가 누른 결과 화면 다시 듣기에만 사용한다. 음성 켜기 미리듣기도 일반 반응을 사용한다.
- 리브 음표 요정은 공식 단독 커버의 4.4초 구간을 재생한다. 일반 반응보다 우선하며 같은 노래는 12초 안에 다시 시작하지 않는다. 모든 멤버 음성 재생 중 BGM을 20%로 낮추고 종료·실패·정지 때 복구한다.
- 음성 끄기, 일시정지, 홈 이동, 백그라운드 전환은 재생을 정지한다. 저장된 아이템을 이어 불러와도 음성을 다시 재생하지 않는다. 실제 웹 브라우저 자동재생 허용 여부에 따라 재생이 거절될 수 있으며 게임 진행은 유지한다.
- 제나: 반 칸 이상 드래그하면 손을 떼기 전에 교환을 확정한다. 같은 드래그의 추가 이동·손 떼기·클릭은 교환을 중복 실행하지 않는다. 유효하지 않은 교환은 돌아오며 이동 횟수를 차감하지 않는다.

## 원본과 구간

원본 공개 영상의 이름 소개/화자 자막/발화 화면과 자막·로컬 Whisper를 대조해 후보를 선정했다. 짧은 감탄사 자동 인식과 화자 구분은 완전하지 않으므로 표의 표현은 구간 식별용이며 정밀 전사가 아니다. 최종 청취 판단은 미리보기에서 확인할 수 있다. 배경음이 포함된 원본 구간이며 음성 합성·복제는 사용하지 않았다. 출처 기록 자체가 재사용 허락을 의미하지는 않는다.

|멤버|반응/노래|원본 초 구간|파일·출처|
|---|---|---|---|
|liv|오|921.43–921.95|[liv-reaction-1.mp3](https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=921s)|
|liv|오케이|1075.15–1076.15|[liv-reaction-2.mp3](https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1075s)|
|liv|오, 브레인|1481.3–1482.65|[liv-reaction-3.mp3](https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1481s)|
|liv|내 남자 친구에게 · 짧은 커버 구간|20.5–24.9|[liv-song-note.mp3](https://www.youtube.com/watch?v=O0BVlom5poY&t=20s)|
|may|어|1064.85–1065.35|[may-reaction-1.mp3](https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1064s)|
|may|음|1302.02–1302.65|[may-reaction-2.mp3](https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1302s)|
|may|예뻐요|596.15–597.4|[may-reaction-3.mp3](https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=596s)|
|minami|오케이|451.53–452.2|[minami-reaction-1.mp3](https://www.youtube.com/watch?v=OrCOflk2QmQ&t=451s)|
|minami|와|1315.12–1315.72|[minami-reaction-2.mp3](https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1315s)|
|minami|야하|1619.64–1620.5|[minami-reaction-3.mp3](https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1619s)|
|woni|호잇|802.64–803.36|[woni-reaction-1.mp3](https://www.youtube.com/watch?v=OrCOflk2QmQ&t=802s)|
|woni|음|1337.2–1337.85|[woni-reaction-2.mp3](https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1337s)|
|woni|오|1490.35–1491.03|[woni-reaction-3.mp3](https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1490s)|
|zena|성공했습니다|898.32–899.23|[zena-reaction-1.mp3](https://www.youtube.com/watch?v=NS7tSrMrWsc&t=898s)|
|zena|맛있네|1042.97–1043.82|[zena-reaction-2.mp3](https://www.youtube.com/watch?v=NS7tSrMrWsc&t=1042s)|
|zena|꿀맛이야|1047.87–1048.68|[zena-reaction-3.mp3](https://www.youtube.com/watch?v=NS7tSrMrWsc&t=1047s)|

## 검증 범위

- 단위: 반응 순환·4초 간격·억제된 이벤트 처리, 노래 우선순위·12초 제한, BGM 감쇠와 종료/실패 복구.
- 브라우저: 실제 MP3 디코딩·무음 검출·파일 중복 검출, 아이템 노래와 BGM 감쇠, 음성 끄기·저장 재개, 클리어 원본과 다시 듣기.
- 제나 마우스 및 Chromium 네이티브 터치 이동 중 즉시 교환/터짐, 이동 횟수 중복 차감 방지, 낙하·저장. WebKit은 자동화된 포인터 검증이며 실물 iPhone 청취/터치 확인을 대신하지 않는다.

## 실행 결과 (로컬 최종 빌드)

- `npm test`: 59 통과. `npm run lint`, `npm run build`: 통과.
- Playwright desktop Chromium / mobile Chromium / mobile WebKit: 181 통과, 플랫폼 전용 5 건너뜀. 처음 3개 환경에서 노래 정지 후 GainNode 보간 값이 남는 검증 실패를 발견했고, 정지 시 즉시 볼륨 1로 초기화하여 재실행에서 통과했다.
- MP3 16개(반응 15 + 노래 1)의 실제 디코딩·유효 파형과 서로 다른 파일 해시를 확인했다. 이 수치 검증은 화자 식별이나 사람이 듣는 자연스러움의 최종 검수를 대신하지 않는다.
- 산출물: 지정 iCloud 작업 루트의 `rescene-game/member-reactions-20261003/` (`unit.log`, `browser-fixed.log`, `browser-fixed/`, `build-fixed/`). 로컬 미리듣기는 `http://127.0.0.1:4350/voice-review.html`이며 서버 실행 중 이 Mac에서만 사용한다.

Linux CI 첫 실행은 180 통과 / 1 실패 / 5 건너뜀이었다. 실패는 WebKit에서 모든 음원이 멈춘 뒤 마지막 렌더링된 AudioParam 값이 남아 있는 상태를 검사한 항목이다. 정지 시 실제 미디어가 멈추는 검사는 유지하고, 볼륨 1 복구 검사는 재개하여 BGM 그래프가 다시 렌더링되는 시점에 수행하도록 수정했다. 이 변경은 음원 재생을 스텁으로 바꾸거나 허용 오차를 완화하지 않는다.
