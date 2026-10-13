/* global document, window */
// Keep live status nodes intact; only their mobile presentation changes.
export function mountGameInfo(app,{onOpen=()=>{},onClose=()=>{}}={}){
 const aside=app.querySelector('.has-video .side-note');if(!aside)return ()=>{};
 const panel=document.createElement('section');panel.className='game-info';panel.id='game-info';
 panel.innerHTML='<header class="game-info-heading"><b id="game-info-title">게임 안내</b><button class="quiet" popovertarget="game-info" popovertargetaction="hide" aria-label="게임 안내 닫기" autofocus>닫기 ×</button></header>';
 for(const node of aside.querySelectorAll(':scope > small, #save-state, .short-guide, #music-status'))panel.append(node);
 const button=document.createElement('button');button.className='quiet game-info-toggle';button.textContent='게임 안내 ⓘ';button.setAttribute('popovertarget',panel.id);button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
 aside.querySelector('.utility-buttons').append(button);aside.append(panel);
 const close=()=>{panel.hidePopover();button.focus({preventScroll:true});};
 panel.querySelector('button').addEventListener('click',e=>{e.preventDefault();close();});
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 const query=window.matchMedia('(max-width:700px)');
 const sync=()=>{
  if(query.matches){panel.setAttribute('popover','auto');panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','game-info-title');}
  else{if(panel.matches(':popover-open'))panel.hidePopover();panel.removeAttribute('popover');panel.removeAttribute('role');panel.removeAttribute('aria-labelledby');button.setAttribute('aria-expanded','false');}
 };
 const toggle=e=>{const open=e.newState==='open';button.setAttribute('aria-expanded',String(open));if(open)onOpen();else onClose();};
 panel.addEventListener('beforetoggle',toggle);
 query.addEventListener('change',sync);sync();
 return ()=>{panel.removeEventListener('beforetoggle',toggle);query.removeEventListener('change',sync);if(panel.matches(':popover-open'))panel.hidePopover();};
}
