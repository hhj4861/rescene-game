/* global document */
import { mountPerformance, stopPerformance } from './performance.js';
import { doll, townScene, places, escapeHtml as esc } from './scene.js';
let selectedMember = 'minami', activeRoom = null, previousPhase, previousSeason;
let dialogueIndex = 0, focusSnapshot;
const roomNames = { dorm: '숙소 · 함께 쉬어 가기', schedule: '연습실 · 이번 무대의 일정', meeting: '회의실 · 우리 여섯의 선택', stage: '공연장 · 우리의 60초', journal: '기록실 · 쌓여 가는 경험', settings: '수첩 · 자료와 설정', start: '새로운 이야기 시작' };
const phaseGroups = [ ['announced', 'proposal'], ['meeting', 'discussion', 'voted', 'voting', 'agreed'], ['performance', 'judging', 'spectator', 'watch-judging'], ['result', 'reflection', 'learned', 'spectated', 'complete'] ];
const steps = ['컨셉 발표', '일정과 팀 회의', '우리의 무대', '심사와 성장'];
export function captureGameFocus() {
  const el = document.activeElement;
  focusSnapshot = el?.id ? { id: el.id, start: el.selectionStart, end: el.selectionEnd } : null;
}
function fragment(...nodes) { const result = document.createElement('div'); nodes.filter(Boolean).forEach(n => result.append(n)); return result; }
function html(markup) { const e = document.createElement('div'); e.innerHTML = markup; return e; }
export function mountGame({ app, state, catalog, draft }) {
  stopPerformance();
  const q = selector => app.querySelector(selector);
  const r = state?.rounds[state.round];
  const phase = state?.phase;
  const stageIndex = state ? Math.max(0, phaseGroups.findIndex(g => g.includes(phase))) : 0;
  const changedSeason = previousSeason !== state?.id;
  if (changedSeason) { activeRoom = null; dialogueIndex = 0; }
  else if (previousPhase && previousPhase !== phase && !state?.busy) {
    if (phase === 'meeting' || phase === 'voted' || phase === 'agreed') activeRoom = 'meeting';
    if (phase === 'result' || phase === 'spectated') activeRoom = 'stage';
    if (phase === 'learned') activeRoom = 'journal';
    dialogueIndex = 0;
  }
  if (!state?.busy) previousPhase = phase; previousSeason = state?.id;
  const source = q('#source-room'), traces = q('.side > details:not(#source-room)'), restart = q('#restart');
  const plan = q('#plan-panel'), actions = q('.side > .actions'), error = q('#error');
  const votes = q('.vote-list'), voteNote = votes?.nextElementSibling;
  const performancePanel = q('#performance-panel');
  if (performancePanel) mountPerformance(performancePanel, { round:r, members:catalog.members, seed:`${state.seed}:${state.round}` });
  const panels = {
    start: fragment(q('#start')),
    schedule: fragment(plan),
    meeting: fragment(q('.layout .room'), q('#meeting-panel'), votes, voteNote, ...app.querySelectorAll('[data-skip]')),
    stage: fragment(q('#performance-panel'), q('#result-panel'), q('#season-ending')),
    journal: fragment(q('.growth'), q('#reflection-panel'), q('#history-panel')),
    settings: fragment(source, traces, restart),
  };
  // Each existing control is moved, never cloned; handlers and draft bindings stay intact.
  const status = fragment(...app.querySelectorAll('.status'));
  const primary = actions || html('<button id="begin-story">새로운 이야기 시작</button>');
  if (state && !primary.children.length) primary.innerHTML = '<button data-open="schedule">이번 무대 일정 정하기</button>';
  app.innerHTML = `<main class="game-frame"><header class="game-header"><div class="game-brand">RESCENE <span>우리 여섯의 계절</span></div><div class="chapter-label">${state ? `Round ${state.round} / 10` : '첫 번째 무대를 기다리며'}</div><button class="system-button" data-open="${state ? 'settings' : 'journal'}">${state ? '수첩 / 설정' : '지난 이야기'}</button></header><div class="game-progress" aria-label="라운드 진행">${steps.map((s,i) => `<span class="${i === stageIndex ? 'active' : i < stageIndex ? 'finished' : ''}" ${i === stageIndex ? 'aria-current="step"' : ''}><b>${i+1}</b>${s}</span>`).join('')}</div><div id="game-status" aria-live="polite"></div><div class="game-layout"><nav class="place-menu" aria-label="마을의 장소"><div class="menu-heading">오늘은 어디로?</div>${places.map((p,i) => `<button data-open="${p.id}" ${!state ? 'disabled' : ''}><span class="place-icon" aria-hidden="true">${['⌂','♫','♧','☆','▤'][i]}</span><span>${p.title}<small>${p.sub}</small></span></button>`).join('')}<div class="season-note">${state ? `<strong>${state.teams.filter(t=>t.alive).length}팀</strong>의 도전<br>열 번의 무대, 하나의 꿈` : '나와 다섯 멤버,<br>하나의 팀이 되는 시간'}</div></nav><section class="world-panel" aria-label="리센느 마을"><div class="scene-caption"><span>${state ? `제 ${state.round} 라운드` : '프롤로그'}</span><strong>${esc(r?.concept || '우리의 이야기가 시작되는 곳')}</strong><small>${state ? esc(state.conceptInfo?.hint || '서로의 의견을 듣고 무대를 준비하세요') : '작은 연습실에서 가장 빛나는 무대까지'}</small></div><div class="world-map">${townScene()}${places.map(p => `<button class="map-place map-${p.id}" data-open="${p.id}" ${!state ? 'disabled' : ''}>${p.title}<span>${p.sub}</span></button>`).join('')}<div class="map-party">${catalog.members.map((m,i)=>`<button data-member="${m.id}" aria-label="${m.name} 선택">${doll(i)}<span>${m.name}</span></button>`).join('')}</div><div class="map-compass" aria-hidden="true">N<br>◇</div></div><div class="world-foot"><span>장소를 골라 이야기를 이어가세요</span><span>자동 저장 ${state ? '· 진행 중' : '· 시작 대기'}</span></div></section><aside class="member-sheet"><div class="sheet-heading">우리 팀의 하루</div><div id="member-profile"></div><div class="member-picker" role="group" aria-label="멤버 선택">${catalog.members.map((m,i)=>`<button data-member="${m.id}" aria-label="${m.name} 선택" title="${m.name}">${doll(i)}<span>${m.name}</span></button>`).join('')}</div><div class="next-note"><strong>${state ? steps[stageIndex] : '첫 무대를 향해서'}</strong><p>${!state ? '당신도 여섯 번째 팀원이에요. 어떤 무대를 만들지 함께 결정해요.' : ['먼저 이번 컨셉과 상대를 확인하고, 다섯 멤버의 생각을 들어요.','연습과 휴식을 배분하고 계획을 나눠요. 여섯 명 중 네 명이 동의하면 무대에 올라요.','합의한 파트로 공연하고 전문가 다섯 명의 심사를 받아요.','오늘의 경험을 돌아보고 다음 무대에 가져갈 배움을 남겨요.'][stageIndex]}</p></div></aside></div><section class="story-box" aria-label="멤버 대화"><div id="dialogue-portrait"></div><div class="story-copy"><div class="speaker-line"><strong id="speaker-name"></strong><span id="speech-origin"></span></div><p id="speech-text"></p><div class="speech-controls"><button id="speech-prev" class="system-button" aria-label="이전 대화">◀</button><span id="speech-page"></span><button id="speech-next" class="system-button" aria-label="다음 대화">▶</button><button class="system-button" data-open="meeting" ${!state ? 'disabled' : ''}>회의 기록 펼치기</button></div></div><div class="story-actions" id="story-actions"></div></section><p class="game-footer">비공식 팬 게임 · 캐릭터와 무대는 게임 속 표현입니다. 대화는 공개 자료를 참고한 에이전트의 창작입니다.</p></main><dialog id="game-window" aria-labelledby="window-title"><header class="window-header"><h1 id="window-title"></h1><button id="close-window" class="system-button" aria-label="마을로 돌아가기">닫기 ×</button></header><nav class="window-tabs" aria-label="게임 화면">${[['schedule','일정표'],['meeting','팀 회의'],['stage','무대'],['journal','성장 기록']].map(([id,title])=>`<button class="system-button" data-open="${id}" ${!state ? 'disabled' : ''}>${title}</button>`).join('')}</nav><div id="window-notice"></div><div id="window-body"></div><footer id="window-actions"></footer></dialog><div id="panel-storage" hidden></div>`;
  const storage = q('#panel-storage'), window = q('#game-window'), body = q('#window-body');
  const errors = error || html('<p id="error" role="alert"></p>');
  status.append(errors); q('#game-status').append(status);
  Object.values(panels).forEach(p => storage.append(p));
  q('#story-actions').append(primary);
  let returnFocus = null;
  const setRoom = (id, trigger) => {
    if (!state && !['start','journal'].includes(id)) return;
    if (trigger) returnFocus = trigger;
    if(id !== 'stage') performancePanel?.pausePerformance?.();
    for (const p of [...body.children]) storage.append(p);
    activeRoom = id;
    if (id === 'dorm') {
      panels.dorm?.remove();
      panels.dorm = html(`<div class="dorm-roster"><h2>함께 쉬어 가는 시간</h2><p>휴식은 이번 무대의 12PP 안에서 배분해요. 회복 1PP로 피로 12를 줄이고, 남은 포인트로 연습합니다.</p><div class="rest-members">${catalog.members.map((m,i)=>`<article>${doll(i)}<strong>${m.name}</strong><span>피로 ${state.members[m.id].fatigue || 0} / 100</span><progress aria-label="${m.name} 피로" max="100" value="${state.members[m.id].fatigue || 0}"></progress></article>`).join('')}</div><button data-open="schedule">일정표에서 휴식 배분하기</button><p class="note">방문만으로 피로가 회복되지는 않습니다. 합의한 계획으로 공연할 때 배분을 반영합니다.</p></div>`);
    }
    const panel = panels[id];
    if (panel) body.append(panel);
    if (id === 'stage' && !panel?.textContent.trim()) panel.innerHTML = '<div class="stage-empty"><span>☆</span><h2>아직 막이 오르지 않았어요</h2><p>함께 계획을 정하고 투표를 마치면 무대가 열립니다.</p><button data-open="schedule">무대 일정 정하기</button></div>';
    q('#window-title').textContent = roomNames[id];
    q('#window-notice').append(status);
    q('#window-actions').append(primary);
    q('#window-actions').append(errors);
    q('.window-tabs').hidden = !state || id === 'settings' || id === 'start';
    q('.window-tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.open === id)));
    if (!window.open) window.showModal();
    body.scrollTop = 0;
  };
  const closeRoom = () => { performancePanel?.pausePerformance?.(); activeRoom = null; window.close(); q('#story-actions').append(primary); q('#game-status').append(status, errors); returnFocus?.focus(); };
  q('#close-window').onclick = closeRoom;
  window.addEventListener('cancel', e => { e.preventDefault(); closeRoom(); });
  app.addEventListener('click', navigate, { once: true });
  // One delegate per new frame; old frames are discarded on server updates.
  function navigate(e) {
    const target = e.target.closest('[data-open], [data-member], #begin-story');
    if (target && !target.disabled) {
      if (target.dataset.member) { selectedMember = target.dataset.member; dialogueIndex = 0; paintMember(); }
      else setRoom(target.id === 'begin-story' ? 'start' : target.dataset.open, target);
    }
    app.addEventListener('click', navigate, { once: true });
  }
  // The root is stable, so replace its previous delegate when rerendering.
  if (app._gameNavigate) app.removeEventListener('click', app._gameNavigate);
  app._gameNavigate = navigate;
  function paintMember() {
    const i = catalog.members.findIndex(m=>m.id === selectedMember), m = catalog.members[i];
    const stats = state?.members[m.id];
    q('#member-profile').innerHTML = `<div class="portrait-frame">${doll(i,true)}<span class="portrait-flower" aria-hidden="true">✧</span></div><h2>${m.name}</h2><p class="member-role">${esc(m.role)}</p><dl class="member-stats"><div><dt>숙련</dt><dd>${stats ? stats.skill.toFixed(1) : '60.0'}</dd></div><div><dt>피로</dt><dd>${stats?.fatigue || 0}<small>/100</small></dd></div><div><dt>경험</dt><dd>${stats?.memories.length || 0}<small>개</small></dd></div></dl><p class="fiction-label">게임 속 성장 수치</p>`;
    app.querySelectorAll('[data-member]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.member === selectedMember)));
    const lines = r ? [...r.proposals.map(p=>({...p, origin:'첫 제안'})), ...r.discussion.map(p=>({...p, origin:'팀 토론'})), ...r.reflections.map(p=>({...p, origin:'무대 회고'}))].filter(p=>p.agentId === m.id) : [];
    dialogueIndex = Math.min(dialogueIndex, Math.max(0, lines.length - 1));
    const line = lines[dialogueIndex];
    q('#dialogue-portrait').innerHTML = doll(i,true);
    q('#speaker-name').textContent = line ? m.name : '진행 안내';
    q('#speech-origin').textContent = line ? line.origin : `${m.name} 선택 중`;
    q('#speech-text').textContent = line?.text || (state ? `${m.name}의 이야기를 기다리고 있어요. 멤버들의 첫 제안을 들은 뒤, 일정표에서 연습과 휴식을 정하고 의견을 나눠 보세요.` : '작은 마을에 다섯 멤버가 모였습니다. 그리고 마지막 한 사람, 바로 당신. 우리 여섯이 함께 만들 첫 무대를 준비해 볼까요?');
    q('#speech-page').textContent = lines.length ? `${dialogueIndex+1} / ${lines.length}` : '이야기 시작 전';
    q('#speech-prev').disabled = dialogueIndex === 0;
    q('#speech-next').disabled = dialogueIndex >= lines.length - 1;
  }
  q('#speech-prev').onclick = () => { dialogueIndex--; paintMember(); };
  q('#speech-next').onclick = () => { dialogueIndex++; paintMember(); };
  paintMember();
  if (plan && draft) {
    const ledger = html('<section class="schedule-ledger"><h2>이번 라운드 일정표</h2><p>한 칸은 1PP · 연습과 회복을 합해 12칸을 배분하세요.</p><div id="schedule-cells"></div><p id="schedule-total" role="status"></p></section>');
    plan.prepend(ledger);
    const update = () => {
      const total = draft.practice.reduce((a,b)=>a+b,0);
      const valid = total === 12 && draft.practice.every(v=>Number.isInteger(v)&&v>=1&&v<=8) && draft.recovery.every((v,i)=>Number.isInteger(v)&&v>=0&&v<=draft.practice[i]);
      q('#schedule-cells').innerHTML = catalog.members.map((m,i)=>`<div class="schedule-row"><span>${m.name}</span><div>${Array.from({length:Math.min(8,Math.max(0,Math.floor(draft.practice[i])||0))},(_,n)=>`<i class="${n < draft.recovery[i] ? 'rest' : 'train'}" title="${n < draft.recovery[i] ? '회복' : '연습'}">${n < draft.recovery[i] ? '休' : '♪'}</i>`).join('')}</div><small>연습 ${draft.practice[i]-draft.recovery[i]} · 회복 ${draft.recovery[i]}</small></div>`).join('');
      q('#schedule-total').textContent = valid ? '12 / 12PP · 이 일정으로 멤버들과 상의할 수 있어요.' : `${total} / 12PP · 각 멤버 1–8PP, 회복은 배분한 PP 이내로 맞춰 주세요.`;
      q('#schedule-total').classList.toggle('out', !valid);
      const discuss = q('#discuss'); if (discuss) discuss.disabled = !valid;
    };
    plan.addEventListener('input', update); update();
  }
  if (activeRoom) setRoom(activeRoom);
  const focused = focusSnapshot?.id && document.getElementById(focusSnapshot.id);
  if (focused && (window.open ? window.contains(focused) : !storage.contains(focused))) {
    focused.focus();
    if (focusSnapshot.start !== null && typeof focused.setSelectionRange === 'function') {
      try { focused.setSelectionRange(focusSnapshot.start, focusSnapshot.end); } catch { /* Non-text inputs have no selection. */ }
    }
  }
}
