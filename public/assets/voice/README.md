# 음성 파일 슬롯

파일 이름은 `<유행어id>.ogg` 또는 `<유행어id>.mp3`여야 한다(유행어 id는 `src/data/memes.ts` 참조, 예: `woni_ui.ogg`).
권리를 확보한 파일(소속사 제공·직접 녹음)만 넣는다. 원본 음성·영상을 복제한 파일은 넣지 않는다.
이 폴더의 `.ogg`·`.mp3` 파일은 저장소에 커밋하지 않는다(`.gitignore` 참고). `manifest.json`만 커밋한다.
파일을 추가·삭제한 뒤에는 `npm run voice`로 `manifest.json`을 다시 생성해야 Preload가 인식한다.
manifest에 없는 파일은 로드되지 않고, 없는 유행어는 기존처럼 합성 블립으로 대체된다.
