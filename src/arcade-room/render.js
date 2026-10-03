import {chasePosition,chaseDifficulty} from './chase.js';
import {breadFrame} from './model.js';
/* global Image, window, document */
import {PLATFORMS} from './model.js';
import {RUNNER_X,LIV_ITEM_NAMES} from './runner.js';
import {drawDoll} from './cast.js';
let charmander,charmanderFake;
export function loadGameArt(){return new Promise((resolve,reject)=>{charmander=new Image();charmander.onload=()=>{try{
 // Build the in-game decoy tint once; the approved source PNG stays unchanged.
 charmanderFake=document.createElement('canvas');charmanderFake.width=charmander.naturalWidth;charmanderFake.height=charmander.naturalHeight;
 const ctx=charmanderFake.getContext('2d');ctx.drawImage(charmander,0,0);const pixels=ctx.getImageData(0,0,charmanderFake.width,charmanderFake.height);
 for(let i=0;i<pixels.data.length;i+=4){const grey=Math.round(pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114);pixels.data[i]=grey;pixels.data[i+1]=grey;pixels.data[i+2]=grey;}
 ctx.putImageData(pixels,0,0);resolve();}catch(error){reject(error);}};charmander.onerror=reject;charmander.src='./charmander.png';});}
const INK='#244655',PAPER='#fff8e8';
const reducedMotion=typeof window!=='undefined'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
function box(c,x,y,w,h,color,r=12){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,t,x,y,size=20,color=INK){c.fillStyle=color;c.font=`${size}px 'Jua', sans-serif`;c.textAlign='center';c.fillText(t,x,y);}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function star(c,x,y,r,color){c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fill();}
function background(c,top,bottom){c.clearRect(0,0,480,600);const g=c.createLinearGradient(0,0,0,600);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,480,600);}
function bubble(c,x,y,r,color='#b9e9df'){ellipse(c,x+2,y+4,r,r,'#24465520');const g=c.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r);g.addColorStop(0,'#ffffffdd');g.addColorStop(.5,color);g.addColorStop(1,'#6faeaa99');ellipse(c,x,y,r,r,g);c.strokeStyle='#fffaf1';c.lineWidth=2;c.beginPath();c.arc(x,y,r-2,0,Math.PI*2);c.stroke();ellipse(c,x-r*.3,y-r*.4,r*.2,r*.12,'#ffffffc9');}
function critter(c,x,y,color='#af9bd2'){ellipse(c,x,y,19,19,color);ellipse(c,x-17,y+4,6,8,color);ellipse(c,x+17,y+4,6,8,color);ellipse(c,x-6,y-3,3,5,INK);ellipse(c,x+6,y-3,3,5,INK);text(c,'⌣',x,y+10,17);}
export const PUMP_ARROWS=['↙','↖','●','↗','↘'],PUMP_COLORS=['#ed9db2','#87cbd6','#e9c466','#87cbd6','#ed9db2'];
export function targets(s){if(s.kind==='drive')return s.holes.map((h,i)=>{const p=chasePosition(h,i);return {x:p.x-52,y:p.y-62,w:104,h:104,label:`${i+1}번 달리는 파이리`};});if(s.kind==='photo')return Array.from({length:36},(_,i)=>({x:30+i%6*70,y:112+Math.floor(i/6)*70,w:70,h:70,label:`${Math.floor(i/6)+1}행 ${i%6+1}열 빵`}));if(s.kind==='catch')return RUNNER_X.map((x,i)=>({x:x-69,y:100,w:138,h:440,label:`${i+1}번 길로 이동`}));return [];}
function drawWhack(c,s){
 const fever=s.fever>0,quiet=reducedMotion?.matches;
 background(c,fever?'#fae6af':'#d1e9da',fever?'#e9b76c':'#a3c7ac');
 ellipse(c,80,141,175,48,'#b4d6b8');ellipse(c,410,132,196,50,'#badac1');
 text(c,'원이의 불꽃 추격전',240,36,23,'#3e6c57');
 text(c,fever?`불꽃 피버 ×2 · ${Math.ceil(s.fever)}초`:s.combo?`${s.combo} COMBO · 한 번 더!`:'달리는 파이리를 따라 톡!',240,70,25,fever?'#9c521c':INK);
 box(c,45,89,390,12,'#fff8e899',6);box(c,45,89,390*(fever?s.fever/6:s.heat/5),12,fever?'#e89d3b':'#54896c',6);
 text(c,fever?'놓쳐도 안전! × 가짜를 누르면 감점':`피버까지 ${5-s.heat}번 연속 성공`,240,122,15,'#537560');
 for(let row=0;row<3;row++){
  const y=263+row*148;box(c,15,y-37,450,40,fever?'#e8c28a88':'#84ad8766',20);
  for(let n=0;n<9;n++){const x=25+(n*57+(quiet?0:s.elapsed*19*(row%2?-1:1))+5700)%450;ellipse(c,x,y-3,6,2,'#fff8e866');}
 }
 for(let i=0;i<9;i++){
  const h=s.holes[i],p=chasePosition(h,i);if(!h.ttl&&!h.flash)continue;
  if(h.ttl){
   const ground=263+Math.floor(i/3)*148;ellipse(c,p.x,ground,33,8,'#355b4933');
   if(!quiet)for(let n=3;n>0;n--){const old=chasePosition({...h,ttl:Math.min(h.total,h.ttl+n*.1)},i);c.globalAlpha=.07;ellipse(c,old.x,old.y+16,30,34,fever?'#fa8f25':'#f0b353');}c.globalAlpha=1;
   if(!h.fake&&(h.gold||fever)){ellipse(c,p.x,p.y-5,49,54,'#fff1a04d');star(c,p.x+38,p.y-49,10,'#e7a53a');}
   c.save();c.translate(p.x,p.y);c.scale(p.direction,1);if(!quiet)c.rotate(Math.sin(p.p*Math.PI*8)*.06);if(charmander?.complete){c.drawImage(h.fake?charmanderFake:charmander,-52,-62,104,104);if(h.fake){c.globalAlpha=chaseDifficulty(s.stage).disguise;c.drawImage(charmander,-52,-62,104,104);}}c.restore();
   if(h.fake){ellipse(c,p.x+32,p.y-43,17,17,'#755481');text(c,'×',p.x+32,p.y-35,27,'#fff8e8');}
   box(c,p.x-32,p.y+44,64,5,'#fff8e8',3);box(c,p.x-32,p.y+44,64*h.ttl/h.total,5,h.ttl<1?'#c8784e':'#56866b',3);
   box(c,p.x-11,p.y+24,22,20,'#fff8e8e6',8);text(c,String(i+1),p.x,p.y+40,14,'#3e6c57');
  }
  if(h.flash){const t=1-h.flash/.3;c.globalAlpha=1-t;for(let k=0;k<7;k++){const angle=k*Math.PI*2/7;star(c,p.x+Math.cos(angle)*(20+t*45),p.y+Math.sin(angle)*(20+t*40),6,h.fake?'#b99ac4':'#fff1a2');}c.globalAlpha=1;text(c,h.fake?'−150':`+${h.reward||100}`,p.x,p.y-18-t*30,27,h.fake?'#755481':'#9c521c');}
 }
 text(c,s.stage>=8?'가짜 최대 2마리 · 색보다 ×를 확인해요!':'× 가짜는 누르면 −150점 · 그냥 보내요!',240,580,17,'#3e6c57');
}
function drawBubbles(c,s){background(c,'#efe2e5','#b5d4da');for(let i=0;i<13;i++)bubble(c,20+(i*83)%450,55+(i*79)%480,9+i%4*5,'#e2d2ed77');text(c,'MAY’S BUBBLE WORKSHOP',240,43,19,'#87667b');text(c,s.speedBoost||s.sizeBoost?[s.speedBoost?`속도 ↑ ${Math.ceil(s.speedBoost)}초`:'',s.sizeBoost?`큰 방울 ${Math.ceil(s.sizeBoost)}초`:''].filter(Boolean).join(' · '):s.combo>1?`${s.combo} CHAIN!`:'아이템을 먹으면 더 강해져요!',240,80,20);
 for(const [i,p] of PLATFORMS.entries()){box(c,p.x,p.y,p.w,20,'#917d98',8);box(c,p.x,p.y,p.w,9,['#b4d99f','#f0bdc6','#f1d182','#b4d99f'][i],6);for(let x=p.x+12;x<p.x+p.w;x+=25)ellipse(c,x,p.y+4,4,2,'#fff9');}
 for(const e of s.enemies){if(e.trapped)bubble(c,e.x,e.y-22,29,'#c9e7ec');critter(c,e.x,e.y-22,e.trapped?'#b9b6d7':'#a88dc5');if(e.trapped)text(c,'POP',e.x,e.y-58,12,'#80518b');}for(const b of s.bubbles)bubble(c,b.x,b.y,b.radius||21);for(const item of s.items){bubble(c,item.x,item.y,19,item.kind==='speed'?'#f6d991':'#c9b2e6');text(c,item.kind==='speed'?'»':'○',item.x,item.y+8,25,'#644c78');text(c,item.kind==='speed'?'속도':'크기',item.x,item.y-26,13,'#644c78');}
 c.save();if(s.invincible&&Math.floor(s.invincible*10)%2)c.globalAlpha=.5;c.translate(s.player.x,s.player.y);c.scale(s.player.facing,1);drawDoll(c,'may',0,0,65,s.flash>0?1:0);text(c,'›',39,-22,28,'#80518b');c.restore();if(s.flash>0)for(let i=0;i<8;i++)star(c,s.player.x+Math.cos(i*.785)*65,s.player.y-35+Math.sin(i*.785)*50,8,'#fff1a4');text(c,'방울 버튼으로 가까운 방울도 터뜨려요',240,579,17,'#6e627f');}
export function bread(c,x,y,value,size=48){const k=value%10;c.save();c.translate(x,y);const a=size/48;c.scale(a,a);ellipse(c,1,19,24,6,'#8a52311d');if(k===1){box(c,-21,-18,42,41,'#b77639',12);box(c,-17,-15,34,34,'#f1c888',10);c.strokeStyle='#d39951';c.lineWidth=3;for(const dx of [-7,3]){c.beginPath();c.moveTo(dx,-10);c.lineTo(dx+5,12);c.stroke();}}else if(k===2){ellipse(c,0,0,23,21,'#b97846');ellipse(c,0,-2,22,19,'#e9a6b6');ellipse(c,0,-2,8,7,'#fff2db');for(let i=0;i<6;i++)box(c,Math.cos(i)*16-2,Math.sin(i)*13-3,4,2,'#fff6df',1);}else if(k===3){box(c,-20,-5,40,26,'#dfae7e',6);ellipse(c,0,-8,23,18,'#b48ec9');ellipse(c,0,-22,5,5,'#cb7688');}else if(k===4){ellipse(c,0,0,24,21,'#edcf80');c.strokeStyle='#b99448';c.lineWidth=2;for(let i=-12;i<=12;i+=8){c.beginPath();c.moveTo(i,-15);c.lineTo(i+4,14);c.stroke();}}else{box(c,-21,-18,42,39,'#769983',10);box(c,-16,-14,32,29,'#bad0a6',8);ellipse(c,-5,-2,3,3,'#6e8664');ellipse(c,8,7,3,3,'#6e8664');}if(value>10){star(c,16,-18,11,'#fff1a2');text(c,'✦',0,7,24,'#fff9ed');}c.restore();}
function drawBakery(c,s){
 const f=breadFrame(s),board=f?.board||s.board,t=f?.progress||0;
 background(c,'#f5e1d7','#efcabb');for(let i=0;i<8;i++)box(c,i*60,0,30,74,i%2?'#e8b9ba':'#fff2dc',0);box(c,73,25,334,63,PAPER,15);text(c,'제나의 신라빵',240,57,25,'#94624d');text(c,f?.combo>1?`${f.combo}연쇄 · 갓 구웠어요!`:`교환 ${s.moves}번 · 반짝 빵은 십자 폭발`,240,81,15,'#956551');box(c,21,103,438,438,'#c4957c',17);
 for(let i=0;i<36;i++){const x=65+i%6*70,y=147+Math.floor(i/6)*70;box(c,x-33,y-33,66,66,s.selected===i?'#fff0a0':'#fff6e4',10);if(!f&&s.elapsed%7>5&&s.hint.includes(i)&&s.selected<0){c.strokeStyle='#cf9256';c.lineWidth=3;c.strokeRect(x-29,y-29,58,58);}}
 c.save();c.beginPath();c.rect(30,112,420,420);c.clip();
 for(let i=0;i<36;i++){
  let col=i%6,row=Math.floor(i/6),size=48;
  if(!f&&s.breadDrag){const d=s.breadDrag;if(i===d.from){col+=d.dx;row+=d.dy;}else if(i===d.to){col-=d.dx;row-=d.dy;}}
  if(f?.kind==='swap'&&(i===f.a||i===f.b)){const j=i===f.a?f.b:f.a,e=t*t*(3-2*t);col+=(j%6-col)*e;row+=(Math.floor(j/6)-row)*e;}
  if(f?.kind==='fall'){const e=1-Math.pow(1-t,3);row=f.fromRows[i]+(row-f.fromRows[i])*e;}
  const x=65+col*70,y=147+row*70,popping=f?.kind==='pop'&&f.removed.includes(i);
  if(popping){size*=1+.2*Math.sin(t*Math.PI);c.globalAlpha=1-t;}
  bread(c,x,y,board[i],size);c.globalAlpha=1;
  if(popping){c.globalAlpha=1-t;for(let k=0;k<6;k++){const angle=k*Math.PI/3;star(c,x+Math.cos(angle)*(12+t*30),y+Math.sin(angle)*(12+t*30),5*(1-t)+2,'#fff4b3');}c.globalAlpha=1;}
 }
 c.restore();text(c,s.itemArmed?'밀대로 지울 줄의 빵을 골라요!':'빵을 밀어서 교환 · 같은 빵 3개면 팡!',240,576,17,'#8c5e4b');
}
function drawPump(c,s){background(c,'#3c3e68','#252a4b');for(let i=0;i<5;i++)box(c,36+i*82,110,78,440,i%2?'#6683a220':'#a766a520',8);text(c,'MINAMI · FIVE STEP',240,39,20,'#ece5ff');text(c,s.combo?`${s.combo} COMBO`:'READY, DANCE!',240,75,23,'#f4d786');
 for(let i=0;i<5;i++){const x=75+i*82;box(c,x-34,108,68,56,s.glows[i]>0?PUMP_COLORS[i]:'#ffffff15',13);text(c,PUMP_ARROWS[i],x,151,39,s.glows[i]>0?'#303552':PUMP_COLORS[i]);if(s.glows[i]>0)text(c,s.feedback[i],x,192,12,'#fff7ce');}c.save();c.beginPath();c.rect(30,110,420,450);c.clip();for(const n of s.notes){const y=136+(n.at+s.offset-s.elapsed)*205;if(n.status!=='waiting'||y<100||y>560)continue;box(c,43+n.lane*82,y-25,64,50,PUMP_COLORS[n.lane],11);text(c,PUMP_ARROWS[n.lane],75+n.lane*82,y+14,38,'#303552');}c.restore();text(c,'Z        Q        S        E        C',240,582,20,'#d1cbe5');}
function drawDefense(c,s){
 background(c,'#213e58','#456b77');text(c,'LIV’S STAR RUNNERS',240,39,21,'#f8eed0');text(c,`연사 ${s.fireLevel}단계 · ${s.volley}발${s.item?' · '+LIV_ITEM_NAMES[s.item]:''}`,240,70,17,'#e2ece1');const boss=s.enemies.find(e=>e.boss);if(boss){text(c,'보스 · 별빛을 삼킨 구름왕',240,94,14,'#ffdc91');box(c,65,100,350,7,'#17384b',3);box(c,65,100,350*Math.max(0,boss.hp)/boss.maxHp,7,'#efb87c',3);}
 for(let i=0;i<3;i++){box(c,RUNNER_X[i]-68,101,136,444,i===s.lane?'#638c9455':'#17384b55',18);for(let y=100+(s.elapsed*80)%65;y<555;y+=65)text(c,'⌃',RUNNER_X[i],y,25,'#aec8c22d');}
 for(const g of s.gates)for(let i=0;i<3;i++){const o=g.options[i],positive=o.value>0;box(c,RUNNER_X[i]-61,g.y-25,122,55,positive?'#8dccc0':'#dc9ca1',9);text(c,o.op==='multiply'?`×${o.value}`:`${positive?'+':''}${o.value}`,RUNNER_X[i],g.y,26,'#244655');text(c,positive?(o.op==='multiply'?'탄 수 ↑':'연사 ↑'):'대원 감소',RUNNER_X[i],g.y+21,13,'#244655');}
 for(const e of s.enemies){const x=RUNNER_X[e.lane];c.save();c.translate(x,e.y);if(e.boss){c.scale(2.1,1.7);star(c,0,-24,14,'#f5d684');}critter(c,0,0,e.boss?'#d6a67e':'#b39bbd');c.restore();box(c,x-26,e.y-43,52,6,'#e5ddd455',3);box(c,x-26,e.y-43,52*Math.max(0,e.hp)/e.maxHp,6,'#f0bb77',3);text(c,String(Math.max(0,e.hp)),x,e.y-49,13,'#fff4cf');}
 for(const item of s.pickups){const x=RUNNER_X[item.lane];bubble(c,x,item.y,25,'#c8e1de');text(c,{wand:'✦',fairy:'♫',meteor:'☄',wings:'⋈'}[item.kind],x,item.y+8,28,'#34516d');text(c,LIV_ITEM_NAMES[item.kind],x,item.y-33,14,'#fff8e8');}
 for(const b of s.shots)star(c,b.x,b.y,5+Math.min(4,b.power),'#fff3a8');
 for(let i=0;i<Math.min(12,s.squad);i++){const x=s.x+(i%4-1.5)*18,y=493+Math.floor(i/4)*18;ellipse(c,x,y+7,8,8,'#83c0ba');ellipse(c,x,y,6,6,'#fff0c7');}
 if(s.item){ellipse(c,s.x,494,45,18,'#b2eadd66');text(c,{wand:'✦',fairy:'♫',meteor:'☄',wings:'⋈'}[s.item],s.x-48,490,28,'#fff3a8');}c.save();if(s.damageCooldown&&Math.floor(s.damageCooldown*10)%2)c.globalAlpha=.5;drawDoll(c,'liv',s.x,498,57,0);c.restore();box(c,s.x-34,550,68,28,'#fff4dc',10);text(c,`× ${s.squad}`,s.x,570,20);if(s.gateFlash)text(c,s.lastGate,s.x,439,28,'#ffdf82');
 if(s.burst>0){c.globalAlpha=s.burst;c.fillStyle='#fffbd1';c.fillRect(0,100,480,440);c.globalAlpha=1;}
}
export function drawGame(c,s){({drive:drawWhack,blocks:drawBubbles,photo:drawBakery,rhythm:drawPump,catch:drawDefense})[s.kind](c,s);}
