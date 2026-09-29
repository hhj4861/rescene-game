/* global document, window, Image, requestAnimationFrame */
const atlas = '/assets/characters25/cast.png';
const reference = '/assets/characters25/reference.png';
// The source sheet is displayed directly through SVG viewports: no face regeneration.
const characters = [
  { id: '01', description: '짙은 웨이브와 네이비 헤어밴드. 차분한 눈빛에 부드러운 미소.', crop: [40, 0, 354, 887], portrait: [23, 729, 294, 248], greeting: '“반가워. 오늘부터 함께할 이야기가 기대돼.”' },
  { id: '02', description: '밝은 애쉬 블론드 단발과 작은 헤어핀. 장난스러운 윙크.', crop: [413, 0, 318, 887], portrait: [323, 729, 292, 248], greeting: '“왔구나! 같이 있으면 연습도 더 즐거울 거야.”' },
  { id: '03', description: '구릿빛 긴 머리와 섬세하게 땋은 헤어. 또렷하고 따뜻한 인상.', crop: [740, 0, 316, 887], portrait: [623, 729, 291, 248], greeting: '“잘 부탁해. 우리만의 색을 같이 찾아보자.”' },
  { id: '04', description: '두 갈래로 땋은 검은 머리와 흰 리본. 고개를 살짝 기울인 미소.', crop: [1059, 0, 307, 887], portrait: [924, 729, 291, 248], greeting: '“여기 네 자리야. 편하게 이야기해 줘.”' },
  { id: '05', description: '앞머리가 내려오는 긴 생머리. 살짝 눈을 감은 밝은 표정.', crop: [1384, 0, 344, 887], portrait: [1224, 729, 291, 248], greeting: '“기다리고 있었어. 오늘 연습도 같이 힘내자!”' },
];
const $ = (selector) => document.querySelector(selector);
const scene = $('#scene');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let selected = 0;
let paused = reducedMotion.matches;
let view = 'group';
const greeted = new Set();
let artId = 0;
function artwork(rect, source, width, height, className = '') {
  const clipId = `art-clip-${++artId}`;
  // Equal logical widths keep every body at the same scale on narrow screens;
  // the separate clip excludes the neighbouring characters in the atlas.
  const viewport = source === atlas ? [rect[0] - (354 - rect[2]) / 2, rect[1], 354, rect[3]] : rect;
  return `<svg class="${className}" viewBox="${viewport.join(' ')}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><defs><clipPath id="${clipId}"><rect x="${rect[0]}" y="${rect[1]}" width="${rect[2]}" height="${rect[3]}" /></clipPath></defs><image href="${source}" width="${width}" height="${height}" clip-path="url(#${clipId})" /></svg>`;
}
$('#cast').innerHTML = characters.map((character, index) => `<button class="actor actor-${index}" data-character="${index}" aria-label="캐릭터 ${character.id} 전신 선택" aria-pressed="${index === 0}"><span class="ground-shadow"></span><span class="body-art">${artwork(character.crop, atlas, 1774, 887)}</span><span class="actor-label">${character.id}</span></button>`).join('');
$('#portrait-list').innerHTML = characters.map((character, index) => `<button class="portrait-choice" data-character="${index}" aria-label="캐릭터 ${character.id} 선택" aria-pressed="${index === 0}"><span class="mini-portrait">${artwork(character.portrait, reference, 1536, 1024)}</span><span>캐릭터 <strong>${character.id}</strong></span><span class="selection-mark" aria-hidden="true">↗</span></button>`).join('');
const selectionButtons = [...document.querySelectorAll('[data-character]')];
function selectCharacter(index) {
  selected = index;
  const character = characters[index];
  selectionButtons.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.character) === index)));
  $('#portrait').innerHTML = artwork(character.portrait, reference, 1536, 1024);
  $('#character-title').textContent = `캐릭터 ${character.id}`;
  $('#character-count').textContent = `${character.id} / 05`;
  $('#character-description').textContent = character.description;
  $('#dialogue').textContent = greeted.has(index) ? character.greeting : '“우리, 여기서부터 시작해 볼까?”';
  $('#greet').textContent = greeted.has(index) ? '다시 인사하기 ↗' : '인사 건네기 ↗';
  document.querySelectorAll('.actor').forEach((actor, actorIndex) => { actor.hidden = view === 'solo' && actorIndex !== selected; });
}
selectionButtons.forEach((button) => {
  button.addEventListener('click', () => selectCharacter(Number(button.dataset.character)));
  button.addEventListener('keydown', (event) => {
    const offsets = { ArrowRight: 1, ArrowLeft: -1 };
    if (!(event.key in offsets) && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? 4 : (selected + offsets[event.key] + 5) % 5;
    selectCharacter(index);
    const parent = button.closest('.cast, .portrait-list');
    // Solo mode hides other actors. Keep focus on the newly visible selected actor.
    parent.querySelector(`[data-character="${index}"]`).focus();
  });
});
document.querySelectorAll('[data-view]').forEach((button) => {
  if (button.tagName !== 'BUTTON') return;
  button.addEventListener('click', () => {
    view = button.dataset.view;
    scene.dataset.view = view;
    document.querySelectorAll('button[data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    selectCharacter(selected);
  });
});
function syncMotion() {
  scene.classList.toggle('paused', paused);
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  $('#motion-toggle').textContent = paused ? '움직임 켜기' : '움직임 멈추기';
  scene.style.setProperty('--look-x', '0px');
  scene.style.setProperty('--look-y', '0px');
}
$('#motion-toggle').addEventListener('click', () => { paused = !paused; syncMotion(); });
reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; syncMotion(); });
let pointerFrame = false;
let pointer = [0, 0];
scene.addEventListener('pointermove', (event) => {
  if (paused || reducedMotion.matches || event.pointerType !== 'mouse') return;
  const rect = scene.getBoundingClientRect();
  pointer = [((event.clientX - rect.left) / rect.width - .5) * 10, ((event.clientY - rect.top) / rect.height - .5) * 5];
  if (pointerFrame) return;
  pointerFrame = true;
  requestAnimationFrame(() => {
    pointerFrame = false;
    if (paused || reducedMotion.matches) return;
    scene.style.setProperty('--look-x', `${pointer[0]}px`);
    scene.style.setProperty('--look-y', `${pointer[1]}px`);
  });
});
scene.addEventListener('pointerleave', () => { pointer = [0, 0]; scene.style.setProperty('--look-x', '0px'); scene.style.setProperty('--look-y', '0px'); });
$('#backdrop-toggle').addEventListener('click', () => {
  const studio = scene.dataset.backdrop !== 'studio';
  scene.dataset.backdrop = studio ? 'studio' : 'coast';
  $('#backdrop-toggle').setAttribute('aria-pressed', String(studio));
  $('#backdrop-toggle').textContent = studio ? '바닷가 배경' : '단색 배경';
  $('.scene-caption').textContent = studio ? '빛과 윤곽에 집중하는 시간' : '바닷빛이 머무는 연습실';
});
$('#greet').addEventListener('click', () => { greeted.add(selected); selectCharacter(selected); });
const dialog = $('#reference-dialog');
$('#open-reference').addEventListener('click', () => dialog.showModal());
$('#close-reference').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
const image = new Image();
image.onload = () => { $('#asset-status').hidden = true; };
image.onerror = () => { $('#asset-status').textContent = '캐릭터 이미지를 불러오지 못했어요. 새로고침하거나 원본 시안을 확인해 주세요.'; };
image.src = atlas;
selectCharacter(0);
syncMotion();
