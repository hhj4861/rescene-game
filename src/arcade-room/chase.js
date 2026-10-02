// Stable slots keep number-key input and previous saved rounds compatible.
export function createChase(){return {chaseVersion:1,heat:0,fever:0,hits:0,combo:0,bestCombo:0,misses:0,spawn:.35,holes:Array.from({length:9},()=>({ttl:0,total:0,gold:false,flash:0}))};}
export function chasePosition(h,i){
 const p=Math.max(0,Math.min(1,h.ttl>0?1-h.ttl/(h.total||1):h.hitAt??0)),direction=i%2?-1:1;
 return {x:64+352*(direction===1?p:1-p),y:228+Math.floor(i/3)*148-Math.abs(Math.sin(p*Math.PI*(2+i%3)))*42,direction,p};
}
export function chaseHit(s,i){
 if(!Number.isInteger(i)||i<0||i>8)return;const h=s.holes[i];
 if(!h.ttl){if(!s.fever){s.combo=0;s.heat=0;}return;}
 const fever=s.fever>0;s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);
 h.reward=((h.gold?200:100)+Math.min(10,s.combo)*10)*(fever?2:1);s.score+=h.reward;h.hitAt=chasePosition(h,i).p;h.ttl=0;h.flash=.3;
 s.event=h.gold?'whack-gold':'whack-hit';
 if(!fever&&++s.heat===5){s.heat=0;s.fever=6;s.spawn=Math.min(s.spawn,.15);s.event='whack-fever';}
}
export function stepChase(s,dt,speed,loseLife){
 s.fever=Math.max(0,s.fever-dt);
 for(const h of s.holes){h.flash=Math.max(0,h.flash-dt);if(h.ttl>0){h.ttl=Math.max(0,h.ttl-dt);if(!h.ttl){s.misses++;if(!s.fever){s.combo=0;s.heat=0;s.event='whack-miss';loseLife(s);if(s.ended)return;}}}}
 s.spawn=Math.max(0,s.spawn-dt);if(s.spawn)return;
 const active=s.holes.filter(h=>h.ttl>0).length,limit=s.fever||s.stage>=4?3:2;
 const free=s.holes.map((h,i)=>({h,i})).filter(({h,i})=>!h.ttl&&!h.flash&&!s.holes.slice(Math.floor(i/3)*3,Math.floor(i/3)*3+3).some(other=>other.ttl>0));
 if(active<limit&&free.length){const {h}=free[Math.floor(s.random()*free.length)];h.ttl=h.total=4.8/(Math.sqrt(speed)*(1+Math.min(.3,s.elapsed/180)));h.gold=s.random()<.2;h.hitAt=0;h.reward=0;}
 s.spawn=(s.fever ? .42 : .85)/Math.sqrt(speed);
}
