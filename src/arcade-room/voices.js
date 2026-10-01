// Short, unaltered member performances from MBC's catchphrase introductions.
// Source intervals and verification limits: docs/design/member-voices.md.
const source='https://www.youtube.com/watch?v=pWTBJV0OrqU';
export const VOICES={
  woni:{file:'./voices/woni.mp3?v=2',spoken:'오이쉬에~',start:145.1,end:146.9},
  may:{file:'./voices/may.mp3?v=2',spoken:'전참시 그립감 좋다~',start:189.1,end:192},
  zena:{file:'./voices/zena.mp3?v=2',spoken:'내는 원래 전참시를 싸랑해~',start:152.75,end:155.55},
  minami:{file:'./voices/minami.mp3?v=2',spoken:'에~ 거제~ 야호!',start:137.25,end:140},
  liv:{file:'./voices/liv.mp3?v=2',spoken:'너도? 아 나도~',start:177.7,end:179.9},
};
for(const voice of Object.values(VOICES))voice.source=`${source}&t=${Math.floor(voice.start)}s`;
