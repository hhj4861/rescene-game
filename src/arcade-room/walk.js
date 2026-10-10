import {prankActive,stepPranks} from './walk-pranks.js';
import {collectSongTime} from './song-time.js';
export const WALK_LANES=[100,240,380];
export const WALK_TIME_BONUS=10;
export const WALK_MAX_BONUS=60;
export const WALK_TRANSFORM_SECONDS=20;
export const WALK_BYEOL_SECONDS=20;
export const WALK_ITEMS=['treat','song','clock','charmander','byeol'];
export function walkDifficulty(stage,speed){return {spawn:Math.max(.4,.95/Math.pow(speed,.7)),speed:100+70*speed,hp:Math.min(5,1+Math.floor((stage-1)/2)),pair:stage>=3};}
// Every cycle guarantees music, extra time, a transformation and monsters.
const ROUTE=['treat','monster','song','log','treat','charmander','monster','clock','puddle','treat','monster','treat','byeol','monster'];
export function createWalk(){
 return {firePickups:0,fireLevel:1,byeolTreats:0,byeolPower:0,allyShotCooldown:0,allyClearCooldown:0,walkVersion:1,prankIndex:0,prank:null,lane:1,x:240,objects:[],spawn:.5,shield:0,fever:0,heat:0,hits:0,combo:0,bestCombo:0,misses:0,nextObject:0,jumpTime:0,jumpCooldown:0,songPickups:0,timeBonus:0,clockPickups:0,rewardTime:0,lastReward:'',byeolTime:0,byeolCooldown:0,transformTime:0,attackCooldown:0,shots:[],effects:[],defeated:0};
}
function attack(s){
 if(s.attackCooldown||s.shots.length>=32)return;
 const fire=s.transformTime>0,evolved=fire&&s.fireLevel===2;
 for(const x of evolved?WALK_LANES:[s.x])if(s.shots.length<32)s.shots.push({x,y:465,kind:evolved?'blaze':fire?'fire':'star'});
 s.attackCooldown=(fire?.18:.38)*(s.songItemTime?.7:1);
}
export function walkAction(s,a){
 if(prankActive(s,'minami'))a=a==='left'?'right':a==='right'?'left':Number.isInteger(a)&&a>=0&&a<3?2-a:a;
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='jump'&&!s.jumpCooldown){s.jumpTime=.8;s.jumpCooldown=1.05;}
 else if(a==='attack')attack(s);
}
export function stepWalk(s,dt,speed,loseLife){
 stepPranks(s,dt);
 s.x+=Math.sign(WALK_LANES[s.lane]-s.x)*Math.min(Math.abs(WALK_LANES[s.lane]-s.x),(s.songItemTime?1100:prankActive(s,'may')?340:850)*dt);
 for(const key of ['spawn','shield','fever','jumpTime','jumpCooldown','rewardTime','transformTime','attackCooldown','byeolTime','byeolCooldown','byeolPower','allyShotCooldown','allyClearCooldown'])s[key]=Math.max(0,s[key]-dt);
 for(const e of s.effects)e.ttl-=dt;s.effects=s.effects.filter(e=>e.ttl>0);
 if(!s.transformTime){s.fireLevel=1;s.firePickups=0;}
 if(s.transformTime)attack(s);
 const difficulty=walkDifficulty(s.stage,speed);
 if(!s.spawn){
  const scheduled=ROUTE[s.nextObject%ROUTE.length],kind=scheduled==='song'&&s.songItemTime?'treat':scheduled,lane=Math.floor(s.random()*3);
  s.objects.push({id:s.nextObject++,lane,y:110,kind,...(kind==='monster'?{hp:difficulty.hp}:{})});
  if(kind==='monster'&&difficulty.pair)s.objects.push({id:s.nextObject+100000,lane:(lane+1)%3,y:110,kind:'monster',hp:difficulty.hp});
  s.spawn=difficulty.spawn;
 }
 for(const o of s.objects)o.y+=difficulty.speed*dt;
 // Byeol sends a paw to the nearest approaching monster, across lanes.
 if((s.byeolTime||s.byeolPower)&&!s.byeolCooldown&&s.shots.length<32){
  const target=s.objects.filter(o=>o.kind==='monster'&&!o.done).sort((a,b)=>b.y-a.y)[0];
  if(target){s.shots.push({x:s.x,y:465,kind:s.byeolPower?'super-paw':'paw',targetX:WALK_LANES[target.lane]});s.byeolCooldown=s.byeolPower?.22:.45;}
 }
 // Song helpers use the same active-play clock as the collected song.
 if(s.songItemTime){
  if(!s.allyShotCooldown&&s.shots.length<32){
   const target=s.objects.filter(o=>o.kind==='monster'&&!o.done).sort((a,b)=>b.y-a.y)[0];
   if(target){s.shots.push({x:s.x,y:465,kind:'heart',targetX:WALK_LANES[target.lane]});s.allyShotCooldown=1;}
  }
  if(!s.allyClearCooldown){
   const obstacle=s.objects.filter(o=>!o.done&&['puddle','log','bread'].includes(o.kind)).sort((a,b)=>b.y-a.y)[0];
   if(obstacle){obstacle.done=true;s.allyClearCooldown=4;}
  }
  for(const item of s.objects)if(item.kind==='treat'&&item.y>=340)item.lane=s.lane;
 }else{s.allyShotCooldown=0;s.allyClearCooldown=0;}
 // Resolve the nearest crossed monster before player collisions, once per shot.
 for(const shot of s.shots){
  const homing=['paw','super-paw','heart'].includes(shot.kind),flame=['fire','blaze'].includes(shot.kind);
  if(homing)shot.x+=Math.sign(shot.targetX-shot.x)*Math.min(Math.abs(shot.targetX-shot.x),1200*dt);
  const before=shot.y;shot.y-=(homing&&Math.abs(shot.targetX-shot.x)>32?0:flame?650:500)*dt;
  const target=s.objects.filter(o=>!o.done&&['monster','bread'].includes(o.kind)&&Math.abs(WALK_LANES[o.lane]-shot.x)<(flame?55:32)&&o.y>=shot.y-25&&o.y<=before+25).sort((a,b)=>b.y-a.y)[0];
  if(target){shot.done=true;target.hp-=shot.kind==='blaze'?5:shot.kind==='fire'?3:shot.kind==='super-paw'?4:['paw','heart'].includes(shot.kind)?2:1;if(target.hp<=0){target.done=true;if(target.kind==='monster'){s.defeated++;s.score+=150;s.effects.push({x:WALK_LANES[target.lane],y:target.y,ttl:.45});s.event='walk-defeat';}else{s.score+=20;s.event='walk-bread-clear';}}}
 }
 s.shots=s.shots.filter(b=>!b.done&&b.y>=100);
 for(const o of s.objects){
  if(o.done)continue;if(o.kind==='song'&&s.songItemTime){o.done=true;continue;}
  if(Math.abs(WALK_LANES[o.lane]-s.x)<44&&o.y>=455&&o.y<=525){
   o.done=true;
   if(WALK_ITEMS.includes(o.kind)){
    s.itemPickups++;s.rewardTime=1.4;s.lastReward=o.kind;
    if(o.kind==='treat'){
     s.hits++;s.combo++;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=100+Math.min(10,s.combo)*10;s.event='walk-treat';
     if(++s.byeolTreats>=3){s.byeolTreats=0;s.byeolPower=6;s.byeolCooldown=0;s.event='walk-byeol-power';}
     if(++s.heat>=5){s.heat=0;s.fever=8;s.event='walk-fever';}
    }else if(o.kind==='song'){collectSongTime(s);s.songPickups++;s.prank=null;s.score+=50;s.event='walk-song';}
    else if(o.kind==='byeol'){s.byeolTime=WALK_BYEOL_SECONDS;s.byeolCooldown=0;s.score+=50;s.event='walk-byeol';}
    else if(o.kind==='charmander'){if(s.transformTime){s.firePickups=Math.min(3,s.firePickups+1);if(s.firePickups===3)s.fireLevel=2;}else{s.firePickups=0;s.fireLevel=1;}s.transformTime=WALK_TRANSFORM_SECONDS;s.attackCooldown=0;s.score+=50;s.event='walk-transform';}
    else{const bonus=Math.min(WALK_TIME_BONUS,WALK_MAX_BONUS-s.timeBonus);s.timeBonus+=bonus;s.remaining+=bonus;s.clockPickups++;s.score+=50;s.lastReward=bonus?'clock':'clock-max';s.event='walk-clock';}
   }else if(!s.shield&&!s.fever&&!(['log','bread'].includes(o.kind)&&s.jumpTime>0)){
    loseLife(s);s.shield=1.4;s.combo=0;s.heat=0;s.misses++;s.event='walk-miss';if(s.ended)return;
   }else if(['log','bread'].includes(o.kind)&&s.jumpTime>0){s.score+=20;s.event='walk-jump';}
  }else if(o.y>560){o.done=true;if(o.kind==='treat'){s.combo=0;s.heat=0;}}
 }
 s.effects=s.effects.slice(-12);
 s.objects=s.objects.filter(o=>!o.done&&!(s.songItemTime&&o.kind==='song'));
}
