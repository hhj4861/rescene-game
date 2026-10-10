import {drawDoll} from './cast.js';
const text=(c,value,x,y,size=18,color='#624c79')=>{c.fillStyle=color;c.font=`${size}px Jua,sans-serif`;c.textAlign='center';c.fillText(value,x,y);};
const circle=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
export function drawSurvival(c,s){
 c.fillStyle='#e9dfed';c.fillRect(0,0,480,600);c.fillStyle='#fff7e9';c.beginPath();c.roundRect(12,100,456,451,24);c.fill();
 c.strokeStyle='#dacadd';c.lineWidth=1;for(let x=30;x<470;x+=40)for(let y=118;y<545;y+=40){c.beginPath();c.arc(x,y,2,0,7);c.stroke();}
 text(c,'메이의 별빛 생존전',240,35,25);text(c,s.bossSpawned?'보스의 붉은 탄환을 피해요!':`자동 공격 · 보스까지 ${Math.max(0,Math.ceil(45-s.elapsed))}초`,240,67,19);
 c.fillStyle='#d7c3df';c.fillRect(34,81,412,7);c.fillStyle='#ac86ba';c.fillRect(34,81,412*Math.min(1,s.xp/(3+s.level*2)),7);
 for(const item of s.items){circle(c,item.x,item.y,item.kind==='honey'?16:7,item.kind==='honey'?'#eeafd1':'#87cbbf');text(c,item.kind==='honey'?'♪':'✦',item.x,item.y+5,item.kind==='honey'?22:12,item.kind==='honey'?'#79557f':'#fff');}
 for(const e of s.enemies){const r=e.kind==='boss'?34:e.kind==='tank'?23:17;circle(c,e.x,e.y+5,r,'#624c791a');circle(c,e.x,e.y,r,e.flash?'#fff':e.kind==='boss'?'#d17191':e.kind==='runner'?'#e7b45c':e.kind==='tank'?'#8e86b8':'#baa0cb');circle(c,e.x-6,e.y-3,3,'#354958');circle(c,e.x+6,e.y-3,3,'#354958');if(e.kind==='boss'){text(c,'BOSS',e.x,e.y-r-10,16,'#a23f68');text(c,String(Math.ceil(e.hp)),e.x,e.y+16,16,'#fff');if(s.bossClock<.6){c.strokeStyle='#d17191';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,42,0,7);c.stroke();}}}
 for(const b of s.enemyShots)circle(c,b.x,b.y,6,'#c64f74');
 for(const b of s.shots){if(b.comet){circle(c,b.x-b.vx*.02,b.y-b.vy*.02,9,'#f1ad6888');}text(c,'✦',b.x,b.y+7,b.comet?24:18,b.comet?'#d7793b':'#956fbb');}
 const p=s.player;if(s.upgrades.orbit)for(let i=0;i<s.upgrades.orbit+1;i++){const angle=s.elapsed*2+i*2*Math.PI/(s.upgrades.orbit+1),r=65+s.upgrades.orbit*10;circle(c,p.x+Math.cos(angle)*r,p.y+Math.sin(angle)*r,10,'#a5d8e5aa');}
 if(s.dash)circle(c,p.x,p.y,37,'#f6d78088');c.save();if(s.invincible)c.globalAlpha=.7;drawDoll(c,'may',p.x,p.y+25,63,s.flash?3:0);c.restore();
 text(c,`Lv.${s.level} · ${s.popped}마리 격파`,120,578,17);text(c,s.upgrades.star>=3&&s.upgrades.orbit>=2?'✦ 혜성탄 조합!':'별빛 3 + 방울 2 = 혜성탄',350,578,14);
}
