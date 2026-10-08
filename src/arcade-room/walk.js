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
 return {walkVersion:1,lane:1,x:240,objects:[],spawn:.5,shield:0,fever:0,heat:0,hits:0,combo:0,bestCombo:0,misses:0,nextObject:0,jumpTime:0,jumpCooldown:0,songPickups:0,timeBonus:0,clockPickups:0,rewardTime:0,lastReward:'',byeolTime:0,byeolCooldown:0,transformTime:0,attackCooldown:0,shots:[],effects:[],defeated:0};
}
function attack(s){
 if(s.attackCooldown||s.shots.length>=32)return;
 const fire=s.transformTime>0;s.shots.push({x:s.x,y:465,kind:fire?'fire':'star'});s.attackCooldown=fire?.18:.38;
}
export function walkAction(s,a){
 if(a==='left'||a==='right')s.lane=Math.max(0,Math.min(2,s.lane+(a==='left'?-1:1)));
 else if(Number.isInteger(a)&&a>=0&&a<3)s.lane=a;
 else if(a==='jump'&&!s.jumpCooldown){s.jumpTime=.8;s.jumpCooldown=1.05;}
 else if(a==='attack')attack(s);
}
export function stepWalk(s,dt,speed,loseLife){
 s.x+=Math.sign(WALK_LANES[s.lane]-s.x)*Math.min(Math.abs(WALK_LANES[s.lane]-s.x),850*dt);
 for(const key of ['spawn','shield','fever','jumpTime','jumpCooldown','rewardTime','transformTime','attackCooldown','byeolTime','byeolCooldown'])s[key]=Math.max(0,s[key]-dt);
 for(const e of s.effects)e.ttl-=dt;s.effects=s.effects.filter(e=>e.ttl>0);
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
 if(s.byeolTime&&!s.byeolCooldown&&s.shots.length<32){
  const target=s.objects.filter(o=>o.kind==='monster'&&!o.done).sort((a,b)=>b.y-a.y)[0];
  if(target){s.shots.push({x:s.x,y:465,kind:'paw',targetX:WALK_LANES[target.lane]});s.byeolCooldown=.45;}
 }
 // Resolve the nearest crossed monster before player collisions, once per shot.
 for(const shot of s.shots){
  if(shot.kind==='paw')shot.x+=Math.sign(shot.targetX-shot.x)*Math.min(Math.abs(shot.targetX-shot.x),1200*dt);
  const before=shot.y;shot.y-=(shot.kind==='paw'&&Math.abs(shot.targetX-shot.x)>32?0:shot.kind==='fire'?650:500)*dt;
  const target=s.objects.filter(o=>!o.done&&o.kind==='monster'&&Math.abs(WALK_LANES[o.lane]-shot.x)<(shot.kind==='fire'?55:32)&&o.y>=shot.y-25&&o.y<=before+25).sort((a,b)=>b.y-a.y)[0];
  if(target){shot.done=true;target.hp-=shot.kind==='fire'?3:shot.kind==='paw'?2:1;if(target.hp<=0){target.done=true;s.defeated++;s.score+=150;s.effects.push({x:WALK_LANES[target.lane],y:target.y,ttl:.45});s.event='walk-defeat';}}
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
     if(++s.heat>=5){s.heat=0;s.fever=8;s.event='walk-fever';}
    }else if(o.kind==='song'){collectSongTime(s);s.songPickups++;s.score+=50;s.event='walk-song';}
    else if(o.kind==='byeol'){s.byeolTime=WALK_BYEOL_SECONDS;s.byeolCooldown=0;s.score+=50;s.event='walk-byeol';}
    else if(o.kind==='charmander'){s.transformTime=WALK_TRANSFORM_SECONDS;s.attackCooldown=0;s.score+=50;s.event='walk-transform';}
    else{const bonus=Math.min(WALK_TIME_BONUS,WALK_MAX_BONUS-s.timeBonus);s.timeBonus+=bonus;s.remaining+=bonus;s.clockPickups++;s.score+=50;s.lastReward=bonus?'clock':'clock-max';s.event='walk-clock';}
   }else if(!s.shield&&!s.fever&&!(o.kind==='log'&&s.jumpTime>0)){
    loseLife(s);s.shield=1.4;s.combo=0;s.heat=0;s.misses++;s.event='walk-miss';if(s.ended)return;
   }else if(o.kind==='log'&&s.jumpTime>0){s.score+=20;s.event='walk-jump';}
  }else if(o.y>560){o.done=true;if(o.kind==='treat'){s.combo=0;s.heat=0;}}
 }
 s.objects=s.objects.filter(o=>!o.done&&!(s.songItemTime&&o.kind==='song'));
}
