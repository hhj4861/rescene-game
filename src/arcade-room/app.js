import {LIV_ITEM_NAMES} from './runner.js';
/* global document, window, localStorage, requestAnimationFrame, performance, clearTimeout, setTimeout */
import {createGame,stepGame,gameAction,readRecords,saveRecord,GAME_IDS,INITIAL_LIVES} from './model.js';
import {GAMES,REACTIONS,extraValue,resultLine,SIGNATURES} from './catalog.js';
import {loadCast,paintDolls} from './cast.js';
import {drawGame,targets,loadGameArt,PUMP_ARROWS} from './render.js';
import {ArcadeAudio} from './audio.js';
import {mountCarousel} from './carousel.js';
import {breadFrame} from './model.js';
import {trackFor,PUMP_SONGS,DEFAULT_PUMP_SONG} from './music.js';
import {PumpVideo,videoCard} from './pump-video.js';
import {pumpPicker} from './pump-picker.js';
import {SONG_GAMES,creditSongPoints,nextSongScore} from './score-songs.js';
import {VOICES,REACTION_VOICES,SCORE_SONGS} from './voices.js';
import {readProgress,saveProgress,restoreRound,stageGoal,stageValue,isStageClear,finishStage,newRun,saveRound} from './progress.js';
let pumpChoice={songId:DEFAULT_PUMP_SONG,stage:1},previewTimer=0,pumpLoading=false,pumpVideo=null,livSongKey='',savedPumpSong=DEFAULT_PUMP_SONG;
let selectedGame='drive',disposePicker=()=>{},breadDrag=null;
const app=document.querySelector('#app'),audio=new ArcadeAudio();
let state,mode='loading',paused=false,last=0,storage,records=readRecords(),ready=false,held=null,reactions=0,offsetMs=0;
try{storage=localStorage;records=readRecords(storage);const n=Number(storage.getItem('rescene.rhythm.offset'));offsetMs=Number.isFinite(n)?Math.max(-200,Math.min(200,n)):0;const song=storage.getItem('rescene.rhythm.song');if(Object.hasOwn(PUMP_SONGS,song))pumpChoice.songId=song;}catch{/* Optional local storage. */}
savedPumpSong=pumpChoice.songId;
audio.externalMusic=(active,song)=>pumpVideo?.setDucked(active,song);
function stopVideo(){pumpVideo?.destroy();pumpVideo=null;livSongKey='';}
function playOfficial(song,label,position=0){
 if(!pumpVideo){pumpVideo=new PumpVideo(app.querySelector('#pump-video'),song,(message,error)=>{if(label?.isConnected)label.textContent=message;if(error&&mode==='play'&&state.kind==='rhythm')setPaused(true);if(mode==='songs'&&message.startsWith('재생 중')&&!previewTimer)previewTimer=setTimeout(()=>{pumpVideo?.pause();previewTimer=0;if(label?.isConnected)label.textContent='미리 듣기 끝 · 이 곡으로 시작해볼까요?';},8000);});void pumpVideo.mount();}
 pumpVideo.setMuted(!audio.enabled||!audio.musicEnabled);pumpVideo.setDucked(!!audio.voice,audio.voiceIsSong);pumpVideo.play(position);
}
function syncLivSong(force=false){
 if(mode!=='play'||state.kind!=='catch'||paused)return;
 const card=app.querySelector('.pump-video-card'),label=app.querySelector('#music-status');
 if(!state.item){if(livSongKey){stopVideo();app.querySelector('#pump-video').textContent='♪ 다음 곡 아이템을 기다려요';label.textContent='오리지널 BGM · 곡 아이템을 먹으면 바뀌어요';}return;}
 const key=`${state.item}:${state.itemPickups}`;if(!force&&key===livSongKey)return;
 stopVideo();livSongKey=key;const song=PUMP_SONGS[state.item];card.setAttribute('aria-label',song.title+' 공식 영상');card.querySelector('b').textContent='RESCENE · '+song.title;const link=card.querySelector('a');link.hidden=false;link.href='https://www.youtube.com/watch?v='+song.videoId;
 playOfficial(song,label,10-state.itemTime);
}
let progress=readProgress(storage),saveOK=!!storage,savedAt=0,reactionUntil=0;
let pendingSong=0;
function songCard(kind){
 if(!SONG_GAMES.includes(kind))return '';
 const member=GAMES[kind].member,song=SCORE_SONGS[member];
 return `<p id="song-progress"></p><small>${GAMES[kind].name}가 부른 ${song.title}</small><button class="quiet" data-song-replay disabled>노래 보상 다시 듣기</button><a class="voice-replay" style="color:inherit" href="${song.source}" target="_blank" rel="noopener noreferrer">${GAMES[kind].name} 노래 출처 ↗</a>`;
}
function songProgress(){
 const label=app.querySelector('#song-progress');if(!label)return;
 const entry=progress.games[state.kind];label.textContent=`누적 ${entry.songs.points.toLocaleString()}점 · 다음 노래 ${nextSongScore(entry).toLocaleString()}점`;
 app.querySelector('[data-song-replay]').disabled=!entry.songs.claimed;
}
function earnSong(){
 if(!SONG_GAMES.includes(state.kind))return;
 const reached=creditSongPoints(progress.games[state.kind],state.score);songProgress();
 if(reached){pendingSong=audio.enabled&&audio.voiceEnabled?reached:0;persist();}
}
function playScoreSong(){
 if(!audio.enabled||!audio.voiceEnabled||paused||!SONG_GAMES.includes(state?.kind))return;
 const member=GAMES[state.kind].member,label=app.querySelector('#voice-preview-status');
 void audio.playVoice(SCORE_SONGS[member],message=>{if(label?.isConnected)label.textContent=message;});
}
function flushSong(){
 if(!pendingSong||paused||!['play','result'].includes(mode)||audio.voiceIsSong&&audio.voice)return;
 const message=`누적 ${pendingSong.toLocaleString()}점! ${GAMES[state.kind].name}의 노래 선물 ♪`;pendingSong=0;app.querySelector('#reaction').textContent=message;app.querySelector('#announce').textContent=message;playScoreSong();
}
function persist(){
 if(state&&mode==='play'&&!state.ended)saveRound(progress,state);
 saveOK=saveProgress(storage,progress);savedAt=performance.now();
 const label=app.querySelector('#save-state');if(label)label.textContent=saveMessage();return saveOK;
}
function saveMessage(){return saveOK?'자동 저장 · 이 브라우저에서 이어하기':'저장할 수 없어 이번 탭에서만 이어갈 수 있어요.';}
function stagePicker(id){const entry=progress.games[id];return `<div class="journey-card" aria-label="${GAMES[id].name}의 도전"><b>STAGE ${entry.stage}</b><span>${id==='rhythm'?'60초 점수 도전':entry.hearts?'♥'.repeat(entry.hearts)+'♡'.repeat(INITIAL_LIVES-entry.hearts):'도전 종료'}</span><small>최고 STAGE ${entry.highest} · 끝없이 도전</small></div>`;}
function celebrate(){
 const signature=SIGNATURES[GAMES[state.kind].member];decorate(3);reactionUntil=performance.now()+1100;
 const toast=app.querySelector('.signature-toast');toast.hidden=false;toast.dataset.pose=signature.motion;toast.querySelector('span').textContent=signature.label;
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const frames=signature.motion==='dance'?[{transform:'rotate(-8deg)'},{transform:'translateY(-12px) rotate(8deg)'},{transform:'rotate(0deg)'}]:[{transform:'scale(.88)'},{transform:'scale(1.08) rotate(-4deg)'},{transform:'scale(1)'}];
  app.querySelectorAll('.companion .doll,.signature-toast .doll').forEach(c=>{c.getAnimations().forEach(a=>a.cancel());c.animate(frames,{duration:600,easing:'ease-out'});});
 }
}
function goalReached(){if(!(state.kind==='photo'&&state.flash)&&isStageClear(state))state.ended=true;}
function doll(id){return `<canvas class="doll" data-doll="${id}" role="img" aria-label="${Object.values(GAMES).find(g=>g.member===id).name} 캐릭터"></canvas>`;}
function header(play=false){return `<header class="topbar"><button class="brand" data-home aria-label="리센느 작은 오락실 홈"><span class="brand-mark">r.</span><span>리센느<small>작은 오락실</small></span></button>${play?'<button class="quiet" data-pause>잠깐 쉬기 Ⅱ</button>':'<span class="open-sign"><i></i> 다섯 친구가 기다려요</span>'}</header>`;}
function decorate(pose=0){if(ready)paintDolls(app,pose);}
function home(){
 pendingSong=0;clearTimeout(previewTimer);previewTimer=0;stopVideo();pumpLoading=false;
 disposePicker();breadDrag=null;
 if(mode==='play')persist();audio.stop();held=null;mode='home';state=null;paused=false;records=readRecords(storage);app.dataset.state='home';delete app.dataset.game;
 app.innerHTML=`${header()}<section class="welcome"><div><p class="hello">바닷가 작은 오락실에 오신 걸 환영해요</p><h1>잠깐, 한 판 할래?</h1><p>좋아하는 게임을 골라 최고 점수에 도전해요. 멈춘 곳부터 다시 만나요.</p></div><span class="ticket">한 판의<br><b>작은 행복</b><span>✦ ✦ ✦</span></span></section><section class="game-picker" aria-roledescription="carousel" aria-label="멤버 게임 선택"><nav class="member-nav" aria-label="멤버 게임 바로가기">${Object.entries(GAMES).map(([id,g])=>`<button data-slide="${id}" aria-controls="machine-${id}">${g.name}</button>`).join('')}</nav><div class="picker-controls"><button data-slide-step="-1" aria-label="이전 게임">‹</button><p><strong data-slide-status role="status" aria-live="polite"></strong><small>좌우로 넘겨 골라요</small></p><button data-slide-step="1" aria-label="다음 게임">›</button></div><section class="machines" tabindex="0" aria-label="게임 목록 · 좌우 화살표로 선택">${Object.entries(GAMES).map(([id,g])=>`<article id="machine-${id}" class="machine ${g.color}" role="group" aria-roledescription="slide" aria-label="${g.name}의 ${g.title}"><div class="marquee"><span>${g.name}의</span><h2>${g.title}</h2><span class="machine-badge">${id==='rhythm'?'점수 도전':'무한 도전'}</span></div><div class="cabinet-screen"><div class="mini-scene ${id}"><canvas class="preview" data-preview="${id}" aria-hidden="true"></canvas></div><div class="host">${doll(g.member)}<span class="speech">${g.line}</span></div></div><div class="control-deck"><p>${g.hint}</p>${stagePicker(id)}<button class="start" data-start="${id}" aria-label="${g.name}의 ${g.title} 시작" ${ready?'':'disabled'}>${ready?(id==='rhythm'?'곡 고르기':!progress.games[id].hearts?'새 도전':progress.games[id].snapshot||progress.games[id].stage>1||progress.games[id].hearts<INITIAL_LIVES?'이어서 하기':'바로 시작'):'캐릭터 준비 중'} <span>▶</span></button><div class="cabinet-bottom"><span class="speaker-grill"></span><small>내 최고 기록 <b>${records[id].toLocaleString()}</b></small><span class="coin-slot"></span></div></div></article>`).join('')}</section></section><footer>비공식 팬 게임 · 멤버의 공개된 취향에서 출발한 창작 오락실<br>진행 상황과 최고 기록은 이 브라우저에 저장돼요. 다른 기기와는 공유되지 않아요.<br>${saveMessage()}</footer>`;
 disposePicker=mountCarousel(app.querySelector('.game-picker'),selectedGame,id=>{selectedGame=id;});
 decorate();app.querySelectorAll('[data-preview]').forEach(c=>{c.width=480;c.height=600;const s=createGame(c.dataset.preview,{seed:17});s.preview=true;if(s.kind==='drive'){s.holes[1]={ttl:1,total:1.7,gold:false,flash:0};s.holes[5]={ttl:1,total:1.7,gold:true,flash:0};}if(s.kind==='catch'){s.squad=8;s.enemies=[{id:0,lane:1,y:140,hp:6,maxHp:6,boss:false}];}if(s.kind==='rhythm')s.elapsed=1;drawGame(c.getContext('2d'),s);});
}
function controls(kind){
 if(kind==='drive')return '<span class="tap-instruction">진짜만 톡! × 가짜는 피해요 · 1~9</span>';
 if(kind==='photo')return '<button data-act="shuffle" class="skill-button" aria-keyshortcuts="H">빵 섞기 · 2회<small>H</small></button><button data-act="rolling-pin" class="item-button" aria-keyshortcuts="R">밀대 1개 · R</button>';
 if(kind==='catch')return '<button data-act="left" aria-label="왼쪽 길로 이동">◀</button><button data-act="burst" class="skill-button">✦ 지원 0/5</button><button data-act="right" aria-label="오른쪽 길로 이동">▶</button>';
 if(kind==='rhythm')return `<div class="pump-pad">${PUMP_ARROWS.map((arrow,i)=>`<button data-act="${i}" class="pad-${i}" aria-keyshortcuts="${['Z','Q','S','E','C'][i]}" aria-label="${['왼쪽 아래','왼쪽 위','가운데','오른쪽 위','오른쪽 아래'][i]} 발판">${arrow}<small>${['Z','Q','S','E','C'][i]}</small></button>`).join('')}</div>`;
 return '<button data-act="left" aria-label="왼쪽으로 이동">◀</button><button data-act="right" aria-label="오른쪽으로 이동">▶</button><button data-act="turn" class="turn" aria-label="제자리 뒤돌기">뒤돌기</button><button data-act="jump" class="jump" aria-label="점프 ↑" aria-keyshortcuts="Space">점프 ↑<small aria-hidden="true">Space</small></button><button data-act="bubble" class="bubble-button" aria-label="방울 ○" aria-keyshortcuts="F">방울 ○<small aria-hidden="true">F</small></button>';
}
function fieldControls(s){return `<div class="field-controls">${targets(s).map((t,i)=>`<button data-act="${i}" style="left:${t.x/4.8}%;top:${t.y/6}%;width:${t.w/4.8}%;height:${t.h/6}%" aria-label="${t.label}"></button>`).join('')}</div>`;}
function activateSound(){
 const current=state,label=app.querySelector('#music-status');
 if(current?.kind==='catch'&&mode==='play'&&!paused){if(audio.enabled)void audio.enable(true);syncLivSong(true);return;}
 if(current?.kind==='rhythm'&&trackFor(current).videoId&&mode==='play'&&!paused){if(audio.enabled)void audio.enable(true);pumpLoading=false;playOfficial(trackFor(current),label,current.elapsed);return;}
 if(!audio.enabled){if(label)label.textContent='소리가 꺼져 있어요. 음악 다시 켜기를 눌러 주세요.';return;}
 const enabled=audio.enable(true);
 if(current?.kind==='rhythm'&&mode==='play'&&!paused){
  if(!audio.musicEnabled){if(label)label.textContent='BGM이 꺼져 있어요. 음악 다시 켜기를 눌러 주세요.';}
  else{pumpLoading=true;void audio.startSong(current,message=>{if(label?.isConnected)label.textContent=message;if(state===current&&mode==='play'&&!paused&&/못했어요|막혔어요/.test(message))setPaused(true);}).then(ok=>{if(state!==current||mode!=='play'||paused)return;pumpLoading=false;last=performance.now();if(!ok&&audio.enabled&&audio.musicEnabled)setPaused(true);});}
 }
 void enabled.then(()=>{const b=app.querySelector('[data-sound]');if(b){b.textContent=`소리 ${audio.enabled?'끄기':'켜기'}`;b.setAttribute('aria-pressed',String(audio.enabled));}});
}
function chooseSong(){
 if(![1,3,6].includes(pumpChoice.stage))pumpChoice.stage=pumpChoice.stage>=6?6:pumpChoice.stage>=3?3:1;
 pendingSong=0;clearTimeout(previewTimer);previewTimer=0;stopVideo();if(mode==='play')persist();audio.stop();pumpLoading=false;held=null;disposePicker();mode='songs';paused=false;selectedGame='rhythm';app.dataset.state='songs';delete app.dataset.game;
 app.innerHTML=header()+pumpPicker(pumpChoice,progress.games.rhythm,doll('minami'));decorate();
}
const inputAction=value=>/^\d+$/.test(value)?Number(value):value;
function start(kind,fresh=false,fromPicker=false){
 if(kind==='rhythm'&&!fromPicker&&(mode==='home'||state?.kind!=='rhythm')){chooseSong();return;}
 pendingSong=0;clearTimeout(previewTimer);previewTimer=0;stopVideo();pumpLoading=false;
 const g=GAMES[kind];if(!g||!ready)return;disposePicker();selectedGame=kind;breadDrag=null;const entry=progress.games[kind];if(fresh||entry.hearts===0)newRun(progress,kind);const resume=!fresh?restoreRound(entry.snapshot):null;if(!resume)entry.songs.roundHigh=0;audio.stop();held=null;mode='play';paused=false;reactions=0;reactionUntil=0;state=resume||createGame(kind,{offsetMs,stage:entry.stage,hearts:entry.hearts,songId:pumpChoice.songId});if(kind==='rhythm'){pumpChoice={songId:state.songId,stage:state.stage};savedPumpSong=state.songId;try{storage?.setItem('rescene.rhythm.song',state.songId);}catch{/* Optional preference. */}}lastItemPickups=state.itemPickups;app.dataset.game=kind;app.dataset.state='playing';delete app.dataset.cleared;
 app.innerHTML=`${header(true)}<section class="play-layout ${g.color} ${kind==='catch'||kind==='rhythm'&&trackFor(state).videoId?'has-video':''}"><aside class="companion"><button class="text-back" data-home>‹ 오락실</button><p class="host-name">${g.name}와 함께</p><h1>${g.title}</h1>${doll(g.member)}<p class="host-line" id="reaction">${g.line}</p><p class="key-guide">${g.keys}</p></aside>${kind==='catch'?videoCard():kind==='rhythm'&&trackFor(state).videoId?videoCard(trackFor(state)):''}<div class="game-cabinet"><div class="stage-goal"><b>STAGE ${state.stage}</b>${kind==='rhythm'?'<span class="score-mode">점수 도전</span>':`<span id="lives" aria-label="남은 목숨 ${state.hearts}개">${'♥'.repeat(state.hearts)+'♡'.repeat(INITIAL_LIVES-state.hearts)}</span>`}<span id="goal"></span></div><div class="scoreboard"><div><small>남은 시간</small><strong id="time">60<em>초</em></strong></div><div><small>점수</small><strong id="score">0</strong></div><div><small>${g.extra}</small><strong id="extra">${extraValue(state)}</strong></div></div><div class="playfield"><canvas id="game" width="480" height="${kind==='rhythm'&&trackFor(state).videoId?360:600}" tabindex="0" role="img" aria-label="${g.title} 게임 화면. ${g.hint}"></canvas>${fieldControls(state)}<div class="signature-toast" hidden aria-hidden="true">${doll(g.member)}<span></span></div><div id="overlay" hidden></div></div><div class="game-controls" aria-label="게임 조작">${controls(kind)}</div><p id="powerup-status" class="mobile-hint"></p><p class="mobile-hint">${g.hint}</p></div><aside class="side-note"><p>내 최고 기록<strong id="best">${records[kind].toLocaleString()}</strong></p><div class="utility-buttons"><button class="quiet" data-help>하는 방법</button><button class="quiet" data-sound aria-pressed="${audio.enabled}">소리 ${audio.enabled?'끄기':'켜기'}</button><button class="quiet" data-music aria-pressed="${audio.musicEnabled}">BGM ${audio.musicEnabled?'끄기':'켜기'}</button><button class="quiet" data-voice aria-pressed="${audio.voiceEnabled}">멤버 음성 ${audio.voiceEnabled?'끄기':'켜기'}</button></div>${songCard(kind)}<small id="voice-preview-status" role="status">${kind==='rhythm'?'멤버 음성 기본 켜짐':'누적 5,000점마다 멤버 노래 · 클리어 때 유행어'}</small><p id="save-state" role="status">${saveMessage()}</p><small class="music-credit">♪ ${trackFor(state).title} · ${trackFor(state).bpm} BPM<br>${trackFor(state).videoId?'RESCENE 공식 영상 · 60초 무대':'게임 전용 오리지널 연주곡'}</small><p class="short-guide">${g.guide}</p>${kind==='catch'?'<small>곡 아이템은 10초 특수공격! 공식 영상은 인터넷 연결이 필요해요.</small><p id="music-status" role="status">곡 아이템을 먹으면 노래가 바뀌어요.</p><button class="quiet" data-retry-music>음악 다시 켜기</button>':''}${kind==='rhythm'?'<p id="music-status" role="status">음악 준비 중…</p><button class="quiet" data-retry-music>음악 다시 켜기</button><button class="quiet" data-pump-picker>곡 바꾸기</button><small>음악의 박자에 맞춰 발판을 눌러요.<br>판정 보정은 ‘하는 방법’에서 조절해요.</small>':''}</aside></section><p class="sr-only" id="announce" role="status"></p>`;
 decorate();draw();last=performance.now();app.querySelector('#game').focus({preventScroll:true});window.scrollTo(0,0);persist();if(resume){paused=true;setPaused(true);}activateSound();
}
let lastItemPickups=0;
function react(){
 earnSong();
 const picked=state.itemPickups!==lastItemPickups;lastItemPickups=state.itemPickups;
 if(picked&&state.kind==='catch')syncLivSong();
 const event=state.event;state.event=null;
 if(state.kind==='rhythm'&&audio.voiceEnabled&&!state.ended&&!isStageClear(state)){
  const member=GAMES[state.kind].member,label=app.querySelector('#voice-preview-status');
  const report=message=>{if(label?.isConnected)label.textContent=message;};
  if(event==='rhythm-perfect'&&state.combo%8===0)void audio.playReaction(member,REACTION_VOICES[member],report);
 }
 if(!event)return;const lines=REACTIONS[event];if(!lines)return;
 const line=lines[reactions++%lines.length];if(!audio.voiceIsSong){app.querySelector('#reaction').textContent=line;app.querySelector('#announce').textContent=line;}const positive=!/miss|bump|early|invalid|fake/.test(event);if(positive&&event!=='place')celebrate();else if(!positive)decorate(2);if(positive&&event!=='place'&&state.kind!=='rhythm')audio.tone(720);if(event==='whack-fake')audio.tone(180,0,.16);if(event==='whack-fever'){audio.tone(880,.08);audio.tone(1320,.16);}
}
function advanceTo(now){
 if(pumpLoading){last=now;return;}
 let media;
 if(mode==='play'&&!paused&&state.kind==='rhythm'&&trackFor(state).videoId){media=pumpVideo?.sample(state.elapsed)||{dt:0};if(media.jump){pumpVideo.pause();setPaused(true);app.querySelector('#music-status').textContent='영상 위치가 바뀌어 잠시 멈췄어요. 계속하기를 누르면 저장된 박자로 돌아가요.';last=now;return;}}
 if(mode==='play'&&!paused){let remaining=media?media.dt:Math.max(0,(now-last)/1000);while(remaining>0&&!state.ended){const dt=Math.min(.05,remaining);stepGame(state,dt);remaining-=dt;react();goalReached();if(held&&!state.ended){held.wait-=dt;if(held.wait<=0){gameAction(state,held.action);held.wait+=.085;react();goalReached();}}}if(state.ended)finish();}last=now;
}
function act(action){if(mode!=='play'||paused||pumpLoading||state.kind==='rhythm'&&trackFor(state).videoId&&!pumpVideo?.isPlaying())return;advanceTo(performance.now());if(state.ended||paused)return;if(action==='turn')held=null;gameAction(state,action);react();goalReached();draw();if(state.ended)finish();}
function draw(){if(mode!=='play')return;songProgress();drawGame(app.querySelector('#game').getContext('2d'),state);app.querySelector('#score').textContent=state.score.toLocaleString();app.querySelector('#time').innerHTML=`${Math.ceil(state.remaining)}<em>초</em>`;app.querySelector('#extra').textContent=extraValue(state);const lives=app.querySelector('#lives');if(lives){lives.textContent='♥'.repeat(state.hearts)+'♡'.repeat(INITIAL_LIVES-state.hearts);lives.setAttribute('aria-label',`남은 목숨 ${state.hearts}개`);}const goal=stageGoal(state.kind,state.stage);app.querySelector('#goal').textContent=state.kind==='rhythm'?`성공 ${state.hits} · MISS ${state.misses}`:`${Math.min(stageValue(state),goal.target)} / ${goal.target} ${goal.unit}`;syncControls();}
function syncControls(){
 if(state.kind==='photo')app.dataset.breadPhase=breadFrame(state)?.kind||'idle';
 const buttons=app.querySelectorAll('.field-controls button'),moving=state.kind==='drive'?targets(state):null;
 if(moving)app.dataset.fever=String(state.fever>0);
 buttons.forEach((b,i)=>{if(state.kind==='drive'){const active=state.holes[i].ttl>0;b.dataset.active=String(active);b.dataset.fake=String(!!state.holes[i].fake);b.hidden=!active;b.disabled=!active||state.ended;const t=moving[i];b.style.left=`${t.x/4.8}%`;b.style.top=`${t.y/6}%`;b.setAttribute('aria-label',`${i+1}번 달리는 ${state.holes[i].fake?'가짜 파이리 · 누르면 150점 감점':state.holes[i].gold?'금빛 파이리':'파이리'}`);}if(state.kind==='photo')b.setAttribute('aria-pressed',String(state.selected===i));if(state.kind==='catch'){b.setAttribute('aria-label',`${i+1}번 길로 이동`);b.setAttribute('aria-pressed',String(state.lane===i));}});
 const status=app.querySelector('#powerup-status');status.textContent=state.kind==='blocks'?[state.speedBoost?`속도 1.5배 · ${Math.ceil(state.speedBoost)}초`:'',state.sizeBoost?`큰 방울 · ${Math.ceil(state.sizeBoost)}초`:''].filter(Boolean).join(' / '):state.kind==='catch'?`연사 ${state.fireLevel}단계 · 한 번에 ${state.volley}발${state.item?' / '+LIV_ITEM_NAMES[state.item]+' '+Math.ceil(state.itemTime)+'초':''}${state.bossSpawned&&!state.bossDefeated?' / 보스를 물리쳐요!':''}`:state.kind==='photo'?state.itemArmed?'밀대로 지울 줄을 골라요 · R 취소':`밀대 ${state.rollingPins}개 · 연쇄 충전 ${state.breadCharge}/3`:state.damageCooldown?'잠깐 보호 중':'';
 const itemButton=app.querySelector('.item-button');if(itemButton){itemButton.textContent=state.itemArmed?'지울 줄 선택 · R 취소':`밀대 ${state.rollingPins}개 · R`;itemButton.disabled=!state.rollingPins||!!state.flash||state.ended;itemButton.setAttribute('aria-pressed',String(state.itemArmed));}
 const skill=app.querySelector('.skill-button');if(skill&&state.kind==='photo'){skill.setAttribute('aria-label',`빵 섞기 · ${state.shuffles}회`);skill.textContent=`빵 섞기 · ${state.shuffles}회 · H`;skill.disabled=state.shuffles===0||!!state.flash||state.ended;}if(skill&&state.kind==='catch'){skill.textContent=state.charge===5?'✦ 별빛 지원':`✦ 지원 ${state.charge}/5`;skill.disabled=state.charge<5||state.ended;}
 if(state.kind==='rhythm')app.querySelectorAll('.pump-pad button').forEach((b,i)=>b.classList.toggle('lit',state.glows[i]>0));
}
function setPaused(value,help=false){
 if(mode!=='play'||state.ended)return;if(value){advanceTo(performance.now());if(state.ended)return;}paused=value;pendingSong=0;pumpLoading=false;held=null;breadDrag=null;state.breadDrag=null;if(state.kind==='blocks')gameAction(state,'stop');pumpVideo?.pause();audio.stop();last=performance.now();app.dataset.state=value?'paused':'playing';const overlay=app.querySelector('#overlay');overlay.hidden=!value;
 if(value){persist();const g=GAMES[state.kind];overlay.innerHTML=`<div class="pause-paper" role="dialog" aria-modal="true" aria-labelledby="pause-title"><h2 id="pause-title">${help?'이렇게 놀아요':'잠깐 쉬어가요'}</h2><p>${help?g.guide:'시간도 함께 멈췄어요.'}</p>${help?`<p class="dialog-keys">${g.keys}</p>`:''}${help&&state.kind==='rhythm'?`<label class="calibration">판정 보정 <output id="offset-value">${offsetMs}ms</output><input id="offset" type="range" min="-200" max="200" step="10" value="${offsetMs}"><small>소리보다 늦게 누르게 되면 + 쪽으로 조절해요.</small></label>`:''}<button class="start" data-resume>계속하기 ▶</button><button class="quiet" data-restart>스테이지 1부터 새 도전</button><button class="quiet" data-leave>오락실로 돌아가기</button><small>${saveMessage()}<br>${state.kind==='rhythm'?'새 도전은 스테이지 1, 0점으로 시작해요.':'새 도전은 스테이지 1, 목숨 3개로 시작해요.'} 최고 기록은 유지돼요.</small></div>`;overlay.querySelector('[data-resume]').focus();}else{app.querySelector('#game').focus({preventScroll:true});activateSound();}
}
function finish(){
 if(mode!=='play')return;held=null;stopVideo();if(audio.voiceIsSong&&audio.voice)audio.stopMusic();else audio.stop();const previous=records[state.kind],saved=saveRecord(storage,state.kind,state.score);records=saved.records;const cleared=finishStage(progress,state);persist();draw();mode='result';paused=false;app.dataset.state='result';app.dataset.cleared=String(cleared);
 const g=GAMES[state.kind],signature=SIGNATURES[g.member],voice=VOICES[g.member],next=GAME_IDS[(GAME_IDS.indexOf(state.kind)+1)%GAME_IDS.length],overlay=app.querySelector('#overlay');overlay.hidden=false;app.querySelector('.signature-toast').hidden=true;
 overlay.innerHTML=`<div class="result-paper" role="dialog" aria-modal="true" aria-labelledby="result-title"><p id="result-title">${state.kind==='rhythm'?'무대 완주!':cleared?`스테이지 ${state.stage} 클리어!`:state.hearts?'목숨이 남아 있어요!':'GAME OVER'}</p>${cleared?`<div class="clear-portrait">${doll(g.member)}</div>`:''}<h2>${state.score.toLocaleString()}<small>점</small></h2><p>${resultLine(state)}${state.score>previous?' · 새 최고 기록!':''}</p><p class="result-message">${cleared?signature.line:state.hearts?`${state.endReason==='timeout'?'시간 초과':state.endReason==='moves'?'교환 횟수를 다 썼어요':state.endReason==='boss'?'보스를 놓쳤어요':'다음 도전을 준비해요'} · 목숨 하나로 다시 도전해요.`:`스테이지 ${state.stage}까지 함께했어요!`}</p>${cleared?`<div class="member-voice"><small>${signature.adapted?'위 멘트는 게임용 각색 · ':''}원본 음성: “${voice.spoken}”</small><button class="voice-replay" data-speak>▶ ${g.name} 실제 음성 듣기</button><button class="voice-replay" data-stop-voice>음성 정지</button><a href="${voice.source}" target="_blank" rel="noopener noreferrer" aria-label="${g.name} 음성 출처 · 새 탭">출처 영상 ↗</a><small id="voice-status" role="status">원본 음성 · 방송 배경음 포함</small></div>`:''}${state.kind==='rhythm'?`<p class="pump-result-summary">노트 적중률 ${Math.round(state.hits/state.notes.length*100)}% · 60초 완주</p><button class="quiet" data-pump-picker>다른 곡 고르기</button>`:`<p class="result-lives">남은 목숨 ${'♥'.repeat(state.hearts)+'♡'.repeat(INITIAL_LIVES-state.hearts)}${cleared?' · 다음 스테이지에서 계속':''}</p>`}<button class="start" data-start="${state.kind}">${cleared?'다음 스테이지 ▶':state.hearts?'다시 도전 ▶':'새 도전 ▶'}</button><button class="quiet" data-start="${next}">${GAMES[next].name}와도 놀기</button><button class="result-home" data-leave>오락실로</button><small>${saveOK&&saved.saved?'진행 상황과 최고 기록은 이 기기에 저장했어요.':'기기에 저장할 수 없어요. 이번 탭에서만 진행을 유지해요.'}</small></div>`;
 if(SONG_GAMES.includes(state.kind)&&progress.games[state.kind].songs.claimed){const replay=app.querySelector('[data-song-replay]');overlay.querySelector('.result-paper').append(replay);}
 app.querySelector('#best').textContent=records[state.kind].toLocaleString();app.querySelector('[data-pause]').hidden=true;app.querySelectorAll('[data-act]').forEach(b=>b.disabled=true);decorate(cleared?3:0);app.querySelector('#announce').textContent=`${state.kind==='rhythm'?'무대 완주':cleared?'스테이지 클리어':'게임 완료'}. ${state.score}점.`;overlay.querySelector('[data-start]').focus();if(cleared&&audio.enabled&&audio.voiceEnabled&&!pendingSong&&!audio.voiceIsSong)speakClear();
}
function speakClear(){const label=app.querySelector('#voice-status');audio.playVoice(VOICES[GAMES[state.kind].member],message=>{if(label?.isConnected)label.textContent=message;});}
app.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.song&&Object.hasOwn(PUMP_SONGS,b.dataset.song)){pumpChoice.songId=b.dataset.song;chooseSong();app.querySelector(`[data-song="${pumpChoice.songId}"]`).focus();return;}
 if(b.dataset.songLevel){pumpChoice.stage=Number(b.dataset.songLevel);chooseSong();app.querySelector(`[data-song-level="${pumpChoice.stage}"]`).focus();return;}
 if(b.hasAttribute('data-song-preview')){clearTimeout(previewTimer);previewTimer=0;if(PUMP_SONGS[pumpChoice.songId].videoId){void audio.enable(true);audio.setMusic(true);playOfficial(PUMP_SONGS[pumpChoice.songId],app.querySelector('#song-preview-status'));return;}const sample={kind:'rhythm',songId:pumpChoice.songId,elapsed:0},label=app.querySelector('#song-preview-status');void audio.enable(true);audio.setMusic(true);void audio.startSong(sample,m=>{if(label?.isConnected)label.textContent=m;});previewTimer=setTimeout(()=>{audio.stop();if(label?.isConnected)label.textContent='미리 듣기 끝 · 이 곡으로 시작해볼까요?';},8000);return;}
 if(b.hasAttribute('data-song-start')){const entry=progress.games.rhythm;entry.stage=pumpChoice.stage;entry.hearts=INITIAL_LIVES;entry.snapshot=null;start('rhythm',false,true);return;}
 if(b.hasAttribute('data-song-resume')){pumpChoice.songId=progress.games.rhythm.snapshot?.songId||savedPumpSong;start('rhythm',false,true);return;}
 if(b.hasAttribute('data-pump-picker')){chooseSong();return;}
 if(b.hasAttribute('data-retry-music')){stopVideo();void audio.enable(true);audio.setMusic(true);if(paused)setPaused(false);else activateSound();app.querySelector('[data-music]').textContent='BGM 끄기';app.querySelector('[data-music]').setAttribute('aria-pressed','true');return;}
 if(b.hasAttribute('data-song-replay')){if(progress.games[state.kind].songs.claimed)playScoreSong();return;}
 if(b.dataset.start)start(b.dataset.start);else if(b.hasAttribute('data-restart'))start(state.kind,true);else if(b.hasAttribute('data-voice')){audio.voiceEnabled=!audio.voiceEnabled;if(!audio.voiceEnabled)audio.cancelVoice();else if(state.kind==='rhythm'){const label=app.querySelector('#voice-preview-status');audio.playReaction('minami',REACTION_VOICES.minami,message=>{if(label?.isConnected)label.textContent=message;});}b.textContent=`멤버 음성 ${audio.voiceEnabled?'끄기':'켜기'}`;b.setAttribute('aria-pressed',String(audio.voiceEnabled));}else if(b.hasAttribute('data-speak'))speakClear();else if(b.hasAttribute('data-stop-voice')){pendingSong=0;audio.cancelVoice();}else if(b.hasAttribute('data-act')&&e.detail===0)act(inputAction(b.dataset.act));else if(b.hasAttribute('data-pause'))setPaused(!paused);else if(b.hasAttribute('data-help'))setPaused(true,true);else if(b.hasAttribute('data-resume'))setPaused(false);else if(b.hasAttribute('data-leave')){home();window.scrollTo(0,0);}else if(b.hasAttribute('data-home')){if(mode==='play')setPaused(true);else{home();window.scrollTo(0,0);}}else if(b.hasAttribute('data-music')){audio.setMusic(!audio.musicEnabled);if(pumpVideo){pumpVideo.setMuted(!audio.enabled||!audio.musicEnabled);}else if(audio.musicEnabled)activateSound();else{const label=app.querySelector('#music-status');if(label)label.textContent='BGM이 꺼져 있어요.';}b.textContent=`BGM ${audio.musicEnabled?'끄기':'켜기'}`;b.setAttribute('aria-pressed',String(audio.musicEnabled));}else if(b.hasAttribute('data-sound')){const enabled=await audio.enable(!audio.enabled);if(b.isConnected){b.textContent=enabled?'소리 끄기':'소리 켜기';b.setAttribute('aria-pressed',String(enabled));}if(pumpVideo)pumpVideo.setMuted(!enabled||!audio.musicEnabled);if(enabled){audio.tone();if(!pumpVideo)activateSound();}}
});
app.addEventListener('input',e=>{if(e.target.id==='offset'){offsetMs=Number(e.target.value);state.offset=offsetMs/1000;app.querySelector('#offset-value').textContent=`${offsetMs}ms`;try{storage?.setItem('rescene.rhythm.offset',String(offsetMs));}catch{/* Optional preference. */}}});
app.addEventListener('pointerdown',e=>{if(mode!=='play'||paused||state.ended)return;const b=e.target.closest('[data-act]');if(b&&!b.disabled){if(state.kind==='photo'&&b.closest('.field-controls')){if(breadDrag||!e.isPrimary||state.flash)return;e.preventDefault();b.setPointerCapture(e.pointerId);breadDrag={id:e.pointerId,index:Number(b.dataset.act),x:e.clientX,y:e.clientY,size:b.getBoundingClientRect().width};return;}e.preventDefault();b.setPointerCapture(e.pointerId);const action=inputAction(b.dataset.act);act(action);if(state.kind==='blocks'&&['left','right'].includes(action))held={action,wait:.08,pointerId:e.pointerId};}});
function dragTarget(d,x,y){
 const dx=x-d.x,dy=y-d.y,ax=Math.abs(dx),ay=Math.abs(dy);if(Math.max(ax,ay)<Math.max(8,d.size*.14))return null;
 const horizontal=ax>=ay,to=d.index+(horizontal?Math.sign(dx):Math.sign(dy)*6);
 if(to<0||to>=36||horizontal&&Math.floor(to/6)!==Math.floor(d.index/6))return null;
 return {from:d.index,to,dx:horizontal?Math.max(-1,Math.min(1,dx/d.size)):0,dy:horizontal?0:Math.max(-1,Math.min(1,dy/d.size))};
}
app.addEventListener('pointermove',e=>{
 if(!breadDrag||breadDrag.id!==e.pointerId||breadDrag.committed)return;
 const target=dragTarget(breadDrag,e.clientX,e.clientY);state.breadDrag=target;
 if(target&&!state.itemArmed&&Math.max(Math.abs(e.clientX-breadDrag.x),Math.abs(e.clientY-breadDrag.y))>=breadDrag.size*.5){
  // Commit the swipe once while the finger moves, not on a later click/release.
  breadDrag.committed=true;state.breadDrag=null;act({from:breadDrag.index,to:target.to});
 }else draw();
});
app.addEventListener('pointerup',e=>{
 if(!breadDrag||breadDrag.id!==e.pointerId)return;const d=breadDrag;breadDrag=null;state.breadDrag=null;
 if(mode!=='play'||paused||state.kind!=='photo'||d.committed)return;
 const target=dragTarget(d,e.clientX,e.clientY);if(target&&!state.itemArmed)act({from:d.index,to:target.to});else if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<Math.max(8,d.size*.14)||state.itemArmed)act(d.index);else draw();
});
for(const type of ['pointercancel','lostpointercapture'])app.addEventListener(type,e=>{if(breadDrag?.id===e.pointerId){breadDrag=null;state.breadDrag=null;draw();}});
function releaseMovement(e){if(e?.type==='keyup'){if(held?.pointerId!==undefined||held?.action!==({ArrowLeft:'left',ArrowRight:'right'}[e.key]))return;}else if(held?.pointerId!==e?.pointerId)return;held=null;if(mode==='play'&&state.kind==='blocks')gameAction(state,'stop');}
for(const type of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(type,releaseMovement);
window.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key))releaseMovement(e);});
window.addEventListener('keydown',e=>{
 const key=/^Key[A-Z]$/.test(e.code)?e.code.slice(3).toLowerCase():/^Digit[1-9]$/.test(e.code)?e.code.slice(5):e.key;
 if(mode==='home'||mode==='songs')return;const overlay=app.querySelector('#overlay');if(e.key==='Tab'&&overlay&&!overlay.hidden){const nodes=[...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')],index=nodes.indexOf(document.activeElement);if(nodes.length){e.preventDefault();nodes[(index+(e.shiftKey?-1:1)+nodes.length)%nodes.length].focus();}return;}
 if(mode!=='play')return;if(e.key==='Escape'){e.preventDefault();setPaused(!paused);return;}if(paused)return;if(['BUTTON','INPUT','A'].includes(e.target.tagName)&&(e.key===' '||e.key==='Enter'))return;
 if(state.kind==='photo'&&['h','r'].includes(key)){e.preventDefault();if(!e.repeat)act(key==='h'?'shuffle':'rolling-pin');return;}
 if(state.kind==='photo'&&e.target.id==='game'&&['Enter',' '].includes(key)){e.preventDefault();app.querySelector('.field-controls button').focus();act(0);return;}
 if(state.kind==='photo'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const buttons=[...app.querySelectorAll('.field-controls button')],from=Math.max(0,buttons.indexOf(document.activeElement)),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-6,ArrowDown:6}[e.key];const to=from+delta;if(to>=0&&to<36&&(Math.abs(delta)!==1||Math.floor(from/6)===Math.floor(to/6)))buttons[to].focus();return;}
 const map=state.kind==='rhythm'?{z:0,Z:0,q:1,Q:1,s:2,S:2,e:3,E:3,c:4,C:4}:state.kind==='blocks'?{ArrowLeft:'left',ArrowRight:'right',' ':'jump',f:'bubble',F:'bubble',x:'turn',X:'turn'}:state.kind==='catch'?{ArrowLeft:'left',ArrowRight:'right',' ':'burst'}:{};
 let action=map[key];if(state.kind==='drive'&&/^[1-9]$/.test(key))action=Number(key)-1;if(state.kind==='catch'&&/^[1-3]$/.test(key))action=Number(key)-1;
 if(action!==undefined){e.preventDefault();if(!e.repeat||(state.kind==='blocks'&&action!=='turn'))act(action);if(state.kind==='blocks'&&['left','right'].includes(action))held={action,wait:.08};}

});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pendingSong=0;audio.stop();pumpVideo?.pause();setPaused(true);}});window.addEventListener('blur',()=>{const pause=()=>{pendingSong=0;audio.stop();pumpVideo?.pause();setPaused(true);};if(!pumpVideo){pause();return;}setTimeout(()=>{if(app.querySelector('#pump-video')?.contains(document.activeElement))return;pause();},0);});window.addEventListener('pagehide',()=>{pendingSong=0;audio.stop();pumpVideo?.pause();if(mode==='play'){setPaused(true);persist();}});
function frame(now){advanceTo(now);flushSong();if(mode==='play'&&!paused){if(state.kind==='catch')syncLivSong();if(state.kind==='catch'&&pumpVideo?.isPlaying(false)){if(audio.transport||audio.musicNodes.size)audio.stopMusic();}else audio.tick(state);draw();if(now-savedAt>1000)persist();if(reactionUntil&&now>reactionUntil){reactionUntil=0;decorate();app.querySelector('.signature-toast').hidden=true;}}requestAnimationFrame(frame);}
home();requestAnimationFrame(frame);Promise.all([loadCast(),loadGameArt()]).then(()=>{ready=true;home();}).catch(()=>{app.querySelector('.welcome').insertAdjacentHTML('beforeend','<p role="alert">캐릭터를 불러오지 못했어요. 페이지를 새로고침해 주세요.</p>');});
