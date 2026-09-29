/* global document, window, localStorage, requestAnimationFrame, performance */
import {makeDrive,steer,stepDrive,makeBlocks,moveBlock,rotateBlock,dropBlock,stepBlocks,readRecords,saveRecord} from './model.js';
import {loadCast,paintDolls} from './cast.js';
import {drawDrive,drawBlocks,drawNext} from './render.js';
const app=document.querySelector('#app');
const games={drive:{member:'woni',name:'원이',title:'바닷길 드라이브',line:'바다 보러 갈래? 내가 운전할게!',hint:'좌우로 피하고, 별빛을 모아요.',color:'mint'},blocks:{member:'may',name:'메이',title:'조각 공방',line:'작은 조각도 모이면 예뻐질 거야.',hint:'조각을 맞춰 한 줄을 채워요.',color:'peach'}};
let state,mode='loading',paused=false,last=0,sound=false,audio,storage,records={drive:0,blocks:0},castReady=false;
try{storage=localStorage;records=readRecords(storage);}catch{/* Play works without persistent storage. */}
function doll(id,extra=''){return `<canvas class="doll ${extra}" data-doll="${id}" role="img" aria-label="${id==='woni'?'원이':id==='may'?'메이':id==='zena'?'제나':id==='minami'?'미나미':'리브'} 캐릭터"></canvas>`;}
function header(back=false){return `<header class="topbar"><button class="brand" data-home aria-label="리센느 작은 오락실 홈"><span class="brand-mark">r.</span><span>리센느<small>작은 오락실</small></span></button>${back?'<button class="quiet" data-pause>잠깐 쉬기 Ⅱ</button>':'<span class="open-sign"><i></i> 오늘도 열었어요</span>'}</header>`;}
function decorate(){if(castReady)paintDolls(app);}
function home(){
  mode='home';state=null;paused=false;records=readRecords(storage);app.dataset.state='home';delete app.dataset.game;
  app.innerHTML=`${header()}<section class="welcome"><div><p class="hello">바닷가 작은 오락실에 오신 걸 환영해요</p><h1>잠깐, 한 판 할래?</h1><p>좋아하는 멤버와 60초. 오늘의 작은 기록을 만들어 봐요.</p></div><span class="ticket">한 판의<br><b>작은 행복</b><span>✦ ✦ ✦</span></span></section><section class="machines" aria-label="바로 즐길 수 있는 게임">${Object.entries(games).map(([id,g])=>`<article class="machine ${g.color}"><div class="marquee"><span>${g.name}의</span><h2>${g.title}</h2><span class="machine-badge">60초</span></div><div class="cabinet-screen"><div class="mini-scene ${id}"><canvas class="preview" data-preview="${id}" aria-hidden="true"></canvas></div><div class="host">${doll(g.member)}<span class="speech">${g.line}</span></div></div><div class="control-deck"><p>${g.hint}</p><button class="start" data-start="${id}" ${castReady?'':'disabled'}>${castReady?'바로 시작':'캐릭터 준비 중'} <span>▶</span></button><div class="cabinet-bottom"><span class="speaker-grill"></span><small>내 최고 기록 <b>${records[id].toLocaleString()}</b></small><span class="coin-slot"></span></div></div></article>`).join('')}</section><section class="friends" aria-label="다음에 만날 친구들"><span>다음에 만나요</span>${[['zena','제나','깜짝 포토부스'],['minami','미나미','댄스 타임'],['liv','리브','별빛 산책']].map(([id,name,title])=>`<div>${doll(id)}<p><b>${name}</b><small>${title} · 준비 중</small></p></div>`).join('')}</section><footer>비공식 팬 게임 · 멤버의 공개된 취향에서 출발한 창작 오락실</footer>`;
  decorate();app.querySelectorAll('[data-preview]').forEach(c=>{c.width=480;c.height=600;if(c.dataset.preview==='drive'){const s=makeDrive();s.elapsed=5;s.objects=[{lane:0,y:.23,kind:'star'},{lane:2,y:.45,kind:'cone'},{lane:1,y:.12,kind:'star'}];drawDrive(c.getContext('2d'),s);}else{const s=makeBlocks();s.board[11]=[1,1,0,0,2,2,3,3];s.board[10]=[0,1,0,0,0,2,0,3];drawBlocks(c.getContext('2d'),s);}});
}
function start(kind){
  const g=games[kind];if(!g||!castReady)return;mode='play';paused=false;state=kind==='drive'?makeDrive():makeBlocks();app.dataset.game=kind;app.dataset.state='playing';
  app.innerHTML=`${header(true)}<section class="play-layout ${g.color}"><aside class="companion"><button class="text-back" data-home>‹ 오락실</button><p class="host-name">${g.name}와 함께</p><h1>${g.title}</h1>${doll(g.member)}<p class="host-line" id="reaction">${g.line}</p><p class="key-guide">${kind==='drive'?'← → 방향키 또는 아래 버튼<br>길을 누르면 그쪽으로 이동해요.':'← → 이동 · ↑ 회전 · Space 내려놓기<br>아래 버튼으로도 할 수 있어요.'}</p></aside><div class="game-cabinet"><div class="scoreboard"><div><small>남은 시간</small><strong id="time">60<em>초</em></strong></div><div><small>점수</small><strong id="score">0</strong></div><div><small>${kind==='drive'?'남은 기회':'완성한 줄'}</small><strong id="extra">${kind==='drive'?'♥ ♥ ♥':'0'}</strong></div></div><div class="playfield"><canvas id="game" width="480" height="600" tabindex="0" role="img" aria-label="${g.title} 게임 화면. ${g.hint}"></canvas><div id="overlay" hidden></div></div><div class="game-controls" aria-label="게임 조작"><button data-act="left" aria-label="왼쪽으로 이동">◀</button>${kind==='blocks'?'<button data-act="rotate" aria-label="조각 회전">↻<small>회전</small></button>':''}<button data-act="right" aria-label="오른쪽으로 이동">▶</button>${kind==='blocks'?'<button class="drop" data-act="drop">내려놓기 ↓</button>':''}</div><p class="mobile-hint">${g.hint}</p></div><aside class="side-note">${kind==='blocks'?'<section class="next-piece"><h2>다음 조각</h2><canvas id="next" width="160" height="80" role="img" aria-label="다음에 나올 조각"></canvas></section>':'<div class="postcard"><span>바다까지</span><b>같이 가요!</b><span>별빛 하나 +100점</span></div>'}<p>내 최고 기록<strong id="best">${records[kind].toLocaleString()}</strong></p><button class="quiet" data-sound aria-pressed="${sound}">소리 ${sound?'끄기':'켜기'}</button></aside></section><p class="sr-only" id="announce" role="status"></p>`;
  decorate();draw();last=performance.now();app.querySelector('#game').focus({preventScroll:true});
}
function act(action){
  if(mode!=='play'||paused||state.ended)return;
  if(state.kind==='drive'){if(action==='left'||action==='right')steer(state,action==='left'?-1:1);}
  else if(action==='left'||action==='right')moveBlock(state,action==='left'?-1:1);else if(action==='rotate')rotateBlock(state);else if(action==='drop')dropBlock(state,true);else if(action==='down')dropBlock(state);
  react();draw();if(state.ended)finish();
}
function chirp(high=false){if(!sound)return;try{audio||=new (window.AudioContext||window.webkitAudioContext)();void audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.type='sine';o.frequency.setValueAtTime(high?760:460,audio.currentTime);v.gain.setValueAtTime(.045,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+.13);}catch{sound=false;}}
function react(){
  if(!state.event)return;const event=state.event;state.event=null;const line={star:'반짝! 별빛 하나 더 모았어.',bump:'괜찮아, 천천히 다시 가자.',line:'짜잔! 조각들이 딱 맞았어.',place:'좋아, 다음 조각도 같이 맞춰 보자.'}[event];
  app.querySelector('#reaction').textContent=line;app.querySelector('#announce').textContent=line;chirp(event==='star'||event==='line');
}
function draw(){
  if(mode!=='play')return;const ctx=app.querySelector('#game').getContext('2d');if(state.kind==='drive')drawDrive(ctx,state);else{drawBlocks(ctx,state);drawNext(app.querySelector('#next').getContext('2d'),state.next);}
  app.querySelector('#score').textContent=state.score.toLocaleString();app.querySelector('#time').innerHTML=`${Math.ceil(state.remaining)}<em>초</em>`;app.querySelector('#extra').textContent=state.kind==='drive'?'♥ '.repeat(state.hearts).trim()||'—':state.lines;
}
function setPaused(value){
  if(mode!=='play'||state.ended)return;paused=value;last=performance.now();app.dataset.state=value?'paused':'playing';const overlay=app.querySelector('#overlay');overlay.hidden=!value;
  if(value){overlay.innerHTML='<div class="pause-paper"><span class="pause-icon">Ⅱ</span><h2>잠깐 쉬어가요</h2><p>시간도 함께 멈췄어요.</p><button class="start" data-resume>계속하기 ▶</button><button class="quiet" data-leave>이번 판을 끝내고 오락실로</button><small>완료하지 않은 점수는 저장되지 않아요.</small></div>';overlay.querySelector('[data-resume]').focus();}
  else app.querySelector('#game').focus({preventScroll:true});
}
function finish(){
  if(mode!=='play')return;const previous=records[state.kind],saved=saveRecord(storage,state.kind,state.score);records=saved.records;draw();mode='result';app.dataset.state='result';
  const overlay=app.querySelector('#overlay');overlay.hidden=false;overlay.innerHTML=`<div class="result-paper"><span class="result-star">✦</span><p>${state.score>previous?'새로운 최고 기록!':'오늘의 작은 기록'}</p><h2>${state.score.toLocaleString()}<small>점</small></h2><p>${state.kind==='drive'?`별빛 ${state.stars}개를 모았어요.`:`${state.lines}줄의 조각을 완성했어요.`}</p><p class="result-message">${state.kind==='drive'?'함께 달리니까 더 좋다!':'우리, 하나 더 만들어 볼까?'}</p><button class="start" data-start="${state.kind}">한 판 더 ▶</button><button class="quiet" data-leave>다른 게임 고르기</button><small>${saved.saved?'최고 기록은 이 기기에 저장했어요.':'브라우저에서 기록을 저장할 수 없어요. 이번 점수는 화면에서 확인해 주세요.'}</small></div>`;
  app.querySelector('#best').textContent=records[state.kind].toLocaleString();app.querySelector('[data-pause]').hidden=true;app.querySelectorAll('[data-act]').forEach(button=>button.disabled=true);decorate();app.querySelector('#announce').textContent=`게임 완료. ${state.score}점.`;overlay.querySelector('[data-start]').focus();
}
app.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.start)start(b.dataset.start);else if(b.dataset.act)act(b.dataset.act);else if(b.hasAttribute('data-pause'))setPaused(!paused);else if(b.hasAttribute('data-resume'))setPaused(false);else if(b.hasAttribute('data-leave'))home();else if(b.hasAttribute('data-home')){if(mode==='play')setPaused(true);else home();}else if(b.hasAttribute('data-sound')){sound=!sound;b.textContent=`소리 ${sound?'끄기':'켜기'}`;b.setAttribute('aria-pressed',String(sound));if(sound)chirp(true);}
});
app.addEventListener('pointerdown',e=>{if(e.target.id==='game'&&mode==='play'&&!paused&&state.kind==='drive'){const rect=e.target.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*480;state.lane=Math.max(0,Math.min(2,Math.floor((x-105)/90)));draw();}});
window.addEventListener('keydown',e=>{
  if(mode!=='play')return;if(e.key==='Escape'){e.preventDefault();setPaused(!paused);return;}if(paused||(e.target.tagName==='BUTTON'&&e.key===' '))return;
  const action={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'rotate',ArrowDown:'down',' ':'drop'}[e.key];if(action){e.preventDefault();if(!e.repeat||['left','right','down'].includes(action))act(action);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});window.addEventListener('blur',()=>setPaused(true));
function frame(now){if(mode==='play'&&!paused){const dt=Math.min(.05,(now-last)/1000);if(state.kind==='drive')stepDrive(state,dt);else stepBlocks(state,dt);react();draw();if(state.ended)finish();}last=now;requestAnimationFrame(frame);}
home();requestAnimationFrame(frame);
loadCast().then(()=>{castReady=true;home();}).catch(()=>{app.querySelector('.welcome').insertAdjacentHTML('beforeend','<p role="alert">캐릭터를 불러오지 못했어요. 페이지를 새로고침해 주세요.</p>');});
