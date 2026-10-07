import {breadHunt,foundBread} from './bakery-hunt.js';
import {pumpNotePosition} from './pump-input.js';
import {mayPlatforms} from './may.js';
import {WALK_LANES} from './walk.js';
import {stageItemSong,songItemSeconds} from './stage-songs.js';
import {breadFrame,boardSize} from './model.js';
/* global window, Image */
import {RUNNER_X,LIV_ITEM_NAMES,LIV_ITEM_ICONS,LIV_ATTACKS} from './runner.js';
import {drawDoll} from './cast.js';
const reducedMotion=typeof window!=='undefined'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
let charmander;
export function loadGameArt(){return new Promise(resolve=>{charmander=new Image();charmander.onload=resolve;charmander.onerror=()=>{charmander=null;resolve();};charmander.src='./charmander.png';});}
const INK='#244655',PAPER='#fff8e8';
function box(c,x,y,w,h,color,r=12){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function text(c,t,x,y,size=20,color=INK){c.fillStyle=color;c.font=`${size}px 'Jua', sans-serif`;c.textAlign='center';c.fillText(t,x,y);}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function star(c,x,y,r,color){c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fill();}
export function stageTheme(s){const hue=({drive:130,blocks:325,photo:25,rhythm:245,catch:195}[s.kind]+(s.stage-1)*47)%360;return {hue,name:['숲길','노을 바다','별빛 마을','오로라','구름 정원'][(s.stage-1)%5]};}
function background(c,top,bottom,s){c.clearRect(0,0,480,600);const g=c.createLinearGradient(0,0,0,600);if(s.stage>1){const {hue}=stageTheme(s),dark=['rhythm','catch'].includes(s.kind);top=`hsl(${hue} 35% ${dark?25:88}%)`;bottom=`hsl(${hue+30} 35% ${dark?35:72}%)`;}g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,480,600);const {name}=stageTheme(s);for(let i=0;i<6;i++){const x=(i*93+s.stage*31)%480,y=210+i%3*65;c.fillStyle='#ffffff18';c.beginPath();if(s.stage%2)c.arc(x,y,35+i*4,0,Math.PI*2);else{c.moveTo(x-55,600);c.lineTo(x,y);c.lineTo(x+70,600);}c.fill();}text(c,`${name} · STAGE ${s.stage}`,240,598,11,'#fff9');}
function bubble(c,x,y,r,color='#b9e9df'){ellipse(c,x+2,y+4,r,r,'#24465520');const g=c.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r);g.addColorStop(0,'#ffffffdd');g.addColorStop(.5,color);g.addColorStop(1,'#6faeaa99');ellipse(c,x,y,r,r,g);c.strokeStyle='#fffaf1';c.lineWidth=2;c.beginPath();c.arc(x,y,r-2,0,Math.PI*2);c.stroke();ellipse(c,x-r*.3,y-r*.4,r*.2,r*.12,'#ffffffc9');}
function critter(c,x,y,color='#af9bd2'){ellipse(c,x,y,19,19,color);ellipse(c,x-17,y+4,6,8,color);ellipse(c,x+17,y+4,6,8,color);ellipse(c,x-6,y-3,3,5,INK);ellipse(c,x+6,y-3,3,5,INK);text(c,'⌣',x,y+10,17);}
export const PUMP_ARROWS=['↙','↖','●','↗','↘'],PUMP_COLORS=['#ed9db2','#87cbd6','#e9c466','#87cbd6','#ed9db2'];
export function targets(s){if(s.kind==='photo'){const size=boardSize(s),cell=420/size;return Array.from({length:s.board.length},(_,i)=>({x:30+i%size*cell,y:112+Math.floor(i/size)*cell,w:cell,h:cell,label:`${Math.floor(i/size)+1}행 ${i%size+1}열 빵`}));}if(s.kind==='catch'||s.kind==='drive')return (s.kind==='catch'?RUNNER_X:WALK_LANES).map((x,i)=>({x:x-65,y:110,w:130,h:430,label:`${i+1}번 길로 이동`}));return [];}
function bone(c,x,y,scale=1){
 c.save();c.translate(x,y);c.scale(scale,scale);box(c,-15,-5,30,10,'#cb905a',5);
 for(const dx of [-15,15])for(const dy of [-5,5])ellipse(c,dx,dy,7,7,'#cb905a');c.restore();
}
// Byeol is an original stylized white Maltese, alongside Woni's existing cast art.
function drawByeol(c,x,y,walk){
 c.save();c.translate(x,y);ellipse(c,0,6,25,7,'#24465520');
 ellipse(c,21,-19,11,10,'#dedfd5');ellipse(c,22,-22,8,10,'#fffefa');
 for(const dx of [-12,12])ellipse(c,dx,Math.sin(walk+dx)*2,7,11,'#e4e7df');
 ellipse(c,0,-16,23,23,'#fffefa');ellipse(c,-19,-40,11,21,'#e4e7df');ellipse(c,19,-40,11,21,'#e4e7df');
 ellipse(c,-21,-43,9,17,'#fffefa');ellipse(c,21,-43,9,17,'#fffefa');
 for(const [dx,dy,r] of [[-12,-56,12],[0,-62,12],[12,-55,13],[-12,-36,14],[12,-36,14],[0,-44,22]])ellipse(c,dx,dy,r,r,'#fffefa');
 ellipse(c,-8,-45,3.4,4.2,INK);ellipse(c,8,-45,3.4,4.2,INK);ellipse(c,-9,-46,1,1,'#fff');ellipse(c,7,-46,1,1,'#fff');
 ellipse(c,0,-36,4.5,3.2,INK);ellipse(c,-14,-35,4,2.5,'#f4c5dd');ellipse(c,14,-35,4,2.5,'#f4c5dd');
 ellipse(c,0,-28,3,4.5,'#ed9db2');box(c,-15,-23,30,6,'#ed9db2',3);star(c,0,-15,5,'#e9c466');c.restore();
}
function drawCharmander(c,x,y,size){
 if(charmander?.complete&&charmander.naturalWidth)c.drawImage(charmander,55,100,400,410,x-size/2,y-size,size,size);
 else{ellipse(c,x,y-size*.4,size*.28,size*.4,'#ec963b');ellipse(c,x,y-size*.38,size*.16,size*.26,'#fff0b6');ellipse(c,x,y-size*.75,size*.25,size*.22,'#ec963b');ellipse(c,x-5,y-size*.8,3,5,INK);ellipse(c,x+7,y-size*.8,3,5,INK);}
}
function drawWalk(c,s){
 const quiet=reducedMotion?.matches,walk=quiet?0:s.elapsed*12;
 background(c,'#dfefdf','#b9d5b0',s);
 text(c,'원이와 별이의 산책',240,36,24,'#3e6c57');
 text(c,s.transformTime?`파이리 변신 · 자동 불뿜기 ${Math.ceil(s.transformTime)}초`:s.fever?`신나는 산책 · ${Math.ceil(s.fever)}초 보호`:s.combo?`간식 ${s.combo}개 연속!`:'같이 걸으면 더 즐거워!',240,69,20,INK);
 for(let i=0;i<7;i++){const y=130+i*61;for(const x of [15,465]){ellipse(c,x,y,16,23,'#83b38c');ellipse(c,x-4,y-5,12,16,'#9dc99f');}}
 box(c,32,108,416,436,'#f3dfbd',38);
 for(const x of [170,310]){c.strokeStyle='#d5be97';c.lineWidth=2;c.setLineDash([6,16]);c.beginPath();c.moveTo(x,117);c.lineTo(x,534);c.stroke();}c.setLineDash([]);
 for(const x of WALK_LANES)for(let y=130+(quiet?0:s.elapsed*85)%100;y<530;y+=100){ellipse(c,x-6,y,3,5,'#c7b18b55');ellipse(c,x+6,y+12,3,5,'#c7b18b55');}
 for(const o of s.objects){
  const x=WALK_LANES[o.lane],y=o.y;
  if(o.kind==='puddle'){ellipse(c,x,y+3,39,17,'#6faac6');ellipse(c,x-3,y,32,12,'#a1d7df');ellipse(c,x-10,y-3,12,2,'#e5f8f4');}
  else if(o.kind==='monster'){critter(c,x,y,o.hp>1?'#8a79ad':'#af9bd2');text(c,'몬스터',x,y-30,12,'#6e577e');for(let i=0;i<o.hp;i++)ellipse(c,x+(i-(o.hp-1)/2)*10,y+30,3,3,'#8a79ad');}
  else if(o.kind==='byeol'){ellipse(c,x,y,32,32,'#dbccf4');c.save();c.translate(x,y+25);c.scale(.6,.6);drawByeol(c,0,0,0);c.restore();text(c,'별이 캐리',x,y-38,13,'#755599');}
  else if(o.kind==='charmander'){ellipse(c,x,y+4,30,30,'#ffdfa0');drawCharmander(c,x,y+28,52);text(c,'파이리 변신',x,y-34,12,'#a65c27');}
  else if(o.kind==='log'){box(c,x-36,y-13,72,26,'#a77755',10);ellipse(c,x+31,y,9,13,'#d8ac73');ellipse(c,x+31,y,5,8,'#b98658');box(c,x-24,y-6,39,3,'#c89466',2);}
  else{ellipse(c,x,y+20,24,5,'#24465518');ellipse(c,x,y,25,25,o.kind==='song'?'#f4c5dd':o.kind==='clock'?'#d5eced':'#fff5d4');
   if(o.kind==='treat')bone(c,x,y,.85);
   if(o.kind==='song'){text(c,'♪',x,y+11,34,'#905979');text(c,`노래 ${songItemSeconds(s)}초`,x,y-32,12,'#79465f');}
   if(o.kind==='clock'){ellipse(c,x,y,16,16,'#fffefa');c.strokeStyle='#447d85';c.lineWidth=3;c.beginPath();c.moveTo(x,y-10);c.lineTo(x,y);c.lineTo(x+8,y);c.stroke();text(c,'+10초',x,y-32,13,'#346d75');}
  }
 }
 for(const b of s.shots){if(b.kind==='fire'){ellipse(c,b.x,b.y+10,16,28,'#f19a3dd9');ellipse(c,b.x,b.y+4,9,20,'#fff0a2');star(c,b.x,b.y-17,11,'#ffbf58');}else if(b.kind==='paw'){ellipse(c,b.x,b.y,9,8,'#ab81d3');for(const dx of [-9,0,9])ellipse(c,b.x+dx,b.y-10,4,5,'#d8b9f3');}else star(c,b.x,b.y,10,'#d39a3e');}
 for(const e of s.effects){c.save();c.globalAlpha=e.ttl/.45;for(let i=0;i<5;i++)star(c,e.x+Math.cos(i*1.26)*24,e.y+Math.sin(i*1.26)*24,7,'#fff7b1');text(c,'+150',e.x,e.y-25,16,'#805780');c.restore();}
 const lift=s.jumpTime?Math.sin(s.jumpTime/.8*Math.PI)*65:0,bob=quiet||lift?0:Math.sin(walk)*2;
 ellipse(c,s.x,519,52,9,'#24465522');c.save();if(s.shield&&Math.floor(s.shield*10)%2)c.globalAlpha=.5;
 if(s.fever){ellipse(c,s.x,470-lift,61,58,'#fff8c466');for(let i=0;i<3;i++)star(c,s.x-45+i*43,424-lift+(i%2)*12,7,'#e9c466');}
 c.strokeStyle='#cf8d9e';c.lineWidth=2;c.beginPath();c.moveTo(s.x-12,469-lift+bob);c.quadraticCurveTo(s.x+11,490-lift,s.x+32,480-lift+bob);c.stroke();
 if(s.transformTime)drawCharmander(c,s.x-22,514-lift+bob,94);else drawDoll(c,'woni',s.x-22,514-lift+bob,94);if(s.byeolTime){ellipse(c,s.x+31,468-lift,35,42,'#dcc5f088');text(c,'별이 캐리!',s.x+30,416-lift,13,'#755599');}drawByeol(c,s.x+31,503-lift+bob,walk);c.restore();
 if(s.rewardTime){const labels={byeol:'별이가 도와줄게! 20초 자동 추적 공격',charmander:'파이리 변신! 자동으로 불을 뿜어요',treat:'간식 +1',song:`♪ ${stageItemSong(s.kind,s.stage).title}`,clock:'+10초', 'clock-max':'시간 보너스 최대 +60초'};text(c,labels[s.lastReward],240,405,19,'#42684e');}
 bone(c,69,564,.6);text(c,'간식',109,570,14,INK);text(c,`♪ 노래 ${songItemSeconds(s)}초`,234,570,14,'#79465f');text(c,'◷ 시간 +10초',365,570,14,'#346d75');
}
function drawBubbles(c,s){background(c,'#efe2e5','#b5d4da',s);for(let i=0;i<13;i++)bubble(c,20+(i*83)%450,55+(i*79)%480,9+i%4*5,'#e2d2ed77');text(c,'MAY’S BUBBLE WORKSHOP',240,43,19,'#87667b');text(c,s.speedBoost||s.sizeBoost?[s.speedBoost?`속도 ↑ ${Math.ceil(s.speedBoost)}초`:'',s.sizeBoost?`큰 방울 ${Math.ceil(s.sizeBoost)}초`:''].filter(Boolean).join(' · '):s.combo>1?`${s.combo} CHAIN!`:s.elapsed>=120?'서둘러요! 적이 빨라졌어요!':'방울을 모아서 연쇄로 팡!',240,80,20);
 for(const [i,p] of mayPlatforms(s.mayLayout).entries()){box(c,p.x,p.y,p.w,20,'#917d98',8);box(c,p.x,p.y,p.w,9,['#b4d99f','#f0bdc6','#f1d182','#b4d99f'][i],6);for(let x=p.x+12;x<p.x+p.w;x+=25)ellipse(c,x,p.y+4,4,2,'#fff9');}
 for(const e of s.enemies){if(e.trapped)bubble(c,e.x,e.y-22,29,'#c9e7ec');critter(c,e.x,e.y-22,e.trapped?'#b9b6d7':e.angry?'#cf6f78':'#a88dc5');if(e.trapped)text(c,`POP ${Math.ceil(e.trapped)}`,e.x,e.y-58,12,'#80518b');else if(e.angry)text(c,'!',e.x,e.y-54,20,'#a23951');}for(const b of s.bubbles)bubble(c,b.x,b.y,b.radius||21);for(const item of s.items){bubble(c,item.x,item.y,item.kind==='honey'?25:19,item.kind==='honey'?'#f5a6cc':item.kind==='speed'?'#f6d991':'#c9b2e6');text(c,item.kind==='honey'?'♪':item.kind==='speed'?'»':'○',item.x,item.y+8,25,'#644c78');text(c,item.kind==='honey'?'꿀보이스':item.kind==='speed'?'속도':'크기',item.x,item.y-30,13,'#644c78');}
 c.save();if(s.invincible&&Math.floor(s.invincible*10)%2)c.globalAlpha=.5;c.translate(s.player.x,s.player.y);c.scale(s.player.facing,1);drawDoll(c,'may',0,0,65,s.flash>0?1:0);text(c,'›',39,-22,28,'#80518b');c.restore();if(s.flash>0)for(let i=0;i<8;i++)star(c,s.player.x+Math.cos(i*.785)*65,s.player.y-35+Math.sin(i*.785)*50,8,'#fff1a4');text(c,'빈 방울 위로 착지하면 더 높이 점프해요',240,579,17,'#6e627f');}
export function bread(c,x,y,value,size=48,songAvailable=true){const k=value%10;c.save();c.translate(x,y);const a=size/48;c.scale(a,a);ellipse(c,1,19,24,6,'#8a52311d');if(k===1){box(c,-21,-18,42,41,'#b77639',12);box(c,-17,-15,34,34,'#f1c888',10);c.strokeStyle='#d39951';c.lineWidth=3;for(const dx of [-7,3]){c.beginPath();c.moveTo(dx,-10);c.lineTo(dx+5,12);c.stroke();}}else if(k===2){ellipse(c,0,0,23,21,'#b97846');ellipse(c,0,-2,22,19,'#e9a6b6');ellipse(c,0,-2,8,7,'#fff2db');for(let i=0;i<6;i++)box(c,Math.cos(i)*16-2,Math.sin(i)*13-3,4,2,'#fff6df',1);}else if(k===3){box(c,-20,-5,40,26,'#dfae7e',6);ellipse(c,0,-8,23,18,'#b48ec9');ellipse(c,0,-22,5,5,'#cb7688');}else if(k===4){ellipse(c,0,0,24,21,'#edcf80');c.strokeStyle='#b99448';c.lineWidth=2;for(let i=-12;i<=12;i+=8){c.beginPath();c.moveTo(i,-15);c.lineTo(i+4,14);c.stroke();}}else{box(c,-21,-18,42,39,'#769983',10);box(c,-16,-14,32,29,'#bad0a6',8);ellipse(c,-5,-2,3,3,'#6e8664');ellipse(c,8,7,3,3,'#6e8664');}if(value>10){star(c,16,-18,11,'#fff1a2');text(c,songAvailable?'♪':'✦',0,9,30,'#fff9ed');}c.restore();}
function drawBakery(c,s){
 const size=boardSize(s),cell=420/size;const f=breadFrame(s),board=f?.board||s.board,t=f?.progress||0;
 background(c,'#f5e1d7','#efcabb',s);for(let i=0;i<8;i++)box(c,i*60,0,30,74,i%2?'#e8b9ba':'#fff2dc',0);box(c,73,25,334,63,PAPER,15);text(c,'제나의 신라빵',240,57,25,'#94624d');text(c,f?.combo>1?`${f.combo}연쇄 · 갓 구웠어요!`:`교환 ${s.moves}번 · 반짝 빵은 십자 폭발`,240,81,15,'#956551');box(c,21,103,438,438,'#c4957c',17);
 for(let i=0;i<s.board.length;i++){const x=30+cell/2+i%size*cell,y=112+cell/2+Math.floor(i/size)*cell;box(c,x-cell/2+2,y-cell/2+2,cell-4,cell-4,s.selected===i?'#fff0a0':s.breadCover[i]?'#cfe6da':'#fff6e4',10);if(!f&&s.elapsed%7>5&&s.hint.includes(i)&&s.selected<0){c.strokeStyle='#cf9256';c.lineWidth=3;c.strokeRect(x-cell/2+6,y-cell/2+6,cell-12,cell-12);}}
 c.save();c.beginPath();c.rect(30,112,420,420);c.clip();
 for(let i=0;i<s.board.length;i++){
  let col=i%size,row=Math.floor(i/size),breadSize=cell*.69;
  if(!f&&s.breadDrag){const d=s.breadDrag;if(i===d.from){col+=d.dx;row+=d.dy;}else if(i===d.to){col-=d.dx;row-=d.dy;}}
  if(f?.kind==='swap'&&(i===f.a||i===f.b)){const j=i===f.a?f.b:f.a,e=t*t*(3-2*t);col+=(j%size-col)*e;row+=(Math.floor(j/size)-row)*e;}
  if(f?.kind==='fall'){const e=1-Math.pow(1-t,3);row=f.fromRows[i]+(row-f.fromRows[i])*e;}
  const x=30+cell/2+col*cell,y=112+cell/2+row*cell,popping=f?.kind==='pop'&&f.removed.includes(i);
  if(popping){breadSize*=1+.2*Math.sin(t*Math.PI);c.globalAlpha=1-t;}
  c.globalAlpha*=s.breadCover[i]?.62:1;bread(c,x,y,board[i],breadSize,!s.songItemTime);c.globalAlpha=1;
  if(popping){c.globalAlpha=1-t;for(let k=0;k<6;k++){const angle=k*Math.PI/3;star(c,x+Math.cos(angle)*(12+t*30),y+Math.sin(angle)*(12+t*30),5*(1-t)+2,'#fff4b3');}c.globalAlpha=1;}
 }
 c.restore();
 for(const [i,a] of breadHunt(s).entries()){const x=30+a.x*cell,y=112+a.y*cell;c.strokeStyle=a.found?'#3b8866':'#aa6585';c.lineWidth=a.found?3:2;c.setLineDash(a.found?[]:[4,3]);c.strokeRect(x+1,y+1,a.w*cell-2,a.h*cell-2);c.setLineDash([]);box(c,x+2,y+2,Math.min(a.w*cell-4,86),16,a.found?'#3b8866':'#aa6585',3);if(a.found){c.save();c.globalAlpha=.85;bread(c,x+a.w*cell/2,y+a.h*cell/2,1,Math.min(100,a.w*cell*.7));c.restore();}text(c,a.found?`빵 ${i+1} ✓`:`빵 ${i+1} · ${a.left}칸`,x+Math.min(a.w*cell-4,86)/2+2,y+14,10,'#fff');}
 text(c,`숨은 신라빵 ${foundBread(s)} / ${breadHunt(s).length}`,240,560,17,'#8c5e4b');text(c,s.itemArmed?'밀대로 지울 줄의 빵을 골라요!':'테두리 안 모든 칸을 지워 숨은 신라빵을 찾아요' ,240,576,17,'#8c5e4b');
}
function drawPump(c,s){const height=c.canvas.height;background(c,'#3c3e68','#252a4b',s);for(let i=0;i<5;i++)box(c,36+i*82,110,78,height-160,i%2?'#6683a220':'#a766a520',8);text(c,'MINAMI · FIVE STEP',240,39,20,'#ece5ff');text(c,s.combo?`${s.combo} COMBO`:'READY, DANCE!',240,68,23,'#f4d786');box(c,45,83,390,13,'#ffffff25',6);box(c,45,83,390*s.gauge/100,13,s.gauge<25?'#ed8294':'#8fe0bc',6);text(c,`LIFE ${Math.ceil(s.gauge)}%`,240,107,11,'#fff7ce');
 for(let i=0;i<5;i++){const x=75+i*82;box(c,x-34,108,68,56,s.glows[i]>0?PUMP_COLORS[i]:'#ffffff15',13);text(c,PUMP_ARROWS[i],x,151,39,s.glows[i]>0?'#303552':PUMP_COLORS[i]);if(s.glows[i]>0)text(c,s.feedback[i],x,192,12,'#fff7ce');}c.save();c.beginPath();c.rect(30,110,420,height-150);c.clip();for(const n of s.notes){const {y}=pumpNotePosition(s,n,height);if(n.status!=='waiting'||y<100||y>height-40)continue;box(c,43+n.lane*82,y-25,64,50,PUMP_COLORS[n.lane],11);text(c,PUMP_ARROWS[n.lane],75+n.lane*82,y+14,38,'#303552');}c.restore();text(c,'판정선에 겹친 화살표를 직접 톡!',240,height-18,17,'#d1cbe5');}
function drawLivShot(c,b,time){
 const color=LIV_ATTACKS[b.kind]?.color||'#fff3a8',direction=b.returning?-1:1;
 c.save();c.strokeStyle=color;c.lineWidth=b.kind?4:2;c.globalAlpha=.45;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x,b.y+direction*(b.kind?34:14));c.stroke();c.globalAlpha=1;
 c.shadowColor=color;c.shadowBlur=b.kind?12:0;
 if(b.kind==='love-attack'){text(c,'♥',b.x,b.y+10,30,color);}
 else if(b.kind==='pinball'){bubble(c,b.x,b.y,13,color);ellipse(c,b.x-3,b.y-4,3,3,'#fff');}
 else if(b.kind==='heart-drop'){text(c,'♥',b.x,b.y+9,26,color);text(c,'♡',b.x,b.y+27,18,'#fff0fa');}
 else if(b.kind==='yoyo'){c.translate(b.x,b.y);c.rotate(time*12*direction);ellipse(c,0,0,14,14,color);ellipse(c,0,0,7,7,'#423260');c.fillStyle='#fff';c.fillRect(-2,-13,4,26);}
 else if(b.kind==='new-world'){star(c,b.x,b.y,17,color);star(c,b.x,b.y,8,'#fff');}
 else star(c,b.x,b.y,5+Math.min(4,b.power),color);
 c.restore();
}
function drawDefense(c,s){
 background(c,'#213e58','#456b77',s);text(c,'LIV’S STAR RUNNERS',240,39,21,'#f8eed0');text(c,`연사 ${s.fireLevel}단계 · ${s.volley}발${s.item?' · '+LIV_ITEM_NAMES[s.item]:''}`,240,70,17,'#e2ece1');const boss=s.enemies.find(e=>e.boss);if(boss){text(c,'보스 · 별빛을 삼킨 구름왕',240,94,14,'#ffdc91');box(c,65,100,350,7,'#17384b',3);box(c,65,100,350*Math.max(0,boss.hp)/boss.maxHp,7,'#efb87c',3);}
 for(let i=0;i<3;i++){box(c,RUNNER_X[i]-68,101,136,444,i===s.lane?'#638c9455':'#17384b55',18);for(let y=100+(s.elapsed*80)%65;y<555;y+=65)text(c,'⌃',RUNNER_X[i],y,25,'#aec8c22d');}
 for(const g of s.gates)for(let i=0;i<3;i++){const o=g.options[i],positive=o.value>0;box(c,RUNNER_X[i]-61,g.y-25,122,55,positive?'#8dccc0':'#dc9ca1',9);text(c,o.op==='multiply'?`×${o.value}`:`${positive?'+':''}${o.value}`,RUNNER_X[i],g.y,26,'#244655');text(c,positive?(o.op==='multiply'?'탄 수 ↑':'연사 ↑'):'대원 감소',RUNNER_X[i],g.y+21,13,'#244655');}
 for(const e of s.enemies){const x=RUNNER_X[e.lane];c.save();c.translate(x,e.y);if(e.boss){c.scale(2.1,1.7);star(c,0,-24,14,'#f5d684');}critter(c,0,0,e.boss?'#d6a67e':'#b39bbd');c.restore();box(c,x-26,e.y-43,52,6,'#e5ddd455',3);box(c,x-26,e.y-43,52*Math.max(0,e.hp)/e.maxHp,6,'#f0bb77',3);text(c,String(Math.max(0,e.hp)),x,e.y-49,13,'#fff4cf');}
 for(const item of s.pickups){const x=RUNNER_X[item.lane];bubble(c,x,item.y,28,LIV_ATTACKS[item.kind].color);text(c,LIV_ITEM_ICONS[item.kind],x,item.y+8,28,'#34516d');text(c,LIV_ITEM_NAMES[item.kind],x,item.y-33,14,'#fff8e8');}
 for(const effect of s.effects){c.save();c.globalAlpha=Math.min(1,effect.ttl*4);if(effect.kind==='pinball'){c.shadowColor='#ffd68c';c.shadowBlur=14;c.strokeStyle='#ffd68c';c.lineWidth=7;c.beginPath();c.moveTo(effect.x,effect.y);c.lineTo(effect.toX,effect.toY);c.stroke();bubble(c,effect.toX,effect.toY,16,'#ffe8a5');}else {const y=effect.y+(effect.toY-effect.y)*(1-effect.ttl/.45);for(const dx of [-24,0,24]){c.strokeStyle='#ff9cc566';c.lineWidth=4;c.beginPath();c.moveTo(effect.x+dx,y-50);c.lineTo(effect.x+dx,y);c.stroke();text(c,'♥',effect.x+dx,y+dx*.4,28,'#ff9cc5');}}c.restore();}
 for(const b of s.shots)drawLivShot(c,b,s.elapsed);
 for(let i=0;i<Math.min(12,s.squad);i++){const x=s.x+(i%4-1.5)*18,y=493+Math.floor(i/4)*18;ellipse(c,x,y+7,8,8,'#83c0ba');ellipse(c,x,y,6,6,'#fff0c7');}
 if(s.item){const attack=LIV_ATTACKS[s.item];ellipse(c,s.x,494,58,22,attack.color+'66');for(let i=0;i<3;i++){const a=s.elapsed*2+i*Math.PI*2/3;text(c,LIV_ITEM_ICONS[s.item],s.x+Math.cos(a)*50,485+Math.sin(a)*17,19,attack.color);}box(c,85,576,310,22,'#19364fdd',8);text(c,`${attack.name} · ${Math.ceil(s.itemTime)}초`,240,592,15,attack.color);}c.save();if(s.damageCooldown&&Math.floor(s.damageCooldown*10)%2)c.globalAlpha=.5;drawDoll(c,'liv',s.x,498,57,0);c.restore();box(c,s.x-34,550,68,28,'#fff4dc',10);text(c,`× ${s.squad}`,s.x,570,20);if(s.gateFlash)text(c,s.lastGate,s.x,439,28,'#ffdf82');
 if(s.burst>0){c.globalAlpha=s.burst;c.fillStyle='#fffbd1';c.fillRect(0,100,480,440);c.globalAlpha=1;}
}
export function drawGame(c,s){c.save();if(s.kind==='photo')c.scale(c.canvas.width/480,c.canvas.height/600);({drive:drawWalk,blocks:drawBubbles,photo:drawBakery,rhythm:drawPump,catch:drawDefense})[s.kind](c,s);c.restore();}
