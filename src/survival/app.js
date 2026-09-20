/* global document, fetch, clearTimeout, setTimeout, crypto, structuredClone, confirm, AudioContext, clearInterval, setInterval, FormData */
const app = document.querySelector('#app');
let state, catalog, token, polling, draft, draftRound, audio, replayTimer;
let sourceDraft = {}, openedDetails = new Set();
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = { announced: '회의 준비', proposal: '각자의 아이디어', meeting: '팀 회의', discussion: '의견 나누기', voted: '투표 준비', voting: '멤버 투표', agreed: '무대 준비 완료', performance: '멤버별 수행', judging: '전문가 심사', result: '라운드 결과', reflection: '함께 돌아보기', learned: '경험 저장 완료', spectator: '다음 무대 관전', 'watch-judging': '관전 심사', spectated: '관전 결과', complete: '시즌 종료' };
const danceNames = { flow: '유연한 동작', groove: '리듬 중심', power: '파워 안무' };
const riskNames = { none: '안정적인 구성', adlib: '보컬 애드리브', danceBreak: '댄스 브레이크', unit: '유닛 전환' };
const name = id => catalog.members.find(m => m.id === id)?.name || catalog.judges.find(j => j.id === id)?.name || '나';
function team() { return `<div class="team">${[...catalog.members, { id: 'user', name: '나' }].map(m => `<div class="seat"><div class="avatar">${esc(m.name.slice(0, 1))}</div><strong>${m.name}</strong><small>${m.id === 'user' ? '여섯 번째 팀원' : '우리 팀'}</small></div>`).join('')}</div><div class="tableline"></div>`; }
async function refresh(force = false) {
  try {
    const response = await fetch('/api/state'); if (!response.ok) throw new Error('게임 서버에 연결할 수 없습니다');
    const data = await response.json(); token = data.token; catalog = data.catalog;
    const changed = force || !state || JSON.stringify(data.state) !== JSON.stringify(state);
    state = data.state;
    if (changed) render();
    clearTimeout(polling); polling = setTimeout(refresh, state?.busy ? 1200 : 5000);
  } catch (e) { showError(e.message + ' · 서버를 실행한 뒤 새로고침하세요.'); }
}
async function post(path, data) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Survival-Token': token }, body: JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
}
function showError(message) { const box = document.querySelector('#error'); if (box) box.textContent = message; else app.textContent = message; }
async function command(action, payload = {}) {
  try { await post('/api/command', { commandId: crypto.randomUUID(), expectedRevision: state.revision, action, payload }); await refresh(true); }
  catch (e) { showError(e.message); }
}
function message(item, user = false) {
  return `<article class="message ${user ? 'user' : ''}"><div class="initial">${esc(name(item.agentId).slice(0, 1))}</div><div class="bubble"><strong>${user ? '나의 의견' : name(item.agentId)}</strong>${esc(item.text)}${item.plan ? `<div class="refs">${esc(catalog.music.find(m => m.id === item.plan.music)?.name)} · ${danceNames[item.plan.dance]} · 연습 ${item.plan.practice.join('/')}</div><button class="secondary small" data-adopt="${item.agentId}">이 제안으로 계획 편집</button>` : ''}${item.memoryRefs?.length ? `<div class="refs">지난 경험 반영: ${item.memoryRefs.map(esc).join(', ')}</div>` : ''}</div></article>`;
}
function sourceRoom() {
  const status = { 'reviewed-text': '기본 자료 · 텍스트 검수', 'reviewed-user': '사용자 검수', pending: '미검수 · 미사용', withdrawn: '철회 · 미사용' };
  return `<details id="source-room"><summary>멤버 자료 관리</summary><p class="note">${catalog.personaStatus} 링크만으로 영상을 자동 학습하지 않습니다. 짧게 요약해 등록하고, 직접 검수한 자료만 다음 라운드부터 참고합니다. 첫 제안 전에도 변경할 수 있습니다. 철회 기록을 포함해 최대 150개를 보관합니다.</p><p class="note">${state.canManageSources ? '지금 자료를 추가·검수·철회할 수 있습니다.' : '이번 라운드의 자료는 고정됐습니다. 회고 저장 후 변경할 수 있습니다.'}</p><form id="source-form"><fieldset ${state.canManageSources ? '' : 'disabled'}>
  <div class="row"><div class="field"><label for="source-member">자료의 멤버</label><select id="source-member" name="memberId">${catalog.members.map(m => `<option value="${m.id}" ${sourceDraft.memberId === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div><div class="field"><label for="source-type">자료 종류</label><select id="source-type" name="evidenceType">${[['direct-interview', '직접 인터뷰'], ['video', '영상'], ['blog', '블로그']].map(([v, n]) => `<option value="${v}" ${sourceDraft.evidenceType === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
  ${[['title', '자료 제목', 'text', 120], ['url', '원문 HTTPS 링크', 'url', 1500], ['publishedAt', '발행일', 'date', 10], ['locator', '발언 위치 · 영상 01:23 / 글 문단·질문', 'text', 160], ['usageBasis', '이용 근거 · 직접 작성한 짧은 요약 등', 'text', 200]].map(([key, label, type, max]) => `<div class="field"><label for="source-${key}">${label}</label><input id="source-${key}" name="${key}" type="${type}" maxlength="${max}" value="${esc(sourceDraft[key] || '')}" required></div>`).join('')}
  <div class="field"><label for="source-summary">본인 발언의 짧은 요약 · 최대 300자</label><textarea id="source-summary" name="summary" maxlength="300" required>${esc(sourceDraft.summary || '')}</textarea><p class="note">팬 해석·타인 발언은 등록 대상이 아닙니다. 링크와 요약을 등록해도 자동으로 사실 검증되지는 않습니다.</p></div><button class="secondary small">미검수 자료로 등록</button></fieldset></form>
  ${state.sourceLibrary.map(v => `<article class="source" data-source-row="${esc(v.sourceId)}"><strong>${name(v.memberId)} · ${status[v.verificationStatus]}</strong><br><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a> · ${esc(v.publishedAt)}<p>${esc(v.summary)}</p>${v.locator ? `<p>${esc(v.locator)}</p>` : ''}${['pending', 'withdrawn'].includes(v.verificationStatus) ? `<label class="check"><input type="checkbox" data-confirm-source="${esc(v.sourceId)}" ${state.canManageSources ? '' : 'disabled'}>원문에서 이 멤버의 발언과 요약·발행일·이용 근거를 직접 확인했습니다.</label><button class="secondary small" data-review-source="${esc(v.sourceId)}" disabled>${v.verificationStatus === 'withdrawn' ? '재검수 완료 · 다시 참고' : '검수 완료 · 참고 허용'}</button>` : ''}${v.verificationStatus !== 'withdrawn' ? `<p class="note">철회하면 현재 검색 가능한 경험 ${state.sourceImpact[v.sourceId].memories}개 · 가설 ${state.sourceImpact[v.sourceId].hypotheses}개 · 팀 교훈 ${state.sourceImpact[v.sourceId].teamPins}개가 검색에서 제외됩니다. 기록은 보존하며 재검수하면 다시 참고할 수 있습니다.</p><div class="field"><label for="withdraw-${v.sourceId}">철회 사유</label><input id="withdraw-${v.sourceId}" maxlength="200" ${state.canManageSources ? '' : 'disabled'}></div><button class="secondary small" data-withdraw-source="${esc(v.sourceId)}" ${state.canManageSources ? '' : 'disabled'}>자료 철회</button>` : `<p>철회 사유: ${esc(v.audit?.at(-1)?.reason)}</p>`}</article>`).join('')}</details>`;
}
function growthRoom() {
  const active = new Set(state.sourceLibrary.filter(s => ['reviewed-text', 'reviewed-user'].includes(s.verificationStatus)).map(s => s.sourceId));
  return `<section class="panel growth"><h2>우리의 성장 노트</h2><p class="note">게임 숙련과 경험 기록입니다. 행동 가설의 효과는 아직 자동 검증하지 않습니다.</p>${catalog.members.map(m => `<details id="growth-${m.id}"><summary>${m.name} · 숙련 ${state.members[m.id].skill.toFixed(2)} · 경험 ${state.members[m.id].memories.length}개</summary>${state.growth[m.id].length ? state.growth[m.id].map(g => {
    const memory = state.members[m.id].memories.find(v => v.round === g.round);
    const excluded = memory && (memory.sourceRefs ? memory.sourceRefs.some(id => !active.has(id)) : state.sourceLibrary.some(s => s.verificationStatus === 'withdrawn'));
    return `<article class="source"><strong>R${g.round} · ${esc(g.concept)}</strong><p>${g.before === undefined ? '이전 버전 기록 · 숙련 전후 수치 없음' : `숙련 ${g.before.toFixed(2)} → ${g.after.toFixed(2)} · 연습 ${g.practice}점`}</p><p>${g.event ? `무대 완성도 ${g.event.quality} · 호흡 부담 ${g.event.breath}` : ''}</p><p>${esc(g.reflection?.text)}</p><p>검증 전 행동 가설: ${esc(g.reflection?.action)}</p><p>${g.referencedBy.length ? `제안에서 참고: ${g.referencedBy.map(n => `R${n}`).join(', ')} (효과 입증과 다릅니다)` : '다음 제안 반영 기록 없음'}</p>${excluded ? '<p class="out">철회 자료가 연관되어 이후 기억 검색에서 제외됩니다. 과거 경기 기록은 보존합니다.</p>' : ''}</article>`;
  }).join('') : '<p class="note">첫 무대 회고를 마치면 여기에 경험이 쌓입니다.</p>'}</details>`).join('')}</section>`;
}
function bindSources() {
  document.querySelectorAll('details[id]').forEach(el => { el.open = openedDetails.has(el.id); el.ontoggle = () => { if (el.open) openedDetails.add(el.id); else openedDetails.delete(el.id); }; });
  const form = document.querySelector('#source-form');
  form.oninput = () => { sourceDraft = Object.fromEntries(new FormData(form)); };
  form.onsubmit = async e => { e.preventDefault(); const data = Object.fromEntries(new FormData(form)); await command('addSource', { ...data, speakerId: data.memberId }); };
  document.querySelectorAll('[data-confirm-source]').forEach(el => el.onchange = () => { document.querySelector(`[data-review-source="${el.dataset.confirmSource}"]`).disabled = !el.checked || !state.canManageSources; });
  document.querySelectorAll('[data-review-source]').forEach(el => el.onclick = () => command('reviewSource', { sourceId: el.dataset.reviewSource, confirmed: true }));
  document.querySelectorAll('[data-withdraw-source]').forEach(el => el.onclick = () => command('withdrawSource', { sourceId: el.dataset.withdrawSource, reason: document.getElementById(`withdraw-${el.dataset.withdrawSource}`).value }));
}
function planForm(r) {
  if (draftRound !== `${state.id}:${state.round}`) { draft = structuredClone(r.plan); draftRound = `${state.id}:${state.round}`; }
  const editable = ['meeting', 'voted', 'agreed'].includes(state.phase) && !state.busy;
  return `<h2>함께 만들 무대</h2><p class="note">아이디어를 모아 계획을 제안하세요. 바뀐 계획은 여섯 명이 다시 투표합니다.</p><fieldset ${editable ? '' : 'disabled'}><div class="row"><div class="field"><label for="music">음악</label><select id="music">${catalog.music.map(m => `<option value="${m.id}" ${draft.music === m.id ? 'selected' : ''}>${m.name} · ${m.bpm} BPM</option>`).join('')}</select></div><div class="field"><label for="dance">안무</label><select id="dance">${catalog.dances.map(d => `<option value="${d}" ${draft.dance === d ? 'selected' : ''}>${danceNames[d]}</option>`).join('')}</select></div></div><div class="field"><label for="risk">무대 포인트</label><select id="risk">${catalog.risks.map(d => `<option value="${d}" ${draft.risk === d ? 'selected' : ''}>${riskNames[d]}</option>`).join('')}</select></div><div class="field"><label for="direction">무대 방향</label><input id="direction" maxlength="400" value="${esc(draft.direction)}"></div><div class="field"><label>연습 포인트 · 총 12</label><div class="allocations">${catalog.members.map((m, i) => `<label>${m.name}<input type="number" min="1" max="8" data-practice="${i}" value="${draft.practice[i]}"></label>`).join('')}</div></div><div class="field"><label for="leads">파트 순서 · 각자 12초</label><div class="allocations" id="leads">${draft.leads.map((lead, i) => `<select aria-label="${i + 1}번째 파트" data-lead="${i}">${catalog.members.map(m => `<option value="${m.id}" ${lead === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select>`).join('')}</div></div><div class="field"><label for="opinion">팀원들에게 하고 싶은 말</label><textarea id="opinion" maxlength="2000" placeholder="나는 후렴에서 호흡을 지킬 수 있게 동선을 줄이고 싶어. 다들 어떻게 생각해?">${esc(draft.message || '')}</textarea></div></fieldset>${editable ? '<button id="discuss">이 계획으로 의견 나누기</button>' : ''}<div class="actions"><button id="listen" class="secondary small">음악 스케치 듣기</button></div><p class="note">게임용 신스 스케치입니다. RESCENE 원곡·실제 가창은 재생하지 않습니다.</p>`;
}
function result(r) {
  if (!r.ranking.length) return '';
  const ours = r.ranking.find(t => t.teamId === 'team-0');
  return `<section class="panel"><h2>${ours ? `우리의 무대 ${(ours.total / 5).toFixed(1)}점` : '이번 라운드 결과'}</h2><p class="note">가상 전문가 5명의 시뮬레이션 평가 · 실제 음원 감상이 아닙니다.</p>${r.judging.map(j => { const v = j.scores.find(v => v.teamId === 'team-0'); return v ? `<div class="source"><strong>${name(j.agentId)} · ${v.criteria.reduce((a, b) => a + b, 0)}점</strong><br>${esc(v.reason)}</div>` : ''; }).join('')}<details><summary>전체 순위와 탈락 팀</summary><table class="scoreboard"><thead><tr><th>순위</th><th>팀</th><th>평균</th><th>결과</th></tr></thead><tbody>${r.ranking.map((t, i) => `<tr class="${t.teamId === 'team-0' ? 'ours' : ''}"><td>${i + 1}</td><td>${esc(t.name)}</td><td>${(t.total / 5).toFixed(1)}</td><td>${r.eliminated.includes(t.teamId) ? '<span class="out">탈락</span>' : '생존'}</td></tr>`).join('')}</tbody></table></details></section>`;
}
function render() {
  const heading = `<header><div class="brand">RESCENE<span>우리 여섯의 무대</span></div><span class="note">로컬 에이전트 서바이벌</span></header>`;
  if (!state) {
    app.innerHTML = `${heading}<main class="welcome"><section class="room"><h1>무대가 시작되기 전,<br>우리의 이야기가 먼저.</h1><p class="intro">나와 미나미, 원이, 제나, 리브, 메이.<br>서로 다른 여섯 의견으로 하나의 무대를 만들어요.</p>${team()}<p>20개 팀, 10개의 컨셉. 함께 고르고, 부딪히고, 다음 무대에서 성장합니다.</p></section><form id="start"><div class="field"><label for="provider">멤버와 심사위원의 로컬 LLM</label><select id="provider"><option value="claude">Claude</option><option value="codex">Codex</option></select></div><div class="field"><label for="seed">시즌 이름</label><input id="seed" value="우리의 첫 무대" maxlength="80"></div><button>팀 회의실 들어가기</button><p class="note">현재 PC의 로그인된 세션을 사용합니다. 한 라운드 기본 30회, 최대 55회 호출하며 구독 사용량이 발생합니다. 버튼을 누른 뒤 첫 제안은 별도로 시작합니다.</p></form><p id="error" class="inline-error" role="alert"></p><p class="footer">공개 인터뷰를 참고한 비공식 팬 게임. 에이전트의 의견과 사건은 창작입니다.</p></main>`;
    document.querySelector('#start').onsubmit = async e => { e.preventDefault(); try { await post('/api/new', { seed: document.querySelector('#seed').value, provider: document.querySelector('#provider').value }); refresh(true); } catch (e) { showError(e.message); } }; return;
  }
  const r = state.rounds[state.round], can = !state.busy;
  const progress = state.traces.filter(t => t.status === 'running').map(t => name(t.agentId)).join(', ');
  const actions = [];
  if (['announced', 'proposal'].includes(state.phase)) actions.push(['open', '다섯 멤버의 첫 제안 듣기']);
  if (state.phase === 'discussion') actions.push(['discuss', '중단된 토론 재시도']);
  if (state.phase === 'voting') actions.push(['vote', '미완료 투표 마무리·재시도']);
  if (['agreed', 'performance', 'judging'].includes(state.phase)) actions.push(['perform', state.phase === 'agreed' ? '합의한 무대 시작' : '중단된 무대·심사 재시도']);
  if (['result', 'reflection'].includes(state.phase)) actions.push(['reflect', '함께 돌아보고 경험 저장']);
  if (['learned', 'spectated'].includes(state.phase)) actions.push(['next', state.round === 10 ? '시즌 마무리' : '다음 라운드로']);
  if (['spectator', 'watch-judging'].includes(state.phase)) actions.push(['watch', '이번 라운드 관전 · 심사 5회 호출']);
  const posts = [...r.proposals, ...r.messages.map(m => ({ ...m, agentId: 'user' })), ...r.discussion];
  app.innerHTML = `${heading}<main><div class="seasonbar"><strong>Round ${state.round} / 10</strong><div class="rounds">${Array.from({ length: 10 }, (_, i) => `<span class="${i + 1 === state.round ? 'current' : i + 1 < state.round ? 'done' : ''}">${i + 1}</span>`).join('')}</div><span class="note">${state.teams.filter(t => t.alive).length}팀 생존 · ${labels[state.phase]}</span></div>${state.busy ? `<div class="status busy" role="status">${esc(progress || '팀의 응답을 기다리고 있어요')} · 호출 ${r.calls}/55 <button id="cancel" class="secondary small">호출 취소</button></div>` : ''}${state.error ? `<div class="status error" role="alert">${esc(state.error)}</div>` : ''}<div class="layout"><div><section class="room"><h1>${esc(r.concept)}</h1><p>이번 무대의 컨셉입니다. 음악, 안무, 파트를 함께 정해요.</p>${team()}</section><section class="panel"><h2>우리 팀 회의</h2><div class="thread">${posts.length ? posts.map(p => message(p, p.agentId === 'user')).join('') : '<div class="empty">첫 무대에 어떤 이야기를 담을까요?<br>멤버들의 제안부터 들어보세요.</div>'}</div></section>${r.votes.length ? `<div class="vote-list">${[...r.votes, { agentId: 'user', approve: r.userVote }].map(v => `<span class="vote ${v.approve ? 'yes' : 'no'}">${name(v.agentId)} ${v.approve === null ? '미투표' : v.approve ? '찬성' : '반대'}</span>`).join('')}</div><p class="note">찬성 ${r.votes.filter(v => v.approve).length + Number(r.userVote)}/6 · 4명 이상 동의해야 합니다.${r.needsRediscussion ? ' 나의 반대 의견을 담아 재토론할 기회가 남아 있어요.' : ''}</p>` : ''}${r.evidence.some(e => e.teamId === 'team-0') ? `<section class="panel"><h2>우리의 60초</h2><div class="stage"><div class="beam"></div><div class="beam"></div>${catalog.members.map((m, i) => `<div class="performer" id="performer-${m.id}" data-position="${i}"><span>${m.name}</span></div>`).join('')}</div><div id="cue" class="cue">합의한 파트 순서와 수행 기록을 재생해요.</div><button id="replay" class="secondary small">무대 리플레이</button></section>` : ''}${result(r)}${growthRoom()}${r.reflections.length ? `<section class="panel"><h2>다음 무대에 가져갈 경험</h2>${r.reflections.map(v => `<div class="source"><strong>${name(v.agentId)}</strong><p>${esc(v.text)}</p><p>다음 행동: ${esc(v.action)}</p>${state.phase === 'learned' ? `<button class="secondary small" data-pin="${v.agentId}">팀 교훈으로 기억하기</button>` : ''}</div>`).join('')}</section>` : ''}${state.phase === 'complete' ? `<section class="room panel"><h2>${esc(state.teams.find(t => t.id === state.champion)?.name)} 우승</h2><p>함께 만든 무대와 경험은 이 시즌에 저장되어 있어요.</p></section>` : ''}</div><aside class="side">${state.phase === 'voting' && !state.busy ? catalog.members.filter(m => state.traces.some(t => t.agentId === m.id && t.kind === 'vote' && t.status === 'error')).map(m => `<button class="secondary small" data-skip="${m.id}">${m.name} 실패 투표를 미투표로 건너뛰기</button>`).join('') : ''}<div class="actions">${actions.map(([action, title]) => `<button data-action="${action}" ${can ? '' : 'disabled'}>${title}</button>`).join('')}${state.phase === 'voted' ? `<button id="yes" ${can ? '' : 'disabled'}>나는 찬성 · 투표 시작</button><button id="no" class="secondary" ${can ? '' : 'disabled'}>나는 반대 · 투표 시작</button>` : ''}</div>${planForm(r)}<p id="error" class="inline-error" role="alert"></p><p class="note">${state.provider} · 이번 라운드 ${r.calls}/55회<br>시작은 내가 결정하고, 다음 라운드는 회고 저장 후 열립니다.</p>${sourceRoom()}<details><summary>호출 상태 확인</summary>${state.traces.slice(-30).map(t => `<div class="trace">${name(t.agentId)} · ${t.kind} · ${t.status}${t.durationMs ? ` · ${(t.durationMs / 1000).toFixed(1)}초` : ''}<br>${esc(t.sessionId || '응답 대기')}</div>`).join('')}</details><button id="restart" class="secondary small" ${can ? '' : 'disabled'}>새 시즌 준비</button></aside></div><p class="footer">비공식 팬 게임 · 무대, 능력 수치, 심사위원과 대사는 게임 창작입니다. 공개 인터뷰와 게임 경험은 구분해 저장됩니다.</p></main>`;
  bindSources();
  document.querySelectorAll('fieldset').forEach(e => { e.style.border = '0'; e.style.margin = '0'; e.style.padding = '0'; });
  for (const id of ['music', 'dance', 'risk', 'direction', 'opinion']) document.getElementById(id).oninput = e => { draft[id === 'opinion' ? 'message' : id] = e.target.value; };
  document.querySelectorAll('[data-practice]').forEach(el => el.oninput = () => { draft.practice[Number(el.dataset.practice)] = Number(el.value); });
  document.querySelectorAll('[data-lead]').forEach(el => el.onchange = () => { draft.leads[Number(el.dataset.lead)] = el.value; });
  document.querySelectorAll('[data-adopt]').forEach(el => { el.disabled = !can || !['meeting', 'voted', 'agreed'].includes(state.phase); el.onclick = () => { draft = { ...structuredClone([...r.discussion, ...r.proposals].find(p => p.agentId === el.dataset.adopt).plan), message: draft.message }; render(); }; });
  document.querySelectorAll('[data-skip]').forEach(el => el.onclick = () => command('skipVote', { agentId: el.dataset.skip }));
  document.querySelectorAll('[data-pin]').forEach(el => { el.disabled = !can; el.onclick = () => command('pin', { agentId: el.dataset.pin }); });
  document.querySelectorAll('[data-action]').forEach(el => el.onclick = () => command(el.dataset.action));
  const on = (id, fn) => { const e = document.getElementById(id); if (e) e.onclick = fn; };
  on('discuss', () => { const { message, ...plan } = draft; command('discuss', { plan, message: message || plan.direction }); });
  on('yes', () => command('vote', { approve: true })); on('no', () => command('vote', { approve: false }));
  on('cancel', () => post('/api/cancel', {}).then(() => refresh(true)));
  on('restart', async () => { if (confirm('현재 시즌을 마치고 새 시즌을 준비할까요? 기존 시즌은 보관 폴더에 저장됩니다.')) { await post('/api/new', { seed: `우리의 무대 ${Date.now()}`, provider: state.provider }); refresh(true); } });
  on('listen', playMusic); on('replay', () => replay(r));
  document.querySelectorAll('[data-position]').forEach(el => { el.style.left = `${12 + Number(el.dataset.position) * 17}%`; });
}
function playMusic() {
  if (audio) { audio.close(); audio = null; return; }
  const context = audio = new AudioContext(), bpm = catalog.music.find(m => m.id === draft.music).bpm;
  const notes = draft.music === 'glow' ? [261.6, 329.6, 392, 493.9] : draft.music === 'wave' ? [293.7, 369.9, 440, 554.4] : [220, 261.6, 329.6, 392];
  for (let i = 0; i < 32; i++) { const o = context.createOscillator(), g = context.createGain(), t = context.currentTime + i * 60 / bpm / 2;
    o.type = 'sine'; o.frequency.value = notes[i % 4]; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + .03); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g).connect(context.destination); o.start(t); o.stop(t + .35); }
  setTimeout(() => { if (audio === context) { context.close(); audio = null; } }, 32 * 60000 / bpm / 2 + 500);
}
function replay(r) {
  clearInterval(replayTimer); let i = 0; const events = r.evidence.find(e => e.teamId === 'team-0').events;
  const step = () => { document.querySelectorAll('.performer').forEach(e => e.classList.remove('on')); const e = events[i++]; if (!e) { clearInterval(replayTimer); return; }
    document.querySelector(`#performer-${e.memberId}`)?.classList.add('on');
    const cue = document.querySelector('#cue'); if (cue) cue.textContent = `${e.second}초 · ${name(e.memberId)}의 파트 · 완성도 ${e.quality} · 호흡 부담 ${e.breath} · ${e.success ? '큐 성공' : '큐 개선 필요'}`;
  }; step(); replayTimer = setInterval(step, 1800);
}
refresh();
