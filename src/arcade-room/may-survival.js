import {collectSongTime} from './song-time.js';
export const SURVIVAL_UPGRADES={star:{name:'별빛 연사',hint:'공격력과 발사 속도 증가'},orbit:{name:'수호 방울',hint:'주위를 도는 방울로 가까운 적 공격'},boots:{name:'가벼운 발걸음',hint:'이동 속도 증가'},magnet:{name:'별 조각 자석',hint:'경험치 수집 거리 증가'},heal:{name:'따뜻한 응원',hint:'목숨 1개 회복'}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const survivalDifficulty=stage=>({speed:40+Math.min(45,(stage-1)*4),spawn:Math.max(.3,.9-(stage-1)*.05),hp:1+Math.min(4,Math.floor((stage-1)/3)),boss:36+Math.min(100,(stage-1)*10)});
export function createSurvival(s){Object.assign(s,{mayVersion:3,songPickups:0,player:{x:240,y:360,dx:0,dy:0,walk:0,facing:1},popped:0,combo:0,enemies:[],shots:[],items:[],enemyShots:[],level:1,xp:0,upgrades:{star:1,orbit:0,boots:0,magnet:0},upgradeChoices:[],invincible:1.2,cooldown:0,orbitClock:0,spawn:.4,dash:0,dashCooldown:0,nextEnemy:0,bossSpawned:false,bossDefeated:false,bossClock:2,flash:0});return s;}
export function survivalAction(s,a){
 if(typeof a==='string'&&a.startsWith('upgrade:')){const key=a.slice(8);if(!s.upgradeChoices.includes(key))return;if(key==='heal')s.hearts=Math.min(3,s.hearts+1);else s.upgrades[key]++;s.upgradeChoices=[];s.event='survival-upgrade';return;}
 if(s.upgradeChoices.length)return;
 const moves={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
 if(moves[a]){[s.player.dx,s.player.dy]=moves[a];s.player.walk=.18;if(s.player.dx)s.player.facing=s.player.dx;}
 if(a==='stop'){s.player.dx=s.player.dy=s.player.walk=0;}
 if(a==='dash'&&!s.dashCooldown){s.dash=.3;s.dashCooldown=4;s.invincible=Math.max(s.invincible,.5);if(!s.player.dx&&!s.player.dy)s.player.dy=-1;s.player.walk=.3;}
}
function spawnEnemy(s,boss=false){const edge=Math.floor(s.random()*4),point=s.random();s.enemies.push({id:s.nextEnemy++,x:edge%2?(edge===1?456:24):24+point*432,y:edge%2?110+point*420:edge===0?110:530,kind:boss?'boss':s.nextEnemy%5===0?'runner':s.nextEnemy%4===0?'tank':'blob',hp:boss?survivalDifficulty(s.stage).boss:survivalDifficulty(s.stage).hp+(s.nextEnemy%4===0?2:0),flash:0});}
function choices(s){const keys=Object.keys(s.upgrades).filter(k=>s.upgrades[k]<4);if(s.hearts<3||!keys.length)keys.push('heal');const offset=s.level%keys.length;s.upgradeChoices=[...keys.slice(offset),...keys.slice(0,offset)].slice(0,3);s.player.dx=s.player.dy=s.player.walk=0;}
function defeat(s,e){s.popped++;s.combo++;s.score+=e.kind==='boss'?1500:100;s.flash=.12;if(e.kind==='boss')s.bossDefeated=true;
 if(s.items.length<60)s.items.push({x:e.x,y:e.y,kind:'xp',ttl:45});
 if(s.popped%8===0&&!s.songItemTime&&!s.items.some(i=>i.kind==='honey'))s.items.push({x:e.x,y:e.y,kind:'honey',ttl:25});s.event='survival-hit';}
export function stepSurvival(s,dt,loseLife){
 if(s.upgradeChoices.length)return;
 const p=s.player,d=survivalDifficulty(s.stage),comet=s.upgrades.star>=3&&s.upgrades.orbit>=2;
 for(const key of ['invincible','cooldown','orbitClock','spawn','dash','dashCooldown','bossClock','flash'])s[key]=Math.max(0,s[key]-dt);
 const walk=Math.min(dt,p.walk),speed=s.dash?620:175+s.upgrades.boots*18;p.x=clamp(p.x+p.dx*speed*walk,24,456);p.y=clamp(p.y+p.dy*speed*walk,112,530);p.walk=Math.max(0,p.walk-dt);
 if(!s.spawn&&s.enemies.length<42){spawnEnemy(s);if(s.elapsed>20&&s.enemies.length<42)spawnEnemy(s);s.spawn=d.spawn;}
 if(!s.bossSpawned&&s.elapsed>=45){spawnEnemy(s,true);s.bossSpawned=true;s.bossClock=2;}
 const nearest=s.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(a,p)-distance(b,p))[0];
 if(!s.cooldown&&nearest&&s.shots.length<64){const angle=Math.atan2(nearest.y-p.y,nearest.x-p.x);for(const turn of comet?[-.15,0,.15]:[0])s.shots.push({x:p.x,y:p.y,vx:Math.cos(angle+turn)*360,vy:Math.sin(angle+turn)*360,ttl:1.6,power:1+Math.floor(s.upgrades.star/2),comet});s.cooldown=Math.max(.16,.65-s.upgrades.star*.1);}
 if(s.upgrades.orbit&&!s.orbitClock){for(const e of s.enemies)if(distance(e,p)<65+s.upgrades.orbit*10){e.hp-=s.upgrades.orbit;e.flash=.12;}s.orbitClock=.6;}
 for(const e of s.enemies){e.flash=Math.max(0,e.flash-dt);if(e.hp<=0)continue;const dist=distance(e,p)||1,speed=d.speed*(e.kind==='runner'?1.65:e.kind==='boss'?.55:e.kind==='tank'?.7:1);e.x+=(p.x-e.x)/dist*speed*dt;e.y+=(p.y-e.y)/dist*speed*dt;
  if(!s.invincible&&dist<(e.kind==='boss'?40:25)){loseLife(s);s.invincible=1.4;s.combo=0;s.event='survival-miss';}if(s.ended)return;
  if(e.kind==='boss'&&!s.bossClock){for(let i=0;i<8;i++){const angle=i*Math.PI/4;s.enemyShots.push({x:e.x,y:e.y,vx:Math.cos(angle)*100,vy:Math.sin(angle)*100,ttl:3});}s.bossClock=2.5;}
 }
 for(const shot of s.shots){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.ttl-=dt;const hit=s.enemies.find(e=>e.hp>0&&distance(e,shot)<(e.kind==='boss'?35:22));if(hit){hit.hp-=shot.power;hit.flash=.15;shot.ttl=0;}}
 s.shots=s.shots.filter(b=>b.ttl>0&&b.x>0&&b.x<480&&b.y>90&&b.y<550);
 for(const e of s.enemies)if(e.hp<=0)defeat(s,e);s.enemies=s.enemies.filter(e=>e.hp>0);
 for(const shot of s.enemyShots){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.ttl-=dt;if(!s.invincible&&distance(shot,p)<20){loseLife(s);s.invincible=1.4;shot.ttl=0;s.event='survival-miss';}}
 s.enemyShots=s.enemyShots.filter(b=>b.ttl>0&&b.x>0&&b.x<480&&b.y>90&&b.y<550).slice(-40);
 for(const item of s.items){item.ttl-=dt;if(item.kind==='honey'&&s.songItemTime){item.ttl=0;continue;}const dist=distance(item,p),radius=45+s.upgrades.magnet*30;if(dist<radius){if(dist<25){item.ttl=0;if(item.kind==='honey'){collectSongTime(s);s.songPickups++;s.itemPickups++;s.event='survival-song';}else{s.xp++;if(s.upgrades.magnet>=2&&s.upgrades.boots>=2&&nearest&&nearest.hp>0){nearest.hp-=2;nearest.flash=.15;}}}else{item.x+=(p.x-item.x)/dist*250*dt;item.y+=(p.y-item.y)/dist*250*dt;}}}
 s.items=s.items.filter(i=>i.ttl>0&&!(s.songItemTime&&i.kind==='honey'));
 const threshold=3+s.level*2;if(s.xp>=threshold){s.xp-=threshold;s.level++;choices(s);s.event='survival-level';}
}
export function validSurvival(s){
 const num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b,int=(v,a,b)=>Number.isInteger(v)&&num(v,a,b),list=(v,max,fn)=>Array.isArray(v)&&v.length<=max&&v.every(fn),p=s.player;
 return s.mayVersion===3&&p&&num(p.x,24,456)&&num(p.y,112,530)&&[-1,0,1].includes(p.dx)&&[-1,0,1].includes(p.dy)&&num(p.walk,0,.3)&&[-1,1].includes(p.facing)&&int(s.level,1,10000)&&int(s.xp,0,10000)&&s.upgrades&&Object.entries(s.upgrades).length===4&&['star','orbit','boots','magnet'].every(k=>int(s.upgrades[k],k==='star'?1:0,4))&&list(s.upgradeChoices,3,k=>Object.hasOwn(SURVIVAL_UPGRADES,k))&&new Set(s.upgradeChoices).size===s.upgradeChoices.length&&int(s.songPickups,0,100000)&&num(s.invincible,0,1.4)&&num(s.cooldown,0,.65)&&num(s.orbitClock,0,.6)&&num(s.dash,0,.3)&&num(s.dashCooldown,0,4)&&num(s.bossClock,0,2.5)&&typeof s.bossSpawned==='boolean'&&typeof s.bossDefeated==='boolean'&&num(s.flash,0,.15)&&list(s.enemies,43,e=>int(e.id,0,100000)&&num(e.x,0,480)&&num(e.y,90,550)&&['blob','runner','tank','boss'].includes(e.kind)&&num(e.hp,-10,136)&&num(e.flash,0,.15))&&list(s.items,62,i=>num(i.x,0,480)&&num(i.y,90,550)&&['xp','honey'].includes(i.kind)&&num(i.ttl,0,45))&&list(s.shots,66,b=>num(b.x,0,480)&&num(b.y,90,550)&&num(b.vx,-360,360)&&num(b.vy,-360,360)&&num(b.ttl,0,1.6)&&int(b.power,1,3)&&typeof b.comet==='boolean')&&list(s.enemyShots,40,b=>num(b.x,0,480)&&num(b.y,90,550)&&num(b.vx,-100,100)&&num(b.vy,-100,100)&&num(b.ttl,0,3));
}
