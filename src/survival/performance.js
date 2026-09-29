/* global document, AudioContext, Blob, URL, requestAnimationFrame, cancelAnimationFrame, matchMedia */
import { composePerformance, renderPcm, encodeWav, stageFrame } from './arrangement.js';
import { escapeHtml as esc } from './scene.js';
import {setPerformanceFrame} from './three/game-world.js';
let disposeCurrent = () => {};
export function stopPerformance() { disposeCurrent(); disposeCurrent=()=>{}; }
export function mountPerformance(panel, { round, members, seed }) {
  const evidence=round.evidence.find(e=>e.teamId==='team-0');
  if (!evidence) return;
  const score=composePerformance(round.plan,evidence,seed), memberName=id=>members.find(m=>m.id===id)?.name || id;
  panel.innerHTML=`<div class="concert-player"><div class="concert" aria-label="다섯 멤버의 합의안 기반 공연">
  <div class="concert-world"></div>
  <div class="song-label"><h2>${esc(round.concept)}</h2><p>${esc({glow:'잔광',wave:'물결',spark:'불꽃'}[score.music])}</p></div>
  <button class="stage-back" data-open="journal">마을로</button><div class="stage-glow"></div>
  <span class="live-part" aria-hidden="true">지금의 파트</span><div class="concert-caption" id="concert-caption"></div></div>
  <div class="playback-bar"><div><button id="replay" class="transport" aria-label="완성된 무대 재생">▶</button><button id="pause-performance" class="transport" aria-label="일시정지" hidden disabled>Ⅱ</button></div>
  <div><span id="concert-time">0:00 / 1:00</span><label class="performance-seek"><span class="sr-only">공연 위치</span><input id="performance-seek" aria-label="공연 위치" type="range" min="0" max="59.9" step="0.1" value="0"></label><p id="performance-status" role="status">60초 연주곡 · 파트별로 다시 볼 수 있어요.</p></div>
  <div class="concert-timeline" aria-label="합의한 파트 순서">${score.parts.map((p,i)=>`<button data-seek="${p.start}">${memberName(p.memberId)}<small>${String(i*12).padStart(2,'0')} — ${(i+1)*12}초</small></button>`).join('')}</div>
  <div class="playback-utilities"><button id="volume-toggle" aria-expanded="false">음량</button><button id="download-song">WAV 저장</button><button data-open="schedule">합의한 계획 보기</button></div></div>
  <label class="volume-control" hidden>음량 <input id="volume" type="range" min="0" max="1" step="0.05" value="0.7"></label></div>`;
  const q=selector=>panel.querySelector(selector);
  let context, pcm, buffer, source, raf, playing=false, offset=0, started=0, disposed=false;
  let gain;
  q('#volume-toggle').onclick=()=>{const box=q('.volume-control');box.hidden=!box.hidden;q('#volume-toggle').setAttribute('aria-expanded',String(!box.hidden));};
  q('#volume').oninput=()=>{if(gain)gain.gain.value=Number(q('#volume').value);};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw=second=>{
    const frame=stageFrame(score,second,reduced);setPerformanceFrame(frame);
    q('.concert').dataset.part=String(frame.part);
    const positions = Object.fromEntries(frame.dancers.map(d=>[d.id,d.x]));
    q('.live-part').style.left=`calc(${positions[frame.memberId] || 50}% - 36px)`;
    q('.live-part').textContent=memberName(frame.memberId);
    q('#concert-caption').textContent=`지금의 파트 · ${memberName(frame.memberId)}`;
    q('#concert-time').textContent=`${Math.floor(second/60)}:${String(Math.floor(second%60)).padStart(2,'0')} / 1:00`;
    q('#performance-seek').value=String(second);
    panel.querySelectorAll('[data-seek]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===frame.part)));
  };
  const position=()=>Math.min(60,offset+(playing?context.currentTime-started:0));
  const stop=()=>{ if(source){source.onended=null;source.stop();source.disconnect();source=null;} cancelAnimationFrame(raf);playing=false;q('#pause-performance').disabled=true;q('#pause-performance').hidden=true;q('#replay').hidden=false;q('.concert-player').classList.remove('is-playing'); };
  const fail=e=>{stop();q('#performance-status').textContent=`재생하지 못했어요: ${e.message}. 재생 버튼으로 다시 시도하세요.`;};
  const makePcm=()=>pcm ||= renderPcm(score);
  const play=async(from=offset)=>{
    try {
      context ||= new AudioContext();
      await context.resume(); if(disposed)return;
      stop();
      const audio=makePcm();
      if(!buffer){buffer=context.createBuffer(2,audio.channels[0].length,audio.sampleRate);audio.channels.forEach((channel,i)=>buffer.copyToChannel(channel,i));}
      gain ||= context.createGain();gain.gain.value=Number(q('#volume').value);gain.disconnect();gain.connect(context.destination);
      source=context.createBufferSource();source.buffer=buffer;source.connect(gain);
      offset=from>=60?0:from;started=context.currentTime;playing=true;
      source.onended=()=>{playing=false;offset=60;cancelAnimationFrame(raf);q('#pause-performance').disabled=true;q('#pause-performance').hidden=true;q('#replay').hidden=false;q('.concert-player').classList.remove('is-playing');q('#replay').setAttribute('aria-label','처음부터 다시 재생');draw(60);};
      source.start(0,offset);q('#pause-performance').disabled=false;q('#pause-performance').hidden=false;q('#replay').hidden=true;q('.concert-player').classList.add('is-playing');q('#replay').setAttribute('aria-label','처음부터 다시 재생');q('#performance-status').textContent=`${score.bpm} BPM · 합의한 연주곡과 파트 연출을 재생 중`;
      const tick=()=>{if(!playing||disposed)return;draw(position());raf=requestAnimationFrame(tick);};tick();
    }catch(e){fail(e);}
  };
  q('#replay').onclick=()=>play(0);
  q('#pause-performance').onclick=()=>{offset=position();stop();q('#replay').setAttribute('aria-label','이어 재생');q('#replay').onclick=()=>{play(offset);q('#replay').onclick=()=>play(0);};q('#performance-status').textContent='일시정지 · 이어 재생하거나 다른 파트를 선택하세요.';};
  const seek=value=>{const wasPlaying=playing;stop();offset=value;draw(value);if(wasPlaying)play(value);};
  q('#performance-seek').oninput=e=>seek(Number(e.target.value));
  panel.querySelectorAll('[data-seek]').forEach(b=>b.onclick=()=>seek(Number(b.dataset.seek)));
  q('#download-song').onclick=()=>{
    try{const wav=encodeWav(makePcm()),url=URL.createObjectURL(new Blob([wav],{type:'audio/wav'})),a=document.createElement('a');a.href=url;a.download=`rescene-${round.number || 'stage'}-${score.music}-v${score.version}.wav`;a.click();URL.revokeObjectURL(url);q('#performance-status').textContent='60초 완성 연주곡의 WAV 다운로드를 시작했습니다.';}catch(e){fail(e);}
  };
  const visibility=()=>{if(document.hidden&&playing){offset=position();stop();q('#replay').setAttribute('aria-label','이어 재생');q('#replay').onclick=()=>play(offset);}};
  document.addEventListener('visibilitychange',visibility);
  const leave=()=>{if(playing){offset=position();stop();q('#replay').setAttribute('aria-label','이어 재생');q('#replay').onclick=()=>play(offset);}};
  panel.pausePerformance=leave;
  disposeCurrent=()=>{disposed=true;stop();document.removeEventListener('visibilitychange',visibility);if(context)context.close();};
  draw(0);
}
