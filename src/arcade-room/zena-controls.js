const shapes={
 zoom:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
 shuffle:'<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
 pin:'<path d="m4 18 2-2m12-12-2 2M2 20l2 2 3-3-2-2Zm15-15 2 2 3-3-2-2Z"/><rect x="8" y="5" width="8" height="14" rx="3" transform="rotate(45 12 12)"/>',
 hint:'<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/>',
 song:'<path d="M10 17V5l10-2v12M10 8l10-2"/><ellipse cx="7" cy="17" rx="3" ry="2"/><ellipse cx="17" cy="15" rx="3" ry="2"/>'
};
const button=(icon,label,attrs,badge='')=>`<button class="zena-tool ${icon==='song'?'song-pickup':icon==='shuffle'?'skill-button':icon==='pin'?'item-button':''}" ${attrs} aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${shapes[icon]}</svg><span class="tool-count" aria-hidden="true">${badge}</span><span class="tool-tip" aria-hidden="true">${label}</span></button>`;
export function zenaControls(s){return button('zoom','판 확대','data-bread-zoom aria-pressed="false"')+button('shuffle',`${s.linkVersion?'음식':'빵'} 섞기 · 2회`,'data-act="shuffle" aria-keyshortcuts="H"','2')+(s.linkVersion?button('hint','짝 힌트','data-act="hint" aria-keyshortcuts="R"'):button('pin','밀대 · 1개','data-act="rolling-pin" aria-keyshortcuts="R" aria-pressed="false"','1'))+button('song','노래 아이템 줍기 · 0개','data-act="song-pickup" disabled','0');}
export function updateZenaTool(button,label,count){
 if(!button)return;
 if(button.getAttribute('aria-label')!==label){button.setAttribute('aria-label',label);button.title=label;button.querySelector('.tool-tip').textContent=label;}
 if(count!==undefined)button.querySelector('.tool-count').textContent=count;
}
