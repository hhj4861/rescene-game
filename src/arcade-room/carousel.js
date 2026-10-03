/* global ResizeObserver, requestAnimationFrame, cancelAnimationFrame */
// Native scrolling handles touch and trackpads; buttons and keys offer the same choices.
export function mountCarousel(root,initial,onChange){
 const track=root.querySelector('.machines'),cards=[...track.children],tabs=[...root.querySelectorAll('[data-slide]')];
 const previous=root.querySelector('[data-slide-step="-1"]'),next=root.querySelector('[data-slide-step="1"]'),status=root.querySelector('[data-slide-status]');
 let resizeFrame=0,trackWidth=track.clientWidth;
 let index=Math.max(0,cards.findIndex(c=>c.id===`machine-${initial}`));
 function mark(i){index=i;cards.forEach((c,n)=>c.dataset.selected=String(n===i));tabs.forEach((b,n)=>b.setAttribute('aria-current',String(n===i)));previous.disabled=i===0;next.disabled=i===cards.length-1;status.textContent=`${i+1} / ${cards.length} · ${tabs[i].textContent}`;onChange(tabs[i].dataset.slide);}
 function select(i){i=Math.max(0,Math.min(cards.length-1,i));mark(i);track.scrollTo({left:cards[i].offsetLeft-track.offsetLeft-(track.clientWidth-cards[i].offsetWidth)/2,behavior:'instant'});}
 function scroll(){if(track.clientWidth!==trackWidth)return;const center=track.getBoundingClientRect().left+track.clientWidth/2;let best=0,distance=Infinity;cards.forEach((c,i)=>{const r=c.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<distance){best=i;distance=d;}});if(best!==index)mark(best);}
 function click(e){const b=e.target.closest('button');if(b?.dataset.slide)select(tabs.indexOf(b));else if(b?.dataset.slideStep)select(index+Number(b.dataset.slideStep));}
 function key(e){const move={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:cards.length-1}[e.key];if(move===undefined||e.altKey||e.metaKey||e.ctrlKey)return;e.preventDefault();select(move);if(e.target.closest('.machine'))cards[index].querySelector('.start').focus({preventScroll:true});}
 function focus(e){const card=e.target.closest('.machine');if(card)mark(cards.indexOf(card));}
 root.addEventListener('click',click);root.addEventListener('keydown',key);track.addEventListener('scroll',scroll,{passive:true});track.addEventListener('focusin',focus);
 // Resize delivery must not synchronously mutate the layout it observes.
 // Coalesce selection/scroll writes into the next frame (not the resize loop).
 const observer=new ResizeObserver(()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;if(track.isConnected){trackWidth=track.clientWidth;select(index);}});});observer.observe(track);select(index);
 return ()=>{observer.disconnect();cancelAnimationFrame(resizeFrame);resizeFrame=0;root.removeEventListener('click',click);root.removeEventListener('keydown',key);track.removeEventListener('scroll',scroll);track.removeEventListener('focusin',focus);};
}
