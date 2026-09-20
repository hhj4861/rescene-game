// Original vector scenery. Characters are fictional game illustrations, not likenesses.
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const colors = ['#769bb8', '#72977d', '#ad88ac', '#7a869a', '#d0a364'];
const hair = ['#413747', '#49372f', '#242c42', '#77563f', '#392e34'];
export function doll(index, portrait = false) {
  const i = Math.max(0, index) % 5;
  return `<svg viewBox="0 0 100 140" aria-hidden="true" class="doll ${portrait ? 'portrait-doll' : ''}"><ellipse cx="50" cy="130" rx="28" ry="6" fill="#283b4833"/><g class="leg-left"><path d="M34 94L31 126H44L50 97" fill="#283344"/><path d="M31 122H44V132H27V128Z" fill="#efe3d1"/></g><g class="leg-right"><path d="M50 96L55 126H68L66 94" fill="#283344"/><path d="M55 122H68L73 130V133H55Z" fill="#efe3d1"/></g><g class="arm-left"><path d="M28 65L19 96L30 101L42 69Z" fill="${colors[i]}" stroke="#38414b" stroke-width="2"/><ellipse cx="24" cy="99" rx="5" ry="6" fill="#f2cdb5"/></g><g class="arm-right"><path d="M59 67L69 101L81 97L72 64Z" fill="${colors[i]}" stroke="#38414b" stroke-width="2"/><ellipse cx="76" cy="99" rx="5" ry="6" fill="#f2cdb5"/></g><path d="M32 65Q50 55 68 65L63 82V104H35V82Z" fill="${colors[i]}" stroke="#38414b" stroke-width="2"/><path d="M40 62L50 75L60 62M50 76V100" fill="none" stroke="#f4eee0" stroke-width="3"/><path d="M20 42Q14 8 47 7Q85 4 82 45L${i === 2 ? '87 78L65 74' : '76 62L24 63'}Z" fill="${hair[i]}"/><ellipse cx="50" cy="42" rx="25" ry="27" fill="#f2cdb5"/><path d="M24 36Q22 9 49 12Q81 10 78 38L65 24L60 34L${i === 0 ? '42 22L40 34' : '47 23L33 38'}Z" fill="${hair[i]}"/><path d="M26 34Q21 55 28 70L19 63L19 35M76 32Q81 50 75 70L84 63L83 32" fill="${hair[i]}"/><ellipse cx="40" cy="43" rx="3" ry="4" fill="#34313e"/><ellipse cx="60" cy="43" rx="3" ry="4" fill="#34313e"/><circle cx="39" cy="42" r="1" fill="white"/><circle cx="59" cy="42" r="1" fill="white"/><path d="M45 55Q50 59 56 54" fill="none" stroke="#b46d6d" stroke-width="2"/><ellipse cx="32" cy="52" rx="5" ry="2" fill="#de9b9b"/><ellipse cx="68" cy="52" rx="5" ry="2" fill="#de9b9b"/>${i === 0 ? '<path d="M22 24L13 18L13 31Z" fill="#a9c1e3"/>' : i === 2 ? '<path d="M73 23L89 17L86 33Z" fill="#cbaccb"/>' : i === 4 ? '<circle cx="73" cy="24" r="6" fill="#dcb46d"/>' : ''}</svg>`;
}
const iso = (x, y) => [460 + (x - y) * 40, 133 + (x + y) * 21];
const poly = (points, fill, stroke = '') => `<polygon points="${points.map(p => p.join(',')).join(' ')}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="1"` : ''}/>`;
function tree(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="4" rx="22" ry="9" fill="#466b6730"/><path d="M-3 1V-37H4V1Z" fill="#8f7251"/><path d="M0-77L-25-32H-16L-32-12H32L17-32H25Z" fill="#4d8173"/><path d="M0-77L-19-36H-9L-23-17H0Z" fill="#6d9e83"/><path d="M1-73L9-53H1Z" fill="#9bbc96"/></g>`;
}
function building(x, y, roof, type) {
  const [cx, cy] = iso(x, y), h = type === 'dorm' ? 90 : 64;
  let art = `<ellipse cx="6" cy="9" rx="63" ry="24" fill="#3e665833"/>`;
  art += poly([[-54, -6], [0, 22], [0, 22 - h], [-54, -6 - h]], '#eddfc4');
  art += poly([[0, 22], [54, -6], [54, -6 - h], [0, 22 - h]], '#b9c7bb');
  art += poly([[-62, -h - 4], [0, -h - 42], [62, -h - 4], [0, -h + 30]], roof, '#54635e');
  art += poly([[-62, -h - 4], [0, -h - 42], [0, -h - 20], [-43, -h + 6]], '#ffffff20');
  art += `<path d="M-37 ${12-h}v22l18 9v-22ZM17 ${27-h}v21l18-9v-22Z" fill="#668c98" stroke="#f5ebcd" stroke-width="3"/><path d="M-14 15V-17L-29-25V7" fill="#607e7a"/><circle cx="-20" cy="-5" r="2" fill="#e6c483"/>`;
  if (type === 'practice') art += `<path d="M8-21V8L46-12V-42Z" fill="#81a7ac" stroke="#eee4c9" stroke-width="3"/><path d="M26-31V-2" stroke="#eee4c9" stroke-width="3"/>`;
  if (type === 'meeting') art += '<path d="M-41-53L-17-41V-27L-41-39Z" fill="#f0e8cf"/><path d="M-36-47L-22-40M-36-42L-22-35" stroke="#7b8b79" stroke-width="2"/>';
  if (type === 'dorm') art += '<path d="M-40-18L-21-9V-27L-40-36ZM19-11L38-20V-38L19-29Z" fill="#eec68b" stroke="#f3e6c9" stroke-width="3"/>';
  return `<g transform="translate(${cx} ${cy})">${art}</g>`;
}
export const places = [
  { id: 'dorm', title: '숙소', sub: '멤버 · 휴식', x: 235, y: 291 },
  { id: 'schedule', title: '연습실', sub: '일정 · 무대 계획', x: 660, y: 291 },
  { id: 'meeting', title: '회의실', sub: '대화 · 팀 투표', x: 457, y: 241 },
  { id: 'stage', title: '공연장', sub: '무대 · 심사', x: 487, y: 462 },
  { id: 'journal', title: '기록실', sub: '성장 · 지난 시즌', x: 210, y: 428 },
];
export function townScene() {
  let tiles = '';
  for (let s = 0; s <= 18; s++) for (let x = 0; x < 10; x++) {
    const y = s - x; if (y < 0 || y > 9) continue;
    const [cx, cy] = iso(x, y), road = x === 4 || y === 4 || (x === 7 && y > 4);
    tiles += poly([[cx, cy - 21], [cx + 40, cy], [cx, cy + 21], [cx - 40, cy]], road ? '#dfd4b3' : ['#a8c29a', '#afc99f', '#a4be97'][(x * 7 + y) % 3], road ? '#c8bda2' : '#9fb990');
    if (!road && (x + y) % 4 === 0) tiles += `<path d="M${cx-4} ${cy}l3-5 2 5 4-3" stroke="#789c75" fill="none"/><circle cx="${cx+9}" cy="${cy-6}" r="2" fill="#f0e4b7"/>`;
  }
  return `<svg viewBox="0 0 920 640" class="town-art" role="img" aria-label="숙소, 회의실, 연습실, 공연장이 길로 연결된 리센느의 작은 마을"><defs><pattern id="sea-lines" width="64" height="32" patternUnits="userSpaceOnUse"><path d="M10 20h21M40 7h12" stroke="#afcbd0" stroke-width="2" opacity=".4"/></pattern></defs><rect width="920" height="640" fill="#8cbbc4"/><rect width="920" height="640" fill="url(#sea-lines)"/><path d="M0 45Q150 3 260 58T530 40T920 49V0H0" fill="#b3d0ce"/><ellipse cx="466" cy="531" rx="337" ry="52" fill="#668e9660"/>${poly([[60, 322], [460, 532], [460, 550], [60, 340]], '#8b9b80')}${poly([[460, 532], [860, 322], [860, 340], [460, 550]], '#718e7f')}${tiles}${[[-1,2],[-1,4],[1,-1],[4,-1],[7,-1],[10,2],[10,5],[10,8],[-1,8],[3,10]].map(([x,y]) => tree(...iso(x,y), .9)).join('')}${building(1.7, 1.7, '#708f91', 'meeting')}${building(1.1, 6.5, '#b88678', 'dorm')}${building(6.5, 1.4, '#7b98ae', 'practice')}${building(4.1, 9, '#aaa078', 'meeting')}<g transform="translate(492 410)">${poly([[-79,-4],[0,-44],[79,-4],[0,39]],'#e6d4b4')}${poly([[-79,-4],[0,39],[0,50],[-79,7]],'#8c8b8b')}${poly([[0,39],[79,-4],[79,7],[0,50]],'#737e8c')}<path d="M-64-8V-89L0-120L65-89V-8L0 24Z" fill="#536077"/><path d="M-64-89L0-120L65-89L0-57Z" fill="#8896ad"/><path d="M-60-85V-6L-42 3V-77ZM43-77V3L61-6V-85Z" fill="#ae7886"/><path d="M-30-75L-51-7L-5 12L0-60M29-76L5 11L51-7Z" fill="#f7e2ac" opacity=".18"/><path d="M-64-89L0-57L65-89" fill="none" stroke="#e8c781" stroke-width="4"/><text x="0" y="-29" text-anchor="middle" fill="#e9d5a7" font-family="Georgia,serif" font-size="13">RESCENE</text></g>${tree(773,415,.8)}${tree(308,500,.7)}<g fill="#f5ede0" opacity=".85"><path d="M80 135q8-8 16 0q8-8 16 0q-8-4-16 3q-8-7-16-3"/><path d="M758 103q8-8 16 0q8-8 16 0q-8-4-16 3q-8-7-16-3"/></g></svg>`;
}
