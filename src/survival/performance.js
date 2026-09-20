/* global document, AudioContext, Blob, URL, requestAnimationFrame, cancelAnimationFrame, matchMedia */
import { composePerformance, renderPcm, encodeWav, stageFrame } from './arrangement.js';
import { doll, escapeHtml as esc } from './scene.js';
let disposeCurrent = () => {};
export function stopPerformance() { disposeCurrent(); disposeCurrent=()=>{}; }
export function mountPerformance(panel, { round, members, seed }) {
  const evidence=round.evidence.find(e=>e.teamId==='team-0');
  if (!evidence) return;
  const score=composePerformance(round.plan,evidence,seed), memberName=id=>members.find(m=>m.id===id)?.name || id;
  panel.innerHTML=`<h2>${esc(round.concept)} · 완성된 무대</h2><p class="performance-direction">“${esc(round.plan.direction)}”</p><div class="concert" aria-label="다섯 멤버의 합의안 기반 공연"><div class="concert-rig"></div><div class="concert-screen"><span>RESCENE</span><strong>${esc(round.concept)}</strong></div><div class="concert-light light-left"></div><div class="concert-light light-right"></div><div class="concert-floor"></div>${members.map((m,i)=>`<div class="concert-dancer" data-dancer="${m.id}">${doll(i)}<span>${m.name}</span></div>`).join('')}<div class="concert-audience" aria-hidden="true">${Array.from({length:26},()=>'<i></i>').join('')}</div><div class="concert-caption" id="concert-caption">음악과 함께 우리 무대를 재생해 보세요.</div></div><div class="concert-timeline" aria-label="합의한 파트 순서">${score.parts.map((p,i)=>`<button class="system-button" data-seek="${p.start}">${memberName(p.memberId)}<small>${i*12}–${(i+1)*12}초</small></button>`).join('')}</div><div class="playback-controls"><button id="replay">완성된 무대 재생</button><button id="pause-performance" class="secondary" disabled>일시정지</button><button id="download-song" class="secondary">완성곡 WAV 저장</button><span id="concert-time">0:00 / 1:00</span></div><label class="performance-seek">공연 위치<input id="performance-seek" type="range" min="0" max="59.9" step="0.1" value="0"></label><p id="performance-status" role="status">${score.bpm} BPM · ${score.parts.map(p=>memberName(p.memberId)).join(' → ')} · 60초 연주곡</p><details class="arrangement-note"><summary>우리의 선택이 무대에 반영된 방식</summary><p>음악 선택은 템포·화성·멜로디를, 안무 선택은 드럼 밀도와 움직임을 바꿉니다. 무대 포인트는 애드리브·댄스 브레이크·유닛 화음에 반영됩니다. 각자 12초 동안 자신의 음색과 멜로디를 맡고, 수행 기록에 따라 프레이징과 움직임이 달라집니다.</p><p>합의된 선택을 게임 편곡기로 연주하고 캐릭터 공연으로 보여줍니다. 자유롭게 적은 무대 방향은 위 연출 문구에 표시됩니다. 실제 멤버 가창·음원이나 자유문장만으로 작곡하는 음악 AI는 아닙니다. 심사 점수는 기존 수행 기록을 평가한 결과입니다.</p></details>`;
  const q=selector=>panel.querySelector(selector);
  let context, pcm, buffer, source, raf, playing=false, offset=0, started=0, disposed=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw=second=>{
    const frame=stageFrame(score,second,reduced);
    q('.concert').dataset.part=String(frame.part);
    for(const dancer of frame.dancers) {
      const el=q(`[data-dancer="${dancer.id}"]`);
      el.style.left=`${dancer.x}%`;el.style.top=`${dancer.y}%`;el.style.transform=`translate(-50%,-100%) rotate(${dancer.rotate}deg) scale(${dancer.lead?1.13:.9})`;el.style.zIndex=dancer.lead?'4':'3';el.classList.toggle('is-lead',dancer.lead);
      el.querySelector('.arm-left').setAttribute('transform',`rotate(${dancer.arm} 33 68)`);el.querySelector('.arm-right').setAttribute('transform',`rotate(${-dancer.arm} 67 68)`);
      el.querySelector('.leg-left').setAttribute('transform',`rotate(${dancer.leg} 42 98)`);el.querySelector('.leg-right').setAttribute('transform',`rotate(${-dancer.leg} 58 98)`);
    }
    const e=frame.event;
    q('#concert-caption').textContent=`${memberName(frame.memberId)}의 파트${e?` · ${e.focus==='breath'?'호흡':e.focus==='rhythm'?'리듬':'표현'} 중심 · 완성도 ${e.quality}`:''}`;
    q('#concert-time').textContent=`${Math.floor(second/60)}:${String(Math.floor(second%60)).padStart(2,'0')} / 1:00`;
    q('#performance-seek').value=String(second);
    panel.querySelectorAll('[data-seek]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===frame.part)));
  };
  const position=()=>Math.min(60,offset+(playing?context.currentTime-started:0));
  const stop=()=>{ if(source){source.onended=null;source.stop();source.disconnect();source=null;} cancelAnimationFrame(raf);playing=false;q('#pause-performance').disabled=true; };
  const fail=e=>{stop();q('#performance-status').textContent=`재생하지 못했어요: ${e.message}. 재생 버튼으로 다시 시도하세요.`;};
  const makePcm=()=>pcm ||= renderPcm(score);
  const play=async(from=offset)=>{
    try {
      context ||= new AudioContext();
      await context.resume(); if(disposed)return;
      stop();
      const audio=makePcm();
      if(!buffer){buffer=context.createBuffer(2,audio.channels[0].length,audio.sampleRate);audio.channels.forEach((channel,i)=>buffer.copyToChannel(channel,i));}
      source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
      offset=from>=60?0:from;started=context.currentTime;playing=true;
      source.onended=()=>{playing=false;offset=60;cancelAnimationFrame(raf);q('#pause-performance').disabled=true;q('#replay').textContent='처음부터 다시 재생';draw(60);};
      source.start(0,offset);q('#pause-performance').disabled=false;q('#replay').textContent='처음부터 다시 재생';q('#performance-status').textContent=`${score.bpm} BPM · 합의한 연주곡과 안무를 재생 중`;
      const tick=()=>{if(!playing||disposed)return;draw(position());raf=requestAnimationFrame(tick);};tick();
    }catch(e){fail(e);}
  };
  q('#replay').onclick=()=>play(0);
  q('#pause-performance').onclick=()=>{offset=position();stop();q('#replay').textContent='이어 재생';q('#replay').onclick=()=>{play(offset);q('#replay').onclick=()=>play(0);};q('#performance-status').textContent='일시정지 · 이어 재생하거나 다른 파트를 선택하세요.';};
  const seek=value=>{const wasPlaying=playing;stop();offset=value;draw(value);if(wasPlaying)play(value);};
  q('#performance-seek').oninput=e=>seek(Number(e.target.value));
  panel.querySelectorAll('[data-seek]').forEach(b=>b.onclick=()=>seek(Number(b.dataset.seek)));
  q('#download-song').onclick=()=>{
    try{const wav=encodeWav(makePcm()),url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'})),a=document.createElement('a');a.href=url;a.download=`rescene-${round.number || 'stage'}-${score.music}-v${score.version}.wav`;a.click();URL.revokeObjectURL(url);q('#performance-status').textContent='60초 완성 연주곡의 WAV 다운로드를 시작했습니다.';}catch(e){fail(e);}
  };
  const visibility=()=>{if(document.hidden&&playing){offset=position();stop();q('#replay').textContent='이어 재생';q('#replay').onclick=()=>play(offset);}};
  document.addEventListener('visibilitychange',visibility);
  const leave=()=>{if(playing){offset=position();stop();q('#replay').textContent='이어 재생';q('#replay').onclick=()=>play(offset);}};
  panel.pausePerformance=leave;
  disposeCurrent=()=>{disposed=true;stop();document.removeEventListener('visibilitychange',visibility);if(context)context.close();};
  draw(0);
}
