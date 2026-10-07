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

// Ordinary reactions are separate recordings, never the stage-clear catchphrases.
export const REACTION_VOICES={
  "woni": [
    {
      "file": "./voices/woni-reaction-1.mp3",
      "spoken": "호잇",
      "start": 802.64,
      "end": 803.36,
      "source": "https://www.youtube.com/watch?v=OrCOflk2QmQ&t=802s"
    },
    {
      "file": "./voices/woni-reaction-2.mp3",
      "spoken": "음",
      "start": 1337.2,
      "end": 1337.85,
      "source": "https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1337s"
    },
    {
      "file": "./voices/woni-reaction-3.mp3",
      "spoken": "오",
      "start": 1490.35,
      "end": 1491.03,
      "source": "https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1490s"
    }
  ],
  "may": [
    {
      "file": "./voices/may-reaction-1.mp3",
      "spoken": "어",
      "start": 1064.85,
      "end": 1065.35,
      "source": "https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1064s"
    },
    {
      "file": "./voices/may-reaction-2.mp3",
      "spoken": "음",
      "start": 1302.02,
      "end": 1302.65,
      "source": "https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1302s"
    },
    {
      "file": "./voices/may-reaction-3.mp3",
      "spoken": "예뻐요",
      "start": 596.15,
      "end": 597.4,
      "source": "https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=596s"
    }
  ],
  "zena": [
    {
      "file": "./voices/zena-reaction-1.mp3",
      "spoken": "성공했습니다",
      "start": 898.32,
      "end": 899.23,
      "source": "https://www.youtube.com/watch?v=NS7tSrMrWsc&t=898s"
    },
    {
      "file": "./voices/zena-reaction-2.mp3",
      "spoken": "맛있네",
      "start": 1042.97,
      "end": 1043.82,
      "source": "https://www.youtube.com/watch?v=NS7tSrMrWsc&t=1042s"
    },
    {
      "file": "./voices/zena-reaction-3.mp3",
      "spoken": "꿀맛이야",
      "start": 1047.87,
      "end": 1048.68,
      "source": "https://www.youtube.com/watch?v=NS7tSrMrWsc&t=1047s"
    }
  ],
  "minami": [
    {
      "file": "./voices/minami-reaction-1.mp3",
      "spoken": "오케이",
      "start": 451.53,
      "end": 452.2,
      "source": "https://www.youtube.com/watch?v=OrCOflk2QmQ&t=451s"
    },
    {
      "file": "./voices/minami-reaction-2.mp3",
      "spoken": "와",
      "start": 1315.12,
      "end": 1315.72,
      "source": "https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1315s"
    },
    {
      "file": "./voices/minami-reaction-3.mp3",
      "spoken": "야하",
      "start": 1619.64,
      "end": 1620.5,
      "source": "https://www.youtube.com/watch?v=OrCOflk2QmQ&t=1619s"
    }
  ],
  "liv": [
    {
      "file": "./voices/liv-reaction-1.mp3",
      "spoken": "오",
      "start": 921.43,
      "end": 921.95,
      "source": "https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=921s"
    },
    {
      "file": "./voices/liv-reaction-2.mp3",
      "spoken": "오케이",
      "start": 1075.15,
      "end": 1076.15,
      "source": "https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1075s"
    },
    {
      "file": "./voices/liv-reaction-3.mp3",
      "spoken": "오, 브레인",
      "start": 1481.3,
      "end": 1482.65,
      "source": "https://www.youtube.com/watch?v=5JZ5biQ_hMI&t=1481s"
    }
  ]
};
export const LIV_SONG={
  "file": "./voices/liv-song-note.mp3",
  "spoken": "내 남자 친구에게 · 짧은 커버 구간",
  "start": 20.5,
  "end": 24.9,
  "source": "https://www.youtube.com/watch?v=O0BVlom5poY&t=20s"
};

// Individual members singing in official YouTube covers/challenge, not group-song substitutes.
export const SCORE_SONGS={
 minami:{kind:'song',external:true,title:'TITANIUM',source:'https://www.youtube.com/watch?v=AhJb7wPiOjQ'},
 woni:{kind:'song',file:'./voices/woni-song.mp3?v=full',title:'여름아 부탁해',start:0,end:41,loop:false,itemSeconds:41,source:'https://www.youtube.com/watch?v=l2GnjywCPjE'},
 may:{kind:'song',file:'./voices/may-song.mp3',title:'Put Your Records On',start:10,end:13.5,source:'https://www.youtube.com/watch?v=c13--HEy_8U&t=10s'},
 zena:{kind:'song',file:'./voices/zena-song.mp3',title:'Life’s Too Short',start:10,end:13.5,source:'https://www.youtube.com/watch?v=OybCC65kqEw&t=10s'},
 liv:{...LIV_SONG,kind:'song',title:'내 남자 친구에게'},
};
