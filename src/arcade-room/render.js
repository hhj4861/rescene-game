import {COLS,ROWS,ghostRow,photoPosition} from './model.js';
import {drawDoll} from './cast.js';
export const COLORS=['','#91c6ba','#f3bc77','#d0b7e0','#f09791','#7bb5d4','#eccd77','#b3c986'];
function box(c,x,y,w,h,color,r=8){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function star(c,x,y,size,color){c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?size*.45:size;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();c.fill();}
export function drawDrive(c,s){
  c.clearRect(0,0,480,600);c.fillStyle='#8ccdd5';c.fillRect(0,0,480,600);
  c.fillStyle='#fbdfab';c.fillRect(82,0,25,600);c.fillStyle='#b4d3b5';c.fillRect(375,0,105,600);
  c.strokeStyle='#daf5ee';c.lineWidth=3;
  for(let i=0;i<10;i++){const y=(i*80+s.elapsed*40)%720-60;c.beginPath();c.moveTo(5,y);c.quadraticCurveTo(40,y+15,70,y);c.stroke();}
  c.fillStyle='#607b83';c.fillRect(105,0,270,600);c.fillStyle='#e9ede3';c.fillRect(110,0,4,600);c.fillRect(366,0,4,600);
  c.strokeStyle='#e7ddaa';c.lineWidth=4;c.setLineDash([26,24]);c.lineDashOffset=-s.elapsed*125;
  for(const x of [195,285]){c.beginPath();c.moveTo(x,0);c.lineTo(x,600);c.stroke();}c.setLineDash([]);
  for(let i=0;i<4;i++){const y=(i*210+s.elapsed*90)%840-150;box(c,425,y,8,65,'#9b7853',4);c.fillStyle='#679c83';for(let p=0;p<5;p++){c.beginPath();c.ellipse(429+Math.cos(p*1.25)*16,y+Math.sin(p*1.25)*13,27,10,p*1.25,0,7);c.fill();}}
  for(const o of s.objects){const x=150+90*o.lane,y=o.y*600;if(o.kind==='star'){c.beginPath();c.arc(x,y,21,0,7);c.fillStyle='#fff7d7';c.fill();star(c,x,y,15,'#d9a637');}else{box(c,x-20,y+15,40,7,'#dce6dd',4);c.fillStyle='#ef9471';c.beginPath();c.moveTo(x,y-21);c.lineTo(x-16,y+18);c.lineTo(x+16,y+18);c.fill();box(c,x-9,y-1,18,6,'#fff4d7',2);}}
  const x=150+s.lane*90,y=500;c.save();if(s.invincible&&Math.floor(s.invincible*8)%2)c.globalAlpha=.5;
  box(c,x-31,y-37,65,100,'#25455144',21);box(c,x-33,y-34,9,27,'#244250',4);box(c,x+25,y-34,9,27,'#244250',4);box(c,x-33,y+26,9,23,'#244250',4);box(c,x+25,y+26,9,23,'#244250',4);
  box(c,x-27,y-46,54,99,'#f7d37f',17);box(c,x-22,y-28,44,45,'#395a67',10);drawDoll(c,'woni',x,y+15,61);box(c,x-24,y+13,48,29,'#f4c975',9);box(c,x-20,y-39,40,13,'#b7e1e0',5);box(c,x-20,y+44,12,5,'#e67f70',2);box(c,x+8,y+44,12,5,'#e67f70',2);c.restore();
}
function tile(c,x,y,size,color,ghost=false){
  if(ghost){c.strokeStyle='#829992';c.lineWidth=2;c.setLineDash([3,4]);c.strokeRect(x+4,y+4,size-8,size-8);c.setLineDash([]);return;}
  box(c,x+2,y+3,size-4,size-4,COLORS[color]||COLORS[1],6);c.strokeStyle='#fff9';c.lineWidth=1;c.setLineDash([3,3]);c.strokeRect(x+7,y+8,size-14,size-14);c.setLineDash([]);c.fillStyle='#fff5';c.beginPath();c.arc(x+size*.5,y+size*.5,3,0,7);c.fill();
}
export function drawBlocks(c,s){
  c.clearRect(0,0,480,600);c.fillStyle='#f8ead9';c.fillRect(0,0,480,600);const size=42,ox=72,oy=36;
  box(c,ox-12,oy-12,COLS*size+24,ROWS*size+24,'#d8b89a',14);box(c,ox-5,oy-5,COLS*size+10,ROWS*size+10,'#fff9ee',9);
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){box(c,ox+x*size+2,oy+y*size+2,size-4,size-4,'#f0e4d4',5);if(s.board[y][x])tile(c,ox+x*size,oy+y*size,size,s.board[y][x]);}
  if(!s.ended){const ghost=ghostRow(s);for(const [y,row] of s.active.cells.entries())for(const [x,cell] of row.entries())if(cell){tile(c,ox+(s.active.x+x)*size,oy+(ghost+y)*size,size,s.active.color,true);tile(c,ox+(s.active.x+x)*size,oy+(s.active.y+y)*size,size,s.active.color);}}
  c.fillStyle='#916c53';c.font='15px sans-serif';c.textAlign='center';c.fillText('한 줄을 채우면 조각이 이어져요',240,576);
}
export function drawNext(c,p){c.clearRect(0,0,160,80);const size=24,x=(160-p.cells[0].length*size)/2,y=(80-p.cells.length*size)/2;p.cells.forEach((row,dy)=>row.forEach((cell,dx)=>{if(cell)tile(c,x+dx*size,y+dy*size,size,p.color);}));}

function label(c,text,x,y,size=20,color='#234454'){c.fillStyle=color;c.font=`${size}px sans-serif`;c.textAlign='center';c.fillText(text,x,y);}
export function drawPhoto(c,s){
  c.clearRect(0,0,480,600);c.fillStyle='#f6e5e1';c.fillRect(0,0,480,600);
  for(let i=0;i<7;i++)box(c,i*80-25,0,38,390,i%2?'#e8bcc3':'#eecdd1',0);
  box(c,56,40,368,355,'#fffaf1',8);box(c,73,57,334,279,'#d1e1d6',2);
  c.fillStyle='#fff6';c.beginPath();c.arc(235,190,112,0,7);c.fill();
  if(!s.preview)drawDoll(c,'zena',240,332,265,s.shots%3);label(c,'오늘의 우리, 찰칵!',240,373,22);
  for(let i=0;i<5;i++){const grade=s.album[i];box(c,80+i*66,417,55,48,'#fffcf2',4);if(grade==='perfect')star(c,107+i*66,441,14,'#d2a14a');else label(c,grade==='good'?'♡':grade==='miss'?'↺':'·',107+i*66,449,24,'#986d76');}
  box(c,48,496,384,44,'#e4cbd0',22);box(c,182,496,116,44,'#f4d475',15);box(c,221,496,38,44,'#fff4c7',10);
  c.strokeStyle='#234454';c.lineWidth=3;c.beginPath();c.arc(48+photoPosition(s)*384,518,17,0,7);c.fillStyle='#fffaf0';c.fill();c.stroke();
  label(c,'가운데 노란 칸에서 찰칵!',240,576,18,'#845967');
  if(s.flash>0){c.fillStyle=`rgba(255,255,245,${Math.min(.45,s.flash*2)})`;c.fillRect(0,0,480,600);}
}
export function drawRhythm(c,s){
  c.clearRect(0,0,480,600);c.fillStyle='#eee7f4';c.fillRect(0,0,480,600);
  box(c,57,22,366,100,'#ddd0e8',18);if(!s.preview)drawDoll(c,'minami',240,119,95,s.combo>=3?1:0);
  label(c,'왼쪽',145,155,18);label(c,'오른쪽',335,155,18);
  box(c,65,173,160,355,'#e0d3e9',16);box(c,255,173,160,355,'#d1e0e7',16);
  c.strokeStyle='#8b709c';c.lineWidth=2;c.setLineDash([4,8]);for(const x of [145,335]){c.beginPath();c.moveTo(x,180);c.lineTo(x,500);c.stroke();}c.setLineDash([]);
  const beat=Math.abs((s.elapsed-2)% .75);const glow=beat<.12||beat>.63;
  for(const [i,x] of [145,335].entries()){box(c,x-70,479,140,42,glow?'#f4d475':'#fff9ee',12);label(c,i?'→':'←',x,509,28);}
  c.save();c.beginPath();c.rect(60,169,360,360);c.clip();
  for(const note of s.notes){const y=500+(s.elapsed-note.at)*180;if(note.status!=='waiting'||y<165||y>540)continue;box(c,(note.lane?335:145)-42,y-18,84,36,note.lane?'#679baa':'#9e80b2',11);label(c,note.lane?'→':'←',note.lane?335:145,y+9,25,'#fffaf1');}
  c.restore();label(c,s.combo>=3?`${s.combo}번 연속!`:'음표가 선에 닿으면 톡!',240,577,20,'#735a86');
}
export function drawCatch(c,s){
  c.clearRect(0,0,480,600);const sky=c.createLinearGradient(0,0,0,600);sky.addColorStop(0,'#496b89');sky.addColorStop(1,'#9fc8ca');c.fillStyle=sky;c.fillRect(0,0,480,600);
  c.fillStyle='#fff1b9';c.beginPath();c.arc(390,72,30,0,7);c.fill();c.fillStyle='#587995';c.beginPath();c.arc(404,63,28,0,7);c.fill();
  for(let i=0;i<18;i++)star(c,20+(i*83)%450,25+(i*67)%360,2+i%3,'#dfede4');
  c.fillStyle='#668b8e';c.beginPath();c.ellipse(70,600,300,97,0,0,7);c.fill();c.fillStyle='#779f95';c.beginPath();c.ellipse(430,625,320,127,0,0,7);c.fill();
  for(const x of [115,240,365]){box(c,x-48,507,96,6,'#dae5c47f',3);}
  for(const o of s.objects){const x=115+125*o.lane,y=o.y*600;c.beginPath();c.arc(x,y,25,0,7);c.fillStyle=o.blue?'#c8e9f54a':'#fff3c24a';c.fill();star(c,x,y,18,o.blue?'#ceefff':'#ffe2a0');}
  const x=115+125*s.lane;if(!s.preview)drawDoll(c,'liv',x,533,131,s.stars%4===3?1:0);box(c,x-37,460,74,41,'#e0bc86',11);c.strokeStyle='#866d52';c.lineWidth=3;c.beginPath();c.arc(x,460,25,Math.PI,0);c.stroke();star(c,x,480,11,'#fff3c7');
  label(c,'파란 별은 두 배 · 놓쳐도 괜찮아요',240,576,16,'#f9f5e2');
}
export function drawGame(c,s){({drive:drawDrive,blocks:drawBlocks,photo:drawPhoto,rhythm:drawRhythm,catch:drawCatch})[s.kind](c,s);}
