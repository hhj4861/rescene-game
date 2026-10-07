import {collectSongTime} from './song-time.js';
export const PLATFORMS=[{x:0,y:536,w:480},{x:35,y:422,w:170},{x:267,y:330,w:178},{x:48,y:224,w:168}];
export function mayPlatforms(stage=1){return stage%2===0?PLATFORMS.map((p,i)=>i?{...p,x:480-p.x-p.w}:p):PLATFORMS;}
export function mayDifficulty(stage=1){const ramp=1-1/(1+Math.max(0,stage-1)*.12);return {speed:72+48*ramp,trap:4.5-1.5*ramp,spawn:1.6-.7*ramp,limit:Math.min(7,4+Math.floor((stage-1)/3))};}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function enemy(s,home){const p=mayPlatforms(s.mayLayout)[home];let x=p.x+25+s.random()*(p.w-50);if(Math.hypot(x-s.player.x,p.y-s.player.y)<95)x=s.player.x<p.x+p.w/2?p.x+p.w-25:p.x+25;return {x,y:p.y,home,dir:s.random()<.5?-1:1,trapped:0,vy:0,think:.7+s.random()*.5,angry:false};}
export function createMay(s){const data={mayVersion:2,songPickups:0,mayLayout:s.stage%2===0?2:1,items:[],speedBoost:0,sizeBoost:0,player:{x:90,y:536,vy:0,facing:1,walk:0,dir:0},popped:0,combo:0,enemies:[],bubbles:[],invincible:1.2,cooldown:0,spawn:1.6,flash:0};Object.assign(s,data);s.enemies=[0,1,2,3].map(home=>enemy(s,home));s.enemies[0].x=340;return s;}
function pop(s,first){const group=[first];for(let i=0;i<group.length;i++)for(const e of s.enemies)if(e.trapped&&!group.includes(e)&&Math.hypot(e.x-group[i].x,e.y-group[i].y)<85)group.push(e);
 for(const e of group){s.enemies.splice(s.enemies.indexOf(e),1);s.popped++;s.combo++;s.score+=(100+Math.min(5,s.combo)*50)*Math.min(4,group.length);if(s.items.length<4)s.items.push({x:e.x,y:e.y-22,kind:s.popped%3===0&&!s.songItemTime?'honey':s.popped%2?'speed':'size',ttl:12});}s.flash=.25;s.event=group.length>1?'bubble-chain':'bubble-pop';}
export function mayAction(s,a){const p=s.player;
 if(a==='left'||a==='right'){p.dir=a==='left'?-1:1;p.facing=p.dir;p.walk=.18;}else if(a==='turn'){p.facing*=-1;p.dir=0;p.walk=0;}else if(a==='stop'){p.dir=0;p.walk=0;}else if(a==='jump'&&Math.abs(p.vy)<.01&&mayPlatforms(s.mayLayout).some(f=>Math.abs(p.y-f.y)<.5&&p.x>=f.x-6&&p.x<=f.x+f.w+6))p.vy=-550;
 else if(a==='bubble'&&!s.cooldown){s.cooldown=.28;const near=s.enemies.filter(e=>e.trapped&&Math.hypot(e.x-p.x,e.y-p.y)<64).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(near)pop(s,near);else if(s.bubbles.length<8)s.bubbles.push({x:p.x+p.facing*20,y:p.y-24,vx:p.facing*260,ttl:3.2,radius:s.sizeBoost?34:21});}}
function fall(body,dt,platforms){const old=body.y;body.vy+=1200*dt;body.y+=body.vy*dt;if(body.vy>=0)for(const [i,p] of platforms.map((p,i)=>[i,p]).sort((a,b)=>a[1].y-b[1].y))if(body.x>=p.x-6&&body.x<=p.x+p.w+6&&old<=p.y&&body.y>=p.y){body.y=p.y;body.vy=0;if('home'in body)body.home=i;break;}if(body.y>536){body.y=536;body.vy=0;if('home'in body)body.home=0;}}
export function stepMay(s,dt,loseLife,target){const p=s.player,platforms=mayPlatforms(s.mayLayout),d=mayDifficulty(s.stage),hurry=s.elapsed>=120;
 for(const k of ['invincible','cooldown','flash','speedBoost','sizeBoost'])s[k]=Math.max(0,s[k]-dt);
 p.x=clamp(p.x+p.dir*(s.speedBoost?285:190)*Math.min(dt,p.walk),18,462);p.walk=Math.max(0,p.walk-dt);const oldY=p.y;fall(p,dt,platforms);
 for(const b of s.bubbles){b.x+=b.vx*(b.ttl>2.9?1:.08)*dt;b.y-=(b.ttl>2.9?18:30)*dt;b.ttl-=dt;const hit=s.enemies.find(e=>!e.trapped&&Math.hypot(e.x-b.x,e.y-20-b.y)<(b.radius||21)+9);if(hit){hit.trapped=d.trap;hit.vy=0;b.ttl=0;s.event='bubble-trap';}}
 // Descending feet can land on an empty bubble, never its underside.
 const step=s.bubbles.filter(b=>b.ttl>0&&b.y>40&&b.x>-20&&b.x<500&&p.vy>=0&&Math.abs(p.x-b.x)<(b.radius||21)+6&&oldY<=(b.y+(b.ttl>2.9?18:30)*dt)-(b.radius||21)&&p.y>=b.y-(b.radius||21)).sort((a,b)=>(a.y-(a.radius||21))-(b.y-(b.radius||21)))[0];
 if(step){p.y=step.y-(step.radius||21);p.vy=-600;step.ttl=0;s.flash=.2;s.event='bubble-jump';}
 s.bubbles=s.bubbles.filter(b=>b.ttl>0&&b.y>40&&b.x>-20&&b.x<500);
 for(const e of [...s.enemies]){if(!s.enemies.includes(e))continue;e.vy??=0;e.think??=.8;e.angry??=false;
  if(e.trapped){e.trapped=Math.max(0,e.trapped-dt);e.y=Math.max(70,e.y-18*dt);if(Math.hypot(e.x-p.x,e.y-p.y)<38){pop(s,e);continue;}if(!e.trapped){e.y=platforms[e.home].y;e.angry=true;e.think=0;s.combo=0;s.event='bubble-escape';}}
  else{e.think=Math.max(0,e.think-dt);const platform=platforms[e.home];
   if(!e.think&&e.vy===0){e.think=.8;const above=platforms.filter(f=>f.y<e.y-25&&e.y-f.y<=126).sort((a,b)=>b.y-a.y)[0];if(p.y<e.y-35&&above){e.dir=Math.sign(above.x+above.w/2-e.x)||e.dir;if(e.x>=above.x-55&&e.x<=above.x+above.w+55)e.vy=-550;}else if(p.y>e.y+35)e.dir=p.x<platform.x+platform.w/2?-1:1;else if(Math.abs(p.y-e.y)<65)e.dir=Math.sign(p.x-e.x)||e.dir;}
   if(e.vy===0&&p.y<e.y-35){const above=platforms.filter(f=>f.y<e.y-25&&e.y-f.y<=126).sort((a,b)=>b.y-a.y)[0];if(above){e.dir=Math.sign(above.x+above.w/2-e.x)||e.dir;if(e.x>=above.x-82&&e.x<=above.x+above.w+82)e.vy=-550;}}
   e.x=clamp(e.x+e.dir*d.speed*(e.vy?1.6:1)*(e.angry?1.35:1)*(hurry?1.25:1)*dt,18,462);
   if(e.vy===0&&p.y<=e.y+35){if(e.x<platform.x+18){e.x=platform.x+18;e.dir=1;}if(e.x>platform.x+platform.w-18){e.x=platform.x+platform.w-18;e.dir=-1;}}
   if(e.x<=18)e.dir=1;if(e.x>=462)e.dir=-1;fall(e,dt,platforms);
   if(!s.invincible&&Math.hypot(e.x-p.x,e.y-p.y)<31){loseLife(s);s.invincible=1.4;s.combo=0;s.event='bubble-miss';}
  }if(s.ended)return;
 }
 for(const item of s.items){if(item.kind==='honey'&&s.songItemTime){item.ttl=0;continue;}const floor=[...platforms].sort((a,b)=>a.y-b.y).find(f=>item.x>=f.x&&item.x<=f.x+f.w&&f.y-22>=item.y-.01);item.y=Math.min(floor?floor.y-22:514,item.y+150*dt);item.ttl-=dt;if(Math.hypot(item.x-p.x,item.y-(p.y-22))<38){if(item.kind==='honey'){collectSongTime(s);s.songPickups++;}else s[item.kind==='speed'?'speedBoost':'sizeBoost']=10;item.ttl=0;s.itemPickups++;s.event='bubble-item';}}
 s.items=s.items.filter(i=>i.ttl>0&&!(s.songItemTime&&i.kind==='honey'));s.spawn=Math.max(0,s.spawn-dt);if(!s.spawn){if(s.enemies.length<d.limit&&s.popped+s.enemies.length<target)s.enemies.push(enemy(s,Math.floor(s.random()*4)));s.spawn=d.spawn;}
}
