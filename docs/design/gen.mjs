// 리센느스토리 캐릭터 시안 생성기: ASCII 픽셀 템플릿 → SVG → .dc.html 아트보드 3장 + canvas.json
import { writeFileSync } from 'node:fs';

// ---------- 픽셀 템플릿 (K 외곽선, H/h 머리, S/s 피부, E 눈, W 하이라이트, T/t 상의, B/b 하의, O 신발, A 포인트, M 금속) ----------
const check = (name, rows, w) => { rows.forEach((r, i) => { if (r.length !== w) throw new Error(`${name} row ${i} has ${r.length} != ${w}`); }); return rows; };

// 16×24 (2등신) 기본 몸
const MINI_BODY = check('mini', [
  '......KKKK......',
  '....KKSSSSKK....',
  '...KSSSSSSSSK...',
  '..KSSSSSSSSSSK..',
  '..KSSSSSSSSSSK..',
  '..KSSSESSESSSK..',
  '..KSSSSSSSSSSK..',
  '..KSsSSSSSSsSK..',
  '...KSSSSSSSSK...',
  '....KSSSSSSK....',
  '.....KKKKKK.....',
  '......KTTK......',
  '....KKTTTTKK....',
  '...KTTTTTTTTK...',
  '..KTTTTTTTTTTK..',
  '..KSKTTAATTKSK..',
  '..KKKTTTTTTKKK..',
  '....KTTTTTTK....',
  '....KBBBBBBK....',
  '....KBBBBBBK....',
  '....KBBKKBBK....',
  '....KBBKKBBK....',
  '....KOOKKOOK....',
  '....KKKKKKKK....',
], 16);

const MINI_HAIR = {
  long: check('mini.long', [
    '.....KKKKKK.....', '....KHHHHHHK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', '.KHHHHhHHHhHHHK.',
    '.KHHK......KHHK.', '.KHHK......KHHK.', '.KHHK......KHHK.', '.KHHK......KHHK.', '.KHHK......KHHK.',
    '.KhHK......KHhK.', '.KHHK......KHHK.', '.KHHK......KHHK.', '..KK........KK..',
  ], 16),
  bob: check('mini.bob', [
    '.....KKKKKK.....', '....KHHHHHHK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', '.KHHHHhHHHhHHHK.',
    '.KHHK......KHHK.', '.KHHK......KHHK.', '.KHHK......KHHK.', '.KHhK......KhHK.', '..KKK......KKK..',
  ], 16),
  wavy: check('mini.wavy', [
    '.....KKKKKK.....', '....KHHHHHHK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', '.KHHHHHHhHHHHHK.',
    '.KHhK......KhHK.', '.KHHK......KHHK.', '.KhHK......KHhK.', '.KHHK......KHHK.', '.KHhK......KhHK.',
    'KHHHK......KHHHK', 'KhHHK......KHHhK', 'KHHHK......KHHHK', '.KKK........KKK.',
  ], 16),
  short: check('mini.short', [
    '.....KKKKKK.....', '....KHHHHHHK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', '.KHHHhHHHHhHHHK.',
    '.KHHK......KHHK.', '.KHHK......KHHK.', '..KKK......KKK..',
  ], 16),
  twin: check('mini.twin', [
    '.....KKKKKK.....', '....KHHHHHHK....', '...KHHHHHHHHK...', '..KHHHHHHHHHHK..', 'RHHHHHhHHHhHHHHR',
    'KH............HK', 'KH............HK', 'KH............HK', 'KH............HK', 'KH............HK',
    'KH............HK', 'KH............HK', 'KH............HK', 'KK............KK',
  ], 16),
};

// 24×40 (2.5등신) 기본 몸 — 바지
const BIG_BODY = check('big', [
  '........KKKKKKKK........',
  '......KKSSSSSSSSKK......',
  '.....KSSSSSSSSSSSSK.....',
  '....KSSSSSSSSSSSSSSK....',
  '....KSSSSSSSSSSSSSSK....',
  '...KSSSSSSSSSSSSSSSSK...',
  '...KSSSSSSSSSSSSSSSSK...',
  '...KSSSSEESSSSEESSSSK...',
  '...KSSSSEWSSSSEWSSSSK...',
  '...KSsSSSSSSSSSSSSsSK...',
  '...KSSSSSSSSSSSSSSSSK...',
  '....KSSSSSSSSSSSSSSK....',
  '....KSSSSSSKKSSSSSSK....',
  '.....KSSSSSSSSSSSSK.....',
  '......KSSSSSSSSSSK......',
  '.......KKKKKKKKKK.......',
  '.........KSSSSK.........',
  '.......KKKTTTTKKK.......',
  '.....KKTTTTTTTTTTKK.....',
  '....KTTTTTTTTTTTTTTK....',
  '...KTTTTTTTTTTTTTTTTK...',
  '...KTTKTTTTTTTTTTKTTK...',
  '...KTTKTTTTTTTTTTKTTK...',
  '...KTTKTTAAAAAATTKTTK...',
  '...KSSKTTTTTTTTTTKSSK...',
  '...KSSKTTTTTTTTTTKSSK...',
  '...KKKKTTTTTTTTTTKKKK...',
  '......KTTTTTTTTTTK......',
  '......KttttttttttK......',
  '......KBBBBBBBBBBK......',
  '......KBBBBBBBBBBK......',
  '......KBBBBBBBBBBK......',
  '......KBBBBKKBBBBK......',
  '......KBBBBKKBBBBK......',
  '......KBBBBKKBBBBK......',
  '......KbbbbKKbbbbK......',
  '......KBBBBKKBBBBK......',
  '......KOOOOKKOOOOK......',
  '......KOOOOKKOOOOK......',
  '......KKKKKKKKKKKK......',
], 24);

// 치마 버전: 29~39행 교체
const BIG_SKIRT_TAIL = check('big.skirt', [
  '......KBBBBBBBBBBK......',
  '.....KBBBBBBBBBBBBK.....',
  '.....KBbBBBBBBBBbBK.....',
  '....KBBBBBBBBBBBBBBK....',
  '....KKKKKKKKKKKKKKKK....',
  '......KSSSSKKSSSSK......',
  '......KSSSSKKSSSSK......',
  '......KSSSSKKSSSSK......',
  '......KOOOOKKOOOOK......',
  '......KOOOOKKOOOOK......',
  '......KKKKKKKKKKKK......',
], 24);
const BIG_BODY_SKIRT = [...BIG_BODY.slice(0, 29), ...BIG_SKIRT_TAIL];

const BIG_HAIR = {
  long: check('big.long', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHHHHHhHHHHHHHHK...', '..KHHHHHHHHHHHhHHHHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '...KKK............KKK...',
  ], 24),
  bob: check('big.bob', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHHHHHhHHHHHHHHK...', '..KHHHHHHHHHHHhHHHHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '...KKK............KKK...',
  ], 24),
  wavy: check('big.wavy', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHhHHHHHHHHhHHHK...', '..KHHHHHHHHHhHHHHHHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '..KhHHK..........KHHhK..', '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '..KHHHK..........KHHHK..',
    '.KHHHHK..........KHHHHK.', '.KhHHHK..........KHHHhK.', '.KHHHHK..........KHHHHK.', 'KHHhHHK..........KHHhHHK',
    'KHHHHHK..........KHHHHHK', 'KhHHHHK..........KHHHHhK', 'KHHHHHK..........KHHHHHK', '.KKKKK............KKKKK.',
  ], 24),
  short: check('big.short', [
    '........KKKKKKKK........', '......KKHHHHHHHHKK......', '.....KHHHHHHHHHHHHK.....', '....KHHHHHHHHHHHHHHK....',
    '...KHHHHhHHHHHHhHHHHK...', '..KHHHHHHHHHHHhHHHHHHK..', '..KHHHK..........KHHHK..', '..KHHHK..........KHHHK..',
    '..KHHHK..........KHHHK..', '..KHhHK..........KHhHK..', '...KKK............KKK...',
  ], 24),
};
// twin은 손으로 다듬는다: 머리 위 짧은 머리 + 양옆 트윈테일(0~2열/21~23열) + 리본(A/W)
BIG_HAIR.twin = check('big.twin', [
  '........KKKKKKKK........',
  '......KKHHHHHHHHKK......',
  '.....KHHHHHHHHHHHHK.....',
  '....KHHHHHHHHHHHHHHK....',
  '.RRKHHHHHHhHHHHHHHHKRR..',
  'RWRKHHHHHHHHHHhHHHHKRWR.',
  '.RRK................KRR.',
  'KHHK................KHHK',
  'KHHK................KHHK',
  'KHhK................KhHK',
  'KHHK................KHHK',
  'KHHK................KHHK',
  'KHHK................KHHK',
  'KHhK................KhHK',
  'KHHK................KHHK',
  'KHHK................KHHK',
  'KHHK................KHHK',
  'KHHK................KHHK',
  'KHHK................KHHK',
  '.KK..................KK.',
], 24);

// 소품 오버레이 (24×40 좌표계)
const PROPS = {
  micstand: check('prop.micstand', [
    ...Array(13).fill('........................'),
    '.....................KKK',
    '.....................KMK',
    '.....................KKK',
    '......................M.',
    ...Array(21).fill('......................M.'),
    '.....................MMM',
  ], 24),
  handmic: check('prop.handmic', [
    ...Array(20).fill('........................'),
    '..................KKK...',
    '..................KMK...',
    '..................KKK...',
    '...................M....',
    '...................M....',
    ...Array(15).fill('........................'),
  ], 24),
  brush: check('prop.brush', [
    ...Array(15).fill('........................'),
    '.....................KK.',
    '.....................KK.',
    '.....................P..',
    '....................P...',
    '....................P...',
    '....................P...',
    '...................P....',
    '...................P....',
    '...................P....',
    '...................P....',
    '..................P.....',
    ...Array(14).fill('........................'),
  ], 24),
  keyring: check('prop.keyring', [
    ...Array(28).fill('........................'),
    '.................M......',
    '.................M......',
    '................AWA.....',
    '................AAA.....',
    ...Array(8).fill('........................'),
  ], 24),
  none: Array(40).fill('........................'),
};

// ---------- 멤버 ----------
const MEMBERS = [
  { id: 'woni', name: '원이', role: '리더 · 서브보컬', hometown: '거제', hair: 'long',  hairColor: ['#2b2330', '#3d3345'], color: '#0f9d6e', shade: '#0b7452', prop: 'micstand', propNote: '마이크 스탠드' },
  { id: 'liv',  name: '리브', role: '메인보컬',        hometown: '수원', hair: 'bob',   hairColor: ['#f3b4c6', '#d98aa3'], color: '#ff8fb1', shade: '#d96e91', prop: 'handmic',  propNote: '핸드 마이크' },
  { id: 'minami', name: '미나미', role: '메인보컬 · 메인댄서', hometown: '치바', hair: 'wavy', hairColor: ['#d9a25b', '#b5813f'], color: '#ffd166', shade: '#d9ad4a', prop: 'brush', propNote: '붓 (서예 8년)' },
  { id: 'may',  name: '메이', role: '서브보컬 · 킬링파트', hometown: '고양', hair: 'short', hairColor: ['#4a3327', '#5d4436'], color: '#ff9e64', shade: '#d97f4b', prop: 'keyring', propNote: '키링 · 스티커' },
  { id: 'zena', name: '제나', role: '메인댄서 · 리드보컬', hometown: '경주', hair: 'twin',  hairColor: ['#1f1a24', '#312a3a'], color: '#bb9af7', shade: '#957ad1', prop: 'none', propNote: '리본 헤어핀 (신라공주)' },
];

// ---------- 방향별 팔레트 ----------
const DIRS = {
  A: { bg: '#f6f1e7', panel: '#ffffff', ink: '#2a2438', outline: '#3b2f2f', skin: '#f8d9c4', skinShade: '#e9b8a0', white: '#ffffff', metal: '#8d8fa0',
       accent: '#e85d75', memberTint: 0.35, muted: '#7a7286' },
  B: { bg: '#1a1b26', panel: '#24283b', ink: '#e6e0ff', outline: '#12131c', skin: '#f2cfb3', skinShade: '#d9a98b', white: '#ffffff', metal: '#9aa3c7',
       accent: '#7dcfff', memberTint: 0, muted: '#a9b1d6' },
  C: { bg: '#efeae2', panel: '#f8f5ef', ink: '#2f2b33', outline: null, skin: '#f1d4bf', skinShade: '#f1d4bf', white: '#ffffff', metal: '#a2a2ad',
       accent: '#c9553e', memberTint: 0.2, muted: '#7d7782' },
};

const mix = (hex, toward, t) => {
  const a = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  const b = toward.match(/\w\w/g).map((x) => parseInt(x, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

function paletteFor(dir, m, outfit) {
  const d = DIRS[dir];
  const tint = (c) => (d.memberTint ? mix(c, '#ffffff', d.memberTint) : c);
  const base = {
    K: d.outline, H: tint(m.hairColor[0]), h: dir === 'C' ? tint(m.hairColor[0]) : tint(m.hairColor[1]),
    S: d.skin, s: d.skinShade, E: d.outline ?? '#2f2b33', W: d.white, M: d.metal,
    T: tint(m.color), t: dir === 'C' ? tint(m.color) : tint(m.shade), B: dir === 'B' ? '#2c3150' : (dir === 'A' ? '#5d6b8c' : '#6b6f85'), b: dir === 'B' ? '#22263f' : (dir === 'A' ? '#4b5876' : '#6b6f85'),
    O: dir === 'B' ? '#e6e0ff' : '#ffffff', A: '#ffffff', P: '#a0522d', R: '#f7768e',
  };
  if (outfit === 'debut') Object.assign(base, { T: '#f4f1f7', t: '#d9d3e6', B: '#16141c', b: '#0d0c12', O: '#16141c', A: '#c9b6ff' });
  if (outfit === 'pretty') Object.assign(base, { T: '#ffe3ee', t: '#f4b8cd', B: '#ff7fae', b: '#e0679a', O: '#ffffff', A: '#ffd166' });
  return base;
}

// 여러 레이어를 합쳐 SVG rect 생성 (행 단위 런 병합)
function renderSvg(layers, pal, w, h, scale, opts = {}) {
  const grid = Array.from({ length: h }, () => Array(w).fill('.'));
  for (const layer of layers) layer.forEach((row, y) => { if (y >= h) return; [...row].forEach((ch, x) => { if (ch !== '.') grid[y][x] = ch; }); });
  let rects = '';
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const ch = grid[y][x];
      let x2 = x;
      while (x2 + 1 < w && grid[y][x2 + 1] === ch) x2++;
      const fill = pal[ch];
      if (ch !== '.' && fill) rects += `<rect x="${x}" y="${y}" width="${x2 - x + 1}" height="1" fill="${fill}"></rect>`;
      x = x2 + 1;
    }
  }
  const title = opts.title ? `<title>${opts.title}</title>` : '';
  return `<svg viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" role="img" style="display: block; image-rendering: pixelated">${title}${rects}</svg>`;
}

function sprite(dir, m, { outfit = 'training', big = dir === 'B', scale } = {}) {
  const pal = paletteFor(dir, m, outfit);
  if (big) {
    const body = outfit === 'training' ? BIG_BODY : BIG_BODY_SKIRT;
    return renderSvg([body, BIG_HAIR[m.hair], PROPS[m.prop]], pal, 24, 40, scale ?? 4, { title: `${m.name} 스프라이트` });
  }
  return renderSvg([MINI_BODY, MINI_HAIR[m.hair]], pal, 16, 24, scale ?? 5, { title: `${m.name} 스프라이트` });
}

// ---------- 타일 ----------
const TILES = {
  A: {
    ground: check('A.ground', ['LLlLLLLLLlLLLLLL', 'LLLLLLlLLLLLLlLL', 'LLLLLLLLLLLLLLLL', 'DDDDDDDDDDDDDDDD', 'DDdDDDDDDDDdDDDD', 'DDDDDDDdDDDDDDDD', 'DDDDDDDDDDDDDDDD', 'DdDDDDDDDDDDDdDD',
      'DDDDDDDDdDDDDDDD', 'DDDDDdDDDDDDDDDD', 'DDDDDDDDDDDdDDDD', 'DDdDDDDDDDDDDDDD', 'DDDDDDDDDDDDDDDD', 'DDDDDDdDDDDDDDDD', 'DDDDDDDDDDDDDdDD', 'DDDDDDDDDDDDDDDD'], 16),
    pal: { L: '#8fd16a', l: '#c8ee9a', D: '#b8834f', d: '#8f6238', P: '#ffd7a3', p: '#d3a06c', R: '#e6b57a', r: '#b9884f' },
  },
  B: {
    ground: check('B.ground', ['GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'gggggggggggggggg', 'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'gggggggggggggggg',
      'GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'GGGGGGGgGGGGGGGG', 'gggggggggggggggg', 'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'GGGgGGGGGGGGGgGG', 'gggggggggggggggg'], 16),
    pal: { G: '#3b4261', g: '#2a2f47', P: '#9ece6a', p: '#4f6b2f', R: '#e0af68', r: '#a97f3f' },
  },
  C: {
    ground: check('C.ground', ['gggggggggggggggg', 'gggggggggggggggg', ...Array(14).fill('GGGGGGGGGGGGGGGG')], 16),
    pal: { G: '#8b8fa3', g: '#6f7389', P: '#b7c98a', p: '#8fa565', R: '#d8b57f', r: '#b08f5e' },
  },
};
const PLATFORM = check('platform', ['PPPPPPPPPPPPPPPP', 'PPPPPPPPPPPPPPPP', 'pppppppppppppppp', 'pppppppppppppppp', 'pppppppppppppppp', 'pppppppppppppppp'], 16);
const LADDER = check('ladder', ['...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...', '...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...',
  '...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...', '...RR......RR...', '...RR......RR...', '...RRRRRRRRRR...', '...RrrrrrrrrR...'], 16);

function tileSvg(dir, which, scale = 4) {
  const t = TILES[dir];
  if (which === 'ground') return renderSvg([t.ground], t.pal, 16, 16, scale);
  if (which === 'platform') return renderSvg([PLATFORM], t.pal, 16, 6, scale);
  return renderSvg([LADDER], t.pal, 16, 16, scale);
}

// ---------- 공통 HTML 조각 ----------
const HEAD = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Do+Hyeon&amp;family=Noto+Sans+KR:wght@400;500;700&amp;display=swap">
  <style>
    body { margin: 0; font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; }
    a { color: #7dcfff; } a:hover { color: #b4f9f8; }
  </style>
</helmet>`;
const TAIL = `</x-dc>
</body>
</html>`;

const swatch = (hex, label, ink) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 64px"><div style="width: 40px; height: 40px; border-radius: 8px; background: ${hex}; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15)"></div><div style="font-size: 11px; color: ${ink}; text-align: center; line-height: 1.3">${label}</div></div>`;

function memberCard(dir, m, big) {
  const d = DIRS[dir];
  return `<div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px 12px; background: ${d.panel}; border-radius: 12px; min-width: 150px">
      <div style="display: flex; align-items: flex-end; justify-content: center; height: 168px">${sprite(dir, m, { big })}</div>
      <div style="font-family: 'Do Hyeon', 'Noto Sans KR', sans-serif; font-size: 22px; color: ${d.ink}">${m.name}</div>
      <div style="font-size: 12px; color: ${d.muted}; text-align: center">${m.role}</div>
      <div style="display: flex; gap: 6px"><div style="width: 18px; height: 18px; border-radius: 4px; background: ${m.hairColor[0]}"></div><div style="width: 18px; height: 18px; border-radius: 4px; background: ${m.color}"></div></div>
    </div>`;
}

// ---------- Main (B안, 추천) ----------
const dB = DIRS.B;
const woni = MEMBERS[0];
const mainHtml = `${HEAD}
<div style="width: 1200px; min-height: 1520px; box-sizing: border-box; padding: 48px 56px; background: ${dB.bg}; color: ${dB.ink}; display: flex; flex-direction: column; gap: 40px">
  <div style="display: flex; flex-direction: column; gap: 10px">
    <div style="font-size: 13px; letter-spacing: 0.18em; color: ${dB.accent}; font-weight: 700">RESCENE STORY · 캐릭터 아트 디렉션</div>
    <h1 style="margin: 0; font-family: 'Do Hyeon', 'Noto Sans KR', sans-serif; font-size: 44px; font-weight: 400; line-height: 1.1">B안 · 나이트 2.5등신 <span style="color: ${dB.accent}">(추천)</span></h1>
    <p style="margin: 0; max-width: 820px; font-size: 15px; line-height: 1.7; color: ${dB.muted}">24×40 도트, 1px 어두운 외곽선, 2.5등신. 지금 게임의 야간 톤(연습실·무대 뒤)을 그대로 살리고, 밝은 무대 장면에서는 배경만 바꿔도 캐릭터가 버티는 대비를 목표로 합니다. 얼굴을 닮게 그리지 않고 머리 모양·포인트 컬러·소품으로 구분합니다.</p>
  </div>

  <div style="display: flex; flex-direction: column; gap: 14px">
    <h2 style="margin: 0; font-family: 'Do Hyeon', 'Noto Sans KR', sans-serif; font-size: 24px; font-weight: 400">1. 멤버 5인 · 연습복 (장면 0~1 기본)</h2>
    <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px">
      ${MEMBERS.map((m) => memberCard('B', m, true)).join('\n      ')}
    </div>
    <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; font-size: 12px; color: ${dB.muted}; line-height: 1.5">
      ${MEMBERS.map((m) => `<div style="padding: 0 12px">소품: ${m.propNote}<br>포인트: ${m.color}</div>`).join('\n      ')}
    </div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 14px">
    <h2 style="margin: 0; font-family: 'Do Hyeon', 'Noto Sans KR', sans-serif; font-size: 24px; font-weight: 400">2. 의상 교체 규칙 (원이 예시)</h2>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px">
      ${[['training', '연습복', '장면 0~1. 후드·트레이닝복, 멤버 포인트 컬러'], ['debut', '데뷔 무대 (Re:Scene)', '장면 2~3. 화이트 톱 + 블랙 스커트, 보라 포인트'], ['pretty', 'Pretty Girl', '장면 6. 파스텔 핑크 스커트, 옐로 포인트']].map(([o, t, desc]) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px; background: ${dB.panel}; border-radius: 12px">
        <div style="display: flex; align-items: flex-end; height: 168px">${sprite('B', woni, { outfit: o, big: true })}</div>
        <div style="font-size: 16px; font-weight: 700">${t}</div>
        <div style="font-size: 12px; color: ${dB.muted}; text-align: center; line-height: 1.5">${desc}</div>
      </div>`).join('\n      ')}
    </div>
    <p style="margin: 0; font-size: 13px; line-height: 1.7; color: ${dB.muted}">몸·머리 템플릿은 하나이고 의상은 색 역할(상의·하의·신발·포인트)과 하의 실루엣(바지/스커트)만 바뀝니다. 장면 데이터의 outfit 값으로 교체하므로 멤버 5인 × 의상 3벌 = 15장이 아니라 템플릿 5장 + 팔레트 3벌로 끝납니다.</p>
  </div>

  <div style="display: flex; flex-direction: column; gap: 14px">
    <h2 style="margin: 0; font-family: 'Do Hyeon', 'Noto Sans KR', sans-serif; font-size: 24px; font-weight: 400">3. 월드 톤 · 타일</h2>
    <div style="display: flex; gap: 32px; align-items: flex-start">
      <div style="display: flex; gap: 20px; align-items: flex-end; padding: 20px; background: ${dB.panel}; border-radius: 12px">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px">${tileSvg('B', 'ground')}<div style="font-size: 12px; color: ${dB.muted}">바닥</div></div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px">${tileSvg('B', 'platform')}<div style="font-size: 12px; color: ${dB.muted}">원웨이 발판</div></div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px">${tileSvg('B', 'ladder')}<div style="font-size: 12px; color: ${dB.muted}">사다리</div></div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px; flex-grow: 1">
        <div style="position: relative; height: 200px; background: #1f2335; border-radius: 12px; overflow: hidden">
          <div style="position: absolute; left: 0; right: 0; bottom: 0; display: flex">${Array(14).fill(tileSvg('B', 'ground', 4)).join('')}</div>
          <div style="position: absolute; left: 240px; bottom: 120px; display: flex">${Array(5).fill(tileSvg('B', 'platform', 4)).join('')}</div>
          <div style="position: absolute; left: 96px; bottom: 64px">${sprite('B', MEMBERS[2], { big: true, scale: 3 })}</div>
          <div style="position: absolute; left: 420px; bottom: 144px">${sprite('B', MEMBERS[4], { big: true, scale: 3 })}</div>
          <div style="position: absolute; left: 16px; top: 12px; font-size: 12px; color: ${dB.muted}">더뮤즈 연습실 (야간) — 3배 확대 미리보기</div>
        </div>
        <div style="display: flex; gap: 6px">
          ${swatch(dB.bg, '배경', dB.muted)}${swatch('#3b4261', '바닥', dB.muted)}${swatch('#9ece6a', '발판', dB.muted)}${swatch('#e0af68', '사다리', dB.muted)}${swatch(dB.accent, 'UI 포인트', dB.muted)}${swatch('#f7768e', '체력', dB.muted)}${swatch('#ffd166', '경험치', dB.muted)}
        </div>
      </div>
    </div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 10px">
    <h2 style="margin: 0; font-family: 'Do Hyeon', 'Noto Sans KR', sans-serif; font-size: 24px; font-weight: 400">4. 제작 스펙</h2>
    <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; font-size: 13px; line-height: 1.7; color: ${dB.muted}">
      <div style="padding: 16px; background: ${dB.panel}; border-radius: 12px"><div style="color: ${dB.ink}; font-weight: 700; margin-bottom: 6px">캐릭터</div>24×40 px, 게임 캔버스 32×48 안에 여백 배치. 외곽선 1px, 색 8~10개. 프레임: 대기 2 · 걷기 4 · 점프 1 · 공격 2 · 피격 1.</div>
      <div style="padding: 16px; background: ${dB.panel}; border-radius: 12px"><div style="color: ${dB.ink}; font-weight: 700; margin-bottom: 6px">적 · NPC</div>적은 감정 의인화(졸음 슬라임·악플 까마귀)라 실루엣 우선, 16~32 px. 역할 NPC(선생님·매니저)는 멤버와 같은 템플릿에 무채색 의상.</div>
      <div style="padding: 16px; background: ${dB.panel}; border-radius: 12px"><div style="color: ${dB.ink}; font-weight: 700; margin-bottom: 6px">파이프라인</div>맵처럼 ASCII 픽셀 템플릿 → 스크립트 → PNG 스프라이트시트. 팔레트 교체로 의상·시대 변형, 손으로 고칠 부분은 텍스트 한 줄.</div>
    </div>
  </div>
</div>
${TAIL}`;

// ---------- 저해상 대안 A / C ----------
function altHtml(dir, title, sub, motive, tradeoff) {
  const d = DIRS[dir];
  return `${HEAD}
<div style="width: 900px; min-height: 760px; box-sizing: border-box; padding: 40px 44px; background: ${d.bg}; color: ${d.ink}; display: flex; flex-direction: column; gap: 28px">
  <div style="display: flex; flex-direction: column; gap: 8px">
    <div style="font-size: 12px; letter-spacing: 0.18em; color: ${d.accent}; font-weight: 700">대안 스케치</div>
    <h1 style="margin: 0; font-family: 'Do Hyeon', 'Noto Sans KR', sans-serif; font-size: 36px; font-weight: 400; line-height: 1.1">${title}</h1>
    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: ${d.muted}">${sub}</p>
  </div>
  <div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px">
    ${MEMBERS.map((m) => memberCard(dir, m, false)).join('\n    ')}
  </div>
  <div style="display: flex; gap: 20px; align-items: flex-end; padding: 16px; background: ${d.panel}; border-radius: 12px; align-self: flex-start">
    ${tileSvg(dir, 'ground', 3)}${tileSvg(dir, 'platform', 3)}${tileSvg(dir, 'ladder', 3)}
    <div style="font-size: 12px; color: ${d.muted}; line-height: 1.6; max-width: 360px">바닥 · 발판 · 사다리 타일 (3배)</div>
  </div>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; font-size: 13px; line-height: 1.7; color: ${d.muted}">
    <div style="padding: 14px 16px; background: ${d.panel}; border-radius: 12px"><div style="color: ${d.ink}; font-weight: 700; margin-bottom: 4px">이 방향의 강점</div>${motive}</div>
    <div style="padding: 14px 16px; background: ${d.panel}; border-radius: 12px"><div style="color: ${d.ink}; font-weight: 700; margin-bottom: 4px">트레이드오프</div>${tradeoff}</div>
  </div>
</div>
${TAIL}`;
}

const aHtml = altHtml('A', 'A안 · 파스텔 2등신 · 굵은 외곽선', '16×24 도트를 5배로. 머리가 몸만큼 큰 메이플 정통 비율, 밝은 종이색 배경에 파스텔 의상.',
  '메이플 향수가 가장 직접적이고, 작은 화면에서도 누가 누군지 잘 보입니다. 픽셀 수가 적어 프레임 제작이 가장 빠릅니다.',
  '지금 게임의 야간 톤과 어긋나 배경·UI를 밝게 다시 잡아야 합니다. 2등신이라 소품(마이크 스탠드·붓)을 들리기 어렵습니다.');
const cHtml = altHtml('C', 'C안 · 플랫 미니멀 · 외곽선 없음', '16×24 도트, 외곽선과 명암을 빼고 면으로만. 저채도 팔레트, 모던한 인디 게임 인상.',
  '가장 세련되고 아트 제작 시간이 짧습니다. 색만 바꾸면 의상·시대 변형이 즉시 됩니다.',
  '외곽선이 없어 어두운 배경 위에서 실루엣이 묻히고, 메이플 느낌은 가장 약합니다. 표정·소품 같은 작은 정보가 사라집니다.');

writeFileSync('docs/design/Main.dc.html', mainHtml);
writeFileSync('docs/design/DirectionA.dc.html', aHtml);
writeFileSync('docs/design/DirectionC.dc.html', cHtml);
writeFileSync('docs/design/canvas.json', JSON.stringify({
  artboards: [
    { file: 'Main.dc.html', x: 0, y: 0, w: 1200, h: 1520, title: 'B안 · 나이트 2.5등신 (추천)' },
    { file: 'DirectionA.dc.html', x: 1300, y: 0, w: 900, h: 760, title: 'A안 · 파스텔 2등신' },
    { file: 'DirectionC.dc.html', x: 1300, y: 900, w: 900, h: 760, title: 'C안 · 플랫 미니멀' },
  ],
  annotations: [
    { id: 'decisions', x: 0, y: -170, w: 520, text: '정할 것\n1) A / B / C 중 방향 (B 추천)\n2) 멤버 포인트 컬러 — 원이만 공식 컬러(#045a42 계열), 나머지는 제안값\n3) 머리 모양은 스타일라이즈(닮게 그리지 않음)\n4) 의상 교체 범위: 연습복 → 데뷔 → Pretty Girl' },
  ],
  launch: { view: 'canvas' },
}, null, 2));
console.log('wrote Main/DirectionA/DirectionC + canvas.json');
