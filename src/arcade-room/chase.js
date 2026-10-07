export function chaseDifficulty(stage=1){const n=Math.max(0,stage-1);return {speed:1+.9*n/(n+8),fakeChance:.18+.24*n/(n+7),disguise:Math.min(.78,n*.065),fakeLimit:stage>=8?2:1};}
// Stable slots keep number-key input and previous saved rounds compatible.
export function createChase(){return {chaseVersion:1,heat:0,fever:0,hits:0,combo:0,bestCombo:0,misses:0,spawn:.35,holes:Array.from({length:9},()=>({ttl:0,total:0,gold:false,fake:false,flash:0}))};}
export function chasePosition(h,i){
 const p=Math.max(0,Math.min(1,h.ttl>0?1-h.ttl/(h.total||1):h.hitAt??0)),start=h.direction??(i%2?-1:1),legs=h.legs??2;
 const phase=p*Math.PI*legs,travel=(1-Math.cos(phase))/2,direction=start*(Math.sin(phase)>=0?1:-1);
 return {x:64+352*(start===1?travel:1-travel),y:228+Math.floor(i/3)*148-Math.abs(Math.sin(p*Math.PI*(2+i%3)))*42,direction,p};
}
export function chaseHit(s,i){
 if(!Number.isInteger(i)||i<0||i>8)return;const h=s.holes[i];
 if(!h.ttl){if(!s.fever){s.combo=0;s.heat=0;}return;}
 if(h.fake){h.hitAt=chasePosition(h,i).p;h.ttl=0;h.flash=.3;h.reward=-150;s.score=Math.max(0,s.score-150);s.combo=0;s.heat=0;s.event='whack-fake';return;}
 const fever=s.fever>0;if(h.gold)s.itemPickups++;s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);
 h.reward=((h.gold?200:100)+Math.min(10,s.combo)*10)*(fever?2:1);s.score+=h.reward;h.hitAt=chasePosition(h,i).p;h.ttl=0;h.flash=.3;
 s.event=h.gold?'whack-gold':'whack-hit';
 if(!fever&&++s.heat===5){s.heat=0;s.fever=6;s.spawn=Math.min(s.spawn,.15);s.event='whack-fever';}
}
export function stepChase(s,dt,speed,loseLife){
 s.fever=Math.max(0,s.fever-dt);
 for(const h of s.holes){h.flash=Math.max(0,h.flash-dt);if(h.ttl>0){h.ttl=Math.max(0,h.ttl-dt);if(!h.ttl&&!h.fake){s.misses++;if(!s.fever){s.combo=0;s.heat=0;s.event='whack-miss';loseLife(s);if(s.ended)return;}}}}
 s.spawn=Math.max(0,s.spawn-dt);if(s.spawn)return;
 // Each crossing gets at least 0.8s, so adding turns never makes taps unreactable.
 const difficulty=chaseDifficulty(s.stage);
 const active=s.holes.filter(h=>h.ttl>0).length,limit=s.fever||s.stage>=4?3:2;
 const free=s.holes.map((h,i)=>({h,i})).filter(({h,i})=>!h.ttl&&!h.flash&&!s.holes.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3).some(other=>other.ttl>0));
 if(active<limit&&free.length){const {h}=free[Math.floor(s.random()*free.length)];h.legs=2+Math.min(2,Math.floor((s.stage-1)/4));h.ttl=h.total=Math.max(.8*h.legs,4.8/(Math.sqrt(speed)*difficulty.speed*(1+Math.min(.3,s.elapsed/180))));h.fake=s.hits>=2&&s.holes.filter(other=>other!==h&&other.ttl>0&&other.fake).length<difficulty.fakeLimit&&s.random()<difficulty.fakeChance;h.gold=!h.fake&&(s.hits===2||s.random()<.2);h.direction=s.random()<.5?-1:1;h.hitAt=0;h.reward=0;}
 s.spawn=(s.fever ? .42 : .85)/Math.sqrt(speed);
}
