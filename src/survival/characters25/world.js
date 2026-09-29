/* global document, window, Image, requestAnimationFrame */
import {cast,castAssets,characterFor,characterArt,stagePose} from './cast.js';

// One persistent DOM scene is reparented across state refreshes and stage panels.
// It has no separate game state, AI runtime or WebGL dependency.
const element=document.createElement('div');
element.className='live-world cast-world';
element.dataset.avatar='approved-cast-25d';
element.innerHTML=`<div class="cast-setting" aria-hidden="true"><div class="cast-sea"></div><div class="cast-island"></div><div class="cast-windows"></div><div class="cast-floor"></div><div class="cast-light"></div></div><p class="cast-place"></p><div class="cast-actors" role="group" aria-label="멤버 캐릭터">${cast.map(member=>`<button type="button" class="cast-actor" id="cast-member-${member.id}" data-cast-member="${member.id}" data-visual="${member.visual}" aria-label="${member.name} 캐릭터 선택" aria-pressed="false"><span class="cast-shadow"></span><span class="cast-body">${characterArt(member.id,'body')}</span><span class="cast-name">${member.name}</span></button>`).join('')}</div><p class="world-loading" role="status">멤버들을 만나러 가는 중이에요.</p><div class="world-controls"><button type="button" data-world="all" aria-pressed="true">모두 보기</button><button type="button" data-world="focus" aria-pressed="false">선택 멤버</button><button type="button" data-world="motion" aria-pressed="false">동작 멈추기</button></div>`;
const actors=[...element.querySelectorAll('.cast-actor')];
const notice=element.querySelector('.world-loading');
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
let options={},selected='woni',mode,focused=false,paused=reduce.matches,performanceFrame;
function syncSelection(){
  element.dataset.selectedMember=selected;
  element.dataset.focus=String(focused&&mode!=='performance');
  actors.forEach(actor=>{
    const active=actor.dataset.castMember===selected;
    actor.setAttribute('aria-pressed',String(active));
    actor.hidden=focused&&mode!=='performance'&&!active;
  });
  element.querySelector('[data-world="all"]').setAttribute('aria-pressed',String(!focused));
  element.querySelector('[data-world="focus"]').setAttribute('aria-pressed',String(focused));
}
function resetParallax(){element.style.setProperty('--look-x','0px');element.style.setProperty('--look-y','0px');}
function syncMotion(){
  element.classList.toggle('motion-paused',paused||reduce.matches);
  const button=element.querySelector('[data-world="motion"]');
  button.textContent=paused?'동작 재생하기':'동작 멈추기';button.setAttribute('aria-pressed',String(paused));
  resetParallax();drawPerformance();
}
export function selectWorldMember(id,focus=false){
  if(!characterFor(id))return;
  selected=id;if(focus&&mode!=='performance')focused=true;syncSelection();
}
function choose(id){selectWorldMember(id);options.onSelect?.(id);}
actors.forEach(actor=>{
  actor.addEventListener('click',()=>choose(actor.dataset.castMember));
  actor.addEventListener('keydown',event=>{
    if(event.altKey||event.metaKey||event.ctrlKey)return;
    let index=cast.findIndex(member=>member.id===selected);
    if(event.key==='ArrowRight')index=(index+1)%cast.length;
    else if(event.key==='ArrowLeft')index=(index+cast.length-1)%cast.length;
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=cast.length-1;
    else if(/^[1-5]$/.test(event.key))index=Number(event.key)-1;
    else return;
    event.preventDefault();choose(cast[index].id);actors[index].focus();
  });
});
element.querySelector('[data-world="all"]').onclick=()=>{focused=false;syncSelection();};
element.querySelector('[data-world="focus"]').onclick=()=>{focused=true;syncSelection();};
element.querySelector('[data-world="motion"]').onclick=()=>{paused=!paused;syncMotion();};
reduce.addEventListener('change',()=>{paused=reduce.matches;syncMotion();});
let pointerFrame=false,pointer=[0,0];
element.addEventListener('pointermove',event=>{
  if(paused||reduce.matches||mode==='performance'||event.pointerType!=='mouse')return;
  const rect=element.getBoundingClientRect();
  pointer=[((event.clientX-rect.left)/rect.width-.5)*8,((event.clientY-rect.top)/rect.height-.5)*4];
  if(pointerFrame)return;pointerFrame=true;
  requestAnimationFrame(()=>{pointerFrame=false;if(paused||reduce.matches||mode==='performance')return;element.style.setProperty('--look-x',`${pointer[0]}px`);element.style.setProperty('--look-y',`${pointer[1]}px`);});
});
element.addEventListener('pointerleave',()=>{pointer=[0,0];resetParallax();});
document.addEventListener('visibilitychange',()=>element.classList.toggle('page-hidden',document.hidden));
function drawPerformance(){
  if(mode!=='performance')return;
  element.dataset.part=String(performanceFrame?.part??0);
  element.dataset.center=performanceFrame?.memberId||'';
  actors.forEach(actor=>{
    const pose=stagePose(performanceFrame,actor.dataset.castMember,paused||reduce.matches);
    actor.style.setProperty('--stage-x',`${pose.x}%`);
    actor.style.setProperty('--stage-lift',`${pose.lift}px`);
    actor.style.setProperty('--stage-tilt',`${pose.tilt}deg`);
    actor.classList.toggle('is-lead',pose.lead);
  });
}
export function setPerformanceFrame(frame){performanceFrame=frame;drawPerformance();}
export function mountGameWorld(host,next){
  if(!host)return;
  options=next;
  if(mode!==next.scene){mode=next.scene;focused=['planning','reflection'].includes(mode);resetParallax();}
  if(characterFor(next.selectedMember))selected=next.selectedMember;
  host.append(element);element.dataset.scene=mode;
  element.querySelector('.cast-place').textContent={arrival:'우리의 첫 만남',planning:'바닷가 연습실',reflection:'오늘을 다음 무대로',finale:'우리가 함께 만든 계절',performance:''}[mode]||'';
  element.querySelector('[data-world="all"]').hidden=mode==='performance';
  element.querySelector('[data-world="focus"]').hidden=mode==='performance';
  syncSelection();syncMotion();drawPerformance();
}
const image=new Image();
image.onload=()=>{element.dataset.ready='true';notice.hidden=true;};
image.onerror=()=>{element.dataset.ready='error';notice.hidden=false;notice.textContent='전신 이미지를 불러오지 못했어요. 멤버 이름으로 선택하거나 새로고침해 주세요.';};
image.src=castAssets.body;
