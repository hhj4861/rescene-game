/* global document */
// Group the existing controls without replacing their state or event handlers.
export function mountPumpControls(app){
 const aside=app.querySelector('.side-note'),controls=aside.querySelector('.utility-buttons');
 const help=document.createElement('div');help.className='pump-help';help.setAttribute('role','group');help.setAttribute('aria-label','도움말');
 help.append(aside.querySelector('[data-help]'));
 const info=aside.querySelector('.game-info-toggle');if(info)help.append(info);
 const sound=document.createElement('fieldset');sound.className='pump-sound';
 sound.innerHTML='<legend>소리 설정</legend><div class="pump-sound-buttons"></div>';
 for(const selector of ['[data-sound]','[data-music]','[data-voice]','[data-retry-music]'])sound.lastElementChild.append(aside.querySelector(selector));
 const song=aside.querySelector('[data-pump-picker]');song.className='start pump-change-song';song.textContent='곡 변경하기 ▶';
 controls.replaceChildren(help,sound,song);
}
