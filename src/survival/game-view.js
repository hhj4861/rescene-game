/* global document, Event */
import {mountGameWorld,selectWorldMember,hydrateDollPortraits} from './three/game-world.js';
import { mountPerformance, stopPerformance } from './performance.js';
import { escapeHtml as esc } from './scene.js';
import { artwork, portrait, memberOrder, sceneFor, resultSummary, placeIcon } from './art.js';
let selectedMember = 'woni', activeRoom = null, previousPhase, previousSeason, previousScene;
let dialogueIndex = 0, focusSnapshot;
const names = { dorm:'숙소', schedule:'연습실', meeting:'회의실', stage:'공연장', journal:'기록실', settings:'수첩과 설정', start:'함께 시작하기', details:'우리의 성장 기록', votes:'팀 회의 기록', results:'심사와 전체 순위' };
export function captureGameFocus() {
  const el = document.activeElement;
  focusSnapshot = el?.id ? { id:el.id, start:el.selectionStart, end:el.selectionEnd } : null;
}
function fragment(...nodes) {
  const result = document.createElement('div');
  nodes.filter(Boolean).forEach(n => result.append(n)); return result;
}
function html(markup) { const e = document.createElement('div'); e.innerHTML = markup; return e; }
export function mountGame({ app, state, catalog, draft }) {
  stopPerformance();
  const q = selector => app.querySelector(selector), r = state?.rounds[state.round];
  if (previousSeason !== state?.id) { activeRoom = null; dialogueIndex = 0; }
  else if (previousPhase !== state?.phase && !state?.busy) { activeRoom = null; dialogueIndex = 0; }
  if (!state?.busy) previousPhase = state?.phase;
  previousSeason = state?.id;
  const defaultScene=sceneFor(state);
  if(defaultScene!==previousScene)selectedMember=['planning','reflection'].includes(defaultScene)?'minami':'woni';
  previousScene=defaultScene;
  const plan = q('#plan-panel'), actionNodes = q('.side > .actions');
  const error = q('#error') || html('<p id="error" role="alert"></p>');
  const status = fragment(...app.querySelectorAll('.status'), error);
  const voteList = q('.vote-list'), voteNote = voteList?.nextElementSibling;
  const performancePanel = q('#performance-panel');
  const primary = actionNodes || html('<button id="begin-story">함께 시작하기</button>');
  const panels = {
    start:fragment(q('#start')), schedule:fragment(plan),
    votes:fragment(q('.layout .room'), q('#meeting-panel'), voteList, voteNote, ...app.querySelectorAll('[data-skip]')),
    stage:fragment(performancePanel), results:fragment(q('#result-panel'), q('#season-ending')),
    details:fragment(q('.growth'), q('#reflection-panel'), q('#history-panel')),
    settings:fragment(q('#source-room'), q('.side > details:not(#source-room)'), q('#restart')),
  };
  const members = memberOrder.map(id => catalog.members.find(m => m.id === id));
  const step = !state || ['announced','proposal'].includes(state.phase) ? 0 : ['meeting','discussion','voted','voting','agreed'].includes(state.phase) ? 1 : ['performance','judging'].includes(state.phase) ? 2 : 3;
  app.innerHTML = `<main class="game-frame approved-frame" data-phase="${state?.phase||'arrival'}">
    <header class="game-header"><div class="game-brand">RESCENE <span>— 우리 여섯의 계절</span></div>
      <nav class="game-progress" aria-label="라운드 진행">${['컨셉 확인','상의와 연습','공연','회고'].map((s,i)=>`<span class="${i===step?'active':''}" ${i===step?'aria-current="step"':''}><b>${i+1}</b>${s}</span>`).join('')}</nav>
      <span class="chapter-label">${state?`Round ${state.round} / 10`:'프롤로그'}</span>
      <button class="settings-button" data-open="${state?'settings':'details'}" aria-label="${state?'수첩과 설정':'지난 시즌 기록'}">⚙</button></header>
    <nav class="place-menu" aria-label="마을의 장소">${['dorm','schedule','meeting','stage','journal'].map(id=>`<button data-open="${id}" ${!state?'disabled':''}><span aria-hidden="true">${placeIcon(id)}</span>${names[id]}</button>`).join('')}<p>작은 바다가<br>큰 꿈을 키우는 곳.</p></nav>
    <section id="scene-content" aria-label="이야기 장면"><div class="world-painting"></div><div id="scene-sheet"></div></section>
    <div id="game-status" aria-live="polite"></div>
    <section class="story-box" aria-label="멤버 대화"><div id="dialogue-portrait"></div><div class="story-copy"><div class="speaker-line"><strong id="speaker-name"></strong><span id="speech-origin"></span></div><p id="speech-text"></p><div class="speech-controls"><button id="speech-prev" aria-label="이전 대화">‹</button><span id="speech-page"></span><button id="speech-next" aria-label="다음 대화">›</button><button data-open="votes" ${!state?'disabled':''}>회의 기록</button></div></div><div id="story-actions" class="story-actions"></div></section>
    <footer class="game-footer">비공식 팬 게임 · 캐릭터·대화·무대와 성장 수치는 창작입니다.</footer>
  </main>
  <dialog id="game-window" aria-labelledby="window-title"><header class="window-header"><h1 id="window-title"></h1><button id="close-window" aria-label="마을로 돌아가기">닫기 ×</button></header><div id="window-notice"></div><div id="window-body"></div><footer id="window-actions"></footer></dialog><div id="panel-storage" hidden></div>`;
  const storage = q('#panel-storage'), modal = q('#game-window'), body = q('#window-body');
  Object.values(panels).forEach(p => storage.append(p));
  q('#game-status').append(status); q('#story-actions').append(primary);
  if (performancePanel) mountPerformance(performancePanel, { round:r, members:catalog.members, seed:`${state.seed}:${state.round}` });
  const discussButton=plan?.querySelector('#discuss');
  let returnFocus, currentScene;
  const memberButtons = () => members.map(m=>`<button class="member-choice" data-member="${m.id}" aria-label="${m.name} 선택">${portrait(m.id)}<span>${m.name}</span></button>`).join('');
  const setScene = scene => {
    if (scene !== 'performance') performancePanel?.pausePerformance?.();
    for (const p of Object.values(panels)) storage.append(p);
    if(discussButton)plan.querySelector('.plan-submit').prepend(discussButton);
    q('.finale-actions')?.remove();
    currentScene = scene;
    q('.game-frame').dataset.scene = scene;
    const sheet = q('#scene-sheet');
    sheet.innerHTML = ''; sheet.scrollTop=0;
    q('#story-actions').append(primary);
    if (scene === 'arrival') {
      sheet.innerHTML = `<section class="paper arrival-paper"><h1>첫 만남</h1><p>다섯 멤버와 인사를 나눠요</p><div class="arrival-members">${memberButtons()}</div><p class="paper-note">그리고 마지막 한 사람, 당신.</p></section>`;
    } else if (scene === 'planning') {
      sheet.append(panels.schedule);
      const brief = html(`<div class="planning-brief"><span>이번 무대</span><strong>${esc(r.concept)}</strong><button data-open="votes">컨셉과 상대 보기</button></div>`);
      sheet.prepend(brief);
      const yes = r.votes.filter(v=>v.approve===true).length + Number(r.userVote===true);
      const no = r.votes.filter(v=>v.approve===false).length + Number(r.userVote===false);
      const votes = html(`<section class="consensus"><div class="vote-portraits">${[...members,{id:'user',name:'나'}].map(m=>{
        const v=m.id==='user'?r.userVote:r.votes.find(v=>v.agentId===m.id)?.approve;
        return `<div>${m.id==='user'?'<div class="user-portrait">나</div>':portrait(m.id)}<span>${m.name}</span><small class="${v===true?'agree':v===false?'disagree':'waiting'}">${v===true?'찬성':v===false?'반대':'대기'}</small></div>`;
      }).join('')}</div><p>찬성 ${yes} · 반대 ${no} · 대기 ${6-yes-no}<small>계획을 바꾸면 다시 상의해요.</small></p></section>`);
      sheet.append(votes);
      const discuss=plan?.querySelector('#discuss');
      if(discuss)q('#story-actions').append(discuss);
    } else if (scene === 'performance') {
      if (performancePanel) sheet.append(panels.stage);
      else sheet.innerHTML = '<section class="paper stage-empty"><h1>아직 막이 오르지 않았어요</h1><p>팀의 합의와 수행을 마치면 무대를 볼 수 있어요.</p><button data-open="meeting">무대 준비로 돌아가기</button></section>';
    } else if (scene === 'reflection') {
      const summary = resultSummary(state);
      sheet.innerHTML = `<section class="paper reflection-paper"><div class="round-outcome"><h1>${esc(summary.title)}</h1><p>${esc(summary.detail)}</p></div><div class="reflection-members">${memberButtons()}</div><h2>오늘을 다음 무대로</h2><p class="reflection-intro">지난 경험과 다음에 시도할 약속을 나눠요.</p><div id="reflection-insight"></div><div class="reflection-links"><button data-open="stage">무대 다시 보기</button><button data-open="results">심사·순위 보기</button><button data-open="details">성장 기록 전체</button></div><div class="reflection-primary"></div></section>`;
      q('.reflection-primary').append(primary);
    } else {
      const summary=resultSummary(state);
      const endingLabel=summary.outcome==='champion'?'우리 여섯이 만든 우승':summary.title.includes('준우승')?'함께 만든 준우승':'함께 남긴 시즌 기록';
      const ours=Object.values(state.rounds).filter(v=>v.evidence.some(e=>e.teamId==='team-0'));
      sheet.innerHTML=`<div class="finale-title"><p>시즌 완료</p><h1>우리 여섯이 만든 계절</h1><span title="${esc(summary.title)}">${endingLabel}</span></div><section class="paper finale-paper"><h2>함께 남긴 기록</h2>${ours.filter((_,i)=>i===0||i===Math.floor((ours.length-1)/2)||i===ours.length-1).map(v=>`<article>${artwork('05-finale',v===ours[0]?'1277 271 213 119':v===ours.at(-1)?'1277 546 213 120':'1277 410 213 118')}<div><h3>${esc(v.concept)}</h3><p>${v.reflections.length}명의 회고 · ${v.learningCommitted?'경험 저장 완료':'회고 대기'}</p></div></article>`).join('')}</section>`;
      q('#story-actions').append(html('<div class="finale-actions"><button data-open="details">이번 시즌 기록 보기</button><button id="finale-restart" class="secondary">새 시즌 준비</button><small>기존 시즌은 보관돼요.</small></div>'));
      q('#finale-restart').onclick=()=>panels.settings.querySelector('#restart')?.click();
    }
    q('.place-menu').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(
      scene==='planning'&&b.dataset.open===(activeRoom==='schedule'?'schedule':'meeting') || scene==='performance'&&b.dataset.open==='stage' || scene==='reflection'&&b.dataset.open==='journal' || scene==='finale'&&b.dataset.open==='stage')));
    mountGameWorld(scene==='performance'&&performancePanel?performancePanel.querySelector('.concert-world'):q('.world-painting'),{scene,selectedMember,onSelect:id=>{selectedMember=id;dialogueIndex=0;paintMember();}});
    paintMember();hydrateDollPortraits(app);
  };
  const openModal = (id,trigger) => {
    performancePanel?.pausePerformance?.(); returnFocus=trigger || returnFocus;
    for (const p of [...body.children]) storage.append(p);
    if(id==='dorm') {
      panels.dorm?.remove();
      panels.dorm=html(`<section class="dorm-roster"><h2>함께 쉬어 가는 시간</h2><p>이번 무대의 12PP 안에서 연습과 휴식을 나눠요.</p><div class="rest-members">${members.map(m=>`<article>${portrait(m.id)}<strong>${m.name}</strong><span>피로 ${state.members[m.id].fatigue||0} / 100</span><progress max="100" value="${state.members[m.id].fatigue||0}" aria-label="${m.name} 피로"></progress></article>`).join('')}</div><button data-open="schedule">일정표에서 휴식 배분하기</button><p>방문만으로 피로가 회복되지는 않습니다.</p></section>`);
    }
    body.append(panels[id]);
    q('#window-title').textContent=names[id];
    q('#window-notice').append(status); q('#window-actions').append(primary);
    activeRoom=id; if(!modal.open)modal.showModal();hydrateDollPortraits(app);
  };
  const closeRoom=()=>{activeRoom=null;modal.close();q('#game-status').append(status);(q('.reflection-primary')||q('#story-actions')).append(primary);returnFocus?.focus({preventScroll:true});};
  const navigate=(id,trigger)=>{
    if(!state&&!['start','details'].includes(id))return;
    if(['schedule','meeting','stage','journal'].includes(id)){
      if(modal.open)closeRoom();
      activeRoom=id;
      setScene(id==='stage'?'performance':id==='journal'?'reflection':'planning');
    } else openModal(id,trigger);
  };
  q('#close-window').onclick=closeRoom;
  modal.addEventListener('cancel',e=>{e.preventDefault();closeRoom();});
  if(app._gameNavigate)app.removeEventListener('click',app._gameNavigate);
  app._gameNavigate=e=>{
    const b=e.target.closest('[data-open],[data-member],#begin-story');
    if(!b||b.disabled)return;
    if(b.dataset.member){selectedMember=b.dataset.member;dialogueIndex=0;selectWorldMember(selectedMember,true);paintMember();}
    else navigate(b.id==='begin-story'?'start':b.dataset.open,b);
  };
  app.addEventListener('click',app._gameNavigate);
  function paintMember(){
    const m=catalog.members.find(m=>m.id===selectedMember) || catalog.members[0];
    const lines=r?[...r.reflections.map(p=>({...p,origin:'무대 회고'})),...r.discussion.map(p=>({...p,origin:'팀 토론'})).reverse(),...r.proposals.map(p=>({...p,origin:'첫 제안'}))].filter(p=>p.agentId===m.id):[];
    dialogueIndex=Math.min(dialogueIndex,Math.max(0,lines.length-1));
    const line=lines[dialogueIndex];
    q('#dialogue-portrait').innerHTML=portrait(m.id,true);selectWorldMember(m.id);hydrateDollPortraits(q('#dialogue-portrait'));
    q('#speaker-name').textContent=line?m.name:'진행 안내';
    q('#speech-origin').textContent=line?line.origin:`${m.name} 선택 중`;
    q('#speech-text').textContent=line?.text || (!state?'마지막 한 사람, 기다리고 있었어요. 함께 첫 무대를 준비해 볼까요?':'멤버의 의견을 듣고 함께 무대를 준비해요. 일정과 대화는 현재 라운드에 저장됩니다.');
    q('#speech-page').textContent=lines.length?`${dialogueIndex+1} / ${lines.length}`:'첫 만남';
    q('#speech-prev').disabled=dialogueIndex===0;
    q('#speech-next').disabled=dialogueIndex>=lines.length-1;
    app.querySelectorAll('[data-member]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.member===m.id)));
    if(currentScene==='reflection'){
      const reflection=r.reflections.find(v=>v.agentId===m.id);
      const evidence=r.evidence.find(e=>e.teamId==='team-0')?.events.find(e=>e.memberId===m.id);
      const hypothesis=state.members[m.id].hypotheses.find(h=>h.round===state.round);
      const insight=q('#reflection-insight');
      insight.innerHTML=`<div class="insight-pair"><article><h3>이번 무대의 기록</h3><p>${evidence?`완성도 ${Number(evidence.quality).toFixed(1)} · 호흡 부담 ${Number(evidence.breath).toFixed(1)}`:'아직 수행 기록이 없어요.'}</p></article><article><h3>다음에 시도할 약속</h3><p>${esc(reflection?.action||'회고를 마치면 다음 계획을 볼 수 있어요.')}</p><small>${hypothesis?.supportedCount>=2?'지지 관찰 누적 · 인과 확정 아님':'아직 검증 전'}</small></article></div><div class="team-memory"><h3>팀의 한마디</h3><p>${esc(reflection?.text||'공개된 회고를 기다리고 있어요.')}</p><button id="pin-reflection" ${!reflection||state.phase!=='learned'||state.busy?'disabled':''}>${state.teamMemory?.some(v=>v.round===state.round&&v.memoryId.endsWith(':'+m.id))?'팀의 기억에 남겼어요':'팀의 기억으로 남기기'}</button></div>`;
      q('#pin-reflection').onclick=()=>panels.details.querySelector(`[data-pin="${m.id}"]`)?.click();
    }
  }
  q('#speech-prev').onclick=()=>{dialogueIndex--;paintMember();};
  q('#speech-next').onclick=()=>{dialogueIndex++;paintMember();};
  if(plan&&draft){
    plan.querySelectorAll('[data-avatar]').forEach(el=>{el.innerHTML=portrait(el.dataset.avatar);});
    const update=()=>{
      const total=draft.practice.reduce((a,b)=>a+b,0);
      const valid=total===12&&draft.practice.every(v=>Number.isInteger(v)&&v>=1&&v<=8)&&draft.recovery.every((v,i)=>Number.isInteger(v)&&v>=0&&v<=draft.practice[i])&&new Set(draft.leads).size===5;
      const slots=plan.querySelector('#schedule-cells');
      slots.innerHTML=members.flatMap(m=>{const i=catalog.members.findIndex(v=>v.id===m.id);return Array.from({length:Math.min(8,Math.max(0,Math.floor(draft.practice[i])||0))},(_,n)=>`<i class="slot member-${m.id} ${n<draft.recovery[i]?'rest':''}" title="${m.name} ${n<draft.recovery[i]?'휴식':'연습'}">${n<draft.recovery[i]?'休':'♪'}</i>`);}).join('');
      plan.querySelector('#schedule-total').textContent=valid?'12 / 12 배분 완료':`${total} / 12 · 배분과 파트 순서를 확인해요`;
      plan.querySelector('#schedule-total').classList.toggle('out',!valid);
      const discuss=q('#discuss');if(discuss)discuss.disabled=!valid||state.busy;
    };
    plan.addEventListener('input',update);plan.addEventListener('change',update);
    plan.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{
      const input=plan.querySelector('#'+b.dataset.target);
      const next=Number(input.value)+Number(b.dataset.step);
      if(next<Number(input.min)||next>Number(input.max))return;
      input.value=String(next);input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    update();
  }
  setScene(sceneFor(state));
  if(activeRoom)navigate(activeRoom);
  const focused=focusSnapshot?.id&&document.getElementById(focusSnapshot.id);
  if(focused&&!storage.contains(focused)&&(modal.open?modal.contains(focused):!focused.closest('dialog'))){
    focused.focus({preventScroll:true});
    if(focusSnapshot.start!==null&&typeof focused.setSelectionRange==='function')try{focused.setSelectionRange(focusSnapshot.start,focusSnapshot.end);}catch{/* Numeric inputs have no selection. */}
  }
}
