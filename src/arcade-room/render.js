import {breadFrame} from './model.js';
/* global Image */
import {PLATFORMS} from './model.js';
import {RUNNER_X} from './runner.js';
import {drawDoll} from './cast.js';
let charmander;
export function loadGameArt(){return new Promise((resolve,reject)=>{charmander=new Image();charmander.onload=resolve;charmander.onerror=reject;charmander.src='./charmander.png';});}
const INK='#244655',PAPER='#fff8e8';
function box(c,x,y,w,h,color,r=12){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,t,x,y,size=20,color=INK){c.fillStyle=color;c.font=`${size}px 'Jua', sans-serif`;c.textAlign='center';c.fillText(t,x,y);}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function star(c,x,y,r,color){c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fill();}
function background(c,top,bottom){c.clearRect(0,0,480,600);const g=c.createLinearGradient(0,0,0,600);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,480,600);}
function bubble(c,x,y,r,color='#b9e9df'){ellipse(c,x+2,y+4,r,r,'#24465520');const g=c.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r);g.addColorStop(0,'#ffffffdd');g.addColorStop(.5,color);g.addColorStop(1,'#6faeaa99');ellipse(c,x,y,r,r,g);c.strokeStyle='#fffaf1';c.lineWidth=2;c.beginPath();c.arc(x,y,r-2,0,Math.PI*2);c.stroke();ellipse(c,x-r*.3,y-r*.4,r*.2,r*.12,'#ffffffc9');}
function critter(c,x,y,color='#af9bd2'){ellipse(c,x,y,19,19,color);ellipse(c,x-17,y+4,6,8,color);ellipse(c,x+17,y+4,6,8,color);ellipse(c,x-6,y-3,3,5,INK);ellipse(c,x+6,y-3,3,5,INK);text(c,'⌣',x,y+10,17);}
export const PUMP_ARROWS=['↙','↖','●','↗','↘'],PUMP_COLORS=['#ed9db2','#87cbd6','#e9c466','#87cbd6','#ed9db2'];
export function targets(s){if(s.kind==='drive')return Array.from({length:9},(_,i)=>({x:28+i%3*145,y:86+Math.floor(i/3)*148,w:134,h:146,label:`${i+1}번 파이리 구멍`}));if(s.kind==='photo')return Array.from({length:36},(_,i)=>({x:30+i%6*70,y:112+Math.floor(i/6)*70,w:70,h:70,label:`${Math.floor(i/6)+1}행 ${i%6+1}열 빵`}));if(s.kind==='catch')return RUNNER_X.map((x,i)=>({x:x-69,y:100,w:138,h:440,label:`${i+1}번 길로 이동`}));return [];}
function drawWhack(c,s){background(c,'#d1e9da','#a3c7ac');ellipse(c,90,84,180,60,'#b4d6b8');ellipse(c,400,97,200,68,'#badac1');text(c,'WONI’S LITTLE GARDEN',240,42,19,'#55806b');text(c,s.combo>1?`${s.combo} COMBO!`:'꼬리가 반짝이면, 톡!',240,75,22);
 for(let i=0;i<9;i++){const x=95+i%3*145,y=218+Math.floor(i/3)*148,h=s.holes[i];ellipse(c,x,y,59,22,'#799b7d');ellipse(c,x,y-5,54,21,'#425e52');if(h.ttl>0){const pop=Math.min(1,(h.total-h.ttl)*9,h.ttl*8);c.save();c.beginPath();c.rect(x-70,y-142,140,146);c.clip();if(h.gold){ellipse(c,x,y-60,61,64,'#ffed9c80');star(c,x+43,y-116,11,'#e4aa37');}if(charmander?.complete)c.drawImage(charmander,x-65,y-126+(1-pop)*100,130,130);c.restore();box(c,x-37,y+25,74,5,'#eff6df',3);box(c,x-37,y+25,74*h.ttl/h.total,5,h.gold?'#e9ad48':'#477c66',3);}ellipse(c,x,y+7,57,10,'#a1c49f');if(h.flash>0){star(c,x,y-50,25+h.flash*40,'#fff0a9');text(c,h.gold?'GOLD!':'POP!',x,y-55,21,'#a47125');}text(c,String(i+1),x,y+13,12,'#537560');}text(c,'파이리 × 연속 성공 = 보너스!',240,582,17,'#3e6c57');}
function drawBubbles(c,s){background(c,'#efe2e5','#b5d4da');for(let i=0;i<13;i++)bubble(c,20+(i*83)%450,55+(i*79)%480,9+i%4*5,'#e2d2ed77');text(c,'MAY’S BUBBLE WORKSHOP',240,43,19,'#87667b');text(c,s.combo>1?`${s.combo} CHAIN!`:'가두고 · 가까이서 팡!',240,80,22);
 for(const [i,p] of PLATFORMS.entries()){box(c,p.x,p.y,p.w,20,'#917d98',8);box(c,p.x,p.y,p.w,9,['#b4d99f','#f0bdc6','#f1d182','#b4d99f'][i],6);for(let x=p.x+12;x<p.x+p.w;x+=25)ellipse(c,x,p.y+4,4,2,'#fff9');}
 for(const e of s.enemies){if(e.trapped)bubble(c,e.x,e.y-22,29,'#c9e7ec');critter(c,e.x,e.y-22,e.trapped?'#b9b6d7':'#a88dc5');if(e.trapped)text(c,'POP',e.x,e.y-58,12,'#80518b');}for(const b of s.bubbles)bubble(c,b.x,b.y,21);
 c.save();if(s.invincible&&Math.floor(s.invincible*10)%2)c.globalAlpha=.5;c.translate(s.player.x,s.player.y);c.scale(s.player.facing,1);drawDoll(c,'may',0,0,65,s.flash>0?1:0);text(c,'›',39,-22,28,'#80518b');c.restore();if(s.flash>0)for(let i=0;i<8;i++)star(c,s.player.x+Math.cos(i*.785)*65,s.player.y-35+Math.sin(i*.785)*50,8,'#fff1a4');text(c,'방울 버튼으로 가까운 방울도 터뜨려요',240,579,17,'#6e627f');}
export function bread(c,x,y,value,size=48){const k=value%10;c.save();c.translate(x,y);const a=size/48;c.scale(a,a);ellipse(c,1,19,24,6,'#8a52311d');if(k===1){box(c,-21,-18,42,41,'#b77639',12);box(c,-17,-15,34,34,'#f1c888',10);c.strokeStyle='#d39951';c.lineWidth=3;for(const dx of [-7,3]){c.beginPath();c.moveTo(dx,-10);c.lineTo(dx+5,12);c.stroke();}}else if(k===2){ellipse(c,0,0,23,21,'#b97846');ellipse(c,0,-2,22,19,'#e9a6b6');ellipse(c,0,-2,8,7,'#fff2db');for(let i=0;i<6;i++)box(c,Math.cos(i)*16-2,Math.sin(i)*13-3,4,2,'#fff6df',1);}else if(k===3){box(c,-20,-5,40,26,'#dfae7e',6);ellipse(c,0,-8,23,18,'#b48ec9');ellipse(c,0,-22,5,5,'#cb7688');}else if(k===4){ellipse(c,0,0,24,21,'#edcf80');c.strokeStyle='#b99448';c.lineWidth=2;for(let i=-12;i<=12;i+=8){c.beginPath();c.moveTo(i,-15);c.lineTo(i+4,14);c.stroke();}}else{box(c,-21,-18,42,39,'#769983',10);box(c,-16,-14,32,29,'#bad0a6',8);ellipse(c,-5,-2,3,3,'#6e8664');ellipse(c,8,7,3,3,'#6e8664');}if(value>10){star(c,16,-18,11,'#fff1a2');text(c,'✦',0,7,24,'#fff9ed');}c.restore();}
function drawBakery(c,s){
 const f=breadFrame(s),board=f?.board||s.board,t=f?.progress||0;
 background(c,'#f5e1d7','#efcabb');for(let i=0;i<8;i++)box(c,i*60,0,30,74,i%2?'#e8b9ba':'#fff2dc',0);box(c,73,25,334,63,PAPER,15);text(c,'제나의 신라빵',240,57,25,'#94624d');text(c,f?.combo>1?`${f.combo}연쇄 · 갓 구웠어요!`:`교환 ${s.moves}번 · 반짝 빵은 십자 폭발`,240,81,15,'#956551');box(c,21,103,438,438,'#c4957c',17);
 for(let i=0;i<36;i++){const x=65+i%6*70,y=147+Math.floor(i/6)*70;box(c,x-33,y-33,66,66,s.selected===i?'#fff0a0':'#fff6e4',10);if(!f&&s.elapsed%7>5&&s.hint.includes(i)&&s.selected<0){c.strokeStyle='#cf9256';c.lineWidth=3;c.strokeRect(x-29,y-29,58,58);}}
 c.save();c.beginPath();c.rect(30,112,420,420);c.clip();
 for(let i=0;i<36;i++){
  let col=i%6,row=Math.floor(i/6),size=48;
  if(f?.kind==='swap'&&(i===f.a||i===f.b)){const j=i===f.a?f.b:f.a,e=t*t*(3-2*t);col+=(j%6-col)*e;row+=(Math.floor(j/6)-row)*e;}
  if(f?.kind==='fall'){const e=1-Math.pow(1-t,3);row=f.fromRows[i]+(row-f.fromRows[i])*e;}
  const x=65+col*70,y=147+row*70,popping=f?.kind==='pop'&&f.removed.includes(i);
  if(popping){size*=1+.2*Math.sin(t*Math.PI);c.globalAlpha=1-t;}
  bread(c,x,y,board[i],size);c.globalAlpha=1;
  if(popping){c.globalAlpha=1-t;for(let k=0;k<6;k++){const angle=k*Math.PI/3;star(c,x+Math.cos(angle)*(12+t*30),y+Math.sin(angle)*(12+t*30),5*(1-t)+2,'#fff4b3');}c.globalAlpha=1;}
 }
 c.restore();text(c,'빵을 밀어서 교환 · 같은 빵 3개면 팡!',240,576,17,'#8c5e4b');
}
function drawPump(c,s){background(c,'#3c3e68','#252a4b');for(let i=0;i<5;i++)box(c,36+i*82,110,78,440,i%2?'#6683a220':'#a766a520',8);text(c,'MINAMI · FIVE STEP',240,39,20,'#ece5ff');text(c,s.combo?`${s.combo} COMBO`:'READY, DANCE!',240,75,23,'#f4d786');
 for(let i=0;i<5;i++){const x=75+i*82;box(c,x-34,108,68,56,s.glows[i]>0?PUMP_COLORS[i]:'#ffffff15',13);text(c,PUMP_ARROWS[i],x,151,39,s.glows[i]>0?'#303552':PUMP_COLORS[i]);if(s.glows[i]>0)text(c,s.feedback[i],x,192,12,'#fff7ce');}c.save();c.beginPath();c.rect(30,110,420,450);c.clip();for(const n of s.notes){const y=136+(n.at+s.offset-s.elapsed)*205;if(n.status!=='waiting'||y<100||y>560)continue;box(c,43+n.lane*82,y-25,64,50,PUMP_COLORS[n.lane],11);text(c,PUMP_ARROWS[n.lane],75+n.lane*82,y+14,38,'#303552');}c.restore();text(c,'Z        Q        S        E        C',240,582,20,'#d1cbe5');}
function drawDefense(c,s){
 background(c,'#213e58','#456b77');text(c,'LIV’S STAR RUNNERS',240,39,21,'#f8eed0');text(c,`대원 ${s.squad} · 격파 ${s.defeated}`,240,76,20,'#e2ece1');
 for(let i=0;i<3;i++){box(c,RUNNER_X[i]-68,101,136,444,i===s.lane?'#638c9455':'#17384b55',18);for(let y=100+(s.elapsed*80)%65;y<555;y+=65)text(c,'⌃',RUNNER_X[i],y,25,'#aec8c22d');}
 for(const g of s.gates)for(let i=0;i<3;i++){const o=g.options[i],positive=o.value>0;box(c,RUNNER_X[i]-61,g.y-25,122,55,positive?'#8dccc0':'#dc9ca1',9);text(c,o.op==='multiply'?`×${o.value}`:`${positive?'+':''}${o.value}`,RUNNER_X[i],g.y+10,30,'#244655');}
 for(const e of s.enemies){const x=RUNNER_X[e.lane];c.save();c.translate(x,e.y);if(e.boss)c.scale(1.5,1.5);critter(c,0,0,e.boss?'#d6a67e':'#b39bbd');c.restore();box(c,x-26,e.y-43,52,6,'#e5ddd455',3);box(c,x-26,e.y-43,52*Math.max(0,e.hp)/e.maxHp,6,'#f0bb77',3);text(c,String(Math.max(0,e.hp)),x,e.y-49,13,'#fff4cf');}
 for(const b of s.shots)star(c,b.x,b.y,5+Math.min(4,b.power),'#fff3a8');
 for(let i=0;i<Math.min(12,s.squad);i++){const x=s.x+(i%4-1.5)*18,y=493+Math.floor(i/4)*18;ellipse(c,x,y+7,8,8,'#83c0ba');ellipse(c,x,y,6,6,'#fff0c7');}
 drawDoll(c,'liv',s.x,498,57,0);box(c,s.x-34,550,68,28,'#fff4dc',10);text(c,`× ${s.squad}`,s.x,570,20);if(s.gateFlash)text(c,s.lastGate,s.x,439,28,'#ffdf82');
 if(s.burst>0){c.globalAlpha=s.burst;c.fillStyle='#fffbd1';c.fillRect(0,100,480,440);c.globalAlpha=1;}
}
export function drawGame(c,s){({drive:drawWhack,blocks:drawBubbles,photo:drawBakery,rhythm:drawPump,catch:drawDefense})[s.kind](c,s);}
